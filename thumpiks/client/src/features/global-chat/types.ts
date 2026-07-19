export type GlobalChatScope = 'product' | 'billing' | 'feedback' | 'general';

export interface GlobalChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string | null;
  timestamp: number;
  isStreaming?: boolean;
}

export interface GlobalChatSession {
  id: string;
  scope: GlobalChatScope;
  status: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface GlobalChatSessionWithMessages extends GlobalChatSession {
  messages: Array<{
    id: string;
    role: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
  }>;
}

export interface TokenEventData {
  content: string;
}

export interface DoneEventData {
  creditCost: number;
  sessionId: string;
}

export interface ErrorEventData {
  message: string;
}

export interface EscalationEventData {
  ticketId: string;
  feedbackId: string;
}

export interface SuggestedPrompt {
  label: string;
  prompt: string;
}
