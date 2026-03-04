/**
 * MobileCanvas Component
 * Touch-enabled canvas with pinch-zoom and pan support
 * Uses react-zoom-pan-pinch for gesture handling
 */

import React, { useCallback, useMemo } from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Layer, AdjustmentState } from '../types/editor.types';

interface MobileCanvasProps {
  layers: Layer[];
  selectedLayerId: string | null;
  adjustments: AdjustmentState;
  onLayerTap: (layerId: string) => void;
  className?: string;
}

// Zoom controls component
function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
      <button
        onClick={() => zoomIn()}
        className={cn(
          'w-12 h-12 rounded-full',
          'bg-black/60 backdrop-blur-sm',
          'flex items-center justify-center',
          'text-white',
          'active:bg-black/80',
          'touch-manipulation'
        )}
        aria-label="Zoom in"
      >
        <ZoomIn size={20} />
      </button>
      <button
        onClick={() => zoomOut()}
        className={cn(
          'w-12 h-12 rounded-full',
          'bg-black/60 backdrop-blur-sm',
          'flex items-center justify-center',
          'text-white',
          'active:bg-black/80',
          'touch-manipulation'
        )}
        aria-label="Zoom out"
      >
        <ZoomOut size={20} />
      </button>
      <button
        onClick={() => resetTransform()}
        className={cn(
          'w-12 h-12 rounded-full',
          'bg-black/60 backdrop-blur-sm',
          'flex items-center justify-center',
          'text-white',
          'active:bg-black/80',
          'touch-manipulation'
        )}
        aria-label="Reset view"
      >
        <RotateCcw size={20} />
      </button>
    </div>
  );
}

// Generate CSS filter string from adjustments
function getFilterStyle(adjustments: AdjustmentState): string {
  const filters: string[] = [];
  
  if (adjustments.brightness !== 100) {
    filters.push(`brightness(${adjustments.brightness / 100})`);
  }
  if (adjustments.contrast !== 100) {
    filters.push(`contrast(${adjustments.contrast / 100})`);
  }
  if (adjustments.saturation !== 100) {
    filters.push(`saturate(${adjustments.saturation / 100})`);
  }
  
  return filters.length > 0 ? filters.join(' ') : 'none';
}

export function MobileCanvas({
  layers,
  selectedLayerId,
  adjustments,
  onLayerTap,
  className,
}: MobileCanvasProps) {
  // Get ordered layers (visible only, bottom to top)
  const visibleLayers = useMemo(() => 
    layers.filter(l => l.visible),
    [layers]
  );

  // Handle tap on a layer
  const handleLayerClick = useCallback((e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    onLayerTap(layerId);
  }, [onLayerTap]);

  // Filter style for adjustments
  const filterStyle = useMemo(() => getFilterStyle(adjustments), [adjustments]);

  return (
    <div className={cn('relative w-full h-full bg-[#0a0a14]', className)}>
      <TransformWrapper
        initialScale={1}
        minScale={0.25}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
        doubleClick={{ disabled: false, step: 0.5 }}
        panning={{ velocityDisabled: false }}
      >
        <ZoomControls />
        <TransformComponent
          wrapperClass="w-full h-full"
          contentClass="flex items-center justify-center"
        >
          {/* Canvas container */}
          <div
            className="relative"
            style={{
              filter: filterStyle,
              // Default canvas size, will be overridden by actual image dimensions
              width: '100%',
              maxWidth: '100vw',
              maxHeight: '80vh',
            }}
          >
            {/* Render layers */}
            {visibleLayers.map((layer) => (
              <div
                key={layer.id}
                onClick={(e) => handleLayerClick(e, layer.id)}
                className={cn(
                  'absolute transition-shadow duration-200',
                  selectedLayerId === layer.id && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent'
                )}
                style={{
                  left: layer.transform.x,
                  top: layer.transform.y,
                  width: layer.transform.width,
                  height: layer.transform.height,
                  opacity: layer.opacity / 100,
                  transform: `rotate(${layer.transform.rotation}deg) scale(${layer.transform.scaleX}, ${layer.transform.scaleY})`,
                  transformOrigin: 'center center',
                  zIndex: visibleLayers.indexOf(layer),
                  // Ensure touch targets are large enough
                  minWidth: 48,
                  minHeight: 48,
                }}
              >
                {/* Image layer */}
                {layer.type === 'image' && 'src' in layer && (
                  <img
                    src={layer.src}
                    alt={layer.name}
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                )}

                {/* Text layer */}
                {layer.type === 'text' && 'content' in layer && (
                  <div
                    className="w-full h-full flex items-center justify-center pointer-events-none"
                    style={{
                      fontFamily: layer.fontFamily,
                      fontSize: layer.fontSize,
                      fontWeight: layer.fontWeight,
                      color: layer.fill,
                      textAlign: layer.textAlign as 'left' | 'center' | 'right',
                    }}
                  >
                    {layer.content}
                  </div>
                )}

                {/* Shape layer */}
                {layer.type === 'shape' && 'shapeType' in layer && (
                  <div
                    className="w-full h-full pointer-events-none"
                    style={{
                      backgroundColor: layer.fill,
                      border: `${layer.strokeWidth}px solid ${layer.stroke}`,
                      borderRadius: layer.shapeType === 'ellipse' ? '50%' : layer.cornerRadius,
                    }}
                  />
                )}
              </div>
            ))}

            {/* Empty state */}
            {visibleLayers.length === 0 && (
              <div className="flex items-center justify-center w-64 h-64 text-gray-500">
                <p>No image loaded</p>
              </div>
            )}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

export default MobileCanvas;
