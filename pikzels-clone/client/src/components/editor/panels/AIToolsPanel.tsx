/**
 * Enhanced AI Tools Panel
 * Comprehensive AI toolkit integrated with canvas editor
 */

import React, { useState, useCallback, useRef } from 'react';
import { useAIService } from '../../../hooks/useAIService';
import type { 
  AIGenerateRequest, 
  AIAnalysisResult,
  AITaskType,
} from '../../../services/ai-providers';
import type { Layer, ImageLayer } from '../types/editor.types';

// ============================================
// ICONS
// ============================================

const Icons = {
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Wand: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
    </svg>
  ),
  Eraser: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" /><path d="m5 11 9 9" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  ),
  Maximize: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  Palette: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ============================================
// TYPES
// ============================================

type AIToolTab = 'generate' | 'inpaint' | 'remove-bg' | 'face-swap' | 'upscale' | 'enhance' | 'analyze';

interface AIToolsPanelProps {
  selectedLayers: Layer[];
  onAddImageLayer: (imageUrl: string, name?: string) => void;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
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
  { value: '9:16', label: '9:16 (Shorts)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3 (Standard)' },
];

// ============================================
// COMPONENT
// ============================================

const AIToolsPanel: React.FC<AIToolsPanelProps> = ({
  selectedLayers,
  onAddImageLayer,
  onUpdateLayer,
  canvasRef,
}) => {
  const ai = useAIService({
    config: {
      providers: {
        tensorflow: {},
        // Replicate API key would come from env/config
        replicate: {
          apiKey: '', // User would configure this
        },
      },
    },
  });
  
  const [activeTab, setActiveTab] = useState<AIToolTab>('generate');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState<AIGenerateRequest['aspectRatio']>('16:9');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [steps, setSteps] = useState(4);
  const [guidance, setGuidance] = useState(0);
  const [enhanceType, setEnhanceType] = useState<'auto' | 'sharpen' | 'denoise' | 'color'>('auto');
  const [upscaleScale, setUpscaleScale] = useState<2 | 4>(2);
  const [upscaleModel, setUpscaleModel] = useState<'general' | 'face' | 'anime'>('general');
  const [faceSwapSource, setFaceSwapSource] = useState<string | null>(null);
  const [inpaintMask, setInpaintMask] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get selected image layer
  const selectedImageLayer = selectedLayers.find(
    (l): l is ImageLayer => l.type === 'image'
  );
  
  // ============================================
  // HANDLERS
  // ============================================
  
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    const result = await ai.generate({
      prompt,
      negativePrompt: negativePrompt || undefined,
      style,
      aspectRatio,
      steps,
      guidance,
    });
    
    if (result.success && result.imageUrl) {
      setGeneratedImages(prev => [result.imageUrl!, ...prev].slice(0, 8));
      onAddImageLayer(result.imageUrl, 'AI Generated');
    }
  }, [prompt, negativePrompt, style, aspectRatio, steps, guidance, ai, onAddImageLayer]);
  
  const handleRemoveBackground = useCallback(async () => {
    if (!selectedImageLayer) return;
    
    const result = await ai.removeBackground({
      image: selectedImageLayer.src,
    });
    
    if (result.success && result.imageBase64) {
      const imageUrl = `data:image/png;base64,${result.imageBase64}`;
      onUpdateLayer(selectedImageLayer.id, { src: imageUrl } as Partial<ImageLayer>);
    }
  }, [selectedImageLayer, ai, onUpdateLayer]);
  
  const handleEnhance = useCallback(async () => {
    if (!selectedImageLayer) return;
    
    const result = await ai.enhance({
      image: selectedImageLayer.src,
      type: enhanceType,
      strength: 0.7,
    });
    
    if (result.success && result.imageBase64) {
      const imageUrl = `data:image/png;base64,${result.imageBase64}`;
      onUpdateLayer(selectedImageLayer.id, { src: imageUrl } as Partial<ImageLayer>);
    }
  }, [selectedImageLayer, enhanceType, ai, onUpdateLayer]);
  
  const handleAnalyze = useCallback(async () => {
    if (!selectedImageLayer) return;
    
    const result = await ai.analyze({
      image: selectedImageLayer.src,
    });
    
    if (result.success) {
      setAnalysisResult(result);
    }
  }, [selectedImageLayer, ai]);
  
  const handleSelectGeneratedImage = useCallback((imageUrl: string) => {
    onAddImageLayer(imageUrl, 'AI Generated');
  }, [onAddImageLayer]);
  
  const handleInpaint = useCallback(async () => {
    if (!selectedImageLayer || !inpaintMask || !prompt.trim()) return;
    
    const result = await ai.inpaint({
      image: selectedImageLayer.src,
      mask: inpaintMask,
      prompt,
      negativePrompt: negativePrompt || undefined,
      strength: 0.8,
    });
    
    if (result.success && (result.imageUrl || result.imageBase64)) {
      const imageUrl = result.imageUrl || `data:image/png;base64,${result.imageBase64}`;
      onUpdateLayer(selectedImageLayer.id, { src: imageUrl } as Partial<ImageLayer>);
    }
  }, [selectedImageLayer, inpaintMask, prompt, negativePrompt, ai, onUpdateLayer]);
  
  const handleUpscale = useCallback(async () => {
    if (!selectedImageLayer) return;
    
    const result = await ai.upscale({
      image: selectedImageLayer.src,
      scale: upscaleScale,
      model: upscaleModel,
    });
    
    if (result.success && (result.imageUrl || result.imageBase64)) {
      const imageUrl = result.imageUrl || `data:image/png;base64,${result.imageBase64}`;
      onUpdateLayer(selectedImageLayer.id, { src: imageUrl } as Partial<ImageLayer>);
    }
  }, [selectedImageLayer, upscaleScale, upscaleModel, ai, onUpdateLayer]);
  
  const handleFaceSwap = useCallback(async () => {
    if (!selectedImageLayer || !faceSwapSource) return;
    
    const result = await ai.faceSwap({
      sourceImage: faceSwapSource,
      targetImage: selectedImageLayer.src,
    });
    
    if (result.success && (result.imageUrl || result.imageBase64)) {
      const imageUrl = result.imageUrl || `data:image/png;base64,${result.imageBase64}`;
      onUpdateLayer(selectedImageLayer.id, { src: imageUrl } as Partial<ImageLayer>);
    }
  }, [selectedImageLayer, faceSwapSource, ai, onUpdateLayer]);
  
  const handleFaceSourceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setFaceSwapSource(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);
  
  // ============================================
  // RENDER TABS
  // ============================================
  
  const tabs: { id: AIToolTab; label: string; icon: React.ReactNode }[] = [
    { id: 'generate', label: 'Generate', icon: <Icons.Sparkles /> },
    { id: 'inpaint', label: 'Inpaint', icon: <Icons.Wand /> },
    { id: 'remove-bg', label: 'Remove BG', icon: <Icons.Eraser /> },
    { id: 'face-swap', label: 'Face Swap', icon: <Icons.User /> },
    { id: 'upscale', label: 'Upscale', icon: <Icons.Maximize /> },
    { id: 'enhance', label: 'Enhance', icon: <Icons.Palette /> },
    { id: 'analyze', label: 'Analyze', icon: <Icons.BarChart /> },
  ];
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="ai-tools-panel">
      {/* Tab Navigation */}
      <div className="ai-tools-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`ai-tools-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Loading Indicator */}
      {ai.isLoading && (
        <div className="ai-tools-loading">
          <Icons.Loader />
          <span>Processing {ai.currentTask}...</span>
        </div>
      )}
      
      {/* Error Display */}
      {ai.error && (
        <div className="ai-tools-error">
          <Icons.AlertCircle />
          <span>{ai.error}</span>
        </div>
      )}
      
      {/* Tab Content */}
      <div className="ai-tools-content">
        {/* GENERATE TAB */}
        {activeTab === 'generate' && (
          <div className="ai-generate-panel">
            <textarea
              className="ai-prompt-input"
              placeholder="Describe your thumbnail... (e.g., 'A futuristic cityscape at sunset')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleGenerate();
                }
              }}
            />
            
            {/* Style Selection */}
            <div className="ai-option-group">
              <label>Style</label>
              <div className="ai-style-grid">
                {stylePresets.map(preset => (
                  <button
                    key={preset.id}
                    className={`ai-style-btn ${style === preset.id ? 'active' : ''}`}
                    onClick={() => setStyle(preset.id)}
                  >
                    <span className="ai-style-icon">{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Aspect Ratio */}
            <div className="ai-option-group">
              <label>Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AIGenerateRequest['aspectRatio'])}
              >
                {aspectRatios.map(ar => (
                  <option key={ar.value} value={ar.value}>{ar.label}</option>
                ))}
              </select>
            </div>
            
            {/* Advanced Options */}
            <button
              className="ai-advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '− Hide' : '+ Show'} Advanced
            </button>
            
            {showAdvanced && (
              <div className="ai-advanced-options">
                <div className="ai-option-group">
                  <label>Negative Prompt</label>
                  <textarea
                    className="ai-prompt-input small"
                    placeholder="What to avoid..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                  />
                </div>
                <div className="ai-option-group">
                  <label>Steps: {steps}</label>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}
            
            {/* Generate Button */}
            <button
              className="ai-action-btn primary"
              onClick={handleGenerate}
              disabled={!prompt.trim() || ai.isLoading}
            >
              {ai.isLoading && ai.currentTask === 'generate' ? (
                <><Icons.Loader /> Generating...</>
              ) : (
                <><Icons.Sparkles /> Generate Thumbnail</>
              )}
            </button>
            <p className="ai-hint">Press Ctrl+Enter to generate</p>
            
            {/* Generated Images History */}
            {generatedImages.length > 0 && (
              <div className="ai-history">
                <h4>Recent</h4>
                <div className="ai-history-grid">
                  {generatedImages.map((url, i) => (
                    <button
                      key={i}
                      className="ai-history-item"
                      onClick={() => handleSelectGeneratedImage(url)}
                    >
                      <img src={url} alt={`Generated ${i + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* INPAINT TAB */}
        {activeTab === 'inpaint' && (
          <div className="ai-inpaint-panel">
            <div className="ai-tool-info">
              <Icons.Wand />
              <div>
                <h4>AI Inpainting</h4>
                <p>Select an area on your image and describe what you want to add or change.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <p className="ai-instruction">
                  1. Use the brush tool (B) to paint over the area you want to change
                </p>
                <textarea
                  className="ai-prompt-input"
                  placeholder="Describe what should appear in the painted area..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <button
                  className="ai-action-btn primary"
                  disabled={ai.isLoading || !prompt.trim()}
                  onClick={handleInpaint}
                >
                  {ai.isLoading && ai.currentTask === 'inpaint' ? (
                    <><Icons.Loader /> Inpainting...</>
                  ) : (
                    <><Icons.Wand /> Apply Inpainting</>
                  )}
                </button>
              </>
            )}
          </div>
        )}
        
        {/* REMOVE BACKGROUND TAB */}
        {activeTab === 'remove-bg' && (
          <div className="ai-remove-bg-panel">
            <div className="ai-tool-info">
              <Icons.Eraser />
              <div>
                <h4>Background Removal</h4>
                <p>Automatically remove the background from your image using AI.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <div className="ai-preview-box">
                  <img src={selectedImageLayer.src} alt="Selected" />
                </div>
                <button
                  className="ai-action-btn primary"
                  onClick={handleRemoveBackground}
                  disabled={ai.isLoading}
                >
                  {ai.isLoading && ai.currentTask === 'remove-bg' ? (
                    <><Icons.Loader /> Removing...</>
                  ) : (
                    <><Icons.Eraser /> Remove Background</>
                  )}
                </button>
                <p className="ai-hint">Free • Runs locally</p>
              </>
            )}
          </div>
        )}
        
        {/* FACE SWAP TAB */}
        {activeTab === 'face-swap' && (
          <div className="ai-face-swap-panel">
            <div className="ai-tool-info">
              <Icons.User />
              <div>
                <h4>Face Swap</h4>
                <p>Replace faces in your thumbnail with your own or custom faces.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer with a face first</span>
              </div>
            ) : (
              <>
                <div className="ai-option-group">
                  <label>Source Face</label>
                  {faceSwapSource ? (
                    <div className="ai-preview-box" style={{ aspectRatio: '1/1', maxWidth: '120px' }}>
                      <img src={faceSwapSource} alt="Source face" />
                      <button 
                        className="ai-remove-btn"
                        onClick={() => setFaceSwapSource(null)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: 'white' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="ai-add-persona-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span>+</span>
                      <span>Upload Face Image</span>
                    </button>
                  )}
                </div>
                
                <button
                  className="ai-action-btn primary"
                  onClick={handleFaceSwap}
                  disabled={ai.isLoading || !faceSwapSource}
                >
                  {ai.isLoading && ai.currentTask === 'face-swap' ? (
                    <><Icons.Loader /> Swapping...</>
                  ) : (
                    <><Icons.User /> Swap Face</>
                  )}
                </button>
                <p className="ai-hint">Requires API key • ~$0.002 per swap</p>
              </>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFaceSourceUpload}
            />
          </div>
        )}
        
        {/* UPSCALE TAB */}
        {activeTab === 'upscale' && (
          <div className="ai-upscale-panel">
            <div className="ai-tool-info">
              <Icons.Maximize />
              <div>
                <h4>AI Upscaling</h4>
                <p>Increase image resolution while maintaining quality using AI.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <div className="ai-preview-box">
                  <img src={selectedImageLayer.src} alt="Selected" />
                </div>
                
                <div className="ai-option-group">
                  <label>Scale Factor</label>
                  <div className="ai-enhance-options">
                    <button
                      className={`ai-enhance-btn ${upscaleScale === 2 ? 'active' : ''}`}
                      onClick={() => setUpscaleScale(2)}
                    >
                      2x Upscale
                    </button>
                    <button
                      className={`ai-enhance-btn ${upscaleScale === 4 ? 'active' : ''}`}
                      onClick={() => setUpscaleScale(4)}
                    >
                      4x Upscale
                    </button>
                  </div>
                </div>
                
                <div className="ai-option-group">
                  <label>Model Type</label>
                  <select
                    value={upscaleModel}
                    onChange={(e) => setUpscaleModel(e.target.value as 'general' | 'face' | 'anime')}
                  >
                    <option value="general">General (Best for most images)</option>
                    <option value="face">Face Enhanced (Better for portraits)</option>
                    <option value="anime">Anime/Illustration</option>
                  </select>
                </div>
                
                <button
                  className="ai-action-btn primary"
                  onClick={handleUpscale}
                  disabled={ai.isLoading}
                >
                  {ai.isLoading && ai.currentTask === 'upscale' ? (
                    <><Icons.Loader /> Upscaling...</>
                  ) : (
                    <><Icons.Maximize /> Upscale Image</>
                  )}
                </button>
                <p className="ai-hint">Requires API key • ~$0.0015 per upscale</p>
              </>
            )}
          </div>
        )}
        
        {/* ENHANCE TAB */}
        {activeTab === 'enhance' && (
          <div className="ai-enhance-panel">
            <div className="ai-tool-info">
              <Icons.Maximize />
              <div>
                <h4>Image Enhancement</h4>
                <p>Improve image quality with AI-powered enhancements.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <div className="ai-enhance-options">
                  {(['auto', 'sharpen', 'denoise', 'color'] as const).map(type => (
                    <button
                      key={type}
                      className={`ai-enhance-btn ${enhanceType === type ? 'active' : ''}`}
                      onClick={() => setEnhanceType(type)}
                    >
                      {type === 'auto' && '✨ Auto'}
                      {type === 'sharpen' && '🔍 Sharpen'}
                      {type === 'denoise' && '🔇 Denoise'}
                      {type === 'color' && '🎨 Color'}
                    </button>
                  ))}
                </div>
                
                <button
                  className="ai-action-btn primary"
                  onClick={handleEnhance}
                  disabled={ai.isLoading}
                >
                  {ai.isLoading && ai.currentTask === 'enhance' ? (
                    <><Icons.Loader /> Enhancing...</>
                  ) : (
                    <><Icons.Maximize /> Apply Enhancement</>
                  )}
                </button>
                <p className="ai-hint">Free • Runs locally</p>
              </>
            )}
          </div>
        )}
        
        {/* ANALYZE TAB */}
        {activeTab === 'analyze' && (
          <div className="ai-analyze-panel">
            <div className="ai-tool-info">
              <Icons.BarChart />
              <div>
                <h4>Thumbnail Score</h4>
                <p>Get AI-powered analysis and suggestions for your thumbnail.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <button
                  className="ai-action-btn primary"
                  onClick={handleAnalyze}
                  disabled={ai.isLoading}
                >
                  {ai.isLoading && ai.currentTask === 'analyze' ? (
                    <><Icons.Loader /> Analyzing...</>
                  ) : (
                    <><Icons.BarChart /> Analyze Thumbnail</>
                  )}
                </button>
                
                {analysisResult && (
                  <div className="ai-analysis-result">
                    <div className="ai-score-overall">
                      <span className="score-value">{analysisResult.scores.overall}</span>
                      <span className="score-label">Overall Score</span>
                    </div>
                    
                    <div className="ai-scores-grid">
                      {Object.entries(analysisResult.scores)
                        .filter(([key]) => key !== 'overall')
                        .map(([key, value]) => (
                          <div key={key} className="ai-score-item">
                            <div className="score-bar">
                              <div 
                                className="score-fill" 
                                style={{ width: `${value}%` }}
                              />
                            </div>
                            <span className="score-name">{key}</span>
                            <span className="score-num">{value}</span>
                          </div>
                        ))}
                    </div>
                    
                    {analysisResult.suggestions.length > 0 && (
                      <div className="ai-suggestions">
                        <h5>Suggestions</h5>
                        <ul>
                          {analysisResult.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysisResult.issues.length > 0 && (
                      <div className="ai-issues">
                        <h5>Issues</h5>
                        {analysisResult.issues.map((issue, i) => (
                          <div key={i} className={`ai-issue ${issue.type}`}>
                            <Icons.AlertCircle />
                            <span>{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Cost Indicator */}
      <div className="ai-cost-indicator">
        <span>Est. cost: ${ai.estimateCost(activeTab as AITaskType).toFixed(3)}</span>
      </div>
    </div>
  );
};

export default AIToolsPanel;
