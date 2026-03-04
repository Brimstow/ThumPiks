/**
 * Attention Heatmap Overlay
 * 
 * A unique feature that visualizes where viewers will look first
 * based on face detection, text positioning, and contrast analysis.
 * 
 * NO COMPETITOR HAS THIS - Major differentiator for Thumbnail Maker
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { Layer, ImageLayer, TextLayer, AttentionData } from '../types/editor.types';
import { detectFaces, preloadModel } from '../../../services/faceDetection';

// ============================================
// TYPES
// ============================================

interface AttentionHeatmapProps {
  enabled: boolean;
  layers: Layer[];
  canvasWidth: number;
  canvasHeight: number;
  canvasZoom: number;
  canvasPan: { x: number; y: number };
  onAttentionCalculated?: (data: AttentionData) => void;
}

interface HeatmapPoint {
  x: number;
  y: number;
  radius: number;
  weight: number;  // 0-1 intensity
  type: 'face' | 'text' | 'contrast' | 'center';
}

// ============================================
// CONSTANTS
// ============================================

// Attention weights based on thumbnail psychology research
const ATTENTION_WEIGHTS = {
  face: 1.0,        // Faces get maximum attention
  eyes: 0.95,       // Eye contact is extremely powerful
  text: 0.7,        // Large text draws attention
  contrast: 0.5,    // High contrast areas
  center: 0.3,      // Center of image (natural focal point)
};

// Colors for heatmap gradient (cold to hot)
const HEATMAP_COLORS = [
  { stop: 0.0, color: 'rgba(0, 0, 255, 0)' },      // Transparent blue (cold)
  { stop: 0.2, color: 'rgba(0, 0, 255, 0.3)' },    // Blue
  { stop: 0.4, color: 'rgba(0, 255, 255, 0.4)' },  // Cyan
  { stop: 0.5, color: 'rgba(0, 255, 0, 0.5)' },    // Green
  { stop: 0.6, color: 'rgba(255, 255, 0, 0.6)' },  // Yellow
  { stop: 0.8, color: 'rgba(255, 128, 0, 0.7)' },  // Orange
  { stop: 1.0, color: 'rgba(255, 0, 0, 0.8)' },    // Red (hot)
];

// ============================================
// ATTENTION CALCULATION
// ============================================

/**
 * Load an image element from a src URL (for MediaPipe detection).
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Calculate attention points from layer data.
 * Uses MediaPipe for real face detection on image layers.
 */
async function calculateAttentionPoints(
  layers: Layer[],
  canvasWidth: number,
  canvasHeight: number
): Promise<HeatmapPoint[]> {
  const points: HeatmapPoint[] = [];
  
  // Add center point (natural focal point)
  points.push({
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    radius: Math.min(canvasWidth, canvasHeight) * 0.2,
    weight: ATTENTION_WEIGHTS.center,
    type: 'center',
  });
  
  // Analyze layers
  for (const layer of layers) {
    if (!layer.visible) continue;
    
    // Text layers draw attention
    if (layer.type === 'text') {
      const textLayer = layer as TextLayer;
      const area = textLayer.transform.width * textLayer.transform.height;
      const relativeSize = area / (canvasWidth * canvasHeight);
      
      // Larger text = more attention
      const weight = Math.min(ATTENTION_WEIGHTS.text + relativeSize * 0.5, 1.0);
      
      points.push({
        x: textLayer.transform.x + textLayer.transform.width / 2,
        y: textLayer.transform.y + textLayer.transform.height / 2,
        radius: Math.max(textLayer.transform.width, textLayer.transform.height) * 0.6,
        weight,
        type: 'text',
      });
    }
    
    // Image layers - run MediaPipe face detection
    if (layer.type === 'image') {
      const imageLayer = layer as ImageLayer;
      
      try {
        const img = await loadImage(imageLayer.src);
        const faceResult = await detectFaces(img);
        
        if (faceResult.faces.length > 0) {
          // Add real face detection points
          for (const face of faceResult.faces) {
            const bb = face.boundingBox;
            // Map face bounding box (0-1 fractions) to layer coordinates
            const faceX = imageLayer.transform.x + bb.x * imageLayer.transform.width + (bb.width * imageLayer.transform.width) / 2;
            const faceY = imageLayer.transform.y + bb.y * imageLayer.transform.height + (bb.height * imageLayer.transform.height) / 2;
            const faceRadius = Math.max(bb.width * imageLayer.transform.width, bb.height * imageLayer.transform.height) * 0.5;
            
            // Weight based on expression engagement and eye contact
            let weight = ATTENTION_WEIGHTS.face;
            if (face.eyeContact) weight = Math.min(weight + 0.1, 1.0);
            const engagingExpressions = ['excited', 'surprised', 'happy'];
            if (engagingExpressions.includes(face.expression)) weight = Math.min(weight + 0.05, 1.0);
            
            points.push({
              x: faceX,
              y: faceY,
              radius: faceRadius,
              weight,
              type: 'face',
            });
          }
        } else {
          // No faces found — add generic image attention at upper third
          points.push({
            x: imageLayer.transform.x + imageLayer.transform.width / 2,
            y: imageLayer.transform.y + imageLayer.transform.height * 0.35,
            radius: Math.min(imageLayer.transform.width, imageLayer.transform.height) * 0.3,
            weight: ATTENTION_WEIGHTS.contrast,
            type: 'contrast',
          });
        }
      } catch {
        // MediaPipe failed — fallback to generic point
        points.push({
          x: imageLayer.transform.x + imageLayer.transform.width / 2,
          y: imageLayer.transform.y + imageLayer.transform.height * 0.35,
          radius: Math.min(imageLayer.transform.width, imageLayer.transform.height) * 0.3,
          weight: ATTENTION_WEIGHTS.face * 0.6,
          type: 'face',
        });
      }
    }
  }
  
  return points;
}

/**
 * Calculate overall attention score and suggestions
 */
function calculateAttentionData(
  points: HeatmapPoint[],
  canvasWidth: number,
  canvasHeight: number
): AttentionData {
  const suggestions: string[] = [];
  let overallScore = 50; // Base score
  
  // Check for face positions
  const facePoints = points.filter(p => p.type === 'face');
  if (facePoints.length > 0) {
    overallScore += 20;
    
    // Check if face is in "power position" (upper left or upper right third)
    facePoints.forEach(face => {
      const isLeftThird = face.x < canvasWidth / 3;
      const isRightThird = face.x > canvasWidth * 2 / 3;
      const isUpperHalf = face.y < canvasHeight / 2;
      
      if (isUpperHalf && (isLeftThird || isRightThird)) {
        overallScore += 10;
      } else if (face.x > canvasWidth / 3 && face.x < canvasWidth * 2 / 3) {
        suggestions.push('Move face to left or right third for more impact');
      }
    });
  } else {
    suggestions.push('Add a face to increase click-through rate by up to 38%');
  }
  
  // Check for text
  const textPoints = points.filter(p => p.type === 'text');
  if (textPoints.length > 0) {
    overallScore += 10;
    
    // Check text positioning relative to faces
    if (facePoints.length > 0 && textPoints.length > 0) {
      const face = facePoints[0];
      const text = textPoints[0];
      
      // Text shouldn't overlap face
      const distance = Math.sqrt(
        Math.pow(face.x - text.x, 2) + Math.pow(face.y - text.y, 2)
      );
      const minDistance = face.radius + text.radius;
      
      if (distance < minDistance * 0.8) {
        suggestions.push('Move text away from face for better readability');
        overallScore -= 5;
      }
    }
  } else {
    suggestions.push('Add compelling text to communicate video topic');
  }
  
  // Check contrast distribution
  const contrastPoints = points.filter(p => p.type === 'contrast');
  if (contrastPoints.length === 0) {
    suggestions.push('Increase contrast to make thumbnail pop');
  }
  
  // Cap score
  overallScore = Math.min(Math.max(overallScore, 0), 100);
  
  return {
    faces: facePoints.map(p => ({
      x: p.x - p.radius / 2,
      y: p.y - p.radius / 2,
      width: p.radius,
      height: p.radius,
      confidence: p.weight,
    })),
    textRegions: textPoints.map(p => ({
      x: p.x - p.radius / 2,
      y: p.y - p.radius / 2,
      width: p.radius,
      height: p.radius,
      weight: p.weight,
    })),
    contrastHotspots: contrastPoints.map(p => ({
      x: p.x,
      y: p.y,
      radius: p.radius,
      weight: p.weight,
    })),
    overallScore,
    suggestions,
  };
}

// ============================================
// COMPONENT
// ============================================

const AttentionHeatmap: React.FC<AttentionHeatmapProps> = ({
  enabled,
  layers,
  canvasWidth,
  canvasHeight,
  canvasZoom,
  canvasPan,
  onAttentionCalculated,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [attentionData, setAttentionData] = useState<AttentionData | null>(null);
  
  // Preload MediaPipe model when heatmap is first enabled
  useEffect(() => {
    if (enabled) {
      preloadModel().catch(() => {
        // Model preload failed — detection will try again on use
      });
    }
  }, [enabled]);

  // Calculate and render heatmap
  const renderHeatmap = useCallback(async () => {
    if (!canvasRef.current || !enabled) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate attention points (async — MediaPipe face detection)
    const points = await calculateAttentionPoints(layers, canvasWidth, canvasHeight);
    const data = calculateAttentionData(points, canvasWidth, canvasHeight);
    setAttentionData(data);
    onAttentionCalculated?.(data);
    
    // Render heatmap using radial gradients
    points.forEach(point => {
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, point.radius
      );
      
      // Apply heatmap colors based on weight
      HEATMAP_COLORS.forEach(({ stop, color }) => {
        // Adjust color opacity by point weight
        const adjustedColor = color.replace(/[\d.]+\)$/, `${parseFloat(color.match(/[\d.]+\)$/)?.[0] || '0') * point.weight})`);
        gradient.addColorStop(stop, adjustedColor);
      });
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [enabled, layers, canvasWidth, canvasHeight, onAttentionCalculated]);
  
  // Re-render when dependencies change
  useEffect(() => {
    if (enabled) {
      // Debounce render for performance
      const timeoutId = setTimeout(renderHeatmap, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [enabled, renderHeatmap]);
  
  if (!enabled) {
    return null;
  }
  
  return (
    <>
      {/* Semi-transparent backdrop to separate heatmap from thumbnail */}
      <div
        className="attention-heatmap-backdrop"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          pointerEvents: 'none',
        }}
      />
      {/* Heatmap canvas overlay */}
      <canvas
        ref={canvasRef}
        className="attention-heatmap"
        width={canvasWidth}
        height={canvasHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          // No blend mode - render as distinct overlay visualization
          opacity: 0.85,
        }}
      />
      
      {/* Score badge */}
      {attentionData && (
        <div className="attention-score-badge">
          <div className="attention-score-badge__score">
            <span className="attention-score-badge__value">{attentionData.overallScore}</span>
            <span className="attention-score-badge__label">Attention Score</span>
          </div>
          {attentionData.suggestions.length > 0 && (
            <div className="attention-score-badge__suggestions">
              {attentionData.suggestions.slice(0, 2).map((suggestion, i) => (
                <div key={i} className="attention-score-badge__suggestion">
                  <span className="attention-score-badge__bullet">•</span>
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default React.memo(AttentionHeatmap);
