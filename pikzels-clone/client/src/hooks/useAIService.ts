/**
 * useAIService Hook
 * React hook for accessing AI service functionality
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  AIService, 
  getAIService, 
  configureAIService,
  type AIServiceConfig,
  type AITaskType,
  type AITaskResult,
  type AIGenerateRequest,
  type AIInpaintRequest,
  type AIBackgroundRemovalRequest,
  type AIFaceSwapRequest,
  type AIUpscaleRequest,
  type AIEnhanceRequest,
  type AIAnalyzeRequest,
  type AIAnalysisResult,
  type AIUsageStats,
} from '../services/ai-providers';

interface UseAIServiceOptions {
  config?: AIServiceConfig;
  autoInitialize?: boolean;
}

interface AIServiceState {
  isReady: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  currentTask: AITaskType | null;
  progress: number;
}

export function useAIService(options: UseAIServiceOptions = {}) {
  const { config, autoInitialize = true } = options;
  
  // Stabilize config reference to prevent infinite re-render loops
  // when callers pass inline object literals
  const configJSON = config ? JSON.stringify(config) : '';
  const stableConfig = useMemo(
    () => (configJSON ? JSON.parse(configJSON) : undefined),
    [configJSON]
  );
  
  const serviceRef = useRef<AIService | null>(null);
  const [state, setState] = useState<AIServiceState>({
    isReady: false,
    isLoading: false,
    isInitializing: false,
    error: null,
    currentTask: null,
    progress: 0,
  });
  
  // Initialize service
  useEffect(() => {
    if (stableConfig) {
      serviceRef.current = configureAIService(stableConfig);
    } else {
      serviceRef.current = getAIService();
    }
    
    if (autoInitialize) {
      // Use separate isInitializing flag - NOT isLoading
      setState(s => ({ ...s, isInitializing: true }));
      
      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        setState(s => {
          if (s.isInitializing && !s.isReady) {
            return { ...s, isInitializing: false, isReady: true };
          }
          return s;
        });
      }, 3000);
      
      serviceRef.current.initialize()
        .then(() => {
          clearTimeout(timeoutId);
          setState(s => ({ ...s, isReady: true, isInitializing: false }));
        })
        .catch(err => {
          clearTimeout(timeoutId);
          // Still set isReady to true so UI is usable (will fail on actual tasks)
          setState(s => ({ 
            ...s, 
            isInitializing: false,
            isReady: true,
            error: err instanceof Error ? err.message : String(err) 
          }));
        });
    } else {
      // If not auto-initializing, mark as ready immediately
      setState(s => ({ ...s, isReady: true }));
    }
  }, [stableConfig, autoInitialize]);
  
  // Generic task executor
  const executeTask = useCallback(async <T extends AITaskResult>(
    task: AITaskType,
    executor: () => Promise<T>
  ): Promise<T> => {
    if (!serviceRef.current) {
      throw new Error('AI Service not initialized');
    }
    
    setState(s => ({ ...s, isLoading: true, currentTask: task, progress: 0, error: null }));
    
    try {
      const result = await executor();
      
      setState(s => ({ 
        ...s, 
        isLoading: false, 
        currentTask: null, 
        progress: 100,
        error: result.success ? null : (result.error || 'Task failed'),
      }));
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      setState(s => ({ ...s, isLoading: false, currentTask: null, error }));
      throw err;
    }
  }, []);
  
  // Task methods
  const generate = useCallback((request: AIGenerateRequest) => {
    return executeTask('generate', () => serviceRef.current!.generate(request));
  }, [executeTask]);
  
  const inpaint = useCallback((request: AIInpaintRequest) => {
    return executeTask('inpaint', () => serviceRef.current!.inpaint(request));
  }, [executeTask]);
  
  const removeBackground = useCallback((request: AIBackgroundRemovalRequest) => {
    return executeTask('remove-bg', () => serviceRef.current!.removeBackground(request));
  }, [executeTask]);
  
  const faceSwap = useCallback((request: AIFaceSwapRequest) => {
    return executeTask('face-swap', () => serviceRef.current!.faceSwap(request));
  }, [executeTask]);
  
  const upscale = useCallback((request: AIUpscaleRequest) => {
    return executeTask('upscale', () => serviceRef.current!.upscale(request));
  }, [executeTask]);
  
  const enhance = useCallback((request: AIEnhanceRequest) => {
    return executeTask('enhance', () => serviceRef.current!.enhance(request));
  }, [executeTask]);
  
  const analyze = useCallback((request: AIAnalyzeRequest): Promise<AIAnalysisResult> => {
    return executeTask('analyze', () => serviceRef.current!.analyze(request));
  }, [executeTask]);
  
  // Utility methods
  const getAvailableTasks = useCallback((): AITaskType[] => {
    return serviceRef.current?.getAvailableTasks() || [];
  }, []);
  
  const estimateCost = useCallback((task: AITaskType): number => {
    return serviceRef.current?.estimateCost(task) || 0;
  }, []);
  
  const getUsageStats = useCallback((): AIUsageStats | null => {
    return serviceRef.current?.getUsageStats() || null;
  }, []);
  
  return {
    // State
    ...state,
    
    // Task methods
    generate,
    inpaint,
    removeBackground,
    faceSwap,
    upscale,
    enhance,
    analyze,
    
    // Utilities
    getAvailableTasks,
    estimateCost,
    getUsageStats,
    
    // Direct service access (for advanced use)
    service: serviceRef.current,
  };
}

export type UseAIServiceReturn = ReturnType<typeof useAIService>;
