/**
 * Tests for adminAuthService — Admin Authentication Service
 *
 * Verifies:
 * - Login flow delegates correctly and handles side effects (setAdminToken, setAdminUser)
 * - Logout clears auth state
 * - getCurrentAdmin calls correct endpoint/mock
 * - Mock vs real delegation via proxy factory
 */

// Track localStorage calls
const mockLocalStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => mockLocalStorage[key] ?? null),
  setItem: jest.fn((key: string, value: string) => { mockLocalStorage[key] = value; }),
  removeItem: jest.fn((key: string) => { delete mockLocalStorage[key]; }),
  clear: jest.fn(() => { Object.keys(mockLocalStorage).forEach(k => delete mockLocalStorage[k]); }),
  get length() { return Object.keys(mockLocalStorage).length; },
  key: jest.fn((i: number) => Object.keys(mockLocalStorage)[i] ?? null),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock environment config
jest.mock('../../../config/environment', () => ({
  API_BASE_URL: 'http://localhost:8550',
  IS_DEVELOPMENT: true,
}));

// Control mock mode
let mockShouldUseMock = true;
jest.mock('../adminApiClient', () => {
  const actual: Record<string, unknown> = {};
  // Re-implement token management with our localStorage mock
  actual.shouldUseMockData = jest.fn(() => mockShouldUseMock);
  actual.getAdminToken = jest.fn(() => mockLocalStorage['adminToken'] ?? null);
  actual.setAdminToken = jest.fn((token: string) => { mockLocalStorage['adminToken'] = token; });
  actual.getAdminUser = jest.fn(() => {
    const raw = mockLocalStorage['adminUser'];
    return raw ? JSON.parse(raw) : null;
  });
  actual.setAdminUser = jest.fn((user: Record<string, unknown>) => {
    mockLocalStorage['adminUser'] = JSON.stringify(user);
  });
  actual.clearAdminAuth = jest.fn(() => {
    delete mockLocalStorage['adminToken'];
    delete mockLocalStorage['adminUser'];
  });
  actual.isAdminAuthenticated = jest.fn(() => !!mockLocalStorage['adminToken']);
  actual.adminApi = {
    get: jest.fn().mockResolvedValue({ success: true, data: {} }),
    post: jest.fn().mockResolvedValue({ success: true, data: {} }),
    put: jest.fn().mockResolvedValue({ success: true, data: {} }),
    delete: jest.fn().mockResolvedValue({ success: true, data: {} }),
  };
  actual.adminFetch = jest.fn().mockResolvedValue({ success: true, data: {} });
  return actual;
});

// Mock the mock data functions
jest.mock('../adminMockData', () => ({
  mockAdminLogin: jest.fn().mockResolvedValue({
    success: true,
    data: {
      token: 'mock-jwt-token',
      user: { id: 'mock-1', email: 'admin@mock.com', name: 'Mock Admin', roles: ['admin'], permissions: ['users.view'] },
    },
  }),
  mockAdminMe: jest.fn().mockResolvedValue({
    success: true,
    data: { id: 'mock-1', email: 'admin@mock.com', name: 'Mock Admin' },
  }),
}));

import { adminAuthService } from '../adminAuthService';
import { setAdminToken, setAdminUser, clearAdminAuth, adminApi } from '../adminApiClient';
import { mockAdminLogin, mockAdminMe } from '../adminMockData';

describe('adminAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorage).forEach(k => delete mockLocalStorage[k]);
    mockShouldUseMock = true;
  });

  describe('login (mock mode)', () => {
    it('calls mockAdminLogin and stores token/user on success', async () => {
      const result = await adminAuthService.login('admin@test.com', 'password123');

      expect(mockAdminLogin).toHaveBeenCalledWith('admin@test.com', 'password123');
      expect(result.success).toBe(true);
      expect(setAdminToken).toHaveBeenCalledWith('mock-jwt-token');
      expect(setAdminUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'admin@mock.com' })
      );
    });

    it('does not store token/user on failed login', async () => {
      (mockAdminLogin as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials',
      });

      const result = await adminAuthService.login('bad@test.com', 'wrong');

      expect(result.success).toBe(false);
      expect(setAdminToken).not.toHaveBeenCalled();
      expect(setAdminUser).not.toHaveBeenCalled();
    });
  });

  describe('login (real mode)', () => {
    it('calls adminApi.post for real login', async () => {
      mockShouldUseMock = false;
      (adminApi.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          token: 'real-jwt-token',
          user: { id: 'real-1', email: 'admin@real.com', name: 'Real Admin' },
        },
      });

      const result = await adminAuthService.login('admin@real.com', 'realpass');

      expect(adminApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@real.com',
        password: 'realpass',
      });
      expect(result.success).toBe(true);
      expect(setAdminToken).toHaveBeenCalledWith('real-jwt-token');
    });
  });

  describe('logout', () => {
    it('clears auth in mock mode', async () => {
      mockShouldUseMock = true;
      const result = await adminAuthService.logout();

      expect(result.success).toBe(true);
      expect(clearAdminAuth).toHaveBeenCalled();
    });

    it('calls API and clears auth in real mode', async () => {
      mockShouldUseMock = false;
      (adminApi.post as jest.Mock).mockResolvedValueOnce({ success: true });

      const result = await adminAuthService.logout();

      expect(adminApi.post).toHaveBeenCalledWith('/auth/logout');
      expect(clearAdminAuth).toHaveBeenCalled();
    });
  });

  describe('getCurrentAdmin', () => {
    it('calls mockAdminMe in mock mode', async () => {
      mockShouldUseMock = true;
      const result = await adminAuthService.getCurrentAdmin();

      expect(mockAdminMe).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('calls adminApi.get in real mode', async () => {
      mockShouldUseMock = false;
      (adminApi.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { id: 'real-1', email: 'admin@real.com' },
      });

      const result = await adminAuthService.getCurrentAdmin();

      expect(adminApi.get).toHaveBeenCalledWith('/auth/me');
      expect(result.success).toBe(true);
    });
  });
});
