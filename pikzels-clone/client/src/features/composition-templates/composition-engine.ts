/**
 * Composition Engine
 *
 * Renders a LayoutPreset + SlotFills onto a canvas element.
 * Also provides conversion utilities to emit editor Layer[] stacks
 * for the Advanced Editor, or flat data-URL images for Quick Edit.
 */

import type {
  LayoutPreset,
  CompositionTextSlot,
  SlotFill,
  CompositionState,
} from './types';

// ============================================
// TYPES
// ============================================

export interface RenderOptions {
  /** Target width (defaults to template canvasWidth) */
  width?: number;
  /** Target height (defaults to template canvasHeight) */
  height?: number;
  /** Image format for output */
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Quality 0–1 for jpeg/webp */
  quality?: number;
}

export interface LayerDescriptor {
  slotId: string;
  role: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  blendMode: string;
  filter?: string;
  zIndex: number;
  mask?: string;
  maskPath?: string;
}

export interface TextLayerDescriptor {
  slotId: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  style: CompositionTextSlot['defaultStyle'];
}

// ============================================
// ENGINE
// ============================================

export class CompositionEngine {
  /**
   * Convert a template + fills into an ordered array of layer descriptors.
   * This is the universal intermediate representation consumed by both
   * Quick Edit (canvas render) and Advanced Editor (layer import).
   */
  static buildLayerStack(
    template: LayoutPreset,
    state: CompositionState
  ): { imageLayers: LayerDescriptor[]; textLayers: TextLayerDescriptor[] } {
    const w = template.canvasWidth;
    const h = template.canvasHeight;

    // Map slot fills by id for quick lookup
    const fillMap = new Map(state.slotFills.map(f => [f.slotId, f]));
    const textFillMap = new Map(state.textFills.map(f => [f.slotId, f]));

    // Build image layers from filled slots
    const imageLayers: LayerDescriptor[] = template.slots
      .filter(slot => fillMap.has(slot.id))
      .map(slot => {
        const fill = fillMap.get(slot.id)!;
        return {
          slotId: slot.id,
          role: slot.role,
          imageUrl: fill.imageUrl,
          x: Math.round(slot.bounds.x * w),
          y: Math.round(slot.bounds.y * h),
          width: Math.round(slot.bounds.width * w),
          height: Math.round(slot.bounds.height * h),
          opacity: slot.opacity,
          blendMode: slot.blendMode,
          filter: slot.filter,
          zIndex: slot.zIndex,
          mask: slot.mask !== 'none' ? slot.mask : undefined,
          maskPath: slot.maskPath,
        };
      })
      .sort((a, b) => a.zIndex - b.zIndex);

    // Build text layers
    const textLayers: TextLayerDescriptor[] = template.textSlots
      .map(ts => {
        const fill = textFillMap.get(ts.id);
        const content = fill?.content || ts.placeholder;
        const style = fill?.styleOverrides
          ? { ...ts.defaultStyle, ...fill.styleOverrides }
          : ts.defaultStyle;

        return {
          slotId: ts.id,
          content,
          x: Math.round(ts.bounds.x * w),
          y: Math.round(ts.bounds.y * h),
          width: Math.round(ts.bounds.width * w),
          height: Math.round(ts.bounds.height * h),
          zIndex: ts.zIndex,
          style,
        };
      })
      .sort((a, b) => a.zIndex - b.zIndex);

    return { imageLayers, textLayers };
  }

  /**
   * Render the composition to a flat image (data URL).
   * Used by Quick Edit for preview and export.
   */
  static async renderToDataUrl(
    template: LayoutPreset,
    state: CompositionState,
    options: RenderOptions = {}
  ): Promise<string> {
    const width = options.width ?? template.canvasWidth;
    const height = options.height ?? template.canvasHeight;
    const format = options.format ?? 'image/png';
    const quality = options.quality ?? 0.92;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Scale factor from template reference to target size
    const sx = width / template.canvasWidth;
    const sy = height / template.canvasHeight;

    // Draw fallback background
    if (template.fallbackBackground) {
      if (template.fallbackBackground.startsWith('linear-gradient')) {
        // Simple gradient parse for common case
        ctx.fillStyle = '#1a1a2e';
      } else {
        ctx.fillStyle = template.fallbackBackground;
      }
      ctx.fillRect(0, 0, width, height);
    }

    const { imageLayers, textLayers } = this.buildLayerStack(template, state);

    // Merge and sort all layers by zIndex
    type AnyLayer = { zIndex: number; type: 'image' | 'text'; data: LayerDescriptor | TextLayerDescriptor };
    const allLayers: AnyLayer[] = [
      ...imageLayers.map(l => ({ zIndex: l.zIndex, type: 'image' as const, data: l })),
      ...textLayers.map(l => ({ zIndex: l.zIndex, type: 'text' as const, data: l })),
    ].sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of allLayers) {
      if (layer.type === 'image') {
        await this.drawImageLayer(ctx, layer.data as LayerDescriptor, sx, sy);
      } else {
        this.drawTextLayer(ctx, layer.data as TextLayerDescriptor, sx, sy);
      }
    }

    return canvas.toDataURL(format, quality);
  }

  // ============================================
  // PRIVATE RENDERERS
  // ============================================

  private static async drawImageLayer(
    ctx: CanvasRenderingContext2D,
    layer: LayerDescriptor,
    sx: number,
    sy: number
  ): Promise<void> {
    const img = await this.loadImage(layer.imageUrl);

    const x = layer.x * sx;
    const y = layer.y * sy;
    const w = layer.width * sx;
    const h = layer.height * sy;

    ctx.save();

    // Opacity
    ctx.globalAlpha = layer.opacity / 100;

    // Blend mode
    ctx.globalCompositeOperation = this.mapBlendMode(layer.blendMode);

    // Apply mask clip path if needed
    if (layer.mask === 'diagonal-left') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.clip();
    } else if (layer.mask === 'diagonal-right') {
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.clip();
    } else if (layer.mask === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.clip();
    }

    // Apply filter
    if (layer.filter) {
      ctx.filter = layer.filter;
    }

    // Draw image (cover fit: scale to fill, center-crop)
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const slotAspect = w / h;

    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (imgAspect > slotAspect) {
      // Image is wider — fit height, crop sides
      drawH = h;
      drawW = h * imgAspect;
      drawX = x + (w - drawW) / 2;
      drawY = y;
    } else {
      // Image is taller — fit width, crop top/bottom
      drawW = w;
      drawH = w / imgAspect;
      drawX = x;
      drawY = y + (h - drawH) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    ctx.restore();
  }

  private static drawTextLayer(
    ctx: CanvasRenderingContext2D,
    layer: TextLayerDescriptor,
    sx: number,
    sy: number
  ): void {
    const x = layer.x * sx;
    const y = layer.y * sy;
    const w = layer.width * sx;
    const h = layer.height * sy;
    const fontSize = layer.style.fontSize * Math.min(sx, sy);

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const text = layer.style.textTransform === 'uppercase'
      ? layer.content.toUpperCase()
      : layer.style.textTransform === 'lowercase'
        ? layer.content.toLowerCase()
        : layer.content;

    ctx.font = `${layer.style.fontWeight} ${fontSize}px ${layer.style.fontFamily}`;
    ctx.textBaseline = 'top';

    // Align
    let textX = x;
    if (layer.style.textAlign === 'center') {
      ctx.textAlign = 'center';
      textX = x + w / 2;
    } else if (layer.style.textAlign === 'right') {
      ctx.textAlign = 'right';
      textX = x + w;
    } else {
      ctx.textAlign = 'left';
    }

    const textY = y + h / 2 - fontSize / 2;

    // Stroke
    if (layer.style.stroke && layer.style.strokeWidth) {
      ctx.strokeStyle = layer.style.stroke;
      ctx.lineWidth = layer.style.strokeWidth * Math.min(sx, sy);
      ctx.lineJoin = 'round';
      ctx.strokeText(text, textX, textY, w);
    }

    // Fill
    ctx.fillStyle = layer.style.color;
    ctx.fillText(text, textX, textY, w);

    ctx.restore();
  }

  // ============================================
  // UTILITIES
  // ============================================

  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src.substring(0, 60)}...`));
      img.src = src;
    });
  }

  private static mapBlendMode(mode: string): GlobalCompositeOperation {
    const map: Record<string, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'hard-light': 'hard-light',
      'soft-light': 'soft-light',
    };
    return map[mode] || 'source-over';
  }

  /**
   * Check which required slots are still unfilled.
   */
  static getMissingSlots(
    template: LayoutPreset,
    state: CompositionState
  ): string[] {
    const filledIds = new Set(state.slotFills.map(f => f.slotId));
    return template.slots
      .filter(s => s.required && !filledIds.has(s.id))
      .map(s => s.label);
  }

  /**
   * Get slots that want auto-background-removal.
   */
  static getAutoRemoveBgSlots(
    template: LayoutPreset,
    state: CompositionState
  ): SlotFill[] {
    const autoSlotIds = new Set(
      template.slots.filter(s => s.autoRemoveBg).map(s => s.id)
    );
    return state.slotFills.filter(f => autoSlotIds.has(f.slotId));
  }
}
