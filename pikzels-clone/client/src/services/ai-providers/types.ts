/**
 * AI Provider Types
 * Modular, swappable AI provider system for thumbnail generation
 */

// ============================================
// PROVIDER TYPES
// ============================================

export type AIProviderType = 'replicate' | 'stability' | 'openai' | 'tensorflow' | 'mock';

export type AITaskType = 
  | 'generate'        // Text-to-image generation
  | 'inpaint'         // Fill masked regions
  | 'outpaint'        // Extend image boundaries
  | 'remove-bg'       // Background removal
  | 'face-swap'       // Face replacement
  | 'upscale'         // Super resolution
  | 'style-transfer'  // Apply artistic styles
  | 'enhance'         // General image enhancement
  | 'segment'         // Image segmentation
  | 'analyze';        // Thumbnail analysis/scoring

// ============================================
// GENERATION REQUEST/RESPONSE
// ============================================

export interface AIGenerateRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  style?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
  model?: string;
}

export interface AIInpaintRequest {
  image: string | Blob;      // Base64 or Blob
  mask: string | Blob;       // Mask image (white = inpaint area)
  prompt: string;
  negativePrompt?: string;
  strength?: number;         // 0-1, how much to change
}

export interface AIOutpaintRequest {
  image: string | Blob;
  direction: 'left' | 'right' | 'top' | 'bottom' | 'all';
  expandPixels: number;
  prompt?: string;
}

export interface AIBackgroundRemovalRequest {
  image: string | Blob;
  returnMask?: boolean;      // Return mask instead of transparent image
  refinement?: 'fast' | 'accurate';
}

export interface AIFaceSwapRequest {
  sourceImage: string | Blob;  // Image with face to use
  targetImage: string | Blob;  // Image where face will be placed
  faceIndex?: number;          // Which face in target (if multiple)
}

export interface AIUpscaleRequest {
  image: string | Blob;
  scale?: 2 | 4;
  model?: 'general' | 'face' | 'anime';
}

export interface AIStyleTransferRequest {
  image: string | Blob;
  style: 'impressionist' | 'cubist' | 'expressionist' | 'surrealist' | 'pop-art' | string;
  strength?: number;
}

export interface AIEnhanceRequest {
  image: string | Blob;
  type: 'denoise' | 'deblur' | 'color' | 'sharpen' | 'auto';
  strength?: number;
}

export interface AISegmentRequest {
  image: string | Blob;
  points?: { x: number; y: number; label: 'foreground' | 'background' }[];
  box?: { x: number; y: number; width: number; height: number };
}

export interface AIAnalyzeRequest {
  image: string | Blob;
  title?: string;
  category?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface AITaskResult {
  success: boolean;
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  imageUrl?: string;
  imageBase64?: string;
  maskUrl?: string;
  maskBase64?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  cost?: number;
  processingTime?: number;
}

export interface AIAnalysisResult extends AITaskResult {
  scores: {
    overall: number;        // 0-100
    virality: number;       // Click-worthiness
    clarity: number;        // Visual clarity
    emotion: number;        // Emotional impact
    curiosity: number;      // Curiosity-inducing
    branding: number;       // Brand consistency
  };
  suggestions: string[];
  issues: {
    type: 'warning' | 'error';
    message: string;
    area?: { x: number; y: number; width: number; height: number };
  }[];
}

export interface AISegmentResult extends AITaskResult {
  masks: {
    id: string;
    maskBase64: string;
    maskUrl?: string;  // URL to mask image if not base64
    score: number;
    area: number;
    bbox: { x: number; y: number; width: number; height: number };
  }[];
}

// ============================================
// PROVIDER INTERFACE
// ============================================

export interface IAIProvider {
  readonly name: string;
  readonly type: AIProviderType;
  readonly supportedTasks: AITaskType[];
  
  // Check if provider supports a specific task
  supportsTask(task: AITaskType): boolean;
  
  // Initialize provider (load models, validate API keys, etc.)
  initialize(): Promise<void>;
  
  // Check if provider is ready
  isReady(): boolean;
  
  // Get estimated cost for a task
  estimateCost(task: AITaskType): number;
  
  // Task methods
  generate?(request: AIGenerateRequest): Promise<AITaskResult>;
  inpaint?(request: AIInpaintRequest): Promise<AITaskResult>;
  outpaint?(request: AIOutpaintRequest): Promise<AITaskResult>;
  removeBackground?(request: AIBackgroundRemovalRequest): Promise<AITaskResult>;
  faceSwap?(request: AIFaceSwapRequest): Promise<AITaskResult>;
  upscale?(request: AIUpscaleRequest): Promise<AITaskResult>;
  styleTransfer?(request: AIStyleTransferRequest): Promise<AITaskResult>;
  enhance?(request: AIEnhanceRequest): Promise<AITaskResult>;
  segment?(request: AISegmentRequest): Promise<AISegmentResult>;
  analyze?(request: AIAnalyzeRequest): Promise<AIAnalysisResult>;
  
  // Cancel a running task
  cancelTask?(taskId: string): Promise<void>;
  
  // Get task status (for async operations)
  getTaskStatus?(taskId: string): Promise<AITaskResult>;
}

// ============================================
// PROVIDER CONFIG
// ============================================

export interface ReplicateConfig {
  apiKey: string;
  models?: {
    generation?: string;
    inpainting?: string;
    faceSwap?: string;
    upscale?: string;
  };
}

export interface StabilityConfig {
  apiKey: string;
  models?: {
    generation?: string;
    inpainting?: string;
  };
}

export interface OpenAIConfig {
  apiKey: string;
  model?: 'dall-e-2' | 'dall-e-3';
}

export interface TensorFlowConfig {
  modelPaths?: {
    segmentation?: string;
    enhancement?: string;
  };
  useWebGPU?: boolean;
}

export interface AIServiceConfig {
  defaultProvider?: AIProviderType;
  providers: {
    replicate?: ReplicateConfig;
    stability?: StabilityConfig;
    openai?: OpenAIConfig;
    tensorflow?: TensorFlowConfig;
  };
  taskRouting?: Partial<Record<AITaskType, AIProviderType>>;
  fallbackChain?: AIProviderType[];
  budget?: {
    maxDailyCost?: number;
    maxMonthlyCost?: number;
    alertThreshold?: number;
  };
}

// ============================================
// PERSONA SYSTEM
// ============================================

export interface AIPersona {
  id: string;
  name: string;
  images: string[];  // Source images for face swap reference
  embedding?: string; // Stored face embedding
  createdAt: number;
  updatedAt: number;
}

export interface AIStyle {
  id: string;
  name: string;
  description: string;
  referenceImages: string[];
  prompt?: string;
  negativePrompt?: string;
  createdAt: number;
}

// ============================================
// HISTORY & TRACKING
// ============================================

export interface AITaskHistory {
  id: string;
  task: AITaskType;
  provider: AIProviderType;
  request: Record<string, unknown>;
  result: AITaskResult;
  cost: number;
  timestamp: number;
  userId?: string;
}

export interface AIUsageStats {
  totalTasks: number;
  totalCost: number;
  taskBreakdown: Record<AITaskType, number>;
  providerBreakdown: Record<AIProviderType, number>;
  averageProcessingTime: number;
  successRate: number;
}
