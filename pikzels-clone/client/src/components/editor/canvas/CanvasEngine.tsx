import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { EditorState, Layer, ToolType } from '../types/editor.types';

interface CanvasEngineProps {
  state: EditorState;
  onZoomChange: (zoom: number) => void;
  onPanChange: (panX: number, panY: number) => void;
  onLayerSelect: (layerId: string | null) => void;
  onDrawingUpdate?: (paths: any[]) => void;
}

const CanvasEngine: React.FC<CanvasEngineProps> = ({
  state,
  onZoomChange,
  onPanChange,
  onLayerSelect,
  onDrawingUpdate,
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

  const { canvas, layers, layerOrder, selection, activeTool, toolSettings } = state;

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

      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;

      // Apply transform
      const { x, y, width, height, rotation, scaleX, scaleY } = layer.transform;
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-width / 2, -height / 2);

      // Render based on layer type
      switch (layer.type) {
        case 'image':
          renderImageLayer(ctx, layer as any);
          break;
        case 'text':
          renderTextLayer(ctx, layer as any);
          break;
        case 'shape':
          renderShapeLayer(ctx, layer as any);
          break;
        case 'drawing':
          renderDrawingLayer(ctx, layer as any);
          break;
      }

      ctx.restore();
    });

    // Render selection overlay
    renderSelectionOverlay();
  }, [layers, layerOrder, canvas, selection]);

  const renderImageLayer = (ctx: CanvasRenderingContext2D, layer: any) => {
    const img = new Image();
    img.src = layer.src;
    if (img.complete) {
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
    }
  };

  const renderTextLayer = (ctx: CanvasRenderingContext2D, layer: any) => {
    ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
    ctx.fillStyle = layer.fill;
    ctx.textAlign = layer.textAlign;
    ctx.textBaseline = 'top';

    const lines = layer.content.split('\n');
    const lineHeight = layer.fontSize * layer.lineHeight;

    lines.forEach((line: string, i: number) => {
      const x = layer.textAlign === 'center' ? layer.transform.width / 2 :
                layer.textAlign === 'right' ? layer.transform.width : 0;
      ctx.fillText(line, x, i * lineHeight);
    });

    // Stroke if present
    if (layer.stroke && layer.strokeWidth) {
      ctx.strokeStyle = layer.stroke;
      ctx.lineWidth = layer.strokeWidth;
      lines.forEach((line: string, i: number) => {
        const x = layer.textAlign === 'center' ? layer.transform.width / 2 :
                  layer.textAlign === 'right' ? layer.transform.width : 0;
        ctx.strokeText(line, x, i * lineHeight);
      });
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
  };

  // Re-render on state change
  useEffect(() => {
    renderLayers();
  }, [renderLayers]);

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

    if (activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line') {
      setShapeStart(coords);
      setShapeCurrent(coords);
      setIsDrawing(true);
      return;
    }

    if (activeTool === 'select' || activeTool === 'move') {
      // Check if clicked on a layer
      const clickedLayer = [...layerOrder].reverse().find(layerId => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer || !layer.visible) return false;

        const { x, y, width, height } = layer.transform;
        return coords.x >= x && coords.x <= x + width &&
               coords.y >= y && coords.y <= y + height;
      });

      onLayerSelect(clickedLayer || null);
    }

    if (activeTool === 'text') {
      // TODO: Open text input dialog at coords position
      console.log('Text tool clicked at:', coords);
    }

    if (activeTool === 'fill') {
      // TODO: Implement flood fill algorithm
      console.log('Fill tool clicked at:', coords);
    }

    if (activeTool === 'eyedropper') {
      // Get color from canvas at coords
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
        const color = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
        console.log('Picked color:', color);
        // TODO: Update tool settings color
      }
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

    if (isDrawing) {
      const coords = getCanvasCoords(e);

      // For drawing tools (brush, eraser, pen)
      if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'pen') {
        setCurrentPath(prev => [...prev, coords]);
        renderSelectionOverlay();
      }

      // For shape tools (rectangle, ellipse, line)
      if ((activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line') && shapeStart) {
        setShapeCurrent(coords);
        renderSelectionOverlay();
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
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
  
    // Handle shape completion
    if (isDrawing && shapeStart && shapeCurrent && (activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line')) {
      const minX = Math.min(shapeStart.x, shapeCurrent.x);
      const minY = Math.min(shapeStart.y, shapeCurrent.y);
      const maxX = Math.max(shapeStart.x, shapeCurrent.x);
      const maxY = Math.max(shapeStart.y, shapeCurrent.y);
  
      console.log(`${activeTool} drawn:`, { x: minX, y: minY, width: maxX - minX, height: maxY - minY });
      // TODO: Create shape layer with these dimensions
  
      setShapeStart(null);
      setShapeCurrent(null);
      setIsDrawing(false);
    }
  };

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

  // Cursor based on tool
  const getCursor = () => {
    switch (activeTool) {
      case 'hand': return isPanning ? 'grabbing' : 'grab';
      case 'zoom': return 'zoom-in';
      case 'brush':
      case 'eraser': return 'crosshair';
      case 'text': return 'text';
      case 'eyedropper': return 'crosshair';
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
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="canvas-wrapper"
          style={{
            transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
            transformOrigin: 'center center',
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
    </div>
  );
};

export default CanvasEngine;
