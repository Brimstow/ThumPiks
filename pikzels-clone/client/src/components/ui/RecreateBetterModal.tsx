/**
 * RecreateBetterModal - AI-powered thumbnail improvement flow
 * 
 * 3 Stages:
 * 1. Analyzing - Vision API analyzes the original thumbnail
 * 2. Preview - Shows analysis results with editable improved prompt
 * 3. Result - Shows generated improved version with action buttons
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  Eye,
  Wand2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Save,
  Pencil,
  Download,
  ChevronRight,
  Lightbulb,
  Palette,
  Users,
  Type,
  BarChart3,
  Check,
} from 'lucide-react';
import { authPost } from '../../utils/api';
import { useImageActions, enhancePromptFromAnalysis, calculateRecreateBetterCost } from '../../hooks/useImageActions';
import type { RecreateBetterModalProps, RecreateBetterStage } from '../../types/image-actions.types';
import type { VisionAnalysisResult } from '../../types/vision.types';

// ============================================
// COMPONENT
// ============================================

export const RecreateBetterModal: React.FC<RecreateBetterModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  imageUrl: propImageUrl,
  existingAnalysis: propExistingAnalysis,
  onImageGenerated,
  onSave,
}) => {
  const { saveToLibrary, openInEditor, downloadImage } = useImageActions();

  // Self-management state (used when no props provided)
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalImageUrl, setInternalImageUrl] = useState<string | null>(null);
  const [internalExistingAnalysis, setInternalExistingAnalysis] = useState<VisionAnalysisResult | null>(null);

  // Resolve whether to use props or internal state
  const isOpen = propIsOpen ?? internalOpen;
  const imageUrl = propImageUrl ?? internalImageUrl ?? '';
  const existingAnalysis = propExistingAnalysis ?? internalExistingAnalysis;

  const onClose = useCallback(() => {
    setInternalOpen(false);
    setInternalImageUrl(null);
    setInternalExistingAnalysis(null);
    propOnClose?.();
  }, [propOnClose]);

  // Stage management
  const [stage, setStage] = useState<RecreateBetterStage>('idle');
  const [error, setError] = useState<string | null>(null);

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(
    existingAnalysis || null
  );

  // Prompt state
  const [improvedPrompt, setImprovedPrompt] = useState('');
  const [improvements, setImprovements] = useState<string[]>([]);

  // Generation state
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calculate credit cost
  const creditCost = calculateRecreateBetterCost(!!existingAnalysis);

  // ============================================
  // EFFECTS
  // ============================================

  // Listen for openRecreateBetter events (self-management mode)
  useEffect(() => {
    const handleOpen = (event: CustomEvent<{ imageUrl: string; sourceSettings?: unknown; existingAnalysis?: VisionAnalysisResult }>) => {
      const { imageUrl, existingAnalysis } = event.detail;
      setInternalImageUrl(imageUrl);
      if (existingAnalysis) {
        setInternalExistingAnalysis(existingAnalysis);
        setAnalysisResult(existingAnalysis);
      }
      setInternalOpen(true);
    };

    window.addEventListener('openRecreateBetter', handleOpen as EventListener);
    return () => {
      window.removeEventListener('openRecreateBetter', handleOpen as EventListener);
    };
  }, []);

  // Start analysis when modal opens
  useEffect(() => {
    if (isOpen && stage === 'idle') {
      if (existingAnalysis) {
        // Skip analysis, go directly to preview
        setAnalysisResult(existingAnalysis);
        const { enhancedPrompt, improvements: imps } = enhancePromptFromAnalysis(existingAnalysis);
        setImprovedPrompt(enhancedPrompt);
        setImprovements(imps);
        setStage('preview');
      } else {
        // Start analysis
        startAnalysis();
      }
    }
  }, [isOpen, stage, existingAnalysis]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStage('idle');
      setError(null);
      setAnalysisResult(existingAnalysis || null);
      setImprovedPrompt('');
      setImprovements([]);
      setGeneratedImageUrl(null);
      setSaveSuccess(false);
    }
  }, [isOpen, existingAnalysis]);

  // ============================================
  // HANDLERS
  // ============================================

  const startAnalysis = useCallback(async () => {
    setStage('analyzing');
    setError(null);

    try {
      const response = await authPost('/api/vision/describe', {
        imageUrl,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze image');
      }

      const data = await response.json();
      setAnalysisResult(data);

      // Generate enhanced prompt
      const { enhancedPrompt, improvements: imps } = enhancePromptFromAnalysis(data);
      setImprovedPrompt(enhancedPrompt);
      setImprovements(imps);

      setStage('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStage('error');
    }
  }, [imageUrl]);

  const handleGenerate = useCallback(async () => {
    if (!improvedPrompt.trim()) return;

    setStage('generating');
    setError(null);

    try {
      const response = await authPost('/api/thumbnails/ai/generate', {
        prompt: improvedPrompt,
        aspectRatio: '16:9',
        tier: 'balanced',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate image');
      }

      const data = await response.json();
      const newImageUrl = data.images?.[0] || data.image;

      if (!newImageUrl) {
        throw new Error('No image returned from generation');
      }

      setGeneratedImageUrl(newImageUrl);
      onImageGenerated?.(newImageUrl, improvedPrompt);
      setStage('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStage('error');
    }
  }, [improvedPrompt, onImageGenerated]);

  const handleSave = useCallback(async () => {
    if (!generatedImageUrl) return;

    setIsSaving(true);
    try {
      const result = await saveToLibrary(generatedImageUrl, {
        title: `Improved Thumbnail ${new Date().toLocaleDateString()}`,
        platform: 'youtube',
      });

      if (result.success) {
        setSaveSuccess(true);
        onSave?.(generatedImageUrl);
        setTimeout(() => onClose(), 1500);
      }
    } finally {
      setIsSaving(false);
    }
  }, [generatedImageUrl, saveToLibrary, onSave, onClose]);

  const handleEdit = useCallback(() => {
    if (generatedImageUrl) {
      openInEditor(generatedImageUrl, {
        initialImage: generatedImageUrl,
        source: 'recreate-better',
        prompt: improvedPrompt,
        analysisResult: analysisResult || undefined,
      });
      onClose();
    }
  }, [generatedImageUrl, improvedPrompt, analysisResult, openInEditor, onClose]);

  const handleDownload = useCallback(() => {
    if (generatedImageUrl) {
      downloadImage(generatedImageUrl, `improved-thumbnail-${Date.now()}.png`);
    }
  }, [generatedImageUrl, downloadImage]);

  const handleRegenerate = useCallback(() => {
    setGeneratedImageUrl(null);
    setStage('preview');
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    if (stage === 'error' && !analysisResult) {
      startAnalysis();
    } else {
      setStage('preview');
    }
  }, [stage, analysisResult, startAnalysis]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderAnalyzingStage = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-purple-500/30">
          <img src={imageUrl} alt="Analyzing" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
          <Eye className="w-5 h-5 text-white animate-pulse" />
        </div>
      </div>
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">Analyzing Thumbnail</h3>
      <p className="text-sm text-slate-400 text-center max-w-sm">
        AI is examining composition, colors, faces, text, and overall effectiveness...
      </p>
    </div>
  );

  const renderPreviewStage = () => {
    if (!analysisResult) return null;

    const ctr = analysisResult.elements.ctrFactors;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Original Image + Analysis */}
        <div className="space-y-4">
          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700">
            <img src={imageUrl} alt="Original" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
              Original
            </div>
          </div>

          {/* CTR Score */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-300">CTR Score</span>
              <span className={`text-2xl font-bold ${
                ctr.overallCTR >= 70 ? 'text-green-400' :
                ctr.overallCTR >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {ctr.overallCTR}/100
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-xs">
              {[
                { label: 'Face', score: ctr.faceScore, icon: Users },
                { label: 'Text', score: ctr.textScore, icon: Type },
                { label: 'Color', score: ctr.colorScore, icon: Palette },
                { label: 'Comp', score: ctr.compositionScore, icon: BarChart3 },
                { label: 'Emotion', score: ctr.emotionScore, icon: Lightbulb },
              ].map(({ label, score, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
                  <div className={`font-medium ${score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {score}
                  </div>
                  <div className="text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          {analysisResult.elements.suggestions.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                AI Suggestions
              </h4>
              <ul className="space-y-1">
                {analysisResult.elements.suggestions.slice(0, 3).map((suggestion, idx) => (
                  <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-purple-400" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Improved Prompt + Generate */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Improved Prompt
            </label>
            <textarea
              value={improvedPrompt}
              onChange={(e) => setImprovedPrompt(e.target.value)}
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
              placeholder="AI-enhanced prompt will appear here..."
            />
          </div>

          {/* Improvements Applied */}
          {improvements.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {improvements.map((imp, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300"
                >
                  + {imp}
                </span>
              ))}
            </div>
          )}

          {/* Credit Cost */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <span className="text-sm text-slate-400">Generation Cost</span>
            <span className="text-sm font-medium text-purple-400">1 credit</span>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!improvedPrompt.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          >
            <Wand2 className="w-5 h-5" />
            Generate Improved Version
          </button>
        </div>
      </div>
    );
  };

  const renderGeneratingStage = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative mb-6">
        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
          <Wand2 className="w-12 h-12 text-purple-400 animate-pulse" />
        </div>
      </div>
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">Creating Improved Version</h3>
      <p className="text-sm text-slate-400 text-center max-w-sm">
        AI is generating a better thumbnail based on the analysis...
      </p>
    </div>
  );

  const renderResultStage = () => (
    <div className="space-y-6">
      {/* Before/After Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700">
            <img src={imageUrl} alt="Original" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
              Original
            </div>
          </div>
          {analysisResult && (
            <div className="text-center">
              <span className={`text-lg font-bold ${
                analysisResult.elements.ctrFactors.overallCTR >= 70 ? 'text-green-400' :
                analysisResult.elements.ctrFactors.overallCTR >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                CTR: {analysisResult.elements.ctrFactors.overallCTR}/100
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-purple-500/50 shadow-lg shadow-purple-500/20">
            {generatedImageUrl && (
              <img src={generatedImageUrl} alt="Improved" className="w-full h-full object-cover" />
            )}
            <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600 rounded text-xs text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Improved
            </div>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-purple-400">AI Enhanced</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving || saveSuccess}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saveSuccess ? 'Saved!' : 'Save'}
        </button>

        <button
          onClick={handleEdit}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all"
        >
          <Download className="w-4 h-4" />
          Download
        </button>

        <button
          onClick={handleRegenerate}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );

  const renderErrorStage = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Something Went Wrong</h3>
      <p className="text-sm text-slate-400 text-center max-w-sm mb-6">
        {error || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={handleRetry}
        className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0F172A] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Recreate Better</h2>
              <p className="text-xs text-slate-400">
                {stage === 'analyzing' && 'Analyzing your thumbnail...'}
                {stage === 'preview' && 'Review analysis and generate'}
                {stage === 'generating' && 'Creating improved version...'}
                {stage === 'result' && 'Your improved thumbnail is ready!'}
                {stage === 'error' && 'Error occurred'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {stage === 'analyzing' && renderAnalyzingStage()}
          {stage === 'preview' && renderPreviewStage()}
          {stage === 'generating' && renderGeneratingStage()}
          {stage === 'result' && renderResultStage()}
          {stage === 'error' && renderErrorStage()}
        </div>
      </div>
    </div>
  );
};

export default RecreateBetterModal;
