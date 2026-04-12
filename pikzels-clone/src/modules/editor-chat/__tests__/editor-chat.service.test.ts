import { EditorChatService, getEditorChatService } from '../editor-chat.service';
import type { ChatMessagePayload } from '../types';
import type { CanvasContext } from '../../editor-command/action-catalog';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock logger (transitively imported)
jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an async iterable from an array of SSE-formatted strings. */
function makeSSEStream(lines: string[]): NodeJS.ReadableStream {
  const text = lines.join('\n') + '\n';
  const chunks = [Buffer.from(text)];
  let index = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (index < chunks.length) {
            return Promise.resolve({ value: chunks[index++], done: false });
          }
          return Promise.resolve({ value: undefined, done: true });
        },
      };
    },
  } as any;
}

/** Shorthand SSE line builders */
function sseDelta(delta: Record<string, unknown>) {
  return `data: ${JSON.stringify({ choices: [{ delta }] })}`;
}
function sseDone() {
  return 'data: [DONE]';
}

/** Make a successful streaming response mock. */
function makeStreamingResponse(sseLines: string[]) {
  return {
    ok: true,
    status: 200,
    body: makeSSEStream(sseLines),
    text: jest.fn().mockResolvedValue(''),
    headers: { get: jest.fn().mockReturnValue(null) },
  } as any;
}

const mockCanvas: CanvasContext = {
  width: 1920,
  height: 1080,
  layers: [],
};

const userMessages: ChatMessagePayload[] = [
  { role: 'user', content: 'make the title red' },
];

describe('EditorChatService', () => {
  let service: EditorChatService;
  let send: jest.Mock;
  let isAborted: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    const mod = require('../editor-chat.service');
    (mod as any).editorChatService = null;

    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
    process.env.OPENROUTER_MODEL_EDITOR = 'google/gemini-3-flash-preview';

    service = new EditorChatService();
    send = jest.fn();
    isAborted = jest.fn().mockReturnValue(false);
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL_EDITOR;
  });

  // =========================================================================
  // Configuration & error handling
  // =========================================================================
  describe('configuration', () => {
    it('sends error event when API key not configured', async () => {
      delete process.env.OPENROUTER_API_KEY;
      service = new EditorChatService();

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      expect(send).toHaveBeenCalledWith('error', { message: 'AI service not configured' });
    });

    it('sends error event when API returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
        headers: { get: jest.fn().mockReturnValue(null) },
      } as any);

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      expect(send).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('500'),
      }));
    });

    it('sends error event when response body is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: null,
        text: jest.fn().mockResolvedValue(''),
        headers: { get: jest.fn().mockReturnValue(null) },
      } as any);

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      expect(send).toHaveBeenCalledWith('error', { message: 'No response body from AI service' });
    });
  });

  // =========================================================================
  // Request building
  // =========================================================================
  describe('request building', () => {
    it('sends tools parameter with EDITOR_TOOLS', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([sseDone()]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(Array.isArray(callBody.tools)).toBe(true);
      expect(callBody.tools.length).toBeGreaterThan(0);
      expect(callBody.stream).toBe(true);
    });

    it('includes canvas context in system prompt', async () => {
      const canvasWithLayers: CanvasContext = {
        width: 1280,
        height: 720,
        layers: [{
          id: 'l1', type: 'text', name: 'Title',
          visible: true, locked: false, selected: true,
          x: 0, y: 0, width: 400, height: 60, rotation: 0, opacity: 1, zIndex: 0,
          text: 'HELLO', fontSize: 48,
        }],
      };

      mockFetch.mockResolvedValueOnce(makeStreamingResponse([sseDone()]));

      await service.streamChat(userMessages, canvasWithLayers, undefined, undefined, send, isAborted);

      const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      const systemMsg = callBody.messages[0];
      expect(systemMsg.role).toBe('system');
      expect(systemMsg.content).toContain('1280x720');
      expect(systemMsg.content).toContain('HELLO');
    });

    it('includes platform preset in system prompt when provided', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([sseDone()]));

      await service.streamChat(
        userMessages, mockCanvas, undefined,
        { platform: 'youtube', width: 1280, height: 720, name: 'YouTube Thumbnail' },
        send, isAborted
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(callBody.messages[0].content).toContain('youtube');
    });

    it('sends multimodal content for last user message when screenshot provided', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([sseDone()]));

      const screenshot = 'data:image/png;base64,abc123';
      await service.streamChat(userMessages, mockCanvas, screenshot, undefined, send, isAborted);

      const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      const lastMsg = callBody.messages[callBody.messages.length - 1];
      expect(Array.isArray(lastMsg.content)).toBe(true);
      expect(lastMsg.content[0].type).toBe('image_url');
      expect(lastMsg.content[1].type).toBe('text');
    });

    it('sends plain text content when no screenshot', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([sseDone()]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      const lastMsg = callBody.messages[callBody.messages.length - 1];
      expect(typeof lastMsg.content).toBe('string');
    });

    it('trims conversation history to MAX_CONVERSATION_HISTORY', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([sseDone()]));

      // Send 15 messages (> 10 limit)
      const manyMessages: ChatMessagePayload[] = [];
      for (let i = 0; i < 15; i++) {
        manyMessages.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `msg${i}` });
      }

      await service.streamChat(manyMessages, mockCanvas, undefined, undefined, send, isAborted);

      const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      // system + last 10 conversation messages = 11
      expect(callBody.messages.length).toBe(11);
    });
  });

  // =========================================================================
  // SSE streaming — prose tokens
  // =========================================================================
  describe('prose streaming', () => {
    it('forwards delta.content as token events', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([
        sseDelta({ content: 'Hello' }),
        sseDelta({ content: ' world' }),
        sseDone(),
      ]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      expect(send).toHaveBeenCalledWith('token', { content: 'Hello' });
      expect(send).toHaveBeenCalledWith('token', { content: ' world' });
      expect(send).toHaveBeenCalledWith('done', { creditCost: 1 });
    });

    it('sends done event after stream completes', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([sseDone()]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      expect(send).toHaveBeenCalledWith('done', { creditCost: 1 });
    });

    it('skips malformed SSE lines gracefully', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([
        'data: {invalid json',
        sseDelta({ content: 'ok' }),
        sseDone(),
      ]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      // Should not throw, should still get the valid token
      expect(send).toHaveBeenCalledWith('token', { content: 'ok' });
    });
  });

  // =========================================================================
  // SSE streaming — tool call accumulation
  // =========================================================================
  describe('tool call accumulation', () => {
    it('accumulates tool_calls from delta chunks and emits actions event', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([
        // Tool call start: name and initial arguments
        sseDelta({
          tool_calls: [{
            index: 0,
            id: 'call_1',
            function: { name: 'updateText', arguments: '{"target":' },
          }],
        }),
        // Tool call continuation: more arguments
        sseDelta({
          tool_calls: [{
            index: 0,
            function: { arguments: '"selected","color":"#FF0000"}' },
          }],
        }),
        sseDone(),
      ]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      // Should emit actions event with the accumulated tool call
      expect(send).toHaveBeenCalledWith('actions', expect.objectContaining({
        actions: expect.arrayContaining([
          expect.objectContaining({
            action: 'updateText',
            target: 'selected',
            params: expect.objectContaining({ color: '#FF0000' }),
          }),
        ]),
        needsAutoTarget: false,
      }));
    });

    it('accumulates multiple parallel tool calls', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([
        sseDelta({
          tool_calls: [
            { index: 0, id: 'call_1', function: { name: 'addText', arguments: '{"text":"EPIC"}' } },
            { index: 1, id: 'call_2', function: { name: 'moveLayer', arguments: '{"target":"selected","position":"center"}' } },
          ],
        }),
        sseDone(),
      ]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      expect(send).toHaveBeenCalledWith('actions', expect.objectContaining({
        actions: expect.arrayContaining([
          expect.objectContaining({ action: 'addText' }),
          expect.objectContaining({ action: 'moveLayer' }),
        ]),
      }));
    });

    it('extracts target from arguments and removes from params', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([
        sseDelta({
          tool_calls: [{
            index: 0,
            id: 'call_1',
            function: { name: 'removeBackground', arguments: '{"target":"Background"}' },
          }],
        }),
        sseDone(),
      ]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      const actionsCall = send.mock.calls.find(c => c[0] === 'actions');
      expect(actionsCall).toBeDefined();
      const action = actionsCall![1].actions[0];
      expect(action.target).toBe('Background');
      expect(action.params).not.toHaveProperty('target');
    });

    it('defaults target to "selected" when not in arguments', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([
        sseDelta({
          tool_calls: [{
            index: 0,
            id: 'call_1',
            function: { name: 'addText', arguments: '{"text":"hi"}' },
          }],
        }),
        sseDone(),
      ]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      const actionsCall = send.mock.calls.find(c => c[0] === 'actions');
      expect(actionsCall![1].actions[0].target).toBe('selected');
    });

    it('can receive both prose and tool calls in same stream', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([
        sseDelta({ content: 'Sure, I\'ll change the color.' }),
        sseDelta({
          tool_calls: [{
            index: 0,
            id: 'call_1',
            function: { name: 'recolorLayer', arguments: '{"target":"selected","color":"#00FF00"}' },
          }],
        }),
        sseDone(),
      ]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      expect(send).toHaveBeenCalledWith('token', expect.objectContaining({ content: expect.any(String) }));
      expect(send).toHaveBeenCalledWith('actions', expect.objectContaining({
        actions: expect.arrayContaining([
          expect.objectContaining({ action: 'recolorLayer' }),
        ]),
      }));
    });

    it('skips tool calls with unparseable arguments', async () => {
      mockFetch.mockResolvedValueOnce(makeStreamingResponse([
        sseDelta({
          tool_calls: [
            { index: 0, id: 'call_bad', function: { name: 'addText', arguments: 'not-json' } },
            { index: 1, id: 'call_good', function: { name: 'addShape', arguments: '{"shape":"rectangle"}' } },
          ],
        }),
        sseDone(),
      ]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      const actionsCall = send.mock.calls.find(c => c[0] === 'actions');
      expect(actionsCall).toBeDefined();
      // Only the valid tool call should be emitted
      expect(actionsCall![1].actions).toHaveLength(1);
      expect(actionsCall![1].actions[0].action).toBe('addShape');
    });
  });

  // =========================================================================
  // Abort handling
  // =========================================================================
  describe('abort handling', () => {
    it('stops streaming when isAborted returns true', async () => {
      let chunkCount = 0;
      isAborted.mockImplementation(() => {
        chunkCount++;
        return chunkCount > 1; // Abort after first chunk
      });

      mockFetch.mockResolvedValueOnce(makeStreamingResponse([
        sseDelta({ content: 'first' }),
        sseDelta({ content: 'second' }),
        sseDelta({ content: 'third' }),
        sseDone(),
      ]));

      await service.streamChat(userMessages, mockCanvas, undefined, undefined, send, isAborted);

      // Should NOT emit 'done' event when aborted
      const doneCall = send.mock.calls.find(c => c[0] === 'done');
      expect(doneCall).toBeUndefined();
    });
  });

  // =========================================================================
  // Singleton
  // =========================================================================
  describe('getEditorChatService singleton', () => {
    it('returns same instance on repeated calls', () => {
      const a = getEditorChatService();
      const b = getEditorChatService();
      expect(a).toBe(b);
    });
  });
});
