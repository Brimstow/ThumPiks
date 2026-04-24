/**
 * ThumbnailResultModal - Shows generated thumbnail result with action buttons
 * 
 * Used for:
 * - Landing page generation results
 * - Dashboard home generation results
 * - Anywhere a thumbnail is generated and needs user action
 */

import React, { useState, useCallback } from 'react';
import {
  X,
  Save,
  Pencil,
  Download,
  RefreshCw,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { useImageActions } from '../../hooks/useImageActions';
import { useSaveThumbnail } from '../../hooks/useSaveThumbnail';
import { useAuth } from '../../contexts/AuthContext';

// ============================================
// TYPES
// ============================================

export interface ThumbnailResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  thumbnailUrl: string;
  thumbnailId?: string;
  videoTitle?: string;
  creditCost?: number;
  onGenerateAnother?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const ThumbnailResultModal: React.FC<ThumbnailResultModalProps> = ({
  isOpen,
  onClose,
  thumbnailUrl,
  thumbnailId,
  videoTitle,
  creditCost = 1,
  onGenerateAnother,
}) => {
  const { openInEditor, downloadImage } = useImageActions();
  const { triggerSave, SaveModal } = useSaveThumbnail();
  const { isAuthenticated } = useAuth();
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSave = useCallback(async () => {
    if (!thumbnailUrl) return;
    
    triggerSave(thumbnailUrl, {
      title: videoTitle || 'Generated Thumbnail',
      source: 'landing-page-generation',
    });
  }, [thumbnailUrl, videoTitle, triggerSave]);

  const handleEdit = useCallback(() => {
    if (!thumbnailUrl) return;
    
    setIsNavigating(true);
    openInEditor(thumbnailUrl);
    onClose();
  }, [thumbnailUrl, openInEditor, onClose]);

  const handleDownload = useCallback(async () => {
    if (!thumbnailUrl) return;
    
    setIsDownloading(true);
    try {
      await downloadImage(thumbnailUrl, `thumbnail-${Date.now()}.png`);
    } finally {
      setIsDownloading(false);
    }
  }, [thumbnailUrl, downloadImage]);

  const handleGenerateAnother = useCallback(() => {
    onGenerateAnother?.();
    onClose();
  }, [onGenerateAnother, onClose]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0F172A] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your Thumbnail is Ready!</h2>
              <p className="text-xs text-slate-400">
                Generated successfully {creditCost > 0 && `• ${creditCost} credit used`}
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
          {/* Thumbnail Preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-blue-500/30 shadow-lg shadow-blue-500/10 mb-6">
            {thumbnailUrl ? (
              <img 
                src={thumbnailUrl} 
                alt="Generated thumbnail" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <ImageIcon className="w-16 h-16 text-slate-600" />
              </div>
            )}
            
            {/* Success Badge */}
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-green-500/90 rounded-full text-xs font-medium text-white flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              AI Generated
            </div>
          </div>

          {/* Video Title (if available) */}
          {videoTitle && (
            <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">From Video</p>
              <p className="text-sm text-slate-200 font-medium line-clamp-2">{videoTitle}</p>
            </div>
          )}

          {/* Credit Info */}
          <div className="flex items-center justify-between mb-6 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-slate-300">Credit deducted</span>
            </div>
            <span className="text-sm font-medium text-slate-200">-{creditCost}</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save to Library
                </button>

                <button
                  onClick={handleEdit}
                  disabled={isNavigating}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all disabled:opacity-50"
                >
                  {isNavigating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Pencil className="w-4 h-4" />
                  )}
                  Edit in Studio
                </button>
              </>
            ) : null}

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download
            </button>

            <button
              onClick={handleGenerateAnother}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Create Another
            </button>
          </div>

          {/* Not Authenticated CTA */}
          {!isAuthenticated && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-300 mb-1">
                    Want to save your thumbnails?
                  </p>
                  <p className="text-xs text-blue-400/80 mb-3">
                    Sign up to save to your library, edit, and generate more thumbnails.
                  </p>
                  <button
                    onClick={() => {
                      // Trigger signup flow - parent component handles this
                      onClose();
                      window.dispatchEvent(new CustomEvent('openSignupModal'));
                    }}
                    className="text-xs font-medium text-blue-300 hover:text-blue-200 underline"
                  >
                    Sign up now →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {SaveModal}
    </div>
  );
};

export default ThumbnailResultModal;
