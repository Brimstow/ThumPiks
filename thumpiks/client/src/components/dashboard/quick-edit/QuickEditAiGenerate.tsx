import React from 'react';
import { ArrowLeft, Sparkles, X, Loader2 } from 'lucide-react';
import Tooltip from '../../ui/Tooltip';
import { STYLE_PRESETS } from './constants';

interface QuickEditAiGenerateProps {
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  selectedStyle: string | null;
  setSelectedStyle: (style: string | null) => void;
  loading: boolean;
  onGenerate: () => void;
  onBack: () => void;
}

const QuickEditAiGenerate: React.FC<QuickEditAiGenerateProps> = ({
  aiPrompt,
  setAiPrompt,
  selectedStyle,
  setSelectedStyle,
  loading,
  onGenerate,
  onBack,
}) => (
  <div className="max-w-2xl mx-auto px-4 py-8">
    <button
      onClick={onBack}
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
                setSelectedStyle(null);
                setAiPrompt('');
              } else {
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
      onClick={onGenerate}
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

export default QuickEditAiGenerate;
