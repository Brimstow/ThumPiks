/**
 * AITextGenerator - AI-powered title/text generation for thumbnails
 * 
 * Core reusable component that surfaces in multiple locations:
 * - AIToolsPanel tab (full mode)
 * - ContextualToolbar popover (compact mode)
 * - CreatePlusPage card (card mode)
 */

import React, { useState, useCallback } from 'react';
import { useAITextGenerator, type TextTone, type AITextSuggestion } from '../../hooks/useAITextGenerator';
import { useAIToolsStore } from '../../stores/aiToolsStore';
import './AITextGenerator.css';
import Tooltip from '../ui/Tooltip';

// ============================================
// ICONS
// ============================================

const Icons = {
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Type: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="ai-text-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
};

// ============================================
// TONE PRESETS
// ============================================

const TONE_PRESETS: { id: TextTone; label: string; emoji: string; description: string }[] = [
  { id: 'clickbait', label: 'Clickbait', emoji: '🔥', description: 'Maximum clicks & curiosity' },
  { id: 'professional', label: 'Professional', emoji: '💼', description: 'Clean & authoritative' },
  { id: 'casual', label: 'Casual', emoji: '😎', description: 'Friendly & relatable' },
  { id: 'dramatic', label: 'Dramatic', emoji: '🎭', description: 'High emotion & impact' },
  { id: 'educational', label: 'Educational', emoji: '📚', description: 'Informative & clear' },
];

const STYLE_COLORS: Record<string, string> = {
  bold: '#ef4444',
  question: '#3b82f6',
  listicle: '#10b981',
  emotional: '#f59e0b',
  curiosity: '#8b5cf6',
};

const STYLE_LABELS: Record<string, string> = {
  bold: 'Bold',
  question: 'Question',
  listicle: 'Listicle',
  emotional: 'Emotional',
  curiosity: 'Curiosity',
};

// ============================================
// PROPS
// ============================================

export interface AITextGeneratorProps {
  mode?: 'full' | 'compact';
  onAddTextLayer?: (text: string, x: number, y: number) => void;
  onUpdateTextLayer?: (layerId: string, updates: Record<string, unknown>) => void;
  selectedTextLayerId?: string | null;
  selectedTextContent?: string;
  /** Image source (URL or base64) for vision-aware text generation */
  imageSource?: string | null;
}

// ============================================
// COMPONENT
// ============================================

const AITextGenerator: React.FC<AITextGeneratorProps> = ({
  mode = 'full',
  onAddTextLayer,
  onUpdateTextLayer,
  selectedTextLayerId,
  selectedTextContent,
  imageSource,
}) => {
  const {
    suggestions,
    isGenerating,
    error,
    generationStep,
    generateTitles,
    generateFromImage,
    rewriteText,
    clearSuggestions,
    markApplied,
  } = useAITextGenerator();

  const {
    textPrompt,
    textContext,
    textTone,
    textHistory,
    setTextPrompt,
    setTextContext,
    setTextTone,
  } = useAIToolsStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!textPrompt.trim() && !selectedTextContent) return;

    await generateTitles({
      prompt: textPrompt || `Generate click-worthy thumbnail text variations for: "${selectedTextContent}"`,
      context: textContext || undefined,
      tone: textTone,
      existingText: selectedTextContent || undefined,
    });
  }, [textPrompt, textContext, textTone, selectedTextContent, generateTitles]);

  const handleGenerateFromImage = useCallback(async () => {
    if (!imageSource) return;
    const isBase64 = imageSource.startsWith('data:');
    await generateFromImage({
      imageUrl: isBase64 ? undefined : imageSource,
      imageBase64: isBase64 ? imageSource : undefined,
      fallbackPrompt: textPrompt || undefined,
      tone: textTone,
    });
  }, [imageSource, textPrompt, textTone, generateFromImage]);

  const handleRewrite = useCallback(async () => {
    if (!selectedTextContent) return;
    await rewriteText(selectedTextContent, textTone);
  }, [selectedTextContent, textTone, rewriteText]);

  const handleApply = useCallback((suggestion: AITextSuggestion) => {
    markApplied(suggestion.id);

    if (selectedTextLayerId && onUpdateTextLayer) {
      onUpdateTextLayer(selectedTextLayerId, { content: suggestion.text });
    } else if (onAddTextLayer) {
      onAddTextLayer(suggestion.text, 100, 100);
    }
  }, [selectedTextLayerId, onUpdateTextLayer, onAddTextLayer, markApplied]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleGenerate();
    }
  }, [handleGenerate]);

  // ============================================
  // COMPACT MODE (for ContextualToolbar)
  // ============================================
  if (mode === 'compact') {
    return (
      <div className="ai-text-compact">
        <div className="ai-text-compact__header">
          <Icons.Sparkles />
          <span>AI Rewrite</span>
        </div>
        {isGenerating ? (
          <div className="ai-text-compact__loading">
            <Icons.Loader />
            <span>Generating...</span>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="ai-text-compact__list">
            {suggestions.slice(0, 3).map((s) => (
              <button
                key={s.id}
                className={`ai-text-compact__item ${s.applied ? 'ai-text-compact__item--applied' : ''}`}
                onClick={() => handleApply(s)}
              >
                <span className="ai-text-compact__text">{s.text}</span>
                {s.applied && <Icons.Check />}
              </button>
            ))}
          </div>
        ) : (
          <button className="ai-text-compact__generate" onClick={handleRewrite}>
            <Icons.Sparkles /> Rewrite with AI
          </button>
        )}
      </div>
    );
  }

  // ============================================
  // FULL MODE (for AIToolsPanel)
  // ============================================
  return (
    <div className="ai-text-panel">
      {/* Header */}
      <div className="ai-text-header">
        <div className="ai-text-header__icon">
          <Icons.Type />
        </div>
        <div>
          <h4 className="ai-text-header__title">AI Title Generator</h4>
          <p className="ai-text-header__subtitle">Generate click-worthy text for your thumbnail</p>
        </div>
      </div>

      {/* Selected text indicator */}
      {selectedTextContent && (
        <div className="ai-text-selected">
          <span className="ai-text-selected__label">Selected text:</span>
          <span className="ai-text-selected__text">"{selectedTextContent}"</span>
          <button className="ai-text-btn-sm" onClick={handleRewrite} disabled={isGenerating}>
            <Icons.Refresh />
            Rewrite
          </button>
        </div>
      )}

      {/* Auto-Generate from Image */}
      {imageSource && (
        <button
          className="ai-text-generate-btn ai-text-generate-btn--image"
          onClick={handleGenerateFromImage}
          disabled={isGenerating}
        >
          {isGenerating && generationStep ? (
            <>
              <Icons.Loader />
              {generationStep}
            </>
          ) : (
            <>
              <Icons.Sparkles />
              Auto-Generate from Image
            </>
          )}
        </button>
      )}

      {imageSource && (
        <div className="ai-text-divider">
          <hr />
          <span>or describe manually</span>
          <hr />
        </div>
      )}

      {/* Prompt input */}
      <div className="ai-text-input-group">
        <label className="ai-text-label">Topic or Video Title</label>
        <textarea
          className="ai-text-textarea"
          placeholder="Describe your video topic or paste your title... (e.g., '10 AI tools that will blow your mind in 2026')"
          value={textPrompt}
          onChange={(e) => setTextPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
        />
      </div>

      {/* Context (optional) */}
      <div className="ai-text-input-group">
        <label className="ai-text-label">
          Context <span className="ai-text-label--optional">(optional)</span>
        </label>
        <input
          type="text"
          className="ai-text-input"
          placeholder="Target audience, niche, channel style..."
          value={textContext}
          onChange={(e) => setTextContext(e.target.value)}
        />
      </div>

      {/* Tone selector */}
      <div className="ai-text-input-group">
        <label className="ai-text-label">Tone</label>
        <div className="ai-text-tones">
          {TONE_PRESETS.map((tone) => (
            <Tooltip key={tone.id} content={tone.description}>
            <button
              className={`ai-text-tone ${textTone === tone.id ? 'ai-text-tone--active' : ''}`}
              onClick={() => setTextTone(tone.id)}
            >
              <span className="ai-text-tone__emoji">{tone.emoji}</span>
              <span className="ai-text-tone__label">{tone.label}</span>
            </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        className="ai-text-generate-btn"
        onClick={handleGenerate}
        disabled={isGenerating || (!textPrompt.trim() && !selectedTextContent)}
      >
        {isGenerating ? (
          <>
            <Icons.Loader />
            Generating...
          </>
        ) : (
          <>
            <Icons.Sparkles />
            Generate Titles
          </>
        )}
      </button>
      <p className="ai-text-hint">Press Ctrl+Enter to generate</p>

      {/* Error */}
      {error && (
        <div className="ai-text-error">
          {error}
        </div>
      )}

      {/* Results */}
      {suggestions.length > 0 && (
        <div className="ai-text-results">
          <div className="ai-text-results__header">
            <h5 className="ai-text-results__title">Suggestions</h5>
            <div className="ai-text-results__actions">
              <Tooltip content="Regenerate">
              <button className="ai-text-btn-sm" onClick={handleGenerate} disabled={isGenerating}>
                <Icons.Refresh />
              </button>
              </Tooltip>
              <Tooltip content="Clear suggestions">
              <button className="ai-text-btn-sm" onClick={clearSuggestions}>
                <Icons.Trash />
              </button>
              </Tooltip>
            </div>
          </div>

          <div className="ai-text-results__list">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`ai-text-card ${suggestion.applied ? 'ai-text-card--applied' : ''}`}
              >
                <div className="ai-text-card__header">
                  <span
                    className="ai-text-card__badge"
                    style={{ backgroundColor: STYLE_COLORS[suggestion.style] || '#6b7280' }}
                  >
                    {STYLE_LABELS[suggestion.style] || suggestion.style}
                  </span>
                  <span className="ai-text-card__score">
                    {Math.round(suggestion.score * 100)}%
                  </span>
                </div>

                <p className="ai-text-card__text">{suggestion.text}</p>

                <div className="ai-text-card__actions">
                  <button
                    className="ai-text-card__btn ai-text-card__btn--primary"
                    onClick={() => handleApply(suggestion)}
                    disabled={suggestion.applied}
                  >
                    {suggestion.applied ? (
                      <><Icons.Check /> Applied</>
                    ) : (
                      <><Icons.Plus /> Add to Canvas</>
                    )}
                  </button>
                  <button
                    className="ai-text-card__btn"
                    onClick={() => handleCopy(suggestion.text, suggestion.id)}
                  >
                    {copiedId === suggestion.id ? (
                      <><Icons.Check /> Copied</>
                    ) : (
                      <><Icons.Copy /> Copy</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {textHistory.length > 0 && (
        <div className="ai-text-history">
          <button
            className="ai-text-history__toggle"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? '− Hide' : '+ Show'} History ({textHistory.length})
          </button>

          {showHistory && (
            <div className="ai-text-history__list">
              {textHistory.map((batch, batchIdx) => (
                <div key={batchIdx} className="ai-text-history__batch">
                  {batch.map((item) => (
                    <button
                      key={item.id}
                      className="ai-text-history__item"
                      onClick={() => handleApply(item)}
                      title="Click to add to canvas"
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AITextGenerator;
