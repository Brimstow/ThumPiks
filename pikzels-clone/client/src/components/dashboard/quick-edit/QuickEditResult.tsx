import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  RotateCcw,
  Wand2,
  Sparkles,
  Loader2,
  X,
  Check,
  Pencil,
  Eraser,
  Camera,
  Trash2,
  Save,
  Eye,
  Command,
  Grid,
  ChevronRight,
  Type,
  Plus,
} from 'lucide-react';
import type { VisionAnalysisResult } from '../../../types/vision.types';
import { VideoFrame } from '../../../services/quickEditService';
import { authPost, createAIToolAbortController } from '../../../utils/api';
import type { SaveMetadata } from '../../../types/image-actions.types';
import { useQuickEditCommandExecutor } from '../hooks/useQuickEditCommandExecutor';
import type { UseAITextGeneratorReturn } from '../../../hooks/useAITextGenerator';
import {
  MOOD_FONTS,
  DEFAULT_TEXT_STYLE,
  isColorDark,
} from '../../../constants/text-styles';
import { useInlineTextEdit, INLINE_EDIT_STYLES } from '../../../hooks/useInlineTextEdit';
import Tooltip from '../../ui/Tooltip';
import AICommandBar from '../../editor/components/AICommandBar';
import { safeCanvasToDataURL } from '../../../utils/browserCompat';
import { useTextOverlays } from './useTextOverlays';
import FloatingEditPanel from './FloatingEditPanel';
import SmartTextItem from './SmartTextItem';
import type { TextOverlay } from './types';

// ============================================
// PROPS
// ============================================

export interface QuickEditResultProps {
  resultImageUrl: string | null;
  setResultImageUrl: (url: string | null) => void;
  originalImageUrl: string | null;
  videoTitle: string;
  videoFrames: VideoFrame[];
  aiPrompt: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (msg: string) => void;
  setError: (msg: string | null) => void;
  aiText: UseAITextGeneratorReturn;
  triggerSave: (imageUrl: string, metadata?: SaveMetadata) => void;
  onOpenEditor?: (imageUrl: string) => void;
  onStartOver: () => void;
  onPickDifferentFrame?: () => void;
  clearVisionAnalysis: () => void;
}

// ============================================
// COMPONENT
// ============================================

const QuickEditResult: React.FC<QuickEditResultProps> = ({
  resultImageUrl,
  setResultImageUrl,
  originalImageUrl,
  videoTitle,
  videoFrames,
  aiPrompt,
  loading,
  setLoading,
  loadingMessage,
  setLoadingMessage,
  setError,
  aiText,
  triggerSave,
  onOpenEditor,
  onStartOver,
  onPickDifferentFrame,
  clearVisionAnalysis,
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Text overlay state (hook)
  const {
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
  } = useTextOverlays(canvasRef);

  // Inline text editing
  const inlineEdit = useInlineTextEdit({
    onUpdate: (id, text) => updateOverlayProp(id, { text }),
  });
  const inlineEditingId = inlineEdit.editingId;

  // Drag state (visual only — actual logic in hook)
  const [dragging] = useState<string | null>(null);

  // AI abort state
  const [aiAbortController, setAiAbortController] = useState<AbortController | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Face photo state (persisted in localStorage)
  const FACE_STORAGE_KEY = 'quickedit_face_photo';
  const [facePhoto, setFacePhoto] = useState<string | null>(() => {
    try { return localStorage.getItem(FACE_STORAGE_KEY); } catch { return null; }
  });
  const faceInputRef = useRef<HTMLInputElement>(null);

  // Command bar state
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isCommandBarLoading] = useState(false);
  const toggleCommandBar = useCallback(() => setIsCommandBarOpen(prev => !prev), []);

  // Smart Text panel ref (for FloatingEditPanel anchor)
  const smartTextBtnRef = useRef<HTMLButtonElement>(null);
  const editPanelSavedPos = useRef<{ x: number; y: number } | null>(null);

  // AI text generation tier
  const [textTier] = useState<'flash' | 'standard' | 'pro'>('standard');

  // Refs for stable hook callbacks
  const textOverlaysRef = useRef(textOverlays);
  textOverlaysRef.current = textOverlays;
  const activeOverlayIdRef = useRef(activeOverlayId);
  activeOverlayIdRef.current = activeOverlayId;
  const resultImageUrlRef = useRef(resultImageUrl);
  resultImageUrlRef.current = resultImageUrl;
  const facePhotoRef = useRef(facePhoto);
  facePhotoRef.current = facePhoto;

  // Command executor hook
  const commandExecutor = useQuickEditCommandExecutor({
    addTextOverlay: (overlay: TextOverlay) => {
      setTextOverlays(prev => [...prev, overlay]);
      setActiveOverlayId(overlay.id);
    },
    updateOverlayProp: (id, patch) => {
      setTextOverlays(prev => prev.map(o => (o.id === id ? { ...o, ...patch } : o)));
    },
    removeOverlay: id => {
      setTextOverlays(prev => prev.filter(o => o.id !== id));
      if (activeOverlayIdRef.current === id) setActiveOverlayId(null);
    },
    setActiveOverlayId,
    getResultImageUrl: () => resultImageUrlRef.current,
    setResultImageUrl: url => setResultImageUrl(url),
    setLoading,
    setLoadingMessage,
    setError,
    getTextOverlays: () => textOverlaysRef.current,
    getActiveOverlayId: () => activeOverlayIdRef.current,
    getFacePhoto: () => facePhotoRef.current,
  });

  // ============================================
  // AI OPERATION HANDLERS
  // ============================================

  const handleCancelAI = () => {
    aiAbortController?.abort();
    if (aiProgressTimerRef.current) clearInterval(aiProgressTimerRef.current);
    setLoading(false);
    setLoadingMessage('');
    setError('Operation cancelled.');
  };

  const handleFaceSwap = async () => {
    if (!facePhoto || !resultImageUrl) return;
    setLoading(true);
    setLoadingMessage('Swapping face...');
    setError(null);

    const { controller, timeoutId } = createAIToolAbortController('face-swap');
    setAiAbortController(controller);
    aiTimeoutRef.current = timeoutId;

    const startTime = Date.now();
    aiProgressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 35_000) setLoadingMessage('Face swap is slow - consider cancelling and retrying...');
      else if (elapsed > 20_000) setLoadingMessage('This is taking longer than usual...');
    }, 5_000);

    try {
      const res = await authPost('/api/thumbnails/ai/face-swap', {
        sourceImage: facePhoto,
        targetImage: resultImageUrl,
      }, { signal: controller.signal });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Face swap failed' }));
        throw new Error(err.error || 'Face swap failed');
      }
      const data = await res.json();
      if (data.success && data.images?.length > 0) {
        setResultImageUrl(data.images[0]);
        clearVisionAnalysis();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Face swap timed out or was cancelled. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Face swap failed');
      }
    } finally {
      clearTimeout(aiTimeoutRef.current ?? undefined);
      if (aiProgressTimerRef.current) clearInterval(aiProgressTimerRef.current);
      aiTimeoutRef.current = null;
      aiProgressTimerRef.current = null;
      setAiAbortController(null);
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleEnhance = async () => {
    if (!resultImageUrl) return;
    setLoading(true);
    setLoadingMessage('Enhancing image quality...');
    setError(null);

    const { controller, timeoutId } = createAIToolAbortController('enhance');
    setAiAbortController(controller);
    aiTimeoutRef.current = timeoutId;

    const startTime = Date.now();
    aiProgressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 25_000) setLoadingMessage('Enhancement is slow - consider cancelling and retrying...');
      else if (elapsed > 15_000) setLoadingMessage('This is taking longer than usual...');
    }, 5_000);

    try {
      const res = await authPost('/api/thumbnails/ai/enhance', {
        image: resultImageUrl,
      }, { signal: controller.signal });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Enhancement failed' }));
        throw new Error(err.error || 'Enhancement failed');
      }
      const data = await res.json();
      if (data.images?.length > 0) {
        setResultImageUrl(data.images[0]);
        clearVisionAnalysis();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Enhancement timed out or was cancelled. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Enhancement failed');
      }
    } finally {
      clearTimeout(aiTimeoutRef.current ?? undefined);
      if (aiProgressTimerRef.current) clearInterval(aiProgressTimerRef.current);
      aiTimeoutRef.current = null;
      aiProgressTimerRef.current = null;
      setAiAbortController(null);
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRemoveBackground = async () => {
    if (!resultImageUrl) return;
    setLoading(true);
    setLoadingMessage('Removing background...');
    setError(null);
    try {
      const res = await authPost('/api/thumbnails/ai/remove-background', { image: resultImageUrl });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Background removal failed' }));
        throw new Error(err.error || 'Background removal failed');
      }
      const data = await res.json();
      if (data.images?.length > 0) {
        setResultImageUrl(data.images[0]);
        clearVisionAnalysis();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Background removal failed');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRevert = () => {
    if (originalImageUrl) {
      setResultImageUrl(originalImageUrl);
      clearVisionAnalysis();
      clearAllOverlays();
    }
  };

  // ============================================
  // FACE PHOTO HANDLERS
  // ============================================

  const handleFacePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setFacePhoto(dataUrl);
      try { localStorage.setItem(FACE_STORAGE_KEY, dataUrl); } catch { /* full */ }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const clearFacePhoto = useCallback(() => {
    setFacePhoto(null);
    try { localStorage.removeItem(FACE_STORAGE_KEY); } catch { /* */ }
  }, []);

  // ============================================
  // SMART TEXT
  // ============================================

  const computeStyleFromAnalysis = useCallback((analysis: VisionAnalysisResult): Partial<TextOverlay> => {
    const { dominantColor, mood, colorContrast, colorPalette } = analysis.elements;
    const moodLower = (mood || '').toLowerCase();
    const fontFamily = Object.entries(MOOD_FONTS).find(([key]) => moodLower.includes(key))?.[1]
      || 'Impact, Arial Black, sans-serif';
    const bgDark = isColorDark(dominantColor || '#000000');
    let color = bgDark ? '#FFFFFF' : '#000000';
    if (colorPalette?.length > 0) {
      const contrasty = colorPalette.find(c => isColorDark(c) !== bgDark);
      if (contrasty) color = contrasty;
    }
    const strokeColor = bgDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
    const textStroke = `2px ${strokeColor}`;
    const textShadow = colorContrast === 'low'
      ? '3px 3px 6px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)'
      : '2px 2px 4px rgba(0,0,0,0.7)';
    const bgHex = dominantColor || '#000000';
    const bgR = parseInt(bgHex.replace('#', '').substring(0, 2), 16);
    const bgG = parseInt(bgHex.replace('#', '').substring(2, 4), 16);
    const bgB = parseInt(bgHex.replace('#', '').substring(4, 6), 16);
    const backgroundColor = bgDark
      ? 'rgba(0, 0, 0, 0.6)'
      : `rgba(${bgR}, ${bgG}, ${bgB}, 0.7)`;
    return { fontFamily, color, fontWeight: '900', fontSize: 80, textStroke, textShadow, letterSpacing: '2px', backgroundColor, maxWidth: 90 };
  }, []);

  const getSmartStyle = useCallback((): Partial<TextOverlay> => {
    const analysis = aiText.visionAnalysis;
    if (analysis) return { ...DEFAULT_TEXT_STYLE, ...computeStyleFromAnalysis(analysis) };
    return DEFAULT_TEXT_STYLE;
  }, [aiText.visionAnalysis, computeStyleFromAnalysis]);

  const handleSmartText = async (customText?: string) => {
    if (!resultImageUrl) return;
    setError(null);
    if (customText) {
      const style = getSmartStyle();
      addTextOverlay(customText, { y: 75, ...style });
    } else {
      try {
        await aiText.generateFromImage({
          imageUrl: resultImageUrl,
          fallbackPrompt: videoTitle || undefined,
          tier: textTier,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Text generation failed');
      }
    }
  };

  const applyAiSuggestion = (text: string) => {
    const style = getSmartStyle();
    addTextOverlay(text, { y: 75, ...style });
    aiText.clearSuggestions();
  };

  // ============================================
  // CANVAS COMPOSITE (SAVE/DOWNLOAD)
  // ============================================

  const compositeCanvas = useCallback(async (): Promise<string | null> => {
    if (!resultImageUrl) return null;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = resultImageUrl;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 1280;
    canvas.height = img.naturalHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const overlay of textOverlays) {
      const scaledFontSize = (overlay.fontSize / 720) * canvas.height;
      ctx.font = `${overlay.fontWeight} ${scaledFontSize}px ${overlay.fontFamily || 'sans-serif'}`;
      ctx.fillStyle = overlay.color;
      ctx.textBaseline = 'top';

      const x = (overlay.x / 100) * canvas.width;
      const y = (overlay.y / 100) * canvas.height;
      const maxW = ((overlay.maxWidth || 90) / 100) * canvas.width;

      const words = overlay.text.toUpperCase().split(' ');
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxW && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = scaledFontSize * 1.15;
      const totalHeight = lines.length * lineHeight;
      const padding = overlay.backgroundColor ? scaledFontSize * 0.15 : 0;
      const hPadding = overlay.backgroundColor ? scaledFontSize * 0.3 : 0;

      if (overlay.backgroundColor) {
        let maxLineWidth = 0;
        for (const line of lines) maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
        ctx.fillStyle = overlay.backgroundColor;
        const rx = 8 * (scaledFontSize / 48);
        const bgX = x - hPadding;
        const bgY = y - padding;
        const bgW = maxLineWidth + hPadding * 2;
        const bgH = totalHeight + padding * 2;
        ctx.beginPath();
        ctx.moveTo(bgX + rx, bgY);
        ctx.lineTo(bgX + bgW - rx, bgY);
        ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + rx);
        ctx.lineTo(bgX + bgW, bgY + bgH - rx);
        ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - rx, bgY + bgH);
        ctx.lineTo(bgX + rx, bgY + bgH);
        ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - rx);
        ctx.lineTo(bgX, bgY + rx);
        ctx.quadraticCurveTo(bgX, bgY, bgX + rx, bgY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = overlay.color;
      }

      for (let i = 0; i < lines.length; i++) {
        const ly = y + i * lineHeight;
        if (overlay.textStroke) {
          const strokeMatch = overlay.textStroke.match(/^(\d+)px\s+(.+)$/);
          if (strokeMatch) {
            ctx.strokeStyle = strokeMatch[2];
            ctx.lineWidth = parseFloat(strokeMatch[1]) * (scaledFontSize / 48);
            ctx.lineJoin = 'round';
            ctx.strokeText(lines[i], x, ly);
          }
        }
        ctx.fillText(lines[i], x, ly);
      }
    }

    return safeCanvasToDataURL(canvas, 'image/jpeg', 0.92);
  }, [resultImageUrl, textOverlays]);

  const handleSave = async () => {
    if (!resultImageUrl) return;
    let imageToSave = resultImageUrl;
    if (textOverlays.length > 0) {
      setLoading(true);
      setLoadingMessage('Flattening overlays...');
      try {
        const composited = await compositeCanvas();
        if (composited) {
          imageToSave = composited;
          setResultImageUrl(composited);
          clearAllOverlays();
        }
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    }
    triggerSave(imageToSave, {
      title: videoTitle || undefined,
      source: 'quick-edit',
      prompt: aiPrompt || undefined,
    });
  };

  const handleDownload = async () => {
    if (!resultImageUrl) return;
    try {
      setLoadingMessage('Preparing download...');
      if (textOverlays.length > 0) {
        const composited = await compositeCanvas();
        if (composited) {
          const res = await fetch(composited);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `thumpiks-thumbnail-${Date.now()}.jpg`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const response = await fetch(resultImageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thumpiks-thumbnail-${Date.now()}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('Download failed. Try right-clicking the image to save.');
    } finally {
      setLoadingMessage('');
    }
  };

  // ============================================
  // RENDER: Resize handles config
  // ============================================

  const handles: Array<[
    'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w',
    string, string, string, string, string,
  ]> = [
    ['nw', 'nw-resize', '0', '0', '-50%', '-50%'],
    ['n', 'n-resize', '0', '50%', '-50%', '-50%'],
    ['ne', 'ne-resize', '0', '100%', '-50%', '-50%'],
    ['e', 'e-resize', '50%', '100%', '-50%', '-50%'],
    ['se', 'se-resize', '100%', '100%', '-50%', '-50%'],
    ['s', 's-resize', '100%', '50%', '-50%', '-50%'],
    ['sw', 'sw-resize', '100%', '0', '-50%', '-50%'],
    ['w', 'w-resize', '50%', '0', '-50%', '-50%'],
  ];

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 px-4 py-6 max-w-7xl mx-auto">
        {/* Image Canvas */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onStartOver}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Start Over
              </button>

              {onPickDifferentFrame && (
                <button
                  onClick={onPickDifferentFrame}
                  className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors text-sm"
                >
                  <Grid className="w-4 h-4" />
                  Pick Different Frame
                </button>
              )}
            </div>

            {onOpenEditor && resultImageUrl && (
              <button
                onClick={() => onOpenEditor(resultImageUrl)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
              >
                Open in Full Editor
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div
            ref={canvasRef}
            className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-700
                       aspect-video w-full select-none"
            onMouseDown={() => { setActiveOverlayId(null); inlineEdit.stop(); }}
          >
            {resultImageUrl && (
              <img
                src={resultImageUrl}
                alt="Thumbnail preview"
                className="w-full h-full object-contain"
                draggable={false}
              />
            )}

            {/* Text Overlays */}
            {textOverlays.map(overlay => {
              const hasBg = !!overlay.backgroundColor;
              const isActive = activeOverlayId === overlay.id;
              const scaledFontSize = canvasSize.height > 0
                ? (overlay.fontSize / 720) * canvasSize.height
                : overlay.fontSize * 0.5;

              return (
                <div
                  key={overlay.id}
                  ref={el => { overlayDivRefs.current[overlay.id] = el; }}
                  style={{
                    position: 'absolute',
                    left: `${overlay.x}%`,
                    top: `${overlay.y}%`,
                    maxWidth: `${overlay.maxWidth || 90}%`,
                    width: (inlineEditingId === overlay.id && overlayEditWidth.current)
                      ? overlayEditWidth.current
                      : 'fit-content',
                    fontSize: `${scaledFontSize}px`,
                    color: overlay.color,
                    fontWeight: overlay.fontWeight,
                    fontFamily: overlay.fontFamily || 'Impact, sans-serif',
                    textShadow: overlay.textShadow || '2px 2px 4px rgba(0,0,0,0.7)',
                    WebkitTextStroke: overlay.textStroke || undefined,
                    letterSpacing: overlay.letterSpacing || undefined,
                    backgroundColor: hasBg ? overlay.backgroundColor : undefined,
                    padding: hasBg ? '4px 12px' : undefined,
                    borderRadius: hasBg ? '6px' : undefined,
                    cursor: inlineEditingId === overlay.id ? 'text' : dragging === overlay.id ? 'grabbing' : 'grab',
                    userSelect: inlineEditingId === overlay.id ? 'text' : 'none',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    textTransform: 'uppercase' as const,
                    lineHeight: 1.15,
                    outline: (isActive && inlineEditingId !== overlay.id)
                      ? '1.5px dashed rgba(168,85,247,0.85)' : undefined,
                    outlineOffset: (isActive && inlineEditingId !== overlay.id) ? '4px' : undefined,
                  }}
                  onMouseDown={e => {
                    if (inlineEditingId === overlay.id) return;
                    e.preventDefault();
                    handleDragStart(overlay.id, e);
                  }}
                  onDoubleClick={e => {
                    e.stopPropagation();
                    const el = overlayDivRefs.current[overlay.id];
                    overlayEditWidth.current = el ? el.offsetWidth : null;
                    inlineEdit.start(overlay.id);
                    setActiveOverlayId(overlay.id);
                    setShowTextInput(false);
                  }}
                >
                  {inlineEditingId === overlay.id ? (
                    <textarea
                      autoFocus
                      rows={1}
                      value={overlay.text}
                      onChange={inlineEdit.handleChange}
                      onBlur={() => inlineEdit.stop()}
                      onKeyDown={inlineEdit.handleKeyDown}
                      style={{ ...INLINE_EDIT_STYLES, height: 'auto', caretColor: '#a855f7' }}
                      className="inline-edit-textarea"
                    />
                  ) : (
                    overlay.text
                  )}
                  {showOverlayHint === overlay.id && !inlineEditingId && (
                    <span className="block text-center text-[10px] text-white/70 mt-1 font-normal tracking-normal normal-case pointer-events-none">
                      Drag to move · Double-click to edit
                    </span>
                  )}
                  {isActive && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); removeOverlay(overlay.id); }}
                        aria-label="Remove text overlay"
                        className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-10"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      {handles.map(([h, cur, top, left, tx, ty]) => (
                        <div
                          key={h}
                          onMouseDown={e => handleResizeStart(overlay.id, h, e)}
                          style={{
                            position: 'absolute', top, left,
                            transform: `translate(${tx}, ${ty})`,
                            cursor: cur, width: 10, height: 10,
                            background: '#fff', border: '1.5px solid #a855f7',
                            borderRadius: 2, zIndex: 20,
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              );
            })}

            {/* Loading overlay with cancel */}
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <p className="text-white text-sm">{loadingMessage}</p>
                {aiAbortController && (
                  <button
                    onClick={handleCancelAI}
                    className="px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {resultImageUrl && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sessionStorage.setItem('recreateBetterState', JSON.stringify({ imageUrl: resultImageUrl, existingAnalysis: null }));
                    window.dispatchEvent(new CustomEvent('openRecreateBetter', { detail: { imageUrl: resultImageUrl } }));
                  }}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                             bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500
                             text-white font-medium disabled:opacity-50 transition-all text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Recreate
                </button>
                <button
                  onClick={handleEnhance}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                             bg-cyan-600 hover:bg-cyan-500
                             text-white font-medium disabled:opacity-50 transition-all text-sm"
                >
                  <Wand2 className="w-4 h-4" />
                  Enhance
                </button>
                <button
                  onClick={() => navigate('/dashboard/editor', { state: { initialImage: resultImageUrl, source: 'quick-edit' } })}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                             bg-slate-700 hover:bg-slate-600
                             text-white font-medium disabled:opacity-50 transition-colors text-sm"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRevert}
                  disabled={loading || resultImageUrl === originalImageUrl}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                             bg-gray-700 hover:bg-gray-600
                             text-white font-medium disabled:opacity-50 transition-all text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Revert
                </button>
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                             bg-emerald-600 hover:bg-emerald-500
                             text-white font-medium disabled:opacity-50 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                             bg-blue-600 hover:bg-blue-500
                             text-white font-medium disabled:opacity-50 transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tools Panel */}
        <div className="lg:w-72 flex flex-col gap-3 relative">
          <h3 className="text-sm font-medium text-gray-400 uppercase mb-1">Quick Tools</h3>

          {/* Ask AI */}
          <Tooltip content="Quick one-shot AI commands" side="right" sideOffset={8}>
            <button
              onClick={toggleCommandBar}
              className="flex items-center gap-3 px-4 py-3 rounded-xl
                         bg-gradient-to-r from-purple-600/20 to-pink-600/20
                         border border-purple-500/30 hover:border-purple-500/50
                         hover:from-purple-600/30 hover:to-pink-600/30
                         text-white transition-all text-sm group"
            >
              <Command className="w-5 h-5 text-purple-400 group-hover:text-purple-300 flex-shrink-0" />
              <span className="flex-1 text-left">Ask AI Anything...</span>
              <kbd className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 flex-shrink-0">
                Ctrl+K
              </kbd>
            </button>
          </Tooltip>

          {/* Remove Background */}
          <button
            onClick={handleRemoveBackground}
            disabled={loading || !resultImageUrl}
            type="button"
            title="Remove background - free, runs locally"
            aria-label="Remove background - free, runs locally"
            className="flex items-center gap-3 px-4 py-3 rounded-xl
                       bg-emerald-600/10 border border-emerald-500/30
                       hover:border-emerald-500/50 hover:bg-emerald-600/20
                       text-white transition-all text-sm group
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Eraser className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 flex-shrink-0" />
            <span className="flex-1 text-left">Remove Background</span>
            <span className="text-[10px] text-emerald-500 bg-emerald-900/40 px-1.5 py-0.5 rounded border border-emerald-800/60 flex-shrink-0">
              Free
            </span>
          </button>

          {/* Floating Edit Panel */}
          {activeOverlayId && (() => {
            const activeOverlay = textOverlays.find(o => o.id === activeOverlayId);
            return activeOverlay ? (
              <div style={{ position: 'relative', height: 0, zIndex: 20 }}>
                <FloatingEditPanel
                  key={activeOverlayId}
                  overlay={activeOverlay}
                  anchorRef={smartTextBtnRef}
                  onClose={() => setActiveOverlayId(null)}
                  onUpdate={updates => updateOverlayProp(activeOverlayId, updates)}
                  savedPosRef={editPanelSavedPos}
                />
              </div>
            ) : null;
          })()}

          {/* Add Your Face */}
          <div className="rounded-xl bg-gray-800/50 border border-gray-700/50 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Camera className="w-4 h-4 text-pink-400" />
                Add Your Face
              </span>
              {facePhoto && (
                <Tooltip content="Remove saved face">
                  <button
                    onClick={clearFacePhoto}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    aria-label="Remove face photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              )}
            </div>

            <input
              ref={faceInputRef}
              type="file"
              accept="image/*"
              onChange={handleFacePhotoUpload}
              className="hidden"
              aria-label="Upload face photo"
            />

            {facePhoto ? (
              <div className="flex items-start gap-3">
                <img
                  src={facePhoto}
                  alt="Your face"
                  className="w-12 h-12 rounded-lg object-cover border-2 border-pink-500/40 flex-shrink-0"
                />
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <button
                    onClick={handleFaceSwap}
                    disabled={loading || !resultImageUrl}
                    className="w-full px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-500
                               text-white text-sm font-medium disabled:opacity-50
                               transition-colors flex items-center justify-center gap-1.5"
                  >
                    {loading && loadingMessage.includes('face') ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Swap Face
                  </button>
                  <button
                    onClick={() => faceInputRef.current?.click()}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Change photo
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => faceInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-4 rounded-lg border-2 border-dashed
                           border-gray-600 hover:border-pink-500/40 hover:bg-gray-800/50
                           text-gray-400 hover:text-gray-300 transition-all cursor-pointer"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Upload a photo of yourself</span>
                <span className="text-[10px] text-gray-600">Saved for next time</span>
              </button>
            )}
          </div>

          {/* Smart Text */}
          {showTextInput ? (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Smart Text
                </span>
                <button
                  onClick={() => setShowTextInput(false)}
                  className="text-gray-500 hover:text-gray-300"
                  aria-label="Close text panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => handleSmartText()}
                disabled={aiText.isGenerating || loading}
                className="w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600
                           hover:from-purple-500 hover:to-pink-500
                           text-white text-sm font-medium disabled:opacity-50
                           transition-all flex items-center justify-center gap-2"
              >
                {aiText.isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {aiText.generationStep || 'Working...'}
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Auto-Generate Text
                  </>
                )}
              </button>

              {aiText.error && !aiText.isGenerating && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {aiText.error}
                </div>
              )}

              {aiText.suggestions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Pick one:</span>
                  {aiText.suggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => applyAiSuggestion(s.text)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-gray-900 border border-gray-700
                                 hover:border-purple-500/40 hover:bg-gray-800 text-white text-sm
                                 transition-all truncate"
                    >
                      {s.text}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <hr className="flex-1 border-gray-700" />
                <span className="text-[10px] text-gray-600 uppercase">or type your own</span>
                <hr className="flex-1 border-gray-700" />
              </div>

              <input
                type="text"
                value={newTextValue}
                onChange={e => setNewTextValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTextValue.trim()) handleSmartText(newTextValue.trim());
                }}
                placeholder="Type your text..."
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700
                           text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
              />

              <button
                onClick={() => { if (newTextValue.trim()) handleSmartText(newTextValue.trim()); }}
                disabled={!newTextValue.trim() || aiText.isGenerating}
                className="w-full px-3 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500
                           text-white text-sm font-medium disabled:opacity-50 transition-colors
                           flex items-center justify-center gap-1.5"
              >
                {aiText.isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Add Text
              </button>
            </div>
          ) : (
            <button
              ref={smartTextBtnRef}
              onClick={() => setShowTextInput(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50
                         border border-gray-700/50 hover:border-purple-500/30 hover:bg-gray-800
                         text-gray-300 transition-all text-sm"
            >
              <Sparkles className="w-5 h-5 text-purple-400" />
              {textOverlays.length > 0 ? '+ Add Another Text' : 'Smart Text'}
              <span className="ml-auto text-[10px] text-gray-600">AI-styled</span>
            </button>
          )}

          {/* Text layer list */}
          {textOverlays.length > 0 && (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-700/50 flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Your Text ({textOverlays.length})
                </span>
              </div>
              <div className="divide-y divide-gray-700/30">
                {textOverlays.map(overlay => (
                  <SmartTextItem
                    key={overlay.id}
                    overlay={overlay}
                    isActive={overlay.id === activeOverlayId}
                    onSelect={() => { setActiveOverlayId(overlay.id); setShowTextInput(false); }}
                    onRemove={() => removeOverlay(overlay.id)}
                  />
                ))}
              </div>
              {!showTextInput && (
                <button
                  onClick={() => setShowTextInput(true)}
                  className="w-full px-3 py-2 text-xs text-purple-400 hover:text-purple-300
                             hover:bg-purple-600/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  Add Another Text
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Command Bar Modal */}
      <AICommandBar
        isOpen={isCommandBarOpen}
        onToggle={toggleCommandBar}
        onParseCommand={commandExecutor.parseCommand}
        onExecuteAll={commandExecutor.executeAll}
        isLoading={isCommandBarLoading}
        suggestedPrompts={[
          'Add bold white text saying "EPIC"',
          'Remove the background',
          'Enhance image quality',
          'Make the text bigger and red',
          'Move text to the top center',
          'Swap my face in',
          'Upscale to 4x resolution',
          'Generate a sunset background',
        ]}
      />
    </>
  );
};

export default QuickEditResult;
