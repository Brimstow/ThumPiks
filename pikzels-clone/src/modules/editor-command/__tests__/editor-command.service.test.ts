import { EditorCommandService, getEditorCommandService, CanvasContext } from '../editor-command.service';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock credit service
jest.mock('../../credit/credit.service', () => ({
  deductCredits: jest.fn(),
}));
import { deductCredits } from '../../credit/credit.service';
const mockDeductCredits = deductCredits as jest.MockedFunction<typeof deductCredits>;

const mockCanvasContext: CanvasContext = {
  width: 1920,
  height: 1080,
  layers: [
    {
      id: 'layer-1',
      type: 'image',
      name: 'Background',
      visible: true,
      locked: false,
      selected: false,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
    },
    {
      id: 'layer-2',
      type: 'text',
      name: 'Title',
      visible: true,
      locked: false,
      selected: true,
      x: 100,
      y: 50,
      width: 400,
      height: 60,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      text: 'EPIC WIN',
      font: 'Arial',
      fontSize: 48,
      color: '#FF0000',
    },
  ],
};

/** Build a mock tool_call entry */
function makeToolCall(name: string, args: Record<string, unknown>) {
  return {
    id: `call_${name}_${Date.now()}`,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args),
    },
  };
}

function makeMockResponse(body: object, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    headers: { get: jest.fn().mockReturnValue(null) },
  } as any;
}

describe('EditorCommandService', () => {
  let service: EditorCommandService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    const mod = require('../editor-command.service');
    (mod as any).editorCommandService = null;

    process.env.OPENROUTER_API_KEY = 'test-or-key';
    process.env.OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
    process.env.OPENROUTER_MODEL_EDITOR = 'google/gemini-3-flash-preview';

    service = new EditorCommandService();
    mockDeductCredits.mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL_EDITOR;
  });

  describe('parseCommand', () => {
    it('parses a valid tool_call response into structured actions', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [
              makeToolCall('updateText', { target: 'selected', color: '#0000FF' }),
            ],
          },
        }],
      }));

      const result = await service.parseCommand('make the title blue', mockCanvasContext, undefined, 'user-abc');

      expect(mockDeductCredits).toHaveBeenCalledWith('user-abc', 1, 'AI editor command parsing');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-or-key' }),
        })
      );
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]!.action).toBe('updateText');
      expect(result.actions[0]!.target).toBe('selected');
      expect(result.actions[0]!.params).toEqual({ color: '#0000FF' });
    });

    it('extracts target from tool_call arguments and removes it from params', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [
              makeToolCall('removeBackground', { target: 'Background' }),
            ],
          },
        }],
      }));

      const result = await service.parseCommand('remove bg', mockCanvasContext, undefined, 'user-abc');

      expect(result.actions[0]!.target).toBe('Background');
      expect(result.actions[0]!.params).not.toHaveProperty('target');
    });

    it('defaults target to "selected" when not provided in arguments', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [
              makeToolCall('addText', { text: 'Hello' }),
            ],
          },
        }],
      }));

      const result = await service.parseCommand('add text', mockCanvasContext, undefined, 'user-abc');

      expect(result.actions[0]!.target).toBe('selected');
    });

    it('handles multiple tool_calls in a single response', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [
              makeToolCall('addText', { text: 'EPIC', fontSize: 72, color: '#FF0000' }),
              makeToolCall('moveLayer', { target: 'selected', position: 'center' }),
            ],
          },
        }],
      }));

      const result = await service.parseCommand('add big red text EPIC centered', mockCanvasContext, undefined, 'user-abc');

      expect(result.actions).toHaveLength(2);
      expect(result.actions[0]!.action).toBe('addText');
      expect(result.actions[1]!.action).toBe('moveLayer');
    });

    it('throws when API key is not configured', async () => {
      delete process.env.OPENROUTER_API_KEY;
      const noKeyService = new EditorCommandService();

      await expect(
        noKeyService.parseCommand('test', mockCanvasContext, undefined, 'user-abc')
      ).rejects.toThrow('OpenRouter API key not configured');
    });

    it('throws when credits are insufficient', async () => {
      mockDeductCredits.mockResolvedValue(false);

      await expect(
        service.parseCommand('test', mockCanvasContext, undefined, 'user-abc')
      ).rejects.toThrow('Insufficient credits');
    });

    it('throws on API error response', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ error: 'Unauthorized' }, 401));

      await expect(
        service.parseCommand('test', mockCanvasContext, undefined, 'user-abc')
      ).rejects.toThrow('401');
    });

    it('throws when response contains no tool_calls', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{ message: { content: null, tool_calls: undefined } }],
      }));

      await expect(
        service.parseCommand('test', mockCanvasContext, undefined, 'user-abc')
      ).rejects.toThrow();
    });

    it('throws model text as error when tool_calls absent but text returned', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{ message: { content: 'I cannot do that operation.', tool_calls: undefined } }],
      }));

      await expect(
        service.parseCommand('test', mockCanvasContext, undefined, 'user-abc')
      ).rejects.toThrow('I cannot do that operation.');
    });

    it('sends tools parameter instead of response_format', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [makeToolCall('addText', { text: 'hi' })],
          },
        }],
      }));

      await service.parseCommand('test', mockCanvasContext, undefined, 'user-abc');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      // Should have tools parameter
      expect(Array.isArray(callBody.tools)).toBe(true);
      expect(callBody.tools.length).toBeGreaterThan(0);
      expect(callBody.tools[0].type).toBe('function');
      // Should NOT have response_format (old approach)
      expect(callBody.response_format).toBeUndefined();
    });

    it('uses canvas context to build request body', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [makeToolCall('updateText', { target: 'selected', color: '#0000FF' })],
          },
        }],
      }));

      await service.parseCommand('add red text', mockCanvasContext, undefined, 'user-abc');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      const userMessage = callBody.messages.find((m: any) => m.role === 'user')?.content;

      expect(userMessage).toContain('1920x1080');
      expect(userMessage).toContain('Background');
      expect(userMessage).toContain('EPIC WIN');
      expect(userMessage).toContain('SELECTED');
    });

    it('sends multimodal content when canvasScreenshot is provided', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [makeToolCall('enhance', { target: 'selected' })],
          },
        }],
      }));

      const screenshot = 'data:image/png;base64,iVBOR...';
      await service.parseCommand('enhance this', mockCanvasContext, screenshot, 'user-abc');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      const userMessage = callBody.messages.find((m: any) => m.role === 'user');

      // Content should be an array with image_url and text parts
      expect(Array.isArray(userMessage.content)).toBe(true);
      expect(userMessage.content[0].type).toBe('image_url');
      expect(userMessage.content[0].image_url.url).toBe(screenshot);
      expect(userMessage.content[1].type).toBe('text');
    });

    it('sends plain text content when no screenshot', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [makeToolCall('addText', { text: 'hi' })],
          },
        }],
      }));

      await service.parseCommand('add text', mockCanvasContext, undefined, 'user-abc');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      const userMessage = callBody.messages.find((m: any) => m.role === 'user');

      // Content should be a plain string
      expect(typeof userMessage.content).toBe('string');
    });

    it('handles empty canvas (no layers)', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [makeToolCall('generate', { prompt: 'mountain sunset' })],
          },
        }],
      }));

      const emptyCtx: CanvasContext = { width: 1280, height: 720, layers: [] };
      await service.parseCommand('generate background', emptyCtx, undefined, 'user-abc');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      const userMessage = callBody.messages.find((m: any) => m.role === 'user')?.content;
      expect(userMessage).toContain('empty canvas');
    });

    it('always sets needsAutoTarget to false (handled client-side)', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [makeToolCall('removeBackground', { target: 'auto' })],
          },
        }],
      }));

      const result = await service.parseCommand('remove bg from the planet', mockCanvasContext, undefined, 'user-abc');

      expect(result.needsAutoTarget).toBe(false);
    });

    it('builds a summary from action descriptions', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{
          message: {
            tool_calls: [
              makeToolCall('addText', { text: 'EPIC' }),
              makeToolCall('recolorLayer', { target: 'selected', color: '#FF0000' }),
            ],
          },
        }],
      }));

      const result = await service.parseCommand('add red text EPIC', mockCanvasContext, undefined, 'user-abc');

      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toContain('addText');
      expect(result.summary).toContain('recolorLayer');
    });
  });

  describe('getEditorCommandService singleton', () => {
    it('returns same instance on repeated calls', () => {
      const a = getEditorCommandService();
      const b = getEditorCommandService();
      expect(a).toBe(b);
    });
  });
});
