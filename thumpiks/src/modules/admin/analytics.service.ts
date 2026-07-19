import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

const prisma = getPrisma();

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface MetricPoint {
  date: string;
  value: number;
  change?: number;
  changePercent?: number;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  userGrowth: MetricPoint[];
  userActivity: MetricPoint[];
  topUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    thumbnailCount: number;
    projectCount: number;
    lastLoginAt: Date | null;
  }>;
}

export interface ContentMetrics {
  totalThumbnails: number;
  newThumbnails: number;
  totalProjects: number;
  newProjects: number;
  totalTemplates: number;
  popularTemplates: Array<{
    id: string;
    name: string;
    downloads: number;
    likes: number;
    creator: string;
  }>;
  contentGrowth: MetricPoint[];
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: MetricPoint[];
  subscriptionBreakdown: Array<{
    planType: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  averageRevenuePerUser: number;
  churnRate: number;
}

export interface SystemMetrics {
  apiResponseTime: MetricPoint[];
  errorRate: MetricPoint[];
  uptime: number;
  storageUsed: number;
  bandwidthUsed: number;
  activeConnections: number;
  databasePerformance: {
    queryTime: number;
    connectionPool: number;
    slowQueries: number;
  };
}

export interface AnalyticsOverview {
  userMetrics: UserMetrics;
  contentMetrics: ContentMetrics;
  revenueMetrics: RevenueMetrics;
  systemMetrics: SystemMetrics;
  lastUpdated: Date;
}

export class AnalyticsService {
  /**
   * Get comprehensive analytics overview
   */
  async getAnalyticsOverview(dateRange: DateRange): Promise<AnalyticsOverview> {
    try {
      const [userMetrics, contentMetrics, revenueMetrics, systemMetrics] =
        await Promise.all([
          this.getUserMetrics(dateRange),
          this.getContentMetrics(dateRange),
          this.getRevenueMetrics(dateRange),
          this.getSystemMetrics(dateRange),
        ]);

      return {
        userMetrics,
        contentMetrics,
        revenueMetrics,
        systemMetrics,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error('Error getting analytics overview', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get user-related metrics
   */
  async getUserMetrics(dateRange: DateRange): Promise<UserMetrics> {
    try {
      const { startDate, endDate } = dateRange;

      // Calculate period lengths
      const currentPeriodDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const previousPeriodStart = new Date(
        startDate.getTime() - currentPeriodDays * 24 * 60 * 60 * 1000
      );

      // Get basic user counts
      const [totalUsers, activeUsers, newUsers, , userGrowthData, topUsers] =
        await Promise.all([
          prisma.user.count(),
          prisma.user.count({
            where: {
              isActive: true,
              lastLoginAt: { gte: startDate },
            },
          }),
          prisma.user.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
          }),
          prisma.user.count({
            where: {
              createdAt: { gte: previousPeriodStart, lt: startDate },
            },
          }),
          this.getUserGrowthData(dateRange),
          this.getTopUsers(10),
        ]);

      // Calculate retention rate (simplified)
      const retentionRate =
        activeUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

      // Generate user activity data
      const userActivity = await this.getUserActivityData(dateRange);

      return {
        totalUsers,
        activeUsers,
        newUsers,
        retentionRate,
        userGrowth: userGrowthData,
        userActivity,
        topUsers,
      };
    } catch (error) {
      logger.error('Error getting user metrics', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get content-related metrics
   */
  async getContentMetrics(dateRange: DateRange): Promise<ContentMetrics> {
    try {
      const { startDate, endDate } = dateRange;

      const [
        totalThumbnails,
        newThumbnails,
        totalProjects,
        newProjects,
        totalTemplates,
        popularTemplates,
        contentGrowthData,
      ] = await Promise.all([
        prisma.thumbnail.count(),
        prisma.thumbnail.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.project.count(),
        prisma.project.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.template.count(),
        this.getPopularTemplates(10),
        this.getContentGrowthData(dateRange),
      ]);

      // Mock category distribution (would be real data in production)
      const categoryDistribution = [
        {
          category: 'YouTube Thumbnails',
          count: Math.floor(totalThumbnails * 0.45),
          percentage: 45,
        },
        {
          category: 'Social Media',
          count: Math.floor(totalThumbnails * 0.25),
          percentage: 25,
        },
        {
          category: 'Blog Headers',
          count: Math.floor(totalThumbnails * 0.15),
          percentage: 15,
        },
        {
          category: 'Presentations',
          count: Math.floor(totalThumbnails * 0.1),
          percentage: 10,
        },
        {
          category: 'Other',
          count: Math.floor(totalThumbnails * 0.05),
          percentage: 5,
        },
      ];

      return {
        totalThumbnails,
        newThumbnails,
        totalProjects,
        newProjects,
        totalTemplates,
        popularTemplates,
        contentGrowth: contentGrowthData,
        categoryDistribution,
      };
    } catch (error) {
      logger.error('Error getting content metrics', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get revenue-related metrics
   */
  async getRevenueMetrics(dateRange: DateRange): Promise<RevenueMetrics> {
    try {
      const { startDate, endDate } = dateRange;

      // Get subscription data
      const subscriptions = await prisma.subscription.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          User: {
            select: { email: true },
          },
        },
      });

      // Calculate revenue metrics (simplified - would use actual payment data)
      const subscriptionBreakdown =
        this.calculateSubscriptionBreakdown(subscriptions);
      const totalRevenue = subscriptionBreakdown.reduce(
        (sum, plan) => sum + plan.revenue,
        0
      );
      const totalUsers = await prisma.user.count();
      const averageRevenuePerUser =
        totalUsers > 0 ? totalRevenue / totalUsers : 0;

      // Mock revenue growth data
      const revenueGrowth = await this.getRevenueGrowthData(dateRange);

      return {
        totalRevenue,
        monthlyRevenue: totalRevenue, // Simplified
        revenueGrowth,
        subscriptionBreakdown,
        averageRevenuePerUser,
        churnRate: 5.2, // Mock churn rate
      };
    } catch (error) {
      logger.error('Error getting revenue metrics', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get system performance metrics
   */
  async getSystemMetrics(dateRange: DateRange): Promise<SystemMetrics> {
    try {
      // Get system health data
      const systemHealthData = await prisma.systemHealth.findMany({
        where: {
          checkedAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
        orderBy: { checkedAt: 'desc' },
        take: 100,
      });

      // Process system metrics
      const apiResponseTime = this.processSystemHealthMetrics(
        systemHealthData,
        'response'
      );
      const errorRate = this.processSystemHealthMetrics(
        systemHealthData,
        'errorRate'
      );

      // Calculate uptime (simplified)
      const healthyChecks = systemHealthData.filter(
        h => h.status === 'healthy'
      ).length;
      const uptime =
        systemHealthData.length > 0
          ? (healthyChecks / systemHealthData.length) * 100
          : 100;

      return {
        apiResponseTime,
        errorRate,
        uptime,
        storageUsed: 2.4, // GB (mock)
        bandwidthUsed: 45.6, // GB (mock)
        activeConnections: 156, // Mock
        databasePerformance: {
          queryTime: 23.5, // ms (mock)
          connectionPool: 8, // Mock
          slowQueries: 2, // Mock
        },
      };
    } catch (error) {
      logger.error('Error getting system metrics', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Store system metrics
   */
  async storeSystemMetric(
    metricType: string,
    value: number,
    date: Date = new Date(),
    additionalData?: unknown
  ): Promise<void> {
    try {
      await prisma.systemMetrics.upsert({
        where: {
          metricType_metricDate: {
            metricType,
            metricDate: date,
          },
        },
        update: {
          metricValue: value,
          ...(additionalData !== undefined && {
            additionalData: JSON.stringify(additionalData),
          }),
        },
        create: {
          metricType,
          metricValue: value,
          metricDate: date,
          ...(additionalData !== undefined && {
            additionalData: JSON.stringify(additionalData),
          }),
        },
      });
    } catch (error) {
      logger.error('Error storing system metric', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get user activity audit logs
   */
  async getUserActivityLogs(
    limit: number = 100,
    offset: number = 0,
    userId?: string,
    dateRange?: DateRange
  ) {
    try {
      const where: Record<string, unknown> = {
        userId: { not: null },
      };

      if (userId) {
        where.userId = userId;
      }

      if (dateRange) {
        where.timestamp = {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        };
      }

      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          User_AuditLog_userIdToUser: {
            select: { email: true, name: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      return logs;
    } catch (error) {
      logger.error('Error getting user activity logs', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(
    format: 'csv' | 'json',
    dateRange: DateRange,
    sections: string[] = ['users', 'content', 'revenue', 'system']
  ): Promise<string> {
    try {
      const data: Record<string, unknown> = {};

      if (sections.includes('users')) {
        data.users = await this.getUserMetrics(dateRange);
      }

      if (sections.includes('content')) {
        data.content = await this.getContentMetrics(dateRange);
      }

      if (sections.includes('revenue')) {
        data.revenue = await this.getRevenueMetrics(dateRange);
      }

      if (sections.includes('system')) {
        data.system = await this.getSystemMetrics(dateRange);
      }

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else {
        // Convert to CSV format (simplified)
        return this.convertToCSV(data);
      }
    } catch (error) {
      logger.error('Error exporting analytics data', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  // Helper methods
  private async getUserGrowthData(
    dateRange: DateRange
  ): Promise<MetricPoint[]> {
    // Mock implementation - would query actual data
    const days = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const points: MetricPoint[] = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(
        dateRange.startDate.getTime() + i * 24 * 60 * 60 * 1000
      );
      points.push({
        date: date.toISOString().split('T')[0]!,
        value: Math.floor(Math.random() * 50) + 10,
        change: Math.floor(Math.random() * 20) - 10,
      });
    }

    return points;
  }

  private async getUserActivityData(
    dateRange: DateRange
  ): Promise<MetricPoint[]> {
    // Mock implementation
    const days = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const points: MetricPoint[] = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(
        dateRange.startDate.getTime() + i * 24 * 60 * 60 * 1000
      );
      points.push({
        date: date.toISOString().split('T')[0]!,
        value: Math.floor(Math.random() * 200) + 50,
      });
    }

    return points;
  }

  private async getTopUsers(limit: number) {
    return prisma.user
      .findMany({
        select: {
          id: true,
          email: true,
          name: true,
          lastLoginAt: true,
          _count: {
            select: {
              Thumbnail: true,
              Project: true,
            },
          },
        },
        orderBy: {
          Thumbnail: {
            _count: 'desc',
          },
        },
        take: limit,
      })
      .then(users =>
        users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          thumbnailCount: user._count.Thumbnail,
          projectCount: user._count.Project,
          lastLoginAt: user.lastLoginAt,
        }))
      );
  }

  private async getPopularTemplates(limit: number) {
    return prisma.template
      .findMany({
        select: {
          id: true,
          name: true,
          downloads: true,
          likes: true,
          creatorId: true,
        },
        orderBy: [{ downloads: 'desc' }, { likes: 'desc' }],
        take: limit,
      })
      .then(templates =>
        templates.map(template => ({
          id: template.id,
          name: template.name,
          downloads: template.downloads,
          likes: template.likes,
          creator: template.creatorId,
        }))
      );
  }

  private async getContentGrowthData(
    dateRange: DateRange
  ): Promise<MetricPoint[]> {
    // Mock implementation
    const days = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const points: MetricPoint[] = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(
        dateRange.startDate.getTime() + i * 24 * 60 * 60 * 1000
      );
      points.push({
        date: date.toISOString().split('T')[0]!,
        value: Math.floor(Math.random() * 100) + 20,
      });
    }

    return points;
  }

  private async getRevenueGrowthData(
    dateRange: DateRange
  ): Promise<MetricPoint[]> {
    // Mock implementation
    const days = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const points: MetricPoint[] = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(
        dateRange.startDate.getTime() + i * 24 * 60 * 60 * 1000
      );
      points.push({
        date: date.toISOString().split('T')[0]!,
        value: Math.floor(Math.random() * 1000) + 500,
      });
    }

    return points;
  }

  private calculateSubscriptionBreakdown(subscriptions: { planType: string; creditsBalance: number }[]): Array<{
    planType: string;
    count: number;
    revenue: number;
    percentage: number;
  }> {
    const breakdown = new Map<string, { count: number; revenue: number }>();

    subscriptions.forEach(sub => {
      const existing = breakdown.get(sub.planType) || { count: 0, revenue: 0 };
      breakdown.set(sub.planType, {
        count: existing.count + 1,
        revenue: existing.revenue + sub.creditsBalance * 0.01, // Mock pricing
      });
    });

    const total = Array.from(breakdown.values()).reduce(
      (sum, item) => sum + item.revenue,
      0
    );

    return Array.from(breakdown.entries()).map(([planType, data]) => ({
      planType,
      count: data.count,
      revenue: data.revenue,
      percentage: total > 0 ? (data.revenue / total) * 100 : 0,
    }));
  }

  private processSystemHealthMetrics(
    healthData: { checkedAt: Date; response?: number | null; errorRate?: number | null }[],
    metricType: string
  ): MetricPoint[] {
    // Group by date and calculate averages
    const dailyMetrics = new Map<string, number[]>();

    healthData.forEach(health => {
      const date = health.checkedAt.toISOString().split('T')[0];
      const value =
        metricType === 'response' ? health.response : health.errorRate;

      if (value !== null && value !== undefined && date !== undefined) {
        if (!dailyMetrics.has(date)) {
          dailyMetrics.set(date, []);
        }
        dailyMetrics.get(date)!.push(value);
      }
    });

    return Array.from(dailyMetrics.entries()).map(([date, values]) => ({
      date,
      value: values.reduce((sum, val) => sum + val, 0) / values.length,
    }));
  }

  private convertToCSV(data: Record<string, unknown>): string {
    // Simplified CSV conversion
    let csv = 'Type,Metric,Value,Date\n';

    Object.entries(data).forEach(([section, metrics]) => {
      if (metrics && typeof metrics === 'object') {
        Object.entries(metrics as Record<string, unknown>).forEach(([key, value]) => {
          if (typeof value === 'number') {
            csv += `${section},${key},${value},${new Date().toISOString()}\n`;
          }
        });
      }
    });

    return csv;
  }
}

export const analyticsService = new AnalyticsService();
