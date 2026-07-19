/**
 * MobileLayerSelector Component
 * Horizontal scrollable layer thumbnails for easy layer switching
 * Supports tap to select, shows all layers from desktop editor
 */

import React, { useMemo } from 'react';
import { Image, Type, Square, Brush, Layers } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Layer } from '../types/editor.types';

interface MobileLayerSelectorProps {
  layers: Layer[];
  layerOrder: string[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  className?: string;
}

// Get icon for layer type
function getLayerIcon(type: Layer['type']) {
  switch (type) {
    case 'image':
      return <Image size={16} />;
    case 'text':
      return <Type size={16} />;
    case 'shape':
      return <Square size={16} />;
    case 'drawing':
      return <Brush size={16} />;
    case 'group':
      return <Layers size={16} />;
    default:
      return <Image size={16} />;
  }
}

// Generate a simple preview for the layer
function LayerPreview({ layer }: { layer: Layer }) {
  if (layer.type === 'image' && 'src' in layer) {
    return (
      <img
        src={layer.src}
        alt={layer.name}
        className="w-full h-full object-cover"
        draggable={false}
      />
    );
  }

  if (layer.type === 'text' && 'content' in layer) {
    return (
      <div
        className="w-full h-full flex items-center justify-center p-1 text-[8px] text-white overflow-hidden"
        style={{
          fontFamily: layer.fontFamily,
          color: layer.fill,
        }}
      >
        {layer.content.substring(0, 10)}
      </div>
    );
  }

  if (layer.type === 'shape' && 'fill' in layer) {
    return (
      <div
        className="w-3/4 h-3/4 m-auto"
        style={{
          backgroundColor: layer.fill,
          borderRadius: layer.shapeType === 'ellipse' ? '50%' : 4,
        }}
      />
    );
  }

  // Default placeholder
  return (
    <div className="w-full h-full flex items-center justify-center text-gray-500">
      {getLayerIcon(layer.type)}
    </div>
  );
}

export function MobileLayerSelector({
  layers,
  layerOrder,
  selectedLayerId,
  onSelectLayer,
  className,
}: MobileLayerSelectorProps) {
  // Order layers according to layerOrder, filter visible
  const orderedLayers = useMemo(() => {
    return layerOrder
      .map(id => layers.find(l => l.id === id))
      .filter((l): l is Layer => l !== undefined);
  }, [layers, layerOrder]);

  if (orderedLayers.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-20',
        'bg-[#1a1a2e]/95 backdrop-blur-sm',
        'border-b border-gray-700/50',
        'safe-area-inset-top',  // Respect iOS notch
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
        {/* Layer count indicator */}
        <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-400">
          <Layers size={14} />
          <span>{orderedLayers.length}</span>
        </div>

        {/* Layer thumbnails */}
        {orderedLayers.map((layer) => {
          const isSelected = selectedLayerId === layer.id;
          const isVisible = layer.visible;

          return (
            <button
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={cn(
                // Base - minimum 48px touch target
                'flex-shrink-0',
                'w-16 h-16',
                'rounded-lg overflow-hidden',
                'border-2 transition-all duration-200',
                'touch-manipulation',
                // Selection state
                isSelected
                  ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'border-gray-600 hover:border-gray-500',
                // Visibility state
                !isVisible && 'opacity-40'
              )}
              aria-label={`Select ${layer.name}`}
              aria-pressed={isSelected}
            >
              <div className="relative w-full h-full bg-gray-800">
                <LayerPreview layer={layer} />

                {/* Layer type badge */}
                <div className="absolute bottom-0.5 right-0.5 p-0.5 bg-black/60 rounded text-white">
                  {getLayerIcon(layer.type)}
                </div>

                {/* Hidden indicator */}
                {!isVisible && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-xs text-gray-400">Hidden</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected layer name */}
      {selectedLayerId && (
        <div className="px-3 pb-2">
          <span className="text-xs text-gray-400">
            Selected: {orderedLayers.find(l => l.id === selectedLayerId)?.name || 'None'}
          </span>
        </div>
      )}
    </div>
  );
}

export default MobileLayerSelector;
