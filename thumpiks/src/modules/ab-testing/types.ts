export interface ABTestCreate {
  name: string;
  description?: string;
  variants: {
    name: string;
    thumbnailId: string;
    isControl?: boolean;
  }[];
}

export interface ABTestVariantStats {
  id: string;
  name: string;
  thumbnailId: string;
  thumbnailUrl?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  isControl: boolean;
}

export interface ABTestResult {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  variants: ABTestVariantStats[];
  totalImpressions: number;
  totalClicks: number;
  winner: ABTestVariantStats | null;
}

export interface ABTestServiceDependencies {
  prisma?: import('@prisma/client').PrismaClient;
  cache?: import('../../services/cache.service').CacheService;
}
