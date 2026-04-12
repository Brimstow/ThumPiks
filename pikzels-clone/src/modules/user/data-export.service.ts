/**
 * GDPR-Compliant User Data Export Service
 *
 * Collects all user-related data from the database and packages it
 * into a structured, machine-readable JSON format.
 *
 * Compliant with:
 * - GDPR Article 15 (Right of Access)
 * - GDPR Article 20 (Right to Data Portability)
 * - CCPA Section 1798.100 (Right to Know)
 */

import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

const prisma = getPrisma();

// ============================================
// TYPES
// ============================================

export interface DataExportResult {
  exportMetadata: {
    exportedAt: string;
    format: string;
    version: string;
    service: string;
    userId: string;
    requestedBy: string;
    dataCategories: string[];
  };
  profile: Record<string, unknown>;
  settings: Record<string, unknown> | null;
  emailPreferences: Record<string, unknown>;
  subscription: Record<string, unknown> | null;
  creditTransactions: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  thumbnails: Record<string, unknown>[];
  uploads: Record<string, unknown>[];
  urlHistory: Record<string, unknown>[];
  visionAnalyses: Record<string, unknown>[];
  abTests: Record<string, unknown>[];
  socialShares: Record<string, unknown>[];
  brandKit: {
    logos: Record<string, unknown>[];
    colorPalettes: Record<string, unknown>[];
    fonts: Record<string, unknown>[];
    voice: Record<string, unknown> | null;
    photos: Record<string, unknown>[];
    graphics: Record<string, unknown>[];
    icons: Record<string, unknown>[];
    stylePresets: Record<string, unknown>[];
  };
  teams: Record<string, unknown>[];
  templates: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

/**
 * Collect all user data from the database.
 * Excludes sensitive fields: passwordHash, tokens, internal IDs of other users.
 */
export async function exportUserData(userId: string): Promise<DataExportResult> {
  logger.info('Starting GDPR data export', { userId });

  const [
    user,
    subscriptions,
    creditTransactions,
    projects,
    thumbnails,
    uploads,
    urlHistory,
    visionAnalyses,
    abTests,
    socialShares,
    brandLogos,
    brandColorPalettes,
    brandFonts,
    brandVoice,
    brandPhotos,
    brandGraphics,
    brandIcons,
    brandStylePresets,
    teams,
    teamMemberships,
    templates,
    notifications,
  ] = await Promise.all([
    // Profile
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        isVerified: true,
        emailVerified: true,
        displayPreference: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        isActive: true,
        youtubeChannelId: true,
        youtubeConnectedAt: true,
        marketingEmails: true,
        productUpdates: true,
        securityAlerts: true,
        weeklyDigest: true,
        emailUnsubscribedAt: true,
        // EXCLUDED: passwordHash, emailVerificationToken, stripeCustomerId,
        // polarCustomerId, youtubeAccessToken, youtubeRefreshToken
      },
    }),

    // Subscriptions
    prisma.subscription.findMany({
      where: { userId },
      select: {
        id: true,
        planType: true,
        creditsBalance: true,
        creditsUsed: true,
        addonCreditsBalance: true,
        addonCreditsUsed: true,
        periodStart: true,
        periodEnd: true,
        billingCycle: true,
        cancelAtPeriodEnd: true,
        status: true,
        billingProvider: true,
        createdAt: true,
        // EXCLUDED: stripeSubscriptionId, stripePriceId, polarSubscriptionId, polarProductId
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Credit transactions
    prisma.creditTransaction.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        balanceBefore: true,
        balanceAfter: true,
        metadata: true,
        createdAt: true,
        // EXCLUDED: stripePaymentId, polarOrderId
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Projects
    prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        folderType: true,
        category: true,
        isArchived: true,
        depth: true,
        projectPath: true,
        parentProjectId: true,
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Thumbnails (metadata + URLs, no internal storage IDs)
    prisma.thumbnail.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        originalImageUrl: true,
        prompt: true,
        parameters: true,
        projectId: true,
        createdAt: true,
        isFeatured: true,
        downloadCount: true,
        editCount: true,
        storageProvider: true,
        deletedAt: true,
        // EXCLUDED: storagePublicId, originalPublicId (internal)
      },
      orderBy: { createdAt: 'desc' },
    }),

    // User assets (uploads)
    prisma.userAsset.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        url: true,
        name: true,
        sizeBytes: true,
        mimeType: true,
        width: true,
        height: true,
        createdAt: true,
        // EXCLUDED: publicId (internal Cloudinary ID)
      },
      orderBy: { createdAt: 'desc' },
    }),

    // URL history
    prisma.userUrlHistory.findMany({
      where: { userId },
      select: {
        id: true,
        url: true,
        title: true,
        platform: true,
        thumbnailUrl: true,
        selectedFrameTime: true,
        pinned: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Vision analyses
    prisma.visionAnalysis.findMany({
      where: { userId },
      select: {
        id: true,
        imageUrl: true,
        description: true,
        suggestedPrompt: true,
        elements: true,
        sourceType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),

    // A/B tests
    prisma.aBTest.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        variants: {
          select: {
            id: true,
            name: true,
            impressions: true,
            clicks: true,
            ctr: true,
            isControl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Social shares
    prisma.socialShare.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        shareUrl: true,
        status: true,
        sharedAt: true,
        engagement: true,
        thumbnailId: true,
      },
      orderBy: { sharedAt: 'desc' },
    }),

    // Brand kit
    prisma.brandLogo.findMany({
      where: { userId },
      select: { id: true, name: true, url: true, variant: true, isPrimary: true, fileType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brandColorPalette.findMany({
      where: { userId },
      select: { id: true, name: true, isPrimary: true, createdAt: true, colors: { select: { id: true, hex: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brandFont.findMany({
      where: { userId },
      select: { id: true, name: true, fontFamily: true, weights: true, role: true, previewText: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brandVoice.findFirst({
      where: { userId },
      select: { id: true, tone: true, description: true, keywords: true, dos: true, donts: true, createdAt: true, updatedAt: true },
    }),
    prisma.brandPhoto.findMany({
      where: { userId },
      select: { id: true, name: true, url: true, category: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brandGraphic.findMany({
      where: { userId },
      select: { id: true, name: true, url: true, type: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brandIcon.findMany({
      where: { userId },
      select: { id: true, name: true, svg: true, category: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brandStylePreset.findMany({
      where: { userId },
      select: { id: true, name: true, previewUrl: true, textPlacement: true, overlayColor: true, overlayOpacity: true, fontPairing: true, colorScheme: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),

    // Teams owned by user
    prisma.team.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Team memberships
    prisma.teamMember.findMany({
      where: { userId },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        Team: {
          select: { id: true, name: true },
        },
      },
    }),

    // Templates created by user
    prisma.template.findMany({
      where: { creatorId: userId },
      select: {
        id: true,
        name: true,
        description: true,
        parameters: true,
        tags: true,
        isPublic: true,
        downloads: true,
        likes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Notifications
    prisma.userNotification.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
        readAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // Cap notifications to prevent massive exports
    }),
  ]);

  if (!user) {
    throw new Error('User not found');
  }

  // Build the export
  const dataCategories = [
    'profile',
    'settings',
    'emailPreferences',
    'subscription',
    'creditTransactions',
    'projects',
    'thumbnails',
    'uploads',
    'urlHistory',
    'visionAnalyses',
    'abTests',
    'socialShares',
    'brandKit',
    'teams',
    'templates',
    'notifications',
  ];

  const exportResult: DataExportResult = {
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      format: 'JSON',
      version: '1.0.0',
      service: 'ThumPiks',
      userId: user.id,
      requestedBy: user.email,
      dataCategories,
    },
    profile: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      emailVerified: user.emailVerified,
      displayPreference: user.displayPreference,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      isActive: user.isActive,
      youtubeChannelId: user.youtubeChannelId,
      youtubeConnectedAt: user.youtubeConnectedAt,
    },
    settings: user.settings as Record<string, unknown> | null,
    emailPreferences: {
      marketingEmails: user.marketingEmails,
      productUpdates: user.productUpdates,
      securityAlerts: user.securityAlerts,
      weeklyDigest: user.weeklyDigest,
      emailUnsubscribedAt: user.emailUnsubscribedAt,
    },
    subscription: subscriptions.length > 0 ? (subscriptions[0] as unknown as Record<string, unknown>) : null,
    creditTransactions,
    projects,
    thumbnails,
    uploads,
    urlHistory,
    visionAnalyses,
    abTests,
    socialShares,
    brandKit: {
      logos: brandLogos,
      colorPalettes: brandColorPalettes,
      fonts: brandFonts,
      voice: brandVoice,
      photos: brandPhotos,
      graphics: brandGraphics,
      icons: brandIcons,
      stylePresets: brandStylePresets,
    },
    teams: [
      ...teams.map((t) => ({ ...t, role: 'owner' })),
      ...teamMemberships.map((tm) => ({
        id: tm.Team.id,
        name: tm.Team.name,
        role: tm.role,
        joinedAt: tm.joinedAt,
      })),
    ],
    templates,
    notifications,
  };

  logger.info('GDPR data export completed', {
    userId,
    categories: dataCategories.length,
    thumbnailCount: thumbnails.length,
    projectCount: projects.length,
  });

  return exportResult;
}
