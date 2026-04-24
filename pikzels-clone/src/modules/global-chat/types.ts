/** Scope determines the system prompt personality and behavior */
export type GlobalChatScope = 'product' | 'billing' | 'feedback' | 'general';

/** A single message in the conversation payload */
export interface GlobalChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

/** Request body for POST /api/global-chat/stream */
export interface GlobalChatStreamRequest {
  sessionId?: string;
  messages: GlobalChatMessagePayload[];
  scope?: GlobalChatScope;
  imageData?: string; // base64 data URL
}

/** Request body for POST /api/global-chat/sessions */
export interface CreateSessionRequest {
  scope?: GlobalChatScope;
}

/** SSE event types sent to the client */
export type GlobalChatEventType = 'token' | 'done' | 'error' | 'escalation';

/** Shape of each SSE event's data field */
export interface GlobalChatTokenData {
  content: string;
}

export interface GlobalChatDoneData {
  creditCost: number;
  sessionId: string;
}

export interface GlobalChatErrorData {
  message: string;
}

export interface GlobalChatEscalationData {
  ticketId: string;
  feedbackId: string;
}

/** Session response returned to frontend */
export interface ChatSessionResponse {
  id: string;
  scope: GlobalChatScope;
  status: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

/** Message response returned when loading session history */
export interface ChatMessageResponse {
  id: string;
  role: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
}

/** Full session with messages */
export interface ChatSessionWithMessages extends ChatSessionResponse {
  messages: ChatMessageResponse[];
}
