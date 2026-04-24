/**
 * Smart Select Tool
 * 
 * AI-powered object selection using Segment Anything Model (SAM)
 * Click on any object to create a pixel-perfect selection mask
 * 
 * Features:
 * - Click to select: Single click auto-detects and selects object
 * - Add to selection: Shift+click adds to existing selection
 * - Subtract from selection: Alt+click removes from existing selection
 * - Marching ants visualization for active selection
 */

import React, { useCallback, useState, useEffect } from 'react';
import type { SmartSelectionState } from '../types/editor.types';

// ============================================
// TYPES
// ============================================

interface SmartSelectToolProps {
  enabled: boolean;
  canvasWidth: number;
  canvasHeight: number;
  canvasZoom: number;
  canvasPan: { x: number; y: number };
  smartSelection: SmartSelectionState;
  onSelectionChange: (selection: Partial<SmartSelectionState>) => void;
  onClearSelection: () => void;
  // Function to get current canvas image as base64
  getCanvasImage: () => Promise<string | null>;
  // Function to call SAM segmentation
  onSegment?: (request: {
    image: string;
    points: { x: number; y: number; label: 'foreground' | 'background' }[];
  }) => Promise<{ mask: string; bounds: { x: number; y: number; width: number; height: number } } | null>;
}

interface SelectionPoint {
  x: number;
  y: number;
  label: 'foreground' | 'background';
}

// ============================================
// CONSTANTS
// ============================================

const MARCHING_ANT_DASH = [5, 5];
const MARCHING_ANT_SPEED = 50; // ms per frame

// ============================================
// COMPONENT
// ============================================

const SmartSelectTool: React.FC<SmartSelectToolProps> = ({
  enabled,
  canvasWidth,
  canvasHeight,
  canvasZoom,
  canvasPan,
  smartSelection,
  onSelectionChange,
  onClearSelection,
  getCanvasImage,
  onSegment,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [clickPoints, setClickPoints] = useState<SelectionPoint[]>([]);
  const [marchingAntOffset, setMarchingAntOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Marching ants animation
  useEffect(() => {
    if (!smartSelection.active || !smartSelection.mask) return;

    const interval = setInterval(() => {
      setMarchingAntOffset(prev => (prev + 1) % 10);
    }, MARCHING_ANT_SPEED);

    return () => clearInterval(interval);
  }, [smartSelection.active, smartSelection.mask]);

  // Handle click on canvas for selection
  const handleCanvasClick = useCallback(async (
    clientX: number,
    clientY: number,
    shiftKey: boolean,
    altKey: boolean
  ) => {
    if (!enabled || isProcessing || !onSegment) return;

    // Convert client coordinates to canvas coordinates
    const canvasRect = document.querySelector('.canvas-container')?.getBoundingClientRect();
    if (!canvasRect) return;

    const canvasX = (clientX - canvasRect.left - canvasPan.x) / canvasZoom;
    const canvasY = (clientY - canvasRect.top - canvasPan.y) / canvasZoom;

    // Determine selection mode based on modifiers
    let mode: SmartSelectionState['mode'] = 'replace';
    if (shiftKey) mode = 'add';
    if (altKey) mode = 'subtract';

    // Create point for SAM
    const newPoint: SelectionPoint = {
      x: Math.round(canvasX),
      y: Math.round(canvasY),
      label: altKey ? 'background' : 'foreground',
    };

    // Update points based on mode
    let points: SelectionPoint[];
    if (mode === 'replace') {
      points = [newPoint];
    } else {
      points = [...clickPoints, newPoint];
    }
    setClickPoints(points);

    setIsProcessing(true);
    setError(null);

    try {
      // Get current canvas image
      const canvasImage = await getCanvasImage();
      if (!canvasImage) {
        throw new Error('Failed to capture canvas image');
      }

      // Call SAM segmentation
      const result = await onSegment({
        image: canvasImage,
        points,
      });

      if (result) {
        // Update selection state
        onSelectionChange({
          active: true,
          mask: result.mask,
          bounds: result.bounds,
          mode,
          confidence: 1.0,
        });
      } else {
        setError('No object detected at this location');
      }
    } catch (err) {
      console.error('Smart selection error:', err);
      setError(err instanceof Error ? err.message : 'Selection failed');
    } finally {
      setIsProcessing(false);
    }
  }, [enabled, isProcessing, onSegment, canvasPan, canvasZoom, clickPoints, getCanvasImage, onSelectionChange]);

  // Clear selection on Escape
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && smartSelection.active) {
        onClearSelection();
        setClickPoints([]);
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, smartSelection.active, onClearSelection]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Click handler overlay */}
      <div
        className="smart-select-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: isProcessing ? 'wait' : 'crosshair',
          zIndex: 100,
          pointerEvents: 'auto', // Must be auto to receive clicks
        }}
        onClick={(e) => {
          handleCanvasClick(e.clientX, e.clientY, e.shiftKey, e.altKey);
        }}
      />

      {/* Selection mask overlay with marching ants */}
      {smartSelection.active && smartSelection.mask && (
        <svg
          className="smart-select-mask"
          width={canvasWidth}
          height={canvasHeight}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 101,
          }}
        >
          <defs>
            {/* Mask from base64 image */}
            <mask id="selection-mask">
              <image
                href={`data:image/png;base64,${smartSelection.mask}`}
                width={canvasWidth}
                height={canvasHeight}
              />
            </mask>
          </defs>

          {/* Selection overlay (semi-transparent outside selection) */}
          <rect
            x="0"
            y="0"
            width={canvasWidth}
            height={canvasHeight}
            fill="rgba(0, 0, 0, 0.3)"
            mask="url(#selection-mask)"
            style={{ maskComposite: 'exclude' }}
          />

          {/* Marching ants border */}
          {smartSelection.bounds && (
            <rect
              x={smartSelection.bounds.x}
              y={smartSelection.bounds.y}
              width={smartSelection.bounds.width}
              height={smartSelection.bounds.height}
              fill="none"
              stroke="#000"
              strokeWidth="1"
              strokeDasharray={MARCHING_ANT_DASH.join(',')}
              strokeDashoffset={marchingAntOffset}
            />
          )}
          {smartSelection.bounds && (
            <rect
              x={smartSelection.bounds.x}
              y={smartSelection.bounds.y}
              width={smartSelection.bounds.width}
              height={smartSelection.bounds.height}
              fill="none"
              stroke="#fff"
              strokeWidth="1"
              strokeDasharray={MARCHING_ANT_DASH.join(',')}
              strokeDashoffset={marchingAntOffset + 5}
            />
          )}
        </svg>
      )}

      {/* Click point indicators */}
      {clickPoints.length > 0 && (
        <svg
          className="smart-select-points"
          width={canvasWidth}
          height={canvasHeight}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 102,
          }}
        >
          {clickPoints.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r={6}
                fill={point.label === 'foreground' ? '#22c55e' : '#ef4444'}
                stroke="#fff"
                strokeWidth={2}
              />
              {point.label === 'background' && (
                <>
                  <line
                    x1={point.x - 3}
                    y1={point.y - 3}
                    x2={point.x + 3}
                    y2={point.y + 3}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                  <line
                    x1={point.x - 3}
                    y1={point.y + 3}
                    x2={point.x + 3}
                    y2={point.y - 3}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                </>
              )}
            </g>
          ))}
        </svg>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="smart-select-processing">
          <div className="smart-select-processing__spinner" />
          <span className="smart-select-processing__text">Detecting object...</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="smart-select-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Instructions tooltip */}
      {!smartSelection.active && !isProcessing && (
        <div className="smart-select-hint">
          <span>Click to select object</span>
          <span className="smart-select-hint__modifier">Shift+click: Add | Alt+click: Subtract</span>
        </div>
      )}
    </>
  );
};

export default React.memo(SmartSelectTool);
