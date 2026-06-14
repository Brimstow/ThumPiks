import React from 'react';
import type { Layer, ImageLayer, TextLayer } from '../types/editor.types';
import { THUMBNAIL_FONTS, TEXT_COLOR_PRESETS, TEXT_STYLE_PRESETS } from '../../../constants/text-styles';

interface PropertiesPanelProps {
  selectedLayers: Layer[];
  onUpdateLayer: (layerId: string, updates: Partial<ImageLayer> | Partial<TextLayer> | Partial<Layer>) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedLayers, onUpdateLayer }) => {
  if (selectedLayers.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: 'var(--editor-text-muted)',
        fontSize: '12px',
      }}>
        Select a layer to view properties
      </div>
    );
  }

  return (
    <div>
      <div className="properties-section">
        <h4 className="properties-section__title">Transform</h4>
        {selectedLayers.map(layer => (
          <div key={layer.id}>
            <div className="properties-row">
              <span className="properties-label">X</span>
              <input
                type="number"
                className="properties-input"
                value={Math.round(layer.transform.x)}
                onChange={(e) => onUpdateLayer(layer.id, {
                  transform: { ...layer.transform, x: parseInt(e.target.value) || 0 }
                })}
              />
            </div>
            <div className="properties-row">
              <span className="properties-label">Y</span>
              <input
                type="number"
                className="properties-input"
                value={Math.round(layer.transform.y)}
                onChange={(e) => onUpdateLayer(layer.id, {
                  transform: { ...layer.transform, y: parseInt(e.target.value) || 0 }
                })}
              />
            </div>
            <div className="properties-row">
              <span className="properties-label">Width</span>
              <input
                type="number"
                className="properties-input"
                value={Math.round(layer.transform.width)}
                onChange={(e) => onUpdateLayer(layer.id, {
                  transform: { ...layer.transform, width: parseInt(e.target.value) || 1 }
                })}
              />
            </div>
            <div className="properties-row">
              <span className="properties-label">Height</span>
              <input
                type="number"
                className="properties-input"
                value={Math.round(layer.transform.height)}
                onChange={(e) => onUpdateLayer(layer.id, {
                  transform: { ...layer.transform, height: parseInt(e.target.value) || 1 }
                })}
              />
            </div>
            <div className="properties-row">
              <span className="properties-label">Rotation</span>
              <input
                type="number"
                className="properties-input"
                value={Math.round(layer.transform.rotation)}
                onChange={(e) => onUpdateLayer(layer.id, {
                  transform: { ...layer.transform, rotation: parseInt(e.target.value) || 0 }
                })}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Per-layer filters - only for image layers */}
      {selectedLayers.length === 1 && selectedLayers[0].type === 'image' && (
        <div className="properties-section">
          <h4 className="properties-section__title">Filters</h4>
          {(() => {
            const imgLayer = selectedLayers[0] as ImageLayer;
            const filters = imgLayer.filters || { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0 };
            return (
              <>
                <div className="properties-row">
                  <span className="properties-label">Brightness</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filters.brightness}
                    onChange={(e) => onUpdateLayer(imgLayer.id, {
                      filters: { ...filters, brightness: parseInt(e.target.value) }
                    } as Partial<ImageLayer>)}
                    className="properties-slider"
                  />
                  <span className="properties-value">{filters.brightness}%</span>
                </div>
                <div className="properties-row">
                  <span className="properties-label">Contrast</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filters.contrast}
                    onChange={(e) => onUpdateLayer(imgLayer.id, {
                      filters: { ...filters, contrast: parseInt(e.target.value) }
                    } as Partial<ImageLayer>)}
                    className="properties-slider"
                  />
                  <span className="properties-value">{filters.contrast}%</span>
                </div>
                <div className="properties-row">
                  <span className="properties-label">Saturation</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filters.saturation}
                    onChange={(e) => onUpdateLayer(imgLayer.id, {
                      filters: { ...filters, saturation: parseInt(e.target.value) }
                    } as Partial<ImageLayer>)}
                    className="properties-slider"
                  />
                  <span className="properties-value">{filters.saturation}%</span>
                </div>
                <div className="properties-row">
                  <span className="properties-label">Hue</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={filters.hue}
                    onChange={(e) => onUpdateLayer(imgLayer.id, {
                      filters: { ...filters, hue: parseInt(e.target.value) }
                    } as Partial<ImageLayer>)}
                    className="properties-slider"
                  />
                  <span className="properties-value">{filters.hue}°</span>
                </div>
                <div className="properties-row">
                  <span className="properties-label">Blur</span>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={filters.blur}
                    onChange={(e) => onUpdateLayer(imgLayer.id, {
                      filters: { ...filters, blur: parseInt(e.target.value) }
                    } as Partial<ImageLayer>)}
                    className="properties-slider"
                  />
                  <span className="properties-value">{filters.blur}px</span>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Per-layer text properties - only for text layers */}
      {selectedLayers.length === 1 && selectedLayers[0].type === 'text' && (
        <div className="properties-section">
          <h4 className="properties-section__title">Text</h4>
          {(() => {
            const textLayer = selectedLayers[0] as TextLayer;
            return (
              <>
                <div className="properties-row">
                  <span className="properties-label">Content</span>
                  <input
                    type="text"
                    className="properties-input"
                    value={textLayer.content}
                    onChange={(e) => onUpdateLayer(textLayer.id, {
                      content: e.target.value
                    } as Partial<TextLayer>)}
                  />
                </div>
                <div className="properties-row">
                  <span className="properties-label">Font</span>
                  <select
                    className="properties-input"
                    value={textLayer.fontFamily}
                    onChange={(e) => onUpdateLayer(textLayer.id, {
                      fontFamily: e.target.value
                    } as Partial<TextLayer>)}
                  >
                    {THUMBNAIL_FONTS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="properties-row">
                  <span className="properties-label">Size</span>
                  <input
                    type="number"
                    className="properties-input"
                    value={textLayer.fontSize}
                    min="8"
                    max="200"
                    onChange={(e) => onUpdateLayer(textLayer.id, {
                      fontSize: parseInt(e.target.value) || 16
                    } as Partial<TextLayer>)}
                  />
                </div>
                <div className="properties-row">
                  <span className="properties-label">Color</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <input
                      type="color"
                      value={textLayer.fill}
                      onChange={(e) => onUpdateLayer(textLayer.id, {
                        fill: e.target.value
                      } as Partial<TextLayer>)}
                      className="properties-color"
                    />
                    <div className="properties-color-presets">
                      {TEXT_COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          className={`properties-color-swatch ${textLayer.fill === c ? 'properties-color-swatch--active' : ''}`}
                          style={{ background: c }}
                          onClick={() => onUpdateLayer(textLayer.id, { fill: c } as Partial<TextLayer>)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="properties-row">
                  <span className="properties-label">Align</span>
                  <div className="properties-buttons">
                    {(['left', 'center', 'right'] as const).map(align => (
                      <button
                        key={align}
                        className={`properties-btn ${textLayer.textAlign === align ? 'properties-btn--active' : ''}`}
                        onClick={() => onUpdateLayer(textLayer.id, {
                          textAlign: align
                        } as Partial<TextLayer>)}
                      >
                        {align[0].toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="properties-row">
                  <span className="properties-label">Weight</span>
                  <select
                    className="properties-input"
                    value={textLayer.fontWeight}
                    onChange={(e) => onUpdateLayer(textLayer.id, {
                      fontWeight: parseInt(e.target.value)
                    } as Partial<TextLayer>)}
                  >
                    <option value="300">Light</option>
                    <option value="400">Normal</option>
                    <option value="500">Medium</option>
                    <option value="600">Semi Bold</option>
                    <option value="700">Bold</option>
                    <option value="800">Extra Bold</option>
                    <option value="900">Black</option>
                  </select>
                </div>

                {/* Stroke controls */}
                <div className="properties-row">
                  <span className="properties-label">Stroke</span>
                  <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={textLayer.stroke || '#000000'}
                      onChange={(e) => onUpdateLayer(textLayer.id, {
                        stroke: e.target.value,
                        strokeWidth: textLayer.strokeWidth || 2
                      } as Partial<TextLayer>)}
                      className="properties-color"
                      style={{ width: 28, height: 28 }}
                    />
                    <input
                      type="number"
                      className="properties-input"
                      value={textLayer.strokeWidth || 0}
                      min="0"
                      max="20"
                      step="1"
                      style={{ width: 60 }}
                      onChange={(e) => onUpdateLayer(textLayer.id, {
                        strokeWidth: parseInt(e.target.value) || 0
                      } as Partial<TextLayer>)}
                    />
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>px</span>
                  </div>
                </div>

                {/* Shadow toggle */}
                <div className="properties-row">
                  <span className="properties-label">Shadow</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!textLayer.textShadow}
                      onChange={(e) => onUpdateLayer(textLayer.id, {
                        textShadow: e.target.checked ? '3px 3px 6px rgba(0,0,0,0.8)' : ''
                      } as Partial<TextLayer>)}
                    />
                    <span style={{ fontSize: 11, color: '#d1d5db' }}>
                      {textLayer.textShadow ? 'On' : 'Off'}
                    </span>
                  </label>
                </div>

                {/* Background banner toggle */}
                <div className="properties-row">
                  <span className="properties-label">Banner</span>
                  <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!textLayer.backgroundColor}
                        onChange={(e) => onUpdateLayer(textLayer.id, {
                          backgroundColor: e.target.checked ? 'rgba(0,0,0,0.6)' : ''
                        } as Partial<TextLayer>)}
                      />
                      <span style={{ fontSize: 11, color: '#d1d5db' }}>
                        {textLayer.backgroundColor ? 'On' : 'Off'}
                      </span>
                    </label>
                    {textLayer.backgroundColor && (
                      <input
                        type="color"
                        value={textLayer.backgroundColor.startsWith('rgba') ? '#000000' : textLayer.backgroundColor}
                        onChange={(e) => onUpdateLayer(textLayer.id, {
                          backgroundColor: e.target.value
                        } as Partial<TextLayer>)}
                        className="properties-color"
                        style={{ width: 24, height: 24 }}
                      />
                    )}
                  </div>
                </div>

                {/* Style Presets */}
                <div style={{ marginTop: 8 }}>
                  <span className="properties-label" style={{ display: 'block', marginBottom: 6 }}>Presets</span>
                  <div className="style-presets-grid">
                    {TEXT_STYLE_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        className="style-preset-card"
                        onClick={() => onUpdateLayer(textLayer.id, {
                          fontFamily: preset.fontFamily,
                          fill: preset.fill,
                          stroke: preset.stroke,
                          strokeWidth: preset.strokeWidth,
                          textShadow: preset.textShadow,
                          backgroundColor: preset.backgroundColor,
                          fontWeight: 900,
                        } as Partial<TextLayer>)}
                        title={preset.label}
                      >
                        <span
                          className="style-preset-preview"
                          style={{
                            fontFamily: preset.fontFamily,
                            color: preset.fill,
                            WebkitTextStroke: preset.strokeWidth ? `${Math.min(preset.strokeWidth, 2)}px ${preset.stroke}` : undefined,
                            textShadow: preset.textShadow || undefined,
                            backgroundColor: preset.backgroundColor || undefined,
                            padding: preset.backgroundColor ? '2px 6px' : undefined,
                            borderRadius: preset.backgroundColor ? 3 : undefined,
                          }}
                        >
                          Aa
                        </span>
                        <span className="style-preset-label">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
