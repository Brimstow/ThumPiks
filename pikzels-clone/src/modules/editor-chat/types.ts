import type {
  EditorAction,
  CanvasContext,
} from '../editor-command/action-catalog';

// Re-export for convenience
export type { EditorAction, CanvasContext };

/** Platform preset context passed from the frontend */
export interface PlatformPresetContext {
  platform: string;
  width: number;
  height: number;
  name: string;
}

/** A single message in the conversation */
export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

/** Request body for POST /api/editor-chat/stream */
export interface ChatStreamRequest {
  messages: ChatMessagePayload[];
  canvasContext: CanvasContext;
  canvasScreenshot?: string;
  platformPreset?: PlatformPresetContext;
}

/** SSE event types sent to the client */
export type ChatStreamEventType = 'token' | 'actions' | 'done' | 'error';

/** Shape of each SSE event's data field */
export interface ChatStreamTokenData {
  content: string;
}

export interface ChatStreamActionsData {
  actions: EditorAction[];
  summary: string;
  needsAutoTarget: boolean;
  autoTargetQuery?: string;
}

export interface ChatStreamDoneData {
  creditCost: number;
}

export interface ChatStreamErrorData {
  message: string;
}
