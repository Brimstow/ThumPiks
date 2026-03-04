/**
 * AdjustmentsPanel - UI for image adjustments, filters, and watermark
 * Migrated from ThumbnailEditor.tsx for the unified editor
 */
import React, { useState } from 'react';
import type { AdjustmentState, WatermarkState } from '../types/editor.types';
import { getDisclosurePref, setDisclosurePref } from '../../ui/CollapsibleSection';
import { useEditorMode } from '../../../features/editor-mode';

interface AdjustmentsPanelProps {
  adjustments: AdjustmentState;
  onChange: (updates: Partial<AdjustmentState>) => void;
}

type PanelSection = 'adjust' | 'transform' | 'filters' | 'watermark';

const AdjustmentsPanel: React.FC<AdjustmentsPanelProps> = ({ adjustments, onChange }) => {
  const [activeSection, setActiveSection] = useState<PanelSection>('adjust');
  
  // Editor mode - hide advanced adjustments in Simple mode
  const { isSimpleMode } = useEditorMode();

  // Progressive disclosure: advanced adjustments collapsed by default
  const [advAdjustOpen, setAdvAdjustOpen] = useState(() => getDisclosurePref('editor.adjustAdvanced'));
  const toggleAdvAdjust = () => {
    setAdvAdjustOpen((prev) => {
      const next = !prev;
      setDisclosurePref('editor.adjustAdvanced', next);
      return next;
    });
  };

  // Update watermark helper
  const updateWatermark = (updates: Partial<WatermarkState>) => {
    onChange({
      watermark: {
        enabled: adjustments.watermark?.enabled ?? false,
        type: adjustments.watermark?.type ?? 'text',
        content: adjustments.watermark?.content ?? '',
        position: adjustments.watermark?.position ?? 'bottom-right',
        opacity: adjustments.watermark?.opacity ?? 50,
        size: adjustments.watermark?.size ?? 20,
        ...updates,
      },
    });
  };

  return (
    <div className="adjustments-panel">
      {/* Section tabs */}
      <div className="properties-row" style={{ marginBottom: 'var(--editor-space-md)', flexWrap: 'wrap', gap: 4 }}>
        {(['adjust', 'transform', 'filters', 'watermark'] as PanelSection[]).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`tool-button${activeSection === section ? ' tool-button--active' : ''}`}
            style={{ flex: 1, minWidth: 70, height: 28, fontSize: 11, textTransform: 'capitalize' }}
          >
            {section}
          </button>
        ))}
      </div>

      {/* ADJUST SECTION */}
      {activeSection === 'adjust' && (
        <div className="properties-section">
          <div className="properties-section__title">Adjustments</div>
          
          {/* Brightness */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="properties-label" style={{ flex: 'none' }}>Brightness</span>
              <span style={{ fontSize: 11, color: 'var(--editor-text-muted)' }}>{adjustments.brightness}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={adjustments.brightness}
              onChange={(e) => onChange({ brightness: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--editor-accent)', cursor: 'pointer' }}
            />
          </div>

          {/* Contrast */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="properties-label" style={{ flex: 'none' }}>Contrast</span>
              <span style={{ fontSize: 11, color: 'var(--editor-text-muted)' }}>{adjustments.contrast}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={adjustments.contrast}
              onChange={(e) => onChange({ contrast: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--editor-accent)', cursor: 'pointer' }}
            />
          </div>

          {/* Saturation */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="properties-label" style={{ flex: 'none' }}>Saturation</span>
              <span style={{ fontSize: 11, color: 'var(--editor-text-muted)' }}>{adjustments.saturation}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={adjustments.saturation}
              onChange={(e) => onChange({ saturation: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--editor-accent)', cursor: 'pointer' }}
            />
          </div>

          {/* Advanced toggle — progressive disclosure (hidden in Simple mode) */}
          {!isSimpleMode && (
            <>
              <button
                onClick={toggleAdvAdjust}
                aria-expanded={advAdjustOpen}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '6px 0', border: 'none', background: 'transparent',
                  color: 'var(--editor-text-tertiary)', fontSize: 11, cursor: 'pointer',
                  marginTop: 'var(--editor-space-sm)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: 12, height: 12, transition: 'transform 200ms', transform: advAdjustOpen ? 'rotate(90deg)' : 'rotate(0)' }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span>Advanced</span>
                {(adjustments.hue !== 0 || adjustments.blur !== 0 || adjustments.sharpenEnabled) && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', marginLeft: 'auto' }} />
                )}
              </button>

              {/* Advanced adjustments — collapsible */}
              <div style={{
                maxHeight: advAdjustOpen ? '400px' : '0px',
                overflow: 'hidden', opacity: advAdjustOpen ? 1 : 0,
                transition: 'max-height 200ms ease-out, opacity 200ms ease-out',
              }}>
                {/* Hue */}
                <div style={{ marginBottom: 10, marginTop: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="properties-label" style={{ flex: 'none' }}>Hue</span>
                    <span style={{ fontSize: 11, color: 'var(--editor-text-muted)' }}>{adjustments.hue}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={adjustments.hue}
                    onChange={(e) => onChange({ hue: parseInt(e.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--editor-accent)', cursor: 'pointer' }}
                  />
                </div>

                {/* Blur */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="properties-label" style={{ flex: 'none' }}>Blur</span>
                    <span style={{ fontSize: 11, color: 'var(--editor-text-muted)' }}>{adjustments.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={adjustments.blur}
                    onChange={(e) => onChange({ blur: parseInt(e.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--editor-accent)', cursor: 'pointer' }}
                  />
                </div>

                {/* Sharpen (using SVG filter presets) */}
                <div className="properties-section__title" style={{ marginTop: 'var(--editor-space-md)' }}>Sharpen</div>
                <div className="properties-row">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--editor-text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={adjustments.sharpenEnabled}
                      onChange={(e) => onChange({ sharpenEnabled: e.target.checked })}
                      style={{ accentColor: 'var(--editor-accent)' }}
                    />
                    Enable Sharpen
                  </label>
                </div>
                {adjustments.sharpenEnabled && (
                  <div className="properties-row">
                    <span className="properties-label">Strength</span>
                    <select
                      value={adjustments.sharpenStrength}
                      onChange={(e) => onChange({ sharpenStrength: e.target.value as 'light' | 'medium' | 'strong' })}
                      className="properties-input"
                      style={{ flex: 1 }}
                    >
                      <option value="light">Light</option>
                      <option value="medium">Medium</option>
                      <option value="strong">Strong</option>
                    </select>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TRANSFORM SECTION */}
      {activeSection === 'transform' && (
        <div className="properties-section">
          <div className="properties-section__title">Transform</div>
          
          {/* Rotation */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="properties-label" style={{ flex: 'none' }}>Rotation</span>
              <span style={{ fontSize: 11, color: 'var(--editor-text-muted)' }}>{adjustments.rotation}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={adjustments.rotation}
              onChange={(e) => onChange({ rotation: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--editor-accent)', cursor: 'pointer' }}
            />
          </div>

          {/* Flip buttons */}
          <div className="properties-row">
            <button
              onClick={() => onChange({ flipHorizontal: !adjustments.flipHorizontal })}
              className="tool-button"
              style={{
                flex: 1,
                height: 32,
                fontSize: 11,
                background: adjustments.flipHorizontal ? 'var(--editor-accent-subtle)' : undefined,
                color: adjustments.flipHorizontal ? 'var(--editor-accent)' : undefined,
              }}
            >
              Flip Horizontal
            </button>
            <button
              onClick={() => onChange({ flipVertical: !adjustments.flipVertical })}
              className="tool-button"
              style={{
                flex: 1,
                height: 32,
                fontSize: 11,
                background: adjustments.flipVertical ? 'var(--editor-accent-subtle)' : undefined,
                color: adjustments.flipVertical ? 'var(--editor-accent)' : undefined,
              }}
            >
              Flip Vertical
            </button>
          </div>

          {/* Reset transform */}
          <button
            onClick={() => onChange({ rotation: 0, flipHorizontal: false, flipVertical: false })}
            className="tool-button"
            style={{ width: '100%', height: 32, fontSize: 11, marginTop: 'var(--editor-space-sm)' }}
          >
            Reset Transform
          </button>
        </div>
      )}

      {/* FILTERS SECTION */}
      {activeSection === 'filters' && (
        <div className="properties-section">
          <div className="properties-section__title">Filters</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {['none', 'vintage', 'blackwhite', 'sepia', 'vibrant', 'cool', 'warm'].map((filter) => (
              <button
                key={filter}
                onClick={() => onChange({ filter })}
                className={`tool-button${adjustments.filter === filter ? ' tool-button--active' : ''}`}
                style={{ width: '100%', height: 32, fontSize: 11, textTransform: 'capitalize' }}
              >
                {filter === 'blackwhite' ? 'B&W' : filter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WATERMARK SECTION */}
      {activeSection === 'watermark' && (
        <div className="properties-section">
          <div className="properties-section__title">Watermark</div>
          
          {/* Enable toggle */}
          <div className="properties-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--editor-text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={adjustments.watermark?.enabled ?? false}
                onChange={(e) => updateWatermark({ enabled: e.target.checked })}
                style={{ accentColor: 'var(--editor-accent)' }}
              />
              Enable Watermark
            </label>
          </div>

          {adjustments.watermark?.enabled && (
            <>
              {/* Type selector */}
              <div className="properties-row">
                {(['text', 'image'] as const).map((t) => (
                  <label
                    key={t}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: 'var(--editor-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="wmType"
                      checked={adjustments.watermark?.type === t}
                      onChange={() => updateWatermark({ type: t })}
                      style={{ accentColor: 'var(--editor-accent)' }}
                    />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </label>
                ))}
              </div>

              {/* Content input */}
              <div className="properties-row">
                <span className="properties-label">
                  {adjustments.watermark?.type === 'text' ? 'Text' : 'URL'}
                </span>
                <input
                  type="text"
                  value={adjustments.watermark?.content ?? ''}
                  onChange={(e) => updateWatermark({ content: e.target.value })}
                  placeholder={adjustments.watermark?.type === 'text' ? 'Your watermark text' : 'https://...'}
                  className="properties-input"
                  style={{ flex: 1 }}
                />
              </div>

              {/* Position */}
              <div className="properties-row">
                <span className="properties-label">Position</span>
                <select
                  value={adjustments.watermark?.position ?? 'bottom-right'}
                  onChange={(e) => updateWatermark({ position: e.target.value as WatermarkState['position'] })}
                  className="properties-input"
                  style={{ flex: 1 }}
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="center">Center</option>
                </select>
              </div>

              {/* Opacity */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="properties-label" style={{ flex: 'none' }}>Opacity</span>
                  <span style={{ fontSize: 11, color: 'var(--editor-text-muted)' }}>
                    {adjustments.watermark?.opacity ?? 50}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={adjustments.watermark?.opacity ?? 50}
                  onChange={(e) => updateWatermark({ opacity: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--editor-accent)', cursor: 'pointer' }}
                />
              </div>

              {/* Size */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="properties-label" style={{ flex: 'none' }}>Size</span>
                  <span style={{ fontSize: 11, color: 'var(--editor-text-muted)' }}>
                    {adjustments.watermark?.size ?? 20}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={adjustments.watermark?.size ?? 20}
                  onChange={(e) => updateWatermark({ size: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--editor-accent)', cursor: 'pointer' }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(AdjustmentsPanel);
