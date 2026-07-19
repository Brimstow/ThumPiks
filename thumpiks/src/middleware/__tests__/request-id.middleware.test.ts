import {
  getRequestId,
  runWithRequestContext,
} from '../../utils/request-context';

// Mock crypto.randomUUID to return predictable values
const mockUUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => mockUUID),
}));

import { requestIdMiddleware } from '../request-id.middleware';

describe('requestIdMiddleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('generates a UUID when no X-Request-Id header is present', () => {
    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.id).toBe(mockUUID);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', mockUUID);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('respects an incoming X-Request-Id header', () => {
    mockReq.headers = { 'x-request-id': 'external-trace-abc' };

    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.id).toBe('external-trace-abc');
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'X-Request-Id',
      'external-trace-abc'
    );
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('generates a new UUID when X-Request-Id header is an empty string', () => {
    mockReq.headers = { 'x-request-id': '' };

    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.id).toBe(mockUUID);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', mockUUID);
  });

  it('uses the first element when X-Request-Id header is an array', () => {
    mockReq.headers = { 'x-request-id': ['first-id', 'second-id'] };

    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.id).toBe('first-id');
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', 'first-id');
  });

  it('generates a new UUID when array header contains empty strings', () => {
    mockReq.headers = { 'x-request-id': ['', ''] };

    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.id).toBe(mockUUID);
  });

  it('propagates request context via AsyncLocalStorage', () => {
    let capturedRequestId: string | undefined;

    mockNext = jest.fn(() => {
      capturedRequestId = getRequestId();
    });

    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(capturedRequestId).toBe(mockUUID);
  });

  it('propagates incoming header through AsyncLocalStorage', () => {
    mockReq.headers = { 'x-request-id': 'propagated-id' };
    let capturedRequestId: string | undefined;

    mockNext = jest.fn(() => {
      capturedRequestId = getRequestId();
    });

    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(capturedRequestId).toBe('propagated-id');
  });
});

describe('request-context utilities', () => {
  it('getRequestId returns undefined outside request context', () => {
    expect(getRequestId()).toBeUndefined();
  });

  it('runWithRequestContext provides context to inner function', () => {
    const context = { requestId: 'test-ctx-id', startTime: Date.now() };
    const result = runWithRequestContext(context, () => {
      return getRequestId();
    });
    expect(result).toBe('test-ctx-id');
  });

  it('nested contexts use the innermost value', () => {
    const outer = { requestId: 'outer-id', startTime: Date.now() };
    const inner = { requestId: 'inner-id', startTime: Date.now() };

    runWithRequestContext(outer, () => {
      expect(getRequestId()).toBe('outer-id');

      runWithRequestContext(inner, () => {
        expect(getRequestId()).toBe('inner-id');
      });

      // Back to outer
      expect(getRequestId()).toBe('outer-id');
    });
  });
});
