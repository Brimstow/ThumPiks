export interface FaceDetail {
  position: 'left' | 'center' | 'right';
  verticalPosition: 'top' | 'middle' | 'bottom';
  expression: 'excited' | 'surprised' | 'happy' | 'serious' | 'neutral' | 'sad' | 'angry' | 'confident';
  size: 'small' | 'medium' | 'large';
  eyeContact: boolean;
}

export interface CTRFactors {
  faceScore: number;        // 0-100: faces present, expressions engaging, good positioning
  textScore: number;        // 0-100: readable, high contrast, good size
  colorScore: number;       // 0-100: high contrast, saturated, attention-grabbing
  compositionScore: number; // 0-100: balanced, follows rules, clear focal point
  emotionScore: number;     // 0-100: thumbnail evokes curiosity/excitement
  overallCTR: number;       // 0-100: predicted click-through effectiveness
}

export interface VisionElements {
  mainSubject: string;
  faces: number;
  faceDetails: FaceDetail[];
  textOverlay: string[];
  colorPalette: string[];
  dominantColor: string;
  colorContrast: 'low' | 'medium' | 'high';
  mood: string;
  style: string;
  composition: string;
  ctrFactors: CTRFactors;
  suggestions: string[];
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
