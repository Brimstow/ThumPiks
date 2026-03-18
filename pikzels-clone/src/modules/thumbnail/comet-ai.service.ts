import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * CometAIService - Flash-tier image generation service
 *
 * Uses the same model (flux-schnell) across two gateways:
 * 1. Replicate API directly (REPLICATE_API_KEY) — primary, no middleman
 * 2. CometAPI /replicate/v1/predictions (COMET_API_KEY) — fallback, same model
 *
 * Default model: black-forest-labs/flux-schnell (~0.6s, ~$0.003/image)
 *
 * @see https://replicate.com/docs/reference/http
 * @see https://api.cometapi.com/doc
 */
export class CometAIService {
  private apiKey: string;
  private apiUrl: string;
  private replicateApiKey: string;
  private replicateBaseUrl: string;

  constructor() {
    this.apiKey = process.env.COMET_API_KEY || '';
    this.replicateApiKey = process.env.REPLICATE_API_KEY || '';
    this.replicateBaseUrl =
      process.env.REPLICATE_API_URL || 'https://api.replicate.com/v1';

    // CometAPI base URL - normalize to remove trailing /v1 if present
    let baseUrl = process.env.COMET_API_URL || 'https://api.cometapi.com';
    baseUrl = baseUrl.replace(/\/+$/, '');
    if (baseUrl.endsWith('/v1')) {
      baseUrl = baseUrl.slice(0, -3);
    }
    this.apiUrl = baseUrl;

    if (!this.replicateApiKey && !this.apiKey) {
      console.warn(
        'Neither REPLICATE_API_KEY nor COMET_API_KEY found. Flash-tier image generation will not work.'
      );
    }
  }

  /**
   * Generate images using flux-schnell via two gateways:
   * 1. Replicate API directly (primary — no middleman)
   * 2. CometAPI /replicate/v1/predictions (fallback — same model, different gateway)
   *
   * @param prompt Text prompt for image generation
   * @param style Style of the image (bold, minimalist, dramatic)
   * @returns Array of image URLs
   */
  async generateImages(
    prompt: string,
    style: string = 'default'
  ): Promise<string[]> {
    if (!this.replicateApiKey && !this.apiKey) {
      throw new Error('No API keys configured for Flash-tier generation');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    // Apply style modifications to prompt
    let styledPrompt = prompt;
    switch (style.toLowerCase()) {
      case 'bold':
        styledPrompt = `Bold, eye-catching design: ${prompt}. High contrast, vibrant colors, clear focal point.`;
        break;
      case 'minimalist':
        styledPrompt = `Minimalist design: ${prompt}. Clean, simple, minimal elements.`;
        break;
      case 'dramatic':
        styledPrompt = `Dramatic style: ${prompt}. Strong lighting, high contrast, cinematic feel.`;
        break;
    }

    const errors: string[] = [];

    // 1. Primary: Replicate API directly (the actual model provider)
    if (this.replicateApiKey) {
      try {
        console.log('[CometAI] Trying Replicate API directly (primary)');
        return await this.generateWithReplicateAPI(styledPrompt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[CometAI] Replicate API failed:', msg);
        errors.push(`Replicate: ${msg}`);
      }
    }

    // 2. Fallback: CometAPI — same flux-schnell model, different gateway
    if (this.apiKey) {
      try {
        console.log(
          '[CometAI] Trying CometAPI fallback (same model, different gateway)'
        );
        return await this.generateWithCometEndpoint(styledPrompt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[CometAI] CometAPI fallback failed:', msg);
        errors.push(`CometAPI: ${msg}`);
      }
    }

    throw new Error(`All Flash-tier providers failed: ${errors.join(' | ')}`);
  }

  /**
   * Generate images using Replicate API directly
   * Uses the official Replicate predictions endpoint with flux-schnell
   *
   * @param prompt The styled prompt
   * @returns Array of image URLs
   */
  private async generateWithReplicateAPI(prompt: string): Promise<string[]> {
    const model =
      process.env.COMET_REPLICATE_MODEL || 'black-forest-labs/flux-schnell';
    const url = `${this.replicateBaseUrl}/models/${model}/predictions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.replicateApiKey}`,
        Prefer: 'wait', // Request synchronous response (Replicate supports this for fast models)
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          num_outputs: 1,
          aspect_ratio: '16:9',
          output_format: 'jpg',
          output_quality: 90,
          go_fast: true,
        },
      }),
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Replicate API key is invalid or expired');
      }
      if (response.status === 429) {
        throw new Error('Replicate rate limit exceeded');
      }
      throw new Error(
        errorData.detail || `Replicate API error (${response.status})`
      );
    }

    const data: any = await response.json();

    // If prediction completed synchronously (Prefer: wait)
    if (data.status === 'succeeded' && data.output) {
      const imageUrls = Array.isArray(data.output)
        ? data.output
        : [data.output];
      return imageUrls.filter((url: string) => url);
    }

    // If still processing, poll for completion
    if (
      data.id &&
      (data.status === 'starting' || data.status === 'processing')
    ) {
      return await this.pollReplicatePrediction(data.id);
    }

    if (data.status === 'failed') {
      throw new Error(data.error || 'Replicate prediction failed');
    }

    throw new Error(`Unexpected Replicate response status: ${data.status}`);
  }

  /**
   * Poll Replicate API for prediction completion
   * @param predictionId The prediction ID to poll
   * @returns Array of image URLs
   */
  private async pollReplicatePrediction(
    predictionId: string
  ): Promise<string[]> {
    const maxAttempts = 60;
    const pollInterval = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const pollResponse = await fetch(
        `${this.replicateBaseUrl}/predictions/${predictionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.replicateApiKey}`,
          },
        }
      );

      if (!pollResponse.ok) {
        if (pollResponse.status >= 500) continue;
        throw new Error(`Replicate poll failed (${pollResponse.status})`);
      }

      const pollData: any = await pollResponse.json();

      if (pollData.status === 'succeeded' && pollData.output) {
        const imageUrls = Array.isArray(pollData.output)
          ? pollData.output
          : [pollData.output];
        return imageUrls.filter((url: string) => url);
      }
      if (pollData.status === 'failed') {
        throw new Error(pollData.error || 'Replicate prediction failed');
      }
      if (pollData.status === 'canceled') {
        throw new Error('Replicate prediction was canceled');
      }
    }

    throw new Error('Replicate prediction timed out after 60 seconds');
  }

  /**
   * Generate images using CometAPI's Replicate-compatible endpoint
   * Same model (flux-schnell) as the primary Replicate path, different gateway
   *
   * @param prompt The styled prompt
   * @returns Array of image URLs
   */
  private async generateWithCometEndpoint(prompt: string): Promise<string[]> {
    // Same model as primary — ensures consistent results across gateways
    const model =
      process.env.COMET_REPLICATE_MODEL || 'black-forest-labs/flux-schnell';

    const response = await fetch(`${this.apiUrl}/replicate/v1/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: {
          prompt: prompt,
          num_outputs: 1,
          aspect_ratio: '16:9',
          output_format: 'jpg',
          output_quality: 90,
          go_fast: true,
        },
      }),
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));

      if (response.status === 401) {
        throw new Error('Comet API key is invalid or expired');
      }
      if (response.status === 429) {
        throw new Error(
          'Comet API rate limit exceeded. Please try again later.'
        );
      }

      throw new Error(
        errorData.error?.message ||
          errorData.detail ||
          `Comet Replicate API error (${response.status})`
      );
    }

    const data: any = await response.json();

    // Get prediction ID - could be in id or data.task_id (CometAPI format)
    const predictionId = data.id || data.data?.task_id;

    if (!predictionId) {
      throw new Error('No prediction ID returned from CometAPI');
    }

    // Replicate format returns a prediction object with output URLs
    // Poll for completion if status is not 'succeeded'
    if (
      data.status === 'processing' ||
      data.status === 'starting' ||
      data.status === 'pending'
    ) {
      return await this.pollForCompletion(predictionId);
    }

    // Check CometAPI wrapped format: { code, data: { status, data: { output } } }
    if (data.code === 'success' && data.data?.status === 'SUCCESS') {
      const output = data.data.data?.output || data.data.output;
      if (output) {
        const imageUrls = Array.isArray(output) ? output : [output];
        return imageUrls.filter((url: string) => url);
      }
    }

    // If already completed (standard Replicate format), extract output
    if (data.status === 'succeeded' && data.output) {
      const imageUrls = Array.isArray(data.output)
        ? data.output
        : [data.output];
      return imageUrls.filter((url: string) => url);
    }

    // Handle failed status
    if (data.status === 'failed' || data.data?.status === 'FAILED') {
      throw new Error(
        data.error || data.data?.fail_reason || 'Image generation failed'
      );
    }

    // If we have an ID but unknown status, poll for completion
    if (predictionId) {
      return await this.pollForCompletion(predictionId);
    }

    throw new Error(
      `Invalid response from Comet API: ${data.status || data.data?.status || 'unknown status'}`
    );
  }

  /**
   * Poll for prediction completion (Replicate async pattern)
   * CometAPI returns a wrapped response format:
   * { code: "success", data: { task_id, status: "SUCCESS", data: { output: [...] } } }
   *
   * @param predictionId The prediction ID to poll
   * @returns Array of image URLs
   */
  private async pollForCompletion(predictionId: string): Promise<string[]> {
    const maxAttempts = 60; // 60 attempts = ~60 seconds
    const pollInterval = 1000; // 1 second

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const pollResponse = await fetch(
        `${this.apiUrl}/replicate/v1/predictions/${predictionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!pollResponse.ok) {
        // Continue polling on transient errors
        if (pollResponse.status >= 500) {
          continue;
        }
        throw new Error(`Polling failed with status ${pollResponse.status}`);
      }

      const pollData: any = await pollResponse.json();

      // CometAPI wrapped response format: { code, data: { status, data: { output } } }
      if (pollData.code === 'success' && pollData.data) {
        const taskData = pollData.data;

        // Check for SUCCESS status (uppercase in CometAPI)
        if (taskData.status === 'SUCCESS' || taskData.status === 'succeeded') {
          // Output is in data.data.output for CometAPI
          const output = taskData.data?.output || taskData.output;
          if (output) {
            const imageUrls = Array.isArray(output) ? output : [output];
            return imageUrls.filter((url: string) => url);
          }
        }

        // Check for failed status
        if (taskData.status === 'FAILED' || taskData.status === 'failed') {
          throw new Error(
            taskData.fail_reason ||
              taskData.data?.error ||
              'Image generation failed'
          );
        }

        // Still processing - continue polling
        if (
          taskData.status === 'PENDING' ||
          taskData.status === 'PROCESSING' ||
          taskData.status === 'processing' ||
          taskData.status === 'starting'
        ) {
          continue;
        }
      }

      // Standard Replicate format fallback
      if (pollData.status === 'succeeded' && pollData.output) {
        const imageUrls = Array.isArray(pollData.output)
          ? pollData.output
          : [pollData.output];
        return imageUrls.filter((url: string) => url);
      }

      if (pollData.status === 'failed') {
        throw new Error(pollData.error || 'Image generation failed');
      }

      if (pollData.status === 'canceled') {
        throw new Error('Image generation was canceled');
      }

      // Continue polling if still processing
    }

    throw new Error(
      'Image generation timed out after 60 seconds. Please try again.'
    );
  }

  /**
   * Query the status of a generation task
   * Handles both standard Replicate format and CometAPI wrapped format
   *
   * @param taskId The task/prediction ID to query
   * @returns Task status object
   */
  async queryTaskStatus(taskId: string): Promise<{
    status: string;
    output?: string[] | undefined;
    error?: string | undefined;
  }> {
    const response = await fetch(
      `${this.apiUrl}/replicate/v1/predictions/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to query task status: ${response.status}`);
    }

    const data: any = await response.json();

    // Handle CometAPI wrapped format
    if (data.code === 'success' && data.data) {
      const taskData = data.data;
      const output = taskData.data?.output || taskData.output;

      const result: {
        status: string;
        output?: string[] | undefined;
        error?: string | undefined;
      } = {
        status: taskData.status,
      };

      if (output) {
        result.output = Array.isArray(output) ? output : [output];
      }

      if (taskData.fail_reason || taskData.data?.error) {
        result.error = taskData.fail_reason || taskData.data?.error;
      }

      return result;
    }

    // Standard Replicate format
    const result: {
      status: string;
      output?: string[] | undefined;
      error?: string | undefined;
    } = {
      status: data.status,
    };

    if (data.output) {
      result.output = Array.isArray(data.output) ? data.output : [data.output];
    }

    if (data.error) {
      result.error = data.error;
    }

    return result;
  }

  /**
   * Validate if the service is properly configured
   * Returns true if at least one provider (Replicate or CometAPI) has a key
   */
  isConfigured(): boolean {
    return !!this.replicateApiKey || !!this.apiKey;
  }

  /**
   * Get service information
   * @returns Object with service details
   */
  getServiceInfo(): { name: string; apiUrl: string; configured: boolean } {
    return {
      name: 'CometAPI',
      apiUrl: this.apiUrl,
      configured: this.isConfigured(),
    };
  }
}
