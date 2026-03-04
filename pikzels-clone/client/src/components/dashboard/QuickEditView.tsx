import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Link2, Sparkles, UploadCloud, ArrowLeft, Download, RotateCcw,
  Wand2, Loader2, X, Check,
  Clock, ChevronRight, AlertCircle, Grid, Camera, Trash2, Save, Eye, Command,
} from 'lucide-react';
import type { VisionAnalysisResult } from '../../types/vision.types';
import {
  detectPlatform, isValidUrl, getUrlHistory, saveUrlHistory,
  uploadAsset, fetchVideoFramesStreaming, UrlHistoryEntry, VideoFrame,
  FrameExtractionProgress,
} from '../../services/quickEditService';
import { authPost } from '../../utils/api';
import AICommandBar from '../editor/components/AICommandBar';
import { useQuickEditCommandExecutor } from './hooks/useQuickEditCommandExecutor';
import { useAITextGenerator } from '../../hooks/useAITextGenerator';
import {
  useLayouts,
  TemplatePicker,
  SlotEditor,
  CompositionEngine,
} from '../../features/composition-templates';

// ============================================
// TYPES
// ============================================

type ViewState = 'start' | 'url-input' | 'frame-picker' | 'ai-generate' | 'upload' | 'result';

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
  textStroke: string;
  textShadow: string;
  letterSpacing: string;
  backgroundColor: string;
  maxWidth: number;
}

interface QuickEditViewProps {
  onClose?: () => void;
  onOpenEditor?: (imageUrl: string) => void;
}

// ============================================
// STYLE PRESETS FOR AI GENERATION
// ============================================

const STYLE_PRESETS = [
  { id: 'bold', label: 'Bold', emoji: '🎨', prompt: 'vibrant colors, eye-catching, high contrast, bold' },
  { id: 'minimalist', label: 'Minimal', emoji: '✨', prompt: 'clean, minimalist, modern design' },
  { id: 'dramatic', label: 'Dramatic', emoji: '🎭', prompt: 'dramatic lighting, intense' },
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', prompt: 'cinematic, movie poster style, epic' },
  { id: 'professional', label: 'Pro', emoji: '💼', prompt: 'professional, clean, corporate' },
  { id: 'creative', label: 'Creative', emoji: '💜', prompt: 'creative, artistic, unique style' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', prompt: 'gaming style, neon glow, futuristic' },
  { id: 'vibrant', label: 'Vibrant', emoji: '🌈', prompt: 'vibrant, saturated, colorful, energetic' },
  { id: 'retro', label: 'Retro', emoji: '📼', prompt: 'retro style, vintage aesthetic, nostalgic' },
  { id: 'neon', label: 'Neon', emoji: '💡', prompt: 'neon glow, cyberpunk, futuristic lights' },
  { id: 'natural', label: 'Natural', emoji: '🌿', prompt: 'natural, organic, warm tones' },
];

const THUMBNAIL_FONTS = [
  { label: 'Impact', value: 'Impact, Arial Black, sans-serif' },
  { label: 'Oswald', value: "'Oswald', sans-serif" },
  { label: 'Bangers', value: "'Bangers', cursive" },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { label: 'Anton', value: "'Anton', sans-serif" },
  { label: 'Permanent Marker', value: "'Permanent Marker', cursive" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
  { label: 'Poppins', value: "'Poppins', sans-serif" },
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
];

// ============================================
// COMPONENT
// ============================================

// ============================================
// SESSION PERSISTENCE
// ============================================

const SESSION_KEY = 'quickedit_state';

interface PersistedState {
  view: ViewState;
  urlInput: string;
  videoTitle: string;
  selectedFrameIdx: number | null;
  resultImageUrl: string | null;
  originalImageUrl: string | null;
  videoFrames: VideoFrame[];
  aiPrompt: string;
  selectedStyle: string | null;
}

function loadPersistedState(): Partial<PersistedState> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return {};
  }
}

function savePersistedState(state: PersistedState): void {
  try {
    // Skip saving if frames contain large base64 data (>2MB total)
    const framesSize = JSON.stringify(state.videoFrames).length;
    const toSave: PersistedState = framesSize > 2_000_000
      ? { ...state, videoFrames: [] }
      : state;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
  } catch {
    // sessionStorage full — silently fail
  }
}

const QuickEditView: React.FC<QuickEditViewProps> = ({ onClose: _onClose, onOpenEditor }) => {
  // Load persisted state once on mount
  const [persisted] = useState(() => loadPersistedState());

  // Navigation state
  const [view, setView] = useState<ViewState>(persisted.view || 'start');

  // URL path state
  const [urlInput, setUrlInput] = useState(persisted.urlInput || '');
  const [urlHistory, setUrlHistory] = useState<UrlHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<UrlHistoryEntry[]>([]);

  // AI generate state
  const [aiPrompt, setAiPrompt] = useState(persisted.aiPrompt || '');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(persisted.selectedStyle ?? null);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result state
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(persisted.resultImageUrl ?? null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(persisted.originalImageUrl ?? null);

  // Text overlay state
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [newTextValue, setNewTextValue] = useState('');
  const [textColor] = useState('#FFFFFF');
  const [textSize] = useState(48);
  const [showOverlayHint, setShowOverlayHint] = useState<string | null>(null);

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Frame picker state
  const [videoFrames, setVideoFrames] = useState<VideoFrame[]>(persisted.videoFrames || []);
  const [videoTitle, setVideoTitle] = useState(persisted.videoTitle || '');
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number | null>(persisted.selectedFrameIdx ?? null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Frame extraction progress (SSE streaming)
  const [extractionProgress, setExtractionProgress] = useState<FrameExtractionProgress | null>(null);
  const [previewFrames, setPreviewFrames] = useState<VideoFrame[]>([]);

  // "Add Your Face" state — persisted in localStorage so user only uploads once
  const FACE_STORAGE_KEY = 'quickedit_face_photo';
  const [facePhoto, setFacePhoto] = useState<string | null>(() => {
    try { return localStorage.getItem(FACE_STORAGE_KEY); } catch { return null; }
  });
  const faceInputRef = useRef<HTMLInputElement>(null);

  // AI Command Bar state
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isCommandBarLoading] = useState(false);
  const toggleCommandBar = useCallback(() => setIsCommandBarOpen((prev) => !prev), []);

  // Refs for stable hook callbacks (avoid stale closures)
  const textOverlaysRef = useRef(textOverlays);
  textOverlaysRef.current = textOverlays;
  const activeOverlayIdRef = useRef(activeOverlayId);
  activeOverlayIdRef.current = activeOverlayId;
  const resultImageUrlRef = useRef(resultImageUrl);
  resultImageUrlRef.current = resultImageUrl;
  const facePhotoRef = useRef(facePhoto);
  facePhotoRef.current = facePhoto;

  const commandExecutor = useQuickEditCommandExecutor({
    addTextOverlay: (overlay) => {
      setTextOverlays((prev) => [...prev, overlay]);
      setActiveOverlayId(overlay.id);
      setShowOverlayHint(overlay.id);
      setTimeout(() => setShowOverlayHint(null), 3000);
    },
    updateOverlayProp: (id, patch) => {
      setTextOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    },
    removeOverlay: (id) => {
      setTextOverlays((prev) => prev.filter((o) => o.id !== id));
      if (activeOverlayIdRef.current === id) setActiveOverlayId(null);
    },
    setActiveOverlayId,
    getResultImageUrl: () => resultImageUrlRef.current,
    setResultImageUrl: (url) => setResultImageUrl(url),
    setLoading,
    setLoadingMessage,
    setError,
    getTextOverlays: () => textOverlaysRef.current,
    getActiveOverlayId: () => activeOverlayIdRef.current,
    getFacePhoto: () => facePhotoRef.current,
  });

  // Layouts
  const layouts = useLayouts();
  const [showCompositionPanel, setShowCompositionPanel] = useState(false);

  // Smart Text — consolidated hook for vision-aware AI text generation
  const aiText = useAITextGenerator();

  const handleApplyComposition = useCallback(async () => {
    if (!layouts.selectedTemplate || !layouts.compositionState) return;
    const missing = layouts.getMissingSlots();
    if (missing.length > 0) {
      setError(`Fill required slots: ${missing.join(', ')}`);
      return;
    }
    setLoading(true);
    setLoadingMessage('Rendering layout...');
    try {
      const dataUrl = await CompositionEngine.renderToDataUrl(
        layouts.selectedTemplate,
        layouts.compositionState
      );
      setResultImageUrl(dataUrl);
      setShowCompositionPanel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render layout');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [layouts]);

  const handleFacePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setFacePhoto(dataUrl);
      try { localStorage.setItem(FACE_STORAGE_KEY, dataUrl); } catch { /* full */ }
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  }, []);

  const clearFacePhoto = useCallback(() => {
    setFacePhoto(null);
    try { localStorage.removeItem(FACE_STORAGE_KEY); } catch { /* */ }
  }, []);

  // Persist state on changes
  useEffect(() => {
    savePersistedState({
      view,
      urlInput,
      videoTitle,
      selectedFrameIdx,
      resultImageUrl,
      originalImageUrl,
      videoFrames,
      aiPrompt,
      selectedStyle,
    });
  }, [view, urlInput, videoTitle, selectedFrameIdx, resultImageUrl, originalImageUrl, videoFrames, aiPrompt, selectedStyle]);

  // ============================================
  // URL HISTORY
  // ============================================

  const loadUrlHistory = useCallback(async () => {
    try {
      const history = await getUrlHistory(10);
      setUrlHistory(history);
      setFilteredHistory(history);
    } catch {
      // Silent fail — history is nice-to-have
    }
  }, []);

  useEffect(() => {
    if (view === 'url-input') {
      loadUrlHistory();
    }
  }, [view, loadUrlHistory]);

  useEffect(() => {
    if (urlInput.trim()) {
      const filtered = urlHistory.filter(
        (h) =>
          h.url.toLowerCase().includes(urlInput.toLowerCase()) ||
          (h.title && h.title.toLowerCase().includes(urlInput.toLowerCase()))
      );
      setFilteredHistory(filtered);
    } else {
      setFilteredHistory(urlHistory);
    }
  }, [urlInput, urlHistory]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    if (!isValidUrl(urlInput)) {
      setError('Please enter a valid URL');
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingMessage('Connecting to video...');
    setExtractionProgress(null);
    setPreviewFrames([]);

    try {
      const platform = detectPlatform(urlInput);

      // Save to history (fire & forget)
      saveUrlHistory({
        url: urlInput,
        platform: platform || undefined,
      }).catch(() => {});

      // Stream frame extraction with real-time progress
      const result = await fetchVideoFramesStreaming(urlInput, (progress) => {
        setExtractionProgress(progress);
        setLoadingMessage(progress.message);

        // Accumulate preview frames as they arrive
        if (progress.frame) {
          setPreviewFrames((prev) => [...prev, progress.frame!]);
        }
      });

      if (result.frames.length > 0) {
        setVideoFrames(result.frames);
        setVideoTitle(result.videoInfo.title);
        setSelectedFrameIdx(null);
        setView('frame-picker');
      } else {
        throw new Error('No frames found for this video');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
      setExtractionProgress(null);
      setPreviewFrames([]);
    }
  };

  const handleFrameSelect = (idx: number) => {
    setSelectedFrameIdx(idx);
  };

  const handleFrameConfirm = () => {
    if (selectedFrameIdx === null || !videoFrames[selectedFrameIdx]) return;
    const frame = videoFrames[selectedFrameIdx];
    setResultImageUrl(frame.url);
    setOriginalImageUrl(frame.url);
    aiText.clearVisionAnalysis();
    aiText.clearSuggestions();
    setView('result');
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setError(null);
    setLoading(true);
    setLoadingMessage('Creating your thumbnail with AI...');

    try {
      const stylePreset = STYLE_PRESETS.find((s) => s.id === selectedStyle);
      const fullPrompt = stylePreset
        ? `${aiPrompt}, ${stylePreset.prompt}`
        : aiPrompt;

      // Use the same endpoint as AI Tools page (DRY)
      const res = await authPost('/api/thumbnails/ai/generate', {
        prompt: fullPrompt,
        style: selectedStyle || 'bold',
        tier: 'flash',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();

      // Same response format as AI Tools: { success, images: string[] }
      if (data.success && data.images && data.images.length > 0) {
        setResultImageUrl(data.images[0]);
        setOriginalImageUrl(data.images[0]);
        aiText.clearVisionAnalysis();
        aiText.clearSuggestions();
        setView('result');
      } else {
        throw new Error('No image returned from AI');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI generation failed. Try again.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB');
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingMessage('Uploading your image...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;

        // Upload to Cloudinary via our API
        try {
          const asset = await uploadAsset({
            type: 'other',
            imageData: dataUrl,
            name: file.name,
          });

          setResultImageUrl(asset.url);
          setOriginalImageUrl(asset.url);
          aiText.clearVisionAnalysis();
          aiText.clearSuggestions();
          setView('result');
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Failed to read file');
      setLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  // ============================================
  // TEXT OVERLAY HANDLERS
  // ============================================

  const addTextOverlay = () => {
    if (!newTextValue.trim()) return;

    const overlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text: newTextValue,
      x: 50,
      y: 50,
      fontSize: textSize,
      color: textColor,
      fontWeight: '700',
      fontFamily: 'Impact, Arial Black, sans-serif',
      textStroke: '2px black',
      textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
      letterSpacing: '1px',
      backgroundColor: '',
      maxWidth: 90,
    };

    setTextOverlays((prev) => [...prev, overlay]);
    setNewTextValue('');
    setShowTextInput(false);
    setActiveOverlayId(overlay.id);
    setShowOverlayHint(overlay.id);
    setTimeout(() => setShowOverlayHint(null), 3000);
  };

  const updateOverlayProp = (id: string, patch: Partial<TextOverlay>) => {
    setTextOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
  };

  const removeOverlay = (id: string) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
    if (activeOverlayId === id) setActiveOverlayId(null);
  };

  const handleDragStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const overlay = textOverlays.find((o) => o.id === id);
    if (!overlay || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const overlayX = (overlay.x / 100) * rect.width;
    const overlayY = (overlay.y / 100) * rect.height;

    setDragging(id);
    setDragOffset({
      x: e.clientX - rect.left - overlayX,
      y: e.clientY - rect.top - overlayY,
    });
    setActiveOverlayId(id);
  };

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      setTextOverlays((prev) =>
        prev.map((o) =>
          o.id === dragging
            ? { ...o, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
            : o
        )
      );
    },
    [dragging, dragOffset]
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragging, handleDragMove, handleDragEnd]);

  // ============================================
  // AI TOOLS (face swap, enhance)
  // ============================================

  const handleFaceSwap = async () => {
    if (!resultImageUrl || !facePhoto) return;
    setLoading(true);
    setLoadingMessage('Adding your face...');
    setError(null);

    try {
      const res = await authPost('/api/thumbnails/ai/face-swap', {
        sourceImage: facePhoto,
        targetImage: resultImageUrl,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Face swap failed' }));
        throw new Error(err.error || 'Face swap failed');
      }

      const data = await res.json();
      if (data.success && data.images?.length > 0) {
        setResultImageUrl(data.images[0]);
        aiText.clearVisionAnalysis();
        aiText.clearSuggestions();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Face swap failed');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleEnhance = async () => {
    if (!resultImageUrl) return;
    setLoading(true);
    setLoadingMessage('Enhancing image quality...');
    setError(null);

    try {
      const res = await authPost('/api/thumbnails/ai/enhance', {
        imageUrl: resultImageUrl,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Enhancement failed' }));
        throw new Error(err.error || 'Enhancement failed');
      }

      const data = await res.json();
      if (data.imageUrl) {
        setResultImageUrl(data.imageUrl);
        aiText.clearVisionAnalysis();
        aiText.clearSuggestions();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRevert = () => {
    if (originalImageUrl) {
      setResultImageUrl(originalImageUrl);
      aiText.clearVisionAnalysis();
      aiText.clearSuggestions();
      setTextOverlays([]);
      setActiveOverlayId(null);
    }
  };

  // ============================================
  // SMART TEXT — vision-aware styling (QuickEdit-specific)
  // Text generation is handled by aiText hook (shared with Editor)
  // ============================================

  // Thumbnail font presets mapped by mood keywords
  const MOOD_FONTS: Record<string, string> = {
    dramatic: 'Oswald, Impact, sans-serif',
    intense: 'Oswald, Impact, sans-serif',
    dark: 'Oswald, Impact, sans-serif',
    energetic: 'Bangers, Impact, cursive',
    fun: 'Bangers, Poppins, cursive',
    playful: 'Bangers, Poppins, cursive',
    happy: 'Poppins, Nunito, sans-serif',
    bright: 'Poppins, Nunito, sans-serif',
    calm: 'Quicksand, Nunito, sans-serif',
    mysterious: 'Playfair Display, Georgia, serif',
    elegant: 'Playfair Display, Georgia, serif',
    professional: 'Montserrat, Arial, sans-serif',
    serious: 'Montserrat, Oswald, sans-serif',
    bold: 'Impact, Arial Black, sans-serif',
  };

  const isColorDark = (hex: string): boolean => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  };

  const computeStyleFromAnalysis = useCallback((analysis: VisionAnalysisResult): Partial<TextOverlay> => {
    const { dominantColor, mood, colorContrast, colorPalette } = analysis.elements;

    // Font from mood
    const moodLower = (mood || '').toLowerCase();
    const fontFamily = Object.entries(MOOD_FONTS).find(
      ([key]) => moodLower.includes(key)
    )?.[1] || 'Impact, Arial Black, sans-serif';

    // Text color: contrast with dominant
    const bgDark = isColorDark(dominantColor || '#000000');
    let color = bgDark ? '#FFFFFF' : '#000000';
    if (colorPalette?.length > 0) {
      const contrasty = colorPalette.find(c => isColorDark(c) !== bgDark);
      if (contrasty) color = contrasty;
    }

    // Stroke and shadow based on contrast
    const strokeColor = bgDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
    const textStroke = `2px ${strokeColor}`;
    const textShadow = colorContrast === 'low'
      ? '3px 3px 6px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)'
      : '2px 2px 4px rgba(0,0,0,0.7)';

    // Background banner: semi-transparent dominant color or dark overlay
    const bgHex = dominantColor || '#000000';
    const bgR = parseInt(bgHex.replace('#', '').substring(0, 2), 16);
    const bgG = parseInt(bgHex.replace('#', '').substring(2, 4), 16);
    const bgB = parseInt(bgHex.replace('#', '').substring(4, 6), 16);
    const backgroundColor = bgDark
      ? `rgba(0, 0, 0, 0.6)`
      : `rgba(${bgR}, ${bgG}, ${bgB}, 0.7)`;

    return {
      fontFamily,
      color,
      fontWeight: '900',
      fontSize: 80,
      textStroke,
      textShadow,
      letterSpacing: '2px',
      backgroundColor,
      maxWidth: 90,
    };
  }, []);

  // Professional default style (used when vision API is unavailable)
  const DEFAULT_SMART_STYLE: Partial<TextOverlay> = {
    fontFamily: 'Impact, Arial Black, sans-serif',
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 80,
    textStroke: '2px rgba(0,0,0,0.8)',
    textShadow: '3px 3px 6px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)',
    letterSpacing: '2px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    maxWidth: 90,
  };

  /** Build overlay style from vision analysis (if cached) or defaults */
  const getSmartStyle = useCallback((): Partial<TextOverlay> => {
    const analysis = aiText.visionAnalysis;
    if (analysis) {
      return { ...DEFAULT_SMART_STYLE, ...computeStyleFromAnalysis(analysis) };
    }
    return DEFAULT_SMART_STYLE;
  }, [aiText.visionAnalysis, computeStyleFromAnalysis]);

  const handleSmartText = async (customText?: string) => {
    if (!resultImageUrl) return;
    setError(null);

    if (customText) {
      // User typed their own text — apply smart (or default) styling
      const style = getSmartStyle();
      const overlay: TextOverlay = {
        id: `text-${Date.now()}`,
        text: customText,
        x: 50,
        y: 75,
        fontSize: style.fontSize || 80,
        color: style.color || '#FFFFFF',
        fontWeight: style.fontWeight || '900',
        fontFamily: style.fontFamily || 'Impact, sans-serif',
        textStroke: style.textStroke || '2px rgba(0,0,0,0.8)',
        textShadow: style.textShadow || '3px 3px 6px rgba(0,0,0,0.8)',
        letterSpacing: style.letterSpacing || '2px',
        backgroundColor: style.backgroundColor || '',
        maxWidth: style.maxWidth || 90,
      };
      setTextOverlays((prev) => [...prev, overlay]);
      setActiveOverlayId(overlay.id);
      setShowTextInput(false);
      setNewTextValue('');
      setShowOverlayHint(overlay.id);
      setTimeout(() => setShowOverlayHint(null), 3000);
    } else {
      // Auto-generate: vision analysis + text generation via shared hook
      try {
        await aiText.generateFromImage({
          imageUrl: resultImageUrl,
          fallbackPrompt: videoTitle || undefined,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Text generation failed');
      }
    }
  };

  const applyAiSuggestion = (text: string) => {
    const style = getSmartStyle();
    const overlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text,
      x: 50,
      y: 75,
      fontSize: style.fontSize || 80,
      color: style.color || '#FFFFFF',
      fontWeight: style.fontWeight || '900',
      fontFamily: style.fontFamily || 'Impact, sans-serif',
      textStroke: style.textStroke || '2px rgba(0,0,0,0.8)',
      textShadow: style.textShadow || '3px 3px 6px rgba(0,0,0,0.8)',
      letterSpacing: style.letterSpacing || '2px',
      backgroundColor: style.backgroundColor || '',
      maxWidth: style.maxWidth || 90,
    };
    setTextOverlays((prev) => [...prev, overlay]);
    setActiveOverlayId(overlay.id);
    aiText.clearSuggestions();
    setShowOverlayHint(overlay.id);
    setTimeout(() => setShowOverlayHint(null), 3000);
  };

  // ============================================
  // SAVE — composite image + overlays into one image
  // ============================================

  const compositeCanvas = useCallback(async (): Promise<string | null> => {
    if (!resultImageUrl) return null;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = resultImageUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 1280;
    canvas.height = img.naturalHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const overlay of textOverlays) {
      const scaledFontSize = (overlay.fontSize / 100) * canvas.height;
      ctx.font = `${overlay.fontWeight} ${scaledFontSize}px ${overlay.fontFamily || 'sans-serif'}`;
      ctx.fillStyle = overlay.color;
      ctx.textBaseline = 'top';

      const x = (overlay.x / 100) * canvas.width;
      const y = (overlay.y / 100) * canvas.height;
      const maxW = ((overlay.maxWidth || 90) / 100) * canvas.width;

      // Word-wrap into lines
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

      // Background banner
      if (overlay.backgroundColor) {
        let maxLineWidth = 0;
        for (const line of lines) {
          maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
        }
        ctx.fillStyle = overlay.backgroundColor;
        const rx = 8 * (scaledFontSize / 48);
        const bgX = x - hPadding;
        const bgY = y - padding;
        const bgW = maxLineWidth + hPadding * 2;
        const bgH = totalHeight + padding * 2;
        // Rounded rect
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

      // Draw each line with stroke + fill
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

    return canvas.toDataURL('image/jpeg', 0.92);
  }, [resultImageUrl, textOverlays]);

  const handleSave = async () => {
    if (!resultImageUrl) return;
    setLoading(true);
    setLoadingMessage('Saving...');
    setError(null);

    try {
      if (textOverlays.length > 0) {
        const composited = await compositeCanvas();
        if (composited) {
          setResultImageUrl(composited);
          setOriginalImageUrl((prev) => prev || resultImageUrl);
          setTextOverlays([]);
          setActiveOverlayId(null);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // ============================================
  // DOWNLOAD
  // ============================================

  const handleDownload = async () => {
    if (!resultImageUrl) return;

    try {
      setLoadingMessage('Preparing download...');

      // If there are text overlays, composite them onto canvas
      if (textOverlays.length > 0) {
        const composited = await compositeCanvas();
        if (composited) {
          // Convert data URL to blob for download
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
        // Direct download
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
  // RENDER: START SCREEN
  // ============================================

  const renderStartScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Create a Thumbnail
        </h1>
        <p className="text-gray-400 text-lg">
          Pick how you want to start — it only takes a minute.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
        {/* Paste URL */}
        <button
          onClick={() => setView('url-input')}
          className="group flex flex-col items-center gap-4 p-8 rounded-2xl
                     bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/50
                     hover:bg-gray-800 transition-all duration-200 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center
                          group-hover:bg-purple-500/20 transition-colors">
            <Link2 className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Paste a Link</h3>
            <p className="text-gray-400 text-sm mt-1">YouTube, TikTok, etc.</p>
          </div>
        </button>

        {/* AI Generate */}
        <button
          onClick={() => setView('ai-generate')}
          className="group flex flex-col items-center gap-4 p-8 rounded-2xl
                     bg-gray-800/50 border border-gray-700/50 hover:border-amber-500/50
                     hover:bg-gray-800 transition-all duration-200 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center
                          group-hover:bg-amber-500/20 transition-colors">
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">AI Generate</h3>
            <p className="text-gray-400 text-sm mt-1">Describe what you want</p>
          </div>
        </button>

        {/* Upload Image */}
        <button
          onClick={() => setView('upload')}
          className="group flex flex-col items-center gap-4 p-8 rounded-2xl
                     bg-gray-800/50 border border-gray-700/50 hover:border-emerald-500/50
                     hover:bg-gray-800 transition-all duration-200 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center
                          group-hover:bg-emerald-500/20 transition-colors">
            <UploadCloud className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Upload Image</h3>
            <p className="text-gray-400 text-sm mt-1">JPG, PNG up to 10MB</p>
          </div>
        </button>
      </div>
    </div>
  );

  // ============================================
  // RENDER: URL INPUT
  // ============================================

  const renderUrlInput = () => (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => { setView('start'); setError(null); }}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h2 className="text-2xl font-bold text-white mb-2">Paste a video link</h2>
      <p className="text-gray-400 mb-6">We'll grab the best frames for you.</p>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-4 py-3 pr-10 rounded-xl bg-gray-800 border border-gray-700
                       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                       transition-colors"
            autoFocus
          />
          {urlInput && (
            <button
              onClick={() => setUrlInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              aria-label="Clear URL"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleUrlSubmit}
          disabled={loading || !urlInput.trim()}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500
                     text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          Go
        </button>
      </div>

      {/* URL History */}
      {filteredHistory.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Recent URLs
          </h3>
          <div className="space-y-2">
            {filteredHistory.slice(0, 5).map((entry) => (
              <button
                key={entry.id}
                onClick={() => { setUrlInput(entry.url); }}
                className="w-full text-left px-4 py-3 rounded-xl bg-gray-800/50
                           border border-gray-700/30 hover:border-gray-600
                           transition-colors group flex items-center gap-3"
              >
                <Link2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 truncate text-sm">{entry.url}</p>
                  {entry.title && (
                    <p className="text-gray-500 text-xs truncate">{entry.title}</p>
                  )}
                </div>
                {entry.platform && (
                  <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
                    {entry.platform}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: AI GENERATE
  // ============================================

  const renderAiGenerate = () => (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => { setView('start'); setError(null); }}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h2 className="text-2xl font-bold text-white mb-2">Generate with AI</h2>
      <p className="text-gray-400 mb-6">Describe your thumbnail and we'll create it.</p>

      <textarea
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        placeholder="e.g. A person reacting with shock, neon background, bold text saying 'NO WAY'"
        rows={3}
        className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700
                   text-white placeholder-gray-500 focus:outline-none focus:border-amber-500
                   transition-colors resize-none"
        autoFocus
      />

      {/* Style Presets */}
      <div className="mt-4">
        <p className="text-sm text-gray-500 mb-3">Style (optional)</p>
        <div className="flex flex-wrap gap-2">
          {STYLE_PRESETS.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(selectedStyle === style.id ? null : style.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                ${
                  selectedStyle === style.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 border'
                    : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
            >
              {style.emoji} {style.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleAiGenerate}
        disabled={loading || !aiPrompt.trim()}
        className="mt-6 w-full px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500
                   text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Thumbnail
          </>
        )}
      </button>
    </div>
  );

  // ============================================
  // RENDER: UPLOAD
  // ============================================

  const renderUpload = () => (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => { setView('start'); setError(null); }}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h2 className="text-2xl font-bold text-white mb-2">Upload an image</h2>
      <p className="text-gray-400 mb-6">Drop your image here or click to browse.</p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-4 p-12 rounded-2xl
                   border-2 border-dashed border-gray-700 hover:border-emerald-500/50
                   bg-gray-800/30 hover:bg-gray-800/50 transition-all cursor-pointer"
      >
        <UploadCloud className="w-12 h-12 text-gray-500" />
        <div className="text-center">
          <p className="text-gray-300 font-medium">
            Drag & drop or <span className="text-emerald-400">browse</span>
          </p>
          <p className="text-gray-500 text-sm mt-1">JPG, PNG, WebP — up to 10MB</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );

  // ============================================
  // RENDER: FRAME PICKER
  // ============================================

  const renderFramePicker = () => (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => { setView('url-input'); setError(null); }}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-2xl font-bold text-white">Pick a frame</h2>
          {videoTitle && (
            <p className="text-gray-400 text-sm mt-1 truncate max-w-lg">{videoTitle}</p>
          )}
        </div>
        <button
          onClick={handleFrameConfirm}
          disabled={selectedFrameIdx === null}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500
                     text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Use This Frame
        </button>
      </div>

      {videoFrames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Grid className="w-12 h-12 mb-3" />
          <p>No frames available</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {videoFrames.map((frame, idx) => (
            <button
              key={frame.url}
              onClick={() => handleFrameSelect(idx)}
              className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200
                aspect-video bg-gray-900
                ${selectedFrameIdx === idx
                  ? 'border-purple-500 ring-2 ring-purple-500/30 scale-[1.02]'
                  : 'border-gray-700/50 hover:border-gray-500'
                }`}
            >
              <img
                src={frame.url}
                alt={frame.label}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />

              {/* Selection indicator */}
              {selectedFrameIdx === idx && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-purple-500
                                flex items-center justify-center shadow-lg">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Label badge */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent
                              px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs font-medium truncate">{frame.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom confirm bar (mobile friendly) */}
      {selectedFrameIdx !== null && (
        <div className="mt-6 flex items-center justify-between bg-gray-800/60 border border-gray-700/50
                        rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src={videoFrames[selectedFrameIdx].url}
              alt="Selected frame"
              className="w-16 h-10 rounded-lg object-cover border border-gray-600"
            />
            <div>
              <p className="text-white text-sm font-medium">
                {videoFrames[selectedFrameIdx].label}
              </p>
              {videoFrames[selectedFrameIdx].width && (
                <p className="text-gray-500 text-xs">
                  {videoFrames[selectedFrameIdx].width} × {videoFrames[selectedFrameIdx].height}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleFrameConfirm}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500
                       text-white font-medium transition-colors flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            Continue to Edit
          </button>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: RESULT SCREEN
  // ============================================

  const renderResult = () => (
    <div className="flex flex-col lg:flex-row gap-6 px-4 py-6 max-w-7xl mx-auto">
      {/* Image Canvas */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setView('start');
                setResultImageUrl(null);
                setOriginalImageUrl(null);
                setTextOverlays([]);
                setError(null);
              }}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Start Over
            </button>

            {videoFrames.length > 0 && (
              <button
                onClick={() => {
                  setResultImageUrl(null);
                  setOriginalImageUrl(null);
                  setTextOverlays([]);
                  setError(null);
                  setView('frame-picker');
                }}
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
          onMouseDown={() => setActiveOverlayId(null)}
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
          {textOverlays.map((overlay) => {
            const hasBg = !!overlay.backgroundColor;
            return (
              <div
                key={overlay.id}
                style={{
                  position: 'absolute',
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  maxWidth: `${overlay.maxWidth || 90}%`,
                  fontSize: `${overlay.fontSize * 0.5}px`,
                  color: overlay.color,
                  fontWeight: overlay.fontWeight,
                  fontFamily: overlay.fontFamily || 'Impact, sans-serif',
                  textShadow: overlay.textShadow || '2px 2px 4px rgba(0,0,0,0.7)',
                  WebkitTextStroke: overlay.textStroke || undefined,
                  letterSpacing: overlay.letterSpacing || undefined,
                  backgroundColor: hasBg ? overlay.backgroundColor : undefined,
                  padding: hasBg ? '4px 12px' : undefined,
                  borderRadius: hasBg ? '6px' : undefined,
                  cursor: dragging === overlay.id ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  textTransform: 'uppercase' as const,
                  lineHeight: 1.15,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDragStart(overlay.id, e);
                }}
                className={`${activeOverlayId === overlay.id ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-transparent rounded' : ''}`}
              >
                {overlay.text}
                {showOverlayHint === overlay.id && (
                  <span className="block text-center text-[10px] text-white/70 mt-1 font-normal tracking-normal normal-case pointer-events-none">
                    Drag to move · Click to edit
                  </span>
                )}
                {activeOverlayId === overlay.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOverlay(overlay.id);
                    }}
                    aria-label="Remove text overlay"
                    className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 rounded-full
                               flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <p className="text-white text-sm">{loadingMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tools Panel */}
      <div className="lg:w-72 flex flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-400 uppercase mb-1">Quick Tools</h3>

        {/* AI Command Bar Trigger */}
        <button
          onClick={toggleCommandBar}
          className="flex items-center gap-3 px-4 py-3 rounded-xl
                     bg-gradient-to-r from-purple-600/20 to-pink-600/20
                     border border-purple-500/30 hover:border-purple-500/50
                     hover:from-purple-600/30 hover:to-pink-600/30
                     text-white transition-all text-sm group"
          title="AI Command Bar (Ctrl+K)"
        >
          <Command className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
          <span className="flex-1 text-left">Ask AI anything...</span>
          <kbd className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
            Ctrl+K
          </kbd>
        </button>

        {/* Layouts */}
        {showCompositionPanel ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {layouts.selectedTemplate && layouts.compositionState ? (
              <div className="flex flex-col gap-2">
                <SlotEditor
                  template={layouts.selectedTemplate}
                  compositionState={layouts.compositionState}
                  onFillSlot={layouts.fillSlot}
                  onClearSlot={layouts.clearSlot}
                  onFillTextSlot={layouts.fillTextSlot}
                  onClearTextSlot={layouts.clearTextSlot}
                  availableImages={[
                    ...(resultImageUrl ? [{ label: 'Current image', url: resultImageUrl }] : []),
                    ...(facePhoto ? [{ label: 'Your face', url: facePhoto }] : []),
                    ...(originalImageUrl && originalImageUrl !== resultImageUrl
                      ? [{ label: 'Original', url: originalImageUrl }]
                      : []),
                  ]}
                />
                <div className="flex gap-2 p-3 pt-0">
                  <button
                    onClick={() => layouts.clearTemplate()}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600
                               text-gray-300 text-sm transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleApplyComposition}
                    disabled={loading || !layouts.isComplete()}
                    className="flex-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500
                               text-white text-sm font-medium disabled:opacity-50 transition-colors
                               flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <TemplatePicker
                  templates={layouts.filteredTemplates}
                  selectedTemplateId={layouts.selectedTemplate?.id ?? null}
                  categoryFilter={layouts.categoryFilter}
                  searchQuery={layouts.searchQuery}
                  onCategoryChange={layouts.setCategoryFilter}
                  onSearchChange={layouts.setSearchQuery}
                  onSelectTemplate={layouts.selectTemplate}
                  onClearTemplate={() => setShowCompositionPanel(false)}
                />
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowCompositionPanel(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50
                       border border-gray-700/50 hover:border-indigo-500/30 hover:bg-gray-800
                       text-gray-300 transition-all text-sm"
          >
            <Grid className="w-5 h-5 text-indigo-400" />
            Layouts
          </button>
        )}

        {/* Smart Text */}
        {showTextInput ? (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Smart Text
              </span>
              <button
                onClick={() => { setShowTextInput(false); aiText.clearSuggestions(); }}
                className="text-gray-500 hover:text-gray-300"
                aria-label="Close text panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* AI Auto-generate button */}
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

            {/* AI Suggestions */}
            {aiText.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Pick one:</span>
                {aiText.suggestions.map((s) => (
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

            {/* Divider */}
            <div className="flex items-center gap-2">
              <hr className="flex-1 border-gray-700" />
              <span className="text-[10px] text-gray-600 uppercase">or type your own</span>
              <hr className="flex-1 border-gray-700" />
            </div>

            {/* Manual text input */}
            <input
              type="text"
              value={newTextValue}
              onChange={(e) => setNewTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTextValue.trim()) {
                  handleSmartText(newTextValue.trim());
                }
              }}
              placeholder="Type your text..."
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700
                         text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                         text-sm"
            />

            <button
              onClick={() => {
                if (newTextValue.trim()) handleSmartText(newTextValue.trim());
              }}
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
            onClick={() => setShowTextInput(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50
                       border border-gray-700/50 hover:border-purple-500/30 hover:bg-gray-800
                       text-gray-300 transition-all text-sm"
          >
            <Sparkles className="w-5 h-5 text-purple-400" />
            Smart Text
            <span className="ml-auto text-[10px] text-gray-600">AI-styled</span>
          </button>
        )}

        {/* Selected Text Overlay Editor */}
        {activeOverlayId && (() => {
          const active = textOverlays.find((o) => o.id === activeOverlayId);
          if (!active) return null;
          return (
            <div className="bg-gray-800 rounded-xl p-3 border border-purple-500/30 space-y-2.5">
              <span className="text-xs font-medium text-purple-300 uppercase tracking-wider">Edit Text</span>

              {/* Inline text editor */}
              <input
                type="text"
                value={active.text}
                onChange={(e) => updateOverlayProp(active.id, { text: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700
                           text-white text-sm focus:outline-none focus:border-purple-500"
              />

              {/* Font picker */}
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Font</span>
                <div className="grid grid-cols-2 gap-1">
                  {THUMBNAIL_FONTS.map((f) => (
                    <button
                      key={f.label}
                      onClick={() => updateOverlayProp(active.id, { fontFamily: f.value })}
                      className={`px-2 py-1.5 rounded text-xs text-left truncate transition-all
                        ${active.fontFamily === f.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-900 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                      style={{ fontFamily: f.value }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Color</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['#FFFFFF', '#000000', '#FF0000', '#FFD600', '#00E676', '#2979FF', '#FF6D00', '#E040FB'].map((c) => (
                    <button
                      key={c}
                      onClick={() => updateOverlayProp(active.id, { color: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        active.color === c ? 'border-purple-400 scale-110' : 'border-gray-600 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Set text color to ${c}`}
                      title={c}
                    />
                  ))}
                  <label className="relative w-6 h-6 rounded-full border-2 border-dashed border-gray-500 hover:border-gray-300 cursor-pointer flex items-center justify-center transition-colors" title="Custom color">
                    <span className="text-gray-400 text-[10px] leading-none">+</span>
                    <input
                      type="color"
                      value={active.color}
                      onChange={(e) => updateOverlayProp(active.id, { color: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      aria-label="Custom text color"
                      title="Pick custom color"
                    />
                  </label>
                </div>
              </div>

              {/* Size slider */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 w-6">Size</span>
                <input
                  type="range"
                  min={30}
                  max={120}
                  value={active.fontSize}
                  onChange={(e) => updateOverlayProp(active.id, { fontSize: Number(e.target.value) })}
                  className="flex-1 accent-purple-500"
                  aria-label="Text size"
                  title="Text size"
                />
                <span className="text-gray-400 text-[10px] w-6">{active.fontSize}</span>
              </div>

              {/* Banner toggle */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 uppercase">Background banner</span>
                <button
                  onClick={() => {
                    updateOverlayProp(active.id, {
                      backgroundColor: active.backgroundColor ? '' : 'rgba(0, 0, 0, 0.6)',
                    });
                  }}
                  aria-label="Toggle background banner"
                  title="Toggle background banner"
                  className={`w-9 h-5 rounded-full transition-colors relative
                    ${active.backgroundColor ? 'bg-purple-600' : 'bg-gray-700'}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform
                      ${active.backgroundColor ? 'left-[18px]' : 'left-0.5'}`}
                  />
                </button>
              </div>
            </div>
          );
        })()}

        {/* Add Your Face */}
        <div className="rounded-xl bg-gray-800/50 border border-gray-700/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Camera className="w-4 h-4 text-pink-400" />
              Add Your Face
            </span>
            {facePhoto && (
              <button
                onClick={clearFacePhoto}
                className="text-gray-500 hover:text-red-400 transition-colors"
                aria-label="Remove face photo"
                title="Remove saved face"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={faceInputRef}
            type="file"
            accept="image/*"
            onChange={handleFacePhotoUpload}
            className="hidden"
            aria-label="Upload face photo"
          />

          {facePhoto ? (
            <div className="flex items-center gap-3">
              {/* Face thumbnail */}
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

        {/* Enhance */}
        <button
          onClick={handleEnhance}
          disabled={loading}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50
                     border border-gray-700/50 hover:border-cyan-500/30 hover:bg-gray-800
                     text-gray-300 transition-all text-sm disabled:opacity-50"
        >
          <Wand2 className="w-5 h-5 text-cyan-400" />
          Enhance
        </button>

        {/* Revert */}
        <button
          onClick={handleRevert}
          disabled={loading || resultImageUrl === originalImageUrl}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50
                     border border-gray-700/50 hover:border-gray-500/30 hover:bg-gray-800
                     text-gray-300 transition-all text-sm disabled:opacity-50"
        >
          <RotateCcw className="w-5 h-5 text-gray-400" />
          Revert to Original
        </button>

        {/* Divider */}
        <hr className="border-gray-700/50 my-2" />

        {/* Save — flatten text overlays into image */}
        {textOverlays.length > 0 && (
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                       bg-blue-600 hover:bg-blue-500 text-white font-medium
                       disabled:opacity-50 transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        )}

        {/* Download — hero button */}
        <button
          onClick={handleDownload}
          disabled={loading || !resultImageUrl}
          className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl
                     bg-emerald-600 hover:bg-emerald-500 text-white font-semibold
                     disabled:opacity-50 transition-colors text-base shadow-lg shadow-emerald-900/30"
        >
          <Download className="w-5 h-5" />
          Download
        </button>
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-[60vh]">
      {/* Error toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-red-500/90 text-white
                        px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading overlay for non-result views */}
      {loading && view !== 'result' && view !== 'frame-picker' && (
        <div className="fixed inset-0 z-40 bg-gray-900/90 flex items-center justify-center">
          <div className="w-full max-w-lg mx-4 bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-2xl">
            {/* Phase & message */}
            <div className="flex items-center gap-3 mb-4">
              {extractionProgress?.phase === 'extracting' ? (
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-400 font-bold text-sm">
                    {extractionProgress.current || 0}
                  </span>
                </div>
              ) : (
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              )}
              <div>
                <p className="text-white font-medium">{loadingMessage}</p>
                {extractionProgress?.phase === 'extracting' && extractionProgress.total && (
                  <p className="text-gray-400 text-xs mt-0.5">
                    {extractionProgress.current} of {extractionProgress.total} frames
                  </p>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {extractionProgress?.phase === 'extracting' && extractionProgress.total ? (
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((extractionProgress.current || 0) / extractionProgress.total) * 100}%` }}
                />
              </div>
            ) : (
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div className="h-full w-1/3 bg-gradient-to-r from-purple-500/60 to-pink-500/60 rounded-full animate-pulse" />
              </div>
            )}

            {/* Live frame previews */}
            {previewFrames.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {previewFrames.map((frame, idx) => (
                  <div
                    key={idx}
                    className="aspect-video rounded-lg overflow-hidden border border-gray-600/50 animate-in fade-in zoom-in-95 duration-300"
                  >
                    <img
                      src={frame.url}
                      alt={frame.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {/* Placeholder slots for remaining frames */}
                {extractionProgress?.total && Array.from(
                  { length: Math.max(0, extractionProgress.total - previewFrames.length) },
                  (_, i) => (
                    <div
                      key={`placeholder-${i}`}
                      className="aspect-video rounded-lg border border-gray-700/50 bg-gray-700/30 animate-pulse"
                    />
                  )
                )}
              </div>
            )}

            {!extractionProgress?.total && (
              <p className="text-gray-500 text-xs text-center">
                Analyzing video and preparing extraction...
              </p>
            )}
          </div>
        </div>
      )}

      {view === 'start' && renderStartScreen()}
      {view === 'url-input' && renderUrlInput()}
      {view === 'frame-picker' && renderFramePicker()}
      {view === 'ai-generate' && renderAiGenerate()}
      {view === 'upload' && renderUpload()}
      {view === 'result' && renderResult()}

      {/* AI Command Bar Modal */}
      {view === 'result' && (
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
      )}
    </div>
  );
};

export default QuickEditView;
