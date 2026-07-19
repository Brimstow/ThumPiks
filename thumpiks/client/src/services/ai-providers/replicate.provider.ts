/**
 * Replicate AI Provider
 * External API provider for high-quality image generation, inpainting, face swap
 */

import { BaseAIProvider } from './base.provider';
import type {
  AITaskType,
  AITaskResult,
  AIGenerateRequest,
  AIInpaintRequest,
  AIFaceSwapRequest,
  AIUpscaleRequest,
  AISegmentRequest,
  AISegmentResult,
  ReplicateConfig,
} from './types';

// Default model versions on Replicate
const DEFAULT_MODELS = {
  // FLUX.2 for generation (latest and best quality)
  generation: 'black-forest-labs/flux-schnell',
  // SDXL Inpainting
  inpainting: 'stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3',
  // Face swap model
  faceSwap: 'lucataco/faceswap:9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d',
  // Real-ESRGAN for upscaling
  upscale: 'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
  // FLUX Kontext for image editing
  imageEdit: 'black-forest-labs/flux-kontext-dev',
  // SAM 2 for smart selection/segmentation
  segment: 'meta/sam-2-hiera-large',
};

export class ReplicateProvider extends BaseAIProvider {
  readonly name = 'Replicate';
  readonly type = 'replicate' as const;
  readonly supportedTasks: AITaskType[] = [
    'generate',
    'inpaint',
    'face-swap',
    'upscale',
    'segment',
  ];
  
  private apiKey: string;
  private models: typeof DEFAULT_MODELS;
  private baseUrl = 'https://api.replicate.com/v1';
  
  constructor(config: ReplicateConfig) {
    super();
    this.apiKey = config.apiKey;
    this.models = { ...DEFAULT_MODELS, ...config.models };
  }
  
  protected async _initialize(): Promise<void> {
    // Validate API key by making a simple request
    if (!this.apiKey) {
      console.warn('Replicate API key not provided - provider will be disabled');
      return;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`API validation failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to initialize Replicate provider:', error);
      // Don't throw - provider can still work if key is valid later
    }
  }
  
  estimateCost(task: AITaskType): number {
    // Approximate costs per task in USD
    const costs: Record<AITaskType, number> = {
      'generate': 0.003,      // ~$0.003 per image with FLUX Schnell
      'inpaint': 0.0029,      // ~$0.003 per inpaint
      'outpaint': 0.005,
      'remove-bg': 0.001,
      'face-swap': 0.002,
      'upscale': 0.0015,
      'style-transfer': 0.003,
      'enhance': 0.002,
      'segment': 0.001,
      'analyze': 0.001,
    };
    return costs[task] || 0.01;
  }
  
  /**
   * Make a prediction request to Replicate
   */
  private async runPrediction(
    model: string,
    input: Record<string, unknown>,
    taskId: string
  ): Promise<AITaskResult> {
    const startTime = Date.now();
    
    try {
      // Create prediction
      const createResponse = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: model.includes(':') ? model.split(':')[1] : undefined,
          model: model.includes(':') ? model.split(':')[0] : model,
          input,
        }),
      });
      
      if (!createResponse.ok) {
        const error = await createResponse.text();
        return this.createErrorResult(taskId, `Failed to create prediction: ${error}`);
      }
      
      let prediction = await createResponse.json();
      
      // Poll for completion
      while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(prediction.urls.get, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });
        
        prediction = await statusResponse.json();
      }
      
      if (prediction.status === 'failed') {
        return this.createErrorResult(taskId, prediction.error || 'Prediction failed');
      }
      
      // Get output URL
      const output = Array.isArray(prediction.output) 
        ? prediction.output[0] 
        : prediction.output;
      
      return {
        success: true,
        taskId,
        status: 'completed',
        progress: 100,
        imageUrl: output,
        cost: this.estimateCost('generate'),
        processingTime: Date.now() - startTime,
        metadata: {
          model,
          predictionId: prediction.id,
        },
      };
    } catch (error) {
      return this.createErrorResult(
        taskId, 
        `Replicate API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Generate image from text prompt
   */
  async generate(request: AIGenerateRequest): Promise<AITaskResult> {
    const taskId = this.generateTaskId();
    
    // Calculate dimensions from aspect ratio
    const dimensions = this.getAspectRatioDimensions(request.aspectRatio || '16:9');
    
    const input: Record<string, unknown> = {
      prompt: this.buildPrompt(request.prompt, request.style),
      width: request.width || dimensions.width,
      height: request.height || dimensions.height,
      num_outputs: 1,
      num_inference_steps: request.steps || 4, // FLUX Schnell is optimized for 4 steps
      guidance_scale: request.guidance || 0, // FLUX Schnell doesn't use guidance
    };
    
    if (request.negativePrompt) {
      input.negative_prompt = request.negativePrompt;
    }
    
    if (request.seed) {
      input.seed = request.seed;
    }
    
    return this.runPrediction(this.models.generation, input, taskId);
  }
  
  /**
   * Inpaint masked region of image
   */
  async inpaint(request: AIInpaintRequest): Promise<AITaskResult> {
    const taskId = this.generateTaskId();
    
    const [imageBase64, maskBase64] = await Promise.all([
      this.imageToBase64(request.image),
      this.imageToBase64(request.mask),
    ]);
    
    const input: Record<string, unknown> = {
      image: `data:image/png;base64,${imageBase64}`,
      mask: `data:image/png;base64,${maskBase64}`,
      prompt: request.prompt,
      num_outputs: 1,
      guidance_scale: 7.5,
    };
    
    if (request.negativePrompt) {
      input.negative_prompt = request.negativePrompt;
    }
    
    if (request.strength) {
      input.prompt_strength = request.strength;
    }
    
    return this.runPrediction(this.models.inpainting, input, taskId);
  }
  
  /**
   * Swap faces between images
   */
  async faceSwap(request: AIFaceSwapRequest): Promise<AITaskResult> {
    const taskId = this.generateTaskId();
    
    const [sourceBase64, targetBase64] = await Promise.all([
      this.imageToBase64(request.sourceImage),
      this.imageToBase64(request.targetImage),
    ]);
    
    const input: Record<string, unknown> = {
      source_image: `data:image/png;base64,${sourceBase64}`,
      target_image: `data:image/png;base64,${targetBase64}`,
    };
    
    return this.runPrediction(this.models.faceSwap, input, taskId);
  }
  
  /**
   * Upscale image resolution
   */
  async upscale(request: AIUpscaleRequest): Promise<AITaskResult> {
    const taskId = this.generateTaskId();
    
    const imageBase64 = await this.imageToBase64(request.image);
    
    const input: Record<string, unknown> = {
      image: `data:image/png;base64,${imageBase64}`,
      scale: request.scale || 2,
      face_enhance: request.model === 'face',
    };
    
    return this.runPrediction(this.models.upscale, input, taskId);
  }
  
  /**
   * Segment objects in image using SAM (Segment Anything Model)
   * Returns masks for detected objects based on point/box prompts
   */
  async segment(request: AISegmentRequest): Promise<AISegmentResult> {
    const taskId = this.generateTaskId();
    const startTime = Date.now();
    
    try {
      const imageBase64 = await this.imageToBase64(request.image);
      
      const input: Record<string, unknown> = {
        image: `data:image/png;base64,${imageBase64}`,
        // SAM 2 uses point_coords and point_labels for point prompts
        // Format: [[x1, y1], [x2, y2], ...] and [1, 0, ...] (1=foreground, 0=background)
      };
      
      // Convert points to SAM format if provided
      if (request.points && request.points.length > 0) {
        const pointCoords: number[][] = [];
        const pointLabels: number[] = [];
        
        request.points.forEach(point => {
          pointCoords.push([point.x, point.y]);
          pointLabels.push(point.label === 'foreground' ? 1 : 0);
        });
        
        input.point_coords = pointCoords;
        input.point_labels = pointLabels;
      }
      
      // Convert box to SAM format if provided
      if (request.box) {
        // SAM expects box as [x1, y1, x2, y2]
        input.box = [
          request.box.x,
          request.box.y,
          request.box.x + request.box.width,
          request.box.y + request.box.height,
        ];
      }
      
      // Create prediction using SAM model
      const createResponse = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.models.segment,
          input,
        }),
      });
      
      if (!createResponse.ok) {
        const error = await createResponse.text();
        return {
          ...this.createErrorResult(taskId, `Failed to create SAM prediction: ${error}`),
          masks: [],
        } as AISegmentResult;
      }
      
      let prediction = await createResponse.json();
      
      // Poll for completion
      while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const statusResponse = await fetch(prediction.urls.get, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });
        
        prediction = await statusResponse.json();
      }
      
      if (prediction.status === 'failed') {
        return {
          ...this.createErrorResult(taskId, prediction.error || 'SAM segmentation failed'),
          masks: [],
        } as AISegmentResult;
      }
      
      // Parse SAM output - typically returns mask URLs or base64 masks
      const output = prediction.output;
      const masks: AISegmentResult['masks'] = [];
      
      // SAM 2 returns combined_mask and individual masks
      if (output?.combined_mask) {
        masks.push({
          id: `${taskId}_combined`,
          maskBase64: '', // Will be fetched from URL
          maskUrl: output.combined_mask,
          score: 1.0,
          area: 0, // Would need to calculate from mask
          bbox: request.box || { x: 0, y: 0, width: 0, height: 0 },
        });
      }
      
      // Handle array of masks if returned
      if (Array.isArray(output)) {
        output.forEach((maskUrl: string, index: number) => {
          masks.push({
            id: `${taskId}_${index}`,
            maskBase64: '',
            maskUrl: maskUrl,
            score: 1.0 - index * 0.1, // Assume decreasing confidence
            area: 0,
            bbox: request.box || { x: 0, y: 0, width: 0, height: 0 },
          });
        });
      }
      
      return {
        success: true,
        taskId,
        status: 'completed',
        progress: 100,
        masks,
        cost: this.estimateCost('segment'),
        processingTime: Date.now() - startTime,
        metadata: {
          model: this.models.segment,
          predictionId: prediction.id,
        },
      };
    } catch (error) {
      return {
        ...this.createErrorResult(
          taskId,
          `SAM segment error: ${error instanceof Error ? error.message : String(error)}`
        ),
        masks: [],
      } as AISegmentResult;
    }
  }
  
  /**
   * Build enhanced prompt with style
   */
  private buildPrompt(basePrompt: string, style?: string): string {
    const stylePrompts: Record<string, string> = {
      'cinematic': 'cinematic lighting, dramatic composition, movie poster quality, professional photography',
      'minimalist': 'clean design, simple composition, minimal elements, white space, modern aesthetic',
      'bold': 'vibrant colors, high contrast, eye-catching, bold typography style, energetic',
      'professional': 'corporate style, polished, high quality, business aesthetic, clean',
      'creative': 'artistic, unique style, creative composition, imaginative',
      'gaming': 'gaming aesthetic, dynamic lighting, action-packed, high energy, neon accents',
    };
    
    if (style && stylePrompts[style]) {
      return `${basePrompt}, ${stylePrompts[style]}`;
    }
    
    return basePrompt;
  }
  
  /**
   * Get dimensions from aspect ratio
   */
  private getAspectRatioDimensions(aspectRatio: string): { width: number; height: number } {
    const dimensions: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1280, height: 720 },
      '9:16': { width: 720, height: 1280 },
      '1:1': { width: 1024, height: 1024 },
      '4:3': { width: 1024, height: 768 },
      '3:4': { width: 768, height: 1024 },
    };
    return dimensions[aspectRatio] || dimensions['16:9'];
  }
}
