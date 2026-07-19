import React, { useState } from 'react';
import type { Layer, LayerType, BlendMode, Selection } from '../types/editor.types';
import { getDisclosurePref, setDisclosurePref } from '../../ui/CollapsibleSection';
import { useEditorMode } from '../../../features/editor-mode';
import { LayerSortableList, SortableLayerItem, DragInstructions, LayerDragHandle } from '../../../features/drag-drop';

interface LayersPanelProps {
  layers: Layer[];
  layerOrder: string[];
  selection: Selection;
  onLayerSelect: (layerId: string, multi?: boolean) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerLockToggle: (layerId: string) => void;
  onLayerReorder: (fromIndex: number, toIndex: number) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onAddLayer: (type: LayerType) => void;
  onGroupLayers: () => void;
  onMergeLayers: () => void;
}

// Icons
const Icons = {
  Eye: ({ visible }: { visible: boolean }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {visible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  ),
  Lock: ({ locked }: { locked: boolean }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {locked ? (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
      ) : (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </>
      )}
    </svg>
  ),
  Image: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  Type: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  Shape: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
    </svg>
  ),
  Folder: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Adjustment: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Drawing: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Group: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Merge: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  ),
};

const getLayerIcon = (type: LayerType) => {
  switch (type) {
    case 'image': return <Icons.Image />;
    case 'text': return <Icons.Type />;
    case 'shape': return <Icons.Shape />;
    case 'group': return <Icons.Folder />;
    case 'adjustment': return <Icons.Adjustment />;
    case 'drawing': return <Icons.Drawing />;
    default: return <Icons.Shape />;
  }
};

const blendModes: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];

const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  layerOrder,
  selection,
  onLayerSelect,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  onLayerReorder,
  onLayerDelete,
  onLayerDuplicate,
  onLayerUpdate,
  onAddLayer,
  onGroupLayers,
  onMergeLayers,
}) => {
  const [selectedBlendMode, setSelectedBlendMode] = useState<BlendMode>('normal');
  const [selectedOpacity, setSelectedOpacity] = useState(100);
  
  // Editor mode - hide blend mode controls in Simple mode
  const { isSimpleMode } = useEditorMode();

  // Get layers in render order (reversed for display - top layer first)
  const orderedLayers = [...layerOrder]
    .reverse()
    .map(id => layers.find(l => l.id === id))
    .filter(Boolean) as Layer[];

  const selectedLayer = layers.find(l => selection.layerIds.includes(l.id));

  // Update blend mode / opacity when selection changes
  // Use primitive values as dependencies to avoid firing on every render
  // (selectedLayer is a new object reference each render since layers array is new)
  const selectedBlendModeValue = selectedLayer?.blendMode;
  const selectedOpacityValue = selectedLayer?.opacity;
  
  React.useEffect(() => {
    if (selectedBlendModeValue !== undefined) {
      setSelectedBlendMode(selectedBlendModeValue);
    }
    if (selectedOpacityValue !== undefined) {
      setSelectedOpacity(selectedOpacityValue);
    }
  }, [selectedBlendModeValue, selectedOpacityValue]);

  const handleBlendModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const blendMode = e.target.value as BlendMode;
    setSelectedBlendMode(blendMode);
    selection.layerIds.forEach(id => {
      onLayerUpdate(id, { blendMode });
    });
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseInt(e.target.value, 10);
    setSelectedOpacity(opacity);
    selection.layerIds.forEach(id => {
      onLayerUpdate(id, { opacity });
    });
  };

  const [showAddMenu, setShowAddMenu] = useState(false);

  // Progressive disclosure: blend mode + opacity collapsed by default
  const [advancedOpen, setAdvancedOpen] = useState(() => getDisclosurePref('editor.layersAdvanced'));
  const toggleAdvanced = () => {
    setAdvancedOpen((prev) => {
      const next = !prev;
      setDisclosurePref('editor.layersAdvanced', next);
      return next;
    });
  };

  return (
    <div 
      className="layers-panel"
      id="layers-panel"
      role="region"
      aria-label="Layers panel. Manage and reorder canvas layers."
    >
      {/* Header */}
      <div className="layers-panel__header">
        <span className="layers-panel__title">Layers</span>
        <div className="layers-panel__actions">
          <div style={{ position: 'relative' }}>
            <button
              className="layers-panel__action"
              onClick={() => setShowAddMenu(!showAddMenu)}
              title="Add layer"
              aria-label="Add layer"
            >
              <Icons.Plus />
            </button>
            {showAddMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'var(--editor-bg-medium)',
                  border: '1px solid var(--editor-border-default)',
                  borderRadius: 'var(--editor-radius-md)',
                  padding: '4px',
                  minWidth: '120px',
                  zIndex: 100,
                }}
              >
                {(['image', 'text', 'shape', 'drawing'] as LayerType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      onAddLayer(type);
                      setShowAddMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--editor-text-primary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      borderRadius: 'var(--editor-radius-sm)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--editor-bg-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ width: 14, height: 14, display: 'flex' }}>{getLayerIcon(type)}</span>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="layers-panel__action"
            onClick={onGroupLayers}
            disabled={selection.layerIds.length < 2}
            title="Group layers"
            aria-label="Group layers"
          >
            <Icons.Group />
          </button>
          <button
            className="layers-panel__action"
            onClick={onMergeLayers}
            disabled={selection.layerIds.length < 2}
            title="Merge layers"
            aria-label="Merge layers"
          >
            <Icons.Merge />
          </button>
        </div>
      </div>

      {/* Advanced toggle — progressive disclosure (hidden in Simple mode) */}
      {!isSimpleMode && (
        <>
          <button
            className="layers-panel__advanced-toggle"
            onClick={toggleAdvanced}
            aria-expanded={advancedOpen}
          >
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={`layers-panel__advanced-chevron ${advancedOpen ? 'layers-panel__advanced-chevron--open' : ''}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>Advanced</span>
            {selectedBlendMode !== 'normal' && (
              <span className="layers-panel__advanced-indicator" />
            )}
          </button>

          {/* Blend mode & opacity — collapsible */}
          <div className={`layers-panel__blend-wrapper ${advancedOpen ? 'layers-panel__blend-wrapper--open' : ''}`}>
            <div className="layers-panel__blend">
              <select
                className="blend-select"
                value={selectedBlendMode}
                onChange={handleBlendModeChange}
                disabled={selection.layerIds.length === 0}
              >
                {blendModes.map(mode => (
                  <option key={mode} value={mode}>
                    {mode.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
              <div className="opacity-control">
                <span className="opacity-control__label">Opacity:</span>
                <input
                  type="number"
                  className="opacity-control__input"
                  value={selectedOpacity}
                  onChange={handleOpacityChange}
                  min={0}
                  max={100}
                  disabled={selection.layerIds.length === 0}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Layer list */}
      <div 
        className="layers-list"
        role="list"
        aria-label="Layer list"
      >
        {orderedLayers.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--editor-text-muted)',
            fontSize: '12px',
          }}>
            No layers yet.<br />
            Add a layer to get started.
          </div>
        ) : (
          <LayerSortableList layerOrder={layerOrder} onReorder={onLayerReorder}>
            {orderedLayers.map((layer, index) => (
              <SortableLayerItem key={layer.id} id={layer.id} index={index}>
                <div
                  className={`layer-item ${selection.layerIds.includes(layer.id) ? 'layer-item--selected' : ''}`}
                  onClick={(e) => onLayerSelect(layer.id, e.shiftKey || e.ctrlKey || e.metaKey)}
                  role="listitem"
                  aria-label={`Layer: ${layer.name}, type: ${layer.type}${!layer.visible ? ', hidden' : ''}${layer.locked ? ', locked' : ''}`}
                  aria-selected={selection.layerIds.includes(layer.id)}
                >
                  {/* Drag handle for removing layer - draggable to trash zone */}
                  <LayerDragHandle layer={layer} />
                  
                  <button
                    className={`layer-item__visibility ${!layer.visible ? 'layer-item__visibility--hidden' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerVisibilityToggle(layer.id);
                    }}
                  >
                    <Icons.Eye visible={layer.visible} />
                  </button>

                  <button
                    className={`layer-item__lock ${layer.locked ? 'layer-item__lock--locked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerLockToggle(layer.id);
                    }}
                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  >
                    <Icons.Lock locked={layer.locked} />
                  </button>

                  <div className="layer-item__thumbnail">
                    {getLayerIcon(layer.type)}
                  </div>

                  <div className="layer-item__info">
                    <div className="layer-item__name">{layer.name}</div>
                    <div className="layer-item__type">{layer.type}</div>
                  </div>

                  <div className="layer-item__actions">
                    <button
                      className="layer-item__action"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerDuplicate(layer.id);
                      }}
                      title="Duplicate"
                      aria-label={`Duplicate layer ${layer.name}`}
                    >
                      <Icons.Copy />
                    </button>
                    <button
                      className="layer-item__action layer-item__action--delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerDelete(layer.id);
                      }}
                      title="Delete"
                      aria-label={`Delete layer ${layer.name}`}
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              </SortableLayerItem>
            ))}
          </LayerSortableList>
        )}
      </div>
      
      {/* Screen reader instructions for drag-drop */}
      <DragInstructions />
    </div>
  );
};

export default React.memo(LayersPanel);
