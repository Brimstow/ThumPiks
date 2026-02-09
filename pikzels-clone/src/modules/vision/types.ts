export interface VisionElements {
  mainSubject: string;
  faces: number;
  textOverlay: string[];
  colorPalette: string[];
  mood: string;
  style: string;
  composition: string;
}

export interface VisionAnalysisResult {
  id: string;
  imageUrl: string;
  description: string;
  suggestedPrompt: string;
  elements: VisionElements;
  createdAt: Date;
}

export interface BingImageResult {
  url: string;
  title: string;
  sourceUrl: string;
  width: number;
  height: number;
  thumbnailUrl: string;
}

export interface VisionServiceDependencies {
  prisma?: import('@prisma/client').PrismaClient;
  cache?: import('../../services/cache.service').CacheService;
}
