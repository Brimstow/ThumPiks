/**
 * NotificationConfig Controller Tests
 *
 * Tests the HTTP handler layer: request validation, response shapes,
 * and error handling. Uses mocked Express req/res objects.
 */

// ── Hoisted mocks ──

const mockService = {
  listAll: jest.fn(),
  getByKey: jest.fn(),
  upsert: jest.fn(),
  toggleEnabled: jest.fn(),
  deleteByKey: jest.fn(),
};

jest.mock('../notification-config.service', () => ({
  getNotificationConfigService: jest.fn(() => mockService),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──

import {
  listConfigs,
  getConfig,
  upsertConfig,
  toggleConfig,
  deleteConfig,
} from '../notification-config.controller';

// ── Helpers ──

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const NOW = new Date('2025-06-15T12:00:00Z');

function sampleConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cfg-1',
    key: 'feedback.submitted',
    channels: ['admin_panel'],
    emails: [],
    enabled: true,
    metadata: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ── Test Suite ──

describe('NotificationConfig Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────
  describe('listConfigs', () => {
    it('returns configs array on success', async () => {
      const configs = [sampleConfig()];
      mockService.listAll.mockResolvedValue(configs);

      const req = mockReq();
      const res = mockRes();

      await listConfigs(req, res);

      expect(res.json).toHaveBeenCalledWith({ configs });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 500 on service error', async () => {
      mockService.listAll.mockRejectedValue(new Error('DB down'));

      const req = mockReq();
      const res = mockRes();

      await listConfigs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to load notification configs',
      });
    });
  });

  // ────────────────────────────────────────────────────────
  describe('getConfig', () => {
    it('returns config when found', async () => {
      const config = sampleConfig();
      mockService.getByKey.mockResolvedValue(config);

      const req = mockReq({ params: { key: 'feedback.submitted' } });
      const res = mockRes();

      await getConfig(req, res);

      expect(res.json).toHaveBeenCalledWith({ config });
    });

    it('returns 404 when not found', async () => {
      mockService.getByKey.mockResolvedValue(null);

      const req = mockReq({ params: { key: 'unknown.event' } });
      const res = mockRes();

      await getConfig(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Config not found for key: unknown.event',
      });
    });
  });

  // ────────────────────────────────────────────────────────
  describe('upsertConfig', () => {
    it('upserts and returns config on valid input', async () => {
      const config = sampleConfig();
      mockService.upsert.mockResolvedValue(config);

      const req = mockReq({
        body: {
          key: 'feedback.submitted',
          channels: ['admin_panel'],
          emails: [],
          enabled: true,
        },
      });
      const res = mockRes();

      await upsertConfig(req, res);

      expect(mockService.upsert).toHaveBeenCalledWith({
        key: 'feedback.submitted',
        channels: ['admin_panel'],
        emails: [],
        enabled: true,
      });
      expect(res.json).toHaveBeenCalledWith({ config });
    });

    it('returns 400 when key is missing', async () => {
      const req = mockReq({ body: { channels: ['admin_panel'] } });
      const res = mockRes();

      await upsertConfig(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Event key is required' });
    });

    it('returns 400 on validation error from service', async () => {
      mockService.upsert.mockRejectedValue(new Error('Invalid channel: sms'));

      const req = mockReq({
        body: { key: 'test', channels: ['sms'], emails: [], enabled: true },
      });
      const res = mockRes();

      await upsertConfig(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid channel: sms' });
    });

    it('returns 500 on unexpected service error', async () => {
      mockService.upsert.mockRejectedValue(new Error('DB connection lost'));

      const req = mockReq({
        body: { key: 'test', channels: ['admin_panel'], emails: [], enabled: true },
      });
      const res = mockRes();

      await upsertConfig(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('defaults enabled to true when not provided', async () => {
      const config = sampleConfig();
      mockService.upsert.mockResolvedValue(config);

      const req = mockReq({
        body: { key: 'test', channels: ['admin_panel'], emails: [] },
      });
      const res = mockRes();

      await upsertConfig(req, res);

      expect(mockService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });
  });

  // ────────────────────────────────────────────────────────
  describe('toggleConfig', () => {
    it('toggles and returns updated config', async () => {
      const config = sampleConfig({ enabled: false });
      mockService.toggleEnabled.mockResolvedValue(config);

      const req = mockReq({
        params: { key: 'feedback.submitted' },
        body: { enabled: false },
      });
      const res = mockRes();

      await toggleConfig(req, res);

      expect(mockService.toggleEnabled).toHaveBeenCalledWith(
        'feedback.submitted',
        false
      );
      expect(res.json).toHaveBeenCalledWith({ config });
    });

    it('returns 400 when enabled is not a boolean', async () => {
      const req = mockReq({
        params: { key: 'test' },
        body: { enabled: 'yes' },
      });
      const res = mockRes();

      await toggleConfig(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'enabled must be a boolean',
      });
    });

    it('returns 404 when config not found (P2025)', async () => {
      const err: any = new Error('Not found');
      err.code = 'P2025';
      mockService.toggleEnabled.mockRejectedValue(err);

      const req = mockReq({
        params: { key: 'no-exist' },
        body: { enabled: true },
      });
      const res = mockRes();

      await toggleConfig(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Config not found' });
    });
  });

  // ────────────────────────────────────────────────────────
  describe('deleteConfig', () => {
    it('deletes and returns success', async () => {
      mockService.deleteByKey.mockResolvedValue(undefined);

      const req = mockReq({ params: { key: 'feedback.submitted' } });
      const res = mockRes();

      await deleteConfig(req, res);

      expect(mockService.deleteByKey).toHaveBeenCalledWith('feedback.submitted');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('returns 404 when config not found (P2025)', async () => {
      const err: any = new Error('Not found');
      err.code = 'P2025';
      mockService.deleteByKey.mockRejectedValue(err);

      const req = mockReq({ params: { key: 'no-exist' } });
      const res = mockRes();

      await deleteConfig(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on unexpected error', async () => {
      mockService.deleteByKey.mockRejectedValue(new Error('Boom'));

      const req = mockReq({ params: { key: 'test' } });
      const res = mockRes();

      await deleteConfig(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
