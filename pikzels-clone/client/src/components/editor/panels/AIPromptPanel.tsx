import React, { useState } from 'react';
import type { AIPrompt, AIGenerationResult } from '../types/editor.types';

interface AIPromptPanelProps {
  onGenerate: (prompt: AIPrompt) => void;
  history: AIGenerationResult[];
  isGenerating: boolean;
  onSelectResult: (result: AIGenerationResult) => void;
}

const Icons = {
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
};

const stylePresets = [
  { id: 'cinematic', label: 'Cinematic', description: 'Movie poster quality with dramatic lighting' },
  { id: 'minimalist', label: 'Minimalist', description: 'Clean and simple design' },
  { id: 'bold', label: 'Bold & Vibrant', description: 'Eye-catching with strong colors' },
  { id: 'professional', label: 'Professional', description: 'Corporate and polished look' },
  { id: 'creative', label: 'Creative', description: 'Artistic and unique style' },
  { id: 'gaming', label: 'Gaming', description: 'High-energy gaming aesthetic' },
];

const aspectRatios: { value: AIPrompt['aspectRatio']; label: string }[] = [
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '9:16', label: '9:16 (Shorts)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3 (Standard)' },
];

const AIPromptPanel: React.FC<AIPromptPanelProps> = ({
  onGenerate,
  history,
  isGenerating,
  onSelectResult,
}) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState<AIPrompt['aspectRatio']>('16:9');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [steps, setSteps] = useState(30);
  const [guidance, setGuidance] = useState(7.5);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;

    onGenerate({
      id: `${Date.now()}`,
      text: prompt,
      style,
      negativePrompt: negativePrompt || undefined,
      steps,
      guidance,
      aspectRatio,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleGenerate();
    }
  };

  return (
    <div className="ai-panel">
      {/* Prompt input */}
      <div className="ai-panel__prompt">
        <textarea
          className="ai-panel__textarea"
          placeholder="Describe your thumbnail... (e.g., 'A futuristic cityscape at sunset with neon lights and flying cars')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Style & options */}
      <div className="ai-panel__options">
        {/* Style selection */}
        <div className="ai-panel__option">
          <label className="ai-panel__label">Style</label>
          <select
            className="ai-panel__select"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            {stylePresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* Aspect ratio */}
        <div className="ai-panel__option">
          <label className="ai-panel__label">Aspect Ratio</label>
          <select
            className="ai-panel__select"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AIPrompt['aspectRatio'])}
          >
            {aspectRatios.map((ar) => (
              <option key={ar.value} value={ar.value}>
                {ar.label}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--editor-accent)',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '8px 0',
            textAlign: 'left',
          }}
        >
          {showAdvanced ? '− Hide' : '+ Show'} Advanced Options
        </button>

        {/* Advanced options */}
        {showAdvanced && (
          <>
            <div className="ai-panel__option">
              <label className="ai-panel__label">Negative Prompt</label>
              <textarea
                className="ai-panel__textarea"
                style={{ minHeight: '60px' }}
                placeholder="What to avoid... (e.g., 'blurry, low quality, distorted')"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
              />
            </div>

            <div className="ai-panel__option">
              <label className="ai-panel__label">Steps: {steps}</label>
              <input
                type="range"
                min={10}
                max={50}
                value={steps}
                onChange={(e) => setSteps(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div className="ai-panel__option">
              <label className="ai-panel__label">Guidance: {guidance}</label>
              <input
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={guidance}
                onChange={(e) => setGuidance(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </div>

      {/* Generate button */}
      <div className="ai-panel__actions">
        <button
          className="ai-panel__generate"
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="editor-spinner" />
              Generating...
            </>
          ) : (
            <>
              <Icons.Sparkles />
              Generate Thumbnail
            </>
          )}
        </button>
        <p style={{
          marginTop: '8px',
          fontSize: '10px',
          color: 'var(--editor-text-muted)',
          textAlign: 'center',
        }}>
          Press Ctrl+Enter to generate
        </p>
      </div>

      {/* Generation history */}
      {history.length > 0 && (
        <div className="ai-panel__history">
          <h4 className="ai-panel__history-title">Recent Generations</h4>
          <div className="ai-history-grid">
            {history.map((result) => (
              <div
                key={result.id}
                className="ai-history-item"
                onClick={() => result.status === 'completed' && onSelectResult(result)}
              >
                {result.status === 'completed' ? (
                  <>
                    <img src={result.imageUrl} alt={result.prompt.text} />
                    <div className="ai-history-item__overlay">
                      <p className="ai-history-item__prompt">{result.prompt.text}</p>
                    </div>
                  </>
                ) : result.status === 'generating' ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    background: 'var(--editor-bg-dark)',
                  }}>
                    <span className="editor-spinner" />
                  </div>
                ) : result.status === 'failed' ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    background: 'var(--editor-bg-dark)',
                    color: 'var(--editor-danger)',
                    fontSize: '10px',
                    padding: '8px',
                    textAlign: 'center',
                  }}>
                    Failed to generate
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPromptPanel;
