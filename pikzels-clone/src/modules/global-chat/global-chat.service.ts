import fetch from 'node-fetch';
import { PrismaClient, ChatSession, ChatMessage } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { getFrontendUrl } from '../../utils/env';
import type {
  GlobalChatScope,
  GlobalChatMessagePayload,
  ChatSessionResponse,
  ChatSessionWithMessages,
  ChatMessageResponse,
} from './types';
import { HELP_KNOWLEDGE_BASE } from './help-knowledge';

// ============================================================================
// Global Chat Service
// Multi-scope conversational AI for product help, billing, and feedback.
// Uses OpenRouter streaming completions with multimodal vision support.
// Persists chat sessions and messages to the database.
// ============================================================================

const MAX_CONVERSATION_HISTORY = 20;
const ESCALATION_MARKER = '[ESCALATE]';

// ── System Prompts ──────────────────────────────────────────────────────────

const BASE_IDENTITY = `You are Pik, the ThumPiks AI assistant. You help users with their thumbnail creation needs, account questions, and provide support. You are friendly, concise, and helpful. You respond in the same language the user writes in.`;

const SCOPE_PROMPTS: Record<GlobalChatScope, string> = {
  product: `You help users learn how to use ThumPiks features: the thumbnail editor, AI tools (image generation, face swap, background removal, upscaling, inpainting), templates, composition layouts, brand kit, A/B testing, quick edit, vision analysis, and visual search. Give step-by-step guidance. Reference specific menu items and UI locations when relevant. If you cannot solve their issue, offer to escalate to a support ticket.`,
  billing: `You help users with billing, subscription plans, credits, and payment questions. ThumPiks offers Free, Pro, and Business plans with credit-based usage. You can explain plan differences, credit costs per AI tool, and payment methods (Stripe and Polar). For refund requests or complex billing issues, offer to escalate to a support ticket.`,
  feedback: `You are collecting user feedback. Ask clarifying questions to understand their experience. Categorize their feedback as BUG (something broken), FEATURE_REQUEST (something they want), or GENERAL (other feedback). When you have enough information, offer to submit it formally. Be empathetic and thank them for helping improve ThumPiks.`,
  general: `You help users with any questions about ThumPiks. If their question is about a specific topic, guide the conversation accordingly. You can help with product usage, billing questions, or collect feedback.`,
};

const ESCALATION_INSTRUCTION = `If the user explicitly asks to "talk to a human", "create a ticket", or "escalate", or if you determine you cannot resolve their issue after reasonable effort, respond with the phrase "${ESCALATION_MARKER}" at the very end of your message (after your normal response text). This will automatically create a support ticket for them.`;

const VISION_INSTRUCTION = `The user has shared an image. Analyze it carefully and relate your response to their question. If it appears to be a screenshot of the app, identify any UI issues or help them with what they're seeing. If it's a thumbnail, provide design feedback.`;

function buildSystemPrompt(scope: GlobalChatScope, hasImage: boolean): string {
  let prompt = `${BASE_IDENTITY}\n\n${SCOPE_PROMPTS[scope]}\n\n${HELP_KNOWLEDGE_BASE}\n\n${ESCALATION_INSTRUCTION}`;
  if (hasImage) {
    prompt += `\n\n${VISION_INSTRUCTION}`;
  }
  return prompt;
}

// ── Service Class ───────────────────────────────────────────────────────────

export class GlobalChatService {
  private prisma: PrismaClient;
  private openrouterApiKey: string;
  private openrouterApiUrl: string;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrisma();
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
    this.openrouterApiUrl =
      process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
  }

  /**
   * Create a new chat session.
   */
  async createSession(
    userId: string,
    scope: GlobalChatScope = 'general'
  ): Promise<ChatSessionResponse> {
    const session = await this.prisma.chatSession.create({
      data: { userId, scope },
    });

    return this.formatSession(session);
  }

  /**
   * Get a session with its messages (for loading history).
   */
  async getSession(
    sessionId: string,
    userId: string
  ): Promise<ChatSessionWithMessages | null> {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) return null;

    return {
      ...this.formatSession(session),
      messages: session.messages.map(this.formatMessage),
    };
  }

  /**
   * List user's chat sessions (most recent first).
   */
  async listSessions(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<{ sessions: ChatSessionResponse[]; total: number }> {
    const [sessions, total] = await Promise.all([
      this.prisma.chatSession.findMany({
        where: { userId },
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        take: Math.min(limit, 50),
        skip: offset,
      }),
      this.prisma.chatSession.count({ where: { userId } }),
    ]);

    return {
      sessions: sessions.map(s => this.formatSession(s)),
      total,
    };
  }

  /**
   * Stream a chat completion to the client via SSE.
   * Persists user message before streaming and assistant message after.
   */
  async streamChat(
    sessionId: string,
    userId: string,
    messages: GlobalChatMessagePayload[],
    scope: GlobalChatScope,
    imageData: string | undefined,
    send: (event: string, data: Record<string, unknown>) => void,
    isAborted: () => boolean
  ): Promise<void> {
    if (!this.openrouterApiKey) {
      send('error', { message: 'AI service not configured' });
      return;
    }

    // Verify session belongs to user
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      send('error', { message: 'Session not found' });
      return;
    }
    if (session.status === 'escalated') {
      send('error', { message: 'This session has been escalated to a support ticket' });
      return;
    }

    // Save user message to DB
    const lastUserMessage = messages[messages.length - 1]!;
    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: lastUserMessage.content,
        imageUrl: imageData ? 'attached' : null,
      },
    });

    // Auto-generate title from first user message
    if (!session.title && lastUserMessage.content) {
      const title = lastUserMessage.content.slice(0, 80) +
        (lastUserMessage.content.length > 80 ? '...' : '');
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { title },
      });
    }

    // Build messages for LLM
    const systemPrompt = buildSystemPrompt(scope, !!imageData);
    const trimmed = messages.slice(-MAX_CONVERSATION_HISTORY);

    // Build the message content (multimodal if image present)
    const llmMessages: Array<{ role: string; content: unknown }> = [
      { role: 'system', content: systemPrompt },
    ];

    for (let i = 0; i < trimmed.length; i++) {
      const msg = trimmed[i]!;
      const isLast = i === trimmed.length - 1;

      // Only attach image to the last user message
      if (isLast && msg.role === 'user' && imageData) {
        llmMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            {
              type: 'image_url',
              image_url: { url: imageData },
            },
          ],
        });
      } else {
        llmMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    const model =
      process.env.OPENROUTER_MODEL_GLOBAL_CHAT || 'qwen/qwen3-vl-32b';

    const requestBody = {
      model,
      messages: llmMessages,
      stream: true,
      temperature: 0.4,
    };

    let response;
    try {
      response = await fetch(`${this.openrouterApiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openrouterApiKey}`,
          'HTTP-Referer': getFrontendUrl(),
          'X-Title': 'ThumPiks Global Chat',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (err: unknown) {
      logger.error(`Failed to connect to OpenRouter: ${err instanceof Error ? err.message : String(err)}`);
      send('error', { message: 'Failed to connect to AI service' });
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`OpenRouter error (${response.status}): ${errorText}`);
      send('error', {
        message: `Chat failed (${response.status})`,
      });
      return;
    }

    if (!response.body) {
      send('error', { message: 'No response body from AI service' });
      return;
    }

    // Stream chunks and forward as SSE token events
    let fullContent = '';
    let buffer = '';
    const stream = response.body as NodeJS.ReadableStream;

    for await (const chunk of stream) {
      if (isAborted()) break;

      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (isAborted()) break;
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            send('token', { content: delta });
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }

    if (isAborted()) return;

    // Save assistant response to DB
    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: fullContent,
        metadata: { model },
      },
    });

    // Update session counters
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        messageCount: { increment: 2 }, // user + assistant
        lastMessageAt: new Date(),
      },
    });

    // Check for escalation marker
    if (fullContent.includes(ESCALATION_MARKER)) {
      try {
        const result = await this.escalateToTicket(sessionId, userId);
        if (result) {
          send('escalation', {
            ticketId: result.ticketId,
            feedbackId: result.feedbackId,
          });
        }
      } catch (err: unknown) {
        logger.error(`Escalation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    send('done', { creditCost: 0, sessionId });
  }

  /**
   * Escalate a chat session to a support ticket.
   * Creates a Feedback record + Ticket from the chat transcript.
   */
  async escalateToTicket(
    sessionId: string,
    userId: string
  ): Promise<{ ticketId: string; feedbackId: string } | null> {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session || session.status === 'escalated') return null;

    // Build transcript for the feedback message
    const transcript = session.messages
      .map(m => `**${m.role === 'user' ? 'User' : 'Pik'}**: ${m.content}`)
      .join('\n\n');

    const subject =
      session.title ||
      session.messages.find(m => m.role === 'user')?.content.slice(0, 200) ||
      'Chat escalation';

    // Determine feedback type from scope
    const feedbackTypeMap: Record<string, string> = {
      product: 'GENERAL',
      billing: 'GENERAL',
      feedback: 'GENERAL',
      general: 'GENERAL',
    };

    // Create feedback record
    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        type: feedbackTypeMap[session.scope] || 'GENERAL',
        subject: `[Chat Escalation] ${subject}`,
        message: transcript,
        category: 'chat_escalation',
        tags: [session.scope],
        priority: 'MEDIUM',
      },
    });

    // Create linked ticket
    const ticket = await this.prisma.ticket.create({
      data: {
        feedbackId: feedback.id,
        status: 'OPEN',
        internalNotes: `Escalated from global chat session ${sessionId} (scope: ${session.scope})`,
      },
    });

    // Update session
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: 'escalated',
        escalatedToTicketId: ticket.id,
      },
    });

    logger.info(
      `Chat session ${sessionId} escalated to ticket ${ticket.id}`
    );

    return { ticketId: ticket.id, feedbackId: feedback.id };
  }

  /**
   * Archive a chat session (soft archive).
   */
  async archiveSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) return false;

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'archived' },
    });

    return true;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private formatSession(session: ChatSession): ChatSessionResponse {
    return {
      id: session.id,
      scope: session.scope as GlobalChatScope,
      status: session.status,
      title: session.title,
      messageCount: session.messageCount,
      lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
    };
  }

  private formatMessage(msg: ChatMessage): ChatMessageResponse {
    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      imageUrl: msg.imageUrl,
      createdAt: msg.createdAt.toISOString(),
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let globalChatService: GlobalChatService | null = null;

export function getGlobalChatService(): GlobalChatService {
  if (!globalChatService) {
    globalChatService = new GlobalChatService();
  }
  return globalChatService;
}
