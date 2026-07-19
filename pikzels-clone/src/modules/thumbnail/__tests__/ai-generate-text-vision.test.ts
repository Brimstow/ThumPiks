/**
 * Tests for aiGenerateText vision-aware mode.
 *
 * Validates:
 *  - Text-only mode (backwards compat)
 *  - Vision mode with imageUrl/imageBase64
 *  - Vision model selection per tier
 *  - Multimodal message construction
 *  - Vision fallback to text-only on failure
 *  - Image size validation (413)
 *  - response_format compatibility (json_schema vs json_object)
 *  - Analytics event includes vision fields
 */

// Mock global fetch before any imports
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock credit service
jest.mock('../../credit/credit.service', () => ({
  deductCredits: jest.fn().mockResolvedValue(true),
  refundCredits: jest.fn().mockResolvedValue(true),
}));

// Mock analytics
const mockEmitAnalyticsEvent = jest.fn();
jest.mock('../../../events/event-emitter', () => ({
  emitAnalyticsEvent: (...args: any[]) => mockEmitAnalyticsEvent(...args),
}));

// Mock model-tiers - keep real implementations for the helpers we test
jest.mock('../model-tiers.config', () => {
  const actual = jest.requireActual('../model-tiers.config');
  return {
    ...actual,
    buildTierAPIResponse: jest.fn(),
  };
});

// Mock services that aiGenerateText's parent module might import
jest.mock('../openrouter-ai.service', () => ({
  OpenRouterAIService: jest.fn().mockImplementation(() => ({
    isConfigured: () => true,
  })),
}));
jest.mock('../replicate-ai.service', () => ({
  ReplicateAIService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../comet-ai.service', () => ({
  CometAIService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../zenmux-ai.service', () => ({
  ZenmuxAIService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../thumbnail.service', () => ({
  ThumbnailService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../image-processing.service', () => ({
  ImageProcessingService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../admin/system-monitoring.service', () => ({
  systemMonitoringService: { recordAIUsage: jest.fn(), stop: jest.fn() },
}));
jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),
}));
jest.mock('../../../utils/json-validation', () => ({
  isZodError: jest.fn(() => false),
}));
jest.mock('../watermark.service', () => ({
  watermarkImageUrls: jest.fn(),
  shouldApplyWatermark: jest.fn(),
  getWatermarkFreeStatus: jest.fn(),
  consumeWatermarkFreeExport: jest.fn(),
  cleanupExpiredOriginals: jest.fn(),
  isCleanOriginalExpired: jest.fn(),
}));
jest.mock('../../subscription/subscription.service', () => ({
  getCurrentSubscription: jest.fn(),
}));
jest.mock('../../../utils/service-factory', () => ({
  getService: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

import { deductCredits, refundCredits } from '../../credit/credit.service';

// ============================================
// HELPERS
// ============================================

function makeMockResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    headers: { get: jest.fn().mockReturnValue('application/json') },
    arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-img')),
  } as any;
}

function makeSuccessfulAIResponse(suggestions: any[]) {
  return makeMockResponse({
    choices: [{ message: { content: JSON.stringify({ suggestions }) } }],
  });
}

function makeAuthRequest(body: Record<string, unknown> = {}) {
  return {
    user: { id: 'test-user-123' },
    body,
  } as any;
}

function makeRes() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

const SAMPLE_SUGGESTIONS = [
  { text: 'YOU WONT BELIEVE THIS', style: 'bold', score: 0.95 },
  { text: 'IS THIS REAL?', style: 'question', score: 0.88 },
  { text: 'TOP 5 SECRETS', style: 'listicle', score: 0.82 },
];

// ============================================
// TESTS
// ============================================

describe('aiGenerateText - vision-aware mode', () => {
  let aiGenerateText: any;

  beforeAll(async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
    process.env.APP_URL = 'https://thumpiks.com';

    // Dynamic import to let mocks settle
    const controller = await import('../thumbnail.controller');
    aiGenerateText = controller.aiGenerateText;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (deductCredits as jest.Mock).mockResolvedValue(true);
    (refundCredits as jest.Mock).mockResolvedValue(true);
  });

  afterAll(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_URL;
    delete process.env.APP_URL;
  });

  // =========================================================================
  // TEXT-ONLY MODE (backwards compatibility)
  // =========================================================================
  describe('text-only mode (backwards compat)', () => {
    it('generates text suggestions from prompt only', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({ prompt: 'Epic gaming moments' });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.suggestions).toHaveLength(3);
      expect(body.visionMode).toBe(false);
      expect(body.fallbackUsed).toBeUndefined();
    });

    it('uses text model (GPT-4.1 Nano) when no image provided', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({ prompt: 'Test' });
      const res = makeRes();

      await aiGenerateText(req, res);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe('openai/gpt-4.1-nano');
      // User message should be plain string, not multimodal array
      expect(typeof requestBody.messages[1].content).toBe('string');
    });

    it('returns 400 when no prompt and no image', async () => {
      const req = makeAuthRequest({});
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Prompt is required' });
    });

    it('returns 401 when not authenticated', async () => {
      const req = { user: null, body: { prompt: 'Test' } } as any;
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // =========================================================================
  // VISION MODE - imageUrl
  // =========================================================================
  describe('vision mode with imageUrl', () => {
    it('uses vision model when imageUrl is provided', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Gaming thumbnail',
        imageUrl: 'https://example.com/thumb.jpg',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.visionMode).toBe(true);
      expect(body.success).toBe(true);

      // Should use vision model, not text model
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      // Default tier is flash → vision model is qwen/qwen3.5-flash
      expect(requestBody.model).toBe('qwen/qwen3.5-flash');
    });

    it('builds multimodal content array when imageUrl is provided', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Gaming thumbnail',
        imageUrl: 'https://example.com/thumb.jpg',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const userMsg = requestBody.messages[1];

      // User message should be a multimodal content array
      expect(Array.isArray(userMsg.content)).toBe(true);
      expect(userMsg.content).toHaveLength(2);
      expect(userMsg.content[0].type).toBe('image_url');
      expect(userMsg.content[0].image_url.url).toBe('https://example.com/thumb.jpg');
      expect(userMsg.content[1].type).toBe('text');
      expect(userMsg.content[1].text).toBe('Gaming thumbnail');
    });

    it('includes vision instructions in system prompt', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const systemPrompt = requestBody.messages[0].content;

      expect(systemPrompt).toContain('vision capability');
      expect(systemPrompt).toContain('VISUAL ANALYSIS INSTRUCTIONS');
      expect(systemPrompt).toContain('dominant colors');
    });
  });

  // =========================================================================
  // VISION MODE - imageBase64
  // =========================================================================
  describe('vision mode with imageBase64', () => {
    it('uses vision model when imageBase64 is provided', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQ...',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.visionMode).toBe(true);
    });

    it('defaults prompt when only image is provided', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        imageUrl: 'https://example.com/thumb.jpg',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const userContent = requestBody.messages[1].content;
      const textPart = userContent.find((c: any) => c.type === 'text');
      expect(textPart.text).toBe('Generate click-worthy text for this YouTube thumbnail');
    });
  });

  // =========================================================================
  // TIER SELECTION - vision models per tier
  // =========================================================================
  describe('vision model selection by tier', () => {
    it('selects Qwen 3.5 Flash for flash tier', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
        tier: 'flash',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe('qwen/qwen3.5-flash');
    });

    it('selects Gemini 2.5 Flash for standard tier', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
        tier: 'standard',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe('google/gemini-2.5-flash');
    });

    it('selects Grok 4.1 Fast for pro tier', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
        tier: 'pro',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe('x-ai/grok-4.1-fast');
    });
  });

  // =========================================================================
  // RESPONSE FORMAT COMPATIBILITY
  // =========================================================================
  describe('response_format compatibility', () => {
    it('uses json_schema for Google vision models (standard tier)', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
        tier: 'standard', // google/gemini-2.5-flash
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.response_format.type).toBe('json_schema');
      expect(requestBody.response_format.json_schema).toBeDefined();
    });

    it('uses json_object for Qwen vision models (flash tier)', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
        tier: 'flash', // qwen/qwen3.5-flash
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.response_format.type).toBe('json_object');
    });

    it('uses json_object for xAI vision models (pro tier)', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
        tier: 'pro', // x-ai/grok-4.1-fast
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.response_format.type).toBe('json_object');
    });

    it('adds JSON format instructions to system prompt for non-schema models', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
        tier: 'flash', // Qwen - uses json_object
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const systemPrompt = requestBody.messages[0].content;
      expect(systemPrompt).toContain('You MUST respond with a valid JSON object');
    });
  });

  // =========================================================================
  // VISION FALLBACK
  // =========================================================================
  describe('vision fallback on failure', () => {
    it('falls back to text-only model when vision model fails', async () => {
      // First call: vision model fails
      mockFetch.mockResolvedValueOnce(makeMockResponse({ error: 'model unavailable' }, 503));
      // Second call: text model succeeds
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));

      const req = makeAuthRequest({
        prompt: 'Test fallback',
        imageUrl: 'https://example.com/thumb.jpg',
        tier: 'flash',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.visionMode).toBe(true);
      expect(body.fallbackUsed).toBe(true);

      // Should have made 2 fetch calls (vision fail + text fallback)
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second call should use text model
      const fallbackBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(fallbackBody.model).toBe('openai/gpt-4.1-nano');
      // And should NOT include image in messages
      expect(typeof fallbackBody.messages[1].content).toBe('string');
    });

    it('does NOT fallback when text-only mode fails', async () => {
      mockFetch.mockResolvedValueOnce(makeMockResponse({ error: { message: 'rate limited' } }, 429));
      const req = makeAuthRequest({ prompt: 'Test', tier: 'flash' });
      const res = makeRes();

      await aiGenerateText(req, res);

      // Should only make 1 call (no fallback for text-only mode)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // IMAGE SIZE VALIDATION
  // =========================================================================
  describe('image size validation', () => {
    it('rejects base64 images exceeding 10MB', async () => {
      // Create a string that simulates a >10MB base64 image
      const largeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(15 * 1024 * 1024);
      const req = makeAuthRequest({
        prompt: 'Test',
        imageBase64: largeBase64,
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(res.status).toHaveBeenCalledWith(413);
      const body = res.json.mock.calls[0][0];
      expect(body.error).toContain('too large');
      // Credits should be refunded
      expect(refundCredits).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // ANALYTICS
  // =========================================================================
  describe('analytics event', () => {
    it('includes visionMode=true and image source in analytics', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(mockEmitAnalyticsEvent).toHaveBeenCalledWith(
        'test-user-123',
        'ai-tool',
        'generate-text',
        'ai-text',
        expect.objectContaining({
          visionMode: true,
          imageSource: 'url',
          fallbackUsed: false,
        })
      );
    });

    it('includes visionMode=false for text-only requests', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({ prompt: 'Test' });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(mockEmitAnalyticsEvent).toHaveBeenCalledWith(
        'test-user-123',
        'ai-tool',
        'generate-text',
        'ai-text',
        expect.objectContaining({
          visionMode: false,
          imageSource: null,
        })
      );
    });

    it('tracks base64 image source', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageBase64: 'data:image/png;base64,abc123',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(mockEmitAnalyticsEvent).toHaveBeenCalledWith(
        'test-user-123',
        'ai-tool',
        'generate-text',
        'ai-text',
        expect.objectContaining({
          imageSource: 'base64',
        })
      );
    });
  });

  // =========================================================================
  // CREDIT HANDLING
  // =========================================================================
  describe('credit handling', () => {
    it('deducts credits with vision label when image provided', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(deductCredits).toHaveBeenCalledWith(
        'test-user-123',
        1, // flash tier = 1 credit
        expect.stringContaining('(vision)')
      );
    });

    it('uses same credit cost for vision and text-only', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
        tier: 'pro',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(deductCredits).toHaveBeenCalledWith(
        'test-user-123',
        3, // pro tier = 3 credits, same with or without image
        expect.any(String)
      );
    });

    it('returns 402 when insufficient credits', async () => {
      (deductCredits as jest.Mock).mockResolvedValueOnce(false);
      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'https://example.com/thumb.jpg',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Insufficient credits' })
      );
    });

    it('refunds credits when API call fails', async () => {
      mockFetch.mockResolvedValueOnce(makeMockResponse({ error: { message: 'API fail' } }, 500));
      const req = makeAuthRequest({ prompt: 'Test' });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(refundCredits).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // LOCALHOST IMAGE HANDLING
  // =========================================================================
  describe('localhost image URL handling', () => {
    it('converts localhost URLs to base64 for external API access', async () => {
      // First fetch: localhost image conversion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('image/jpeg') },
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
      } as any);
      // Second fetch: AI API call
      mockFetch.mockResolvedValueOnce(makeSuccessfulAIResponse(SAMPLE_SUGGESTIONS));

      const req = makeAuthRequest({
        prompt: 'Test',
        imageUrl: 'http://localhost:8550/uploads/test.jpg',
      });
      const res = makeRes();

      await aiGenerateText(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // First call should fetch the localhost image
      expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:8550/uploads/test.jpg');
      // Second call should have the base64 image in the message
      const aiBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const imageContent = aiBody.messages[1].content[0];
      expect(imageContent.image_url.url).toMatch(/^data:image\/jpeg;base64,/);
    });
  });
});
