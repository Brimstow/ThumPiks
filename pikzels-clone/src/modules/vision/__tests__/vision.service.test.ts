import { VisionService } from '../vision.service';

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock prisma-factory
jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => mockPrisma),
}));

// Mock CacheService
jest.mock('../../../services/cache.service', () => ({
  CacheService: {
    getInstance: jest.fn(() => mockCache),
  },
}));

// Mock credit service
jest.mock('../../credit/credit.service', () => ({
  deductCredits: jest.fn(),
}));
import { deductCredits } from '../../credit/credit.service';
const mockDeductCredits = deductCredits as jest.MockedFunction<typeof deductCredits>;

// Mock instances
const mockPrisma: any = {
  visionAnalysis: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockCache: any = {
  get: jest.fn(),
  set: jest.fn(),
  getOrSet: jest.fn(),
};

describe('VisionService', () => {
  let service: VisionService;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    process.env.OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
    process.env.BING_SEARCH_API_KEY = 'test-bing-key';
    process.env.BING_SEARCH_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/images/search';

    service = new VisionService({
      prisma: mockPrisma,
      cache: mockCache,
    });
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.BING_SEARCH_API_KEY;
  });

  describe('analyzeImage', () => {
    const userId = 'user-123';
    const imageUrl = 'https://example.com/thumbnail.jpg';

    const mockVisionResponse = {
      description: 'A bold gaming thumbnail with neon colors',
      elements: {
        mainSubject: 'Gaming character',
        faces: 1,
        textOverlay: ['EPIC WIN'],
        colorPalette: ['#FF0000', '#00FF00', '#0000FF'],
        mood: 'energetic',
        style: 'bold',
        composition: 'centered',
      },
    };

    it('should analyze an image and return structured result', async () => {
      mockDeductCredits.mockResolvedValue(true);

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify(mockVisionResponse),
              },
            },
          ],
        }),
      } as any);

      mockPrisma.visionAnalysis.create.mockResolvedValue({
        id: 'analysis-1',
        userId,
        imageUrl,
        description: mockVisionResponse.description,
        suggestedPrompt: 'Create a bold YouTube thumbnail. with a energetic mood. featuring Gaming character. using colors: #FF0000, #00FF00, #0000FF. with text: "EPIC WIN". centered composition.',
        elements: mockVisionResponse.elements,
        sourceType: 'url',
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.analyzeImage(imageUrl, userId);

      expect(result.id).toBe('analysis-1');
      expect(result.description).toBe(mockVisionResponse.description);
      expect(result.elements.mainSubject).toBe('Gaming character');
      expect(result.elements.faces).toBe(1);
      expect(result.elements.mood).toBe('energetic');
      expect(result.elements.colorPalette).toEqual(['#FF0000', '#00FF00', '#0000FF']);

      // Verify credit was deducted
      expect(mockDeductCredits).toHaveBeenCalledWith(userId, 1, 'Vision analysis - thumbnail reference');

      // Verify OpenRouter was called with correct format
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-openrouter-key',
          }),
        })
      );

      // Verify body contains multimodal message format
      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.messages[1].content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'image_url' }),
          expect.objectContaining({ type: 'text' }),
        ])
      );
    });

    it('should throw error when OpenRouter API key is not configured', async () => {
      delete process.env.OPENROUTER_API_KEY;
      const serviceNoKey = new VisionService({
        prisma: mockPrisma,
        cache: mockCache,
      });

      await expect(serviceNoKey.analyzeImage(imageUrl, userId)).rejects.toThrow(
        'OpenRouter API key not configured'
      );
    });

    it('should throw error when credits are insufficient', async () => {
      mockDeductCredits.mockResolvedValue(false);

      await expect(service.analyzeImage(imageUrl, userId)).rejects.toThrow(
        'Insufficient credits for vision analysis'
      );
    });

    it('should throw error when OpenRouter returns non-ok response', async () => {
      mockDeductCredits.mockResolvedValue(true);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limit exceeded'),
      } as any);

      await expect(service.analyzeImage(imageUrl, userId)).rejects.toThrow(
        'Vision analysis failed (429): Rate limit exceeded'
      );
    });

    it('should handle malformed JSON from vision model gracefully', async () => {
      mockDeductCredits.mockResolvedValue(true);

      // Return invalid JSON from the vision model
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'This is not valid JSON but a description of the image.',
              },
            },
          ],
        }),
      } as any);

      mockPrisma.visionAnalysis.create.mockResolvedValue({
        id: 'analysis-2',
        userId,
        imageUrl,
        description: 'This is not valid JSON but a description of the image.',
        suggestedPrompt: 'Create a default YouTube thumbnail. centered composition.',
        elements: {
          mainSubject: 'Unknown',
          faces: 0,
          textOverlay: [],
          colorPalette: [],
          mood: 'neutral',
          style: 'default',
          composition: 'centered',
        },
        sourceType: 'url',
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.analyzeImage(imageUrl, userId);

      // Should still return a result with fallback elements
      expect(result.id).toBe('analysis-2');
      expect(result.elements.mainSubject).toBe('Unknown');
      expect(result.elements.mood).toBe('neutral');
    });

    it('should set sourceType to upload for base64 images', async () => {
      mockDeductCredits.mockResolvedValue(true);

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(mockVisionResponse) } }],
        }),
      } as any);

      mockPrisma.visionAnalysis.create.mockResolvedValue({
        id: 'analysis-3',
        userId,
        imageUrl: 'data:image/png;base64,abc123',
        description: mockVisionResponse.description,
        suggestedPrompt: 'test prompt',
        elements: mockVisionResponse.elements,
        sourceType: 'upload',
        createdAt: new Date('2026-01-01'),
      });

      await service.analyzeImage('data:image/png;base64,abc123', userId);

      expect(mockPrisma.visionAnalysis.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceType: 'upload',
          }),
        })
      );
    });
  });

  describe('searchWebImages', () => {
    it('should search and return filtered Bing results', async () => {
      mockCache.get.mockResolvedValue(null);

      const mockBingResponse = {
        value: [
          {
            contentUrl: 'https://example.com/img1.jpg',
            name: 'Test Image 1',
            hostPageUrl: 'https://example.com/page1',
            width: 1280,
            height: 720,
            thumbnailUrl: 'https://thumb.example.com/img1.jpg',
          },
          {
            contentUrl: 'https://example.com/img2.jpg',
            name: 'Test Image 2',
            hostPageUrl: 'https://example.com/page2',
            width: 400, // Too small, should be filtered
            height: 300,
            thumbnailUrl: 'https://thumb.example.com/img2.jpg',
          },
          {
            contentUrl: 'https://example.com/img3.jpg',
            name: 'Test Image 3',
            hostPageUrl: 'https://example.com/page3',
            width: 1920,
            height: 1080,
            thumbnailUrl: 'https://thumb.example.com/img3.jpg',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockBingResponse),
      } as any);

      const results = await service.searchWebImages('gaming thumbnail', 10);

      // Should filter out the 400px image
      expect(results).toHaveLength(2);
      expect(results[0]!.url).toBe('https://example.com/img1.jpg');
      expect(results[0]!.title).toBe('Test Image 1');
      expect(results[0]!.width).toBe(1280);
      expect(results[1]!.url).toBe('https://example.com/img3.jpg');

      // Verify Bing API was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.bing.microsoft.com'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': 'test-bing-key',
          }),
        })
      );

      // Verify results were cached
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('bing:images:gaming thumbnail'),
        results,
        1800
      );
    });

    it('should return cached results when available', async () => {
      const cachedResults = [
        {
          url: 'https://cached.com/img.jpg',
          title: 'Cached',
          sourceUrl: 'https://cached.com',
          width: 1280,
          height: 720,
          thumbnailUrl: 'https://cached.com/thumb.jpg',
        },
      ];

      mockCache.get.mockResolvedValue(cachedResults);

      const results = await service.searchWebImages('cached query');

      expect(results).toEqual(cachedResults);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when Bing API key is not configured', async () => {
      delete process.env.BING_SEARCH_API_KEY;
      const serviceNoKey = new VisionService({
        prisma: mockPrisma,
        cache: mockCache,
      });

      await expect(serviceNoKey.searchWebImages('test')).rejects.toThrow(
        'Bing Search API key not configured'
      );
    });

    it('should throw error when Bing API returns non-ok response', async () => {
      mockCache.get.mockResolvedValue(null);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('Invalid API key'),
      } as any);

      await expect(service.searchWebImages('test')).rejects.toThrow(
        'Bing Image Search failed (403): Invalid API key'
      );
    });
  });

  describe('getHistory', () => {
    it('should return user analysis history via cache', async () => {
      const mockHistory = [
        {
          id: 'analysis-1',
          imageUrl: 'https://example.com/img1.jpg',
          description: 'A bold thumbnail',
          suggestedPrompt: 'Create a bold thumbnail...',
          elements: {
            mainSubject: 'Person',
            faces: 1,
            textOverlay: [],
            colorPalette: ['#FF0000'],
            mood: 'energetic',
            style: 'bold',
            composition: 'centered',
          },
          createdAt: new Date('2026-01-01'),
        },
      ];

      mockCache.getOrSet.mockImplementation(async (_key: string, fetchFn: () => Promise<any>) => {
        return fetchFn();
      });

      mockPrisma.visionAnalysis.findMany.mockResolvedValue([
        {
          id: 'analysis-1',
          imageUrl: 'https://example.com/img1.jpg',
          description: 'A bold thumbnail',
          suggestedPrompt: 'Create a bold thumbnail...',
          elements: {
            mainSubject: 'Person',
            faces: 1,
            textOverlay: [],
            colorPalette: ['#FF0000'],
            mood: 'energetic',
            style: 'bold',
            composition: 'centered',
          },
          createdAt: new Date('2026-01-01'),
        },
      ]);

      const results = await service.getHistory('user-123', 10);

      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('analysis-1');
      expect(results[0]!.elements.mainSubject).toBe('Person');

      // Verify cache was used with proper key and TTL
      expect(mockCache.getOrSet).toHaveBeenCalledWith(
        'vision:history:user-123:10',
        expect.any(Function),
        300
      );

      // Verify Prisma query
      expect(mockPrisma.visionAnalysis.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });
  });
});
