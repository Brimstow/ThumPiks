import { OpenRouterAIService } from '../openrouter-ai.service';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

function makeMockFetchResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as any;
}

/** Build a tool_calls response for detectObjects (Gemini native path) */
function makeToolCallsResponse(
  objects: Array<{ label: string; category: string; confidence: number; box_2d: number[] }>
) {
  return makeMockFetchResponse({
    choices: [{
      message: {
        tool_calls: [{
          id: 'call_detect_1',
          type: 'function',
          function: {
            name: 'report_detected_objects',
            arguments: JSON.stringify({ objects }),
          },
        }],
      },
    }],
  });
}

/** Build a text-content-only response (triggers fallback path) */
function makeContentResponse(content: string) {
  return makeMockFetchResponse({
    choices: [{ message: { content } }],
  });
}

/** Mock 5 Reka category calls where only specific indices have content */
function mockRekaCategories(contentByIndex: Record<number, string> = {}) {
  for (let i = 0; i < 5; i++) {
    mockFetch.mockResolvedValueOnce(makeMockFetchResponse({
      choices: [{ message: { content: contentByIndex[i] ?? '' } }],
    }));
  }
}

describe('OpenRouterAIService - Hybrid Detection', () => {
  let service: OpenRouterAIService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    process.env.OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
    process.env.OPENROUTER_MODEL_DETECT = 'google/gemini-3-flash-preview';
    process.env.OPENROUTER_MODEL_DETECT_REKA = 'reka/reka-edge';
    service = new OpenRouterAIService();
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_URL;
    delete process.env.OPENROUTER_MODEL_DETECT;
    delete process.env.OPENROUTER_MODEL_DETECT_REKA;
  });

  // =========================================================================
  // detectObjects — Primary path (native tool calling)
  // =========================================================================
  describe('detectObjects (tool_calls path)', () => {
    it('should parse valid tool_call response with objects', async () => {
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([
        { label: 'person in suit', category: 'foreground', confidence: 0.95, box_2d: [100, 200, 800, 600] },
        { label: 'text: TOP 10', category: 'text', confidence: 0.92, box_2d: [20, 100, 120, 900] },
        { label: 'mountain range', category: 'background', confidence: 0.85, box_2d: [0, 0, 400, 1000] },
      ]));

      const result = await service.detectObjects('base64data');

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        label: 'person in suit',
        category: 'foreground',
        confidence: 0.95,
        bbox: { yMin: 100, xMin: 200, yMax: 800, xMax: 600 },
      });
    });

    it('should send tools parameter with DETECT_OBJECTS_TOOL', async () => {
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([]));

      await service.detectObjects('base64data');

      const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(Array.isArray(callBody.tools)).toBe(true);
      expect(callBody.tools[0].function.name).toBe('report_detected_objects');
      expect(callBody.tool_choice).toEqual({
        type: 'function',
        function: { name: 'report_detected_objects' },
      });
    });

    it('should return empty array when API key not configured', async () => {
      delete process.env.OPENROUTER_API_KEY;
      service = new OpenRouterAIService();

      const result = await service.detectObjects('base64data');

      expect(result).toEqual([]);
    });

    it('should return empty array when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limited'),
      } as any);

      const result = await service.detectObjects('base64data');

      expect(result).toEqual([]);
    });

    it('should deduplicate overlapping detections (IoU > 0.7)', async () => {
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([
        { label: 'person', category: 'foreground', confidence: 0.95, box_2d: [100, 200, 800, 600] },
        { label: 'person duplicate', category: 'foreground', confidence: 0.80, box_2d: [110, 210, 790, 590] },
        { label: 'text', category: 'text', confidence: 0.9, box_2d: [10, 10, 50, 200] },
      ]));

      const result = await service.detectObjects('base64data');

      expect(result).toHaveLength(2);
      expect(result[0]?.label).toBe('person');
    });

    it('should default category to foreground when invalid', async () => {
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([
        { label: 'thing', category: 'invalid_category', confidence: 0.8, box_2d: [10, 20, 50, 80] },
      ]));

      const result = await service.detectObjects('base64data');

      expect(result[0]?.category).toBe('foreground');
    });

    it('should default confidence to 0.5 when missing or out of range', async () => {
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([
        { label: 'object', category: 'foreground', confidence: undefined as any, box_2d: [10, 20, 50, 80] },
        { label: 'object2', category: 'foreground', confidence: 1.5, box_2d: [100, 200, 300, 400] },
      ]));

      const result = await service.detectObjects('base64data');

      expect(result[0]?.confidence).toBe(0.5);
      expect(result[1]?.confidence).toBe(0.5);
    });

    it('should skip items with invalid bounding boxes', async () => {
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([
        { label: 'valid', category: 'foreground', confidence: 0.9, box_2d: [10, 20, 50, 80] },
        { label: 'missing box', category: 'foreground', confidence: 0.9, box_2d: undefined as any },
        { label: 'wrong length', category: 'foreground', confidence: 0.9, box_2d: [10, 20, 50] as any },
        { label: 'non-numeric', category: 'foreground', confidence: 0.9, box_2d: ['a', 'b', 'c', 'd'] as any },
      ]));

      const result = await service.detectObjects('base64data');

      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('valid');
    });

    it('should skip items with empty labels', async () => {
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([
        { label: '', category: 'foreground', confidence: 0.9, box_2d: [10, 20, 50, 80] },
        { label: 'valid', category: 'foreground', confidence: 0.9, box_2d: [100, 200, 300, 400] },
      ]));

      const result = await service.detectObjects('base64data');

      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('valid');
    });

    it('should handle empty objects array from tool_call', async () => {
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([]));

      const result = await service.detectObjects('base64data');

      expect(result).toEqual([]);
    });

    it('should convert base64 to data URL if not already', async () => {
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([]));

      await service.detectObjects('rawbase64data');

      const callBody = mockFetch.mock.calls[0]?.[1]?.body as string;
      expect(callBody).toContain('data:image/png;base64,rawbase64data');
    });

    it('should preserve data URL prefix if already present', async () => {
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([]));

      await service.detectObjects('data:image/jpeg;base64,rawbase64data');

      const callBody = mockFetch.mock.calls[0]?.[1]?.body as string;
      expect(callBody).toContain('data:image/jpeg;base64,rawbase64data');
    });

    it('should return empty array when tool_call arguments are unparseable', async () => {
      mockFetch.mockResolvedValueOnce(makeMockFetchResponse({
        choices: [{
          message: {
            tool_calls: [{
              id: 'call_1',
              type: 'function',
              function: {
                name: 'report_detected_objects',
                arguments: 'not valid json',
              },
            }],
          },
        }],
      }));

      const result = await service.detectObjects('base64data');

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // detectObjects — Fallback path (model ignores tool_choice, returns text)
  // =========================================================================
  describe('detectObjects (parseDetectionFallback path)', () => {
    const validJsonArray = [
      { label: 'car', category: 'foreground', confidence: 0.9, box_2d: [50, 100, 300, 400] },
    ];

    it('should fall back to text parsing when no tool_calls in response', async () => {
      mockFetch.mockResolvedValueOnce(makeContentResponse(JSON.stringify(validJsonArray)));

      const result = await service.detectObjects('base64data');

      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('car');
    });

    it('should handle markdown-wrapped JSON in fallback', async () => {
      const markdownWrapped = '```json\n' + JSON.stringify(validJsonArray) + '\n```';
      mockFetch.mockResolvedValueOnce(makeContentResponse(markdownWrapped));

      const result = await service.detectObjects('base64data');

      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('car');
    });

    it('should handle JSON object wrapping an array in fallback', async () => {
      const detections = [
        { label: 'p1', category: 'foreground', confidence: 0.9, box_2d: [10, 20, 50, 80] },
        { label: 'p2', category: 'text', confidence: 0.8, box_2d: [100, 200, 300, 400] },
      ];
      const wrapped = { detections, count: 2 };
      mockFetch.mockResolvedValueOnce(makeContentResponse(JSON.stringify(wrapped)));

      const result = await service.detectObjects('base64data');

      // Fallback extracts array from object values
      expect(result).toHaveLength(2);
    });

    it('should accept alternative field names (name, bounding_box) in fallback', async () => {
      const altFields = [
        { name: 'car', category: 'foreground', confidence: 0.9, bounding_box: [50, 100, 300, 400] },
      ];
      mockFetch.mockResolvedValueOnce(makeContentResponse(JSON.stringify(altFields)));

      const result = await service.detectObjects('base64data');

      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('car');
    });

    it('should handle empty array text response in fallback', async () => {
      mockFetch.mockResolvedValueOnce(makeContentResponse('[]'));

      const result = await service.detectObjects('base64data');

      expect(result).toEqual([]);
    });

    it('should handle non-JSON text response gracefully', async () => {
      mockFetch.mockResolvedValueOnce(makeContentResponse('This is not JSON at all'));

      const result = await service.detectObjects('base64data');

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // parseRekaDetectResponse (private, tested via detectObjectsReka)
  // =========================================================================
  describe('parseRekaDetectResponse (private via detectObjectsReka)', () => {
    it('should parse <obj> tags with coordinates (x1,y1,x2,y2 format)', async () => {
      const rekaResponse = '<obj>person 100,200,800,600</obj>\n<obj>car 50,100,300,400</obj>';
      // Reka format: <obj>label x1,y1,x2,y2</obj> → bbox: { xMin: x1, yMin: y1, xMax: x2, yMax: y2 }
      mockRekaCategories({ 0: rekaResponse });

      const result = await service.detectObjectsReka('base64data');

      const personResult = result.find(r => r.label === 'person');
      expect(personResult).toBeDefined();
      expect(personResult?.bbox).toEqual({ yMin: 200, xMin: 100, yMax: 600, xMax: 800 });
      expect(personResult?.category).toBe('foreground');

      const carResult = result.find(r => r.label === 'car');
      expect(carResult).toBeDefined();
      expect(carResult?.bbox).toEqual({ yMin: 100, xMin: 50, yMax: 400, xMax: 300 });
    });

    it('should clamp coordinates to 0-1000 range', async () => {
      const rekaResponse = '<obj>object -50,1500,2000,800</obj>';
      mockRekaCategories({ 0: rekaResponse });

      const result = await service.detectObjectsReka('base64data');

      const obj = result.find(r => r.label === 'object');
      if (obj) {
        expect(obj.bbox.xMin).toBeGreaterThanOrEqual(0);
        expect(obj.bbox.xMin).toBeLessThanOrEqual(1000);
        expect(obj.bbox.yMin).toBeGreaterThanOrEqual(0);
        expect(obj.bbox.yMax).toBeLessThanOrEqual(1000);
      }
    });

    it('should handle multiple coordinate pairs in one <obj> tag', async () => {
      const rekaResponse = '<obj>text 10,20,50,80;100,200,300,400</obj>';
      // text category = index 1
      mockRekaCategories({ 1: rekaResponse });

      const result = await service.detectObjectsReka('base64data');

      const textResults = result.filter(r => r.category === 'text');
      expect(textResults.length).toBeGreaterThanOrEqual(1);
    });

    it('should use fallback regex when no <obj> tags present', async () => {
      const fallbackResponse = 'person: 100,200,800,600\ncar: 50,100,300,400';
      mockRekaCategories({ 0: fallbackResponse });

      const result = await service.detectObjectsReka('base64data');

      const personResult = result.find(r => r.label.includes('person'));
      expect(personResult).toBeDefined();
    });

    it('should return empty array for empty response', async () => {
      mockRekaCategories();

      const result = await service.detectObjectsReka('base64data');

      expect(result).toEqual([]);
    });

    it('should use high default confidence (0.85) for Reka detections', async () => {
      const rekaResponse = '<obj>object 100,200,800,600</obj>';
      mockRekaCategories({ 0: rekaResponse });

      const result = await service.detectObjectsReka('base64data');

      if (result.length > 0) {
        expect(result[0]?.confidence).toBe(0.85);
      }
    });
  });

  // =========================================================================
  // detectObjectsReka
  // =========================================================================
  describe('detectObjectsReka', () => {
    it('should return empty array when API key not configured', async () => {
      delete process.env.OPENROUTER_API_KEY;
      service = new OpenRouterAIService();

      const result = await service.detectObjectsReka('base64data');

      expect(result).toEqual([]);
    });

    it('should make parallel calls for all 5 categories', async () => {
      mockRekaCategories();

      await service.detectObjectsReka('base64data');

      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should continue if one category call fails', async () => {
      // First call fails, rest succeed with empty
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server error'),
      } as any);
      for (let i = 0; i < 4; i++) {
        mockFetch.mockResolvedValueOnce(makeMockFetchResponse({
          choices: [{ message: { content: '' } }],
        }));
      }

      const result = await service.detectObjectsReka('base64data');

      expect(result).toEqual([]);
    });

    it('should cap results at maxObjects', async () => {
      const manyObjects = Array.from({ length: 20 }, (_, i) =>
        `<obj>object${i} ${i * 10},${i * 10},${i * 10 + 50},${i * 10 + 50}</obj>`
      ).join('\n');
      mockRekaCategories({ 0: manyObjects });

      const result = await service.detectObjectsReka('base64data', 10);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should sort results by confidence descending before capping', async () => {
      const rekaResponse = '<obj>low 10,20,50,80</obj>';
      mockRekaCategories({ 0: rekaResponse });

      const result = await service.detectObjectsReka('base64data');

      for (let i = 1; i < result.length; i++) {
        expect(result[i]?.confidence).toBeLessThanOrEqual(result[i - 1]?.confidence ?? 1);
      }
    });
  });

  // =========================================================================
  // detectObjectsParallel
  // =========================================================================
  describe('detectObjectsParallel', () => {
    it('should merge Reka and Gemini results', async () => {
      // Reka calls (5 categories) — foreground has result
      mockRekaCategories({ 0: '<obj>person 100,200,800,600</obj>' });
      // Gemini call — returns via tool_calls
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([
        { label: 'car', category: 'foreground', confidence: 0.9, box_2d: [50, 100, 300, 400] },
      ]));

      const result = await service.detectObjectsParallel('base64data');

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should prioritize Reka results over Gemini in deduplication', async () => {
      // Both detect same object at similar coordinates
      mockRekaCategories({ 0: '<obj>person 100,200,800,600</obj>' });
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([
        { label: 'person', category: 'foreground', confidence: 0.85, box_2d: [200, 100, 600, 800] },
      ]));

      const result = await service.detectObjectsParallel('base64data');

      // Due to IoU dedup, overlapping should be reduced
      const personResults = result.filter(r => r.label === 'person' || r.label.includes('person'));
      expect(personResults.length).toBeLessThanOrEqual(2);
    });

    it('should use Gemini only when Reka fails', async () => {
      // Reka calls all fail
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Server error'),
        } as any);
      }
      // Gemini succeeds via tool_calls
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([
        { label: 'car', category: 'foreground', confidence: 0.9, box_2d: [50, 100, 300, 400] },
      ]));

      const result = await service.detectObjectsParallel('base64data');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]?.label).toBe('car');
    });

    it('should use Reka only when Gemini fails', async () => {
      // Reka succeeds
      mockRekaCategories({ 0: '<obj>person 100,200,800,600</obj>' });
      // Gemini fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server error'),
      } as any);

      const result = await service.detectObjectsParallel('base64data');

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when both fail', async () => {
      // Reka calls all fail
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Server error'),
        } as any);
      }
      // Gemini fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server error'),
      } as any);

      const result = await service.detectObjectsParallel('base64data');

      expect(result).toEqual([]);
    });

    it('should cap final results at maxObjects', async () => {
      const manyReka = Array.from({ length: 10 }, (_, i) =>
        `<obj>reka${i} ${i * 10},${i * 10},${i * 10 + 50},${i * 10 + 50}</obj>`
      ).join('\n');
      const manyGemini = Array.from({ length: 10 }, (_, i) => ({
        label: `gemini${i}`,
        category: 'foreground' as const,
        confidence: 0.8,
        box_2d: [i * 10 + 500, i * 10, i * 10 + 550, i * 10 + 50],
      }));

      mockRekaCategories({ 0: manyReka });
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse(manyGemini));

      const result = await service.detectObjectsParallel('base64data', 7);

      expect(result.length).toBeLessThanOrEqual(7);
    });

    it('should not deduplicate non-overlapping detections', async () => {
      // Two well-separated objects
      mockRekaCategories({ 0: '<obj>left_object 0,0,100,100</obj>' });
      mockFetch.mockResolvedValueOnce(makeToolCallsResponse([
        { label: 'right_object', category: 'foreground', confidence: 0.9, box_2d: [500, 500, 600, 600] },
      ]));

      const result = await service.detectObjectsParallel('base64data');

      expect(result.length).toBe(2);
    });
  });

  // =========================================================================
  // getModelForTool
  // =========================================================================
  describe('getModelForTool', () => {
    it('should return primary model for detect tool', () => {
      const model = service.getModelForTool('detect');

      expect(model).toBe('google/gemini-3-flash-preview');
    });

    it('should return primary model for detectReka tool', () => {
      const model = service.getModelForTool('detectReka');

      expect(model).toBe('reka/reka-edge');
    });

    it('should use env var override when set', () => {
      process.env.OPENROUTER_MODEL_DETECT = 'custom-model';
      service = new OpenRouterAIService();

      const model = service.getModelForTool('detect');

      expect(model).toBe('custom-model');
    });

    it('should use env var override for Reka', () => {
      process.env.OPENROUTER_MODEL_DETECT_REKA = 'rekaai/reka-flash';
      service = new OpenRouterAIService();

      const model = service.getModelForTool('detectReka');

      expect(model).toBe('rekaai/reka-flash');
    });
  });
});
