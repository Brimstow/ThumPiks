import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { EditorState, Layer, LayerTransform, LayerEffect, GroupLayer, TextLayer } from '../types/editor.types';
import { parseTextShadow } from '../../../constants/text-styles';
import { INLINE_EDIT_STYLES } from '../../../hooks/useInlineTextEdit';
import { UploadZoneOverlay } from './UploadZoneOverlay';
import { TemplateGroupDragHandle } from '../../../features/drag-drop/components/TemplateGroupDragHandle';
import type { LayoutPreset } from '../../../features/composition-templates/types';

interface CanvasEngineProps {
  state: EditorState;
  onZoomChange: (zoom: number) => void;
  onPanChange: (panX: number, panY: number) => void;
  onLayerSelect: (layerId: string | null) => void;
  onDrawingUpdate?: (paths: any[]) => void;
  onShapeCreate?: (shapeType: 'rectangle' | 'ellipse' | 'line' | 'polygon', x: number, y: number, width: number, height: number, points?: { x: number; y: number }[]) => void;
  onTextCreate?: (x: number, y: number) => void;
  onColorPick?: (color: string) => void;
  onFillArea?: (x: number, y: number, color: string) => void;
  onCrop?: (x: number, y: number, width: number, height: number) => void;
  onToolChange?: (tool: string) => void;
  onLayerMove?: (layerId: string, x: number, y: number) => void;
  onGradientApply?: (startX: number, startY: number, endX: number, endY: number) => void;
  editingTextLayerId?: string | null;
  onTextEditStart?: (layerId: string) => void;
  onTextEditEnd?: () => void;
  onTextContentChange?: (layerId: string, content: string) => void;
  /** Callback when user fills an upload zone with an image */
  onFillUploadZone?: (layerId: string, imageSrc: string, imageWidth: number, imageHeight: number) => void;
  /** Callback when user clears a filled upload zone back to placeholder */
  onClearUploadZone?: (layerId: string) => void;
  /** Template being dragged over canvas — shows slot preview outlines */
  dragPreviewTemplate?: LayoutPreset | null;
  /** Callback when user removes a template group from canvas via drag handle */
  onRemoveTemplateGroup?: (groupId: string) => void;
  /** Called when a template-group layer drag leaves the canvas viewport */
  onTemplateDragOutside?: (info: { groupId: string; layerCount: number }) => void;
  /** Called when cursor re-enters canvas during an outside drag (cancel removal) */
  onTemplateDragReturn?: () => void;
  /** Move all layers in a template group at once (batch move, no history push) */
  onGroupMove?: (moves: Array<{ layerId: string; x: number; y: number }>) => void;
}

const CanvasEngine: React.FC<CanvasEngineProps> = ({
  state,
  onZoomChange,
  onPanChange,
  onLayerSelect,
  onDrawingUpdate,
  onShapeCreate,
  onTextCreate,
  onColorPick,
  onFillArea,
  onCrop,
  onToolChange,
  onLayerMove,
  onGradientApply,
  editingTextLayerId,
  onTextEditStart,
  onTextEditEnd,
  onTextContentChange,
  onFillUploadZone,
  onClearUploadZone,
  dragPreviewTemplate,
  onRemoveTemplateGroup,
  onTemplateDragOutside,
  onTemplateDragReturn,
  onGroupMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeCurrent, setShapeCurrent] = useState<{ x: number; y: number } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  // Move tool drag state
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragLayerStartTransform, setDragLayerStartTransform] = useState({ x: 0, y: 0 });

  // Drag-off-canvas state: when a template-group layer is dragged outside the viewport
  const [isDragOutside, setIsDragOutside] = useState(false);
  const dragOutsideGroupIdRef = useRef<string | null>(null);
  // Store start transforms of all layers in a template group for group dragging
  const groupDragStartTransformsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // Clone stamp state
  const [cloneSource, setCloneSource] = useState<{ x: number; y: number } | null>(null);
  
  // Gradient tool state
  const [gradientStart, setGradientStart] = useState<{ x: number; y: number } | null>(null);
  const [gradientEnd, setGradientEnd] = useState<{ x: number; y: number } | null>(null);

  // Image cache to store loaded HTMLImageElement objects
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(0); // Trigger re-render when images load

  const { canvas, layers, layerOrder, selection, activeTool, toolSettings, adjustments } = state;

  // Build CSS filter string from global adjustments (GPU-accelerated for live preview)
  const globalFilterString = useMemo(() => {
    if (!adjustments) return 'none';
    
    let filter = '';
    
    // Basic adjustments
    filter += `brightness(${adjustments.brightness}%) `;
    filter += `contrast(${adjustments.contrast}%) `;
    filter += `saturate(${adjustments.saturation}%) `;
    filter += `hue-rotate(${adjustments.hue}deg) `;
    filter += `blur(${adjustments.blur}px) `;
    
    // Sharpen (uses SVG filter reference)
    if (adjustments.sharpenEnabled) {
      filter += `url(#sharpen-${adjustments.sharpenStrength}) `;
    }
    
    // Preset filters
    if (adjustments.filter && adjustments.filter !== 'none') {
      switch (adjustments.filter) {
        case 'vintage':
          filter += 'sepia(50%) saturate(150%) contrast(90%) ';
          break;
        case 'blackwhite':
          filter += 'grayscale(100%) ';
          break;
        case 'sepia':
          filter += 'sepia(100%) ';
          break;
        case 'vibrant':
          filter += 'saturate(150%) contrast(110%) ';
          break;
        case 'cool':
          filter += 'hue-rotate(180deg) saturate(120%) ';
          break;
        case 'warm':
          filter += 'sepia(30%) saturate(130%) ';
          break;
      }
    }
    
    return filter.trim() || 'none';
  }, [adjustments]);

  // Build transform string from global adjustments
  const globalTransformString = useMemo(() => {
    if (!adjustments) return '';
    
    let transform = '';
    
    if (adjustments.rotation) {
      transform += `rotate(${adjustments.rotation}deg) `;
    }
    if (adjustments.flipHorizontal) {
      transform += 'scaleX(-1) ';
    }
    if (adjustments.flipVertical) {
      transform += 'scaleY(-1) ';
    }
    
    return transform.trim();
  }, [adjustments]);

  // Preload images when layers change
  useEffect(() => {
    const imageLayers = layers.filter(l => l.type === 'image') as any[];
    
    imageLayers.forEach(layer => {
      const src = layer.src;
      if (!src || imageCache.current.has(src)) return;
      
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS for external images
      img.onload = () => {
        imageCache.current.set(src, img);
        setImagesLoaded(prev => prev + 1); // Trigger re-render
      };
      img.onerror = () => {
        console.error('Failed to load image:', src);
      };
      img.src = src;
    });
  }, [layers]);

  // --- Effect rendering helpers ---

  /** Convert hex color + opacity (0-100) to rgba string */
  const hexToRgba = (hex: string, opacity: number): string => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  /** Apply pre-draw effects (shadow, glow, blur, bevel) to context before content render */
  const applyPreDrawEffects = (ctx: CanvasRenderingContext2D, effects: LayerEffect[]) => {
    for (const effect of effects) {
      if (!effect.enabled) continue;
      const s = effect.settings;

      switch (effect.type) {
        case 'shadow': {
          const color = (s.color as string) || '#000000';
          const opacity = (s.opacity as number) ?? 80;
          ctx.shadowColor = hexToRgba(color, opacity);
          ctx.shadowOffsetX = (s.offsetX as number) ?? 4;
          ctx.shadowOffsetY = (s.offsetY as number) ?? 4;
          ctx.shadowBlur = (s.blur as number) ?? 8;
          break;
        }
        case 'glow': {
          const color = (s.color as string) || '#FFFF00';
          const opacity = (s.opacity as number) ?? 90;
          ctx.shadowColor = hexToRgba(color, opacity);
          ctx.shadowOffsetX = (s.offsetX as number) ?? 0;
          ctx.shadowOffsetY = (s.offsetY as number) ?? 0;
          ctx.shadowBlur = (s.blur as number) ?? 15;
          break;
        }
        case 'blur': {
          const radius = (s.radius as number) ?? 4;
          ctx.filter = `blur(${radius}px)`;
          break;
        }
        case 'bevel': {
          // Bevel approximation: render a light shadow offset in one direction
          const lightColor = (s.lightColor as string) || '#FFFFFF';
          const opacity = (s.opacity as number) ?? 70;
          const depth = (s.depth as number) ?? 3;
          const angle = (s.angle as number) ?? 135;
          const rad = (angle * Math.PI) / 180;
          ctx.shadowColor = hexToRgba(lightColor, opacity);
          ctx.shadowOffsetX = Math.cos(rad) * depth;
          ctx.shadowOffsetY = Math.sin(rad) * depth;
          ctx.shadowBlur = depth;
          break;
        }
      }
    }
  };

  /** Apply post-draw effects (stroke) after content render */
  const applyPostDrawEffects = (ctx: CanvasRenderingContext2D, layer: Layer, effects: LayerEffect[]) => {
    for (const effect of effects) {
      if (!effect.enabled || effect.type !== 'stroke') continue;
      const s = effect.settings;
      const color = (s.color as string) || '#000000';
      const opacity = (s.opacity as number) ?? 100;
      const width = (s.width as number) ?? 3;
      const { width: lw, height: lh } = layer.transform;

      ctx.strokeStyle = hexToRgba(color, opacity);
      ctx.lineWidth = width;
      ctx.strokeRect(0, 0, lw, lh);
    }
  };

  /** Reset all effect-related ctx state */
  const resetEffectState = (ctx: CanvasRenderingContext2D) => {
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
    ctx.filter = 'none';
  };

  // Render all layers to canvas
  const renderLayers = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    // Clear canvas
    ctx.fillStyle = canvas.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render layers in order (bottom to top)
    layerOrder.forEach(layerId => {
      const layer = layers.find(l => l.id === layerId);
      if (!layer || !layer.visible) return;

      // Skip rendering group layer itself - children are rendered separately
      if (layer.type === 'group') {
        renderGroupLayer(ctx, layer as any, layers, layerOrder);
        return;
      }

      // Get parent transform if this layer is part of a group
      const parentTransform = layer.parentId 
        ? getParentTransform(layer.parentId, layers)
        : null;

      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;

      // Apply parent transform first (if part of a group)
      if (parentTransform) {
        ctx.translate(parentTransform.x + parentTransform.width / 2, parentTransform.y + parentTransform.height / 2);
        ctx.rotate((parentTransform.rotation * Math.PI) / 180);
        ctx.scale(parentTransform.scaleX * layer.transform.scaleX, parentTransform.scaleY * layer.transform.scaleY);
        ctx.translate(-parentTransform.width / 2, -parentTransform.height / 2);
      }

      // Apply layer's own transform
      const { x, y, width, height, rotation, scaleX, scaleY } = layer.transform;
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-width / 2, -height / 2);

      // Apply layer effects (pre-draw: shadow, glow, blur, bevel)
      const layerEffects: LayerEffect[] = (layer as any).effects || [];
      const enabledPreEffects = layerEffects.filter(
        e => e.enabled && e.type !== 'stroke'
      );
      if (enabledPreEffects.length > 0) {
        applyPreDrawEffects(ctx, enabledPreEffects);
      }

      // Render based on layer type
      switch (layer.type) {
        case 'image':
          renderImageLayer(ctx, layer as any);
          break;
        case 'text':
          // Skip canvas rendering when inline textarea is visible (prevents ghost/double text)
          if (editingTextLayerId !== layer.id) {
            renderTextLayer(ctx, layer as any);
          }
          break;
        case 'shape':
          renderShapeLayer(ctx, layer as any);
          break;
        case 'drawing':
          renderDrawingLayer(ctx, layer as any);
          break;
      }

      // Apply post-draw effects (stroke outline)
      const enabledPostEffects = layerEffects.filter(
        e => e.enabled && e.type === 'stroke'
      );
      if (enabledPostEffects.length > 0) {
        resetEffectState(ctx);
        applyPostDrawEffects(ctx, layer, enabledPostEffects);
      }

      // Reset effect state before restore
      if (enabledPreEffects.length > 0) {
        resetEffectState(ctx);
      }

      ctx.restore();
    });

    // Render selection overlay
    renderSelectionOverlay();
  }, [layers, layerOrder, canvas, selection, imagesLoaded, editingTextLayerId]);

  // Helper to get parent group's transform
  const getParentTransform = (parentId: string, layers: Layer[]): LayerTransform | null => {
    const parent = layers.find(l => l.id === parentId);
    if (!parent || parent.type !== 'group') return null;
    return parent.transform;
  };

  // Render a group layer by rendering its children
  const renderGroupLayer = (
    ctx: CanvasRenderingContext2D,
    groupLayer: GroupLayer,
    layers: Layer[],
    _layerOrder: string[]
  ) => {
    const { x, y, width, height, rotation, scaleX, scaleY } = groupLayer.transform;
    
    ctx.save();
    ctx.globalAlpha = groupLayer.opacity / 100;
    ctx.globalCompositeOperation = groupLayer.blendMode as GlobalCompositeOperation;
    
    // Apply group transform
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-width / 2, -height / 2);
    
    // Render children in order
    groupLayer.children.forEach(childId => {
      const childLayer = layers.find(l => l.id === childId);
      if (!childLayer || !childLayer.visible) return;
      
      // Skip nested groups - they'll be handled when we encounter them in layerOrder
      if (childLayer.type === 'group') return;
      
      const { x: cx, y: cy, width: cw, height: ch, rotation: cr, scaleX: csx, scaleY: csy } = childLayer.transform;
      
      ctx.save();
      ctx.globalAlpha = (childLayer.opacity / 100);
      ctx.globalCompositeOperation = childLayer.blendMode as GlobalCompositeOperation;
      
      // Apply child's own transform (relative to group)
      ctx.translate(cx + cw / 2, cy + ch / 2);
      ctx.rotate((cr * Math.PI) / 180);
      ctx.scale(csx, csy);
      ctx.translate(-cw / 2, -ch / 2);
      
      switch (childLayer.type) {
        case 'image':
          renderImageLayer(ctx, childLayer as any);
          break;
        case 'text':
          if (editingTextLayerId !== childLayer.id) {
            renderTextLayer(ctx, childLayer as any);
          }
          break;
        case 'shape':
          renderShapeLayer(ctx, childLayer as any);
          break;
        case 'drawing':
          renderDrawingLayer(ctx, childLayer as any);
          break;
      }
      
      ctx.restore();
    });
    
    ctx.restore();
  };

  const renderImageLayer = (ctx: CanvasRenderingContext2D, layer: any) => {
    // Get cached image
    const img = imageCache.current.get(layer.src);
    if (!img) {
      // Image not loaded yet, draw placeholder
      ctx.fillStyle = '#2a2a3e';
      ctx.fillRect(0, 0, layer.transform.width, layer.transform.height);
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', layer.transform.width / 2, layer.transform.height / 2);
      return;
    }
    
    // Apply filters
    const { brightness, contrast, saturation, blur, grayscale, sepia } = layer.filters;
    ctx.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
      blur(${blur}px)
      grayscale(${grayscale}%)
      sepia(${sepia}%)
    `;
    ctx.drawImage(img, 0, 0, layer.transform.width, layer.transform.height);
    ctx.filter = 'none';
  };

  const renderTextLayer = (ctx: CanvasRenderingContext2D, layer: any) => {
    ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
    ctx.fillStyle = layer.fill;
    ctx.textAlign = layer.textAlign;
    ctx.textBaseline = 'top';

    const lines = layer.content.split('\n');
    const lineHeight = layer.fontSize * layer.lineHeight;
    // Vertical centering offset (match textarea paddingTop formula)
    const visibleTextHeight = lines.length === 1
      ? layer.fontSize
      : layer.fontSize + (lines.length - 1) * lineHeight;
    const vertOffset = Math.max(0, (layer.transform.height - visibleTextHeight) / 2);

    // Background banner
    if (layer.backgroundColor) {
      const pad = layer.backgroundPadding ?? 8;
      ctx.save();
      ctx.fillStyle = layer.backgroundColor;
      lines.forEach((line: string, i: number) => {
        const metrics = ctx.measureText(line);
        const textW = metrics.width;
        const x = layer.textAlign === 'center' ? layer.transform.width / 2 - textW / 2 :
                  layer.textAlign === 'right' ? layer.transform.width - textW : 0;
        const y = vertOffset + i * lineHeight;
        const radius = 4;
        const bx = x - pad;
        const by = y - pad / 2;
        const bw = textW + pad * 2;
        const bh = layer.fontSize + pad;
        ctx.beginPath();
        ctx.moveTo(bx + radius, by);
        ctx.lineTo(bx + bw - radius, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
        ctx.lineTo(bx + bw, by + bh - radius);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh);
        ctx.lineTo(bx + radius, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius);
        ctx.lineTo(bx, by + radius);
        ctx.quadraticCurveTo(bx, by, bx + radius, by);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }

    // Apply shadow from CSS textShadow string (skip if new-style effects already set shadow)
    const hasEffectShadow = ((layer as any).effects || []).some(
      (e: LayerEffect) => e.enabled && (e.type === 'shadow' || e.type === 'glow')
    );
    const shadow = (!hasEffectShadow && layer.textShadow) ? parseTextShadow(layer.textShadow) : null;
    if (shadow) {
      ctx.shadowOffsetX = shadow.offsetX;
      ctx.shadowOffsetY = shadow.offsetY;
      ctx.shadowBlur = shadow.blur;
      ctx.shadowColor = shadow.color;
    }

    // Stroke BEFORE fill so stroke appears behind the fill
    if (layer.stroke && layer.strokeWidth) {
      ctx.strokeStyle = layer.stroke;
      ctx.lineWidth = layer.strokeWidth;
      ctx.lineJoin = 'round';
      lines.forEach((line: string, i: number) => {
        const x = layer.textAlign === 'center' ? layer.transform.width / 2 :
                  layer.textAlign === 'right' ? layer.transform.width : 0;
        ctx.strokeText(line, x, vertOffset + i * lineHeight);
      });
    }

    // Fill text on top
    ctx.fillStyle = layer.fill;
    lines.forEach((line: string, i: number) => {
      const x = layer.textAlign === 'center' ? layer.transform.width / 2 :
                layer.textAlign === 'right' ? layer.transform.width : 0;
      ctx.fillText(line, x, vertOffset + i * lineHeight);
    });

    // Reset shadow state
    if (shadow) {
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }
  };

  const renderShapeLayer = (ctx: CanvasRenderingContext2D, layer: any) => {
    const { width, height } = layer.transform;

    ctx.fillStyle = layer.fill;
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = layer.strokeWidth;

    switch (layer.shapeType) {
      case 'rectangle':
        if (layer.cornerRadius) {
          roundRect(ctx, 0, 0, width, height, layer.cornerRadius);
        } else {
          ctx.fillRect(0, 0, width, height);
          if (layer.strokeWidth) ctx.strokeRect(0, 0, width, height);
        }
        break;
      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (layer.strokeWidth) ctx.stroke();
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.stroke();
        break;
    }
  };

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const renderDrawingLayer = (ctx: CanvasRenderingContext2D, layer: any) => {
    layer.paths.forEach((path: any) => {
      if (path.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = path.opacity / 100;

      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.slice(1).forEach((point: any) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
  };

  const renderSelectionOverlay = () => {
    const overlayCtx = overlayCanvasRef.current?.getContext('2d');
    if (!overlayCtx || !overlayCanvasRef.current) return;

    // Clear overlay
    overlayCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw selection boxes
    selection.layerIds.forEach(layerId => {
      const layer = layers.find(l => l.id === layerId);
      if (!layer) return;

      const { x, y, width, height } = layer.transform;

      overlayCtx.strokeStyle = '#3b82f6';
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([]);
      overlayCtx.strokeRect(x, y, width, height);

      // Draw handles
      const handleSize = 8;
      overlayCtx.fillStyle = '#ffffff';
      overlayCtx.strokeStyle = '#3b82f6';
      overlayCtx.lineWidth = 1;

      const handles = [
        { x: x - handleSize / 2, y: y - handleSize / 2 },
        { x: x + width / 2 - handleSize / 2, y: y - handleSize / 2 },
        { x: x + width - handleSize / 2, y: y - handleSize / 2 },
        { x: x + width - handleSize / 2, y: y + height / 2 - handleSize / 2 },
        { x: x + width - handleSize / 2, y: y + height - handleSize / 2 },
        { x: x + width / 2 - handleSize / 2, y: y + height - handleSize / 2 },
        { x: x - handleSize / 2, y: y + height - handleSize / 2 },
        { x: x - handleSize / 2, y: y + height / 2 - handleSize / 2 },
      ];

      handles.forEach(handle => {
        overlayCtx.fillRect(handle.x, handle.y, handleSize, handleSize);
        overlayCtx.strokeRect(handle.x, handle.y, handleSize, handleSize);
      });
    });

    // Draw current drawing path
    if (currentPath.length > 1 && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'pen')) {
      overlayCtx.beginPath();
      overlayCtx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : toolSettings.brush.color;
      overlayCtx.lineWidth = activeTool === 'eraser' ? toolSettings.eraser.size : toolSettings.brush.size;
      overlayCtx.lineCap = 'round';
      overlayCtx.lineJoin = 'round';
      overlayCtx.globalAlpha = activeTool === 'eraser' ? toolSettings.eraser.opacity / 100 : toolSettings.brush.opacity / 100;

      overlayCtx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.slice(1).forEach(point => {
        overlayCtx.lineTo(point.x, point.y);
      });
      overlayCtx.stroke();
    }

    // Draw shape preview
    if (shapeStart && shapeCurrent && (activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line')) {
      overlayCtx.strokeStyle = toolSettings.brush.color;
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([5, 5]);

      if (activeTool === 'rectangle') {
        const width = shapeCurrent.x - shapeStart.x;
        const height = shapeCurrent.y - shapeStart.y;
        overlayCtx.strokeRect(shapeStart.x, shapeStart.y, width, height);
      } else if (activeTool === 'ellipse') {
        const radiusX = Math.abs(shapeCurrent.x - shapeStart.x) / 2;
        const radiusY = Math.abs(shapeCurrent.y - shapeStart.y) / 2;
        const centerX = (shapeStart.x + shapeCurrent.x) / 2;
        const centerY = (shapeStart.y + shapeCurrent.y) / 2;
        overlayCtx.beginPath();
        overlayCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        overlayCtx.stroke();
      } else if (activeTool === 'line') {
        overlayCtx.beginPath();
        overlayCtx.moveTo(shapeStart.x, shapeStart.y);
        overlayCtx.lineTo(shapeCurrent.x, shapeCurrent.y);
        overlayCtx.stroke();
      }

      overlayCtx.setLineDash([]);
    }

    // Draw polygon preview
    if (polygonPoints.length > 0 && activeTool === 'polygon') {
      overlayCtx.strokeStyle = toolSettings.shape.stroke;
      overlayCtx.fillStyle = toolSettings.shape.fill;
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([5, 5]);

      overlayCtx.beginPath();
      overlayCtx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
      polygonPoints.slice(1).forEach(point => {
        overlayCtx.lineTo(point.x, point.y);
      });
      overlayCtx.stroke();

      // Draw points
      polygonPoints.forEach((point, i) => {
        overlayCtx.beginPath();
        overlayCtx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        overlayCtx.fillStyle = i === 0 ? '#ff6b6b' : '#3b82f6';
        overlayCtx.fill();
      });

      overlayCtx.setLineDash([]);
    }

    // Draw crop preview (during dragging)
    if (activeTool === 'crop' && shapeStart && shapeCurrent) {
      const minX = Math.min(shapeStart.x, shapeCurrent.x);
      const minY = Math.min(shapeStart.y, shapeCurrent.y);
      const width = Math.abs(shapeCurrent.x - shapeStart.x);
      const height = Math.abs(shapeCurrent.y - shapeStart.y);

      // Darken area outside crop
      overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      overlayCtx.fillRect(0, 0, canvas.width, minY); // Top
      overlayCtx.fillRect(0, minY, minX, height); // Left
      overlayCtx.fillRect(minX + width, minY, canvas.width - minX - width, height); // Right
      overlayCtx.fillRect(0, minY + height, canvas.width, canvas.height - minY - height); // Bottom

      // Draw crop border
      overlayCtx.strokeStyle = '#ffffff';
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([]);
      overlayCtx.strokeRect(minX, minY, width, height);

      // Draw rule of thirds grid
      overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      overlayCtx.lineWidth = 1;
      const thirdW = width / 3;
      const thirdH = height / 3;
      overlayCtx.beginPath();
      overlayCtx.moveTo(minX + thirdW, minY);
      overlayCtx.lineTo(minX + thirdW, minY + height);
      overlayCtx.moveTo(minX + thirdW * 2, minY);
      overlayCtx.lineTo(minX + thirdW * 2, minY + height);
      overlayCtx.moveTo(minX, minY + thirdH);
      overlayCtx.lineTo(minX + width, minY + thirdH);
      overlayCtx.moveTo(minX, minY + thirdH * 2);
      overlayCtx.lineTo(minX + width, minY + thirdH * 2);
      overlayCtx.stroke();
    }

    // Draw confirmed crop rect
    if (cropRect && activeTool === 'crop') {
      const { x, y, width, height } = cropRect;

      // Darken area outside crop
      overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      overlayCtx.fillRect(0, 0, canvas.width, y); // Top
      overlayCtx.fillRect(0, y, x, height); // Left
      overlayCtx.fillRect(x + width, y, canvas.width - x - width, height); // Right
      overlayCtx.fillRect(0, y + height, canvas.width, canvas.height - y - height); // Bottom

      // Draw crop border
      overlayCtx.strokeStyle = '#3b82f6';
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([]);
      overlayCtx.strokeRect(x, y, width, height);

      // Draw corner handles
      const handleSize = 8;
      overlayCtx.fillStyle = '#ffffff';
      overlayCtx.strokeStyle = '#3b82f6';
      overlayCtx.lineWidth = 1;
      const corners = [
        [x - handleSize / 2, y - handleSize / 2],
        [x + width - handleSize / 2, y - handleSize / 2],
        [x - handleSize / 2, y + height - handleSize / 2],
        [x + width - handleSize / 2, y + height - handleSize / 2],
      ];
      corners.forEach(([cx, cy]) => {
        overlayCtx.fillRect(cx, cy, handleSize, handleSize);
        overlayCtx.strokeRect(cx, cy, handleSize, handleSize);
      });
    }

    // Draw live slot preview during template drag
    if (dragPreviewTemplate) {
      overlayCtx.globalAlpha = 1;
      overlayCtx.setLineDash([6, 4]);
      overlayCtx.lineWidth = 2;

      // Draw image slot outlines
      dragPreviewTemplate.slots.forEach(slot => {
        const sx = Math.round(slot.bounds.x * canvas.width);
        const sy = Math.round(slot.bounds.y * canvas.height);
        const sw = Math.round(slot.bounds.width * canvas.width);
        const sh = Math.round(slot.bounds.height * canvas.height);

        // Slot outline
        overlayCtx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
        overlayCtx.fillStyle = 'rgba(99, 102, 241, 0.08)';
        overlayCtx.fillRect(sx, sy, sw, sh);
        overlayCtx.strokeRect(sx, sy, sw, sh);

        // Slot label
        const fontSize = Math.min(14, Math.max(10, sw * 0.06));
        overlayCtx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
        overlayCtx.fillStyle = 'rgba(99, 102, 241, 0.8)';
        overlayCtx.textAlign = 'center';
        overlayCtx.textBaseline = 'middle';
        overlayCtx.fillText(slot.label, sx + sw / 2, sy + sh / 2);
      });

      // Draw text slot outlines in a different color
      dragPreviewTemplate.textSlots.forEach(ts => {
        const tx = Math.round(ts.bounds.x * canvas.width);
        const ty = Math.round(ts.bounds.y * canvas.height);
        const tw = Math.round(ts.bounds.width * canvas.width);
        const th = Math.round(ts.bounds.height * canvas.height);

        overlayCtx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
        overlayCtx.fillStyle = 'rgba(249, 115, 22, 0.06)';
        overlayCtx.fillRect(tx, ty, tw, th);
        overlayCtx.strokeRect(tx, ty, tw, th);

        const fontSize = Math.min(12, Math.max(9, tw * 0.05));
        overlayCtx.font = `400 ${fontSize}px Inter, system-ui, sans-serif`;
        overlayCtx.fillStyle = 'rgba(249, 115, 22, 0.7)';
        overlayCtx.textAlign = 'center';
        overlayCtx.textBaseline = 'middle';
        overlayCtx.fillText(ts.label, tx + tw / 2, ty + th / 2);
      });

      overlayCtx.setLineDash([]);
    }
  };

  // Re-render on state change
  useEffect(() => {
    renderLayers();
  }, [renderLayers]);

  // Re-render overlay when drag preview template changes
  useEffect(() => {
    renderSelectionOverlay();
  }, [dragPreviewTemplate]);

  // Figma-style: selected text layer + any printable key → start editing
  useEffect(() => {
    if (editingTextLayerId) return; // already editing
    const selectedId = selection.layerIds[0];
    if (!selectedId) return;
    const selectedLayer = layers.find(l => l.id === selectedId);
    if (!selectedLayer || selectedLayer.type !== 'text') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier-only keys, navigation, and shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
           'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
           'Delete', 'Backspace', 'F1', 'F2', 'F3', 'F4', 'F5',
           'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
          ].includes(e.key)) return;

      // Enter key or any printable key → start editing
      if (e.key === 'Enter' || e.key.length === 1) {
        e.preventDefault();
        onTextEditStart?.(selectedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingTextLayerId, selection.layerIds, layers, onTextEditStart]);

  // Get canvas coordinates from mouse event
  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvasElement = canvasRef.current;
    const rect = canvasElement?.getBoundingClientRect();
    if (!rect || !canvasElement) return { x: 0, y: 0 };

    // Get mouse position relative to the actual canvas element (after transform)
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Scale back to canvas coordinates (account for zoom)
    return {
      x: (x / canvas.zoom),
      y: (y / canvas.zoom),
    };
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Dismiss inline text editing when clicking elsewhere on canvas
    if (editingTextLayerId) {
      onTextEditEnd?.();
      return;
    }

    const coords = getCanvasCoords(e);
    setLastPosition({ x: e.clientX, y: e.clientY });

    if (activeTool === 'hand' || e.button === 1) {
      setIsPanning(true);
      return;
    }

    if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([coords]);
      return;
    }

    if (activeTool === 'clone') {
      if (e.altKey) {
        // Alt+click sets the clone source sampling point
        setCloneSource(coords);
      } else if (cloneSource) {
        // Normal click with source set: start clone painting
        setIsDrawing(true);
        setCurrentPath([coords]);
      }
      return;
    }

    if (activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line') {
      setShapeStart(coords);
      setShapeCurrent(coords);
      setIsDrawing(true);
      return;
    }

    if (activeTool === 'move') {
      // Check if clicked on a layer for dragging
      const clickedLayer = [...layerOrder].reverse().find(layerId => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer || !layer.visible) return false;
        const { x, y, width, height } = layer.transform;
        return coords.x >= x && coords.x <= x + width &&
               coords.y >= y && coords.y <= y + height;
      });
      if (clickedLayer) {
        onLayerSelect(clickedLayer);
        const layer = layers.find(l => l.id === clickedLayer)!;
        setIsDraggingLayer(true);
        setDraggedLayerId(clickedLayer);
        setDragStartPos(coords);
        setDragLayerStartTransform({ x: layer.transform.x, y: layer.transform.y });
        // Store start transforms of all group members for group dragging
        if (layer.groupId) {
          const starts = new Map<string, { x: number; y: number }>();
          layers.filter(l => l.groupId === layer.groupId).forEach(l => {
            starts.set(l.id, { x: l.transform.x, y: l.transform.y });
          });
          groupDragStartTransformsRef.current = starts;
        } else {
          groupDragStartTransformsRef.current = new Map();
        }
      } else {
        onLayerSelect(null);
      }
      return;
    }

    if (activeTool === 'select') {
      // Click to select a layer; template-group layers are also draggable
      // so the user can drag them off-canvas to remove without switching tools
      const clickedLayer = [...layerOrder].reverse().find(layerId => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer || !layer.visible) return false;
        const { x, y, width, height } = layer.transform;
        return coords.x >= x && coords.x <= x + width &&
               coords.y >= y && coords.y <= y + height;
      });
      if (clickedLayer) {
        onLayerSelect(clickedLayer);
        const layer = layers.find(l => l.id === clickedLayer)!;
        // Template-group layers: enable drag so user can drag off canvas to remove
        if (layer.groupId) {
          setIsDraggingLayer(true);
          setDraggedLayerId(clickedLayer);
          setDragStartPos(coords);
          setDragLayerStartTransform({ x: layer.transform.x, y: layer.transform.y });
          // Store start transforms of all group members for group dragging
          const starts = new Map<string, { x: number; y: number }>();
          layers.filter(l => l.groupId === layer.groupId).forEach(l => {
            starts.set(l.id, { x: l.transform.x, y: l.transform.y });
          });
          groupDragStartTransformsRef.current = starts;
        }
      } else {
        onLayerSelect(null);
      }
      return;
    }

    if (activeTool === 'text') {
      // Create text layer at click position, start inline editing
      onTextCreate?.(coords.x, coords.y);
      onToolChange?.('select');
      // Signal that we want to start editing the newly created layer
      // ThumbnailStudio will handle setting editingTextLayerId after addTextLayer
      return;
    }

    if (activeTool === 'gradient') {
      // Start gradient drag
      setGradientStart(coords);
      setGradientEnd(coords);
      setIsDrawing(true);
      return;
    }

    if (activeTool === 'fill') {
      // Trigger flood fill at click position with current brush color
      onFillArea?.(coords.x, coords.y, toolSettings.brush.color);
      return;
    }

    if (activeTool === 'eyedropper') {
      // Get color from canvas at coords
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
        const color = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
        // Apply picked color to tool settings
        onColorPick?.(color);
      }
      return;
    }

    if (activeTool === 'zoom') {
      // Click to zoom in, Alt+Click to zoom out
      if (e.altKey) {
        onZoomChange(Math.max(canvas.zoom / 1.25, 0.1));
      } else {
        onZoomChange(Math.min(canvas.zoom * 1.25, 5));
      }
      return;
    }

    if (activeTool === 'polygon') {
      // Multi-click polygon drawing
      setPolygonPoints(prev => [...prev, coords]);
      renderSelectionOverlay();
      return;
    }

    if (activeTool === 'crop') {
      // Start crop selection
      setShapeStart(coords);
      setShapeCurrent(coords);
      setIsCropping(true);
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPosition.x;
      const dy = e.clientY - lastPosition.y;
      onPanChange(canvas.panX + dx, canvas.panY + dy);
      setLastPosition({ x: e.clientX, y: e.clientY });
      return;
    }

    // Move tool layer dragging
    if (isDraggingLayer && draggedLayerId) {
      const coords = getCanvasCoords(e);
      const dx = coords.x - dragStartPos.x;
      const dy = coords.y - dragStartPos.y;
      // Template-group layers: move the whole group as one unit
      const draggedLayer = layers.find(l => l.id === draggedLayerId);
      if (draggedLayer?.groupId && groupDragStartTransformsRef.current.size > 0 && onGroupMove) {
        const moves: Array<{ layerId: string; x: number; y: number }> = [];
        groupDragStartTransformsRef.current.forEach((start, layerId) => {
          moves.push({ layerId, x: start.x + dx, y: start.y + dy });
        });
        onGroupMove(moves);
      } else {
        onLayerMove?.(draggedLayerId, dragLayerStartTransform.x + dx, dragLayerStartTransform.y + dy);
      }
      return;
    }

    if (isDrawing) {
      const coords = getCanvasCoords(e);

      // For drawing tools (brush, eraser, pen) and clone stamp
      if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'pen' || activeTool === 'clone') {
        setCurrentPath(prev => [...prev, coords]);
        renderSelectionOverlay();
      }

      // For shape tools (rectangle, ellipse, line)
      if ((activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line') && shapeStart) {
        setShapeCurrent(coords);
        renderSelectionOverlay();
      }

      // For gradient tool
      if (activeTool === 'gradient') {
        setGradientEnd(coords);
        renderSelectionOverlay();
      }
    }

    // Crop tool dragging
    if (isCropping && activeTool === 'crop' && shapeStart) {
      const coords = getCanvasCoords(e);
      setShapeCurrent(coords);
      renderSelectionOverlay();
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Move tool: end layer drag
    if (isDraggingLayer) {
      setIsDraggingLayer(false);
      setDraggedLayerId(null);
      groupDragStartTransformsRef.current = new Map();
      return;
    }
  
    if (isDrawing && currentPath.length > 1 && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'pen')) {
      // Commit the drawing path
      onDrawingUpdate?.([
        {
          id: `path-${Date.now()}`,
          points: currentPath,
          color: activeTool === 'eraser' ? '#ffffff' : toolSettings.brush.color,
          lineWidth: activeTool === 'eraser' ? toolSettings.eraser.size : toolSettings.brush.size,
          opacity: activeTool === 'eraser' ? toolSettings.eraser.opacity : toolSettings.brush.opacity,
          blendMode: 'normal',
          smoothing: activeTool === 'pen' ? 1 : 0,
        },
      ]);
      setCurrentPath([]);
      setIsDrawing(false);
    }

    // Clone stamp: commit the clone stroke
    if (isDrawing && currentPath.length > 1 && activeTool === 'clone' && cloneSource) {
      onDrawingUpdate?.([
        {
          id: `clone-${Date.now()}`,
          points: currentPath,
          color: 'clone',
          lineWidth: toolSettings.clone.size,
          opacity: toolSettings.clone.opacity,
          blendMode: 'normal',
          smoothing: 0,
          cloneSource: { ...cloneSource },
        },
      ]);
      setCurrentPath([]);
      setIsDrawing(false);
    }

    // Gradient tool: apply gradient
    if (isDrawing && activeTool === 'gradient' && gradientStart && gradientEnd) {
      onGradientApply?.(gradientStart.x, gradientStart.y, gradientEnd.x, gradientEnd.y);
      setGradientStart(null);
      setGradientEnd(null);
      setIsDrawing(false);
    }
  
    // Handle shape completion
    if (isDrawing && shapeStart && shapeCurrent && (activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line')) {
      const minX = Math.min(shapeStart.x, shapeCurrent.x);
      const minY = Math.min(shapeStart.y, shapeCurrent.y);
      const maxX = Math.max(shapeStart.x, shapeCurrent.x);
      const maxY = Math.max(shapeStart.y, shapeCurrent.y);
      const width = Math.max(maxX - minX, 1);
      const height = Math.max(maxY - minY, 1);
  
      // Create shape layer with these dimensions
      onShapeCreate?.(activeTool, minX, minY, width, height);
  
      setShapeStart(null);
      setShapeCurrent(null);
      setIsDrawing(false);
    }

    // Handle crop completion
    if (isCropping && shapeStart && shapeCurrent && activeTool === 'crop') {
      const minX = Math.min(shapeStart.x, shapeCurrent.x);
      const minY = Math.min(shapeStart.y, shapeCurrent.y);
      const maxX = Math.max(shapeStart.x, shapeCurrent.x);
      const maxY = Math.max(shapeStart.y, shapeCurrent.y);
      const width = Math.max(maxX - minX, 1);
      const height = Math.max(maxY - minY, 1);

      // Set crop rect for confirmation UI
      setCropRect({ x: minX, y: minY, width, height });
      setShapeStart(null);
      setShapeCurrent(null);
      setIsCropping(false);
    }
  };

  // Mouse leave handler: for template-group layers, enter "drag outside" mode
  // instead of ending the drag immediately
  const handleMouseLeave = () => {
    if (isDraggingLayer && draggedLayerId) {
      const layer = layers.find(l => l.id === draggedLayerId);
      if (layer?.groupId && onTemplateDragOutside) {
        // Template-group layer: enter outside-drag mode
        const layerCount = layers.filter(l => l.groupId === layer.groupId).length;
        dragOutsideGroupIdRef.current = layer.groupId;
        setIsDragOutside(true);
        onTemplateDragOutside({ groupId: layer.groupId, layerCount });
        return;
      }
    }
    // Non-template layer or not dragging: default behavior
    handleMouseUp();
  };

  // Global listeners for drag-off-canvas: active only when isDragOutside is true
  useEffect(() => {
    if (!isDragOutside) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // If cursor re-enters the canvas viewport, cancel outside mode and resume drag
      if (e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        dragOutsideGroupIdRef.current = null;
        setIsDragOutside(false);
        onTemplateDragReturn?.();
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const groupId = dragOutsideGroupIdRef.current;
      // If released to the right of the canvas (over sidebar area), remove the template
      if (rect && groupId && e.clientX > rect.right) {
        onRemoveTemplateGroup?.(groupId);
      }
      // Clean up all drag state
      dragOutsideGroupIdRef.current = null;
      setIsDragOutside(false);
      setIsDraggingLayer(false);
      setDraggedLayerId(null);
      onTemplateDragReturn?.();
    };

    const handleBlur = () => {
      // Window lost focus during drag — cancel
      dragOutsideGroupIdRef.current = null;
      setIsDragOutside(false);
      setIsDraggingLayer(false);
      setDraggedLayerId(null);
      onTemplateDragReturn?.();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isDragOutside, onRemoveTemplateGroup, onTemplateDragReturn, layers, draggedLayerId]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(canvas.zoom * delta, 0.1), 5);
      onZoomChange(newZoom);
    } else {
      onPanChange(canvas.panX - e.deltaX, canvas.panY - e.deltaY);
    }
  };

  // Double-click handler for completing polygon or editing text
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (activeTool === 'polygon' && polygonPoints.length >= 3) {
      // Calculate bounding box of polygon
      const xs = polygonPoints.map(p => p.x);
      const ys = polygonPoints.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      // Create polygon shape layer
      onShapeCreate?.('polygon', minX, minY, maxX - minX, maxY - minY, polygonPoints);
      setPolygonPoints([]);
      return;
    }

    // Double-click on text layer → start inline editing
    if (activeTool === 'select' || activeTool === 'move') {
      const coords = getCanvasCoords(e);
      const clickedTextLayerId = [...layerOrder].reverse().find(layerId => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer || !layer.visible || layer.type !== 'text') return false;
        const { x, y, width, height } = layer.transform;
        return coords.x >= x && coords.x <= x + width &&
               coords.y >= y && coords.y <= y + height;
      });
      if (clickedTextLayerId) {
        onTextEditStart?.(clickedTextLayerId);
      }
    }
  };

  // Zoom controls
  const zoomIn = () => onZoomChange(Math.min(canvas.zoom * 1.25, 5));
  const zoomOut = () => onZoomChange(Math.max(canvas.zoom / 1.25, 0.1));
  const zoomFit = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = (rect.width - 48) / canvas.width;
    const scaleY = (rect.height - 48) / canvas.height;
    onZoomChange(Math.min(scaleX, scaleY, 1));
    onPanChange(0, 0);
  };

  // Crop controls
  const applyCrop = () => {
    if (cropRect) {
      onCrop?.(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      setCropRect(null);
    }
  };

  const cancelCrop = () => {
    setCropRect(null);
  };

  // Cursor based on tool
  const getCursor = () => {
    switch (activeTool) {
      case 'hand': return isPanning ? 'grabbing' : 'grab';
      case 'move': return isDraggingLayer ? 'grabbing' : 'move';
      case 'zoom': return 'zoom-in';
      case 'brush':
      case 'eraser':
      case 'clone':
      case 'gradient': return 'crosshair';
      case 'text': return 'text';
      case 'eyedropper': return 'crosshair';
      case 'crop': return 'crosshair';
      case 'fill': return 'crosshair';
      default: return 'default';
    }
  };

  return (
    <div className="canvas-container">
      <div
        ref={containerRef}
        className="canvas-viewport"
        style={{ cursor: getCursor() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      >
        <div
          className="canvas-wrapper"
          style={{
            width: canvas.width * canvas.zoom,
            height: canvas.height * canvas.zoom,
            transform: `translate(${canvas.panX}px, ${canvas.panY}px)`,
            filter: globalFilterString,
          }}
        >
          <div
            style={{
              transform: `scale(${canvas.zoom}) ${globalTransformString}`,
              transformOrigin: '0 0',
              width: canvas.width,
              height: canvas.height,
              position: 'relative',
            }}
          >
            {/* Main canvas */}
            <canvas
              ref={canvasRef}
              width={canvas.width}
              height={canvas.height}
              style={{ display: 'block' }}
            />
            {/* Overlay canvas for selection, guides, etc. */}
            <canvas
              ref={overlayCanvasRef}
              width={canvas.width}
              height={canvas.height}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
              }}
            />
            {/* Interactive upload zone overlays for composition template placeholders */}
            {onFillUploadZone && onClearUploadZone && (
              <UploadZoneOverlay
                layers={layers}
                onFillZone={onFillUploadZone}
                onClearZone={onClearUploadZone}
              />
            )}
            {/* Drag handle for template group layers — drag to Layouts to remove */}
            <TemplateGroupDragHandle
              layers={layers}
              selection={selection}
              onRemoveGroup={onRemoveTemplateGroup}
            />
            {/* Inline text editing overlay with seamless type-to-drag zones */}
            {editingTextLayerId && (() => {
              const editLayer = layers.find(
                (l): l is TextLayer => l.id === editingTextLayerId && l.type === 'text'
              );
              if (!editLayer) return null;
              const t = editLayer.transform;
              const grabPad = 12; // px — outer grab zone around the textarea
              // Approximate vertical centering: compute top padding
              const lineCount = Math.max(1, (editLayer.content || '').split('\n').length);
              // Use fontSize for glyph height + lineHeight spacing between lines
              const lineH = editLayer.fontSize * (editLayer.lineHeight || 1.4);
              const textHeight = lineCount === 1
                ? editLayer.fontSize  // single line: just glyph height
                : editLayer.fontSize + (lineCount - 1) * lineH; // multi-line: first line + rest with spacing
              const vertPad = Math.max(0, (t.height - textHeight) / 2);
              return (
                <div
                  style={{
                    position: 'absolute',
                    left: t.x - grabPad,
                    top: t.y - grabPad,
                    width: t.width + grabPad * 2,
                    height: t.height + grabPad * 2,
                    zIndex: 50,
                    cursor: 'grab',
                    border: '1.5px dashed rgba(168,85,247,0.7)',
                    borderRadius: 4,
                    boxSizing: 'border-box',
                  }}
                  onMouseDown={e => {
                    // Grab zone: start dragging this text layer
                    e.stopPropagation();
                    const coords = getCanvasCoords(e);
                    onLayerSelect(editLayer.id);
                    setIsDraggingLayer(true);
                    setDraggedLayerId(editLayer.id);
                    setDragStartPos(coords);
                    setDragLayerStartTransform({ x: t.x, y: t.y });
                  }}
                >
                  <textarea
                    autoFocus
                    value={editLayer.content}
                    onChange={e => onTextContentChange?.(editLayer.id, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') onTextEditEnd?.();
                    }}
                    onMouseDown={e => {
                      // Inner typing zone: stop propagation so drag doesn't start
                      e.stopPropagation();
                    }}
                    style={{
                      ...INLINE_EDIT_STYLES,
                      position: 'absolute',
                      left: grabPad,
                      top: grabPad,
                      width: t.width,
                      height: t.height,
                      boxSizing: 'border-box',
                      paddingTop: vertPad,
                      color: editLayer.fill,
                      fontFamily: editLayer.fontFamily,
                      fontSize: editLayer.fontSize,
                      fontWeight: editLayer.fontWeight,
                      fontStyle: editLayer.fontStyle,
                      textAlign: editLayer.textAlign as any,
                      lineHeight: editLayer.lineHeight,
                      caretColor: '#a855f7',
                      cursor: 'text',
                    }}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="canvas-controls">
        <div className="zoom-control">
          <button onClick={zoomOut} title="Zoom out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="zoom-control__value">{Math.round(canvas.zoom * 100)}%</span>
          <button onClick={zoomIn} title="Zoom in">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button onClick={zoomFit} title="Fit to view" style={{ marginLeft: 8, width: 'auto', padding: '0 8px' }}>
            Fit
          </button>
        </div>
        <span style={{ color: 'var(--editor-text-muted)', fontSize: 11 }}>
          {canvas.width} × {canvas.height}
        </span>
      </div>

      {/* Crop confirmation UI */}
      {cropRect && activeTool === 'crop' && (
        <div className="crop-controls" style={{
          position: 'absolute',
          bottom: 48,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--editor-bg-medium)',
          borderRadius: 8,
          border: '1px solid var(--editor-border-default)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 100,
        }}>
          <span style={{ fontSize: 12, color: 'var(--editor-text-secondary)', alignSelf: 'center' }}>
            {Math.round(cropRect.width)} × {Math.round(cropRect.height)}
          </span>
          <button
            onClick={cancelCrop}
            style={{
              padding: '6px 12px',
              background: 'var(--editor-bg-dark)',
              border: '1px solid var(--editor-border-default)',
              borderRadius: 4,
              color: 'var(--editor-text-primary)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={applyCrop}
            style={{
              padding: '6px 12px',
              background: 'var(--editor-accent)',
              border: 'none',
              borderRadius: 4,
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Apply Crop
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(CanvasEngine);
