/**
 * SlotEditor Component
 *
 * Shows the drop-zones for a selected composition template.
 * Users can click a slot to upload/select an image, or drag & drop.
 * Also renders text slot inputs for inline editing.
 */

import React, { useRef } from 'react';
import type {
  LayoutPreset,
  CompositionState,
  CompositionSlot,
  CompositionTextSlot,
} from '../types';
import './SlotEditor.css';

// ============================================
// PROPS
// ============================================

interface SlotEditorProps {
  template: LayoutPreset;
  compositionState: CompositionState;
  onFillSlot: (slotId: string, imageUrl: string) => void;
  onClearSlot: (slotId: string) => void;
  onFillTextSlot: (slotId: string, content: string) => void;
  onClearTextSlot: (slotId: string) => void;
  /** Optional: existing images the user can pick from (face photo, result, etc.) */
  availableImages?: { label: string; url: string }[];
}

// ============================================
// COMPONENT
// ============================================

const SlotEditor: React.FC<SlotEditorProps> = ({
  template,
  compositionState,
  onFillSlot,
  onClearSlot,
  onFillTextSlot,
  onClearTextSlot,
  availableImages = [],
}) => {
  const fillMap = new Map(compositionState.slotFills.map(f => [f.slotId, f]));
  const textFillMap = new Map(compositionState.textFills.map(f => [f.slotId, f]));

  return (
    <div className="slot-editor">
      {/* Template name */}
      <div className="slot-editor-header">
        <span className="slot-editor-template-name">{template.name}</span>
        <span className="slot-editor-template-desc">{template.description}</span>
      </div>

      {/* Visual wireframe preview */}
      <div className="slot-editor-wireframe">
        <div
          className="slot-editor-wireframe-svg"
          dangerouslySetInnerHTML={{ __html: template.wireframeSvg }}
        />
      </div>

      {/* Image slots */}
      <div className="slot-editor-section-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        Image Slots
      </div>

      <div className="slot-editor-slots">
        {template.slots.map((slot) => (
          <ImageSlotItem
            key={slot.id}
            slot={slot}
            fill={fillMap.get(slot.id)?.imageUrl || null}
            onFill={(url) => onFillSlot(slot.id, url)}
            onClear={() => onClearSlot(slot.id)}
            availableImages={availableImages}
          />
        ))}
      </div>

      {/* Text slots */}
      {template.textSlots.length > 0 && (
        <>
          <div className="slot-editor-section-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
            Text Slots
          </div>
          <div className="slot-editor-text-slots">
            {template.textSlots.map((ts) => (
              <TextSlotItem
                key={ts.id}
                textSlot={ts}
                value={textFillMap.get(ts.id)?.content || ''}
                onFill={(content) => onFillTextSlot(ts.id, content)}
                onClear={() => onClearTextSlot(ts.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// IMAGE SLOT ITEM
// ============================================

interface ImageSlotItemProps {
  slot: CompositionSlot;
  fill: string | null;
  onFill: (imageUrl: string) => void;
  onClear: () => void;
  availableImages: { label: string; url: string }[];
}

const ImageSlotItem: React.FC<ImageSlotItemProps> = ({
  slot,
  fill,
  onFill,
  onClear,
  availableImages,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onFill(reader.result);
      }
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onFill(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }

    // Check for URL data
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http') || url.startsWith('data:'))) {
      onFill(url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={`slot-item ${fill ? 'slot-item--filled' : ''}`}>
      <div className="slot-item-header">
        <span className="slot-item-label">{slot.label}</span>
        <div className="slot-item-badges">
          {slot.required && <span className="slot-item-badge slot-item-badge--required">Required</span>}
          {slot.autoRemoveBg && <span className="slot-item-badge slot-item-badge--ai">Auto Remove BG</span>}
          {slot.blendMode !== 'normal' && (
            <span className="slot-item-badge">{slot.blendMode}</span>
          )}
        </div>
      </div>

      {fill ? (
        <div className="slot-item-preview">
          <img src={fill} alt={slot.label} className="slot-item-preview-img" />
          <div className="slot-item-preview-actions">
            <button className="slot-item-btn" onClick={() => fileInputRef.current?.click()}>
              Replace
            </button>
            <button className="slot-item-btn slot-item-btn--danger" onClick={onClear}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className="slot-item-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Drop image or click to upload</span>
        </div>
      )}

      {/* Quick-fill from available images */}
      {!fill && availableImages.length > 0 && (
        <div className="slot-item-quickfill">
          <span className="slot-item-quickfill-label">Quick fill:</span>
          {availableImages.map((img, i) => (
            <button
              key={i}
              className="slot-item-quickfill-btn"
              onClick={() => onFill(img.url)}
              title={img.label}
            >
              <img src={img.url} alt={img.label} className="slot-item-quickfill-thumb" />
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  );
};

// ============================================
// TEXT SLOT ITEM
// ============================================

interface TextSlotItemProps {
  textSlot: CompositionTextSlot;
  value: string;
  onFill: (content: string) => void;
  onClear: () => void;
}

const TextSlotItem: React.FC<TextSlotItemProps> = ({
  textSlot,
  value,
  onFill,
  onClear,
}) => {
  return (
    <div className="text-slot-item">
      <div className="text-slot-item-header">
        <span className="text-slot-item-label">{textSlot.label}</span>
        {value && (
          <button className="slot-item-btn slot-item-btn--small" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      <input
        type="text"
        className="text-slot-item-input"
        placeholder={textSlot.placeholder}
        value={value}
        onChange={(e) => onFill(e.target.value)}
        style={{
          fontFamily: textSlot.defaultStyle.fontFamily,
          fontWeight: textSlot.defaultStyle.fontWeight,
          textTransform: textSlot.defaultStyle.textTransform || 'none',
        }}
      />
    </div>
  );
};

export default SlotEditor;
