import type { EditorAction } from '../../components/editor/hooks/useCommandExecutor';

// ============================================================================
// AI Chat Types — Shared between hooks and components
// ============================================================================

/** Platform preset context for platform-aware AI responses */
export interface PlatformPresetContext {
  platform: string;
  width: number;
  height: number;
  name: string;
}

/** Status of an individual action within a chat message */
export type ActionStatus = 'pending' | 'executing' | 'success' | 'error';

/** Result of executing a single action */
export interface ActionResult {
  action: string;
  description: string;
  status: ActionStatus;
  error?: string;
}

/** A single message in the chat conversation */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** Actions parsed from the assistant's response */
  actions?: EditorAction[];
  /** Execution results for each action */
  actionResults?: ActionResult[];
  /** Whether this message is currently being streamed */
  isStreaming?: boolean;
}

/** SSE event types received from the backend */
export type ChatStreamEventType = 'token' | 'actions' | 'done' | 'error';

/** Shape of each SSE event */
export interface ChatStreamEvent {
  type: ChatStreamEventType;
  data: unknown;
}

/** Token event data */
export interface TokenEventData {
  content: string;
}

/** Actions event data */
export interface ActionsEventData {
  actions: EditorAction[];
  summary: string;
  needsAutoTarget: boolean;
  autoTargetQuery?: string;
}

/** Done event data */
export interface DoneEventData {
  creditCost: number;
}

/** Error event data */
export interface ErrorEventData {
  message: string;
}

/** Suggested prompt chip */
export interface SuggestedPrompt {
  label: string;
  prompt: string;
}
