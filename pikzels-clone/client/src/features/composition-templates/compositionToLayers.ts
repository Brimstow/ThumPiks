/**
 * Composition → Editor Layer Converter
 *
 * Converts a LayoutPreset + CompositionState into an array of
 * editor Layer objects (ImageLayer, TextLayer) ready to be dispatched
 * into the Advanced Editor's layer stack via ADD_LAYER actions.
 */

import type {
  LayoutPreset,
  CompositionState,
} from './types';
import { CompositionEngine } from './composition-engine';
import type { LayerDescriptor, TextLayerDescriptor } from './composition-engine';
import type {
  Layer,
  ImageLayer,
  TextLayer,
  BlendMode,
} from '../../components/editor/types/editor.types';

// ============================================
// HELPERS
// ============================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function mapBlendMode(mode: string): BlendMode {
  const valid: BlendMode[] = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'color-burn', 'hard-light', 'soft-light',
    'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
  ];
  return valid.includes(mode as BlendMode) ? (mode as BlendMode) : 'normal';
}

// ============================================
// CONVERTER
// ============================================

export interface ConvertedLayers {
  layers: Layer[];
  layerOrder: string[];  // sorted bottom → top
}

/**
 * Convert a composition template + fills into editor-compatible layers.
 *
 * Each filled image slot becomes an `ImageLayer` and each text slot
 * becomes a `TextLayer`, all with proper transforms, blend modes,
 * opacity, and z-ordering.
 */
export function compositionToLayers(
  template: LayoutPreset,
  state: CompositionState
): ConvertedLayers {
  const { imageLayers, textLayers } = CompositionEngine.buildLayerStack(template, state);

  const layers: Layer[] = [];
  const layerOrder: string[] = [];

  // Merge & sort all by zIndex
  type Entry = { zIndex: number; type: 'image' | 'text'; data: LayerDescriptor | TextLayerDescriptor };
  const all: Entry[] = [
    ...imageLayers.map(l => ({ zIndex: l.zIndex, type: 'image' as const, data: l })),
    ...textLayers.map(l => ({ zIndex: l.zIndex, type: 'text' as const, data: l })),
  ].sort((a, b) => a.zIndex - b.zIndex);

  for (const entry of all) {
    if (entry.type === 'image') {
      const d = entry.data as LayerDescriptor;
      const id = generateId();
      const imgLayer: ImageLayer = {
        id,
        name: `${d.role}: ${d.slotId}`,
        type: 'image',
        visible: true,
        locked: false,
        opacity: d.opacity,
        blendMode: mapBlendMode(d.blendMode),
        transform: {
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          skewX: 0,
          skewY: 0,
        },
        effects: [],
        src: d.imageUrl,
        originalWidth: d.width,
        originalHeight: d.height,
        filters: {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          hue: 0,
          blur: 0,
          sharpen: 0,
          noise: 0,
          sepia: 0,
          grayscale: 0,
          invert: 0,
        },
      };
      layers.push(imgLayer);
      layerOrder.push(id);
    } else {
      const d = entry.data as TextLayerDescriptor;
      const id = generateId();
      const textLayer: TextLayer = {
        id,
        name: `Text: ${d.content.substring(0, 20)}`,
        type: 'text',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        transform: {
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          skewX: 0,
          skewY: 0,
        },
        effects: [],
        content: d.content,
        fontFamily: d.style.fontFamily,
        fontSize: d.style.fontSize,
        fontWeight: d.style.fontWeight,
        fontStyle: 'normal',
        textAlign: d.style.textAlign,
        verticalAlign: 'middle',
        fill: d.style.color,
        stroke: d.style.stroke,
        strokeWidth: d.style.strokeWidth,
        letterSpacing: 0,
        lineHeight: 1.2,
        textDecoration: 'none',
        textTransform: (d.style.textTransform as TextLayer['textTransform']) || 'none',
      };
      layers.push(textLayer);
      layerOrder.push(id);
    }
  }

  return { layers, layerOrder };
}
