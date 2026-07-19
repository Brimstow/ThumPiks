import React, { useState, useRef, useCallback, useEffect } from 'react';
import { copyToClipboard } from '@/utils/browserCompat';
import {
  Eye,
  Upload,
  Link,
  Search,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Clock,
  Palette,
  Type,
  Users,
  Layers,
  X,
  ExternalLink,
  Sparkles,
  Wand2,
  Lightbulb,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authGet, authPost, createAIToolAbortController } from '../../utils/api';
import type { VisionAnalysisResult, BingImageResult, CTRFactors } from '../../types/vision.types';
import ThumbnailActionBar from '../ui/ThumbnailActionBar';
import RecreateBetterModal from '../ui/RecreateBetterModal';
import type { ImageActionContext } from '../../types/image-actions.types';
import { CircularProgress } from '../ui/AnimatedCharts';

// ============================================
// TYPES
// ============================================

type TabId = 'upload' | 'url' | 'search';

// ============================================
// HELPERS
// ============================================

const getScoreColor = (score: number) => {
  if (score >= 70) return { color: '#22c55e', textClass: 'text-green-400', bgClass: 'bg-green-500', label: 'Great' };
  if (score >= 40) return { color: '#f59e0b', textClass: 'text-yellow-400', bgClass: 'bg-yellow-500', label: 'Fair' };
  return { color: '#ef4444', textClass: 'text-red-400', bgClass: 'bg-red-500', label: 'Needs Work' };
};

const CTR_SUB_SCORES: { key: keyof CTRFactors; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'faceScore',        label: 'Faces',   icon: Users },
  { key: 'textScore',        label: 'Text',    icon: Type },
  { key: 'colorScore',       label: 'Colors',  icon: Palette },
  { key: 'compositionScore', label: 'Layout',  icon: BarChart3 },
  { key: 'emotionScore',     label: 'Emotion', icon: Sparkles },
];

// ============================================
// COMPONENT
// ============================================

const VisionToolPage: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [searchResults, setSearchResults] = useState<BingImageResult[]>([]);
  const [history, setHistory] = useState<VisionAnalysisResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // State for generating from prompt
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // State for ThumPiks Score bar animation
  const [barsAnimated, setBarsAnimated] = useState(false);

  // Reset bar animation when analysis result changes
  useEffect(() => {
    if (analysisResult?.elements?.ctrFactors) {
      setBarsAnimated(false);
      const t = setTimeout(() => setBarsAnimated(true), 300);
      return () => clearTimeout(t);
    }
  }, [analysisResult]);

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await authGet('/api/vision/history?limit=20');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.analyses || []);
      }
    } catch {
      // History fetch is non-critical
    }
  };

  // Image upload handler
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setAnalysisResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Please drop a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setAnalysisResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // Analyze image
  const handleAnalyze = useCallback(async (imageInput: string) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const body = imageInput.startsWith('data:')
        ? { imageBase64: imageInput }
        : { imageUrl: imageInput };

      const response = await authPost('/api/vision/describe', body);

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 402) {
          throw new Error('Insufficient credits. Please purchase more credits to use vision analysis.');
        }
        throw new Error(data.error || 'Analysis failed');
      }

      const result = await response.json();
      setAnalysisResult(result);
      // Refresh history after new analysis
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Search web images
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      const response = await authGet(
        `/api/vision/search?q=${encodeURIComponent(searchQuery.trim())}&count=20`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Search failed');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Copy to clipboard
  const handleCopy = useCallback(async (text: string, field: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, []);

  // Analyze a search result
  const handleAnalyzeSearchResult = useCallback((url: string) => {
    setActiveTab('url');
    setImageUrl(url);
    handleAnalyze(url);
  }, [handleAnalyze]);

  // Load a history item
  const handleLoadHistory = useCallback((item: VisionAnalysisResult) => {
    setAnalysisResult(item);
    setShowHistory(false);
    setActiveTab('url');
    setImageUrl(item.imageUrl);
  }, []);

  // Generate from suggested prompt
  const handleGenerateFromPrompt = useCallback(async () => {
    if (!analysisResult?.suggestedPrompt) return;

    setIsGenerating(true);
    setError(null);

    try {
      // JJ: Per-tool AbortController with timeout (55s for generate)
      const { controller, timeoutId } = createAIToolAbortController('generate');
      const response = await authPost('/api/thumbnails/ai/generate', {
        prompt: analysisResult.suggestedPrompt,
        aspectRatio: '16:9',
        style: analysisResult.elements.style || 'photorealistic',
      }, { signal: controller.signal });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 402) {
          throw new Error('Insufficient credits. Please purchase more credits.');
        }
        throw new Error(data.error || 'Generation failed');
      }

      const result = await response.json();
      setGeneratedImage(result.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [analysisResult]);

  // Get current image URL for action bar
  const getCurrentImageUrl = useCallback(() => {
    if (generatedImage) return generatedImage;
    if (analysisResult?.imageUrl) return analysisResult.imageUrl;
    if (uploadedImage) return uploadedImage;
    if (imageUrl) return imageUrl;
    return null;
  }, [generatedImage, analysisResult, uploadedImage, imageUrl]);

  // Build action context for ThumbnailActionBar
  const getActionContext = useCallback((): ImageActionContext | null => {
    const currentImage = getCurrentImageUrl();
    if (!currentImage) return null;

    return {
      imageUrl: currentImage,
      sourceSettings: {
        prompt: analysisResult?.suggestedPrompt,
        style: analysisResult?.elements.style,
        aspectRatio: '16:9',
      },
      // Pass existing analysis to skip re-analysis in Recreate Better
      analysisResult: analysisResult || undefined,
    };
  }, [getCurrentImageUrl, analysisResult]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'upload', label: 'Upload', icon: <Upload className="w-4 h-4" /> },
    { id: 'url', label: 'URL', icon: <Link className="w-4 h-4" /> },
    { id: 'search', label: 'Web Search', icon: <Search className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Vision Analysis
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg">
              Analyze any thumbnail to extract design elements and generate AI prompts
            </p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <Clock className="w-4 h-4" />
            History
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="mb-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Analyses</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => handleLoadHistory(item)}
                className="group relative aspect-video bg-slate-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-cyan-500 transition-all"
              >
                <img
                  src={item.imageUrl}
                  alt={item.description}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Input */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <>
                {uploadedImage ? (
                  <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setAnalysisResult(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full aspect-video bg-slate-800/50 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                      isDragging
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/70'
                    }`}
                  >
                    <Upload
                      className={`w-10 h-10 pointer-events-none ${
                        isDragging ? 'text-cyan-400' : 'text-slate-500'
                      }`}
                    />
                    <span
                      className={`text-sm pointer-events-none ${
                        isDragging ? 'text-cyan-300' : 'text-slate-400'
                      }`}
                    >
                      {isDragging ? 'Drop your image here' : 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-slate-500 pointer-events-none">
                      PNG, JPG up to 10MB
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  onClick={() => uploadedImage && handleAnalyze(uploadedImage)}
                  disabled={!uploadedImage || isAnalyzing}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-lg hover:shadow-cyan-500/25"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      Analyze Image
                    </>
                  )}
                </button>
              </>
            )}

            {/* URL Tab */}
            {activeTab === 'url' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/thumbnail.jpg"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && imageUrl.trim()) {
                        handleAnalyze(imageUrl.trim());
                      }
                    }}
                  />
                </div>
                {imageUrl && imageUrl.startsWith('http') && (
                  <div className="aspect-video bg-slate-800 rounded-xl overflow-hidden">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <button
                  onClick={() => imageUrl.trim() && handleAnalyze(imageUrl.trim())}
                  disabled={!imageUrl.trim() || isAnalyzing}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-lg hover:shadow-cyan-500/25"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      Analyze URL
                    </>
                  )}
                </button>
              </>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Search for Thumbnails
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g., gaming YouTube thumbnail, cooking channel..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                    />
                    <button
                      onClick={handleSearch}
                      disabled={!searchQuery.trim() || isSearching}
                      className="px-4 rounded-xl font-semibold text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-lg hover:shadow-cyan-500/25"
                    >
                      {isSearching ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Search Results Grid */}
                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400">
                      {searchResults.length} results found. Click an image to analyze it.
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                      {searchResults.map((result, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAnalyzeSearchResult(result.url)}
                          className="group relative aspect-video bg-slate-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-cyan-500 transition-all text-left"
                        >
                          <img
                            src={result.thumbnailUrl}
                            alt={result.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = result.url;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-xs text-white line-clamp-2">{result.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {result.width}x{result.height}
                              </p>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-1 bg-cyan-500 rounded-md">
                              <Eye className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isSearching && (
                  <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <span className="text-sm">Searching the web...</span>
                  </div>
                )}
              </>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Analysis Results */}
        <div className="space-y-6">
          {analysisResult ? (
            <>
              {/* ThumPiks Score */}
              {analysisResult.elements.ctrFactors && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">ThumPiks Score</h3>

                  {/* Hero Gauge */}
                  {(() => {
                    const overallCTR = analysisResult.elements.ctrFactors.overallCTR;
                    const scoreStyle = getScoreColor(overallCTR);
                    return (
                      <div className="flex flex-col items-center mb-6">
                        <CircularProgress
                          percentage={overallCTR}
                          size={140}
                          strokeWidth={10}
                          color={scoreStyle.color}
                        >
                          <div className="text-center">
                            <div className={`text-3xl font-bold ${scoreStyle.textClass}`}>
                              {overallCTR}
                            </div>
                            <div className="text-sm text-slate-500">/ 100</div>
                          </div>
                        </CircularProgress>
                        <span className={`text-sm font-medium mt-2 ${scoreStyle.textClass}`}>
                          {scoreStyle.label}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Sub-Score Breakdown */}
                  <div className="space-y-3">
                    {CTR_SUB_SCORES.map(({ key, label, icon: Icon }) => {
                      const score = analysisResult.elements.ctrFactors[key] || 0;
                      const { textClass, bgClass } = getScoreColor(score);
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className={`flex items-center gap-2 w-24 flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${textClass}`} />
                            <span className="text-sm text-slate-400">{label}</span>
                          </div>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${bgClass}`}
                              style={{ width: barsAnimated ? `${score}%` : '0%' }}
                            />
                          </div>
                          <span className={`text-sm font-semibold w-8 text-right ${textClass}`}>
                            {score}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Improvement Suggestions */}
                  {analysisResult.elements.suggestions?.length > 0 && (
                    <div className="border-t border-slate-800 pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-400" />
                        How to Improve
                      </h4>
                      <div className="space-y-2">
                        {analysisResult.elements.suggestions.slice(0, 3).map((suggestion, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0 text-cyan-400" />
                            <span className="text-slate-400 leading-relaxed">{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Analysis</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {analysisResult.description}
                </p>
              </div>

              {/* Suggested Prompt */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Suggested Prompt</h3>
                  <button
                    onClick={() => handleCopy(analysisResult.suggestedPrompt, 'prompt')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs transition-colors"
                  >
                    {copiedField === 'prompt' ? (
                      <>
                        <Check className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-cyan-300 text-sm bg-slate-800/50 rounded-lg p-3 font-mono">
                  {analysisResult.suggestedPrompt}
                </p>
              </div>

              {/* Design Elements */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Design Elements</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Main Subject */}
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Layers className="w-3 h-3" />
                      Subject
                    </div>
                    <p className="text-sm text-white">{analysisResult.elements.mainSubject}</p>
                  </div>

                  {/* Faces */}
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Users className="w-3 h-3" />
                      Faces
                    </div>
                    <p className="text-sm text-white">{analysisResult.elements.faces}</p>
                  </div>

                  {/* Mood */}
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Eye className="w-3 h-3" />
                      Mood
                    </div>
                    <p className="text-sm text-white capitalize">{analysisResult.elements.mood}</p>
                  </div>

                  {/* Style */}
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Palette className="w-3 h-3" />
                      Style
                    </div>
                    <p className="text-sm text-white capitalize">{analysisResult.elements.style}</p>
                  </div>

                  {/* Composition */}
                  <div className="bg-slate-800/50 rounded-xl p-3 col-span-2">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Layers className="w-3 h-3" />
                      Composition
                    </div>
                    <p className="text-sm text-white capitalize">
                      {analysisResult.elements.composition}
                    </p>
                  </div>
                </div>
              </div>

              {/* Color Palette */}
              {analysisResult.elements.colorPalette.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Color Palette</h3>
                  <div className="flex gap-2">
                    {analysisResult.elements.colorPalette.map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCopy(color, `color-${idx}`)}
                        className="group flex flex-col items-center gap-1.5"
                        title={`Copy ${color}`}
                      >
                        <div
                          className="w-12 h-12 rounded-lg ring-2 ring-slate-700 group-hover:ring-slate-500 transition-all"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors font-mono">
                          {copiedField === `color-${idx}` ? (
                            <Check className="w-3 h-3 text-green-400 inline" />
                          ) : (
                            color
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Overlay */}
              {analysisResult.elements.textOverlay.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Type className="w-4 h-4 text-slate-400" />
                    <h3 className="text-lg font-semibold text-white">Text Found</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.elements.textOverlay.map((text, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCopy(text, `text-${idx}`)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
                      >
                        {copiedField === `text-${idx}` ? (
                          <span className="text-green-400">Copied!</span>
                        ) : (
                          `"${text}"`
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate from Prompt Button */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Create Similar Thumbnail</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Generate a new thumbnail using the suggested prompt above
                </p>
                <button
                  onClick={handleGenerateFromPrompt}
                  disabled={isGenerating}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate from Prompt
                    </>
                  )}
                </button>
              </div>

              {/* Generated Image Preview */}
              {generatedImage && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Generated Result</h3>
                  <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden mb-4">
                    <img
                      src={generatedImage}
                      alt="Generated thumbnail"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {/* Action Bar for generated image */}
                  <ThumbnailActionBar
                    context={{
                      imageUrl: generatedImage,
                      sourceSettings: {
                        prompt: analysisResult.suggestedPrompt,
                        style: analysisResult.elements.style,
                        aspectRatio: '16:9',
                      },
                    }}
                    visibleActions={['save', 'edit', 'download', 'regenerate', 'recreateBetter']}
                    variant="horizontal"
                  />
                </div>
              )}

              {/* Action Bar for analyzed image (if no generated image yet) */}
              {!generatedImage && getActionContext() && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
                  <ThumbnailActionBar
                    context={getActionContext()!}
                    visibleActions={['save', 'edit', 'download', 'recreateBetter']}
                    variant="horizontal"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 p-4 mb-4 shadow-lg shadow-cyan-500/20">
                <Eye className="w-full h-full text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No Analysis Yet
              </h3>
              <p className="text-slate-400 text-sm max-w-sm">
                Upload an image, paste a URL, or search the web to analyze a thumbnail's design
                elements and generate AI prompts.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-cyan-400">1</div>
                  <div className="text-xs text-slate-500 mt-1">Credit per analysis</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-cyan-400">AI</div>
                  <div className="text-xs text-slate-500 mt-1">Gemini Vision</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-cyan-400">7</div>
                  <div className="text-xs text-slate-500 mt-1">Design elements</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recreate Better Modal */}
      <RecreateBetterModal />
    </div>
  );
};

export default VisionToolPage;
