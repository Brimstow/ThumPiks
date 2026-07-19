import { publicPost } from '../api';

// Mock the config
jest.mock('../../config/environment', () => ({
  __esModule: true,
  default: {
    apiBaseUrl: 'http://localhost:8550',
  },
}));

describe('API Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publicPost', () => {
    it('should make POST request with JSON body', async () => {
      const mockResponse = { message: 'Success' };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await publicPost('/api/test', { email: 'test@example.com' });

      expect(fetch).toHaveBeenCalledWith('http://localhost:8550/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      expect(result.ok).toBe(true);
    });

    it('should handle relative endpoint paths', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await publicPost('/api/auth/request-password-reset', { email: 'user@test.com' });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8550/api/auth/request-password-reset',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'user@test.com' }),
        })
      );
    });

    it('should handle absolute URLs', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await publicPost('https://api.external.com/endpoint', { data: 'test' });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.external.com/endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      );
    });

    it('should return response object for caller to handle', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await publicPost('/api/test', { invalid: 'data' });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
    });
  });
});
