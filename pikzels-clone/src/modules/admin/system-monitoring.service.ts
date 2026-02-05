import { analyticsService } from './analytics.service';
import { adminAuthService } from './admin-auth.service';
import { getPrisma } from '../../utils/prisma-factory';
import Redis from 'ioredis';
import os from 'os';

const prisma = getPrisma();

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  errorMessage?: string;
  lastChecked: Date;
  details?: any;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down';
  services: HealthCheck[];
  uptime: number;
  timestamp: Date;
}

export interface PerformanceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

export interface ErrorLog {
  id: string;
  level: 'error' | 'warning' | 'critical';
  message: string;
  stack?: string;
  context?: any;
  timestamp: Date;
  resolved: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  threshold: number;
  condition: 'greater_than' | 'less_than' | 'equals';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  lastTriggered?: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  value: number;
  threshold: number;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledged: boolean;
}

export class SystemMonitoringService {
  private redis?: Redis;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCollectionInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeRedis();
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  private async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
      }
    } catch (error) {
      console.error('Redis initialization failed:', error);
    }
  }

  /**
   * Start automated health checks
   */
  private startHealthChecks() {
    // Run health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.runHealthChecks();
      } catch (error) {
        console.error('Health check error:', error);
      }
    }, 30000);
  }

  /**
   * Start performance metrics collection
   */
  private startMetricsCollection() {
    // Collect metrics every 60 seconds
    this.metricsCollectionInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        console.error('Metrics collection error:', error);
      }
    }, 60000);
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const services = await this.runHealthChecks();

      // Determine overall health
      const downServices = services.filter(s => s.status === 'down').length;
      const degradedServices = services.filter(
        s => s.status === 'degraded'
      ).length;

      let overall: 'healthy' | 'degraded' | 'down';
      if (downServices > 0) {
        overall = 'down';
      } else if (degradedServices > 0) {
        overall = 'degraded';
      } else {
        overall = 'healthy';
      }

      return {
        overall,
        services,
        uptime: process.uptime(),
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      throw error;
    }
  }

  /**
   * Run all health checks
   */
  private async runHealthChecks(): Promise<HealthCheck[]> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkFileSystem(),
      this.checkAPI(),
      this.checkExternalServices(),
    ]);

    const serviceNames = ['database', 'redis', 'filesystem', 'api', 'external'];

    const services: HealthCheck[] = checks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          service: serviceNames[index]!,
          status: 'down' as const,
          errorMessage: result.reason?.message || 'Unknown error',
          lastChecked: new Date(),
        };
      }
    });

    // Store health check results
    await Promise.allSettled(
      services.map(service => this.storeHealthCheck(service))
    );

    return services;
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      // Test query performance
      const userCount = await prisma.user.count();

      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (responseTime > 1000) {
        status = 'degraded';
      } else if (responseTime > 5000) {
        status = 'down';
      }

      return {
        service: 'database',
        status,
        responseTime,
        lastChecked: new Date(),
        details: {
          userCount,
          connectionPool: 'healthy',
        },
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'down',
        responseTime: Date.now() - startTime,
        errorMessage:
          error instanceof Error ? error.message : 'Database connection failed',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      if (!this.redis) {
        return {
          service: 'redis',
          status: 'down',
          errorMessage: 'Redis not configured',
          lastChecked: new Date(),
        };
      }

      await this.redis.ping();
      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (responseTime > 500) {
        status = 'degraded';
      }

      return {
        service: 'redis',
        status,
        responseTime,
        lastChecked: new Date(),
        details: {
          memory: 'usage-info', // Mock Redis memory info
          connectedClients: 'client-list', // Mock client list
        },
      };
    } catch (error) {
      return {
        service: 'redis',
        status: 'down',
        responseTime: Date.now() - startTime,
        errorMessage:
          error instanceof Error ? error.message : 'Redis connection failed',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check file system health
   */
  private async checkFileSystem(): Promise<HealthCheck> {
    try {
      const diskUsage = await this.getDiskUsage();

      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (diskUsage.percentage > 90) {
        status = 'down';
      } else if (diskUsage.percentage > 80) {
        status = 'degraded';
      }

      return {
        service: 'filesystem',
        status,
        lastChecked: new Date(),
        details: {
          diskUsage: diskUsage.percentage,
          totalSpace: diskUsage.total,
          freeSpace: diskUsage.total - diskUsage.used,
        },
      };
    } catch (error) {
      return {
        service: 'filesystem',
        status: 'down',
        errorMessage:
          error instanceof Error ? error.message : 'File system check failed',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check API health
   */
  private async checkAPI(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Mock API health check - would test actual endpoints
      const responseTime = Date.now() - startTime;

      return {
        service: 'api',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
        details: {
          endpoints: ['auth', 'users', 'thumbnails', 'analytics'],
          averageResponseTime: responseTime,
        },
      };
    } catch (error) {
      return {
        service: 'api',
        status: 'down',
        responseTime: Date.now() - startTime,
        errorMessage:
          error instanceof Error ? error.message : 'API health check failed',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check external services
   */
  private async checkExternalServices(): Promise<HealthCheck> {
    try {
      // Mock external service checks (would check actual external APIs)
      return {
        service: 'external',
        status: 'healthy',
        lastChecked: new Date(),
        details: {
          cloudinary: 'healthy',
          email: 'healthy',
          oauth: 'healthy',
        },
      };
    } catch (error) {
      return {
        service: 'external',
        status: 'degraded',
        errorMessage:
          error instanceof Error
            ? error.message
            : 'External service check failed',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Store health check result
   */
  private async storeHealthCheck(healthCheck: HealthCheck): Promise<void> {
    try {
      await prisma.systemHealth.create({
        data: {
          service: healthCheck.service,
          status: healthCheck.status,
          response: healthCheck.responseTime || null,
          errorRate:
            healthCheck.status === 'down'
              ? 100
              : healthCheck.status === 'degraded'
                ? 50
                : 0,
          ...(healthCheck.details && {
            details: JSON.stringify(healthCheck.details),
          }),
          checkedAt: healthCheck.lastChecked,
        },
      });
    } catch (error) {
      console.error('Error storing health check:', error);
    }
  }

  /**
   * Collect system performance metrics
   */
  async collectSystemMetrics(): Promise<PerformanceMetrics> {
    try {
      const metrics: PerformanceMetrics = {
        cpu: {
          usage: this.getCpuUsage(),
          loadAverage: os.loadavg(),
        },
        memory: this.getMemoryUsage(),
        disk: await this.getDiskUsage(),
        network: this.getNetworkUsage(),
      };

      // Store metrics in database
      await this.storePerformanceMetrics(metrics);

      return metrics;
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      throw error;
    }
  }

  /**
   * Get CPU usage percentage
   */
  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - Math.floor((totalIdle / totalTick) * 100);
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): PerformanceMetrics['memory'] {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    return {
      used: Math.floor(used / 1024 / 1024), // MB
      total: Math.floor(total / 1024 / 1024), // MB
      percentage: Math.floor((used / total) * 100),
    };
  }

  /**
   * Get disk usage
   */
  private async getDiskUsage(): Promise<PerformanceMetrics['disk']> {
    try {
      // Mock disk usage - would use actual disk space checking
      return {
        used: 45000, // MB
        total: 100000, // MB
        percentage: 45,
      };
    } catch (error) {
      return {
        used: 0,
        total: 0,
        percentage: 0,
      };
    }
  }

  /**
   * Get network usage
   */
  private getNetworkUsage(): PerformanceMetrics['network'] {
    // Mock network usage - would track actual network stats
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 1000000),
    };
  }

  /**
   * Store performance metrics
   */
  private async storePerformanceMetrics(
    metrics: PerformanceMetrics
  ): Promise<void> {
    try {
      const now = new Date();

      await Promise.all([
        analyticsService.storeSystemMetric('cpu_usage', metrics.cpu.usage, now),
        analyticsService.storeSystemMetric(
          'memory_usage',
          metrics.memory.percentage,
          now
        ),
        analyticsService.storeSystemMetric(
          'disk_usage',
          metrics.disk.percentage,
          now
        ),
        analyticsService.storeSystemMetric(
          'network_in',
          metrics.network.bytesIn,
          now
        ),
        analyticsService.storeSystemMetric(
          'network_out',
          metrics.network.bytesOut,
          now
        ),
      ]);
    } catch (error) {
      console.error('Error storing performance metrics:', error);
    }
  }

  /**
   * Log system error
   */
  async logError(
    level: 'error' | 'warning' | 'critical',
    message: string,
    stack?: string,
    context?: any
  ): Promise<void> {
    try {
      // Store in audit log
      await adminAuthService.logAdminAction(
        null,
        'SYSTEM_ERROR',
        'system',
        null,
        {
          level,
          message,
          stack,
          context,
        },
        level === 'critical'
          ? 'critical'
          : level === 'error'
            ? 'error'
            : 'warning'
      );

      // Log to console based on level
      if (level === 'error') {
        console.error(`[${level.toUpperCase()}] ${message}`, {
          stack,
          context,
        });
      } else if (level === 'warning') {
        console.warn(`[${level.toUpperCase()}] ${message}`, { stack, context });
      } else {
        console.error(`[${level.toUpperCase()}] ${message}`, {
          stack,
          context,
        });
      }
    } catch (error) {
      console.error('Error logging system error:', error);
    }
  }

  /**
   * Get system alerts
   */
  async getSystemAlerts(resolved: boolean = false): Promise<Alert[]> {
    try {
      // Mock alerts - would implement actual alert system
      const mockAlerts: Alert[] = [
        {
          id: '1',
          ruleId: 'cpu-high',
          ruleName: 'High CPU Usage',
          message: 'CPU usage exceeded 80%',
          severity: 'high',
          value: 85,
          threshold: 80,
          triggeredAt: new Date(Date.now() - 1000 * 60 * 10),
          acknowledged: false,
        },
      ];

      return mockAlerts.filter(alert =>
        resolved ? !!alert.resolvedAt : !alert.resolvedAt
      );
    } catch (error) {
      console.error('Error getting system alerts:', error);
      throw error;
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, adminId: string): Promise<boolean> {
    try {
      // Mock acknowledgment - would update actual alert record
      await adminAuthService.logAdminAction(
        adminId,
        'ALERT_ACKNOWLEDGED',
        'alert',
        alertId,
        { acknowledgedAt: new Date() }
      );

      return true;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }
  }

  /**
   * Get error logs
   */
  async getErrorLogs(
    limit: number = 100,
    level?: 'error' | 'warning' | 'critical'
  ): Promise<ErrorLog[]> {
    try {
      const where: any = {
        action: 'SYSTEM_ERROR',
      };

      if (level) {
        where.severity = level;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return logs.map(log => ({
        id: log.id,
        level: log.severity as 'error' | 'warning' | 'critical',
        message: log.action,
        stack: log.details
          ? JSON.parse(log.details as string).stack
          : undefined,
        context: log.details
          ? JSON.parse(log.details as string).context
          : undefined,
        timestamp: log.timestamp,
        resolved: false, // Would track resolution status
      }));
    } catch (error) {
      console.error('Error getting error logs:', error);
      throw error;
    }
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Clean old health checks (keep 30 days)
      await prisma.systemHealth.deleteMany({
        where: {
          checkedAt: { lt: thirtyDaysAgo },
        },
      });

      // Clean old audit logs (keep 90 days)
      await prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: ninetyDaysAgo },
        },
      });

      console.log('Old monitoring data cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  /**
   * Stop monitoring services
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

export const systemMonitoringService = new SystemMonitoringService();
