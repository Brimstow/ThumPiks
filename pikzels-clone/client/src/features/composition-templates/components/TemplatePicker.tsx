/**
 * TemplatePicker Component
 *
 * Visual grid of composition templates with category filtering,
 * search, and SVG wireframe previews.  When a template is selected,
 * it shows the slot drop-zones for filling.
 *
 * Designed for use in both Quick Edit and Advanced Editor.
 */

import React, { useState } from 'react';
import type {
  LayoutPreset,
  TemplateCategory,
} from '../types';
import './TemplatePicker.css';

// ============================================
// CATEGORY LABELS
// ============================================

const CATEGORY_OPTIONS: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'person-bg', label: 'Person + BG' },
  { value: 'split-screen', label: 'Split Screen' },
  { value: 'reaction', label: 'Reaction' },
  { value: 'collage', label: 'Collage' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'comparison', label: 'Comparison' },
];

// ============================================
// PROPS
// ============================================

interface TemplatePickerProps {
  templates: LayoutPreset[];
  selectedTemplateId: string | null;
  categoryFilter: TemplateCategory | 'all';
  searchQuery: string;
  onCategoryChange: (cat: TemplateCategory | 'all') => void;
  onSearchChange: (q: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onClearTemplate: () => void;
}

// ============================================
// COMPONENT
// ============================================

const TemplatePicker: React.FC<TemplatePickerProps> = ({
  templates,
  selectedTemplateId,
  categoryFilter,
  searchQuery,
  onCategoryChange,
  onSearchChange,
  onSelectTemplate,
  onClearTemplate,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="comp-picker">
      {/* Header */}
      <div className="comp-picker-header">
        <h3 className="comp-picker-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          Composition Templates
        </h3>
        {selectedTemplateId && (
          <button className="comp-picker-clear" onClick={onClearTemplate}>
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="comp-picker-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="comp-picker-search-input"
          placeholder="Search layouts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Category pills */}
      <div className="comp-picker-categories">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.value}
            className={`comp-picker-pill ${categoryFilter === cat.value ? 'comp-picker-pill--active' : ''}`}
            onClick={() => onCategoryChange(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="comp-picker-grid">
        {templates.length === 0 && (
          <div className="comp-picker-empty">No templates match your search.</div>
        )}
        {templates.map((tmpl) => (
          <button
            key={tmpl.id}
            className={`comp-picker-card ${selectedTemplateId === tmpl.id ? 'comp-picker-card--selected' : ''} ${hoveredId === tmpl.id ? 'comp-picker-card--hover' : ''}`}
            onClick={() => onSelectTemplate(tmpl.id)}
            onMouseEnter={() => setHoveredId(tmpl.id)}
            onMouseLeave={() => setHoveredId(null)}
            title={tmpl.description}
          >
            <div
              className="comp-picker-card-preview"
              dangerouslySetInnerHTML={{ __html: tmpl.wireframeSvg }}
            />
            <div className="comp-picker-card-info">
              <span className="comp-picker-card-name">{tmpl.name}</span>
              <span className="comp-picker-card-slots">
                {tmpl.slots.length} image{tmpl.slots.length !== 1 ? 's' : ''}
                {tmpl.textSlots.length > 0 && ` + ${tmpl.textSlots.length} text`}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplatePicker;
