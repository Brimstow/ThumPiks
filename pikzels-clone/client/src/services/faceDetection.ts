/**
 * Face Detection Service
 * 
 * Uses Google MediaPipe Tasks Vision for client-side face detection
 * and expression analysis. Runs entirely in the browser — no API calls.
 * 
 * Features:
 * - Face bounding box detection
 * - 478 facial landmarks (3D)
 * - 52 blendshape expression coefficients
 * - Expression labeling (excited, surprised, happy, neutral, etc.)
 * - Face positioning score for thumbnail optimization
 */

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';

// ============================================
// TYPES
// ============================================

export interface DetectedFace {
  /** Bounding box as fraction of image dimensions (0-1) */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Horizontal position */
  position: 'left' | 'center' | 'right';
  /** Vertical position */
  verticalPosition: 'top' | 'middle' | 'bottom';
  /** Relative size of face to image */
  size: 'small' | 'medium' | 'large';
  /** Primary detected expression */
  expression: string;
  /** Expression confidence 0-1 */
  expressionConfidence: number;
  /** Whether face appears to have eye contact (looking at camera) */
  eyeContact: boolean;
  /** Raw blendshape scores for advanced use */
  blendshapes: Record<string, number>;
}

export interface FaceAnalysisResult {
  faces: DetectedFace[];
  faceCount: number;
  /** Face positioning score for thumbnail optimization (0-100) */
  faceScore: number;
  /** Expression engagement score (0-100) */
  expressionScore: number;
  /** Summary label */
  summary: string;
}

// ============================================
// EXPRESSION MAPPING
// ============================================

/**
 * Maps MediaPipe blendshape coefficients to human-readable expressions.
 * Blendshapes include: browDownLeft, browDownRight, browInnerUp, browOuterUpLeft,
 * browOuterUpRight, cheekPuff, cheekSquintLeft, cheekSquintRight, eyeBlinkLeft,
 * eyeBlinkRight, eyeLookDownLeft, eyeLookDownRight, eyeLookInLeft, eyeLookInRight,
 * eyeLookOutLeft, eyeLookOutRight, eyeLookUpLeft, eyeLookUpRight, eyeSquintLeft,
 * eyeSquintRight, eyeWideLeft, eyeWideRight, jawForward, jawLeft, jawOpen, jawRight,
 * mouthClose, mouthDimpleLeft, mouthDimpleRight, mouthFrownLeft, mouthFrownRight,
 * mouthFunnel, mouthLeft, mouthLowerDownLeft, mouthLowerDownRight, mouthPressLeft,
 * mouthPressRight, mouthPucker, mouthRight, mouthRollLower, mouthRollUpper,
 * mouthShrugLower, mouthShrugUpper, mouthSmileLeft, mouthSmileRight,
 * mouthStretchLeft, mouthStretchRight, mouthUpperUpLeft, mouthUpperUpRight,
 * noseSneerLeft, noseSneerRight
 */
function classifyExpression(blendshapes: Record<string, number>): {
  expression: string;
  confidence: number;
} {
  const smile = ((blendshapes['mouthSmileLeft'] || 0) + (blendshapes['mouthSmileRight'] || 0)) / 2;
  const eyeWide = ((blendshapes['eyeWideLeft'] || 0) + (blendshapes['eyeWideRight'] || 0)) / 2;
  const browUp = ((blendshapes['browOuterUpLeft'] || 0) + (blendshapes['browOuterUpRight'] || 0)) / 2;
  const browInnerUp = blendshapes['browInnerUp'] || 0;
  const jawOpen = blendshapes['jawOpen'] || 0;
  const mouthFrown = ((blendshapes['mouthFrownLeft'] || 0) + (blendshapes['mouthFrownRight'] || 0)) / 2;
  const browDown = ((blendshapes['browDownLeft'] || 0) + (blendshapes['browDownRight'] || 0)) / 2;

  // Score each expression
  const scores: Record<string, number> = {
    excited: smile * 0.4 + eyeWide * 0.3 + jawOpen * 0.2 + browUp * 0.1,
    surprised: eyeWide * 0.4 + browUp * 0.3 + jawOpen * 0.3,
    happy: smile * 0.6 + browUp * 0.2 + (1 - mouthFrown) * 0.2,
    confident: (1 - jawOpen) * 0.3 + (1 - eyeWide) * 0.3 + smile * 0.2 + (1 - browUp) * 0.2,
    serious: (1 - smile) * 0.4 + browDown * 0.3 + (1 - jawOpen) * 0.3,
    neutral: (1 - smile) * 0.25 + (1 - eyeWide) * 0.25 + (1 - jawOpen) * 0.25 + (1 - browUp) * 0.25,
    sad: mouthFrown * 0.5 + browInnerUp * 0.3 + (1 - smile) * 0.2,
    angry: browDown * 0.5 + (1 - smile) * 0.3 + mouthFrown * 0.2,
  };

  // Find the highest-scoring expression
  let bestExpr = 'neutral';
  let bestScore = 0;
  for (const [expr, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestExpr = expr;
    }
  }

  return { expression: bestExpr, confidence: Math.min(bestScore, 1) };
}

// ============================================
// FACE DETECTION SERVICE (Singleton)
// ============================================

let faceLandmarkerInstance: FaceLandmarker | null = null;
let initPromise: Promise<FaceLandmarker> | null = null;

/**
 * Initialize the MediaPipe Face Landmarker (loads model on first call).
 * Subsequent calls return the cached instance.
 */
async function getOrCreateLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarkerInstance) return faceLandmarkerInstance;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    const landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      numFaces: 5,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });

    faceLandmarkerInstance = landmarker;
    return landmarker;
  })();

  return initPromise;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Detect faces in an HTMLImageElement or HTMLCanvasElement.
 * Returns face locations, expressions, and scoring.
 */
export async function detectFaces(
  imageSource: HTMLImageElement | HTMLCanvasElement
): Promise<FaceAnalysisResult> {
  const landmarker = await getOrCreateLandmarker();

  const result: FaceLandmarkerResult = landmarker.detect(imageSource);

  const imgWidth = imageSource instanceof HTMLCanvasElement
    ? imageSource.width
    : imageSource.naturalWidth || imageSource.width;
  const imgHeight = imageSource instanceof HTMLCanvasElement
    ? imageSource.height
    : imageSource.naturalHeight || imageSource.height;

  const faces: DetectedFace[] = [];

  for (let i = 0; i < (result.faceLandmarks?.length || 0); i++) {
    const landmarks = result.faceLandmarks[i];
    const blendshapeList = result.faceBlendshapes?.[i]?.categories || [];

    // Convert landmark points to bounding box
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const point of landmarks) {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }

    const bbWidth = maxX - minX;
    const bbHeight = maxY - minY;
    const centerX = minX + bbWidth / 2;
    const centerY = minY + bbHeight / 2;

    // Convert blendshapes array to map
    const blendshapes: Record<string, number> = {};
    for (const cat of blendshapeList) {
      blendshapes[cat.categoryName] = cat.score;
    }

    // Classify expression
    const { expression, confidence } = classifyExpression(blendshapes);

    // Position classification
    const position: 'left' | 'center' | 'right' =
      centerX < 0.33 ? 'left' : centerX > 0.67 ? 'right' : 'center';
    const verticalPosition: 'top' | 'middle' | 'bottom' =
      centerY < 0.33 ? 'top' : centerY > 0.67 ? 'bottom' : 'middle';

    // Size classification based on face area relative to image
    const faceArea = bbWidth * bbHeight;
    const size: 'small' | 'medium' | 'large' =
      faceArea > 0.15 ? 'large' : faceArea > 0.04 ? 'medium' : 'small';

    // Eye contact estimation (looking roughly at camera)
    const lookDownL = blendshapes['eyeLookDownLeft'] || 0;
    const lookDownR = blendshapes['eyeLookDownRight'] || 0;
    const lookUpL = blendshapes['eyeLookUpLeft'] || 0;
    const lookUpR = blendshapes['eyeLookUpRight'] || 0;
    const lookInL = blendshapes['eyeLookInLeft'] || 0;
    const lookInR = blendshapes['eyeLookInRight'] || 0;
    const lookOutL = blendshapes['eyeLookOutLeft'] || 0;
    const lookOutR = blendshapes['eyeLookOutRight'] || 0;

    const verticalGaze = Math.abs((lookUpL + lookUpR) / 2 - (lookDownL + lookDownR) / 2);
    const horizontalGaze = Math.abs((lookInL + lookInR) / 2 - (lookOutL + lookOutR) / 2);
    const eyeContact = verticalGaze < 0.3 && horizontalGaze < 0.3;

    faces.push({
      boundingBox: { x: minX, y: minY, width: bbWidth, height: bbHeight },
      position,
      verticalPosition,
      size,
      expression,
      expressionConfidence: confidence,
      eyeContact,
      blendshapes,
    });
  }

  // Calculate scores
  const faceScore = calculateFaceScore(faces, imgWidth, imgHeight);
  const expressionScore = calculateExpressionScore(faces);
  const summary = generateSummary(faces);

  return {
    faces,
    faceCount: faces.length,
    faceScore,
    expressionScore,
    summary,
  };
}

/**
 * Face positioning score for thumbnail optimization (0-100).
 * Rewards: large face, upper-third placement, eye contact.
 */
function calculateFaceScore(
  faces: DetectedFace[],
  _imgWidth: number,
  _imgHeight: number
): number {
  if (faces.length === 0) return 15; // No face penalty

  let bestScore = 0;

  for (const face of faces) {
    let score = 0;

    // Size bonus (large faces grab attention)
    if (face.size === 'large') score += 35;
    else if (face.size === 'medium') score += 25;
    else score += 10;

    // Position bonus (rule of thirds)
    if (face.position === 'left' || face.position === 'right') score += 15;
    else score += 10; // center is OK but not optimal

    // Vertical position (upper third is best for thumbnails)
    if (face.verticalPosition === 'top') score += 20;
    else if (face.verticalPosition === 'middle') score += 15;
    else score += 5;

    // Eye contact bonus
    if (face.eyeContact) score += 20;
    else score += 5;

    // Expression bonus (engaging expressions)
    const engagingExpressions = ['excited', 'surprised', 'happy'];
    if (engagingExpressions.includes(face.expression)) score += 10;
    else if (face.expression === 'confident') score += 7;
    else score += 3;

    bestScore = Math.max(bestScore, score);
  }

  return Math.min(100, bestScore);
}

/**
 * Expression engagement score (0-100).
 * High-CTR thumbnails have excited/surprised faces.
 */
function calculateExpressionScore(faces: DetectedFace[]): number {
  if (faces.length === 0) return 20;

  let totalScore = 0;

  for (const face of faces) {
    const expressionWeights: Record<string, number> = {
      excited: 95,
      surprised: 90,
      happy: 75,
      confident: 60,
      serious: 45,
      neutral: 30,
      sad: 20,
      angry: 35,
    };

    const baseScore = expressionWeights[face.expression] || 30;
    const confidenceBonus = face.expressionConfidence * 10;
    const eyeContactBonus = face.eyeContact ? 10 : 0;

    totalScore += Math.min(100, baseScore + confidenceBonus + eyeContactBonus);
  }

  // Average across faces, but primary face matters most
  return Math.round(totalScore / faces.length);
}

/**
 * Generate a human-readable summary of the face analysis.
 */
function generateSummary(faces: DetectedFace[]): string {
  if (faces.length === 0) {
    return 'No faces detected. Consider adding a face — thumbnails with faces get 38% higher CTR.';
  }

  const primary = faces[0];
  const parts: string[] = [];

  parts.push(`${faces.length} face${faces.length > 1 ? 's' : ''} detected.`);

  // Primary face analysis
  parts.push(`Primary face: ${primary.expression} expression, ${primary.size} size, ${primary.position} position.`);

  if (!primary.eyeContact) {
    parts.push('Tip: Direct eye contact increases engagement.');
  }

  if (primary.size === 'small') {
    parts.push('Tip: Larger faces (30%+ of thumbnail) get more clicks.');
  }

  const engagingExpressions = ['excited', 'surprised', 'happy'];
  if (!engagingExpressions.includes(primary.expression)) {
    parts.push('Tip: Excited or surprised expressions boost CTR significantly.');
  }

  return parts.join(' ');
}

/**
 * Check if the service is ready (model loaded).
 */
export function isModelLoaded(): boolean {
  return faceLandmarkerInstance !== null;
}

/**
 * Preload the model without running detection.
 * Call this early (e.g., when editor loads) for instant detection later.
 */
export async function preloadModel(): Promise<void> {
  await getOrCreateLandmarker();
}
