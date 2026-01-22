/**
 * Base AI Provider
 * Abstract base class for all AI providers
 */

import type {
  IAIProvider,
  AIProviderType,
  AITaskType,
  AITaskResult,
  AIGenerateRequest,
  AIInpaintRequest,
  AIOutpaintRequest,
  AIBackgroundRemovalRequest,
  AIFaceSwapRequest,
  AIUpscaleRequest,
  AIStyleTransferRequest,
  AIEnhanceRequest,
  AISegmentRequest,
  AISegmentResult,
  AIAnalyzeRequest,
  AIAnalysisResult,
} from './types';

export abstract class BaseAIProvider implements IAIProvider {
  abstract readonly name: string;
  abstract readonly type: AIProviderType;
  abstract readonly supportedTasks: AITaskType[];
  
  protected _isReady = false;
  protected _initPromise: Promise<void> | null = null;
  
  /**
   * Check if provider supports a specific task
   */
  supportsTask(task: AITaskType): boolean {
    return this.supportedTasks.includes(task);
  }
  
  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this._isReady) return;
    if (this._initPromise) return this._initPromise;
    
    this._initPromise = this._initialize();
    await this._initPromise;
    this._isReady = true;
  }
  
  /**
   * Internal initialization - override in subclasses
   */
  protected abstract _initialize(): Promise<void>;
  
  /**
   * Check if provider is ready
   */
  isReady(): boolean {
    return this._isReady;
  }
  
  /**
   * Estimate cost for a task (in USD)
   */
  abstract estimateCost(task: AITaskType): number;
  
  /**
   * Generate a unique task ID
   */
  protected generateTaskId(): string {
    return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Create a pending result
   */
  protected createPendingResult(taskId: string): AITaskResult {
    return {
      success: false,
      taskId,
      status: 'pending',
      progress: 0,
    };
  }
  
  /**
   * Create a processing result
   */
  protected createProcessingResult(taskId: string, progress: number = 0): AITaskResult {
    return {
      success: false,
      taskId,
      status: 'processing',
      progress,
    };
  }
  
  /**
   * Create a success result
   */
  protected createSuccessResult(
    taskId: string,
    imageUrl?: string,
    imageBase64?: string,
    metadata?: Record<string, unknown>
  ): AITaskResult {
    return {
      success: true,
      taskId,
      status: 'completed',
      progress: 100,
      imageUrl,
      imageBase64,
      metadata,
    };
  }
  
  /**
   * Create an error result
   */
  protected createErrorResult(taskId: string, error: string): AITaskResult {
    return {
      success: false,
      taskId,
      status: 'failed',
      error,
    };
  }
  
  /**
   * Convert image to base64
   */
  protected async imageToBase64(image: string | Blob): Promise<string> {
    if (typeof image === 'string') {
      // Already base64 or URL
      if (image.startsWith('data:')) {
        return image.split(',')[1];
      }
      // Fetch URL and convert to base64
      const response = await fetch(image);
      const blob = await response.blob();
      return this.blobToBase64(blob);
    }
    return this.blobToBase64(image);
  }
  
  /**
   * Convert Blob to base64
   */
  protected blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  /**
   * Convert base64 to Blob
   */
  protected base64ToBlob(base64: string, mimeType = 'image/png'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
  
  // Default implementations that throw "not supported"
  async generate?(request: AIGenerateRequest): Promise<AITaskResult> {
    throw new Error(`${this.name} does not support generate`);
  }
  
  async inpaint?(request: AIInpaintRequest): Promise<AITaskResult> {
    throw new Error(`${this.name} does not support inpaint`);
  }
  
  async outpaint?(request: AIOutpaintRequest): Promise<AITaskResult> {
    throw new Error(`${this.name} does not support outpaint`);
  }
  
  async removeBackground?(request: AIBackgroundRemovalRequest): Promise<AITaskResult> {
    throw new Error(`${this.name} does not support background removal`);
  }
  
  async faceSwap?(request: AIFaceSwapRequest): Promise<AITaskResult> {
    throw new Error(`${this.name} does not support face swap`);
  }
  
  async upscale?(request: AIUpscaleRequest): Promise<AITaskResult> {
    throw new Error(`${this.name} does not support upscale`);
  }
  
  async styleTransfer?(request: AIStyleTransferRequest): Promise<AITaskResult> {
    throw new Error(`${this.name} does not support style transfer`);
  }
  
  async enhance?(request: AIEnhanceRequest): Promise<AITaskResult> {
    throw new Error(`${this.name} does not support enhance`);
  }
  
  async segment?(request: AISegmentRequest): Promise<AISegmentResult> {
    throw new Error(`${this.name} does not support segment`);
  }
  
  async analyze?(request: AIAnalyzeRequest): Promise<AIAnalysisResult> {
    throw new Error(`${this.name} does not support analyze`);
  }
}
