import { EmbeddingService } from '../embedding.service';
import { QdrantService } from '../qdrant.service';
import { VisualSearchService } from '../visual-search.service';

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

const mockPrisma: any = {
  thumbnail: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockCache: any = {
  get: jest.fn(),
  set: jest.fn(),
  getOrSet: jest.fn(),
};

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JINA_API_KEY = 'test-jina-key';
    process.env.JINA_API_URL = 'https://api.jina.ai/v1/embeddings';
    service = new EmbeddingService({ cache: mockCache });
  });

  afterEach(() => {
    delete process.env.JINA_API_KEY;
  });

  describe('embedImage', () => {
    it('should generate embedding from image URL', async () => {
      mockCache.get.mockResolvedValue(null);

      const mockVector = new Array(768).fill(0.1);
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ embedding: mockVector }],
        }),
      } as any);

      const result = await service.embedImage('https://example.com/img.jpg');

      expect(result.vector).toHaveLength(768);
      expect(result.dimensions).toBe(768);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.jina.ai/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-jina-key',
          }),
        })
      );

      // Verify body contains jina-clip-v2 model and image input
      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.model).toBe('jina-clip-v2');
      expect(callBody.input[0].image).toBe('https://example.com/img.jpg');

      // Verify caching (24h TTL)
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('embedding:image:'),
        result,
        86400
      );
    });

    it('should return cached embedding when available', async () => {
      const cached = { vector: new Array(768).fill(0.2), dimensions: 768 };
      mockCache.get.mockResolvedValue(cached);

      const result = await service.embedImage('https://example.com/cached.jpg');

      expect(result).toEqual(cached);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when Jina API key is missing', async () => {
      delete process.env.JINA_API_KEY;
      const noKeyService = new EmbeddingService({ cache: mockCache });

      await expect(
        noKeyService.embedImage('https://example.com/img.jpg')
      ).rejects.toThrow('Jina API key not configured');
    });

    it('should throw error on Jina API failure', async () => {
      mockCache.get.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limited'),
      } as any);

      await expect(
        service.embedImage('https://example.com/img.jpg')
      ).rejects.toThrow('Jina embedding failed (429): Rate limited');
    });
  });

  describe('embedText', () => {
    it('should generate embedding from text', async () => {
      mockCache.get.mockResolvedValue(null);

      const mockVector = new Array(768).fill(0.3);
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ embedding: mockVector }],
        }),
      } as any);

      const result = await service.embedText('gaming thumbnail');

      expect(result.vector).toHaveLength(768);

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as any).body);
      expect(callBody.input[0].text).toBe('gaming thumbnail');

      // Text cache is 1 hour
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('embedding:text:'),
        result,
        3600
      );
    });
  });
});

describe('QdrantService', () => {
  let service: QdrantService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.QDRANT_URL = 'http://localhost:6333';
    service = new QdrantService();
  });

  describe('ensureCollection', () => {
    it('should skip creation if collection exists', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as any);

      await service.ensureCollection();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/thumbnails',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should create collection if not exists', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false } as any) // Check returns 404
        .mockResolvedValueOnce({ ok: true } as any); // Create succeeds

      await service.ensureCollection();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const createCall = mockFetch.mock.calls[1]!;
      const body = JSON.parse((createCall[1] as any).body);
      expect(body.vectors.size).toBe(768);
      expect(body.vectors.distance).toBe('Cosine');
    });
  });

  describe('search', () => {
    it('should return similarity matches', async () => {
      const mockResults = {
        result: [
          {
            id: 'point-1',
            score: 0.95,
            payload: {
              thumbnailId: 'thumb-1',
              imageUrl: 'https://example.com/img1.jpg',
              title: 'Test Thumbnail',
              userId: 'user-1',
            },
          },
          {
            id: 'point-2',
            score: 0.82,
            payload: {
              thumbnailId: 'thumb-2',
              imageUrl: 'https://example.com/img2.jpg',
              title: 'Another Thumbnail',
              userId: 'user-2',
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResults),
      } as any);

      const vector = new Array(768).fill(0.1);
      const results = await service.search(vector, 20, 0.5);

      expect(results).toHaveLength(2);
      expect(results[0]!.score).toBe(0.95);
      expect(results[0]!.thumbnailId).toBe('thumb-1');
      expect(results[1]!.score).toBe(0.82);
    });
  });

  describe('healthCheck', () => {
    it('should return true when Qdrant is available', async () => {
      mockFetch.mockResolvedValue({ ok: true } as any);
      expect(await service.healthCheck()).toBe(true);
    });

    it('should return false when Qdrant is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));
      expect(await service.healthCheck()).toBe(false);
    });
  });
});

describe('VisualSearchService', () => {
  let service: VisualSearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JINA_API_KEY = 'test-jina-key';
    process.env.QDRANT_URL = 'http://localhost:6333';

    service = new VisualSearchService({
      prisma: mockPrisma,
      cache: mockCache,
    });
  });

  afterEach(() => {
    delete process.env.JINA_API_KEY;
  });

  describe('searchByImage', () => {
    it('should embed image and search Qdrant', async () => {
      const mockVector = new Array(768).fill(0.1);

      // ensureCollection check
      mockFetch.mockResolvedValueOnce({ ok: true } as any);

      // embedImage - cache miss then Jina API
      mockCache.get.mockResolvedValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ embedding: mockVector }],
        }),
      } as any);

      // Qdrant search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          result: [
            {
              id: 'p1',
              score: 0.9,
              payload: {
                thumbnailId: 't1',
                imageUrl: 'https://example.com/match.jpg',
                title: 'Match',
                userId: 'u1',
              },
            },
          ],
        }),
      } as any);

      const result = await service.searchByImage('https://example.com/query.jpg');

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]!.score).toBe(0.9);
      expect(result.total).toBe(1);
      expect(result.query.imageUrl).toBe('https://example.com/query.jpg');
    });
  });

  describe('indexThumbnail', () => {
    it('should fetch thumbnail, embed, and upsert to Qdrant', async () => {
      const mockVector = new Array(768).fill(0.1);

      // ensureCollection
      mockFetch.mockResolvedValueOnce({ ok: true } as any);

      mockPrisma.thumbnail.findUnique.mockResolvedValue({
        id: 'thumb-1',
        imageUrl: 'https://example.com/thumb.jpg',
        title: 'My Thumbnail',
        userId: 'user-1',
      });

      // embedImage
      mockCache.get.mockResolvedValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ embedding: mockVector }],
        }),
      } as any);

      // Qdrant upsert
      mockFetch.mockResolvedValueOnce({ ok: true } as any);

      await service.indexThumbnail('thumb-1');

      expect(mockPrisma.thumbnail.findUnique).toHaveBeenCalledWith({
        where: { id: 'thumb-1' },
      });

      // Verify Qdrant upsert was called
      const upsertCall = mockFetch.mock.calls[2]!; // 3rd fetch call
      expect((upsertCall[0] as string)).toContain('/collections/thumbnails/points');
    });

    it('should throw when thumbnail not found', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as any); // ensureCollection
      mockPrisma.thumbnail.findUnique.mockResolvedValue(null);

      await expect(service.indexThumbnail('nonexistent')).rejects.toThrow(
        'Thumbnail not found: nonexistent'
      );
    });
  });
});
