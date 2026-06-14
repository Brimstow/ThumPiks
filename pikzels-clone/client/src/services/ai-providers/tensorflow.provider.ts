/**
 * TensorFlow.js AI Provider
 * Local provider for segmentation, background removal, and simple enhancements
 * Runs entirely in-browser with WebGL/WebGPU acceleration
 */

import { BaseAIProvider } from './base.provider';
import type {
  AITaskType,
  AITaskResult,
  AIBackgroundRemovalRequest,
  AISegmentRequest,
  AISegmentResult,
  AIEnhanceRequest,
  AIAnalyzeRequest,
  AIAnalysisResult,
  TensorFlowConfig,
} from './types';
import { isIOS, isSafari, isCanvasSizeSafe, safeCanvasToDataURL } from '@/utils/browserCompat';

/** Minimal interface for the @tensorflow-models/body-segmentation module */
interface BodySegModule {
  createSegmenter(
    model: string,
    config: Record<string, unknown>
  ): Promise<BodySegModel>;
  SupportedModels: { MediaPipeSelfieSegmentation: string };
}

/** Minimal interface for a body segmentation model instance */
interface BodySegModel {
  segmentPeople(
    input: HTMLImageElement,
    config: Record<string, unknown>
  ): Promise<Array<{ mask: { toCanvasImageSource(): Promise<CanvasImageSource>; toImageData(): Promise<ImageData> } }>>;
}

// Dynamic imports for TensorFlow models
let bodySegmentation: BodySegModule | null = null;

export class TensorFlowProvider extends BaseAIProvider {
  readonly name = 'TensorFlow.js';
  readonly type = 'tensorflow' as const;
  readonly supportedTasks: AITaskType[] = [
    'remove-bg',
    'segment',
    'enhance',
    'analyze',
  ];
  
  private config: TensorFlowConfig;
  private segmentationModel: BodySegModel | null = null;
  
  constructor(config: TensorFlowConfig = {}) {
    super();
    this.config = config;
  }
  
  protected async _initialize(): Promise<void> {
    // Don't load models on initialization - load them lazily when needed
    // This significantly reduces initial page load time
    if (isIOS) {
      console.log('TensorFlow provider initialized (iOS detected — will use CPU-safe paths)');
    } else if (isSafari) {
      console.log('TensorFlow provider initialized (Safari detected — WebGL with fallback)');
    } else {
      console.log('TensorFlow provider initialized (models will load on-demand)');
    }
  }
  
  /**
   * Lazy load segmentation model only when needed
   */
  private async ensureSegmentationModel(): Promise<void> {
    if (this.segmentationModel) return;
    
    try {
      console.log('Loading segmentation model...');
      
      // Import modules
      if (!bodySegmentation) {
        const bodySegModule = await import('@tensorflow-models/body-segmentation');
        bodySegmentation = bodySegModule as unknown as BodySegModule;
      }
      
      // Load model with timeout (longer on iOS/Safari due to CPU fallback)
      const timeout = isIOS || isSafari ? 30000 : 15000;
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Model load timeout')), timeout)
      );
      
      // iOS Safari: MediaPipe WASM runtime can throw EvalError due to CSP.
      // Try MediaPipe first, fall back to TF.js runtime if it fails.
      let loadPromise;
      try {
        loadPromise = bodySegmentation.createSegmenter(
          bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
          {
            runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
            modelType: 'general',
          }
        );
        this.segmentationModel = await Promise.race([loadPromise, timeoutPromise]);
      } catch (mediapipeError) {
        console.warn('MediaPipe runtime failed, falling back to TF.js runtime:', mediapipeError);
        // TF.js runtime is slower but doesn't require WASM CSP exceptions
        loadPromise = bodySegmentation.createSegmenter(
          bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
          {
            runtime: 'tfjs',
            modelType: 'general',
          }
        );
        this.segmentationModel = await Promise.race([loadPromise, timeoutPromise]);
      }
      
      console.log('Segmentation model loaded successfully');
    } catch (error) {
      console.error('Failed to load segmentation model:', error);
      throw error;
    }
  }
  
  estimateCost(task: AITaskType): number {
    // TensorFlow.js runs locally - no API cost
    return 0;
  }
  
  /**
   * Remove background from image using segmentation
   */
  async removeBackground(request: AIBackgroundRemovalRequest): Promise<AITaskResult> {
    const taskId = this.generateTaskId();
    const startTime = Date.now();
    
    try {
      await this.ensureSegmentationModel();
    } catch (error) {
      return this.createErrorResult(taskId, 'Failed to load segmentation model');
    }
    
    try {
      // Load image
      const img = await this.loadImage(request.image);
      
      // Guard: check canvas size limits (iOS Safari crashes on large canvases)
      if (!isCanvasSizeSafe(img.width, img.height)) {
        return this.createErrorResult(taskId, `Image too large for this device (${img.width}×${img.height}). Please resize to a smaller dimension.`);
      }
      
      // Run segmentation
      const segmentation = await this.segmentationModel!.segmentPeople(img, {
        flipHorizontal: false,
        multiSegmentation: false,
        segmentBodyParts: false,
      });
      
      if (!segmentation || segmentation.length === 0) {
        return this.createErrorResult(taskId, 'No person detected in image');
      }
      
      // Create canvas for result
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get mask data
      const mask = segmentation[0].mask;
      const maskCanvas = await mask.toCanvasImageSource();
      
      if (request.returnMask) {
        // Return just the mask
        const maskCtx = canvas.getContext('2d')!;
        maskCtx.clearRect(0, 0, canvas.width, canvas.height);
        maskCtx.drawImage(maskCanvas as CanvasImageSource, 0, 0);
        
        const maskBase64 = safeCanvasToDataURL(canvas, 'image/png').split(',')[1];
        return {
          success: true,
          taskId,
          status: 'completed',
          progress: 100,
          maskBase64,
          processingTime: Date.now() - startTime,
        };
      }
      
      // Apply mask to create transparent background
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Create a temporary canvas for the mask
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(maskCanvas as CanvasImageSource, 0, 0);
      const maskData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Apply mask (set alpha based on mask value)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const maskValue = maskData.data[i]; // Red channel of mask
        imageData.data[i + 3] = maskValue; // Alpha channel
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const resultBase64 = safeCanvasToDataURL(canvas, 'image/png').split(',')[1];
      
      return {
        success: true,
        taskId,
        status: 'completed',
        progress: 100,
        imageBase64: resultBase64,
        processingTime: Date.now() - startTime,
        cost: 0,
      };
    } catch (error) {
      return this.createErrorResult(
        taskId,
        `Background removal failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Segment image with click points (SAM-like functionality)
   */
  async segment(request: AISegmentRequest): Promise<AISegmentResult> {
    const taskId = this.generateTaskId();
    const startTime = Date.now();
    
    try {
      await this.ensureSegmentationModel();
    } catch (error) {
      return {
        ...this.createErrorResult(taskId, 'Failed to load segmentation model'),
        masks: [],
      };
    }
    
    try {
      const img = await this.loadImage(request.image);
      
      // Run segmentation
      const segmentation = await this.segmentationModel!.segmentPeople(img, {
        flipHorizontal: false,
        multiSegmentation: true,
        segmentBodyParts: true,
      });
      
      const masks = await Promise.all(
        segmentation.map(async (seg, index: number) => {
          const mask = seg.mask;
          const maskCanvas = document.createElement('canvas');
          const maskData = await mask.toImageData();
          
          maskCanvas.width = maskData.width;
          maskCanvas.height = maskData.height;
          const ctx = maskCanvas.getContext('2d')!;
          ctx.putImageData(maskData, 0, 0);
          
          const maskBase64 = safeCanvasToDataURL(maskCanvas, 'image/png').split(',')[1];
          
          return {
            id: `mask-${index}`,
            maskBase64,
            score: 0.9, // Placeholder score
            area: maskData.width * maskData.height,
            bbox: { x: 0, y: 0, width: maskData.width, height: maskData.height },
          };
        })
      );
      
      return {
        success: true,
        taskId,
        status: 'completed',
        progress: 100,
        masks,
        processingTime: Date.now() - startTime,
        cost: 0,
      };
    } catch (error) {
      return {
        ...this.createErrorResult(
          taskId,
          `Segmentation failed: ${error instanceof Error ? error.message : String(error)}`
        ),
        masks: [],
      };
    }
  }
  
  /**
   * Enhance image using canvas operations
   */
  async enhance(request: AIEnhanceRequest): Promise<AITaskResult> {
    const taskId = this.generateTaskId();
    const startTime = Date.now();
    
    try {
      const img = await this.loadImage(request.image);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data for manipulation
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const strength = request.strength || 0.5;
      
      switch (request.type) {
        case 'sharpen':
          this.applySharpen(data, canvas.width, canvas.height, strength);
          break;
        case 'denoise':
          this.applyDenoise(data, canvas.width, canvas.height, strength);
          break;
        case 'color':
          this.applyColorEnhance(data, strength);
          break;
        case 'auto':
          this.applyAutoEnhance(data, strength);
          break;
        default:
          this.applyAutoEnhance(data, strength);
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const resultBase64 = safeCanvasToDataURL(canvas, 'image/png').split(',')[1];
      
      return {
        success: true,
        taskId,
        status: 'completed',
        progress: 100,
        imageBase64: resultBase64,
        processingTime: Date.now() - startTime,
        cost: 0,
      };
    } catch (error) {
      return this.createErrorResult(
        taskId,
        `Enhancement failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Analyze thumbnail for quality and suggestions
   */
  async analyze(request: AIAnalyzeRequest): Promise<AIAnalysisResult> {
    const taskId = this.generateTaskId();
    const startTime = Date.now();
    
    try {
      const img = await this.loadImage(request.image);
      
      // Basic analysis without ML models
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate metrics
      const brightness = this.calculateBrightness(data);
      const contrast = this.calculateContrast(data);
      const saturation = this.calculateSaturation(data);
      const edgeDensity = this.calculateEdgeDensity(data, canvas.width, canvas.height);
      
      // Score calculations
      const clarityScore = Math.min(100, contrast * 50 + edgeDensity * 50);
      const viralityScore = Math.min(100, saturation * 30 + contrast * 40 + 30);
      const emotionScore = Math.min(100, saturation * 40 + brightness * 20 + 40);
      const curiosityScore = Math.min(100, edgeDensity * 30 + contrast * 30 + 40);
      const brandingScore = 70; // Placeholder
      
      const overallScore = Math.round(
        (clarityScore + viralityScore + emotionScore + curiosityScore + brandingScore) / 5
      );
      
      // Generate suggestions
      const suggestions: string[] = [];
      const issues: AIAnalysisResult['issues'] = [];
      
      if (brightness < 0.3) {
        suggestions.push('Consider increasing brightness for better visibility');
        issues.push({ type: 'warning', message: 'Image appears too dark' });
      }
      if (brightness > 0.8) {
        suggestions.push('Consider reducing brightness to avoid overexposure');
        issues.push({ type: 'warning', message: 'Image appears too bright' });
      }
      if (contrast < 0.3) {
        suggestions.push('Increase contrast to make elements stand out');
        issues.push({ type: 'warning', message: 'Low contrast detected' });
      }
      if (saturation < 0.2) {
        suggestions.push('Add more vibrant colors to catch attention');
      }
      if (img.width < 1280 || img.height < 720) {
        issues.push({ type: 'error', message: 'Image resolution is below recommended 1280x720' });
      }
      
      return {
        success: true,
        taskId,
        status: 'completed',
        progress: 100,
        scores: {
          overall: overallScore,
          virality: Math.round(viralityScore),
          clarity: Math.round(clarityScore),
          emotion: Math.round(emotionScore),
          curiosity: Math.round(curiosityScore),
          branding: brandingScore,
        },
        suggestions,
        issues,
        processingTime: Date.now() - startTime,
        cost: 0,
      };
    } catch (error) {
      return {
        success: false,
        taskId,
        status: 'failed',
        error: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        scores: { overall: 0, virality: 0, clarity: 0, emotion: 0, curiosity: 0, branding: 0 },
        suggestions: [],
        issues: [],
      };
    }
  }
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  private async loadImage(image: string | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      
      if (typeof image === 'string') {
        img.src = image.startsWith('data:') ? image : image;
      } else {
        img.src = URL.createObjectURL(image);
      }
    });
  }
  
  private calculateBrightness(data: Uint8ClampedArray): number {
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    return total / (data.length / 4) / 255;
  }
  
  private calculateContrast(data: Uint8ClampedArray): number {
    const values: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      values.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.min(1, Math.sqrt(variance) / 128);
  }
  
  private calculateSaturation(data: Uint8ClampedArray): number {
    let totalSat = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      totalSat += sat;
    }
    return totalSat / (data.length / 4);
  }
  
  private calculateEdgeDensity(data: Uint8ClampedArray, width: number, height: number): number {
    let edges = 0;
    const threshold = 30;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const leftIdx = (y * width + x - 1) * 4;
        const rightIdx = (y * width + x + 1) * 4;
        
        const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const left = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
        const right = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        
        if (Math.abs(current - left) > threshold || Math.abs(current - right) > threshold) {
          edges++;
        }
      }
    }
    
    return Math.min(1, edges / ((width - 2) * (height - 2)) * 10);
  }
  
  private applySharpen(data: Uint8ClampedArray, width: number, height: number, strength: number): void {
    const kernel = [
      0, -1 * strength, 0,
      -1 * strength, 1 + 4 * strength, -1 * strength,
      0, -1 * strength, 0,
    ];
    this.applyConvolution(data, width, height, kernel);
  }
  
  private applyDenoise(data: Uint8ClampedArray, width: number, height: number, strength: number): void {
    // Simple blur for denoising
    const s = strength * 0.111;
    const kernel = [s, s, s, s, s, s, s, s, s];
    this.applyConvolution(data, width, height, kernel);
  }
  
  private applyColorEnhance(data: Uint8ClampedArray, strength: number): void {
    const satMult = 1 + strength * 0.5;
    const contMult = 1 + strength * 0.3;
    
    for (let i = 0; i < data.length; i += 4) {
      // Increase saturation
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = Math.min(255, gray + (data[i] - gray) * satMult);
      data[i + 1] = Math.min(255, gray + (data[i + 1] - gray) * satMult);
      data[i + 2] = Math.min(255, gray + (data[i + 2] - gray) * satMult);
      
      // Increase contrast
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contMult + 128));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contMult + 128));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contMult + 128));
    }
  }
  
  private applyAutoEnhance(data: Uint8ClampedArray, strength: number): void {
    this.applyColorEnhance(data, strength);
  }
  
  private applyConvolution(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    kernel: number[]
  ): void {
    const copy = new Uint8ClampedArray(data);
    const kSize = 3;
    const kHalf = Math.floor(kSize / 2);
    
    for (let y = kHalf; y < height - kHalf; y++) {
      for (let x = kHalf; x < width - kHalf; x++) {
        let r = 0, g = 0, b = 0;
        
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const idx = ((y + ky - kHalf) * width + (x + kx - kHalf)) * 4;
            const k = kernel[ky * kSize + kx];
            r += copy[idx] * k;
            g += copy[idx + 1] * k;
            b += copy[idx + 2] * k;
          }
        }
        
        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, Math.max(0, r));
        data[idx + 1] = Math.min(255, Math.max(0, g));
        data[idx + 2] = Math.min(255, Math.max(0, b));
      }
    }
  }
}
