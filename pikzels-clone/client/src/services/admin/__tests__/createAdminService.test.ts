/**
 * Tests for createAdminService — Proxy-based auto-switch factory
 *
 * Verifies:
 * - Delegates to mock or real implementation based on shouldUseMockData()
 * - Evaluates shouldUseMockData() at call-time, not creation-time
 * - Correctly binds `this` for method calls
 * - Passes through non-function properties
 * - Handles async methods correctly
 */

// Mock adminApiClient.shouldUseMockData before importing
let mockShouldUseMock = true;
jest.mock('../adminApiClient', () => ({
  shouldUseMockData: jest.fn(() => mockShouldUseMock),
}));

import { createAdminService } from '../createAdminService';
import { shouldUseMockData } from '../adminApiClient';

describe('createAdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldUseMock = true;
  });

  describe('method delegation', () => {
    it('delegates to mock implementation when shouldUseMockData returns true', async () => {
      mockShouldUseMock = true;
      const realImpl = { getData: jest.fn().mockResolvedValue('real-data') };
      const mockImpl = { getData: jest.fn().mockResolvedValue('mock-data') };

      const service = createAdminService(realImpl, mockImpl);
      const result = await service.getData();

      expect(result).toBe('mock-data');
      expect(mockImpl.getData).toHaveBeenCalledTimes(1);
      expect(realImpl.getData).not.toHaveBeenCalled();
    });

    it('delegates to real implementation when shouldUseMockData returns false', async () => {
      mockShouldUseMock = false;
      const realImpl = { getData: jest.fn().mockResolvedValue('real-data') };
      const mockImpl = { getData: jest.fn().mockResolvedValue('mock-data') };

      const service = createAdminService(realImpl, mockImpl);
      const result = await service.getData();

      expect(result).toBe('real-data');
      expect(realImpl.getData).toHaveBeenCalledTimes(1);
      expect(mockImpl.getData).not.toHaveBeenCalled();
    });

    it('passes arguments correctly to the target implementation', async () => {
      mockShouldUseMock = true;
      const realImpl = { search: jest.fn() };
      const mockImpl = { search: jest.fn().mockResolvedValue([]) };

      const service = createAdminService(realImpl, mockImpl);
      await service.search('query', { page: 1, limit: 10 });

      expect(mockImpl.search).toHaveBeenCalledWith('query', { page: 1, limit: 10 });
    });
  });

  describe('call-time evaluation', () => {
    it('evaluates shouldUseMockData at call-time, not creation-time', async () => {
      const realImpl = { fetch: jest.fn().mockResolvedValue('real') };
      const mockImpl = { fetch: jest.fn().mockResolvedValue('mock') };

      // Create service while mock mode is ON
      mockShouldUseMock = true;
      const service = createAdminService(realImpl, mockImpl);

      // First call — should use mock
      const result1 = await service.fetch();
      expect(result1).toBe('mock');

      // Switch to real mode AFTER creation
      mockShouldUseMock = false;
      const result2 = await service.fetch();
      expect(result2).toBe('real');

      // Switch back
      mockShouldUseMock = true;
      const result3 = await service.fetch();
      expect(result3).toBe('mock');
    });

    it('calls shouldUseMockData on every method invocation', async () => {
      const realImpl = { ping: jest.fn() };
      const mockImpl = { ping: jest.fn() };
      const service = createAdminService(realImpl, mockImpl);

      await service.ping();
      await service.ping();
      await service.ping();

      expect(shouldUseMockData).toHaveBeenCalledTimes(3);
    });
  });

  describe('this binding', () => {
    it('correctly binds this context for methods that reference internal state', async () => {
      const realImpl = {
        _prefix: 'real',
        getName(this: { _prefix: string }) {
          return `${this._prefix}-service`;
        },
      };
      const mockImpl = {
        _prefix: 'mock',
        getName(this: { _prefix: string }) {
          return `${this._prefix}-service`;
        },
      };

      mockShouldUseMock = true;
      const service = createAdminService(realImpl, mockImpl);
      expect(service.getName()).toBe('mock-service');

      mockShouldUseMock = false;
      expect(service.getName()).toBe('real-service');
    });
  });

  describe('non-function properties', () => {
    it('returns non-function properties from the correct implementation', () => {
      const realImpl = { version: '2.0', getData: jest.fn() } as any;
      const mockImpl = { version: '1.0-mock', getData: jest.fn() } as any;

      mockShouldUseMock = true;
      const service = createAdminService(realImpl, mockImpl);
      expect(service.version).toBe('1.0-mock');

      mockShouldUseMock = false;
      expect(service.version).toBe('2.0');
    });
  });

  describe('async error handling', () => {
    it('propagates errors from mock implementation', async () => {
      mockShouldUseMock = true;
      const realImpl = { save: jest.fn().mockResolvedValue(true) };
      const mockImpl = { save: jest.fn().mockRejectedValue(new Error('Mock error')) };

      const service = createAdminService(realImpl, mockImpl);
      await expect(service.save()).rejects.toThrow('Mock error');
    });

    it('propagates errors from real implementation', async () => {
      mockShouldUseMock = false;
      const realImpl = { save: jest.fn().mockRejectedValue(new Error('Network error')) };
      const mockImpl = { save: jest.fn().mockResolvedValue(true) };

      const service = createAdminService(realImpl, mockImpl);
      await expect(service.save()).rejects.toThrow('Network error');
    });
  });

  describe('multiple methods', () => {
    it('proxies all methods from a multi-method service correctly', async () => {
      const realImpl = {
        getUsers: jest.fn().mockResolvedValue(['real-user']),
        createUser: jest.fn().mockResolvedValue({ id: 'real-1' }),
        deleteUser: jest.fn().mockResolvedValue(true),
      };
      const mockImpl = {
        getUsers: jest.fn().mockResolvedValue(['mock-user']),
        createUser: jest.fn().mockResolvedValue({ id: 'mock-1' }),
        deleteUser: jest.fn().mockResolvedValue(true),
      };

      mockShouldUseMock = true;
      const service = createAdminService(realImpl, mockImpl);

      expect(await service.getUsers()).toEqual(['mock-user']);
      expect(await service.createUser()).toEqual({ id: 'mock-1' });
      expect(await service.deleteUser()).toBe(true);

      expect(mockImpl.getUsers).toHaveBeenCalledTimes(1);
      expect(mockImpl.createUser).toHaveBeenCalledTimes(1);
      expect(mockImpl.deleteUser).toHaveBeenCalledTimes(1);

      // None of the real methods should have been called
      expect(realImpl.getUsers).not.toHaveBeenCalled();
      expect(realImpl.createUser).not.toHaveBeenCalled();
      expect(realImpl.deleteUser).not.toHaveBeenCalled();
    });
  });
});
