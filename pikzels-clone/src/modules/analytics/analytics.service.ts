import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsService {
  async getUserAnalytics(userId: string) {
    // Get total thumbnails created by user
    const totalThumbnails = await prisma.thumbnail.count({
      where: { userId }
    });

    // Get total projects created by user
    const totalProjects = await prisma.project.count({
      where: { userId }
    });

    // Get thumbnails created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentThumbnails = await prisma.thumbnail.count({
      where: { 
        userId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Get thumbnail creation trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thumbnailTrend = await prisma.thumbnail.findMany({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group thumbnails by day for trend data
    const trendData: Record<string, number> = {};
    thumbnailTrend.forEach(thumbnail => {
      const date = thumbnail.createdAt.toISOString().split('T')[0];
      trendData[date] = (trendData[date] || 0) + 1;
    });

    // Get style distribution
    const thumbnailsWithStyles = await prisma.thumbnail.findMany({
      where: { userId },
      select: {
        parameters: true
      }
    });

    const styleDistribution: Record<string, number> = {
      bold: 0,
      minimalist: 0,
      dramatic: 0,
      other: 0
    };

    thumbnailsWithStyles.forEach(thumbnail => {
      if (typeof thumbnail.parameters === 'object' && thumbnail.parameters !== null) {
        const style = (thumbnail.parameters as any).style || 'other';
        if (style in styleDistribution) {
          styleDistribution[style]++;
        } else {
          styleDistribution.other++;
        }
      } else {
        styleDistribution.other++;
      }
    });

    // Get most used projects
    const projectUsage = await prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        thumbnails: {
          select: {
            id: true
          }
        }
      }
    });

    const projectData = projectUsage.map(project => ({
      id: project.id,
      name: project.name,
      thumbnailCount: project.thumbnails.length
    })).sort((a, b) => b.thumbnailCount - a.thumbnailCount);

    // Get hourly distribution of thumbnail creation
    const hourlyDistribution: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[`${i}:00`] = 0;
    }

    const allThumbnails = await prisma.thumbnail.findMany({
      where: { userId },
      select: {
        createdAt: true
      }
    });

    allThumbnails.forEach(thumbnail => {
      const hour = thumbnail.createdAt.getHours();
      hourlyDistribution[`${hour}:00`] = (hourlyDistribution[`${hour}:00`] || 0) + 1;
    });

    // Get day of week distribution
    const dayOfWeekDistribution: Record<string, number> = {
      'Sunday': 0,
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0
    };

    allThumbnails.forEach(thumbnail => {
      const day = thumbnail.createdAt.toLocaleDateString('en-US', { weekday: 'long' });
      dayOfWeekDistribution[day] = (dayOfWeekDistribution[day] || 0) + 1;
    });

    return {
      totals: {
        thumbnails: totalThumbnails,
        projects: totalProjects,
        recentThumbnails
      },
      trends: {
        daily: trendData
      },
      styles: styleDistribution,
      projects: projectData.slice(0, 5), // Top 5 projects
      hourlyDistribution,
      dayOfWeekDistribution
    };
  }

  async getThumbnailStats(userId: string) {
    // Get all thumbnails for detailed stats
    const thumbnails = await prisma.thumbnail.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        parameters: true,
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate average thumbnails per day
    if (thumbnails.length === 0) {
      return {
        total: 0,
        averagePerDay: 0,
        mostRecent: null,
        byProject: [],
        byStyle: {}
      };
    }

    const firstThumbnailDate = new Date(thumbnails[thumbnails.length - 1].createdAt);
    const today = new Date();
    const daysDiff = Math.ceil((today.getTime() - firstThumbnailDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    const averagePerDay = thumbnails.length / daysDiff;

    // Group by project
    const projectStats: Record<string, number> = {};
    thumbnails.forEach(thumbnail => {
      const projectName = thumbnail.project?.name || 'Unknown';
      projectStats[projectName] = (projectStats[projectName] || 0) + 1;
    });

    // Group by style
    const styleStats: Record<string, number> = {
      bold: 0,
      minimalist: 0,
      dramatic: 0,
      other: 0
    };

    thumbnails.forEach(thumbnail => {
      if (typeof thumbnail.parameters === 'object' && thumbnail.parameters !== null) {
        const style = (thumbnail.parameters as any).style || 'other';
        if (style in styleStats) {
          styleStats[style]++;
        } else {
          styleStats.other++;
        }
      } else {
        styleStats.other++;
      }
    });

    // Calculate editing stats
    let totalEditedThumbnails = 0;
    let totalEdits = 0;
    
    thumbnails.forEach(thumbnail => {
      if (typeof thumbnail.parameters === 'object' && thumbnail.parameters !== null) {
        const edits = (thumbnail.parameters as any).edits;
        if (edits && Object.keys(edits).length > 0) {
          totalEditedThumbnails++;
          totalEdits += Object.keys(edits).length;
        }
      }
    });

    // Calculate average edits per edited thumbnail
    const averageEditsPerThumbnail = totalEditedThumbnails > 0 ? 
      parseFloat((totalEdits / totalEditedThumbnails).toFixed(2)) : 0;

    return {
      total: thumbnails.length,
      averagePerDay: parseFloat(averagePerDay.toFixed(2)),
      mostRecent: thumbnails[0],
      byProject: Object.entries(projectStats).map(([name, count]) => ({ name, count })),
      byStyle: styleStats,
      editingStats: {
        totalEdited: totalEditedThumbnails,
        totalEdits: totalEdits,
        averageEditsPerThumbnail
      }
    };
  }

  // New method to get advanced analytics
  async getAdvancedAnalytics(userId: string) {
    // Get all thumbnails with their parameters
    const thumbnails = await prisma.thumbnail.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        parameters: true,
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate time-based metrics
    if (thumbnails.length === 0) {
      return {
        productivity: {
          bestDay: null,
          bestHour: null,
          consistency: 0
        },
        editing: {
          mostComplexThumbnail: null,
          averageEditComplexity: 0
        },
        engagement: {
          mostShared: null,
          sharingRate: 0
        }
      };
    }

    // Productivity metrics
    const firstThumbnailDate = new Date(thumbnails[thumbnails.length - 1].createdAt);
    const today = new Date();
    const totalDays = Math.ceil((today.getTime() - firstThumbnailDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    
    // Count thumbnails per day
    const thumbnailsPerDay: Record<string, number> = {};
    thumbnails.forEach(thumbnail => {
      const date = thumbnail.createdAt.toISOString().split('T')[0];
      thumbnailsPerDay[date] = (thumbnailsPerDay[date] || 0) + 1;
    });
    
    // Find best day
    let bestDay = '';
    let maxThumbnailsInDay = 0;
    Object.entries(thumbnailsPerDay).forEach(([date, count]) => {
      if (count > maxThumbnailsInDay) {
        maxThumbnailsInDay = count;
        bestDay = date;
      }
    });
    
    // Count thumbnails per hour
    const thumbnailsPerHour: Record<number, number> = {};
    thumbnails.forEach(thumbnail => {
      const hour = thumbnail.createdAt.getHours();
      thumbnailsPerHour[hour] = (thumbnailsPerHour[hour] || 0) + 1;
    });
    
    // Find best hour
    let bestHour = 0;
    let maxThumbnailsInHour = 0;
    Object.entries(thumbnailsPerHour).forEach(([hour, count]) => {
      const hourNum = parseInt(hour);
      if (count > maxThumbnailsInHour) {
        maxThumbnailsInHour = count;
        bestHour = hourNum;
      }
    });
    
    // Calculate consistency (percentage of days with at least one thumbnail)
    const activeDays = Object.keys(thumbnailsPerDay).length;
    const consistency = parseFloat(((activeDays / totalDays) * 100).toFixed(2));

    // Editing complexity metrics
    let maxEditComplexity = 0;
    let totalEditComplexity = 0;
    let mostComplexThumbnail = null;
    
    thumbnails.forEach(thumbnail => {
      if (typeof thumbnail.parameters === 'object' && thumbnail.parameters !== null) {
        const edits = (thumbnail.parameters as any).edits;
        if (edits && typeof edits === 'object') {
          const editCount = Object.keys(edits).length;
          totalEditComplexity += editCount;
          
          if (editCount > maxEditComplexity) {
            maxEditComplexity = editCount;
            mostComplexThumbnail = {
              id: thumbnail.id,
              title: thumbnail.title,
              editCount: editCount
            };
          }
        }
      }
    });
    
    const averageEditComplexity = parseFloat((totalEditComplexity / thumbnails.length).toFixed(2));

    // Engagement metrics (social shares)
    const socialShares = await prisma.socialShare.findMany({
      where: { userId }
    });
    
    const sharedThumbnails = new Set(socialShares.map(share => share.thumbnailId));
    const sharingRate = parseFloat(((sharedThumbnails.size / thumbnails.length) * 100).toFixed(2));
    
    // Find most shared thumbnail
    const shareCountPerThumbnail: Record<string, number> = {};
    socialShares.forEach(share => {
      shareCountPerThumbnail[share.thumbnailId] = (shareCountPerThumbnail[share.thumbnailId] || 0) + 1;
    });
    
    let mostSharedThumbnail = null;
    let maxShares = 0;
    Object.entries(shareCountPerThumbnail).forEach(([thumbnailId, count]) => {
      if (count > maxShares) {
        maxShares = count;
        const thumbnail = thumbnails.find(t => t.id === thumbnailId);
        if (thumbnail) {
          mostSharedThumbnail = {
            id: thumbnail.id,
            title: thumbnail.title,
            shareCount: count
          };
        }
      }
    });

    return {
      productivity: {
        bestDay: bestDay ? { date: bestDay, count: maxThumbnailsInDay } : null,
        bestHour: { hour: bestHour, count: maxThumbnailsInHour },
        consistency
      },
      editing: {
        mostComplexThumbnail,
        averageEditComplexity
      },
      engagement: {
        mostShared: mostSharedThumbnail,
        sharingRate
      }
    };
  }

  // New method to get detailed advanced analytics with time-based filtering
  async getDetailedAdvancedAnalytics(userId: string, timeframe: 'daily' | 'weekly' | 'monthly' = 'daily') {
    // Get all thumbnails with their parameters
    const thumbnails = await prisma.thumbnail.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        parameters: true,
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter thumbnails based on timeframe
    const filteredThumbnails = this.filterThumbnailsByTimeframe(thumbnails, timeframe);
    
    // Calculate time-based metrics
    if (filteredThumbnails.length === 0) {
      return {
        productivity: {
          bestDay: null,
          bestHour: null,
          consistency: 0,
          creationTrend: []
        },
        editing: {
          mostComplexThumbnail: null,
          averageEditComplexity: 0,
          editDistribution: []
        },
        engagement: {
          mostShared: null,
          sharingRate: 0,
          platformDistribution: []
        },
        timeframeData: {
          totalThumbnails: 0,
          averagePerDay: 0
        }
      };
    }

    // Productivity metrics
    const firstThumbnailDate = new Date(filteredThumbnails[filteredThumbnails.length - 1].createdAt);
    const today = new Date();
    const totalDays = Math.ceil((today.getTime() - firstThumbnailDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    
    // Count thumbnails per day
    const thumbnailsPerDay: Record<string, number> = {};
    filteredThumbnails.forEach(thumbnail => {
      const date = thumbnail.createdAt.toISOString().split('T')[0];
      thumbnailsPerDay[date] = (thumbnailsPerDay[date] || 0) + 1;
    });
    
    // Find best day
    let bestDay = '';
    let maxThumbnailsInDay = 0;
    Object.entries(thumbnailsPerDay).forEach(([date, count]) => {
      if (count > maxThumbnailsInDay) {
        maxThumbnailsInDay = count;
        bestDay = date;
      }
    });
    
    // Count thumbnails per hour
    const thumbnailsPerHour: Record<number, number> = {};
    filteredThumbnails.forEach(thumbnail => {
      const hour = thumbnail.createdAt.getHours();
      thumbnailsPerHour[hour] = (thumbnailsPerHour[hour] || 0) + 1;
    });
    
    // Find best hour
    let bestHour = 0;
    let maxThumbnailsInHour = 0;
    Object.entries(thumbnailsPerHour).forEach(([hour, count]) => {
      const hourNum = parseInt(hour);
      if (count > maxThumbnailsInHour) {
        maxThumbnailsInHour = count;
        bestHour = hourNum;
      }
    });
    
    // Calculate consistency (percentage of days with at least one thumbnail)
    const activeDays = Object.keys(thumbnailsPerDay).length;
    const consistency = parseFloat(((activeDays / totalDays) * 100).toFixed(2));

    // Creation trend data for charting
    const creationTrend = Object.entries(thumbnailsPerDay).map(([date, count]) => ({
      date,
      count
    }));

    // Editing complexity metrics
    let maxEditComplexity = 0;
    let totalEditComplexity = 0;
    let mostComplexThumbnail = null;
    
    filteredThumbnails.forEach(thumbnail => {
      if (typeof thumbnail.parameters === 'object' && thumbnail.parameters !== null) {
        const edits = (thumbnail.parameters as any).edits;
        if (edits && typeof edits === 'object') {
          const editCount = Object.keys(edits).length;
          totalEditComplexity += editCount;
          
          if (editCount > maxEditComplexity) {
            maxEditComplexity = editCount;
            mostComplexThumbnail = {
              id: thumbnail.id,
              title: thumbnail.title,
              editCount: editCount
            };
          }
        }
      }
    });
    
    const averageEditComplexity = parseFloat((totalEditComplexity / filteredThumbnails.length).toFixed(2));

    // Edit distribution for charting
    const editCounts: number[] = [];
    filteredThumbnails.forEach(thumbnail => {
      if (typeof thumbnail.parameters === 'object' && thumbnail.parameters !== null) {
        const edits = (thumbnail.parameters as any).edits;
        if (edits && typeof edits === 'object') {
          editCounts.push(Object.keys(edits).length);
        } else {
          editCounts.push(0);
        }
      } else {
        editCounts.push(0);
      }
    });

    // Group edit counts for distribution chart
    const editDistribution: Record<string, number> = {
      '0 edits': 0,
      '1-2 edits': 0,
      '3-5 edits': 0,
      '6-10 edits': 0,
      '10+ edits': 0
    };

    editCounts.forEach(count => {
      if (count === 0) {
        editDistribution['0 edits']++;
      } else if (count <= 2) {
        editDistribution['1-2 edits']++;
      } else if (count <= 5) {
        editDistribution['3-5 edits']++;
      } else if (count <= 10) {
        editDistribution['6-10 edits']++;
      } else {
        editDistribution['10+ edits']++;
      }
    });

    // Engagement metrics (social shares)
    const socialShares = await prisma.socialShare.findMany({
      where: { userId }
    });
    
    const sharedThumbnails = new Set(socialShares.map(share => share.thumbnailId));
    const sharingRate = parseFloat(((sharedThumbnails.size / filteredThumbnails.length) * 100).toFixed(2));
    
    // Find most shared thumbnail
    const shareCountPerThumbnail: Record<string, number> = {};
    socialShares.forEach(share => {
      shareCountPerThumbnail[share.thumbnailId] = (shareCountPerThumbnail[share.thumbnailId] || 0) + 1;
    });
    
    let mostSharedThumbnail = null;
    let maxShares = 0;
    Object.entries(shareCountPerThumbnail).forEach(([thumbnailId, count]) => {
      if (count > maxShares) {
        maxShares = count;
        const thumbnail = filteredThumbnails.find(t => t.id === thumbnailId);
        if (thumbnail) {
          mostSharedThumbnail = {
            id: thumbnail.id,
            title: thumbnail.title,
            shareCount: count
          };
        }
      }
    });

    // Platform distribution for charting
    const platformDistribution: Record<string, number> = {};
    socialShares.forEach(share => {
      platformDistribution[share.platform] = (platformDistribution[share.platform] || 0) + 1;
    });

    // Timeframe data
    const totalThumbnailsInTimeframe = filteredThumbnails.length;
    const averagePerDay = parseFloat((totalThumbnailsInTimeframe / totalDays).toFixed(2));

    return {
      productivity: {
        bestDay: bestDay ? { date: bestDay, count: maxThumbnailsInDay } : null,
        bestHour: { hour: bestHour, count: maxThumbnailsInHour },
        consistency,
        creationTrend
      },
      editing: {
        mostComplexThumbnail,
        averageEditComplexity,
        editDistribution
      },
      engagement: {
        mostShared: mostSharedThumbnail,
        sharingRate,
        platformDistribution: Object.entries(platformDistribution).map(([platform, count]) => ({
          platform,
          count
        }))
      },
      timeframeData: {
        totalThumbnails: totalThumbnailsInTimeframe,
        averagePerDay
      }
    };
  }

  // Helper method to filter thumbnails by timeframe
  private filterThumbnailsByTimeframe(thumbnails: any[], timeframe: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        break;
      default:
        return thumbnails; // Return all if no valid timeframe
    }

    return thumbnails.filter(thumbnail => new Date(thumbnail.createdAt) >= startDate);
  }

  // Method to get comparative analytics (current vs previous period)
  async getComparativeAnalytics(userId: string, timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly') {
    // Get current period data
    const currentData = await this.getDetailedAdvancedAnalytics(userId, timeframe);
    
    // Get previous period data by adjusting the timeframe
    const previousTimeframe = this.getPreviousTimeframe(timeframe);
    const previousData = await this.getHistoricalAnalytics(userId, previousTimeframe.start, previousTimeframe.end);
    
    return {
      current: currentData,
      previous: previousData,
      comparison: {
        thumbnails: {
          current: currentData.timeframeData.totalThumbnails,
          previous: previousData.timeframeData.totalThumbnails,
          change: this.calculatePercentageChange(
            previousData.timeframeData.totalThumbnails,
            currentData.timeframeData.totalThumbnails
          )
        },
        averagePerDay: {
          current: currentData.timeframeData.averagePerDay,
          previous: previousData.timeframeData.averagePerDay,
          change: this.calculatePercentageChange(
            previousData.timeframeData.averagePerDay,
            currentData.timeframeData.averagePerDay
          )
        },
        sharingRate: {
          current: currentData.engagement.sharingRate,
          previous: previousData.engagement.sharingRate,
          change: this.calculatePercentageChange(
            previousData.engagement.sharingRate,
            currentData.engagement.sharingRate
          )
        },
        averageEditComplexity: {
          current: currentData.editing.averageEditComplexity,
          previous: previousData.editing.averageEditComplexity,
          change: this.calculatePercentageChange(
            previousData.editing.averageEditComplexity,
            currentData.editing.averageEditComplexity
          )
        }
      }
    };
  }

  // Helper method to get previous timeframe dates
  private getPreviousTimeframe(timeframe: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (timeframe) {
      case 'daily':
        end = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000); // Day before yesterday
        break;
      case 'weekly':
        end = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Week ago
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); // Two weeks ago
        break;
      case 'monthly':
        end = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Month ago
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // Two months ago
        break;
      default:
        end = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  // Helper method to get historical analytics for a specific date range
  private async getHistoricalAnalytics(userId: string, startDate: Date, endDate: Date) {
    // Get thumbnails within date range
    const thumbnails = await prisma.thumbnail.findMany({
      where: { 
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        parameters: true,
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate time-based metrics
    if (thumbnails.length === 0) {
      return {
        productivity: {
          bestDay: null,
          bestHour: null,
          consistency: 0,
          creationTrend: []
        },
        editing: {
          mostComplexThumbnail: null,
          averageEditComplexity: 0,
          editDistribution: []
        },
        engagement: {
          mostShared: null,
          sharingRate: 0,
          platformDistribution: []
        },
        timeframeData: {
          totalThumbnails: 0,
          averagePerDay: 0
        }
      };
    }

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    
    // Count thumbnails per day
    const thumbnailsPerDay: Record<string, number> = {};
    thumbnails.forEach(thumbnail => {
      const date = thumbnail.createdAt.toISOString().split('T')[0];
      thumbnailsPerDay[date] = (thumbnailsPerDay[date] || 0) + 1;
    });
    
    // Find best day
    let bestDay = '';
    let maxThumbnailsInDay = 0;
    Object.entries(thumbnailsPerDay).forEach(([date, count]) => {
      if (count > maxThumbnailsInDay) {
        maxThumbnailsInDay = count;
        bestDay = date;
      }
    });
    
    // Count thumbnails per hour
    const thumbnailsPerHour: Record<number, number> = {};
    thumbnails.forEach(thumbnail => {
      const hour = thumbnail.createdAt.getHours();
      thumbnailsPerHour[hour] = (thumbnailsPerHour[hour] || 0) + 1;
    });
    
    // Find best hour
    let bestHour = 0;
    let maxThumbnailsInHour = 0;
    Object.entries(thumbnailsPerHour).forEach(([hour, count]) => {
      const hourNum = parseInt(hour);
      if (count > maxThumbnailsInHour) {
        maxThumbnailsInHour = count;
        bestHour = hourNum;
      }
    });
    
    // Calculate consistency (percentage of days with at least one thumbnail)
    const activeDays = Object.keys(thumbnailsPerDay).length;
    const consistency = parseFloat(((activeDays / totalDays) * 100).toFixed(2));

    // Editing complexity metrics
    let maxEditComplexity = 0;
    let totalEditComplexity = 0;
    let mostComplexThumbnail = null;
    
    thumbnails.forEach(thumbnail => {
      if (typeof thumbnail.parameters === 'object' && thumbnail.parameters !== null) {
        const edits = (thumbnail.parameters as any).edits;
        if (edits && typeof edits === 'object') {
          const editCount = Object.keys(edits).length;
          totalEditComplexity += editCount;
          
          if (editCount > maxEditComplexity) {
            maxEditComplexity = editCount;
            mostComplexThumbnail = {
              id: thumbnail.id,
              title: thumbnail.title,
              editCount: editCount
            };
          }
        }
      }
    });
    
    const averageEditComplexity = parseFloat((totalEditComplexity / thumbnails.length).toFixed(2));

    // Edit distribution for charting
    const editCounts: number[] = [];
    thumbnails.forEach(thumbnail => {
      if (typeof thumbnail.parameters === 'object' && thumbnail.parameters !== null) {
        const edits = (thumbnail.parameters as any).edits;
        if (edits && typeof edits === 'object') {
          editCounts.push(Object.keys(edits).length);
        } else {
          editCounts.push(0);
        }
      } else {
        editCounts.push(0);
      }
    });

    // Group edit counts for distribution chart
    const editDistribution: Record<string, number> = {
      '0 edits': 0,
      '1-2 edits': 0,
      '3-5 edits': 0,
      '6-10 edits': 0,
      '10+ edits': 0
    };

    editCounts.forEach(count => {
      if (count === 0) {
        editDistribution['0 edits']++;
      } else if (count <= 2) {
        editDistribution['1-2 edits']++;
      } else if (count <= 5) {
        editDistribution['3-5 edits']++;
      } else if (count <= 10) {
        editDistribution['6-10 edits']++;
      } else {
        editDistribution['10+ edits']++;
      }
    });

    // Engagement metrics (social shares)
    const socialShares = await prisma.socialShare.findMany({
      where: { 
        userId,
        sharedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    const sharedThumbnails = new Set(socialShares.map(share => share.thumbnailId));
    const sharingRate = parseFloat(((sharedThumbnails.size / thumbnails.length) * 100).toFixed(2));
    
    // Platform distribution for charting
    const platformDistribution: Record<string, number> = {};
    socialShares.forEach(share => {
      platformDistribution[share.platform] = (platformDistribution[share.platform] || 0) + 1;
    });

    // Timeframe data
    const totalThumbnailsInTimeframe = thumbnails.length;
    const averagePerDay = parseFloat((totalThumbnailsInTimeframe / totalDays).toFixed(2));

    return {
      productivity: {
        bestDay: bestDay ? { date: bestDay, count: maxThumbnailsInDay } : null,
        bestHour: { hour: bestHour, count: maxThumbnailsInHour },
        consistency,
        creationTrend: []
      },
      editing: {
        mostComplexThumbnail,
        averageEditComplexity,
        editDistribution
      },
      engagement: {
        mostShared: mostSharedThumbnail,
        sharingRate,
        platformDistribution: Object.entries(platformDistribution).map(([platform, count]) => ({
          platform,
          count
        }))
      },
      timeframeData: {
        totalThumbnails: totalThumbnailsInTimeframe,
        averagePerDay
      }
    };
  }

  // Helper method to calculate percentage change
  private calculatePercentageChange(previous: number, current: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return parseFloat(((current - previous) / previous * 100).toFixed(2));
  }
}