/**
 * ThumbnailActionBar - Reusable action bar for thumbnail results
 * 
 * Provides consistent save/edit/download/regenerate/recreateBetter actions
 * across all pages that display generated or processed images.
 */

import React, { useCallback, useState } from 'react';
import {
  Save,
  Pencil,
  Download,
  RefreshCw,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useImageActions } from '../../hooks/useImageActions';
import type {
  ThumbnailActionBarProps,
  ImageAction,
  ActionResult,
} from '../../types/image-actions.types';

// ============================================
// ACTION BUTTON CONFIG
// ============================================

interface ActionButtonConfig {
  id: ImageAction;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  color: string;
  hoverColor: string;
}

const ACTION_CONFIGS: ActionButtonConfig[] = [
  {
    id: 'save',
    icon: <Save className="w-4 h-4" />,
    label: 'Save',
    tooltip: 'Save to My Thumbnails',
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-500',
  },
  {
    id: 'edit',
    icon: <Pencil className="w-4 h-4" />,
    label: 'Edit',
    tooltip: 'Open in Editor',
    color: 'bg-slate-700',
    hoverColor: 'hover:bg-slate-600',
  },
  {
    id: 'download',
    icon: <Download className="w-4 h-4" />,
    label: 'Download',
    tooltip: 'Download image',
    color: 'bg-emerald-600',
    hoverColor: 'hover:bg-emerald-500',
  },
  {
    id: 'regenerate',
    icon: <RefreshCw className="w-4 h-4" />,
    label: 'Regenerate',
    tooltip: 'Generate again with same settings',
    color: 'bg-slate-700',
    hoverColor: 'hover:bg-slate-600',
  },
  {
    id: 'recreateBetter',
    icon: <Sparkles className="w-4 h-4" />,
    label: 'Recreate Better',
    tooltip: 'AI-analyze and improve this thumbnail',
    color: 'bg-gradient-to-r from-purple-600 to-pink-600',
    hoverColor: 'hover:from-purple-500 hover:to-pink-500',
  },
];

// ============================================
// COMPONENT
// ============================================

export const ThumbnailActionBar: React.FC<ThumbnailActionBarProps> = ({
  context,
  visibleActions = ['save', 'edit', 'download', 'regenerate', 'recreateBetter'],
  onActionComplete,
  variant = 'horizontal',
  className = '',
  disabled = false,
}) => {
  const {
    saveToLibrary,
    openInEditor,
    downloadImage,
    regenerate,
    startRecreateBetter,
    isLoading,
  } = useImageActions();

  const [successAction, setSuccessAction] = useState<ImageAction | null>(null);
  const [errorAction, setErrorAction] = useState<ImageAction | null>(null);

  // Show success indicator briefly
  const showSuccess = useCallback((action: ImageAction) => {
    setSuccessAction(action);
    setTimeout(() => setSuccessAction(null), 2000);
  }, []);

  // Show error indicator briefly
  const showError = useCallback((action: ImageAction) => {
    setErrorAction(action);
    setTimeout(() => setErrorAction(null), 3000);
  }, []);

  // Handle action completion
  const handleResult = useCallback((result: ActionResult) => {
    if (result.success) {
      showSuccess(result.action);
    } else {
      showError(result.action);
    }
    onActionComplete?.(result);
  }, [onActionComplete, showSuccess, showError]);

  // ============================================
  // ACTION HANDLERS
  // ============================================

  const handleSave = useCallback(async () => {
    const result = await saveToLibrary(context.imageUrl, {
      title: context.title,
      platform: context.platform,
    });
    handleResult(result);
  }, [context, saveToLibrary, handleResult]);

  const handleEdit = useCallback(() => {
    openInEditor(context.imageUrl, {
      initialImage: context.imageUrl,
      source: 'thumbnail-action-bar',
      prompt: context.sourceSettings?.prompt,
      style: context.sourceSettings?.style,
      analysisResult: context.analysisResult,
    });
    onActionComplete?.({ success: true, action: 'edit' });
  }, [context, openInEditor, onActionComplete]);

  const handleDownload = useCallback(() => {
    const filename = context.title
      ? `${context.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
      : undefined;
    downloadImage(context.imageUrl, filename);
    onActionComplete?.({ success: true, action: 'download' });
  }, [context, downloadImage, onActionComplete]);

  const handleRegenerate = useCallback(async () => {
    if (!context.sourceSettings) {
      handleResult({
        success: false,
        action: 'regenerate',
        error: 'No source settings available for regeneration',
      });
      return;
    }
    const result = await regenerate(context.sourceSettings);
    handleResult(result);
  }, [context.sourceSettings, regenerate, handleResult]);

  const handleRecreateBetter = useCallback(() => {
    startRecreateBetter(context.imageUrl, context.analysisResult);
    onActionComplete?.({ success: true, action: 'recreateBetter' });
  }, [context, startRecreateBetter, onActionComplete]);

  // Map action ID to handler
  const actionHandlers: Record<ImageAction, () => void | Promise<void>> = {
    save: handleSave,
    edit: handleEdit,
    download: handleDownload,
    regenerate: handleRegenerate,
    recreateBetter: handleRecreateBetter,
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderActionButton = (config: ActionButtonConfig) => {
    const isVisible = visibleActions.includes(config.id);
    if (!isVisible) return null;

    // Check if action is available
    const isAvailable = (() => {
      switch (config.id) {
        case 'regenerate':
          return !!context.sourceSettings?.prompt || !!context.sourceSettings?.toolType;
        default:
          return true;
      }
    })();

    if (!isAvailable) return null;

    const loading = isLoading[config.id];
    const success = successAction === config.id;
    const error = errorAction === config.id;
    const isDisabled = disabled || loading || Object.values(isLoading).some(v => v);

    // Determine button content
    let buttonIcon = config.icon;
    if (loading) {
      buttonIcon = <Loader2 className="w-4 h-4 animate-spin" />;
    } else if (success) {
      buttonIcon = <Check className="w-4 h-4 text-green-400" />;
    } else if (error) {
      buttonIcon = <AlertCircle className="w-4 h-4 text-red-400" />;
    }

    // Variant-specific styling
    const variantStyles = {
      horizontal: 'flex-row gap-2 px-4 py-2',
      vertical: 'flex-col gap-1 px-3 py-3 w-full',
      compact: 'flex-row gap-1.5 px-3 py-1.5 text-xs',
    };

    const buttonClasses = `
      flex items-center justify-center ${variantStyles[variant]}
      ${config.id === 'recreateBetter' ? config.color : `${config.color} ${config.hoverColor}`}
      text-white font-medium rounded-lg transition-all
      disabled:opacity-50 disabled:cursor-not-allowed
      ${success ? 'ring-2 ring-green-400' : ''}
      ${error ? 'ring-2 ring-red-400' : ''}
    `.trim();

    return (
      <button
        key={config.id}
        onClick={() => actionHandlers[config.id]()}
        disabled={isDisabled}
        className={buttonClasses}
        title={config.tooltip}
      >
        {buttonIcon}
        {variant !== 'compact' && (
          <span className={variant === 'vertical' ? 'text-xs' : 'text-sm'}>
            {config.label}
          </span>
        )}
      </button>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  const containerClasses = {
    horizontal: 'flex flex-wrap items-center gap-2',
    vertical: 'flex flex-col gap-2',
    compact: 'flex items-center gap-1',
  };

  return (
    <div className={`${containerClasses[variant]} ${className}`}>
      {ACTION_CONFIGS.map(renderActionButton)}
    </div>
  );
};

export default ThumbnailActionBar;
