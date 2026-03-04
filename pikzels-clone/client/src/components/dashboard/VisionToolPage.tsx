import React, { useState, useRef, useCallback, useEffect } from 'react';
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
} from 'lucide-react';
import { authGet, authPost } from '../../utils/api';
import type { VisionAnalysisResult, BingImageResult } from '../../types/vision.types';

// ============================================
// TYPES
// ============================================

type TabId = 'upload' | 'url' | 'search';

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
  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'upload', label: 'Upload', icon: <Upload className="w-4 h-4" /> },
    { id: 'url', label: 'URL', icon: <Link className="w-4 h-4" /> },
    { id: 'search', label: 'Web Search', icon: <Search className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Vision Analysis
            </h1>
            <p className="text-slate-400 text-lg">
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

          <div className="p-6 space-y-4">
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
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
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
    </div>
  );
};

export default VisionToolPage;
