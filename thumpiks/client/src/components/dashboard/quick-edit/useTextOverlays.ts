import { useState, useCallback, useRef, useEffect } from 'react';
import type { TextOverlay } from './types';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export function useTextOverlays(canvasRef: React.RefObject<HTMLDivElement | null>) {
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [newTextValue, setNewTextValue] = useState('');
  const [showOverlayHint, setShowOverlayHint] = useState<string | null>(null);

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragIntent, setDragIntent] = useState<{
    id: string; startX: number; startY: number; overlayX: number; overlayY: number;
  } | null>(null);

  // Resize state
  const [resizing, setResizing] = useState<{ id: string; handle: ResizeHandle } | null>(null);
  const resizeStartRef = useRef<{
    mouseX: number; mouseY: number; fontSize: number; maxWidth: number; x: number; y: number;
  } | null>(null);

  // Canvas container size
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Ref for overlay divs
  const overlayDivRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const overlayEditWidth = useRef<number | null>(null);

  // Observe canvas size
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [canvasRef]);

  // Text overlay CRUD
  const addTextOverlay = useCallback((text: string, style?: Partial<TextOverlay>) => {
    if (!text.trim()) return;
    const overlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text,
      x: 50,
      y: style?.y ?? 50,
      fontSize: style?.fontSize ?? 48,
      color: style?.color ?? '#FFFFFF',
      fontWeight: style?.fontWeight ?? '700',
      fontFamily: style?.fontFamily ?? 'Impact, Arial Black, sans-serif',
      textStroke: style?.textStroke ?? '2px black',
      textShadow: style?.textShadow ?? '2px 2px 4px rgba(0,0,0,0.7)',
      letterSpacing: style?.letterSpacing ?? '1px',
      backgroundColor: style?.backgroundColor ?? '',
      maxWidth: style?.maxWidth ?? 90,
    };
    setTextOverlays(prev => [...prev, overlay]);
    setNewTextValue('');
    setShowTextInput(false);
    setActiveOverlayId(overlay.id);
    setShowOverlayHint(overlay.id);
    setTimeout(() => setShowOverlayHint(null), 3000);
    return overlay;
  }, []);

  const updateOverlayProp = useCallback((id: string, patch: Partial<TextOverlay>) => {
    setTextOverlays(prev => prev.map(o => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

  const removeOverlay = useCallback((id: string) => {
    setTextOverlays(prev => prev.filter(o => o.id !== id));
    setActiveOverlayId(prev => (prev === id ? null : prev));
  }, []);

  const clearAllOverlays = useCallback(() => {
    setTextOverlays([]);
    setActiveOverlayId(null);
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const overlay = textOverlays.find(o => o.id === id);
    if (!overlay || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const overlayX = (overlay.x / 100) * rect.width;
    const overlayY = (overlay.y / 100) * rect.height;
    setDragIntent({ id, startX: e.clientX, startY: e.clientY, overlayX, overlayY });
    setActiveOverlayId(id);
    setShowTextInput(false);
  }, [textOverlays, canvasRef]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (dragIntent && !dragging && canvasRef.current) {
      const dx = e.clientX - dragIntent.startX;
      const dy = e.clientY - dragIntent.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDragging(dragIntent.id);
        setDragOffset({
          x: dragIntent.startX - rect.left - dragIntent.overlayX,
          y: dragIntent.startY - rect.top - dragIntent.overlayY,
        });
      }
      return;
    }
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    setTextOverlays(prev =>
      prev.map(o => o.id === dragging
        ? { ...o, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
        : o
      )
    );
  }, [dragging, dragOffset, dragIntent, canvasRef]);

  const handleDragEnd = useCallback(() => {
    setDragIntent(null);
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging || dragIntent) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragging, dragIntent, handleDragMove, handleDragEnd]);

  // Resize handlers
  const handleResizeStart = useCallback((id: string, handle: ResizeHandle, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const overlay = textOverlays.find(o => o.id === id);
    if (!overlay) return;
    resizeStartRef.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      fontSize: overlay.fontSize, maxWidth: overlay.maxWidth,
      x: overlay.x, y: overlay.y,
    };
    setResizing({ id, handle });
  }, [textOverlays]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing || !resizeStartRef.current || !canvasRef.current) return;
    const { id, handle } = resizing;
    const start = resizeStartRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - start.mouseX) / rect.width) * 100;
    const dy = ((e.clientY - start.mouseY) / rect.height) * 100;

    const affectsH = handle === 'w' || handle === 'nw' || handle === 'sw';
    const affectsE = handle === 'e' || handle === 'ne' || handle === 'se';
    const affectsN = handle === 'n' || handle === 'nw' || handle === 'ne';
    const affectsS = handle === 's' || handle === 'sw' || handle === 'se';

    let newFontSize = start.fontSize;
    let newMaxWidth = start.maxWidth;
    let newX = start.x;
    let newY = start.y;

    if (affectsE) newMaxWidth = Math.max(10, Math.min(100, start.maxWidth + dx));
    if (affectsH) {
      newMaxWidth = Math.max(10, Math.min(100, start.maxWidth - dx));
      newX = Math.max(0, Math.min(100, start.x + dx));
    }
    const dyFont = dy * (720 / 100);
    if (affectsS) newFontSize = Math.max(20, Math.min(200, start.fontSize + dyFont));
    if (affectsN) {
      newFontSize = Math.max(20, Math.min(200, start.fontSize - dyFont));
      newY = Math.max(0, Math.min(100, start.y + dy));
    }

    setTextOverlays(prev =>
      prev.map(o => o.id === id
        ? { ...o, fontSize: newFontSize, maxWidth: newMaxWidth, x: newX, y: newY }
        : o
      )
    );
  }, [resizing, canvasRef]);

  const handleResizeEnd = useCallback(() => {
    setResizing(null);
    resizeStartRef.current = null;
  }, []);

  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing, handleResizeMove, handleResizeEnd]);

  return {
    textOverlays,
    setTextOverlays,
    activeOverlayId,
    setActiveOverlayId,
    showTextInput,
    setShowTextInput,
    newTextValue,
    setNewTextValue,
    showOverlayHint,
    canvasSize,
    overlayDivRefs,
    overlayEditWidth,
    addTextOverlay,
    updateOverlayProp,
    removeOverlay,
    clearAllOverlays,
    handleDragStart,
    handleResizeStart,
  };
}
