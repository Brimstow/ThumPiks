import React from 'react';
import { Link2, Sparkles, UploadCloud } from 'lucide-react';
import type { ViewState } from './types';

interface QuickEditStartScreenProps {
  onNavigate: (view: ViewState) => void;
}

const QuickEditStartScreen: React.FC<QuickEditStartScreenProps> = ({ onNavigate }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
    <div className="text-center mb-10">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
        Create a Thumbnail
      </h1>
      <p className="text-gray-400 text-base sm:text-lg">
        Pick how you want to start — it only takes a minute.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
      {/* Paste URL */}
      <button
        onClick={() => onNavigate('url-input')}
        className="group flex flex-col items-center gap-4 p-5 sm:p-8 rounded-2xl
                   bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/50
                   hover:bg-gray-800 transition-all duration-200 cursor-pointer"
      >
        <div
          className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center
                        group-hover:bg-purple-500/20 transition-colors"
        >
          <Link2 className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Paste a Link</h3>
          <p className="text-gray-400 text-sm mt-1">YouTube, TikTok, etc.</p>
        </div>
      </button>

      {/* AI Generate */}
      <button
        onClick={() => onNavigate('ai-generate')}
        className="group flex flex-col items-center gap-4 p-5 sm:p-8 rounded-2xl
                   bg-gray-800/50 border border-gray-700/50 hover:border-amber-500/50
                   hover:bg-gray-800 transition-all duration-200 cursor-pointer"
      >
        <div
          className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center
                        group-hover:bg-amber-500/20 transition-colors"
        >
          <Sparkles className="w-8 h-8 text-amber-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">AI Generate</h3>
          <p className="text-gray-400 text-sm mt-1">Describe what you want</p>
        </div>
      </button>

      {/* Upload Image */}
      <button
        onClick={() => onNavigate('upload')}
        className="group flex flex-col items-center gap-4 p-5 sm:p-8 rounded-2xl
                   bg-gray-800/50 border border-gray-700/50 hover:border-emerald-500/50
                   hover:bg-gray-800 transition-all duration-200 cursor-pointer"
      >
        <div
          className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center
                        group-hover:bg-emerald-500/20 transition-colors"
        >
          <UploadCloud className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Upload Image</h3>
          <p className="text-gray-400 text-sm mt-1">JPG, PNG up to 10MB</p>
        </div>
      </button>
    </div>
  </div>
);

export default QuickEditStartScreen;
