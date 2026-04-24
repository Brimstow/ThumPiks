-- ===========================================================================
-- Migration: Add missing schema columns and tables
-- Fixes schema drift causing 500 errors on staging (Subscription, CreditTransaction)
-- Also adds all other missing tables and columns from schema.prisma
-- ===========================================================================

-- ─── ALTER EXISTING TABLES: Add missing columns ────────────────────────────

-- Subscription: addon credits, watermark tracking, Polar billing
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonCreditsBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "addonCreditsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "watermarkFreeUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "watermarkFreeResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "polarSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "polarProductId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "billingProvider" TEXT NOT NULL DEFAULT 'stripe';

-- CreditTransaction: balance tracking, Polar order
ALTER TABLE "CreditTransaction" ADD COLUMN IF NOT EXISTS "balanceBefore" INTEGER;
ALTER TABLE "CreditTransaction" ADD COLUMN IF NOT EXISTS "balanceAfter" INTEGER;
ALTER TABLE "CreditTransaction" ADD COLUMN IF NOT EXISTS "polarOrderId" TEXT;

-- Thumbnail: storage, soft-delete, original image
ALTER TABLE "Thumbnail" ADD COLUMN IF NOT EXISTS "originalImageUrl" TEXT;
ALTER TABLE "Thumbnail" ADD COLUMN IF NOT EXISTS "originalPublicId" TEXT;
ALTER TABLE "Thumbnail" ADD COLUMN IF NOT EXISTS "storagePublicId" TEXT;
ALTER TABLE "Thumbnail" ADD COLUMN IF NOT EXISTS "storageProvider" TEXT DEFAULT 'cloudinary';
ALTER TABLE "Thumbnail" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
-- Make prompt nullable with default (it was NOT NULL without default in initial migration)
ALTER TABLE "Thumbnail" ALTER COLUMN "prompt" SET DEFAULT '';

-- User: Polar, YouTube integration
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "polarCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "youtubeAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "youtubeRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "youtubeChannelId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "youtubeConnectedAt" TIMESTAMP(3);

-- ─── CREATE INDEXES for altered columns ────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_polarSubscriptionId_key" ON "Subscription"("polarSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscription_polarSubscriptionId_idx" ON "Subscription"("polarSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscription_billingProvider_idx" ON "Subscription"("billingProvider");
CREATE INDEX IF NOT EXISTS "Thumbnail_storagePublicId_idx" ON "Thumbnail"("storagePublicId");
CREATE INDEX IF NOT EXISTS "Thumbnail_deletedAt_idx" ON "Thumbnail"("deletedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "User_polarCustomerId_key" ON "User"("polarCustomerId");

-- ─── CREATE NEW TABLES ─────────────────────────────────────────────────────

-- VisionAnalysis
CREATE TABLE IF NOT EXISTS "VisionAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggestedPrompt" TEXT NOT NULL,
    "elements" JSONB NOT NULL,
    "sourceType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisionAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VisionAnalysis_userId_idx" ON "VisionAnalysis"("userId");
CREATE INDEX IF NOT EXISTS "VisionAnalysis_createdAt_idx" ON "VisionAnalysis"("createdAt");
ALTER TABLE "VisionAnalysis" DROP CONSTRAINT IF EXISTS "VisionAnalysis_userId_fkey";
ALTER TABLE "VisionAnalysis" ADD CONSTRAINT "VisionAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ABTest
CREATE TABLE IF NOT EXISTS "ABTest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ABTest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ABTest_userId_idx" ON "ABTest"("userId");
CREATE INDEX IF NOT EXISTS "ABTest_status_idx" ON "ABTest"("status");
CREATE INDEX IF NOT EXISTS "ABTest_createdAt_idx" ON "ABTest"("createdAt");
ALTER TABLE "ABTest" DROP CONSTRAINT IF EXISTS "ABTest_userId_fkey";
ALTER TABLE "ABTest" ADD CONSTRAINT "ABTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ABTestVariant
CREATE TABLE IF NOT EXISTS "ABTestVariant" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnailId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ABTestVariant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ABTestVariant_testId_idx" ON "ABTestVariant"("testId");
CREATE INDEX IF NOT EXISTS "ABTestVariant_thumbnailId_idx" ON "ABTestVariant"("thumbnailId");
ALTER TABLE "ABTestVariant" DROP CONSTRAINT IF EXISTS "ABTestVariant_testId_fkey";
ALTER TABLE "ABTestVariant" ADD CONSTRAINT "ABTestVariant_testId_fkey" FOREIGN KEY ("testId") REFERENCES "ABTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ABTestVariant" DROP CONSTRAINT IF EXISTS "ABTestVariant_thumbnailId_fkey";
ALTER TABLE "ABTestVariant" ADD CONSTRAINT "ABTestVariant_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "Thumbnail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ABTestImpression
CREATE TABLE IF NOT EXISTS "ABTestImpression" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ABTestImpression_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ABTestImpression_testId_idx" ON "ABTestImpression"("testId");
CREATE INDEX IF NOT EXISTS "ABTestImpression_variantId_idx" ON "ABTestImpression"("variantId");
CREATE INDEX IF NOT EXISTS "ABTestImpression_userId_idx" ON "ABTestImpression"("userId");
CREATE INDEX IF NOT EXISTS "ABTestImpression_createdAt_idx" ON "ABTestImpression"("createdAt");
ALTER TABLE "ABTestImpression" DROP CONSTRAINT IF EXISTS "ABTestImpression_testId_fkey";
ALTER TABLE "ABTestImpression" ADD CONSTRAINT "ABTestImpression_testId_fkey" FOREIGN KEY ("testId") REFERENCES "ABTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ABTestImpression" DROP CONSTRAINT IF EXISTS "ABTestImpression_userId_fkey";
ALTER TABLE "ABTestImpression" ADD CONSTRAINT "ABTestImpression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ABTestImpression" DROP CONSTRAINT IF EXISTS "ABTestImpression_variantId_fkey";
ALTER TABLE "ABTestImpression" ADD CONSTRAINT "ABTestImpression_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ABTestVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserAsset
CREATE TABLE IF NOT EXISTS "UserAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserAsset_userId_idx" ON "UserAsset"("userId");
CREATE INDEX IF NOT EXISTS "UserAsset_type_idx" ON "UserAsset"("type");
CREATE INDEX IF NOT EXISTS "UserAsset_createdAt_idx" ON "UserAsset"("createdAt");
ALTER TABLE "UserAsset" DROP CONSTRAINT IF EXISTS "UserAsset_userId_fkey";
ALTER TABLE "UserAsset" ADD CONSTRAINT "UserAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- UserUrlHistory
CREATE TABLE IF NOT EXISTS "UserUrlHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "platform" TEXT,
    "thumbnailUrl" TEXT,
    "selectedFrameTime" DOUBLE PRECISION,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserUrlHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserUrlHistory_userId_idx" ON "UserUrlHistory"("userId");
CREATE INDEX IF NOT EXISTS "UserUrlHistory_createdAt_idx" ON "UserUrlHistory"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "UserUrlHistory_userId_url_key" ON "UserUrlHistory"("userId", "url");
ALTER TABLE "UserUrlHistory" DROP CONSTRAINT IF EXISTS "UserUrlHistory_userId_fkey";
ALTER TABLE "UserUrlHistory" ADD CONSTRAINT "UserUrlHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CompositionLayout
CREATE TABLE IF NOT EXISTS "CompositionLayout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "canvasWidth" INTEGER NOT NULL DEFAULT 1920,
    "canvasHeight" INTEGER NOT NULL DEFAULT 1080,
    "wireframeSvg" TEXT NOT NULL,
    "slots" JSONB NOT NULL,
    "textSlots" JSONB NOT NULL DEFAULT '[]',
    "fallbackBackground" TEXT,
    "previewUrl" TEXT,
    "builtIn" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompositionLayout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CompositionLayout_category_idx" ON "CompositionLayout"("category");
CREATE INDEX IF NOT EXISTS "CompositionLayout_isPublic_idx" ON "CompositionLayout"("isPublic");
CREATE INDEX IF NOT EXISTS "CompositionLayout_builtIn_idx" ON "CompositionLayout"("builtIn");
CREATE INDEX IF NOT EXISTS "CompositionLayout_creatorId_idx" ON "CompositionLayout"("creatorId");
CREATE INDEX IF NOT EXISTS "CompositionLayout_popularity_idx" ON "CompositionLayout"("popularity");
ALTER TABLE "CompositionLayout" DROP CONSTRAINT IF EXISTS "CompositionLayout_creatorId_fkey";
ALTER TABLE "CompositionLayout" ADD CONSTRAINT "CompositionLayout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── BRAND KIT TABLES ──────────────────────────────────────────────────────

-- BrandLogo
CREATE TABLE IF NOT EXISTS "BrandLogo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "variant" TEXT NOT NULL DEFAULT 'full',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "fileType" TEXT NOT NULL DEFAULT 'png',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandLogo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrandLogo_userId_idx" ON "BrandLogo"("userId");
CREATE INDEX IF NOT EXISTS "BrandLogo_createdAt_idx" ON "BrandLogo"("createdAt");
ALTER TABLE "BrandLogo" DROP CONSTRAINT IF EXISTS "BrandLogo_userId_fkey";
ALTER TABLE "BrandLogo" ADD CONSTRAINT "BrandLogo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BrandColorPalette
CREATE TABLE IF NOT EXISTS "BrandColorPalette" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandColorPalette_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrandColorPalette_userId_idx" ON "BrandColorPalette"("userId");
CREATE INDEX IF NOT EXISTS "BrandColorPalette_createdAt_idx" ON "BrandColorPalette"("createdAt");
ALTER TABLE "BrandColorPalette" DROP CONSTRAINT IF EXISTS "BrandColorPalette_userId_fkey";
ALTER TABLE "BrandColorPalette" ADD CONSTRAINT "BrandColorPalette_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BrandColorSwatch
CREATE TABLE IF NOT EXISTS "BrandColorSwatch" (
    "id" TEXT NOT NULL,
    "paletteId" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'custom',
    CONSTRAINT "BrandColorSwatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrandColorSwatch_paletteId_idx" ON "BrandColorSwatch"("paletteId");
ALTER TABLE "BrandColorSwatch" DROP CONSTRAINT IF EXISTS "BrandColorSwatch_paletteId_fkey";
ALTER TABLE "BrandColorSwatch" ADD CONSTRAINT "BrandColorSwatch_paletteId_fkey" FOREIGN KEY ("paletteId") REFERENCES "BrandColorPalette"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BrandFont
CREATE TABLE IF NOT EXISTS "BrandFont" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fontFamily" TEXT NOT NULL,
    "weights" JSONB NOT NULL DEFAULT '[]',
    "role" TEXT NOT NULL DEFAULT 'custom',
    "previewText" TEXT NOT NULL DEFAULT 'Aa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandFont_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrandFont_userId_idx" ON "BrandFont"("userId");
CREATE INDEX IF NOT EXISTS "BrandFont_createdAt_idx" ON "BrandFont"("createdAt");
ALTER TABLE "BrandFont" DROP CONSTRAINT IF EXISTS "BrandFont_userId_fkey";
ALTER TABLE "BrandFont" ADD CONSTRAINT "BrandFont_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BrandVoice
CREATE TABLE IF NOT EXISTS "BrandVoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "dos" JSONB NOT NULL DEFAULT '[]',
    "donts" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BrandVoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BrandVoice_userId_key" ON "BrandVoice"("userId");
ALTER TABLE "BrandVoice" DROP CONSTRAINT IF EXISTS "BrandVoice_userId_fkey";
ALTER TABLE "BrandVoice" ADD CONSTRAINT "BrandVoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BrandPhoto
CREATE TABLE IF NOT EXISTS "BrandPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "thumbnailUrl" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'custom',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandPhoto_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrandPhoto_userId_idx" ON "BrandPhoto"("userId");
CREATE INDEX IF NOT EXISTS "BrandPhoto_category_idx" ON "BrandPhoto"("category");
CREATE INDEX IF NOT EXISTS "BrandPhoto_createdAt_idx" ON "BrandPhoto"("createdAt");
ALTER TABLE "BrandPhoto" DROP CONSTRAINT IF EXISTS "BrandPhoto_userId_fkey";
ALTER TABLE "BrandPhoto" ADD CONSTRAINT "BrandPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BrandGraphic
CREATE TABLE IF NOT EXISTS "BrandGraphic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "thumbnailUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandGraphic_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrandGraphic_userId_idx" ON "BrandGraphic"("userId");
CREATE INDEX IF NOT EXISTS "BrandGraphic_type_idx" ON "BrandGraphic"("type");
CREATE INDEX IF NOT EXISTS "BrandGraphic_createdAt_idx" ON "BrandGraphic"("createdAt");
ALTER TABLE "BrandGraphic" DROP CONSTRAINT IF EXISTS "BrandGraphic_userId_fkey";
ALTER TABLE "BrandGraphic" ADD CONSTRAINT "BrandGraphic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BrandIcon
CREATE TABLE IF NOT EXISTS "BrandIcon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "svg" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandIcon_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrandIcon_userId_idx" ON "BrandIcon"("userId");
CREATE INDEX IF NOT EXISTS "BrandIcon_category_idx" ON "BrandIcon"("category");
CREATE INDEX IF NOT EXISTS "BrandIcon_createdAt_idx" ON "BrandIcon"("createdAt");
ALTER TABLE "BrandIcon" DROP CONSTRAINT IF EXISTS "BrandIcon_userId_fkey";
ALTER TABLE "BrandIcon" ADD CONSTRAINT "BrandIcon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BrandStylePreset
CREATE TABLE IF NOT EXISTS "BrandStylePreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "previewUrl" TEXT,
    "textPlacement" TEXT NOT NULL DEFAULT 'center',
    "overlayColor" TEXT NOT NULL DEFAULT '#000000',
    "overlayOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "fontPairing" JSONB NOT NULL DEFAULT '{}',
    "colorScheme" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandStylePreset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrandStylePreset_userId_idx" ON "BrandStylePreset"("userId");
CREATE INDEX IF NOT EXISTS "BrandStylePreset_createdAt_idx" ON "BrandStylePreset"("createdAt");
ALTER TABLE "BrandStylePreset" DROP CONSTRAINT IF EXISTS "BrandStylePreset_userId_fkey";
ALTER TABLE "BrandStylePreset" ADD CONSTRAINT "BrandStylePreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BrandCustomCategory
CREATE TABLE IF NOT EXISTS "BrandCustomCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Folder',
    "color" TEXT NOT NULL DEFAULT 'slate',
    "bgColor" TEXT NOT NULL DEFAULT 'bg-slate-500/10',
    "borderColor" TEXT NOT NULL DEFAULT 'border-slate-500/20',
    "textColor" TEXT NOT NULL DEFAULT 'text-slate-400',
    "hoverColor" TEXT NOT NULL DEFAULT 'group-hover:text-slate-300',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandCustomCategory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrandCustomCategory_userId_idx" ON "BrandCustomCategory"("userId");
CREATE INDEX IF NOT EXISTS "BrandCustomCategory_createdAt_idx" ON "BrandCustomCategory"("createdAt");
ALTER TABLE "BrandCustomCategory" DROP CONSTRAINT IF EXISTS "BrandCustomCategory_userId_fkey";
ALTER TABLE "BrandCustomCategory" ADD CONSTRAINT "BrandCustomCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── FEEDBACK & TICKETING TABLES ───────────────────────────────────────────

-- Feedback
CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "screenshotPublicId" TEXT,
    "sentiment" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "category" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "aiSummary" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Feedback_userId_idx" ON "Feedback"("userId");
CREATE INDEX IF NOT EXISTS "Feedback_type_idx" ON "Feedback"("type");
CREATE INDEX IF NOT EXISTS "Feedback_priority_idx" ON "Feedback"("priority");
CREATE INDEX IF NOT EXISTS "Feedback_sentiment_idx" ON "Feedback"("sentiment");
CREATE INDEX IF NOT EXISTS "Feedback_createdAt_idx" ON "Feedback"("createdAt");
CREATE INDEX IF NOT EXISTS "Feedback_category_idx" ON "Feedback"("category");
ALTER TABLE "Feedback" DROP CONSTRAINT IF EXISTS "Feedback_userId_fkey";
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ticket
CREATE TABLE IF NOT EXISTS "Ticket" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignee" TEXT,
    "resolution" TEXT,
    "internalNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_feedbackId_key" ON "Ticket"("feedbackId");
CREATE INDEX IF NOT EXISTS "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX IF NOT EXISTS "Ticket_assignee_idx" ON "Ticket"("assignee");
CREATE INDEX IF NOT EXISTS "Ticket_createdAt_idx" ON "Ticket"("createdAt");
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_feedbackId_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TicketReply
CREATE TABLE IF NOT EXISTS "TicketReply" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TicketReply_ticketId_idx" ON "TicketReply"("ticketId");
CREATE INDEX IF NOT EXISTS "TicketReply_createdAt_idx" ON "TicketReply"("createdAt");
ALTER TABLE "TicketReply" DROP CONSTRAINT IF EXISTS "TicketReply_ticketId_fkey";
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NotificationConfig
CREATE TABLE IF NOT EXISTS "NotificationConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "emails" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationConfig_key_key" ON "NotificationConfig"("key");

-- ─── CONTACT SUBMISSION ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ContactSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "screenshotPublicId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triageResult" JSONB,
    "aiResponseSent" BOOLEAN NOT NULL DEFAULT false,
    "ticketId" TEXT,
    "userId" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContactSubmission_ticketId_key" ON "ContactSubmission"("ticketId");
CREATE INDEX IF NOT EXISTS "ContactSubmission_status_idx" ON "ContactSubmission"("status");
CREATE INDEX IF NOT EXISTS "ContactSubmission_subject_idx" ON "ContactSubmission"("subject");
CREATE INDEX IF NOT EXISTS "ContactSubmission_createdAt_idx" ON "ContactSubmission"("createdAt");
CREATE INDEX IF NOT EXISTS "ContactSubmission_email_idx" ON "ContactSubmission"("email");
ALTER TABLE "ContactSubmission" DROP CONSTRAINT IF EXISTS "ContactSubmission_userId_fkey";
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContactSubmission" DROP CONSTRAINT IF EXISTS "ContactSubmission_ticketId_fkey";
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── GLOBAL CHAT TABLES ───────────────────────────────────────────────────

-- ChatSession
CREATE TABLE IF NOT EXISTS "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'active',
    "escalatedToTicketId" TEXT,
    "metadata" JSONB,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChatSession_escalatedToTicketId_key" ON "ChatSession"("escalatedToTicketId");
CREATE INDEX IF NOT EXISTS "ChatSession_userId_idx" ON "ChatSession"("userId");
CREATE INDEX IF NOT EXISTS "ChatSession_status_idx" ON "ChatSession"("status");
CREATE INDEX IF NOT EXISTS "ChatSession_createdAt_idx" ON "ChatSession"("createdAt");
CREATE INDEX IF NOT EXISTS "ChatSession_lastMessageAt_idx" ON "ChatSession"("lastMessageAt");
ALTER TABLE "ChatSession" DROP CONSTRAINT IF EXISTS "ChatSession_userId_fkey";
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatSession" DROP CONSTRAINT IF EXISTS "ChatSession_escalatedToTicketId_fkey";
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_escalatedToTicketId_fkey" FOREIGN KEY ("escalatedToTicketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ChatMessage
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");
CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");
ALTER TABLE "ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_sessionId_fkey";
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
