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
  CompositionSlot,
} from './types';
import { CompositionEngine } from './composition-engine';
import type { LayerDescriptor, TextLayerDescriptor } from './composition-engine';
import type {
  Layer,
  ImageLayer,
  TextLayer,
  ShapeLayer,
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
// PLACEHOLDER SUPPORT
// ============================================

/**
 * Internal type for placeholder layer data before conversion to ShapeLayer
 */
interface PlaceholderEntry {
  slotId: string;
  label: string;
  role: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  required: boolean;
}

/**
 * Create a placeholder entry for an unfilled image slot.
 * This gets converted to a ShapeLayer with visual placeholder styling.
 */
function createPlaceholderLayer(
  slot: CompositionSlot,
  template: LayoutPreset,
  _groupId?: string
): PlaceholderEntry {
  const w = template.canvasWidth;
  const h = template.canvasHeight;
  
  return {
    slotId: slot.id,
    label: slot.label,
    role: slot.role,
    x: Math.round(slot.bounds.x * w),
    y: Math.round(slot.bounds.y * h),
    width: Math.round(slot.bounds.width * w),
    height: Math.round(slot.bounds.height * h),
    zIndex: slot.zIndex,
    required: slot.required,
  };
}

// ============================================
// CONVERTER
// ============================================

export interface ConvertedLayers {
  layers: Layer[];
  layerOrder: string[];  // sorted bottom → top
}

/**
 * Options for the compositionToLayers conversion
 */
export interface CompositionToLayersOptions {
  /**
   * Shared group ID to assign to all layers created from this conversion.
   * Used for Phase 3 bidirectional drag support to identify layers
   * that came from the same template drop.
   */
  groupId?: string;
}

/**
 * Convert a composition template + fills into editor-compatible layers.
 *
 * Each filled image slot becomes an `ImageLayer` and each text slot
 * becomes a `TextLayer`, all with proper transforms, blend modes,
 * opacity, and z-ordering.
 * 
 * UNFILLED SLOT HANDLING:
 * - Unfilled image slots become placeholder ShapeLayer with dashed border
 * - Text slots always render (using placeholder text if unfilled)
 * 
 * @param template - The layout preset to convert
 * @param state - The composition state with filled slots
 * @param options - Optional configuration (e.g., groupId for bidirectional drag)
 */
export function compositionToLayers(
  template: LayoutPreset,
  state: CompositionState,
  options: CompositionToLayersOptions = {}
): ConvertedLayers {
  const { groupId } = options;
  const { imageLayers, textLayers } = CompositionEngine.buildLayerStack(template, state);

  const layers: Layer[] = [];
  const layerOrder: string[] = [];

  // Track which image slots are filled
  const filledSlotIds = new Set(state.slotFills.map(f => f.slotId));

  // Create placeholder layers for unfilled image slots
  const placeholderLayers = template.slots
    .filter(slot => !filledSlotIds.has(slot.id))
    .map(slot => createPlaceholderLayer(slot, template, groupId))
    .sort((a, b) => a.zIndex - b.zIndex);

  // Merge & sort all by zIndex
  type Entry = { zIndex: number; type: 'image' | 'text' | 'placeholder'; data: LayerDescriptor | TextLayerDescriptor | PlaceholderEntry };
  const all: Entry[] = [
    ...imageLayers.map(l => ({ zIndex: l.zIndex, type: 'image' as const, data: l })),
    ...textLayers.map(l => ({ zIndex: l.zIndex, type: 'text' as const, data: l })),
    ...placeholderLayers.map(l => ({ zIndex: l.zIndex, type: 'placeholder' as const, data: l })),
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
        // Add groupId for bidirectional drag support (Phase 3)
        ...(groupId ? { groupId } : {}),
      };
      layers.push(imgLayer);
      layerOrder.push(id);
    } else if (entry.type === 'placeholder') {
      // Create placeholder shape layer for unfilled image slot
      const d = entry.data as PlaceholderEntry;
      const id = generateId();
      const placeholderLayer: ShapeLayer = {
        id,
        name: `📷 ${d.label} (drop image)`,
        type: 'shape',
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
        shapeType: 'rectangle',
        fill: 'rgba(99, 102, 241, 0.1)', // Subtle purple tint
        stroke: '#6366f1', // Accent purple
        strokeWidth: 2,
        cornerRadius: 4,
        // Add groupId for bidirectional drag support (Phase 3)
        ...(groupId ? { groupId } : {}),
      };
      layers.push(placeholderLayer);
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
        // Add groupId for bidirectional drag support (Phase 3)
        ...(groupId ? { groupId } : {}),
      };
      layers.push(textLayer);
      layerOrder.push(id);
    }
  }

  return { layers, layerOrder };
}
