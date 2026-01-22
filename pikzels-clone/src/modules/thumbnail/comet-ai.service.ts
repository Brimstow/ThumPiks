import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * CometAIService - AI Service using CometAPI aggregation platform
 *
 * CometAPI is an API aggregation platform that provides unified access to
 * various AI models including FLUX image generation, Midjourney, DALL-E, etc.
 *
 * Supported image generation endpoints:
 * - /flux/generate - Direct FLUX image generation
 * - /replicate/v1/predictions - Replicate-compatible endpoint
 * - /v1/images/generations - OpenAI-compatible endpoint
 *
 * @see https://api.cometapi.com/doc
 */
export class CometAIService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.COMET_API_KEY || '';
    // CometAPI base URL - normalize to remove trailing /v1 if present
    let baseUrl = process.env.COMET_API_URL || 'https://api.cometapi.com';
    // Remove trailing slash and /v1 suffix if present (user may have set full OpenAI-style URL)
    baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    if (baseUrl.endsWith('/v1')) {
      baseUrl = baseUrl.slice(0, -3); // Remove /v1 suffix
    }
    this.apiUrl = baseUrl;

    if (!this.apiKey) {
      console.warn(
        'COMET_API_KEY not found in environment variables. Comet AI features will not work.'
      );
    }
  }

  /**
   * Generate images using CometAPI's FLUX endpoint
   * This is the recommended method for FLUX image generation
   *
   * @param prompt Text prompt for image generation
   * @param style Style of the image (bold, minimalist, dramatic)
   * @returns Array of image URLs
   */
  async generateImages(
    prompt: string,
    style: string = 'default'
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('Comet API key not configured');
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

    // Try FLUX endpoint first, then fallback to Replicate-style endpoint
    try {
      return await this.generateWithFluxEndpoint(styledPrompt);
    } catch (fluxError) {
      console.warn(
        'FLUX endpoint failed, trying Replicate endpoint:',
        fluxError instanceof Error ? fluxError.message : fluxError
      );

      try {
        return await this.generateWithReplicateEndpoint(styledPrompt);
      } catch (replicateError) {
        // If both fail, throw the original FLUX error as it's more descriptive
        throw fluxError;
      }
    }
  }

  /**
   * Generate images using CometAPI's dedicated FLUX endpoint
   * @param prompt The styled prompt
   * @returns Array of image URLs
   */
  private async generateWithFluxEndpoint(prompt: string): Promise<string[]> {
    // CometAPI FLUX generation endpoint
    const response = await fetch(`${this.apiUrl}/flux/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        model: process.env.COMET_FLUX_MODEL || 'flux-dev', // flux-dev, flux-schnell, flux-pro
        width: 1792, // 16:9 aspect ratio for thumbnails
        height: 1024,
        num_outputs: 1,
        output_format: 'jpg',
        output_quality: 90,
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
      if (response.status === 402) {
        throw new Error('Comet API: Insufficient credits or payment required');
      }
      if (response.status === 404) {
        throw new Error(
          'Comet API: FLUX endpoint not found. The API may have changed.'
        );
      }

      throw new Error(
        errorData.error?.message ||
          errorData.detail ||
          `Comet API error (${response.status}): ${response.statusText}`
      );
    }

    const data: any = await response.json();

    // Handle different response formats
    // Direct image URLs
    if (data.images && Array.isArray(data.images)) {
      return data.images.filter((url: string) => url);
    }

    // Output field (common in FLUX responses)
    if (data.output) {
      const output = Array.isArray(data.output) ? data.output : [data.output];
      return output.filter((url: string) => url);
    }

    // Data array format
    if (data.data && Array.isArray(data.data)) {
      return data.data
        .map((item: any) => item.url || item.image_url || item)
        .filter((url: string) => typeof url === 'string' && url);
    }

    // Single URL response
    if (data.url || data.image_url) {
      return [data.url || data.image_url];
    }

    throw new Error('Invalid response from Comet FLUX API - no images found');
  }

  /**
   * Generate images using CometAPI's Replicate-compatible endpoint
   * This is an async endpoint that requires polling
   *
   * @param prompt The styled prompt
   * @returns Array of image URLs
   */
  private async generateWithReplicateEndpoint(
    prompt: string
  ): Promise<string[]> {
    // CometAPI Replicate-format endpoint for FLUX
    const response = await fetch(`${this.apiUrl}/replicate/v1/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        // Use FLUX Dev model - CometAPI uses 'model' field, not 'version'
        model:
          process.env.COMET_REPLICATE_MODEL || 'black-forest-labs/flux-dev',
        input: {
          prompt: prompt,
          num_outputs: 1,
          aspect_ratio: '16:9', // Good for thumbnails
          output_format: 'jpg',
          output_quality: 90,
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
   * Generate images using OpenAI-compatible endpoint (DALL-E style)
   * Alternative method if FLUX endpoints are not available
   *
   * @param prompt Text prompt for image generation
   * @param style Style of the image
   * @returns Array of image URLs
   */
  async generateWithOpenAIEndpoint(
    prompt: string,
    style: string = 'default'
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('Comet API key not configured');
    }

    let styledPrompt = prompt;
    switch (style.toLowerCase()) {
      case 'bold':
        styledPrompt = `Bold, eye-catching design: ${prompt}. High contrast, vibrant colors.`;
        break;
      case 'minimalist':
        styledPrompt = `Minimalist design: ${prompt}. Clean, simple, minimal elements.`;
        break;
      case 'dramatic':
        styledPrompt = `Dramatic style: ${prompt}. Strong lighting, high contrast.`;
        break;
    }

    const response = await fetch(`${this.apiUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.COMET_OPENAI_MODEL || 'dall-e-3',
        prompt: styledPrompt,
        n: 1,
        size: '1792x1024',
        quality: 'hd',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `Comet OpenAI-style API error (${response.status})`
      );
    }

    const data: any = await response.json();

    if (data.data && Array.isArray(data.data)) {
      return data.data
        .map((item: any) => item.url)
        .filter((url: string) => url);
    }

    throw new Error('Invalid response from Comet OpenAI-style API');
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
   * Validate if the Comet AI service is properly configured
   * @returns Boolean indicating if the service is ready to use
   */
  isConfigured(): boolean {
    return !!this.apiKey;
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
