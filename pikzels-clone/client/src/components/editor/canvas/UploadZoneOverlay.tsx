/**
 * UploadZoneOverlay Component
 *
 * HTML overlay rendered on top of the canvas that provides interactive
 * upload zones for composition template placeholder layers.
 *
 * Follows the same positioning pattern as the inline text editor in
 * CanvasEngine: positioned absolutely inside the `scale(zoom)` div,
 * using canvas-coordinate values for left/top/width/height.
 *
 * Each unfilled upload zone:
 * - Clickable (opens file picker)
 * - Accepts native file drag-and-drop from desktop
 * - Shows hover state with glow effect
 *
 * Each filled zone:
 * - Shows a clear button on hover to revert to placeholder
 */
import React, { useRef, useCallback, useState, memo } from 'react';
import type { Layer, ShapeLayer, ImageLayer, SlotMetadata } from '../types/editor.types';
import { isUploadZoneLayer, isFilledUploadZone } from '../types/editor.types';
import Tooltip from '../../ui/Tooltip';

// ============================================
// TOOLTIP HELPERS
// ============================================

/** Returns a human-friendly description of the slot's role */
function getRoleDescription(role: SlotMetadata['role']): string {
  switch (role) {
    case 'primary': return 'Main subject of your thumbnail';
    case 'secondary': return 'Supporting image element';
    case 'background': return 'Background image';
    case 'accent': return 'Decorative/accent element';
    case 'text': return 'Text overlay area';
    default: return 'Image slot';
  }
}

/** Builds tooltip content for an upload zone */
function getUploadZoneTooltip(meta: SlotMetadata, locked: boolean): React.ReactNode {
  if (locked) return 'This layer is locked. Unlock it to add an image.';
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <strong>{meta.label}</strong>
      <span style={{ opacity: 0.85 }}>{getRoleDescription(meta.role)}</span>
      <span style={{ opacity: 0.7, fontSize: 11 }}>Click to browse or drag a file here</span>
    </span>
  );
}

// ============================================
// PROPS
// ============================================

interface UploadZoneOverlayProps {
  layers: Layer[];
  onFillZone: (layerId: string, imageSrc: string, imageWidth: number, imageHeight: number) => void;
  onClearZone: (layerId: string) => void;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================
// UPLOAD ZONE ITEM (unfilled placeholder)
// ============================================

interface UploadZoneItemProps {
  layer: ShapeLayer & { slotMetadata: SlotMetadata };
  onFill: (layerId: string, imageSrc: string, imageWidth: number, imageHeight: number) => void;
}

const UploadZoneItem: React.FC<UploadZoneItemProps> = memo(({ layer, onFill }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_FILE_SIZE) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Get image dimensions via a temporary Image element
      const img = new Image();
      img.onload = () => {
        onFill(layer.id, dataUrl, img.naturalWidth, img.naturalHeight);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [layer.id, onFill]);

  const handleClick = useCallback(() => {
    if (layer.locked) return;
    fileInputRef.current?.click();
  }, [layer.locked]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!layer.locked) setIsDragOver(true);
  }, [layer.locked]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (layer.locked) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
      return;
    }

    // Also accept dropped URLs
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http') || url.startsWith('data:'))) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        onFill(layer.id, url, img.naturalWidth, img.naturalHeight);
      };
      img.src = url;
    }
  }, [layer.id, layer.locked, processFile, onFill]);

  const t = layer.transform;
  const meta = layer.slotMetadata;

  const tooltipContent = getUploadZoneTooltip(meta, layer.locked);

  return (
    <Tooltip content={tooltipContent} side="top" sideOffset={8} delayDuration={400}>
      <div
        style={{
          position: 'absolute',
          left: t.x,
          top: t.y,
          width: t.width,
          height: t.height,
          pointerEvents: layer.locked ? 'none' : 'auto',
          cursor: layer.locked ? 'not-allowed' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          borderRadius: 4,
          border: isDragOver
            ? '2.5px solid rgba(99, 102, 241, 0.9)'
            : isHovered
              ? '2px solid rgba(99, 102, 241, 0.6)'
              : '2px solid transparent',
          background: isDragOver
            ? 'rgba(99, 102, 241, 0.15)'
            : isHovered
              ? 'rgba(99, 102, 241, 0.08)'
              : 'transparent',
          transition: 'border-color 150ms ease, background 150ms ease, box-shadow 150ms ease',
          boxShadow: isDragOver
            ? '0 0 12px rgba(99, 102, 241, 0.4)'
            : isHovered
              ? '0 0 8px rgba(99, 102, 241, 0.2)'
              : 'none',
          boxSizing: 'border-box',
          zIndex: 30,
        }}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Camera icon */}
        <svg
          width={Math.min(32, t.width * 0.15)}
          height={Math.min(32, t.height * 0.15)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDragOver ? 'rgba(99, 102, 241, 0.9)' : 'rgba(255, 255, 255, 0.5)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 150ms ease' }}
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>

        {/* Label */}
        {t.height > 60 && (
          <span
            style={{
              color: isDragOver ? 'rgba(99, 102, 241, 0.9)' : 'rgba(255, 255, 255, 0.55)',
              fontSize: Math.min(14, Math.max(10, t.width * 0.04)),
              fontWeight: 500,
              textAlign: 'center',
              lineHeight: 1.2,
              transition: 'color 150ms ease',
              userSelect: 'none',
            }}
          >
            {meta.label}
          </span>
        )}

        {/* Instruction text */}
        {t.height > 100 && t.width > 120 && (
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.35)',
              fontSize: Math.min(11, Math.max(9, t.width * 0.03)),
              textAlign: 'center',
              userSelect: 'none',
            }}
          >
            {isDragOver ? 'Release to fill' : 'Click or drop image'}
          </span>
        )}

        {/* Required badge */}
        {meta.required && t.width > 80 && (
          <Tooltip content="This slot must be filled before exporting" side="right" delayDuration={300}>
            <span
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                padding: '1px 5px',
                background: 'rgba(239, 68, 68, 0.8)',
                borderRadius: 3,
                color: '#fff',
                fontSize: 9,
                fontWeight: 600,
                userSelect: 'none',
              }}
            >
              Required
            </span>
          </Tooltip>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </Tooltip>
  );
});

UploadZoneItem.displayName = 'UploadZoneItem';

// ============================================
// CLEAR BUTTON (filled zone with slotMetadata)
// ============================================

interface ClearButtonProps {
  layer: ImageLayer & { slotMetadata: SlotMetadata };
  onClear: (layerId: string) => void;
}

const ClearButton: React.FC<ClearButtonProps> = memo(({ layer, onClear }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const t = layer.transform;

  return (
    <div
      style={{
        position: 'absolute',
        left: t.x,
        top: t.y,
        width: t.width,
        height: t.height,
        pointerEvents: 'auto',
        zIndex: 29,
      }}
      onMouseEnter={() => setShowButton(true)}
      onMouseLeave={() => { setShowButton(false); setIsHovered(false); }}
    >
      {showButton && !layer.locked && (
        <Tooltip content={`Remove image from "${layer.slotMetadata.label}" and revert to empty slot`} side="left" sideOffset={6} delayDuration={300}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(layer.id); }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 22,
              height: 22,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isHovered ? 'rgba(239, 68, 68, 0.95)' : 'rgba(30, 30, 46, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              transition: 'background 150ms ease, transform 150ms ease',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
              zIndex: 31,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </Tooltip>
      )}
    </div>
  );
});

ClearButton.displayName = 'ClearButton';

// ============================================
// MAIN OVERLAY COMPONENT
// ============================================

const UploadZoneOverlayInner: React.FC<UploadZoneOverlayProps> = ({
  layers,
  onFillZone,
  onClearZone,
}) => {
  // Find all unfilled upload zone placeholders
  const uploadZones = layers.filter(isUploadZoneLayer);
  // Find all filled zones (images with slotMetadata that can be cleared)
  const filledZones = layers.filter(isFilledUploadZone);

  // Don't render anything if no zones exist
  if (uploadZones.length === 0 && filledZones.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
      }}
    >
      {uploadZones.map((layer) => (
        <UploadZoneItem
          key={layer.id}
          layer={layer}
          onFill={onFillZone}
        />
      ))}
      {filledZones.map((layer) => (
        <ClearButton
          key={`clear-${layer.id}`}
          layer={layer}
          onClear={onClearZone}
        />
      ))}
    </div>
  );
};

export const UploadZoneOverlay = memo(UploadZoneOverlayInner);
UploadZoneOverlay.displayName = 'UploadZoneOverlay';

export default UploadZoneOverlay;
