/**
 * AI Worker Types
 * Type definitions for worker communication
 */

export type WorkerTaskType = 
  | 'removeBackground'
  | 'enhance'
  | 'segment'
  | 'analyze';

export interface WorkerMessage {
  id: string;
  type: 'task' | 'success' | 'error' | 'progress';
  taskType?: WorkerTaskType;
  data?: any;
  error?: string;
  progress?: number;
}

export interface RemoveBackgroundRequest {
  image: string; // Data URL
  returnMask?: boolean;
}

export interface EnhanceRequest {
  image: string;
  type: 'auto' | 'sharpen' | 'denoise' | 'color';
  strength: number;
}

export interface SegmentRequest {
  image: string;
  points?: { x: number; y: number; positive: boolean }[];
}

export interface AnalyzeRequest {
  image: string;
}
