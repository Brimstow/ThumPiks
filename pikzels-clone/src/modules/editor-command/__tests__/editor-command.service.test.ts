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
    },
    {
      id: 'layer-2',
      type: 'text',
      name: 'Title',
      visible: true,
      locked: false,
      selected: true,
      text: 'EPIC WIN',
      font: 'Arial',
      fontSize: 48,
      color: '#FF0000',
    },
  ],
};

const mockCommandResult = {
  actions: [
    {
      action: 'updateText',
      target: 'selected',
      description: 'Change text color to blue',
      params: { color: '#0000FF' },
    },
  ],
  summary: 'Changing the title text color to blue',
  needsAutoTarget: false,
};

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
    process.env.OPENROUTER_MODEL_COMMAND = 'google/gemini-2.5-flash';

    service = new EditorCommandService();
    mockDeductCredits.mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  describe('parseCommand', () => {
    it('parses a valid command and returns structured actions', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{ message: { content: JSON.stringify(mockCommandResult) } }],
      }));

      const result = await service.parseCommand('make the title blue', mockCanvasContext, 'user-abc');

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
      expect(result.summary).toContain('blue');
    });

    it('throws when API key is not configured', async () => {
      delete process.env.OPENROUTER_API_KEY;
      const noKeyService = new EditorCommandService();

      await expect(
        noKeyService.parseCommand('test', mockCanvasContext, 'user-abc')
      ).rejects.toThrow('OpenRouter API key not configured');
    });

    it('throws when credits are insufficient', async () => {
      mockDeductCredits.mockResolvedValue(false);

      await expect(
        service.parseCommand('test', mockCanvasContext, 'user-abc')
      ).rejects.toThrow('Insufficient credits');
    });

    it('throws on API error response', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({ error: 'Unauthorized' }, 401));

      await expect(
        service.parseCommand('test', mockCanvasContext, 'user-abc')
      ).rejects.toThrow('401');
    });

    it('throws when response contains no actions', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{ message: { content: JSON.stringify({ actions: [], summary: 'Nothing', needsAutoTarget: false }) } }],
      }));

      await expect(
        service.parseCommand('test', mockCanvasContext, 'user-abc')
      ).rejects.toThrow('Failed to understand');
    });

    it('throws when JSON parsing fails', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{ message: { content: 'not json at all' } }],
      }));

      await expect(
        service.parseCommand('test', mockCanvasContext, 'user-abc')
      ).rejects.toThrow('Failed to understand');
    });

    it('uses canvas context to build request body', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{ message: { content: JSON.stringify(mockCommandResult) } }],
      }));

      await service.parseCommand('add red text', mockCanvasContext, 'user-abc');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      const userMessage = callBody.messages.find((m: any) => m.role === 'user')?.content;

      expect(userMessage).toContain('1920x1080');
      expect(userMessage).toContain('Background');
      expect(userMessage).toContain('EPIC WIN');
      expect(userMessage).toContain('SELECTED');
    });

    it('uses response_format json_schema', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{ message: { content: JSON.stringify(mockCommandResult) } }],
      }));

      await service.parseCommand('test', mockCanvasContext, 'user-abc');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.response_format.type).toBe('json_schema');
      expect(callBody.response_format.json_schema.name).toBe('editor_command');
    });

    it('handles empty canvas (no layers)', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        choices: [{ message: { content: JSON.stringify(mockCommandResult) } }],
      }));

      const emptyCtx: CanvasContext = { width: 1280, height: 720, layers: [] };
      await service.parseCommand('generate background', emptyCtx, 'user-abc');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      const userMessage = callBody.messages.find((m: any) => m.role === 'user')?.content;
      expect(userMessage).toContain('empty canvas');
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
