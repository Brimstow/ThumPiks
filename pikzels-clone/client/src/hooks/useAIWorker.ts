/**
 * useAIWorker Hook
 * React hook for managing Web Worker lifecycle and executing AI tasks
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import type { WorkerMessage, WorkerTaskType } from '../workers/ai-worker-types';

interface PendingTask {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

interface UseAIWorkerReturn {
  execute: <T = any>(taskType: WorkerTaskType, data: any) => Promise<T>;
  isReady: boolean;
  isProcessing: boolean;
}

export function useAIWorker(): UseAIWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const pendingTasks = useRef<Map<string, PendingTask>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    // Check if Web Workers are supported
    if (typeof Worker === 'undefined') {
      console.warn('[useAIWorker] Web Workers not supported in this browser');
      setIsReady(false);
      return;
    }
    
    try {
      // Create worker
      workerRef.current = new Worker(
        new URL('../workers/ai-worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      console.log('[useAIWorker] Worker created');
      
      // Handle messages from worker
      workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const { id, type, data, error } = e.data;
        
        const task = pendingTasks.current.get(id);
        if (!task) {
          console.warn('[useAIWorker] Received message for unknown task:', id);
          return;
        }
        
        // Clear timeout
        clearTimeout(task.timeout);
        
        // Remove from pending tasks
        pendingTasks.current.delete(id);
        
        // Update processing state
        if (pendingTasks.current.size === 0) {
          setIsProcessing(false);
        }
        
        // Handle response
        if (type === 'success') {
          task.resolve(data);
        } else if (type === 'error') {
          task.reject(new Error(error || 'Task failed'));
        }
      };
      
      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('[useAIWorker] Worker error:', error);
        
        // Reject all pending tasks
        pendingTasks.current.forEach((task) => {
          clearTimeout(task.timeout);
          task.reject(new Error('Worker crashed'));
        });
        pendingTasks.current.clear();
        
        setIsProcessing(false);
        setIsReady(false);
      };
      
      // Mark as ready
      setIsReady(true);
      
    } catch (error) {
      console.error('[useAIWorker] Failed to create worker:', error);
      setIsReady(false);
    }
    
    // Cleanup
    return () => {
      if (workerRef.current) {
        // Cancel all pending tasks
        pendingTasks.current.forEach((task) => {
          clearTimeout(task.timeout);
          task.reject(new Error('Worker terminated'));
        });
        pendingTasks.current.clear();
        
        // Terminate worker
        workerRef.current.terminate();
        console.log('[useAIWorker] Worker terminated');
      }
    };
  }, []);
  
  const execute = useCallback(<T = any>(taskType: WorkerTaskType, data: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }
      
      if (!isReady) {
        reject(new Error('Worker not ready'));
        return;
      }
      
      // Generate unique task ID
      const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Set timeout (30 seconds)
      const timeout = setTimeout(() => {
        if (pendingTasks.current.has(id)) {
          pendingTasks.current.delete(id);
          
          if (pendingTasks.current.size === 0) {
            setIsProcessing(false);
          }
          
          reject(new Error('Task timeout - processing took longer than 30 seconds'));
        }
      }, 30000);
      
      // Store pending task
      pendingTasks.current.set(id, { resolve, reject, timeout });
      
      // Update processing state
      setIsProcessing(true);
      
      // Send task to worker
      const message: WorkerMessage = {
        id,
        type: 'task',
        taskType,
        data,
      };
      
      workerRef.current.postMessage(message);
      
      console.log('[useAIWorker] Task sent:', taskType, id);
    });
  }, [isReady]);
  
  return {
    execute,
    isReady,
    isProcessing,
  };
}
