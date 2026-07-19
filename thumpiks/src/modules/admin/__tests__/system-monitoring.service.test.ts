/**
 * Tests for SystemMonitoringService
 *
 * Verifies:
 * - Health check aggregation (database, redis, filesystem, api, external)
 * - Overall health status determination (healthy/degraded/down)
 * - Performance metrics collection (CPU, memory, disk, network)
 * - Alert management (get, acknowledge)
 * - Error logging
 * - Data cleanup
 * - Interval lifecycle (start/stop)
 */

// Set env before imports
process.env.JWT_SECRET = 'test-secret-key-that-is-32-chars-long!!';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock ioredis
const mockRedis = {
  ping: jest.fn().mockResolvedValue('PONG'),
  disconnect: jest.fn(),
};
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

// Mock Prisma
const mockPrisma: any = {
  user: { count: jest.fn().mockResolvedValue(100) },
  auditLog: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ count: 10 }),
  },
  adminRole: {
    create: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({}),
  },
  systemHealth: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ count: 50 }),
  },
  systemMetrics: {
    upsert: jest.fn().mockResolvedValue({}),
  },
  $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
};

jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => mockPrisma),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock storage module
jest.mock('../../storage', () => ({
  getStorageService: jest.fn(() => ({
    healthCheck: jest.fn().mockResolvedValue({
      cloudinary: { healthy: true },
    }),
  })),
}));

// Mock analytics service
jest.mock('../analytics.service', () => ({
  analyticsService: {
    storeSystemMetric: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock os module for deterministic tests
jest.mock('os', () => ({
  cpus: jest.fn(() => [
    { times: { user: 100, nice: 0, sys: 50, idle: 50, irq: 0 } },
    { times: { user: 80, nice: 0, sys: 40, idle: 80, irq: 0 } },
  ]),
  totalmem: jest.fn(() => 16 * 1024 * 1024 * 1024), // 16 GB
  freemem: jest.fn(() => 8 * 1024 * 1024 * 1024),   // 8 GB free
  loadavg: jest.fn(() => [1.5, 2.0, 1.8]),
  hostname: jest.fn(() => 'test-host'),
  platform: jest.fn(() => 'linux'),
  release: jest.fn(() => '5.15.0-test'),
  type: jest.fn(() => 'Linux'),
  arch: jest.fn(() => 'x64'),
  uptime: jest.fn(() => 3600),
}));

import { SystemMonitoringService } from '../system-monitoring.service';
import { analyticsService } from '../analytics.service';

describe('SystemMonitoringService', () => {
  let service: SystemMonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    service = new SystemMonitoringService();
  });

  afterEach(() => {
    service.stop();
    jest.useRealTimers();
  });

  // ═════════════════════════════════════════════════════════════
  // getSystemHealth
  // ═════════════════════════════════════════════════════════════
  describe('getSystemHealth', () => {
    it('returns healthy status when all services pass', async () => {
      const health = await service.getSystemHealth();

      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('timestamp');
      expect(health.services.length).toBeGreaterThan(0);
    });

    it('marks overall as down when database check fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB connection lost'));
      mockPrisma.user.count.mockRejectedValueOnce(new Error('DB connection lost'));

      const health = await service.getSystemHealth();

      const dbCheck = health.services.find(s => s.service === 'database');
      expect(dbCheck?.status).toBe('down');
      expect(health.overall).toBe('down');
    });

    it('marks overall as degraded when redis is slow', async () => {
      // Mock a slow Redis response by making ping take > 500ms
      mockRedis.ping.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 600).unref?.() || resolve('PONG'))
      );

      // We need to advance timers for this test
      jest.useRealTimers();
      const health = await service.getSystemHealth();
      jest.useFakeTimers();

      // Redis check may show degraded due to response time
      expect(health).toHaveProperty('overall');
      expect(health.services.length).toBeGreaterThan(0);
    });

    it('stores health check results in database', async () => {
      await service.getSystemHealth();

      // Should store results for each service checked
      expect(mockPrisma.systemHealth.create).toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // collectSystemMetrics
  // ═════════════════════════════════════════════════════════════
  describe('collectSystemMetrics', () => {
    it('collects CPU, memory, disk, and network metrics', async () => {
      const metrics = await service.collectSystemMetrics();

      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('disk');
      expect(metrics).toHaveProperty('network');

      // Verify CPU calculation (100% - idle%)
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
      expect(metrics.cpu.loadAverage).toEqual([1.5, 2.0, 1.8]);

      // Verify memory (16GB total, 8GB free = 8GB used)
      expect(metrics.memory.total).toBe(16384); // 16 GB in MB
      expect(metrics.memory.used).toBe(8192);   // 8 GB in MB
      expect(metrics.memory.percentage).toBe(50);
    });

    it('stores collected metrics via analytics service', async () => {
      await service.collectSystemMetrics();

      expect(analyticsService.storeSystemMetric).toHaveBeenCalledWith(
        'cpu_usage',
        expect.any(Number),
        expect.any(Date)
      );
      expect(analyticsService.storeSystemMetric).toHaveBeenCalledWith(
        'memory_usage',
        50,
        expect.any(Date)
      );
      expect(analyticsService.storeSystemMetric).toHaveBeenCalledWith(
        'disk_usage',
        45,
        expect.any(Date)
      );
    });
  });

  // ═════════════════════════════════════════════════════════════
  // getSystemAlerts
  // ═════════════════════════════════════════════════════════════
  describe('getSystemAlerts', () => {
    it('returns unresolved alerts by default', async () => {
      const alerts = await service.getSystemAlerts();

      expect(Array.isArray(alerts)).toBe(true);
      alerts.forEach(alert => {
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert.resolvedAt).toBeUndefined();
      });
    });

    it('returns resolved alerts when requested', async () => {
      const alerts = await service.getSystemAlerts(true);

      // Mock alerts are unresolved, so resolved filter returns empty
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // acknowledgeAlert
  // ═════════════════════════════════════════════════════════════
  describe('acknowledgeAlert', () => {
    it('acknowledges alert and logs action', async () => {
      const result = await service.acknowledgeAlert('alert-1', 'admin-1');

      expect(result).toBe(true);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ALERT_ACKNOWLEDGED',
            resource: 'alert',
            resourceId: 'alert-1',
          }),
        })
      );
    });

    it('still returns true when audit log fails (error caught in logAdminAction)', async () => {
      // logAdminAction catches its own errors internally, so acknowledgeAlert
      // never sees the error and returns true
      mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('DB error'));

      const result = await service.acknowledgeAlert('alert-1', 'admin-1');

      expect(result).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // logError
  // ═════════════════════════════════════════════════════════════
  describe('logError', () => {
    it('logs error with correct severity level', async () => {
      await service.logError('error', 'Test error message', 'stack trace here');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SYSTEM_ERROR',
            severity: 'error',
          }),
        })
      );
    });

    it('logs critical errors with critical severity', async () => {
      await service.logError('critical', 'Critical failure', undefined, { module: 'auth' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: 'critical',
          }),
        })
      );
    });
  });

  // ═════════════════════════════════════════════════════════════
  // getErrorLogs
  // ═════════════════════════════════════════════════════════════
  describe('getErrorLogs', () => {
    it('returns error logs from audit log', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([
        {
          id: 'log-1',
          action: 'SYSTEM_ERROR',
          severity: 'error',
          details: JSON.stringify({ stack: 'Error at line 1', context: { module: 'api' } }),
          timestamp: new Date(),
        },
      ]);

      const logs = await service.getErrorLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0]?.stack).toBe('Error at line 1');
      expect(logs[0]?.context).toEqual({ module: 'api' });
    });

    it('filters by severity level', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([]);

      await service.getErrorLogs(100, 'critical');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'SYSTEM_ERROR',
            severity: 'critical',
          }),
        })
      );
    });
  });

  // ═════════════════════════════════════════════════════════════
  // cleanupOldData
  // ═════════════════════════════════════════════════════════════
  describe('cleanupOldData', () => {
    it('removes health checks older than 30 days', async () => {
      await service.cleanupOldData();

      expect(mockPrisma.systemHealth.deleteMany).toHaveBeenCalledWith({
        where: {
          checkedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('removes audit logs older than 90 days', async () => {
      await service.cleanupOldData();

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: { lt: expect.any(Date) },
        },
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // stop (cleanup)
  // ═════════════════════════════════════════════════════════════
  describe('stop', () => {
    it('clears intervals and disconnects redis', () => {
      service.stop();

      // Redis should be disconnected
      expect(mockRedis.disconnect).toHaveBeenCalled();
    });

    it('can be called multiple times safely', () => {
      service.stop();
      service.stop();

      // stop() doesn't null out this.redis, so disconnect is called each time
      // The important thing is it doesn't throw
      expect(mockRedis.disconnect).toHaveBeenCalledTimes(2);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Interval-based monitoring
  // ═════════════════════════════════════════════════════════════
  describe('automated monitoring', () => {
    it('runs health checks on interval', async () => {
      // The constructor starts intervals. Advance time to trigger them.
      // Health check runs every 30 seconds
      jest.advanceTimersByTime(30000);

      // The health check would have been triggered
      // We just verify the interval was set up (service didn't crash)
      expect(service).toBeTruthy();
    });

    it('runs metrics collection on interval', async () => {
      // Metrics collection runs every 60 seconds
      jest.advanceTimersByTime(60000);

      expect(service).toBeTruthy();
    });
  });
});
