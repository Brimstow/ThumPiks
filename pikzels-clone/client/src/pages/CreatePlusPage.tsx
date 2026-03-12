import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Layers, Wand2, FileText, Link2, UploadCloud, MonitorPlay, Smartphone, Instagram, Maximize2, Plus, Trash2, Save } from 'lucide-react';
import CreateThumbnail from '../components/CreateThumbnail';
import { authPost } from '../utils/api';

interface AspectRatioPreset {
  id: string;
  name: string;
  platform: string;
  ratio: string;
  width: number;
  height: number;
  icon?: React.ElementType;
  color?: string;
}

interface CustomPreset {
  id: string;
  name: string;
  width: number;
  height: number;
}

const CreatePlusPage: React.FC = () => {
  const navigate = useNavigate();
  const [showAiPromptModal, setShowAiPromptModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('youtube-16-9');
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [customPresetName, setCustomPresetName] = useState<string>('');
  const [savedPresets, setSavedPresets] = useState<CustomPreset[]>([]);
  const [showCustomPresetInput, setShowCustomPresetInput] = useState(false);
  const [showInstagramOptions, setShowInstagramOptions] = useState(false);
  const [selectedInstagramRatio, setSelectedInstagramRatio] = useState<'1:1' | '4:5' | '16:9'>('1:1');

  // Instagram sub-options
  const instagramRatios = [
    { id: '1:1', name: 'Square', ratio: '1:1', width: 1080, height: 1080 },
    { id: '4:5', name: 'Portrait', ratio: '4:5', width: 1080, height: 1350 },
    { id: '16:9', name: 'Landscape', ratio: '16:9', width: 1080, height: 607 },
  ];

  // Platform presets
  const platformPresets: AspectRatioPreset[] = [
    { id: 'youtube-16-9', name: 'YouTube', platform: 'YouTube', ratio: '16:9', width: 1280, height: 720, icon: MonitorPlay, color: 'from-red-500/20 to-red-600/20' },
    { id: 'tiktok-9-16', name: 'TikTok', platform: 'TikTok', ratio: '9:16', width: 1080, height: 1920, icon: Smartphone, color: 'from-pink-500/20 to-pink-600/20' },
    { id: 'upscrolled-9-16', name: 'UpScrolled', platform: 'UpScrolled', ratio: '9:16', width: 1080, height: 1920, icon: Smartphone, color: 'from-cyan-500/20 to-cyan-600/20' },
    { id: 'instagram', name: 'Instagram', platform: 'Instagram', ratio: 'Multiple', width: 1080, height: 1080, icon: Instagram, color: 'from-purple-500/20 to-purple-600/20' },
  ];

  // Load saved presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('thumbnail-custom-presets');
    if (saved) {
      setSavedPresets(JSON.parse(saved));
    }
  }, []);

  // Save custom preset
  const handleSaveCustomPreset = useCallback(() => {
    if (!customPresetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      name: customPresetName,
      width: customWidth,
      height: customHeight,
    };

    const updated = [...savedPresets, newPreset];
    setSavedPresets(updated);
    localStorage.setItem('thumbnail-custom-presets', JSON.stringify(updated));
    setCustomPresetName('');
    setShowCustomPresetInput(false);
  }, [customPresetName, customWidth, customHeight, savedPresets]);

  // Delete custom preset
  const handleDeleteCustomPreset = useCallback((id: string) => {
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated);
    localStorage.setItem('thumbnail-custom-presets', JSON.stringify(updated));
  }, [savedPresets]);

  // Select preset
  const handleSelectPreset = useCallback((presetId: string) => {
    if (presetId === 'instagram') {
      // Instagram has sub-options — show them, don't navigate yet
      setSelectedPreset(presetId);
      setShowInstagramOptions(true);
      const igRatio = instagramRatios.find(r => r.id === selectedInstagramRatio);
      if (igRatio) {
        setCustomWidth(igRatio.width);
        setCustomHeight(igRatio.height);
      }
      return;
    }

    // Non-instagram presets: navigate directly to preset editor
    setShowInstagramOptions(false);
    navigate(`/dashboard/create-plus/${presetId}`);
  }, [navigate, selectedInstagramRatio, instagramRatios]);

  // Select Instagram ratio
  const handleSelectInstagramRatio = useCallback((ratioId: '1:1' | '4:5' | '16:9') => {
    setSelectedInstagramRatio(ratioId);
    const ratio = instagramRatios.find(r => r.id === ratioId);
    if (ratio) {
      setCustomWidth(ratio.width);
      setCustomHeight(ratio.height);
      // Navigate to preset editor with the selected Instagram ratio
      navigate(`/dashboard/create-plus/instagram-${ratioId.replace(':', '-')}`, {
        state: {
          platform: 'Instagram',
          width: ratio.width,
          height: ratio.height,
          name: `Instagram ${ratio.name}`,
        },
      });
    }
  }, [instagramRatios, navigate]);

  // File upload handler
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name);
    navigate('/dashboard/video-editor', { state: { uploadedFile: file } });
  }, [navigate]);

  /** Resolve the currently selected platform preset for passing to the editor */
  const getSelectedPlatformPreset = useCallback(() => {
    const preset = platformPresets.find(p => p.id === selectedPreset);
    if (preset) {
      return { platform: preset.platform, width: customWidth, height: customHeight, name: preset.name };
    }
    const custom = savedPresets.find(p => p.id === selectedPreset);
    if (custom) {
      return { platform: 'Custom', width: custom.width, height: custom.height, name: custom.name };
    }
    return { platform: 'Custom', width: customWidth, height: customHeight, name: 'Custom' };
  }, [selectedPreset, customWidth, customHeight, platformPresets, savedPresets]);

  // AI prompt thumbnail creation handler
  const handleAiPromptCreate = useCallback(async (prompt: string, style: string, projectId: string) => {
    setShowAiPromptModal(false);
    setIsGenerating(true);
    try {
      const response = await authPost('/api/thumbnails/ai/generate', { prompt, style, tier: 'standard' });

      if (response.status === 402) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Insufficient credits. Please purchase more credits.');
        navigate('/dashboard/credits');
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Generation failed');
      }

      const data = await response.json();

      if (!data.success || !data.images || data.images.length === 0) {
        throw new Error('No images generated');
      }

      // Navigate to editor with the generated image
      navigate('/dashboard/editor', {
        state: {
          initialImage: data.images[0],
          projectId,
          prompt,
          style,
          platformPreset: getSelectedPlatformPreset(),
        },
      });
    } catch (error) {
      console.error('AI generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate thumbnail');
    } finally {
      setIsGenerating(false);
    }
  }, [navigate]);

  // Creation methods configuration
  const creationMethods = [
    {
      id: 'youtube',
      title: 'From YouTube',
      description: 'Generate thumbnail from YouTube video link',
      icon: Link2,
      color: 'from-red-500/20 to-red-600/20',
      borderColor: 'border-red-500/30',
      hoverColor: 'hover:border-red-500/60',
      action: () => navigate('/dashboard/quick-edit', { state: { initialView: 'url-input' } }),
    },
    {
      id: 'upload',
      title: 'Upload Video',
      description: 'Extract frames from your video file',
      icon: UploadCloud,
      color: 'from-blue-500/20 to-blue-600/20',
      borderColor: 'border-blue-500/30',
      hoverColor: 'hover:border-blue-500/60',
      action: () => fileInputRef.current?.click(),
    },
    {
      id: 'ai-prompt',
      title: 'AI Text Prompt',
      description: 'Generate thumbnail with AI from description',
      icon: Wand2,
      color: 'from-purple-500/20 to-purple-600/20',
      borderColor: 'border-purple-500/30',
      hoverColor: 'hover:border-purple-500/60',
      action: () => setShowAiPromptModal(true),
    },
    {
      id: 'video-editor',
      title: 'Video Editor',
      description: 'Extract and analyze frames with AI',
      icon: Video,
      color: 'from-emerald-500/20 to-emerald-600/20',
      borderColor: 'border-emerald-500/30',
      hoverColor: 'hover:border-emerald-500/60',
      action: () => navigate('/dashboard/video-editor'),
    },
    {
      id: 'templates',
      title: 'From Template',
      description: 'Start with professional templates',
      icon: Layers,
      color: 'from-amber-500/20 to-amber-600/20',
      borderColor: 'border-amber-500/30',
      hoverColor: 'hover:border-amber-500/60',
      action: () => navigate('/dashboard/templates'),
    },
    {
      id: 'blank',
      title: 'Blank Canvas',
      description: 'Design from scratch in editor',
      icon: FileText,
      color: 'from-slate-500/20 to-slate-600/20',
      borderColor: 'border-slate-500/30',
      hoverColor: 'hover:border-slate-500/60',
      action: () => navigate('/dashboard/editor', {
        state: { platformPreset: getSelectedPlatformPreset() },
      }),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] p-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Creation Methods Hub */}
      <div className="max-w-7xl mx-auto">
        <div className="relative">
          <div className="absolute inset-0 -top-8 mx-auto h-72 max-w-7xl rounded-[32px] bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 blur-3xl"></div>

          <div className="relative">
            <div className="text-center mb-12">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-4 bg-gradient-to-r from-slate-50 via-blue-100 to-purple-200 bg-clip-text text-transparent leading-tight">
                Create Your Thumbnail
              </h1>
              <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto">Choose your canvas size and creation method to get started</p>
            </div>

            {/* Aspect Ratio Preset Selector */}
            <div className="mb-12 bg-slate-900/60 border border-slate-800/50 rounded-3xl p-8 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-50 mb-1">Choose Your Canvas</h2>
                  <p className="text-sm text-slate-400">Select a platform preset or create custom dimensions</p>
                </div>
                <button
                  onClick={() => setShowCustomPresetInput(!showCustomPresetInput)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 text-blue-300 hover:from-blue-500/20 hover:to-blue-600/20 hover:border-blue-400/40 transition-all duration-300 font-medium text-sm shadow-lg shadow-blue-500/5"
                >
                  <Plus className="w-4 h-4" />
                  Custom Size
                </button>
              </div>

              {/* Platform Presets */}
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {platformPresets.map((preset) => {
                  const Icon = preset.icon || Maximize2;
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`group relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-br ' + preset.color + ' border-blue-400/60 shadow-xl shadow-blue-500/20 scale-[1.02]'
                          : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-blue-500/20 border-2 border-blue-400/40' 
                            : 'bg-slate-700/30 border border-slate-600/30'
                        }`}>
                          <Icon className={`w-7 h-7 transition-colors ${isSelected ? 'text-blue-300' : 'text-slate-400 group-hover:text-slate-300'}`} />
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-semibold mb-0.5 transition-colors ${isSelected ? 'text-slate-50' : 'text-slate-300 group-hover:text-slate-200'}`}>
                            {preset.name}
                          </div>
                          <div className="text-xs font-medium text-slate-500 mb-1">{preset.ratio}</div>
                          {preset.id !== 'instagram' && (
                            <div className="text-xs text-slate-600 font-mono">{preset.width}×{preset.height}</div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 border-2 border-slate-900 shadow-lg shadow-blue-500/50"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instagram Sub-Options */}
              {showInstagramOptions && (
                <div className="mb-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur">
                  <h3 className="text-base font-semibold text-slate-200 mb-4">Choose Instagram Format</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {instagramRatios.map((ratio) => {
                      const isSelected = selectedInstagramRatio === ratio.id;
                      return (
                        <button
                          key={ratio.id}
                          onClick={() => handleSelectInstagramRatio(ratio.id as '1:1' | '4:5' | '16:9')}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            isSelected
                              ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-400/60 shadow-lg shadow-purple-500/20'
                              : 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`text-sm font-semibold mb-1 ${isSelected ? 'text-slate-50' : 'text-slate-300'}`}>
                              {ratio.name}
                            </div>
                            <div className="text-xs text-slate-500 mb-1">{ratio.ratio}</div>
                            <div className="text-xs text-slate-600 font-mono">{ratio.width}×{ratio.height}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Preset Input */}
              {showCustomPresetInput && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 mb-6 backdrop-blur">
                  <h3 className="text-base font-semibold text-slate-200 mb-4">Create Custom Preset</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Width (px)</label>
                      <input
                        type="number"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Height (px)</label>
                      <input
                        type="number"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Preset Name</label>
                      <input
                        type="text"
                        value={customPresetName}
                        onChange={(e) => setCustomPresetName(e.target.value)}
                        placeholder="My Custom Size"
                        className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleSaveCustomPreset}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:from-emerald-500/30 hover:to-emerald-600/30 hover:border-emerald-400/50 transition-all duration-300 font-semibold shadow-lg shadow-emerald-500/10"
                      >
                        <Save className="w-4 h-4" />
                        Save Preset
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 px-4 py-3 bg-slate-900/60 border border-slate-700/40 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Aspect Ratio:</span>
                      <span className="text-sm font-bold text-slate-200 font-mono">
                        {customWidth && customHeight ? (customWidth / customHeight).toFixed(3) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Saved Custom Presets */}
              {savedPresets.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">Your Custom Presets</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {savedPresets.map((preset) => {
                      const isSelected = selectedPreset === preset.id;
                      return (
                        <div
                          key={preset.id}
                          className={`group relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                            isSelected
                              ? 'bg-gradient-to-br from-slate-500/20 to-slate-600/20 border-blue-400/60 shadow-xl shadow-blue-500/20 scale-[1.02]'
                              : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/60'
                          }`}
                        >
                          <button
                            onClick={() => {
                              navigate(`/dashboard/create-plus/${preset.id}`, {
                                state: {
                                  platform: 'Custom',
                                  width: preset.width,
                                  height: preset.height,
                                  name: preset.name,
                                },
                              });
                            }}
                            className="w-full"
                          >
                            <div className="flex flex-col items-center gap-3">
                              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-blue-500/20 border-2 border-blue-400/40' 
                                  : 'bg-slate-700/30 border border-slate-600/30'
                              }`}>
                                <Maximize2 className={`w-7 h-7 transition-colors ${isSelected ? 'text-blue-300' : 'text-slate-400 group-hover:text-slate-300'}`} />
                              </div>
                              <div className="text-center">
                                <div className={`text-sm font-semibold mb-1 transition-colors ${isSelected ? 'text-slate-50' : 'text-slate-300 group-hover:text-slate-200'}`}>
                                  {preset.name}
                                </div>
                                <div className="text-xs text-slate-600 font-mono">{preset.width}×{preset.height}</div>
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => handleDeleteCustomPreset(preset.id)}
                            className="absolute -top-1 -right-1 p-1.5 rounded-lg bg-red-500/90 border border-red-400/50 text-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:scale-110 shadow-lg shadow-red-500/30"
                            title="Delete preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isSelected && (
                            <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-blue-400 border-2 border-slate-900 shadow-lg shadow-blue-500/50"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Current Selection Summary */}
              <div className="pt-6 border-t border-slate-800/60">
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/10 rounded-xl">
                  <span className="text-sm font-medium text-slate-400">Selected Canvas:</span>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-slate-50 font-mono">{customWidth} × {customHeight} px</span>
                    <div className="px-3 py-1 bg-slate-800/60 border border-slate-700 rounded-lg">
                      <span className="text-xs font-semibold text-slate-400">
                        {customWidth && customHeight ? (customWidth / customHeight).toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Creation Methods Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {creationMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={method.action}
                    className={`group relative p-6 rounded-2xl bg-slate-900/80 border ${method.borderColor} ${method.hoverColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40 text-left`}
                  >
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${method.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    
                    <div className="relative">
                      <div className="flex items-start gap-4 mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} border ${method.borderColor} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="w-6 h-6 text-slate-100" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-100 mb-1">{method.title}</h3>
                          <p className="text-sm text-slate-400">{method.description}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur">
                <div className="text-3xl font-bold text-slate-50 mb-1">6</div>
                <div className="text-sm text-slate-400">Creation Methods</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur">
                <div className="text-3xl font-bold text-slate-50 mb-1">∞</div>
                <div className="text-sm text-slate-400">Possibilities</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur">
                <div className="text-3xl font-bold text-slate-50 mb-1">AI</div>
                <div className="text-sm text-slate-400">Powered</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur">
                <div className="text-3xl font-bold text-slate-50 mb-1">Fast</div>
                <div className="text-sm text-slate-400">Generation</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Prompt Modal */}
      {showAiPromptModal && (
        <CreateThumbnail
          onClose={() => setShowAiPromptModal(false)}
          onCreate={handleAiPromptCreate}
          projects={[
            { id: '1', name: 'Default Project' },
            { id: '2', name: 'Marketing Campaign' },
            { id: '3', name: 'Personal Channel' },
          ]}
        />
      )}
    </div>
  );
};

export default CreatePlusPage;
