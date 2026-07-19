import { ReplicateAIService } from '../replicate-ai.service';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock sharp
jest.mock('sharp', () => {
  const chain = {
    metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
    ensureAlpha: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.alloc(40000)),
    resize: jest.fn().mockReturnThis(),
    grayscale: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
  };
  return jest.fn(() => chain);
});

function makeMockFetchResponse(body: any, status = 200, headers?: Record<string, string>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    headers: {
      get: jest.fn((key: string) => headers?.[key] ?? null),
    },
    arrayBuffer: jest.fn().mockResolvedValue(Buffer.alloc(100).buffer),
  } as any;
}

const succeededPrediction = {
  id: 'pred-123',
  status: 'succeeded',
  output: ['https://cdn.replicate.com/output/mask.png'],
  urls: { get: 'https://api.replicate.com/v1/predictions/pred-123' },
};

describe('ReplicateAIService', () => {
  let service: ReplicateAIService;
  // No-op sleep injected so polling loops resolve instantly — tests are fast and deterministic
  const noopSleep = () => Promise.resolve();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REPLICATE_API_KEY = 'test-replicate-key';
    process.env.REPLICATE_API_URL = 'https://api.replicate.com/v1';
    process.env.REPLICATE_MODEL_REMOVE_BG = 'owner/rmbg:version123';
    process.env.REPLICATE_MODEL_UPSCALE = 'owner/esrgan:version456';
    process.env.REPLICATE_MODEL_EXPAND = 'owner/expand:version789';
    process.env.REPLICATE_MODEL_SEGMENT = 'meta/sam-2';
    process.env.REPLICATE_MODEL_SEGMENT_INTERACTIVE = 'meta/sam-2-video';
    service = new ReplicateAIService(noopSleep);
  });

  afterEach(() => {
    delete process.env.REPLICATE_API_KEY;
    delete process.env.REPLICATE_MODEL_REMOVE_BG;
    delete process.env.REPLICATE_MODEL_UPSCALE;
    delete process.env.REPLICATE_MODEL_EXPAND;
    delete process.env.REPLICATE_MODEL_SEGMENT;
    delete process.env.REPLICATE_MODEL_SEGMENT_INTERACTIVE;
  });

  describe('isConfigured', () => {
    it('returns true when API key is set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('returns false when API key is missing', () => {
      delete process.env.REPLICATE_API_KEY;
      const noKeyService = new ReplicateAIService(noopSleep);
      expect(noKeyService.isConfigured()).toBe(false);
    });
  });

  describe('getServiceInfo', () => {
    it('returns service metadata', () => {
      const info = service.getServiceInfo();
      expect(info.name).toBe('Replicate AI');
      expect(info.configured).toBe(true);
      expect(info.tools).toEqual(expect.arrayContaining(['segment', 'removeBg', 'upscale', 'expand']));
    });
  });

  describe('getModelForTool', () => {
    it('returns model from env var', () => {
      expect(service.getModelForTool('removeBg')).toBe('owner/rmbg:version123');
      expect(service.getModelForTool('upscale')).toBe('owner/esrgan:version456');
    });

    it('throws when model env var not set', () => {
      delete process.env.REPLICATE_MODEL_UPSCALE;
      expect(() => service.getModelForTool('upscale')).toThrow('REPLICATE_MODEL_UPSCALE');
    });
  });

  describe('removeBackground', () => {
    it('throws when API key is not configured', async () => {
      delete process.env.REPLICATE_API_KEY;
      const noKeyService = new ReplicateAIService(noopSleep);
      await expect(noKeyService.removeBackground('base64data')).rejects.toThrow('API key not configured');
    });

    it('calls Replicate API with versioned model endpoint', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse(succeededPrediction));

      const result = await service.removeBackground('base64data');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/predictions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-replicate-key' }),
        })
      );
      expect(result).toBe('https://cdn.replicate.com/output/mask.png');
    });

    it('handles array output correctly', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        ...succeededPrediction,
        output: ['https://output.png', 'https://other.png'],
      }));
      const result = await service.removeBackground('base64data');
      expect(result).toBe('https://output.png');
    });

    it('handles string output correctly', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        ...succeededPrediction,
        output: 'https://output.png',
      }));
      const result = await service.removeBackground('base64data');
      expect(result).toBe('https://output.png');
    });

    it('throws when output is missing', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        ...succeededPrediction,
        output: null,
      }));
      await expect(service.removeBackground('base64data')).rejects.toThrow('No output image');
    });

    it('prepends data URL prefix if missing', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse(succeededPrediction));
      await service.removeBackground('rawbase64withoutprefix');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.input.image).toMatch(/^data:image\/png;base64,/);
    });

    it('does not double-prefix if data URL already present', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse(succeededPrediction));
      await service.removeBackground('data:image/jpeg;base64,/9j/abc');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.input.image).toBe('data:image/jpeg;base64,/9j/abc');
    });
  });

  describe('upscale', () => {
    it('throws when API key missing', async () => {
      delete process.env.REPLICATE_API_KEY;
      const s = new ReplicateAIService(noopSleep);
      await expect(s.upscale('data')).rejects.toThrow('API key not configured');
    });

    it('passes scale and faceEnhance to API', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        ...succeededPrediction,
        output: 'https://upscaled.png',
      }));

      await service.upscale('base64data', 4, true);

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.input.scale).toBe(4);
      expect(callBody.input.face_enhance).toBe(true);
    });

    it('defaults to scale=2, faceEnhance=false', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        ...succeededPrediction,
        output: 'https://upscaled.png',
      }));

      await service.upscale('base64data');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.input.scale).toBe(2);
      expect(callBody.input.face_enhance).toBe(false);
    });
  });

  describe('expand', () => {
    it('throws when API key missing', async () => {
      delete process.env.REPLICATE_API_KEY;
      const s = new ReplicateAIService(noopSleep);
      await expect(s.expand('data')).rejects.toThrow('API key not configured');
    });

    it('applies all-direction padding when direction=all', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        ...succeededPrediction,
        output: 'https://expanded.png',
      }));

      await service.expand('base64data', 'extend naturally', 'all', 256);

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.input.top).toBe(256);
      expect(callBody.input.bottom).toBe(256);
      expect(callBody.input.left).toBe(256);
      expect(callBody.input.right).toBe(256);
    });

    it('applies single direction padding', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        ...succeededPrediction,
        output: 'https://expanded.png',
      }));

      await service.expand('base64data', 'extend right', 'right', 128);

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.input.right).toBe(128);
      expect(callBody.input.left).toBeUndefined();
    });

    it('uses default prompt when empty', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        ...succeededPrediction,
        output: 'https://expanded.png',
      }));

      await service.expand('base64data', '');

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.input.prompt).toContain('extend the image naturally');
    });
  });

  describe('API error handling', () => {
    it('throws non-retryable error on 401', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({ error: 'Unauthorized' }, 401));
      await expect(service.removeBackground('data')).rejects.toThrow('invalid or expired');
    });

    it('throws on 402 insufficient credits', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({ error: 'Payment required' }, 402));
      await expect(service.removeBackground('data')).rejects.toThrow('Insufficient credits');
    });

    it('throws on 422 invalid input', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({ error: 'Bad input' }, 422));
      await expect(service.removeBackground('data')).rejects.toThrow('Invalid input');
    });

    it('throws when prediction fails immediately', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        id: 'pred-fail',
        status: 'failed',
        error: 'Model error',
      }));
      await expect(service.removeBackground('data')).rejects.toThrow('Model error');
    });

    it('throws when prediction is cancelled', async () => {
      // Create returns processing, first poll returns canceled
      mockFetch
        .mockResolvedValueOnce(makeMockFetchResponse({
          id: 'pred-1',
          status: 'processing',
          urls: { get: 'https://api.replicate.com/v1/predictions/pred-1' },
        }, 201))
        .mockResolvedValueOnce(makeMockFetchResponse({ id: 'pred-1', status: 'canceled' }));

      await expect(service.removeBackground('data')).rejects.toThrow('canceled');
    });

    it('polls until prediction succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(makeMockFetchResponse({ id: 'pred-1', status: 'starting', urls: { get: 'https://api.replicate.com/v1/predictions/pred-1' } }))
        .mockResolvedValueOnce(makeMockFetchResponse({ id: 'pred-1', status: 'processing', urls: { get: 'https://api.replicate.com/v1/predictions/pred-1' } }))
        .mockResolvedValueOnce(makeMockFetchResponse({ id: 'pred-1', status: 'succeeded', output: 'https://result.png' }));

      const result = await service.removeBackground('data');
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toBe('https://result.png');
    });
  });

  describe('segment', () => {
    it('throws when API key missing', async () => {
      delete process.env.REPLICATE_API_KEY;
      const s = new ReplicateAIService(noopSleep);
      await expect(s.segment('data')).rejects.toThrow('API key not configured');
    });

    it('parses combined_mask and individual_masks output', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        id: 'pred-seg',
        status: 'succeeded',
        output: {
          combined_mask: 'https://combined.png',
          individual_masks: ['https://mask1.png', 'https://mask2.png'],
        },
      }));

      const result = await service.segment('base64data');

      expect(result.combinedMask).toBe('https://combined.png');
      expect(result.masks).toHaveLength(2);
      expect(result.predictionId).toBe('pred-seg');
    });

    it('falls back to array output format', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        id: 'pred-seg2',
        status: 'succeeded',
        output: ['https://mask1.png', 'https://mask2.png', 'https://mask3.png'],
      }));

      const result = await service.segment('base64data');
      expect(result.masks).toHaveLength(3);
    });
  });

  describe('segmentInteractive', () => {
    it('throws when no clicks provided', async () => {
      await expect(service.segmentInteractive('data', [])).rejects.toThrow('At least one click');
    });

    it('formats click coordinates correctly', async () => {
      mockFetch.mockResolvedValue(makeMockFetchResponse({
        id: 'pred-int',
        status: 'succeeded',
        output: ['https://mask.png'],
      }));

      await service.segmentInteractive('data', [
        { x: 100.7, y: 200.3, label: 1 },
        { x: 50.1, y: 75.9, label: 0 },
      ]);

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.input.click_coordinates).toBe('[101,200],[50,76]');
      expect(callBody.input.click_labels).toBe('1,0');
      expect(callBody.input.click_frames).toBe('0,0');
    });
  });
});
