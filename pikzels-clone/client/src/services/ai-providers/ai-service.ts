/**
 * AI Service
 * Main orchestration layer for AI providers with routing, fallback, and cost tracking
 */

import type {
  IAIProvider,
  AIProviderType,
  AITaskType,
  AITaskResult,
  AIServiceConfig,
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
  AITaskHistory,
  AIUsageStats,
} from './types';
import { ReplicateProvider } from './replicate.provider';
import { TensorFlowProvider } from './tensorflow.provider';

// Default task routing - which provider handles which task
const DEFAULT_TASK_ROUTING: Record<AITaskType, AIProviderType> = {
  'generate': 'replicate',       // External API for quality
  'inpaint': 'replicate',        // External API for quality
  'outpaint': 'replicate',       // External API for quality
  'remove-bg': 'tensorflow',     // Local for speed/free
  'face-swap': 'replicate',      // External API for quality
  'upscale': 'replicate',        // External API for quality
  'style-transfer': 'tensorflow', // Can be done locally
  'enhance': 'tensorflow',       // Local for speed/free
  'segment': 'tensorflow',       // Local for speed/free
  'analyze': 'tensorflow',       // Local for speed/free
};

export class AIService {
  private providers: Map<AIProviderType, IAIProvider> = new Map();
  private taskRouting: Record<AITaskType, AIProviderType>;
  private fallbackChain: AIProviderType[];
  private history: AITaskHistory[] = [];
  private config: AIServiceConfig;
  private initialized = false;
  
  constructor(config: AIServiceConfig) {
    this.config = config;
    this.taskRouting = { ...DEFAULT_TASK_ROUTING, ...config.taskRouting };
    this.fallbackChain = config.fallbackChain || ['replicate', 'tensorflow', 'mock'];
    
    // Initialize providers based on config
    this.initializeProviders();
  }
  
  /**
   * Initialize all configured providers
   */
  private initializeProviders(): void {
    // Always add TensorFlow provider (free, local)
    this.providers.set('tensorflow', new TensorFlowProvider(
      this.config.providers.tensorflow
    ));
    
    // Add Replicate if API key provided
    if (this.config.providers.replicate?.apiKey) {
      this.providers.set('replicate', new ReplicateProvider(
        this.config.providers.replicate
      ));
    }
    
    // Add mock provider for testing (always available)
    this.providers.set('mock', new MockProvider());
  }
  
  /**
   * Initialize the service and all providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const initPromises = Array.from(this.providers.values()).map(
      provider => provider.initialize().catch(err => {
        console.warn(`Failed to initialize ${provider.name}:`, err);
      })
    );
    
    await Promise.all(initPromises);
    this.initialized = true;
    
    console.log('AI Service initialized with providers:', 
      Array.from(this.providers.keys()).filter(k => this.providers.get(k)?.isReady())
    );
  }
  
  /**
   * Get provider for a specific task
   */
  private getProviderForTask(task: AITaskType): IAIProvider | null {
    const preferredType = this.taskRouting[task];
    
    // Try preferred provider first
    const preferred = this.providers.get(preferredType);
    if (preferred?.isReady() && preferred.supportsTask(task)) {
      return preferred;
    }
    
    // Try fallback chain
    for (const providerType of this.fallbackChain) {
      const provider = this.providers.get(providerType);
      if (provider?.isReady() && provider.supportsTask(task)) {
        return provider;
      }
    }
    
    return null;
  }
  
  /**
   * Execute a task with the appropriate provider
   */
  private async executeTask<T extends AITaskResult>(
    task: AITaskType,
    method: string,
    request: any
  ): Promise<T> {
    const provider = this.getProviderForTask(task);
    
    if (!provider) {
      throw new Error(`No available provider for task: ${task}`);
    }
    
    const startTime = Date.now();
    
    try {
      const methodFn = (provider as any)[method];
      if (!methodFn) {
        throw new Error(`Provider ${provider.name} does not implement ${method}`);
      }
      
      const result = await methodFn.call(provider, request) as T;
      
      // Track history
      this.trackTask(task, provider.type, request, result, Date.now() - startTime);
      
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        taskId: `error-${Date.now()}`,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : String(error),
      } as T;
      
      this.trackTask(task, provider.type, request, errorResult, Date.now() - startTime);
      
      return errorResult;
    }
  }
  
  /**
   * Track task in history
   */
  private trackTask(
    task: AITaskType,
    provider: AIProviderType,
    request: any,
    result: AITaskResult,
    processingTime: number
  ): void {
    const historyEntry: AITaskHistory = {
      id: result.taskId,
      task,
      provider,
      request,
      result,
      cost: result.cost || this.providers.get(provider)?.estimateCost(task) || 0,
      timestamp: Date.now(),
    };
    
    this.history.push(historyEntry);
    
    // Keep only last 100 entries
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }
  
  // ============================================
  // PUBLIC TASK METHODS
  // ============================================
  
  /**
   * Generate image from text prompt
   */
  async generate(request: AIGenerateRequest): Promise<AITaskResult> {
    return this.executeTask('generate', 'generate', request);
  }
  
  /**
   * Inpaint masked region
   */
  async inpaint(request: AIInpaintRequest): Promise<AITaskResult> {
    return this.executeTask('inpaint', 'inpaint', request);
  }
  
  /**
   * Outpaint/extend image
   */
  async outpaint(request: AIOutpaintRequest): Promise<AITaskResult> {
    return this.executeTask('outpaint', 'outpaint', request);
  }
  
  /**
   * Remove background
   */
  async removeBackground(request: AIBackgroundRemovalRequest): Promise<AITaskResult> {
    return this.executeTask('remove-bg', 'removeBackground', request);
  }
  
  /**
   * Swap faces
   */
  async faceSwap(request: AIFaceSwapRequest): Promise<AITaskResult> {
    return this.executeTask('face-swap', 'faceSwap', request);
  }
  
  /**
   * Upscale image
   */
  async upscale(request: AIUpscaleRequest): Promise<AITaskResult> {
    return this.executeTask('upscale', 'upscale', request);
  }
  
  /**
   * Apply style transfer
   */
  async styleTransfer(request: AIStyleTransferRequest): Promise<AITaskResult> {
    return this.executeTask('style-transfer', 'styleTransfer', request);
  }
  
  /**
   * Enhance image
   */
  async enhance(request: AIEnhanceRequest): Promise<AITaskResult> {
    return this.executeTask('enhance', 'enhance', request);
  }
  
  /**
   * Segment image
   */
  async segment(request: AISegmentRequest): Promise<AISegmentResult> {
    return this.executeTask('segment', 'segment', request);
  }
  
  /**
   * Analyze thumbnail
   */
  async analyze(request: AIAnalyzeRequest): Promise<AIAnalysisResult> {
    return this.executeTask('analyze', 'analyze', request);
  }
  
  // ============================================
  // UTILITY METHODS
  // ============================================
  
  /**
   * Get available providers
   */
  getAvailableProviders(): AIProviderType[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isReady())
      .map(([type]) => type);
  }
  
  /**
   * Get provider capabilities
   */
  getProviderCapabilities(providerType: AIProviderType): AITaskType[] {
    return this.providers.get(providerType)?.supportedTasks || [];
  }
  
  /**
   * Get available tasks
   */
  getAvailableTasks(): AITaskType[] {
    const tasks = new Set<AITaskType>();
    
    for (const provider of this.providers.values()) {
      if (provider.isReady()) {
        provider.supportedTasks.forEach(task => tasks.add(task));
      }
    }
    
    return Array.from(tasks);
  }
  
  /**
   * Estimate cost for a task
   */
  estimateCost(task: AITaskType): number {
    const provider = this.getProviderForTask(task);
    return provider?.estimateCost(task) || 0;
  }
  
  /**
   * Get usage statistics
   */
  getUsageStats(): AIUsageStats {
    const taskBreakdown: Record<AITaskType, number> = {} as any;
    const providerBreakdown: Record<AIProviderType, number> = {} as any;
    let totalCost = 0;
    let totalTime = 0;
    let successCount = 0;
    
    for (const entry of this.history) {
      taskBreakdown[entry.task] = (taskBreakdown[entry.task] || 0) + 1;
      providerBreakdown[entry.provider] = (providerBreakdown[entry.provider] || 0) + 1;
      totalCost += entry.cost;
      totalTime += entry.result.processingTime || 0;
      if (entry.result.success) successCount++;
    }
    
    return {
      totalTasks: this.history.length,
      totalCost,
      taskBreakdown,
      providerBreakdown,
      averageProcessingTime: this.history.length > 0 ? totalTime / this.history.length : 0,
      successRate: this.history.length > 0 ? successCount / this.history.length : 1,
    };
  }
  
  /**
   * Get task history
   */
  getHistory(): AITaskHistory[] {
    return [...this.history];
  }
  
  /**
   * Change task routing
   */
  setTaskRouting(task: AITaskType, provider: AIProviderType): void {
    this.taskRouting[task] = provider;
  }
  
  /**
   * Get current task routing
   */
  getTaskRouting(): Record<AITaskType, AIProviderType> {
    return { ...this.taskRouting };
  }
}

// ============================================
// MOCK PROVIDER (for testing/fallback)
// ============================================

import { BaseAIProvider } from './base.provider';

class MockProvider extends BaseAIProvider {
  readonly name = 'Mock';
  readonly type = 'mock' as const;
  readonly supportedTasks: AITaskType[] = [
    'generate', 'inpaint', 'remove-bg', 'enhance', 'analyze',
  ];
  
  protected async _initialize(): Promise<void> {
    // Mock provider is always ready
  }
  
  estimateCost(): number {
    return 0;
  }
  
  async generate(request: AIGenerateRequest): Promise<AITaskResult> {
    const taskId = this.generateTaskId();
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return placeholder image
    return this.createSuccessResult(
      taskId,
      `https://placehold.co/1280x720/1a1a2e/ffffff?text=${encodeURIComponent(request.prompt.slice(0, 20))}`,
      undefined,
      { mock: true, prompt: request.prompt }
    );
  }
  
  async removeBackground(request: AIBackgroundRemovalRequest): Promise<AITaskResult> {
    const taskId = this.generateTaskId();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return original image as "processed"
    const base64 = await this.imageToBase64(request.image);
    return this.createSuccessResult(taskId, undefined, base64, { mock: true });
  }
  
  async enhance(request: AIEnhanceRequest): Promise<AITaskResult> {
    const taskId = this.generateTaskId();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const base64 = await this.imageToBase64(request.image);
    return this.createSuccessResult(taskId, undefined, base64, { mock: true });
  }
  
  async analyze(): Promise<AIAnalysisResult> {
    const taskId = this.generateTaskId();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      taskId,
      status: 'completed',
      progress: 100,
      scores: {
        overall: 75,
        virality: 70,
        clarity: 80,
        emotion: 75,
        curiosity: 72,
        branding: 78,
      },
      suggestions: ['Add more contrast', 'Consider adding text overlay'],
      issues: [],
      metadata: { mock: true },
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let aiServiceInstance: AIService | null = null;

/**
 * Get or create the AI service singleton
 */
export function getAIService(config?: AIServiceConfig): AIService {
  if (!aiServiceInstance && config) {
    aiServiceInstance = new AIService(config);
  }
  
  if (!aiServiceInstance) {
    // Create with default config (mock/tensorflow only)
    aiServiceInstance = new AIService({
      providers: {
        tensorflow: {},
      },
    });
  }
  
  return aiServiceInstance;
}

/**
 * Configure the AI service
 */
export function configureAIService(config: AIServiceConfig): AIService {
  aiServiceInstance = new AIService(config);
  return aiServiceInstance;
}
