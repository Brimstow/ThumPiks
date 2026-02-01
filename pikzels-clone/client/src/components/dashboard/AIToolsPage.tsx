/**
 * AI Tools Page
 * Standalone AI tools for image manipulation without the full editor
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Eraser, 
  Users, 
  Zap, 
  Image as ImageIcon,
  ArrowRight,
  Upload,
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  Maximize2,
  X
} from 'lucide-react';
import { useAIService } from '../../hooks/useAIService';
import { useAIWorker } from '../../hooks/useAIWorker';
import { config } from '../../config/environment';
import type { AIGenerateRequest } from '../../services/ai-providers';

// ============================================
// TYPES
// ============================================

type AIToolId = 'generate' | 'inpaint' | 'remove-bg' | 'face-swap' | 'enhance' | 'upscale';

interface AITool {
  id: AIToolId;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  requiresImage: boolean;
  apiCost: string;
}

// ============================================
// STYLE PRESETS
// ============================================

const stylePresets = [
  { id: 'cinematic', label: 'Cinematic', icon: '🎬' },
  { id: 'minimalist', label: 'Minimalist', icon: '⬜' },
  { id: 'bold', label: 'Bold & Vibrant', icon: '🔥' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
];

const aspectRatios: { value: AIGenerateRequest['aspectRatio']; label: string }[] = [
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '9:16', label: '9:16 (Shorts/Reels)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3 (Standard)' },
];

// ============================================
// COMPONENT
// ============================================

const AIToolsPage: React.FC = () => {
  // Use Web Worker if available, fallback to main thread
  const worker = useAIWorker();
  
  // Fallback AI Service (main thread) for browsers without worker support
  const aiService = useAIService({
    config: {
      providers: {
        tensorflow: {},
        replicate: {
          apiKey: config.ai.replicateApiKey || '', // Falls back to mock provider if empty
        },
      },
    },
    autoInitialize: !worker.isReady, // Only initialize if worker not available
  });
  
  // Use worker if available, otherwise fallback to aiService
  // useMemo to prevent infinite re-render loop when worker.isReady changes
  const ai = useMemo(() => {
    return worker.isReady ? {
      isLoading: worker.isProcessing,
      error: null,
      isInitializing: false,
      isReady: worker.isReady,
    } : aiService;
  }, [worker.isReady, worker.isProcessing, aiService]);
  
  // State
  const [selectedTool, setSelectedTool] = useState<AIToolId | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState<AIGenerateRequest['aspectRatio']>('16:9');
  const [enhanceType, setEnhanceType] = useState<'auto' | 'sharpen' | 'denoise' | 'color'>('auto');
  const [upscaleScale, setUpscaleScale] = useState<2 | 4>(2);
  const [faceSwapSource, setFaceSwapSource] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  // Tool definitions
  const aiTools: AITool[] = [
    {
      id: 'generate',
      name: 'AI Image Generation',
      description: 'Create stunning images from text descriptions using advanced AI models',
      icon: <Sparkles className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
      features: ['Text-to-image', 'Style presets', 'High resolution', 'Multiple variants'],
      requiresImage: false,
      apiCost: '~$0.003/image',
    },
    {
      id: 'inpaint',
      name: 'AI Inpainting',
      description: 'Intelligently edit parts of your images by describing what you want',
      icon: <Wand2 className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
      features: ['Smart editing', 'Context-aware', 'Natural blending', 'Precise control'],
      requiresImage: true,
      apiCost: '~$0.003/edit',
    },
    {
      id: 'remove-bg',
      name: 'Background Removal',
      description: 'Automatically remove backgrounds from images with AI precision',
      icon: <Eraser className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
      features: ['One-click removal', 'Edge detection', 'Transparent output', 'Batch processing'],
      requiresImage: true,
      apiCost: 'Free (local)',
    },
    {
      id: 'face-swap',
      name: 'Face Swap',
      description: 'Seamlessly swap faces in images using AI face detection',
      icon: <Users className="w-6 h-6" />,
      color: 'from-orange-500 to-red-500',
      features: ['Face detection', 'Natural blending', 'Multiple faces', 'Quick swap'],
      requiresImage: true,
      apiCost: '~$0.002/swap',
    },
    {
      id: 'enhance',
      name: 'Image Enhancement',
      description: 'Improve image quality with AI-powered enhancement tools',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-yellow-500 to-orange-500',
      features: ['Auto enhance', 'Sharpen', 'Denoise', 'Color correction'],
      requiresImage: true,
      apiCost: 'Free (local)',
    },
    {
      id: 'upscale',
      name: 'AI Upscaling',
      description: 'Increase image resolution while maintaining quality using AI',
      icon: <Maximize2 className="w-6 h-6" />,
      color: 'from-indigo-500 to-purple-500',
      features: ['2x/4x upscale', 'Detail preservation', 'Smart interpolation', 'Batch support'],
      requiresImage: true,
      apiCost: '~$0.0015/image',
    },
  ];

  // Handlers
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  }, []);
  
  const handleFaceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setFaceSwapSource(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    try {
      // Call backend API endpoint with cookies for authentication
      const response = await fetch('/api/thumbnails/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          style,
          projectId: 'temp-project-id', // TODO: Get actual project ID from context
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate image');
      }
      
      const data = await response.json();
      
      // Backend returns array of thumbnails, use the first one
      if (data.thumbnails && data.thumbnails.length > 0) {
        setResultImage(data.thumbnails[0].imageUrl);
      }
    } catch (error) {
      console.error('Generate failed:', error);
    }
  }, [prompt, style]);

  const handleRemoveBackground = useCallback(async () => {
    if (!uploadedImage) return;
    
    try {
      if (worker.isReady) {
        // Use Web Worker (non-blocking)
        const result = await worker.execute('removeBackground', { image: uploadedImage });
        if (result.imageBase64) {
          setResultImage(`data:image/png;base64,${result.imageBase64}`);
        }
      } else {
        // Fallback to main thread
        const result = await aiService.removeBackground({ image: uploadedImage });
        if (result.success && result.imageBase64) {
          setResultImage(`data:image/png;base64,${result.imageBase64}`);
        }
      }
    } catch (error) {
      console.error('Remove background failed:', error);
    }
  }, [uploadedImage, worker, aiService]);

  const handleEnhance = useCallback(async () => {
    if (!uploadedImage) return;
    
    try {
      if (worker.isReady) {
        // Use Web Worker (non-blocking)
        const result = await worker.execute('enhance', {
          image: uploadedImage,
          type: enhanceType,
          strength: 0.7,
        });
        if (result.imageBase64) {
          setResultImage(`data:image/png;base64,${result.imageBase64}`);
        }
      } else {
        // Fallback to main thread
        const result = await aiService.enhance({
          image: uploadedImage,
          type: enhanceType,
          strength: 0.7,
        });
        if (result.success && result.imageBase64) {
          setResultImage(`data:image/png;base64,${result.imageBase64}`);
        }
      }
    } catch (error) {
      console.error('Enhance failed:', error);
    }
  }, [uploadedImage, enhanceType, worker, aiService]);

  const handleUpscale = useCallback(async () => {
    if (!uploadedImage) return;
    
    try {
      const result = await aiService.upscale({
        image: uploadedImage,
        scale: upscaleScale,
      });
      
      if (result.success && (result.imageUrl || result.imageBase64)) {
        setResultImage(result.imageUrl || `data:image/png;base64,${result.imageBase64}`);
      }
    } catch (error) {
      console.error('Upscale failed:', error);
    }
  }, [uploadedImage, upscaleScale, aiService]);

  const handleFaceSwap = useCallback(async () => {
    if (!uploadedImage || !faceSwapSource) return;
    
    try {
      const result = await aiService.faceSwap({
        sourceImage: faceSwapSource,
        targetImage: uploadedImage,
      });
      
      if (result.success && (result.imageUrl || result.imageBase64)) {
        setResultImage(result.imageUrl || `data:image/png;base64,${result.imageBase64}`);
      }
    } catch (error) {
      console.error('Face swap failed:', error);
    }
  }, [uploadedImage, faceSwapSource, aiService]);

  const handleInpaint = useCallback(async () => {
    if (!uploadedImage || !prompt.trim()) return;
    
    try {
      // Inpaint uses the prompt to describe what to add/change in the image
      // For now, we'll use a simple mask approach (full image context)
      const result = await aiService.inpaint({
        image: uploadedImage,
        mask: uploadedImage, // In a full implementation, this would be a user-drawn mask
        prompt: prompt,
        strength: 0.8,
      });
      
      if (result.success && (result.imageUrl || result.imageBase64)) {
        setResultImage(result.imageUrl || `data:image/png;base64,${result.imageBase64}`);
      }
    } catch (error) {
      console.error('Inpaint failed:', error);
    }
  }, [uploadedImage, prompt, aiService]);

  const handleDownload = useCallback(() => {
    if (!resultImage) return;
    
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `ai-${selectedTool}-${Date.now()}.png`;
    link.click();
  }, [resultImage, selectedTool]);

  const handleProcessTool = useCallback(() => {
    switch (selectedTool) {
      case 'generate':
        handleGenerate();
        break;
      case 'inpaint':
        handleInpaint();
        break;
      case 'remove-bg':
        handleRemoveBackground();
        break;
      case 'enhance':
        handleEnhance();
        break;
      case 'upscale':
        handleUpscale();
        break;
      case 'face-swap':
        handleFaceSwap();
        break;
      default:
        break;
    }
  }, [selectedTool, handleGenerate, handleInpaint, handleRemoveBackground, handleEnhance, handleUpscale, handleFaceSwap]);

  const currentTool = aiTools.find(t => t.id === selectedTool);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          AI Tools
        </h1>
        <p className="text-slate-400 text-lg">
          Powerful AI-driven tools to enhance and transform your thumbnails
        </p>
        {ai.isInitializing && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Initializing AI models...</span>
          </div>
        )}
      </div>

      {/* Tool Selection Grid */}
      {!selectedTool && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {aiTools.map((tool) => (
            <div
              key={tool.id}
              className="group relative bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 cursor-pointer overflow-hidden"
              onClick={() => setSelectedTool(tool.id)}
            >
              {/* Gradient background effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} p-3 mb-4 shadow-lg shadow-black/20 flex items-center justify-center text-white`}>
                {tool.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-2 text-slate-100 group-hover:text-white transition-colors">
                {tool.name}
              </h3>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                {tool.description}
              </p>

              {/* Features */}
              <div className="space-y-2 mb-4">
                {tool.features.slice(0, 3).map((feature, idx) => (
                  <div key={idx} className="flex items-center text-xs text-slate-500">
                    <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${tool.color} mr-2`} />
                    {feature}
                  </div>
                ))}
              </div>

              {/* Cost & Action */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{tool.apiCost}</span>
                <button className="flex items-center gap-1 text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  <span>Use Tool</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tool Interface */}
      {selectedTool && currentTool && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Tool Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentTool.color} p-2.5 flex items-center justify-center text-white`}>
                {currentTool.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{currentTool.name}</h2>
                <p className="text-sm text-slate-400">{currentTool.description}</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setSelectedTool(null);
                setUploadedImage(null);
                setResultImage(null);
                setFaceSwapSource(null);
              }}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Panel - Controls */}
            <div className="space-y-6">
              {/* Image Upload (for tools that require it) */}
              {currentTool.requiresImage && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Upload Image
                  </label>
                  {uploadedImage ? (
                    <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden">
                      <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-contain" />
                      <button
                        onClick={() => {
                          setUploadedImage(null);
                          setResultImage(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-slate-600 hover:bg-slate-800/70 transition-all cursor-pointer"
                    >
                      <Upload className="w-10 h-10 text-slate-500" />
                      <span className="text-sm text-slate-400">Click to upload or drag and drop</span>
                      <span className="text-xs text-slate-500">PNG, JPG up to 10MB</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              )}

              {/* Generate Tool Options */}
              {selectedTool === 'generate' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Describe Your Image
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="A futuristic cityscape at sunset with flying cars..."
                      className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {stylePresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setStyle(preset.id)}
                          className={`p-3 rounded-xl border text-sm transition-all ${
                            style === preset.id
                              ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <span className="text-lg mb-1">{preset.icon}</span>
                          <span className="block text-xs mt-1">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Aspect Ratio
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as AIGenerateRequest['aspectRatio'])}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {aspectRatios.map((ar) => (
                        <option key={ar.value} value={ar.value}>{ar.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Enhance Tool Options */}
              {selectedTool === 'enhance' && uploadedImage && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Enhancement Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['auto', 'sharpen', 'denoise', 'color'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setEnhanceType(type)}
                        className={`p-3 rounded-xl border text-sm transition-all ${
                          enhanceType === type
                            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {type === 'auto' && '✨ Auto Enhance'}
                        {type === 'sharpen' && '🔍 Sharpen'}
                        {type === 'denoise' && '🔇 Denoise'}
                        {type === 'color' && '🎨 Color Boost'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upscale Tool Options */}
              {selectedTool === 'upscale' && uploadedImage && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Scale Factor
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setUpscaleScale(2)}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        upscaleScale === 2
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-2xl font-bold">2x</span>
                      <span className="block text-xs mt-1">Double resolution</span>
                    </button>
                    <button
                      onClick={() => setUpscaleScale(4)}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        upscaleScale === 4
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-2xl font-bold">4x</span>
                      <span className="block text-xs mt-1">Quadruple resolution</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Face Swap Tool Options */}
              {selectedTool === 'face-swap' && uploadedImage && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Source Face
                  </label>
                  {faceSwapSource ? (
                    <div className="relative w-32 h-32 bg-slate-800 rounded-xl overflow-hidden">
                      <img src={faceSwapSource} alt="Source face" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setFaceSwapSource(null)}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-lg hover:bg-black/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => faceInputRef.current?.click()}
                      className="w-32 h-32 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-slate-600 transition-all cursor-pointer"
                    >
                      <Users className="w-6 h-6 text-slate-500" />
                      <span className="text-xs text-slate-400">Upload face</span>
                    </button>
                  )}
                  <input
                    ref={faceInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFaceUpload}
                  />
                </div>
              )}

              {/* Inpaint Tool Options */}
              {selectedTool === 'inpaint' && uploadedImage && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Wand2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-300 mb-1">How to use Inpainting</h4>
                        <p className="text-xs text-slate-400">
                          Describe what you want to add, change, or modify in your image. 
                          The AI will intelligently edit the image based on your description.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Describe Your Edit
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., Add a sunset sky in the background, Replace the text with 'AMAZING', Make the person smile..."
                      className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Process Button */}
              <button
                onClick={handleProcessTool}
                disabled={
                  ai.isLoading || 
                  (selectedTool === 'generate' && !prompt.trim()) ||
                  (selectedTool === 'inpaint' && !prompt.trim()) ||
                  (currentTool.requiresImage && !uploadedImage) ||
                  (selectedTool === 'face-swap' && !faceSwapSource)
                }
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${currentTool.color} hover:shadow-lg hover:shadow-purple-500/25`}
              >
                {ai.isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {currentTool.icon}
                    {selectedTool === 'generate' ? 'Generate Image' : `Apply ${currentTool.name}`}
                  </>
                )}
              </button>

              {/* Error Display */}
              {ai.error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{ai.error}</span>
                </div>
              )}
            </div>

            {/* Right Panel - Result */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  Result
                </label>
                {resultImage && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}
              </div>
              
              <div className="aspect-video bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex items-center justify-center">
                {resultImage ? (
                  <img src={resultImage} alt="Result" className="w-full h-full object-contain" />
                ) : ai.isLoading ? (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <RefreshCw className="w-10 h-10 animate-spin" />
                    <span className="text-sm">Processing your image...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-sm">Result will appear here</span>
                  </div>
                )}
              </div>

              {/* Success message */}
              {resultImage && !ai.isLoading && (
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
                  <Check className="w-5 h-5" />
                  <span>Image processed successfully!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
};

export default AIToolsPage;
