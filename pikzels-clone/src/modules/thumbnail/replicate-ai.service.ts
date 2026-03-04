import fetch from 'node-fetch';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

// Timeout configuration
const PREDICTION_TIMEOUT = 120000; // 2 minutes max for polling
const POLL_INTERVAL = 1000; // 1 second between polls

// Retry configuration with exponential backoff
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000; // 1 second base
const MAX_RETRY_DELAY = 30000; // 30 seconds max
const JITTER_FACTOR = 0.3; // 30% random variance

// Retryable HTTP status codes
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

// Non-retryable status codes (client errors that won't be fixed by retrying)
const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 402, 403, 404, 422]);

/**
 * Calculate delay with exponential backoff and jitter.
 * Formula: baseDelay * 2^attempt * (1 + random jitter)
 * 
 * This prevents "thundering herd" where all clients retry simultaneously.
 * 
 * @param attempt Current retry attempt (0-indexed)
 * @param retryAfterSeconds Optional server-provided retry-after value
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number, retryAfterSeconds?: number): number {
  // If server specified Retry-After, use it (with small jitter)
  if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
    const serverDelay = retryAfterSeconds * 1000;
    const jitter = serverDelay * JITTER_FACTOR * Math.random();
    return Math.min(serverDelay + jitter, MAX_RETRY_DELAY);
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
  const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, attempt);
  
  // Add jitter: random variance up to JITTER_FACTOR (30%)
  const jitter = exponentialDelay * JITTER_FACTOR * Math.random();
  
  // Final delay = base exponential + jitter, capped at max
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
}

/**
 * Parse Retry-After header from response.
 * Can be either seconds (integer) or HTTP date.
 * 
 * @param response Fetch response object
 * @returns Retry delay in seconds, or undefined if not present
 */
function parseRetryAfter(response: Response): number | undefined {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) return undefined;

  // Try parsing as integer (seconds)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds;
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now();
    if (delayMs > 0) {
      return Math.ceil(delayMs / 1000);
    }
  }

  // Also check X-RateLimit-Reset header (epoch timestamp)
  const resetTimestamp = response.headers.get('X-RateLimit-Reset');
  if (resetTimestamp) {
    const resetTime = parseInt(resetTimestamp, 10) * 1000;
    if (!isNaN(resetTime) && resetTime > Date.now()) {
      return Math.ceil((resetTime - Date.now()) / 1000);
    }
  }

  return undefined;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ReplicateAIService - Backend service for Replicate API
 *
 * Handles specialized computer vision tasks that require purpose-built models:
 * - Segment (SAM 2): AI-powered object detection and segmentation
 * - Remove Background (RMBG 2.0): Pixel-accurate background removal
 * - Upscale (Real-ESRGAN): True super-resolution upscaling
 * - Expand: Image outpainting / canvas expansion
 *
 * Replicate uses a prediction-based API:
 * 1. POST /predictions to create a job
 * 2. Poll GET /predictions/{id} until status is 'succeeded' or 'failed'
 *
 * @see https://replicate.com/docs/reference/http
 */
export class ReplicateAIService {
  private apiKey: string;
  private baseUrl: string;
  /** Injectable sleep function — real setTimeout in production, no-op in tests */
  private readonly sleep: (ms: number) => Promise<void>;

  // Model environment variable names (12-Factor: Config in environment)
  // All models must be configured via environment variables
  static readonly TOOL_ENV_VARS = {
    segment: 'REPLICATE_MODEL_SEGMENT',
    segmentInteractive: 'REPLICATE_MODEL_SEGMENT_INTERACTIVE',
    removeBg: 'REPLICATE_MODEL_REMOVE_BG',
    upscale: 'REPLICATE_MODEL_UPSCALE',
    expand: 'REPLICATE_MODEL_EXPAND',
  } as const;

  constructor(sleepFn?: (ms: number) => Promise<void>) {
    this.apiKey = process.env.REPLICATE_API_KEY || '';
    this.baseUrl = process.env.REPLICATE_API_URL || 'https://api.replicate.com/v1';
    this.sleep = sleepFn ?? sleep;

    if (!this.apiKey) {
      console.warn(
        'REPLICATE_API_KEY not found in environment variables. Replicate AI features will not work.'
      );
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get the model ID for a specific tool type
   * Requires model to be configured via environment variable (12-Factor App)
   */
  getModelForTool(
    toolType: keyof typeof ReplicateAIService.TOOL_ENV_VARS
  ): string {
    const envVar = ReplicateAIService.TOOL_ENV_VARS[toolType];
    if (!envVar) {
      throw new Error(`Unknown Replicate tool type: ${String(toolType)}`);
    }

    const model = process.env[envVar];
    if (!model) {
      throw new Error(
        `Replicate model not configured. Set ${envVar} environment variable.`
      );
    }

    return model;
  }

  /**
   * Get service information
   */
  getServiceInfo(): {
    name: string;
    apiUrl: string;
    configured: boolean;
    tools: string[];
  } {
    return {
      name: 'Replicate AI',
      apiUrl: this.baseUrl,
      configured: this.isConfigured(),
      tools: Object.keys(ReplicateAIService.TOOL_ENV_VARS),
    };
  }

  // ===========================================================================
  // SEGMENT (SAM 2) - AUTO MODE
  // ===========================================================================

  /**
   * Auto-segment all objects in an image using SAM 2 (Segment Anything Model)
   * Uses a grid of points to detect ALL objects in the image automatically.
   * 
   * This is the "hover preview" mode - shows what objects are available for selection.
   *
   * @param imageBase64 Base64-encoded image (with or without data URL prefix)
   * @param options Optional configuration for auto-segmentation
   * @returns Object with combined mask and individual masks for all detected objects
   */
  async segment(
    imageBase64: string,
    options?: {
      pointsPerSide?: number;      // Grid density (default: 32)
      predIouThresh?: number;      // IoU threshold (default: 0.88)
      stabilityScoreThresh?: number; // Stability threshold (default: 0.95)
      useM2m?: boolean;            // Use mask-to-mask refinement
    }
  ): Promise<{
    masks: Array<{
      url: string;
      score: number;
    }>;
    combinedMask?: string;
    predictionId: string;
  }> {
    if (!this.apiKey) {
      throw new Error('Replicate API key not configured');
    }

    const model = this.getModelForTool('segment');
    const imageUrl = this.ensureDataUrl(imageBase64);

    const input: Record<string, unknown> = {
      image: imageUrl,
      points_per_side: options?.pointsPerSide ?? 32,
      pred_iou_thresh: options?.predIouThresh ?? 0.88,
      stability_score_thresh: options?.stabilityScoreThresh ?? 0.95,
    };

    if (options?.useM2m !== undefined) {
      input.use_m2m = options.useM2m;
    }

    const prediction = await this.runPrediction(model, input);

    // Parse SAM output
    const masks: Array<{ url: string; score: number }> = [];
    let combinedMask: string | undefined;

    if (prediction.output) {
      // SAM 2 returns combined_mask and individual_masks
      if (prediction.output.combined_mask) {
        combinedMask = prediction.output.combined_mask;
      }

      // Handle individual_masks array
      if (prediction.output.individual_masks && Array.isArray(prediction.output.individual_masks)) {
        prediction.output.individual_masks.forEach((maskUrl: string, index: number) => {
          masks.push({
            url: maskUrl,
            score: 1.0 - index * 0.01, // Slight score variation for ordering
          });
        });
      }

      // Handle direct array output (older API format)
      if (Array.isArray(prediction.output) && masks.length === 0) {
        prediction.output.forEach((maskUrl: string, index: number) => {
          masks.push({
            url: maskUrl,
            score: 1.0 - index * 0.1,
          });
        });
      }

      // If only combined mask returned, use that
      if (masks.length === 0 && combinedMask) {
        masks.push({
          url: combinedMask,
          score: 1.0,
        });
      }
    }

    return {
      masks,
      ...(combinedMask ? { combinedMask } : {}),
      predictionId: String(prediction.id),
    };
  }

  // ===========================================================================
  // SEGMENT (SAM 2) - INTERACTIVE MODE
  // ===========================================================================

  /**
   * Interactive segmentation using SAM 2 Video with click coordinates.
   * User clicks a point, gets a mask for the object at that location.
   * 
   * This uses meta/sam-2-video which accepts click_coordinates for point-based selection.
   * For single images, we pass the image as a single-frame input.
   *
   * @param imageBase64 Base64-encoded image
   * @param clicks Array of click points with labels (1=foreground, 0=background)
   * @returns Mask for the selected object(s)
   */
  async segmentInteractive(
    imageBase64: string,
    clicks: Array<{ x: number; y: number; label: number }>
  ): Promise<{
    masks: Array<{ url: string }>;
    predictionId: string;
  }> {
    if (!this.apiKey) {
      throw new Error('Replicate API key not configured');
    }

    if (!clicks || clicks.length === 0) {
      throw new Error('At least one click point is required for interactive segmentation');
    }

    const model = this.getModelForTool('segmentInteractive');
    const imageUrl = this.ensureDataUrl(imageBase64);

    // Format click_coordinates as '[x,y],[x,y],...'
    const clickCoords = clicks.map(c => `[${Math.round(c.x)},${Math.round(c.y)}]`).join(',');
    
    // Format click_labels as '1,1,0,...' (1=foreground, 0=background)
    const clickLabels = clicks.map(c => c.label).join(',');
    
    // All clicks are on frame 0 for single image
    const clickFrames = clicks.map(() => '0').join(',');

    const input: Record<string, unknown> = {
      input_video: imageUrl,  // SAM 2 Video can process single images
      click_coordinates: clickCoords,
      click_labels: clickLabels,
      click_frames: clickFrames,
      mask_type: 'binary',
      output_video: false,    // Return image sequence, not video
      output_format: 'png',
    };

    const prediction = await this.runPrediction(model, input);

    // Parse output - returns array of mask URLs
    const masks: Array<{ url: string }> = [];

    if (prediction.output) {
      if (Array.isArray(prediction.output)) {
        prediction.output.forEach((maskUrl: string) => {
          if (typeof maskUrl === 'string') {
            masks.push({ url: maskUrl });
          }
        });
      } else if (typeof prediction.output === 'string') {
        masks.push({ url: prediction.output });
      }
    }

    return {
      masks,
      predictionId: String(prediction.id),
    };
  }

  // ===========================================================================
  // REMOVE BACKGROUND
  // ===========================================================================

  /**
   * Remove background from an image using RMBG 2.0
   * Returns a PNG with transparent background
   *
   * @param imageBase64 Base64-encoded source image
   * @returns URL to the processed image (transparent background PNG)
   */
  async removeBackground(imageBase64: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Replicate API key not configured');
    }

    const model = this.getModelForTool('removeBg');
    const imageUrl = this.ensureDataUrl(imageBase64);

    const input: Record<string, unknown> = {
      image: imageUrl,
    };

    const prediction = await this.runPrediction(model, input);

    // Output is typically a single URL string
    const output = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (!output || typeof output !== 'string') {
      throw new Error('No output image from remove-background model');
    }

    return output;
  }

  // ===========================================================================
  // UPSCALE
  // ===========================================================================

  /**
   * Upscale an image using Real-ESRGAN for true super-resolution
   *
   * @param imageBase64 Base64-encoded source image
   * @param scale Scale factor (2 or 4)
   * @param faceEnhance Whether to apply face enhancement
   * @returns URL to the upscaled image
   */
  async upscale(
    imageBase64: string,
    scale: number = 2,
    faceEnhance: boolean = false
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Replicate API key not configured');
    }

    const model = this.getModelForTool('upscale');
    const imageUrl = this.ensureDataUrl(imageBase64);

    const input: Record<string, unknown> = {
      image: imageUrl,
      scale,
      face_enhance: faceEnhance,
    };

    const prediction = await this.runPrediction(model, input);

    const output = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (!output || typeof output !== 'string') {
      throw new Error('No output image from upscale model');
    }

    return output;
  }

  // ===========================================================================
  // EXPAND (OUTPAINT)
  // ===========================================================================

  /**
   * Expand/outpaint an image - extend the canvas in any direction
   *
   * @param imageBase64 Base64-encoded source image
   * @param prompt Description of what to fill in the expanded areas
   * @param direction Expansion direction(s)
   * @param expandPixels How many pixels to expand
   * @returns URL to the expanded image
   */
  async expand(
    imageBase64: string,
    prompt: string = '',
    direction: 'left' | 'right' | 'top' | 'bottom' | 'all' = 'all',
    expandPixels: number = 256
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Replicate API key not configured');
    }

    const model = this.getModelForTool('expand');
    const imageUrl = this.ensureDataUrl(imageBase64);

    const input: Record<string, unknown> = {
      image: imageUrl,
      prompt: prompt || 'extend the image naturally, maintaining style and context',
    };

    // Add direction-specific padding
    if (direction === 'all') {
      input.top = expandPixels;
      input.bottom = expandPixels;
      input.left = expandPixels;
      input.right = expandPixels;
    } else {
      input[direction] = expandPixels;
    }

    const prediction = await this.runPrediction(model, input);

    const output = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (!output || typeof output !== 'string') {
      throw new Error('No output image from expand model');
    }

    return output;
  }

  // ===========================================================================
  // CORE: Prediction runner with polling and retry
  // ===========================================================================

  /**
   * Create and poll a Replicate prediction until completion.
   * Implements production-grade retry logic with:
   * - Exponential backoff (1s, 2s, 4s, 8s, 16s)
   * - Jitter to prevent thundering herd
   * - Retry-After header parsing for 429 responses
   *
   * @param model Model identifier (owner/name or owner/name:version)
   * @param input Model input parameters
   * @returns Completed prediction object
   */
  private async runPrediction(
    model: string,
    input: Record<string, unknown>
  ): Promise<any> {
    let lastError: Error | null = null;
    let lastRetryAfter: number | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = calculateBackoffDelay(attempt - 1, lastRetryAfter);
          console.log(
            `Replicate: Retry ${attempt}/${MAX_RETRIES} after ${Math.round(delay)}ms` +
            (lastRetryAfter ? ` (server suggested ${lastRetryAfter}s)` : '')
          );
          await this.sleep(delay);
        }

        return await this.executePrediction(model, input);
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Extract retry-after from error metadata if available
        if (error.retryAfter !== undefined) {
          lastRetryAfter = error.retryAfter;
        } else {
          lastRetryAfter = undefined;
        }

        // Check if this is a non-retryable error
        if (error.statusCode && NON_RETRYABLE_STATUS_CODES.has(error.statusCode)) {
          console.error(`Replicate: Non-retryable error (${error.statusCode}):`, lastError.message);
          throw lastError;
        }

        // Explicitly non-retryable (e.g., prediction failed/canceled terminal states)
        if (error.isRetryable === false) {
          console.error('Replicate: Terminal error (not retryable):', lastError.message);
          throw lastError;
        }

        // Check if this is a retryable error
        const isRetryable = 
          (error.statusCode && RETRYABLE_STATUS_CODES.has(error.statusCode)) ||
          error.isRetryable === true;

        if (!isRetryable && attempt === 0) {
          // First attempt failed with unknown error - try once more
          console.warn(`Replicate: Attempt ${attempt + 1} failed (will retry):`, lastError.message);
        } else if (!isRetryable) {
          // Not a retryable error after first retry
          console.error(`Replicate: Non-retryable error after ${attempt + 1} attempts:`, lastError.message);
          throw lastError;
        } else {
          console.warn(
            `Replicate: Attempt ${attempt + 1} failed with retryable error ` +
            `(${error.statusCode || 'unknown'}):`, lastError.message
          );
        }
      }
    }

    console.error(`Replicate: All ${MAX_RETRIES + 1} attempts failed`);
    throw lastError || new Error('Replicate prediction failed after retries');
  }

  /**
   * Execute a single prediction request with polling.
   * Throws enhanced errors with statusCode and retryAfter for retry logic.
   *
   * Replicate has two prediction endpoints:
   * - Official models (owner/name): POST /models/{owner}/{name}/predictions
   * - Versioned models (owner/name:hash): POST /predictions with { version }
   */
  private async executePrediction(
    model: string,
    input: Record<string, unknown>
  ): Promise<any> {
    const hasVersion = model.includes(':');
    let endpoint: string;
    let requestBody: Record<string, unknown>;

    if (hasVersion) {
      // Community/versioned model: POST /predictions with version in body
      const version = model.split(':')[1];
      endpoint = `${this.baseUrl}/predictions`;
      requestBody = { version, input };
    } else {
      // Official model: POST /models/{owner}/{name}/predictions
      endpoint = `${this.baseUrl}/models/${model}/predictions`;
      requestBody = { input };
    }

    // Create prediction
    const createResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'wait', // Use Replicate's sync mode when possible
      },
      body: JSON.stringify(requestBody),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      const statusCode = createResponse.status;
      
      // Create enhanced error with metadata for retry logic
      const error = new Error(
        `Replicate API error (${statusCode}): ${errorText}`
      ) as Error & { statusCode: number; retryAfter?: number; isRetryable?: boolean };
      
      error.statusCode = statusCode;
      
      // Parse Retry-After header for rate limit errors
      if (statusCode === 429) {
        const retryAfterValue = parseRetryAfter(createResponse as unknown as Response);
        if (retryAfterValue !== undefined) {
          error.retryAfter = retryAfterValue;
        }
        error.isRetryable = true;
        error.message = `Replicate: Rate limited (429)${error.retryAfter ? ` - retry after ${error.retryAfter}s` : ''}`;
      }
      
      // Mark server errors as retryable
      if (statusCode >= 500 && statusCode < 600) {
        error.isRetryable = true;
      }
      
      // Specific error messages for known status codes
      if (statusCode === 401) {
        error.message = 'Replicate API key is invalid or expired';
      } else if (statusCode === 402) {
        error.message = 'Replicate: Insufficient credits or payment required';
      } else if (statusCode === 422) {
        error.message = `Replicate: Invalid input - ${errorText}`;
      }
      
      throw error;
    }

    let prediction: any = await createResponse.json();

    // If prediction already completed (sync mode with Prefer: wait), return it
    if (prediction.status === 'succeeded') {
      return prediction;
    }

    if (prediction.status === 'failed') {
      throw Object.assign(
        new Error(prediction.error || 'Prediction failed immediately'),
        { isRetryable: false }
      );
    }

    // Poll for completion with rate limit handling
    const startTime = Date.now();
    let pollRetries = 0;
    const MAX_POLL_RETRIES = 3;
    
    while (
      prediction.status !== 'succeeded' &&
      prediction.status !== 'failed' &&
      prediction.status !== 'canceled'
    ) {
      if (Date.now() - startTime > PREDICTION_TIMEOUT) {
        // Attempt to cancel the prediction
        try {
          await fetch(`${this.baseUrl}/predictions/${prediction.id}/cancel`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.apiKey}` },
          });
        } catch {
          // Ignore cancel errors
        }
        throw new Error(
          `Replicate: Prediction timed out after ${PREDICTION_TIMEOUT / 1000}s`
        );
      }

      await this.sleep(POLL_INTERVAL);

      const pollUrl = prediction.urls?.get || `${this.baseUrl}/predictions/${prediction.id}`;
      const statusResponse = await fetch(pollUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      // Handle rate limiting during polling
      if (statusResponse.status === 429) {
        pollRetries++;
        if (pollRetries > MAX_POLL_RETRIES) {
          const error = new Error('Replicate: Rate limited during polling') as Error & { statusCode: number; isRetryable: boolean };
          error.statusCode = 429;
          error.isRetryable = true;
          throw error;
        }
        const retryAfter = parseRetryAfter(statusResponse as unknown as Response) || 5;
        console.warn(`Replicate: Rate limited during poll, waiting ${retryAfter}s (attempt ${pollRetries}/${MAX_POLL_RETRIES})`);
        await this.sleep(retryAfter * 1000);
        continue;
      }

      if (!statusResponse.ok) {
        // For server errors during polling, retry a few times
        if (statusResponse.status >= 500 && pollRetries < MAX_POLL_RETRIES) {
          pollRetries++;
          console.warn(`Replicate: Server error during poll (${statusResponse.status}), retrying...`);
          await this.sleep(2000);
          continue;
        }
        throw new Error(
          `Replicate: Failed to poll prediction status (${statusResponse.status})`
        );
      }

      // Reset poll retries on successful response
      pollRetries = 0;
      prediction = await statusResponse.json();
    }

    if (prediction.status === 'failed') {
      const err = Object.assign(
        new Error(prediction.error || 'Replicate prediction failed'),
        { isRetryable: false }
      );
      throw err;
    }

    if (prediction.status === 'canceled') {
      const err = Object.assign(
        new Error('Replicate prediction was canceled'),
        { isRetryable: false }
      );
      throw err;
    }

    return prediction;
  }

  // ===========================================================================
  // DECOMPOSE - Auto-decompose image into isolated layers using SAM
  // ===========================================================================

  /**
   * Decompose an image into isolated semantic layers using SAM auto-segmentation.
   * 
   * Pipeline:
   * 1. Run SAM auto-segment to detect all objects → individual masks
   * 2. Fetch each mask image from Replicate CDN
   * 3. Apply each mask as alpha channel to the original image using Sharp
   * 4. Return array of isolated RGBA layer images (base64 PNGs)
   * 
   * @param imageBase64 Base64-encoded source image
   * @param maxLayers Maximum number of layers to extract (default: 8)
   * @returns Array of decomposed layer objects with base64 PNG data and metadata
   */
  async decompose(
    imageBase64: string,
    maxLayers: number = 8
  ): Promise<{
    layers: Array<{
      name: string;
      imageBase64: string;
      bounds: { x: number; y: number; width: number; height: number };
      score: number;
    }>;
    predictionId: string;
  }> {
    if (!this.apiKey) {
      throw new Error('Replicate API key not configured');
    }

    // Step 1: Run SAM auto-segment to get individual masks
    console.log('[Decompose] Running SAM auto-segmentation...');
    const segResult = await this.segment(imageBase64, {
      pointsPerSide: 32,
      predIouThresh: 0.88,
      stabilityScoreThresh: 0.95,
    });

    if (!segResult.masks || segResult.masks.length === 0) {
      throw new Error('SAM segmentation returned no masks');
    }

    // Sort by score and limit to maxLayers
    const topMasks = segResult.masks
      .sort((a, b) => b.score - a.score)
      .slice(0, maxLayers);

    console.log(`[Decompose] Got ${segResult.masks.length} masks, using top ${topMasks.length}`);

    // Step 2: Decode the original image with Sharp
    const originalBuffer = this.base64ToBuffer(imageBase64);
    const originalMeta = await sharp(originalBuffer).metadata();
    const origWidth = originalMeta.width || 1280;
    const origHeight = originalMeta.height || 720;

    // Ensure original is RGBA
    const originalRgba = await sharp(originalBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer();

    // Step 3: For each mask, apply it to the original image
    const layers: Array<{
      name: string;
      imageBase64: string;
      bounds: { x: number; y: number; width: number; height: number };
      score: number;
    }> = [];

    for (let i = 0; i < topMasks.length; i++) {
      const mask = topMasks[i]!;
      try {
        console.log(`[Decompose] Processing layer ${i + 1}/${topMasks.length}...`);

        // Fetch mask image from Replicate CDN
        const maskResponse = await fetch(mask.url);
        if (!maskResponse.ok) {
          console.warn(`[Decompose] Failed to fetch mask ${i}: ${maskResponse.status}`);
          continue;
        }
        const maskArrayBuffer = await maskResponse.arrayBuffer();
        const maskBuffer = Buffer.from(maskArrayBuffer);

        // Resize mask to match original dimensions and convert to single-channel grayscale
        const maskGray = await sharp(maskBuffer)
          .resize(origWidth, origHeight, { fit: 'fill' })
          .grayscale()
          .raw()
          .toBuffer();

        // Apply mask as alpha channel: for each pixel, alpha = mask brightness
        const layerPixels = Buffer.alloc(origWidth * origHeight * 4);
        for (let px = 0; px < origWidth * origHeight; px++) {
          const srcIdx = px * 4;
          const dstIdx = px * 4;
          const maskVal = maskGray[px]; // 0-255 grayscale

          layerPixels[dstIdx] = originalRgba[srcIdx] ?? 0;       // R
          layerPixels[dstIdx + 1] = originalRgba[srcIdx + 1] ?? 0; // G
          layerPixels[dstIdx + 2] = originalRgba[srcIdx + 2] ?? 0; // B
          layerPixels[dstIdx + 3] = maskVal ?? 0;                   // A from mask
        }

        // Calculate bounding box of non-transparent pixels
        let minX = origWidth, minY = origHeight, maxX = 0, maxY = 0;
        for (let y = 0; y < origHeight; y++) {
          for (let x = 0; x < origWidth; x++) {
            const alpha = layerPixels[(y * origWidth + x) * 4 + 3] ?? 0;
            if (alpha > 10) { // threshold to ignore near-transparent pixels
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        // Skip layers with no visible content
        if (maxX <= minX || maxY <= minY) continue;

        const bounds = {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        };

        // Convert to PNG using Sharp
        const layerPng = await sharp(layerPixels, {
          raw: { width: origWidth, height: origHeight, channels: 4 },
        })
          .png()
          .toBuffer();

        const layerBase64 = `data:image/png;base64,${layerPng.toString('base64')}`;

        layers.push({
          name: `Layer ${i + 1}`,
          imageBase64: layerBase64,
          bounds,
          score: mask!.score,
        });
      } catch (layerError) {
        console.warn(`[Decompose] Error processing layer ${i}:`, layerError);
        // Continue with other layers
      }
    }

    if (layers.length === 0) {
      throw new Error('Decomposition produced no valid layers');
    }

    console.log(`[Decompose] Successfully created ${layers.length} layers`);

    return {
      layers,
      predictionId: segResult.predictionId,
    };
  }

  /**
   * Convert a base64 string (with or without data URL prefix) to a Buffer
   */
  private base64ToBuffer(base64: string): Buffer {
    const data = base64.startsWith('data:')
      ? base64.split(',')[1] ?? base64
      : base64;
    return Buffer.from(data, 'base64');
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Ensure image has proper data URL prefix for Replicate API
   */
  private ensureDataUrl(imageBase64: string): string {
    if (imageBase64.startsWith('data:image')) {
      return imageBase64;
    }
    return `data:image/png;base64,${imageBase64}`;
  }
}
