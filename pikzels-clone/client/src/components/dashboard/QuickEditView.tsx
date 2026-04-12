import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Link2,
  Sparkles,
  UploadCloud,
  ArrowLeft,
  Download,
  RotateCcw,
  Wand2,
  Loader2,
  X,
  Check,
  Pencil,
  Eraser,
  Clipboard,
  Clock,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Grid,
  Camera,
  Trash2,
  Save,
  Eye,
  Command,
  Star,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Type,
  Plus,
} from 'lucide-react';
import type { VisionAnalysisResult } from '../../types/vision.types';
import {
  detectPlatform,
  isValidUrl,
  getUrlHistory,
  saveUrlHistory,
  deleteUrlHistoryEntry,
  clearAllUrlHistory,
  togglePinUrl,
  bulkDeleteUrls,
  uploadAsset,
  fetchVideoFramesStreaming,
  UrlHistoryEntry,
  VideoFrame,
  FrameExtractionProgress,
  FrameRateLimitInfo,
} from '../../services/quickEditService';
import { authPost } from '../../utils/api';
import AICommandBar from '../editor/components/AICommandBar';
import { useQuickEditCommandExecutor } from './hooks/useQuickEditCommandExecutor';
import { useAITextGenerator } from '../../hooks/useAITextGenerator';
// Layouts available via Canvas Editor — removed from Quick Edit sidebar
import RecreateBetterModal from '../ui/RecreateBetterModal';
import { useSaveThumbnail } from '../../hooks/useSaveThumbnail';
import {
  THUMBNAIL_FONTS,
  TEXT_COLOR_PRESETS,
  MOOD_FONTS,
  DEFAULT_TEXT_STYLE,
  isColorDark,
} from '../../constants/text-styles';
import { useInlineTextEdit, INLINE_EDIT_STYLES } from '../../hooks/useInlineTextEdit';
import Tooltip from '../ui/Tooltip';
import { safeCanvasToDataURL } from '../../utils/browserCompat';

// ============================================
// TYPES
// ============================================

type ViewState =
  | 'start'
  | 'url-input'
  | 'frame-picker'
  | 'ai-generate'
  | 'upload'
  | 'result';

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
  {
    id: 'bold',
    label: 'Bold',
    emoji: '🎨',
    prompt: 'vibrant colors, eye-catching, high contrast, bold',
    samplePrompt:
      'Person pointing at camera with shocked expression, massive bold text, red-yellow background bursting with energy',
  },
  {
    id: 'minimalist',
    label: 'Minimal',
    emoji: '✨',
    prompt: 'clean, minimalist, modern design',
    samplePrompt:
      'Single bold subject on a pure white background, minimal text, lots of breathing room, modern flat design',
  },
  {
    id: 'dramatic',
    label: 'Dramatic',
    emoji: '🎭',
    prompt: 'dramatic lighting, intense',
    samplePrompt:
      'Intense close-up face with deep shadows, stormy sky backdrop, dramatic moody lighting and high contrast',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    emoji: '🎬',
    prompt: 'cinematic, movie poster style, epic',
    samplePrompt:
      'Epic wide-angle shot with lens flare and film grain, movie poster composition, dark dramatic color grading',
  },
  {
    id: 'professional',
    label: 'Pro',
    emoji: '💼',
    prompt: 'professional, clean, corporate',
    samplePrompt:
      'Confident presenter against a clean studio backdrop, sharp professional attire, bold clear title text',
  },
  {
    id: 'creative',
    label: 'Creative',
    emoji: '💜',
    prompt: 'creative, artistic, unique style',
    samplePrompt:
      'Surreal collage with floating elements, unexpected visual twist, bold mixed colors and artistic typography',
  },
  {
    id: 'gaming',
    label: 'Gaming',
    emoji: '🎮',
    prompt: 'gaming style, neon glow, futuristic',
    samplePrompt:
      'Epic gamer mid-action with neon HUD overlay, explosion in the background, futuristic glow effects',
  },
  {
    id: 'vibrant',
    label: 'Vibrant',
    emoji: '🌈',
    prompt: 'vibrant, saturated, colorful, energetic',
    samplePrompt:
      'Colorful energetic scene with saturated rainbow tones, dynamic movement, high-contrast pop art feel',
  },
  {
    id: 'retro',
    label: 'Retro',
    emoji: '📼',
    prompt: 'retro style, vintage aesthetic, nostalgic',
    samplePrompt:
      '80s VHS aesthetic with film grain, retro pastel palette, vintage typography and warm nostalgic feel',
  },
  {
    id: 'neon',
    label: 'Neon',
    emoji: '💡',
    prompt: 'neon glow, cyberpunk, futuristic lights',
    samplePrompt:
      'Cyberpunk street at night with glowing neon signs, dark rain-soaked atmosphere, futuristic moody vibes',
  },
  {
    id: 'natural',
    label: 'Natural',
    emoji: '🌿',
    prompt: 'natural, organic, warm tones',
    samplePrompt:
      'Sun-drenched outdoor scene with earthy greens and warm golden light, authentic real-world feel',
  },
];

// Demo video for "Try an Example" — stable, well-known public video
const EXAMPLE_VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const EXAMPLE_VIDEO_LABEL = 'Rick Astley – Never Gonna Give You Up';

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
    const toSave: PersistedState =
      framesSize > 2_000_000 ? { ...state, videoFrames: [] } : state;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
  } catch {
    // sessionStorage full — silently fail
  }
}

// ============================================
// CONSTANTS FOR SMART TEXT STYLING
// ============================================

// ============================================
// SMART TEXT ITEM — plain row, no popover
// ============================================

interface SmartTextItemProps {
  overlay: TextOverlay;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

const SmartTextItem: React.FC<SmartTextItemProps> = ({
  overlay,
  isActive,
  onSelect,
  onRemove,
}) => (
  <div
    onClick={onSelect}
    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all group
      ${
        isActive
          ? 'bg-purple-600/15 border-l-2 border-l-purple-500'
          : 'hover:bg-gray-700/30 border-l-2 border-l-transparent'
      }`}
  >
    <span
      className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-600"
      style={{ backgroundColor: overlay.color }}
    />
    <span
      className="text-sm text-gray-300 truncate flex-1"
      style={{ fontFamily: overlay.fontFamily }}
    >
      {overlay.text}
    </span>
    <Tooltip content="Remove text">
    <button
      onClick={e => {
        e.stopPropagation();
        onRemove();
      }}
      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-0.5"
      aria-label={`Remove text: ${overlay.text}`}
    >
      <X className="w-3 h-3" />
    </button>
    </Tooltip>
  </div>
);

// ============================================
// FLOATING EDIT PANEL — draggable, spawns at Smart Text button
// ============================================

interface FloatingEditPanelProps {
  overlay: TextOverlay;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onUpdate: (updates: Partial<TextOverlay>) => void;
  savedPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
}

const FloatingEditPanel: React.FC<FloatingEditPanelProps> = ({
  overlay,
  anchorRef,
  onClose,
  onUpdate,
  savedPosRef,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDocked, setIsDocked] = useState(!savedPosRef.current);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(savedPosRef.current);
  const draggingPanel = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // Sync docked state when overlay changes
  useEffect(() => {
    if (savedPosRef.current) {
      setPos(savedPosRef.current);
      setIsDocked(false);
    } else {
      setIsDocked(true);
    }
  }, [overlay.id, savedPosRef]);

  const onMouseDownHeader = (e: React.MouseEvent) => {
    // When docked, compute initial fixed position from the panel element
    if (isDocked && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      const startPos = { x: rect.left, y: rect.top };
      setPos(startPos);
      setIsDocked(false);
      draggingPanel.current = true;
      dragStart.current = { mx: e.clientX, my: e.clientY, px: startPos.x, py: startPos.y };
      e.preventDefault();
      return;
    }
    if (!pos) return;
    draggingPanel.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingPanel.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const newPos = { x: dragStart.current.px + dx, y: dragStart.current.py + dy };
      setPos(newPos);
    };
    const onUp = () => {
      if (draggingPanel.current && pos) {
        savedPosRef.current = pos;
      }
      draggingPanel.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [pos, savedPosRef]);

  const handleDock = () => {
    savedPosRef.current = null;
    setIsDocked(true);
    setPos(null);
  };

  return (
    <div
      ref={panelRef}
      style={isDocked ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 20,
      } : {
        position: 'fixed',
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        zIndex: 9999,
        width: 284,
      }}
      className="smart-text-edit-popover bg-gray-800 rounded-xl border border-purple-500/30 shadow-2xl"
    >
      {/* Drag handle header */}
      <div
        onMouseDown={onMouseDownHeader}
        className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700/60
                   cursor-grab active:cursor-grabbing select-none rounded-t-xl
                   bg-gray-750 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">⠿</span>
          <span className="text-xs font-medium text-purple-300 uppercase tracking-wider">
            Edit Text
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isDocked && (
            <Tooltip content="Dock to sidebar">
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={handleDock}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-700"
              aria-label="Dock panel to sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            </Tooltip>
          )}
          <Tooltip content="Close panel">
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-700"
            aria-label="Close edit panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          </Tooltip>
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Text input */}
        <input
          type="text"
          value={overlay.text}
          onChange={e => onUpdate({ text: e.target.value })}
          className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700
                     text-white text-sm focus:outline-none focus:border-purple-500"
        />

        {/* Font picker */}
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
            Font
          </span>
          <div className="grid grid-cols-2 gap-1">
            {THUMBNAIL_FONTS.map(f => (
              <button
                key={f.label}
                onClick={() => onUpdate({ fontFamily: f.value })}
                className={`px-2 py-1.5 rounded text-xs text-left truncate transition-all
                  ${
                    overlay.fontFamily === f.value
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
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
            Color
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {TEXT_COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => onUpdate({ color: c })}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  overlay.color === c
                    ? 'border-purple-400 scale-110'
                    : 'border-gray-600 hover:border-gray-400'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Set text color to ${c}`}
                title={c}
              />
            ))}
            <label
              className="relative w-6 h-6 rounded-full border-2 border-dashed border-gray-500 hover:border-gray-300 cursor-pointer flex items-center justify-center transition-colors"
              title="Custom color"
            >
              <span className="text-gray-400 text-[10px] leading-none">+</span>
              <input
                type="color"
                value={overlay.color}
                onChange={e => onUpdate({ color: e.target.value })}
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
            value={overlay.fontSize}
            onChange={e => onUpdate({ fontSize: Number(e.target.value) })}
            className="flex-1 accent-purple-500"
            aria-label="Text size"
            title="Text size"
          />
          <span className="text-gray-400 text-[10px] w-6">
            {overlay.fontSize}
          </span>
        </div>

        {/* Banner toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 uppercase">
            Background banner
          </span>
          <button
            onClick={() =>
              onUpdate({
                backgroundColor: overlay.backgroundColor
                  ? ''
                  : 'rgba(0,0,0,0.6)',
              })
            }
            aria-label="Toggle background banner"
            title="Toggle background banner"
            className={`w-9 h-5 rounded-full transition-colors relative
              ${overlay.backgroundColor ? 'bg-purple-600' : 'bg-gray-700'}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform
                ${overlay.backgroundColor ? 'left-[18px]' : 'left-0.5'}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

const QuickEditView: React.FC<QuickEditViewProps> = ({
  onClose: _onClose,
  onOpenEditor,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Route state: if navigated here with initialView, skip the start screen
  const routeState = location.state as { initialView?: ViewState } | null;

  // Load persisted state once on mount
  const [persisted] = useState(() => loadPersistedState());

  // Navigation state — route state > persisted deep state > start
  const [view, setView] = useState<ViewState>(() => {
    // Route state takes priority (e.g. "From YouTube" navigates with initialView)
    if (routeState?.initialView) return routeState.initialView;
    // Only restore persisted view when it has meaningful context to resume
    if (persisted.view === 'result' && persisted.resultImageUrl)
      return 'result';
    if (persisted.view === 'frame-picker' && persisted.videoFrames?.length)
      return 'frame-picker';
    // All other cases (sidebar click, shallow views) start fresh
    return 'start';
  });

  // Track whether we entered via external navigation (e.g. CreatePlusPage)
  const [enteredFromExternal] = useState(() => !!routeState?.initialView);

  // Clear route state after consuming it so browser back/forward doesn't replay it
  useEffect(() => {
    if (routeState?.initialView) {
      window.history.replaceState({}, '');
    }
  }, []);  

  // URL path state
  const [urlInput, setUrlInput] = useState(persisted.urlInput || '');
  const [urlHistory, setUrlHistory] = useState<UrlHistoryEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  // Clipboard paste status for URL panel
  const [clipboardStatus, setClipboardStatus] = useState<
    'idle' | 'pasting' | 'pasted' | 'error'
  >('idle');

  // AI generate state
  const [aiPrompt, setAiPrompt] = useState(persisted.aiPrompt || '');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(
    persisted.selectedStyle ?? null
  );

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result state
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(
    persisted.resultImageUrl ?? null
  );
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(
    persisted.originalImageUrl ?? null
  );

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
  const [dragIntent, setDragIntent] = useState<{
    id: string; startX: number; startY: number; overlayX: number; overlayY: number;
  } | null>(null);

  // Inline editing — shared hook (DRY with full canvas editor)
  const inlineEdit = useInlineTextEdit({
    onUpdate: (id, text) => updateOverlayProp(id, { text }),
  });
  const inlineEditingId = inlineEdit.editingId;

  // Resize state
  type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
  const [resizing, setResizing] = useState<{
    id: string;
    handle: ResizeHandle;
  } | null>(null);
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    fontSize: number;
    maxWidth: number;
    x: number;
    y: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Canvas container size — used to scale text proportionally
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Ref for the Smart Text button — used to position the floating edit panel
  const smartTextBtnRef = useRef<HTMLButtonElement>(null);
  // Persists user-dragged position of the Edit Text panel across overlay switches
  const editPanelSavedPos = useRef<{ x: number; y: number } | null>(null);
  // Stores the measured width of an overlay div before entering inline edit mode
  // so the textarea can be locked to the exact same width as the display text.
  const overlayEditWidth = useRef<number | null>(null);
  // Refs for overlay divs — keyed by overlay.id
  const overlayDivRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // Frame picker state
  const [videoFrames, setVideoFrames] = useState<VideoFrame[]>(
    persisted.videoFrames || []
  );
  const [videoTitle, setVideoTitle] = useState(persisted.videoTitle || '');
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number | null>(
    persisted.selectedFrameIdx ?? null
  );

  // Frame cycle state (regeneration + cycle navigation)
  const [currentCycleIndex, setCurrentCycleIndex] = useState<number>(0);
  const [totalCycles, setTotalCycles] = useState<number>(1);
  const [rateLimitInfo, setRateLimitInfo] = useState<FrameRateLimitInfo | null>(
    null
  );
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Client-side cycle cache — prev/next reads from here, zero network calls
  const cycleCache = useRef<Map<number, VideoFrame[]>>(new Map());

  // Frame state cleanup — used when leaving frame-based flows (Paste Link)
  // to prevent stale frames from appearing in AI Generate / Upload Image paths
  const clearFrameState = useCallback(() => {
    setVideoFrames([]);
    setVideoTitle('');
    setSelectedFrameIdx(null);
    setCurrentCycleIndex(0);
    setTotalCycles(1);
    cycleCache.current.clear();
  }, []);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Frame extraction progress (SSE streaming)
  const [extractionProgress, setExtractionProgress] =
    useState<FrameExtractionProgress | null>(null);
  const [previewFrames, setPreviewFrames] = useState<VideoFrame[]>([]);

  // Save thumbnail modal (DRY — uses shared useSaveThumbnail hook)
  const { triggerSave, SaveModal, isSaving } = useSaveThumbnail();

  // "Add Your Face" state — persisted in localStorage so user only uploads once
  const FACE_STORAGE_KEY = 'quickedit_face_photo';
  const [facePhoto, setFacePhoto] = useState<string | null>(() => {
    try {
      return localStorage.getItem(FACE_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const faceInputRef = useRef<HTMLInputElement>(null);

  // AI Command Bar state
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isCommandBarLoading] = useState(false);
  const toggleCommandBar = useCallback(
    () => setIsCommandBarOpen(prev => !prev),
    []
  );

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
    addTextOverlay: overlay => {
      setTextOverlays(prev => [...prev, overlay]);
      setActiveOverlayId(overlay.id);
      setShowOverlayHint(overlay.id);
      setTimeout(() => setShowOverlayHint(null), 3000);
    },
    updateOverlayProp: (id, patch) => {
      setTextOverlays(prev =>
        prev.map(o => (o.id === id ? { ...o, ...patch } : o))
      );
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

  // Smart Text — consolidated hook for vision-aware AI text generation
  const aiText = useAITextGenerator();
  const [textTier] = useState<'flash' | 'standard' | 'pro'>('standard');

  const handleFacePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        setFacePhoto(dataUrl);
        try {
          localStorage.setItem(FACE_STORAGE_KEY, dataUrl);
        } catch {
          /* full */
        }
      };
      reader.readAsDataURL(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    []
  );

  const clearFacePhoto = useCallback(() => {
    setFacePhoto(null);
    try {
      localStorage.removeItem(FACE_STORAGE_KEY);
    } catch {
      /* */
    }
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
  }, [
    view,
    urlInput,
    videoTitle,
    selectedFrameIdx,
    resultImageUrl,
    originalImageUrl,
    videoFrames,
    aiPrompt,
    selectedStyle,
  ]);

  // ============================================
  // URL HISTORY
  // ============================================

  const loadUrlHistory = useCallback(async () => {
    try {
      const history = await getUrlHistory(50);
      setUrlHistory(history);
    } catch {
      // Silent fail — history is nice-to-have
    }
  }, []);

  useEffect(() => {
    if (view === 'url-input') {
      loadUrlHistory();
    }
  }, [view, loadUrlHistory]);

  const handleDeleteUrlEntry = useCallback(async (id: string) => {
    try {
      await deleteUrlHistoryEntry(id);
      setUrlHistory(prev => prev.filter(h => h.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      // Silent fail
    }
  }, []);

  const handleTogglePin = useCallback(async (id: string) => {
    try {
      const updated = await togglePinUrl(id);
      setUrlHistory(prev =>
        prev
          .map(h => (h.id === id ? { ...h, pinned: updated.pinned } : h))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          })
      );
    } catch {
      // Silent fail
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      await bulkDeleteUrls(Array.from(selectedIds));
      setUrlHistory(prev => prev.filter(h => !selectedIds.has(h.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch {
      // Silent fail
    }
  }, [selectedIds]);

  const handleClearAllHistory = useCallback(async () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 3000);
      return;
    }
    try {
      await clearAllUrlHistory(false); // keep pinned
      setUrlHistory(prev => prev.filter(h => h.pinned));
      setConfirmClearAll(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch {
      // Silent fail
    }
  }, [confirmClearAll]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Derived: split pinned/unpinned, apply search filter
  const pinnedEntries = urlHistory.filter(h => h.pinned);
  const recentEntries = urlHistory.filter(h => !h.pinned);

  const filteredPinned = searchFilter
    ? pinnedEntries.filter(
        h =>
          h.url.toLowerCase().includes(searchFilter.toLowerCase()) ||
          (h.title &&
            h.title.toLowerCase().includes(searchFilter.toLowerCase()))
      )
    : pinnedEntries;

  const filteredRecent = searchFilter
    ? recentEntries.filter(
        h =>
          h.url.toLowerCase().includes(searchFilter.toLowerCase()) ||
          (h.title &&
            h.title.toLowerCase().includes(searchFilter.toLowerCase()))
      )
    : recentEntries;

  const RECENT_COLLAPSED_COUNT = 5;
  const visibleRecent = showAllRecent
    ? filteredRecent
    : filteredRecent.slice(0, RECENT_COLLAPSED_COUNT);
  const hiddenRecentCount = filteredRecent.length - RECENT_COLLAPSED_COUNT;
  const allVisibleIds = [...filteredPinned, ...filteredRecent].map(h => h.id);
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  }, [allSelected, allVisibleIds]);

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
      const result = await fetchVideoFramesStreaming(urlInput, progress => {
        setExtractionProgress(progress);
        setLoadingMessage(progress.message);

        // Capture rate limit info from the SSE ratelimit event
        if (progress.rateLimit) {
          setRateLimitInfo(progress.rateLimit);
        }

        // Accumulate preview frames as they arrive
        if (progress.frame) {
          setPreviewFrames(prev => [...prev, progress.frame!]);
        }
      });

      if (result.frames.length > 0) {
        // Reset cycle cache for new URL and cache the first cycle
        cycleCache.current.clear();
        const idx = result.cycleIndex ?? 0;
        cycleCache.current.set(idx, result.frames);
        setVideoFrames(result.frames);
        setVideoTitle(result.videoInfo.title);
        setSelectedFrameIdx(null);
        setCurrentCycleIndex(idx);
        setTotalCycles(result.totalCycles ?? 1);
        setView('frame-picker');
      } else {
        throw new Error('No frames found for this video');
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Try again.'
      );
    } finally {
      setLoading(false);
      setLoadingMessage('');
      setExtractionProgress(null);
      setPreviewFrames([]);
    }
  };

  // ============================================
  // PASTE FROM CLIPBOARD — reads clipboard text and fills URL input
  // ============================================
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      setClipboardStatus('pasting');
      const text = await navigator.clipboard.readText();
      const trimmed = text?.trim() ?? '';
      if (
        trimmed &&
        (trimmed.startsWith('http') || trimmed.startsWith('www.'))
      ) {
        setUrlInput(trimmed);
        setClipboardStatus('pasted');
      } else {
        setClipboardStatus('error');
      }
      setTimeout(() => setClipboardStatus('idle'), 2000);
    } catch {
      // Clipboard API requires HTTPS or explicit user gesture; fail gracefully
      setClipboardStatus('error');
      setTimeout(() => setClipboardStatus('idle'), 2000);
    }
  }, []);

  // ============================================
  // TRY AN EXAMPLE — pre-loads a known demo video URL
  // ============================================
  const handleTryExample = useCallback(() => {
    setUrlInput(EXAMPLE_VIDEO_URL);
    setError(null);
  }, []);

  const handleFrameSelect = (idx: number) => {
    setSelectedFrameIdx(idx);
  };

  const handleRegenerateFrames = async () => {
    if (!urlInput.trim() || isRegenerating) return;
    setIsRegenerating(true);
    setError(null);
    setPreviewFrames([]);

    try {
      const result = await fetchVideoFramesStreaming(
        urlInput,
        progress => {
          if (progress.rateLimit) {
            setRateLimitInfo(progress.rateLimit);
          }
          if (progress.frame) {
            setPreviewFrames(prev => [...prev, progress.frame!]);
          }
        },
        'new'
      );

      if (result.frames.length > 0) {
        const idx = result.cycleIndex ?? 0;
        cycleCache.current.set(idx, result.frames);
        setVideoFrames(result.frames);
        setSelectedFrameIdx(null);
        setCurrentCycleIndex(idx);
        setTotalCycles(result.totalCycles ?? 1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setIsRegenerating(false);
      setPreviewFrames([]);
    }
  };

  const handleCycleNavigation = async (direction: 'prev' | 'next') => {
    const targetCycle =
      direction === 'prev' ? currentCycleIndex - 1 : currentCycleIndex + 1;
    if (targetCycle < 0 || targetCycle >= totalCycles) return;

    // Instant swap from client-side cache (no network call)
    const cached = cycleCache.current.get(targetCycle);
    if (cached) {
      setVideoFrames(cached);
      setSelectedFrameIdx(null);
      setCurrentCycleIndex(targetCycle);
      return;
    }

    // Cache miss — fetch from backend (rare: e.g. page refresh)
    setError(null);
    try {
      const result = await fetchVideoFramesStreaming(
        urlInput,
        progress => {
          if (progress.rateLimit) setRateLimitInfo(progress.rateLimit);
        },
        targetCycle
      );

      if (result.frames.length > 0) {
        cycleCache.current.set(result.cycleIndex ?? targetCycle, result.frames);
        setVideoFrames(result.frames);
        setSelectedFrameIdx(null);
        setCurrentCycleIndex(result.cycleIndex ?? targetCycle);
        setTotalCycles(result.totalCycles ?? totalCycles);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load cycle');
    }
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
      const stylePreset = STYLE_PRESETS.find(s => s.id === selectedStyle);
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
        const err = await res
          .json()
          .catch(() => ({ error: 'Generation failed' }));
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();

      // Same response format as AI Tools: { success, images: string[] }
      if (data.success && data.images && data.images.length > 0) {
        // Clear frame state when AI generates — AI images don't need frame picking
        clearFrameState();
        setResultImageUrl(data.images[0]);
        setOriginalImageUrl(data.images[0]);
        aiText.clearVisionAnalysis();
        aiText.clearSuggestions();
        setView('result');
      } else {
        throw new Error('No image returned from AI');
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'AI generation failed. Try again.'
      );
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

          // Clear frame state when uploading — uploaded images don't need frame picking
          clearFrameState();
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

    setTextOverlays(prev => [...prev, overlay]);
    setNewTextValue('');
    setShowTextInput(false);
    setActiveOverlayId(overlay.id);
    setShowOverlayHint(overlay.id);
    setTimeout(() => setShowOverlayHint(null), 3000);
  };

  const updateOverlayProp = (id: string, patch: Partial<TextOverlay>) => {
    setTextOverlays(prev =>
      prev.map(o => (o.id === id ? { ...o, ...patch } : o))
    );
  };

  const removeOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(o => o.id !== id));
    if (activeOverlayId === id) setActiveOverlayId(null);
  };

  const handleDragStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const overlay = textOverlays.find(o => o.id === id);
    if (!overlay || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const overlayX = (overlay.x / 100) * rect.width;
    const overlayY = (overlay.y / 100) * rect.height;

    // Track intent — don't start drag yet, wait for movement threshold
    setDragIntent({ id, startX: e.clientX, startY: e.clientY, overlayX, overlayY });
    setActiveOverlayId(id);
    setShowTextInput(false);
  };

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      // Promote dragIntent to actual drag after 3px movement threshold
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
        prev.map(o =>
          o.id === dragging
            ? {
                ...o,
                x: Math.max(0, Math.min(100, x)),
                y: Math.max(0, Math.min(100, y)),
              }
            : o
        )
      );
    },
    [dragging, dragOffset, dragIntent]
  );

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

  // ============================================
  // RESIZE HANDLERS
  // ============================================

  const handleResizeStart = (
    id: string,
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const overlay = textOverlays.find(o => o.id === id);
    if (!overlay) return;
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      fontSize: overlay.fontSize,
      maxWidth: overlay.maxWidth,
      x: overlay.x,
      y: overlay.y,
    };
    setResizing({ id, handle });
  };

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!resizing || !resizeStartRef.current || !canvasRef.current) return;
      const { id, handle } = resizing;
      const start = resizeStartRef.current;
      const rect = canvasRef.current.getBoundingClientRect();

      const dx = ((e.clientX - start.mouseX) / rect.width) * 100; // % of canvas width
      const dy = ((e.clientY - start.mouseY) / rect.height) * 100; // % of canvas height

      // Vertical handles affect fontSize (dy maps to font size change)
      // Horizontal handles affect maxWidth
      // Corner handles affect both
      const affectsH = handle === 'w' || handle === 'nw' || handle === 'sw';
      const affectsE = handle === 'e' || handle === 'ne' || handle === 'se';
      const affectsN = handle === 'n' || handle === 'nw' || handle === 'ne';
      const affectsS = handle === 's' || handle === 'sw' || handle === 'se';

      let newFontSize = start.fontSize;
      let newMaxWidth = start.maxWidth;
      let newX = start.x;
      let newY = start.y;

      // Width: east increases, west decreases (and shifts x)
      if (affectsE)
        newMaxWidth = Math.max(10, Math.min(100, start.maxWidth + dx));
      if (affectsH) {
        newMaxWidth = Math.max(10, Math.min(100, start.maxWidth - dx));
        newX = Math.max(0, Math.min(100, start.x + dx));
      }

      // Height (font size): south increases, north decreases (and shifts y)
      // dy is in % of canvas height; convert to fontSize units (same 720 reference)
      const dyFont = dy * (720 / 100);
      if (affectsS)
        newFontSize = Math.max(20, Math.min(200, start.fontSize + dyFont));
      if (affectsN) {
        newFontSize = Math.max(20, Math.min(200, start.fontSize - dyFont));
        newY = Math.max(0, Math.min(100, start.y + dy));
      }

      setTextOverlays(prev =>
        prev.map(o =>
          o.id === id
            ? {
                ...o,
                fontSize: newFontSize,
                maxWidth: newMaxWidth,
                x: newX,
                y: newY,
              }
            : o
        )
      );
    },
    [resizing]
  );

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
        const err = await res
          .json()
          .catch(() => ({ error: 'Face swap failed' }));
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
        image: resultImageUrl,
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: 'Enhancement failed' }));
        throw new Error(err.error || 'Enhancement failed');
      }

      const data = await res.json();
      if (data.images?.length > 0) {
        setResultImageUrl(data.images[0]);
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

  // ============================================
  // REMOVE BACKGROUND — one-click, FREE (local TensorFlow)
  // ============================================
  const handleRemoveBackground = async () => {
    if (!resultImageUrl) return;
    setLoading(true);
    setLoadingMessage('Removing background...');
    setError(null);
    try {
      const res = await authPost('/api/thumbnails/ai/remove-background', {
        image: resultImageUrl,
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: 'Background removal failed' }));
        throw new Error(err.error || 'Background removal failed');
      }
      const data = await res.json();
      if (data.images?.length > 0) {
        setResultImageUrl(data.images[0]);
        aiText.clearVisionAnalysis();
        aiText.clearSuggestions();
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Background removal failed'
      );
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

  const computeStyleFromAnalysis = useCallback(
    (analysis: VisionAnalysisResult): Partial<TextOverlay> => {
      const { dominantColor, mood, colorContrast, colorPalette } =
        analysis.elements;

      // Font from mood
      const moodLower = (mood || '').toLowerCase();
      const fontFamily =
        Object.entries(MOOD_FONTS).find(([key]) =>
          moodLower.includes(key)
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
      const textShadow =
        colorContrast === 'low'
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
    },
    []
  );

  /** Build overlay style from vision analysis (if cached) or defaults */
  const getSmartStyle = useCallback((): Partial<TextOverlay> => {
    const analysis = aiText.visionAnalysis;
    if (analysis) {
      return { ...DEFAULT_TEXT_STYLE, ...computeStyleFromAnalysis(analysis) };
    }
    return DEFAULT_TEXT_STYLE;
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
      setTextOverlays(prev => [...prev, overlay]);
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
          tier: textTier,
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
    setTextOverlays(prev => [...prev, overlay]);
    setActiveOverlayId(overlay.id);
    setShowTextInput(false);
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

    // Get display container size (kept for reference, not used in font scaling)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const overlay of textOverlays) {
      // Scale font proportionally: same formula as display (overlay.fontSize / 720 * canvasHeight)
      const scaledFontSize = (overlay.fontSize / 720) * canvas.height;
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

    return safeCanvasToDataURL(canvas, 'image/jpeg', 0.92);
  }, [resultImageUrl, textOverlays]);

  const handleSave = async () => {
    if (!resultImageUrl) return;

    // Flatten text overlays onto the image if any exist
    let imageToSave = resultImageUrl;
    if (textOverlays.length > 0) {
      setLoading(true);
      setLoadingMessage('Flattening overlays...');
      try {
        const composited = await compositeCanvas();
        if (composited) {
          imageToSave = composited;
          setResultImageUrl(composited);
          setOriginalImageUrl(prev => prev || resultImageUrl);
          setTextOverlays([]);
          setActiveOverlayId(null);
        }
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    }

    // Open save modal with pre-filled metadata
    triggerSave(imageToSave, {
      title: videoTitle || undefined,
      source: 'quick-edit',
      prompt: aiPrompt || undefined,
    });
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
          <div
            className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center
                          group-hover:bg-purple-500/20 transition-colors"
          >
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
          <div
            className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center
                          group-hover:bg-amber-500/20 transition-colors"
          >
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
          <div
            className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center
                          group-hover:bg-emerald-500/20 transition-colors"
          >
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
        onClick={() => {
          if (enteredFromExternal && view === routeState?.initialView) {
            // Go back to the page that navigated here (e.g. CreatePlusPage)
            navigate(-1);
          } else {
            setView('start');
            setError(null);
          }
        }}
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
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
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
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Go
        </button>
      </div>

      {/* Quick Actions — Paste from Clipboard + Try an Example */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handlePasteFromClipboard}
          disabled={clipboardStatus === 'pasting'}
          type="button"
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex-1
            ${
              clipboardStatus === 'pasted'
                ? 'bg-green-500/15 border-green-500/40 text-green-400'
                : clipboardStatus === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-gray-800/60 border-gray-700/50 text-gray-300 hover:border-purple-500/40 hover:text-white'
            }`}
        >
          <Clipboard className="w-4 h-4 flex-shrink-0" />
          {clipboardStatus === 'pasting'
            ? 'Reading...'
            : clipboardStatus === 'pasted'
              ? '✓ Link pasted!'
              : clipboardStatus === 'error'
                ? 'Nothing to paste'
                : 'Paste from Clipboard'}
        </button>
        <button
          onClick={handleTryExample}
          type="button"
          title={`Try with: ${EXAMPLE_VIDEO_LABEL}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700/50
                     bg-gray-800/60 text-gray-400 hover:text-white hover:border-amber-500/40
                     text-sm font-medium transition-all whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          Try an Example
        </button>
      </div>

      {/* URL History */}
      {urlHistory.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Toolbar: Search + Actions */}
          <div className="flex items-center gap-2">
            {urlHistory.length > 5 && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Search URLs..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/30
                             text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600
                             transition-colors"
                />
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <Tooltip content="Toggle select mode">
              <button
                onClick={() => {
                  setSelectMode(!selectMode);
                  setSelectedIds(new Set());
                }}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  selectMode
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
                }`}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
              </Tooltip>
              <Tooltip content={confirmClearAll ? 'Click again to confirm' : 'Clear recent URLs (keeps saved)'}>
              <button
                onClick={handleClearAllHistory}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  confirmClearAll
                    ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                    : 'text-gray-500 hover:text-red-400 hover:bg-gray-800/60'
                }`}
              >
                {confirmClearAll ? 'Confirm?' : 'Clear recent'}
              </button>
              </Tooltip>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectMode && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700/40">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                title={allSelected ? 'Deselect all' : 'Select all'}
              >
                {allSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              {selectedIds.size > 0 && (
                <Tooltip content={`Delete ${selectedIds.size} selected`}>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300
                             bg-red-500/10 px-2.5 py-1 rounded-md transition-colors ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete {selectedIds.size} selected
                </button>
                </Tooltip>
              )}
              {selectedIds.size === 0 && (
                <span className="text-xs text-gray-600 ml-auto">
                  Click items to select
                </span>
              )}
            </div>
          )}

          {/* Saved/Pinned Section */}
          {filteredPinned.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-amber-500/80 uppercase mb-2 flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-amber-500/80" />
                Saved ({filteredPinned.length})
              </h3>
              <div className="space-y-1.5">
                {filteredPinned.map(entry => (
                  <div
                    key={entry.id}
                    className={`w-full text-left px-3 py-2.5 rounded-xl bg-gray-800/50
                               border transition-colors group flex items-center gap-2 ${
                                 selectedIds.has(entry.id)
                                   ? 'border-purple-500/50 bg-purple-900/10'
                                   : 'border-amber-600/20 hover:border-amber-500/30'
                               }`}
                  >
                    {selectMode && (
                      <button
                        onClick={() => handleToggleSelect(entry.id)}
                        className="flex-shrink-0 text-gray-500 hover:text-purple-400 transition-colors"
                        title="Toggle selection"
                      >
                        {selectedIds.has(entry.id) ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setUrlInput(entry.url);
                      }}
                      className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                      title="Use this URL"
                    >
                      <Link2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 truncate text-sm">
                          {entry.url}
                        </p>
                        {entry.title && (
                          <p className="text-gray-500 text-xs truncate">
                            {entry.title}
                          </p>
                        )}
                      </div>
                      {entry.platform && (
                        <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded flex-shrink-0">
                          {entry.platform}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleTogglePin(entry.id)}
                      className="p-1 rounded-lg text-amber-500 hover:text-amber-400
                                 hover:bg-amber-500/10 transition-all flex-shrink-0"
                      title="Unpin URL"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => handleDeleteUrlEntry(entry.id)}
                      className="p-1 rounded-lg text-gray-600 hover:text-red-400
                                 hover:bg-red-500/10 opacity-0 group-hover:opacity-100
                                 transition-all flex-shrink-0"
                      title="Remove from history"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Section */}
          {filteredRecent.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Recent ({filteredRecent.length})
              </h3>
              <div className="space-y-1.5">
                {visibleRecent.map(entry => (
                  <div
                    key={entry.id}
                    className={`w-full text-left px-3 py-2.5 rounded-xl bg-gray-800/50
                               border transition-colors group flex items-center gap-2 ${
                                 selectedIds.has(entry.id)
                                   ? 'border-purple-500/50 bg-purple-900/10'
                                   : 'border-gray-700/30 hover:border-gray-600'
                               }`}
                  >
                    {selectMode && (
                      <button
                        onClick={() => handleToggleSelect(entry.id)}
                        className="flex-shrink-0 text-gray-500 hover:text-purple-400 transition-colors"
                        title="Toggle selection"
                      >
                        {selectedIds.has(entry.id) ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setUrlInput(entry.url);
                      }}
                      className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                      title="Use this URL"
                    >
                      <Link2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 truncate text-sm">
                          {entry.url}
                        </p>
                        {entry.title && (
                          <p className="text-gray-500 text-xs truncate">
                            {entry.title}
                          </p>
                        )}
                      </div>
                      {entry.platform && (
                        <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded flex-shrink-0">
                          {entry.platform}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleTogglePin(entry.id)}
                      className="p-1 rounded-lg text-gray-600 hover:text-amber-400
                                 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100
                                 transition-all flex-shrink-0"
                      title="Save this URL"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUrlEntry(entry.id)}
                      className="p-1 rounded-lg text-gray-600 hover:text-red-400
                                 hover:bg-red-500/10 opacity-0 group-hover:opacity-100
                                 transition-all flex-shrink-0"
                      title="Remove from history"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {/* Show More / Show Less */}
              {hiddenRecentCount > 0 && (
                <button
                  onClick={() => setShowAllRecent(!showAllRecent)}
                  className="mt-2 w-full text-center text-xs text-gray-500 hover:text-gray-300
                             py-1.5 rounded-lg hover:bg-gray-800/40 transition-colors
                             flex items-center justify-center gap-1"
                  title={
                    showAllRecent
                      ? 'Show less'
                      : `Show ${hiddenRecentCount} more`
                  }
                >
                  {showAllRecent ? (
                    <>
                      <ChevronUp className="w-3 h-3" /> Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" /> Show{' '}
                      {hiddenRecentCount} more
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Empty search state */}
          {searchFilter &&
            filteredPinned.length === 0 &&
            filteredRecent.length === 0 && (
              <p className="text-center text-sm text-gray-600 py-4">
                No URLs match &ldquo;{searchFilter}&rdquo;
              </p>
            )}
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
        onClick={() => {
          setView('start');
          setError(null);
        }}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h2 className="text-2xl font-bold text-white mb-2">Generate with AI</h2>
      <p className="text-gray-400 mb-6">
        Tap a style to load a sample prompt — or write your own below.
      </p>

      <div className="relative">
        <textarea
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
          placeholder="e.g. A person reacting with shock, neon background, bold text saying 'NO WAY'"
          rows={3}
          className="w-full px-4 py-3 pr-9 rounded-xl bg-gray-800 border border-gray-700
                     text-white placeholder-gray-500 focus:outline-none focus:border-amber-500
                     transition-colors resize-none"
          autoFocus
        />
        {aiPrompt && (
          <Tooltip content="Clear prompt">
          <button
            type="button"
            onClick={() => {
              setAiPrompt('');
              setSelectedStyle(null);
            }}
            className="absolute top-2.5 right-2.5 text-gray-500 hover:text-white transition-colors"
            aria-label="Clear prompt"
          >
            <X className="w-4 h-4" />
          </button>
          </Tooltip>
        )}
      </div>

      {/* Style Presets */}
      <div className="mt-4">
        <p className="text-sm text-gray-500 mb-3">Style (optional)</p>
        <div className="flex flex-wrap gap-2">
          {STYLE_PRESETS.map(style => (
            <button
              key={style.id}
              onClick={() => {
                if (selectedStyle === style.id) {
                  // Same chip tapped again — deselect and clear
                  setSelectedStyle(null);
                  setAiPrompt('');
                } else {
                  // New style — select it and fill the sample prompt
                  setSelectedStyle(style.id);
                  setAiPrompt(style.samplePrompt);
                }
              }}
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
        onClick={() => {
          setView('start');
          setError(null);
        }}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h2 className="text-2xl font-bold text-white mb-2">Upload an image</h2>
      <p className="text-gray-400 mb-6">
        Drop your image here or click to browse.
      </p>

      <div
        onDragOver={e => e.preventDefault()}
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
          <p className="text-gray-500 text-sm mt-1">
            JPG, PNG, WebP — up to 10MB
          </p>
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
            onClick={() => {
              setView('url-input');
              setError(null);
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-2xl font-bold text-white">Pick a frame</h2>
          {videoTitle && (
            <p className="text-gray-400 text-sm mt-1 truncate max-w-lg">
              {videoTitle}
            </p>
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

      {/* Regenerate + Cycle Navigation Bar */}
      <div className="flex items-center justify-between mb-4 bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Cycle navigation */}
          {totalCycles > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleCycleNavigation('prev')}
                disabled={currentCycleIndex <= 0}
                className="p-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-600 text-gray-300
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous cycle"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-gray-400 text-xs font-medium px-1 tabular-nums">
                {currentCycleIndex + 1} / {totalCycles}
              </span>
              <button
                onClick={() => handleCycleNavigation('next')}
                disabled={currentCycleIndex >= totalCycles - 1}
                className="p-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-600 text-gray-300
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next cycle"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Regenerate button */}
          <button
            onClick={handleRegenerateFrames}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30
                       text-amber-400 text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Extract new frames with different timestamps"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
            />
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>

        {/* Rate limit info */}
        {rateLimitInfo && rateLimitInfo.dailyLimit !== -1 && (
          <div className="text-gray-500 text-xs">
            {rateLimitInfo.dailyUsed}/{rateLimitInfo.dailyLimit} extractions
            today
          </div>
        )}
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
                ${
                  selectedFrameIdx === idx
                    ? 'border-purple-500 ring-2 ring-purple-500/30 scale-[1.02]'
                    : 'border-gray-700/50 hover:border-gray-500'
                }`}
            >
              <img
                src={frame.url}
                alt={frame.label}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />

              {/* Selection indicator */}
              {selectedFrameIdx === idx && (
                <div
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-purple-500
                                flex items-center justify-center shadow-lg"
                >
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Label badge */}
              <div
                className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent
                              px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <p className="text-white text-xs font-medium truncate">
                  {frame.label}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom confirm bar (mobile friendly) */}
      {selectedFrameIdx !== null && (
        <div
          className="mt-6 flex items-center justify-between bg-gray-800/60 border border-gray-700/50
                        rounded-xl px-5 py-4"
        >
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
                  {videoFrames[selectedFrameIdx].width} ×{' '}
                  {videoFrames[selectedFrameIdx].height}
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
                clearFrameState();
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
            // Scale fontSize proportionally to canvas container height
            // Reference height is 720px (the natural canvas height baseline)
            const scaledFontSize =
              canvasSize.height > 0
                ? (overlay.fontSize / 720) * canvasSize.height
                : overlay.fontSize * 0.5;

            // Resize handle positions: [handle-id, cursor, top%, left%, translateX, translateY]
            const handles: Array<
              [
                'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w',
                string,
                string,
                string,
                string,
                string,
              ]
            > = [
              ['nw', 'nw-resize', '0', '0', '-50%', '-50%'],
              ['n', 'n-resize', '0', '50%', '-50%', '-50%'],
              ['ne', 'ne-resize', '0', '100%', '-50%', '-50%'],
              ['e', 'e-resize', '50%', '100%', '-50%', '-50%'],
              ['se', 'se-resize', '100%', '100%', '-50%', '-50%'],
              ['s', 's-resize', '100%', '50%', '-50%', '-50%'],
              ['sw', 'sw-resize', '100%', '0', '-50%', '-50%'],
              ['w', 'w-resize', '50%', '0', '-50%', '-50%'],
            ];

            return (
              <div
                key={overlay.id}
                ref={el => { overlayDivRefs.current[overlay.id] = el; }}
                style={{
                  position: 'absolute',
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  maxWidth: `${overlay.maxWidth || 90}%`,
                  // Lock width to measured value during editing; otherwise shrink-wrap
                  width: (inlineEditingId === overlay.id && overlayEditWidth.current)
                    ? overlayEditWidth.current
                    : 'fit-content',
                  fontSize: `${scaledFontSize}px`,
                  color: overlay.color,
                  fontWeight: overlay.fontWeight,
                  fontFamily: overlay.fontFamily || 'Impact, sans-serif',
                  textShadow:
                    overlay.textShadow || '2px 2px 4px rgba(0,0,0,0.7)',
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
                  // Dashed selection border when active (suppress during inline edit to prevent box growth)
                  outline: (isActive && inlineEditingId !== overlay.id)
                    ? '1.5px dashed rgba(168,85,247,0.85)'
                    : undefined,
                  outlineOffset: (isActive && inlineEditingId !== overlay.id) ? '4px' : undefined,
                }}
                onMouseDown={e => {
                  if (inlineEditingId === overlay.id) return; // don't drag while editing
                  e.preventDefault();
                  handleDragStart(overlay.id, e);
                }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  // Capture the overlay div's current width before switching to textarea
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
                    style={{
                      ...INLINE_EDIT_STYLES,
                      height: 'auto',
                      caretColor: '#a855f7',
                    }}
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
                    {/* Delete button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeOverlay(overlay.id);
                      }}
                      aria-label="Remove text overlay"
                      className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 rounded-full
                                 flex items-center justify-center z-10"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    {/* 8 Resize handles */}
                    {handles.map(([h, cur, top, left, tx, ty]) => (
                      <div
                        key={h}
                        onMouseDown={e => handleResizeStart(overlay.id, h, e)}
                        style={{
                          position: 'absolute',
                          top,
                          left,
                          transform: `translate(${tx}, ${ty})`,
                          cursor: cur,
                          width: 10,
                          height: 10,
                          background: '#fff',
                          border: '1.5px solid #a855f7',
                          borderRadius: 2,
                          zIndex: 20,
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                        }}
                      />
                    ))}
                  </>
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

        {/* Action Buttons — 3 across, 2 rows */}
        {resultImageUrl && (
          <div className="space-y-2 mt-4">
            {/* Row 1: Recreate, Enhance, Edit */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sessionStorage.setItem(
                    'recreateBetterState',
                    JSON.stringify({
                      imageUrl: resultImageUrl,
                      existingAnalysis: null,
                    })
                  );
                  window.dispatchEvent(
                    new CustomEvent('openRecreateBetter', {
                      detail: { imageUrl: resultImageUrl },
                    })
                  );
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
                onClick={() =>
                  navigate('/dashboard/editor', {
                    state: {
                      initialImage: resultImageUrl,
                      source: 'quick-edit',
                    },
                  })
                }
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                           bg-slate-700 hover:bg-slate-600
                           text-white font-medium disabled:opacity-50 transition-colors text-sm"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            </div>
            {/* Row 2: Revert, Download, Save */}
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
                disabled={loading || isSaving}
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
        <h3 className="text-sm font-medium text-gray-400 uppercase mb-1">
          Quick Tools
        </h3>

        {/* Ask AI */}
        <Tooltip
          content="Quick one-shot AI commands — describe what you want and it executes immediately. No conversation history."
          side="right"
          sideOffset={8}
        >
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

        {/* Remove Background — free, runs locally */}
        <button
          onClick={handleRemoveBackground}
          disabled={loading || !resultImageUrl}
          type="button"
          title="Remove background — free, runs locally"
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

        {/* Edit Text Panel — overlays sidebar when docked, drag header to undock */}
        {activeOverlayId &&
          (() => {
            const activeOverlay = textOverlays.find(
              o => o.id === activeOverlayId
            );
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
              <span className="text-[10px] text-gray-600">
                Saved for next time
              </span>
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

            {/* Error message */}
            {aiText.error && !aiText.isGenerating && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {aiText.error}
              </div>
            )}

            {/* AI Suggestions */}
            {aiText.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Pick one:
                </span>
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

            {/* Divider */}
            <div className="flex items-center gap-2">
              <hr className="flex-1 border-gray-700" />
              <span className="text-[10px] text-gray-600 uppercase">
                or type your own
              </span>
              <hr className="flex-1 border-gray-700" />
            </div>

            {/* Manual text input */}
            <input
              type="text"
              value={newTextValue}
              onChange={e => setNewTextValue(e.target.value)}
              onKeyDown={e => {
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

        {/* Text layer list — click to select/edit, X to delete */}
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
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-[60vh]">
      {/* Error toast */}
      {error && (
        <div
          className="fixed top-4 right-4 z-50 max-w-sm bg-red-500/90 text-white
                        px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading overlay for non-result views */}
      {loading && view !== 'result' && view !== 'frame-picker' && (() => {
        // Color theme based on which mode triggered loading
        const loadingColors = view === 'ai-generate'
          ? { spinner: 'text-amber-400', dot: 'bg-amber-400', dotBg: 'bg-amber-500/20', dotText: 'text-amber-400', bar: 'from-amber-400 to-yellow-500', barPulse: 'from-amber-400/60 to-yellow-500/60' }
          : view === 'upload'
          ? { spinner: 'text-emerald-400', dot: 'bg-emerald-400', dotBg: 'bg-emerald-500/20', dotText: 'text-emerald-400', bar: 'from-emerald-500 to-green-400', barPulse: 'from-emerald-500/60 to-green-400/60' }
          : { spinner: 'text-purple-400', dot: 'bg-purple-400', dotBg: 'bg-purple-500/20', dotText: 'text-purple-400', bar: 'from-purple-500 to-pink-500', barPulse: 'from-purple-500/60 to-pink-500/60' };
        return (
        <div className="fixed inset-0 z-40 bg-gray-900/90 flex items-center justify-center">
          <div className="w-full max-w-lg mx-4 bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-2xl">
            {/* Phase step indicator */}
            {extractionProgress && (
              <div className="flex items-center gap-1 mb-5">
                {(
                  [
                    'connecting',
                    'analyzing',
                    'preparing',
                    'extracting',
                  ] as const
                ).map((phase, idx) => {
                  const phases = [
                    'connecting',
                    'analyzing',
                    'preparing',
                    'extracting',
                  ];
                  const currentIdx = phases.indexOf(extractionProgress.phase);
                  const isActive = extractionProgress.phase === phase;
                  const isDone = currentIdx > idx;
                  return (
                    <React.Fragment key={phase}>
                      <div
                        className={`flex items-center gap-1.5 ${isActive ? loadingColors.dotText : isDone ? 'text-green-400' : 'text-gray-600'}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                            isActive
                              ? `${loadingColors.dot} animate-pulse`
                              : isDone
                                ? 'bg-green-400'
                                : 'bg-gray-600'
                          }`}
                        />
                        <span className="text-[10px] font-medium uppercase tracking-wider">
                          {phase === 'connecting'
                            ? 'Connect'
                            : phase === 'analyzing'
                              ? 'Analyze'
                              : phase === 'preparing'
                                ? 'Prepare'
                                : 'Extract'}
                        </span>
                      </div>
                      {idx < 3 && (
                        <div
                          className={`flex-1 h-px ${isDone ? 'bg-green-400/40' : 'bg-gray-700'}`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Phase & message */}
            <div className="flex items-center gap-3 mb-4">
              {extractionProgress?.phase === 'extracting' ? (
                <div className={`w-8 h-8 rounded-full ${loadingColors.dotBg} flex items-center justify-center`}>
                  <span className={`${loadingColors.dotText} font-bold text-sm`}>
                    {extractionProgress.current || 0}
                  </span>
                </div>
              ) : (
                <Loader2 className={`w-6 h-6 ${loadingColors.spinner} animate-spin`} />
              )}
              <div>
                <p className="text-white font-medium">{loadingMessage}</p>
                {extractionProgress?.phase === 'extracting' &&
                  extractionProgress.total && (
                    <p className="text-gray-400 text-xs mt-0.5">
                      {extractionProgress.current} of {extractionProgress.total}{' '}
                      frames
                    </p>
                  )}
              </div>
            </div>

            {/* Progress bar */}
            {extractionProgress?.phase === 'extracting' &&
            extractionProgress.total ? (
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full bg-gradient-to-r ${loadingColors.bar} rounded-full transition-all duration-500 ease-out`}
                  style={{
                    width: `${((extractionProgress.current || 0) / extractionProgress.total) * 100}%`,
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div className={`h-full w-1/3 bg-gradient-to-r ${loadingColors.barPulse} rounded-full animate-pulse`} />
              </div>
            )}

            {/* Live frame previews (show only first 8 in the grid) */}
            {previewFrames.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {previewFrames.slice(0, 8).map((frame, idx) => (
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
                {/* Placeholder slots for remaining visible frames (up to 8) */}
                {extractionProgress?.total &&
                  previewFrames.length < 8 &&
                  Array.from(
                    { length: Math.max(0, 8 - previewFrames.length) },
                    (_, i) => (
                      <div
                        key={`placeholder-${i}`}
                        className="aspect-video rounded-lg border border-gray-700/50 bg-gray-700/30 animate-pulse"
                      />
                    )
                  )}
              </div>
            )}

            {/* Extraction count badge (when extracting more than 8) */}
            {previewFrames.length > 8 && extractionProgress?.total && (
              <p className="text-gray-500 text-xs text-center mt-2">
                Extracting {previewFrames.length} of {extractionProgress.total}{' '}
                frames for instant regeneration...
              </p>
            )}

            {!extractionProgress?.total && extractionProgress && (
              <p className="text-gray-500 text-xs text-center">
                {extractionProgress.phase === 'connecting' &&
                  'Reaching the video server...'}
                {extractionProgress.phase === 'analyzing' &&
                  'Reading video metadata and duration...'}
                {extractionProgress.phase === 'preparing' &&
                  'Resolving best quality stream...'}
              </p>
            )}
          </div>
        </div>
        );
      })()}

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

      {/* Save Thumbnail Modal */}
      {SaveModal}

      {/* Recreate Better Modal */}
      <RecreateBetterModal />
    </div>
  );
};

export default QuickEditView;
