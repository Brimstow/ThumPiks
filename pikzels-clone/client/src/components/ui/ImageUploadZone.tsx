/**
 * ImageUploadZone — shared upload component (DRY)
 *
 * Consolidates the click-to-upload + drag-and-drop pattern that was previously
 * duplicated across DashboardHome, AIToolsPage, VisionToolPage, etc.
 *
 * Key design decisions (learned from the DashboardHome implementation that works):
 *   1. The hidden <input type="file"> is rendered unconditionally so the ref is
 *      always attached.
 *   2. The click trigger is a <button> element (not a <div>) for reliable
 *      programmatic .click() forwarding and keyboard accessibility.
 *   3. The input value is reset after every selection so re-selecting the same
 *      file still fires onChange.
 */

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Users } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface ImageUploadZoneProps {
  /** Called with a base64 data-URL when the user selects or drops an image. */
  onImageSelect: (dataUrl: string) => void;

  /** Currently loaded image (controls preview vs drop-zone display). */
  currentImage?: string | null;

  /** Called when the user clicks the remove / ✕ button on the preview. */
  onRemove?: () => void;

  /** Max file size in bytes. Defaults to 10 MB. */
  maxSizeBytes?: number;

  /** Accepted MIME types (passed to <input accept>). Defaults to "image/*". */
  accept?: string;

  /** Visual variant — controls size and placeholder copy. */
  variant?: 'default' | 'compact';

  /** Placeholder text shown inside the drop zone. */
  placeholder?: string;

  /** Secondary hint text below the placeholder. */
  hint?: string;

  /** Icon override (defaults to Upload icon; "face" shows Users icon). */
  icon?: 'upload' | 'face';

  /** Extra Tailwind classes on the outermost wrapper. */
  className?: string;

  /** Whether interaction is disabled. */
  disabled?: boolean;
}

// ============================================
// COMPONENT
// ============================================

const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  onImageSelect,
  currentImage = null,
  onRemove,
  maxSizeBytes = 10 * 1024 * 1024,
  accept = 'image/*',
  variant = 'default',
  placeholder,
  hint,
  icon = 'upload',
  className = '',
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ------- helpers -------

  const readFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > maxSizeBytes) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageSelect(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    },
    [maxSizeBytes, onImageSelect]
  );

  // ------- event handlers -------

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) readFile(file);
      // Reset so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    },
    [readFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [disabled, readFile]
  );

  // ------- size helpers -------

  const isCompact = variant === 'compact';
  const sizeClasses = isCompact ? 'w-32 h-32' : 'w-full aspect-video';
  const iconSize = isCompact ? 'w-6 h-6' : 'w-10 h-10';
  const IconComponent = icon === 'face' ? Users : Upload;

  const placeholderText =
    placeholder ?? (isCompact ? 'Upload' : 'Click to upload or drag and drop');
  const hintText = hint ?? (isCompact ? '' : 'PNG, JPG up to 10MB');

  // ------- render: preview -------

  if (currentImage) {
    const previewClasses = isCompact
      ? 'relative w-32 h-32 bg-slate-800 rounded-xl overflow-hidden'
      : 'relative aspect-video bg-slate-800 rounded-xl overflow-hidden';

    return (
      <div className={`${className}`}>
        {/* Hidden input is always in the DOM */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
        />
        <div className={previewClasses}>
          <img
            src={currentImage}
            alt="Uploaded"
            className={`w-full h-full ${isCompact ? 'object-cover' : 'object-contain'}`}
          />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className={`absolute ${isCompact ? 'top-1 right-1 p-1' : 'top-2 right-2 p-1.5'} bg-black/60 rounded-lg hover:bg-black/80 transition-colors`}
            >
              <X className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ------- render: drop zone -------

  const activeColor =
    icon === 'face'
      ? 'border-orange-500 bg-orange-500/10'
      : 'border-blue-500 bg-blue-500/10';

  const inactiveColor =
    'border-slate-700 hover:border-slate-600 hover:bg-slate-800/70';

  return (
    <div className={`${className}`}>
      {/* Hidden input is always in the DOM */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />

      <button
        type="button"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        className={`
          ${sizeClasses}
          bg-slate-800/50 border-2 border-dashed rounded-xl
          flex flex-col items-center justify-center gap-${isCompact ? '2' : '3'}
          transition-all cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isDragging ? activeColor : inactiveColor}
        `}
      >
        <IconComponent
          className={`${iconSize} ${
            isDragging
              ? icon === 'face'
                ? 'text-orange-400'
                : 'text-blue-400'
              : 'text-slate-500'
          }`}
        />
        <span
          className={`${isCompact ? 'text-xs' : 'text-sm'} ${
            isDragging
              ? icon === 'face'
                ? 'text-orange-300'
                : 'text-blue-300'
              : 'text-slate-400'
          }`}
        >
          {isDragging
            ? isCompact
              ? 'Drop here'
              : 'Drop your image here'
            : placeholderText}
        </span>
        {hintText && !isCompact && (
          <span className="text-xs text-slate-500">{hintText}</span>
        )}
      </button>
    </div>
  );
};

export default ImageUploadZone;
