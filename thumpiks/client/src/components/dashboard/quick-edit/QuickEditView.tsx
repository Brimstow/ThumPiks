import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import {
  detectPlatform,
  isValidUrl,
  saveUrlHistory,
  fetchVideoFramesStreaming,
  uploadAsset,
  VideoFrame,
  FrameExtractionProgress,
  FrameRateLimitInfo,
} from '../../../services/quickEditService';
import { authPost, createAIToolAbortController } from '../../../utils/api';
import RecreateBetterModal from '../../ui/RecreateBetterModal';
import { useSaveThumbnail } from '../../../hooks/useSaveThumbnail';
import { useAITextGenerator } from '../../../hooks/useAITextGenerator';
import { loadPersistedState, savePersistedState } from './persistence';
import { STYLE_PRESETS } from './constants';
import QuickEditStartScreen from './QuickEditStartScreen';
import QuickEditUrlInput from './QuickEditUrlInput';
import QuickEditFramePicker from './QuickEditFramePicker';
import QuickEditAiGenerate from './QuickEditAiGenerate';
import QuickEditUpload from './QuickEditUpload';
import QuickEditResult from './QuickEditResult';
import type { ViewState, QuickEditViewProps } from './types';

const QuickEditView: React.FC<QuickEditViewProps> = ({
  onClose: _onClose,
  onOpenEditor,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { initialView?: ViewState } | null;

  // Load persisted state once on mount
  const [persisted] = useState(() => loadPersistedState());

  // Navigation state
  const [view, setView] = useState<ViewState>(() => {
    if (routeState?.initialView) return routeState.initialView;
    if (persisted.view === 'result' && persisted.resultImageUrl) return 'result';
    if (persisted.view === 'frame-picker' && persisted.videoFrames?.length) return 'frame-picker';
    return 'start';
  });

  const [enteredFromExternal] = useState(() => !!routeState?.initialView);

  useEffect(() => {
    if (routeState?.initialView) {
      window.history.replaceState({}, '');
    }
  }, []);

  // Shared state
  const [urlInput, setUrlInput] = useState(persisted.urlInput || '');
  const [aiPrompt, setAiPrompt] = useState(persisted.aiPrompt || '');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(persisted.selectedStyle ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result state
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(persisted.resultImageUrl ?? null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(persisted.originalImageUrl ?? null);

  // Frame picker state
  const [videoFrames, setVideoFrames] = useState<VideoFrame[]>(persisted.videoFrames || []);
  const [videoTitle, setVideoTitle] = useState(persisted.videoTitle || '');
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number | null>(persisted.selectedFrameIdx ?? null);
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [totalCycles, setTotalCycles] = useState(1);
  const [rateLimitInfo, setRateLimitInfo] = useState<FrameRateLimitInfo | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const cycleCache = useRef<Map<number, VideoFrame[]>>(new Map());

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<FrameExtractionProgress | null>(null);
  const [previewFrames, setPreviewFrames] = useState<VideoFrame[]>([]);

  // AI text generator (shared for result view)
  const aiText = useAITextGenerator();

  // Save thumbnail
  const { triggerSave, SaveModal, isSaving: _isSaving } = useSaveThumbnail();

  // Frame state cleanup
  const clearFrameState = useCallback(() => {
    setVideoFrames([]);
    setVideoTitle('');
    setSelectedFrameIdx(null);
    setCurrentCycleIndex(0);
    setTotalCycles(1);
    cycleCache.current.clear();
  }, []);

  // Persist state on changes
  useEffect(() => {
    savePersistedState({
      view, urlInput, videoTitle, selectedFrameIdx,
      resultImageUrl, originalImageUrl, videoFrames, aiPrompt, selectedStyle,
    });
  }, [view, urlInput, videoTitle, selectedFrameIdx, resultImageUrl, originalImageUrl, videoFrames, aiPrompt, selectedStyle]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    if (!isValidUrl(urlInput)) { setError('Please enter a valid URL'); return; }
    setError(null);
    setLoading(true);
    setLoadingMessage('Connecting to video...');
    setExtractionProgress(null);
    setPreviewFrames([]);

    try {
      const platform = detectPlatform(urlInput);
      saveUrlHistory({ url: urlInput, platform: platform || undefined }).catch(() => {});
      const result = await fetchVideoFramesStreaming(urlInput, progress => {
        setExtractionProgress(progress);
        setLoadingMessage(progress.message);
        if (progress.rateLimit) setRateLimitInfo(progress.rateLimit);
        if (progress.frame) setPreviewFrames(prev => [...prev, progress.frame!]);
      });
      if (result.frames.length > 0) {
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
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
      setExtractionProgress(null);
      setPreviewFrames([]);
    }
  };

  const handleRegenerateFrames = async () => {
    if (!urlInput.trim() || isRegenerating) return;
    setIsRegenerating(true);
    setError(null);
    setPreviewFrames([]);
    try {
      const result = await fetchVideoFramesStreaming(urlInput, progress => {
        if (progress.rateLimit) setRateLimitInfo(progress.rateLimit);
        if (progress.frame) setPreviewFrames(prev => [...prev, progress.frame!]);
      }, 'new');
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
    const targetCycle = direction === 'prev' ? currentCycleIndex - 1 : currentCycleIndex + 1;
    if (targetCycle < 0 || targetCycle >= totalCycles) return;
    const cached = cycleCache.current.get(targetCycle);
    if (cached) {
      setVideoFrames(cached);
      setSelectedFrameIdx(null);
      setCurrentCycleIndex(targetCycle);
      return;
    }
    setError(null);
    try {
      const result = await fetchVideoFramesStreaming(urlInput, progress => {
        if (progress.rateLimit) setRateLimitInfo(progress.rateLimit);
      }, targetCycle);
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

    const { controller, timeoutId } = createAIToolAbortController('generate');
    try {
      const stylePreset = STYLE_PRESETS.find(s => s.id === selectedStyle);
      const fullPrompt = stylePreset ? `${aiPrompt}, ${stylePreset.prompt}` : aiPrompt;
      const res = await authPost('/api/thumbnails/ai/generate', {
        prompt: fullPrompt, count: 1,
      }, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(err.error || 'AI generation failed');
      }
      const data = await res.json();
      if (data.images?.length > 0) {
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
      setError(err instanceof Error ? err.message : 'AI generation failed. Try again.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload an image file (JPG, PNG, WebP)'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File must be less than 10MB'); return; }
    setError(null);
    setLoading(true);
    setLoadingMessage('Uploading your image...');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const asset = await uploadAsset({ type: 'other', imageData: dataUrl, name: file.name });
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

  const handleBack = useCallback(() => {
    if (enteredFromExternal && view === routeState?.initialView) {
      navigate(-1);
    } else {
      setView('start');
      setError(null);
    }
  }, [enteredFromExternal, view, routeState, navigate]);

  // ============================================
  // RENDER
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
            {extractionProgress && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">{extractionProgress.phase}</span>
                  {extractionProgress.total && (
                    <span className="text-sm text-gray-500">
                      {extractionProgress.current}/{extractionProgress.total}
                    </span>
                  )}
                </div>
                {extractionProgress.total && (
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                      style={{ width: `${((extractionProgress.current || 0) / extractionProgress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            {/* Preview frames */}
            {previewFrames.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {previewFrames.slice(-4).map((frame, i) => (
                  <img key={i} src={frame.url} alt="" className="rounded-lg aspect-video object-cover border border-gray-700" />
                ))}
              </div>
            )}
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              <p className="text-gray-300 text-sm text-center">{loadingMessage || 'Processing...'}</p>
            </div>
            {!extractionProgress?.total && extractionProgress && (
              <p className="text-gray-500 text-xs text-center mt-3">
                {extractionProgress.phase === 'connecting' && 'Reaching the video server...'}
                {extractionProgress.phase === 'analyzing' && 'Reading video metadata and duration...'}
                {extractionProgress.phase === 'preparing' && 'Resolving best quality stream...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Views */}
      {view === 'start' && <QuickEditStartScreen onNavigate={setView} />}
      {view === 'url-input' && (
        <QuickEditUrlInput
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          loading={loading}
          onSubmit={handleUrlSubmit}
          onBack={handleBack}
        />
      )}
      {view === 'frame-picker' && (
        <QuickEditFramePicker
          videoFrames={videoFrames}
          videoTitle={videoTitle}
          selectedFrameIdx={selectedFrameIdx}
          currentCycleIndex={currentCycleIndex}
          totalCycles={totalCycles}
          rateLimitInfo={rateLimitInfo}
          isRegenerating={isRegenerating}
          onFrameSelect={setSelectedFrameIdx}
          onConfirm={handleFrameConfirm}
          onRegenerate={handleRegenerateFrames}
          onCycleNavigation={handleCycleNavigation}
          onBack={() => { setView('url-input'); setError(null); }}
        />
      )}
      {view === 'ai-generate' && (
        <QuickEditAiGenerate
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          selectedStyle={selectedStyle}
          setSelectedStyle={setSelectedStyle}
          loading={loading}
          onGenerate={handleAiGenerate}
          onBack={() => { setView('start'); setError(null); }}
        />
      )}
      {view === 'upload' && (
        <QuickEditUpload
          fileInputRef={fileInputRef}
          onFileUpload={handleFileUpload}
          onFileDrop={handleFileDrop}
          onBack={() => { setView('start'); setError(null); }}
        />
      )}
      {view === 'result' && (
        <QuickEditResult
          resultImageUrl={resultImageUrl}
          setResultImageUrl={setResultImageUrl}
          originalImageUrl={originalImageUrl}
          videoTitle={videoTitle}
          videoFrames={videoFrames}
          aiPrompt={aiPrompt}
          loading={loading}
          setLoading={setLoading}
          loadingMessage={loadingMessage}
          setLoadingMessage={setLoadingMessage}
          setError={setError}
          aiText={aiText}
          triggerSave={triggerSave}
          onOpenEditor={onOpenEditor}
          onStartOver={() => {
            clearFrameState();
            setView('start');
            setResultImageUrl(null);
            setOriginalImageUrl(null);
            setError(null);
          }}
          onPickDifferentFrame={videoFrames.length > 0 ? () => {
            setResultImageUrl(null);
            setOriginalImageUrl(null);
            setError(null);
            setView('frame-picker');
          } : undefined}
          clearVisionAnalysis={() => { aiText.clearVisionAnalysis(); aiText.clearSuggestions(); }}
        />
      )}

      {/* AICommandBar is rendered inside QuickEditResult */}

      {/* Save Modal */}
      {SaveModal}

      {/* Recreate Better Modal */}
      <RecreateBetterModal />
    </div>
  );
};

export default QuickEditView;
