import React, { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Info, Edit, Download, Trash2, ArrowRightLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatRelativeTime, formatFileSize } from '../../lib/formatters';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ImageMetadata {
  size?: number;
  width?: number;
  height?: number;
  type?: string;
  date?: string;
  platform?: string;
  prompt?: string;
}

export interface ImageActions {
  onEdit?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onMoveTo?: () => void;
}

export interface PreviewItem {
  imageUrl: string;
  title?: string;
}

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  metadata?: ImageMetadata;
  actions?: ImageActions;
  items?: PreviewItem[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  metadata,
  actions,
  items,
  currentIndex = 0,
  onNavigate,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  const hasNav = items && items.length > 1 && onNavigate;
  const canGoPrev = hasNav && currentIndex > 0;
  const canGoNext = hasNav && currentIndex < items.length - 1;

  const handlePrev = useCallback(() => {
    if (canGoPrev && onNavigate) onNavigate(currentIndex - 1);
  }, [canGoPrev, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (canGoNext && onNavigate) onNavigate(currentIndex + 1);
  }, [canGoNext, currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const hasMetadata = metadata && Object.values(metadata).some((v) => v != null);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          {/* Content wrapper */}
          <div className="relative flex flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            {/* Main image area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-3 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {title && (
                    <h2 className="text-sm font-medium text-white truncate max-w-md">
                      {title}
                    </h2>
                  )}
                  {hasNav && (
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {currentIndex + 1} / {items.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasMetadata && (
                    <button
                      onClick={() => setShowInfo(!showInfo)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        showInfo
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title="Toggle info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Image + nav arrows */}
              <div className="flex-1 flex items-center justify-center relative px-16 pb-16 min-h-0">
                {/* Left arrow */}
                {canGoPrev && (
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-white transition-colors z-10"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {/* Image */}
                <motion.img
                  key={imageUrl}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  src={imageUrl}
                  alt={title || 'Preview'}
                  className="max-w-full max-h-full object-contain rounded-lg select-none"
                  draggable={false}
                />

                {/* Right arrow */}
                {canGoNext && (
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-white transition-colors z-10"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Action bar */}
              {actions && Object.values(actions).some(Boolean) && (
                <div className="flex items-center justify-center gap-3 pb-4 px-4">
                  {actions.onEdit && (
                    <button
                      onClick={actions.onEdit}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {actions.onDownload && (
                    <button
                      onClick={actions.onDownload}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                  {actions.onMoveTo && (
                    <button
                      onClick={actions.onMoveTo}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Move to
                    </button>
                  )}
                  {actions.onDelete && (
                    <button
                      onClick={actions.onDelete}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Info sidebar */}
            <div
              className={`w-[300px] bg-[#0F172A] border-l border-slate-800 flex-shrink-0 overflow-y-auto transition-all duration-300 ${
                showInfo ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 w-0 border-0'
              }`}
            >
              <div className="p-5 space-y-5">
                <h3 className="text-sm font-semibold text-white">Details</h3>

                {title && (
                  <MetadataRow label="Name" value={title} />
                )}
                {metadata?.platform && (
                  <MetadataRow label="Platform" value={metadata.platform} />
                )}
                {metadata?.type && (
                  <MetadataRow label="Type" value={metadata.type} />
                )}
                {metadata?.size != null && (
                  <MetadataRow label="File size" value={formatFileSize(metadata.size)} />
                )}
                {metadata?.width != null && metadata?.height != null && (
                  <MetadataRow label="Dimensions" value={`${metadata.width} x ${metadata.height}`} />
                )}
                {metadata?.date && (
                  <MetadataRow label="Created" value={formatRelativeTime(metadata.date)} />
                )}
                {metadata?.prompt && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Prompt</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{metadata.prompt}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const MetadataRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
    <p className="text-sm text-slate-300">{value}</p>
  </div>
);

export default ImagePreviewModal;
