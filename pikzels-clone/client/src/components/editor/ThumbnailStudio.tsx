import React, { useState, useCallback, useEffect } from 'react';
import { useEditorState } from './hooks/useEditorState';
import ToolsPanel from './panels/ToolsPanel';
import LayersPanel from './panels/LayersPanel';
import AIToolsPanel from './panels/AIToolsPanel';
import CanvasEngine from './canvas/CanvasEngine';
import type { 
  ThumbnailStudioProps, 
  ToolType, 
  LayerType, 
  Layer,
  DrawingLayer,
} from './types/editor.types';
import './ThumbnailStudio.css';

// Icons
const Icons = {
  Layers: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Undo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  ),
  Redo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Save: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Maximize: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  Minimize: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

type PanelTab = 'layers' | 'ai' | 'properties';

const ThumbnailStudio: React.FC<ThumbnailStudioProps> = ({
  thumbnailId,
  initialImage,
  onSave,
  onClose,
}) => {
  const {
    state,
    dispatch,
    addImageLayer,
    addTextLayer,
    addShapeLayer,
    addDrawingLayer,
    selectLayer,
    clearSelection,
    selectedLayers,
    orderedLayers,
    canUndo,
    canRedo,
  } = useEditorState(1920, 1080);

  // UI State
  const [activeTab, setActiveTab] = useState<PanelTab>('layers');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isFullCanvas, setIsFullCanvas] = useState(false);

  // Load initial image if provided
  useEffect(() => {
    if (initialImage) {
      addImageLayer(initialImage, 'Background');
    }
  }, [initialImage, addImageLayer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      // Tool shortcuts
      if (!isMod) {
        const toolMap: Record<string, ToolType> = {
          'v': 'select',
          'm': 'move',
          'b': 'brush',
          'e': 'eraser',
          'p': 'pen',
          'r': 'rectangle',
          'o': 'ellipse',
          'g': 'polygon',
          'l': 'line',
          't': 'text',
          'i': 'eyedropper',
          'f': 'fill',
          'c': 'crop',
          'h': 'hand',
          'z': 'zoom',
        };

        if (toolMap[e.key.toLowerCase()]) {
          dispatch({ type: 'SET_TOOL', tool: toolMap[e.key.toLowerCase()] });
          return;
        }
      }

      // Modifier shortcuts
      if (isMod) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              if (canRedo) dispatch({ type: 'REDO' });
            } else {
              if (canUndo) dispatch({ type: 'UNDO' });
            }
            break;
          case 'y':
            e.preventDefault();
            if (canRedo) dispatch({ type: 'REDO' });
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'g':
            e.preventDefault();
            if (state.selection.layerIds.length > 1) {
              dispatch({ type: 'GROUP_LAYERS', layerIds: state.selection.layerIds });
            }
            break;
        }
      }

      // Other shortcuts
      if (e.key === 'Escape') {
        clearSelection();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        state.selection.layerIds.forEach(id => {
          dispatch({ type: 'REMOVE_LAYER', layerId: id });
        });
      }
      if (e.key === 'F11' || (e.key === 'f' && !isMod)) {
        if (e.key === 'F11') {
          e.preventDefault();
          setIsFullCanvas(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, canUndo, canRedo, clearSelection, state.selection.layerIds]);

  // Handlers
  const handleToolSelect = useCallback((tool: ToolType) => {
    dispatch({ type: 'SET_TOOL', tool });
  }, [dispatch]);

  const handleLayerSelect = useCallback((layerId: string | null) => {
    if (layerId) {
      selectLayer(layerId);
    } else {
      clearSelection();
    }
  }, [selectLayer, clearSelection]);

  const handleLayerVisibilityToggle = useCallback((layerId: string) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer) {
      dispatch({ type: 'UPDATE_LAYER', layerId, updates: { visible: !layer.visible } });
    }
  }, [state.layers, dispatch]);

  const handleLayerLockToggle = useCallback((layerId: string) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer) {
      dispatch({ type: 'UPDATE_LAYER', layerId, updates: { locked: !layer.locked } });
    }
  }, [state.layers, dispatch]);

  const handleLayerReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...state.layerOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    dispatch({ type: 'REORDER_LAYERS', layerIds: newOrder });
  }, [state.layerOrder, dispatch]);

  const handleLayerDelete = useCallback((layerId: string) => {
    dispatch({ type: 'REMOVE_LAYER', layerId });
  }, [dispatch]);

  const handleLayerDuplicate = useCallback((layerId: string) => {
    dispatch({ type: 'DUPLICATE_LAYER', layerId });
  }, [dispatch]);

  const handleLayerUpdate = useCallback((layerId: string, updates: Partial<Layer>) => {
    dispatch({ type: 'UPDATE_LAYER', layerId, updates });
  }, [dispatch]);

  const handleAddLayer = useCallback((type: LayerType) => {
    switch (type) {
      case 'text':
        addTextLayer('New Text', 100, 100);
        break;
      case 'shape':
        addShapeLayer('rectangle', 100, 100, 200, 200);
        break;
      case 'drawing':
        addDrawingLayer();
        break;
      case 'image':
        // Open file picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              addImageLayer(reader.result as string, file.name);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        break;
    }
  }, [addTextLayer, addShapeLayer, addDrawingLayer, addImageLayer]);

  const handleGroupLayers = useCallback(() => {
    if (state.selection.layerIds.length > 1) {
      dispatch({ type: 'GROUP_LAYERS', layerIds: state.selection.layerIds });
    }
  }, [state.selection.layerIds, dispatch]);

  const handleMergeLayers = useCallback(() => {
    if (state.selection.layerIds.length > 1) {
      dispatch({ type: 'MERGE_LAYERS', layerIds: state.selection.layerIds });
    }
  }, [state.selection.layerIds, dispatch]);

  const handleZoomChange = useCallback((zoom: number) => {
    dispatch({ type: 'SET_CANVAS', canvas: { zoom } });
  }, [dispatch]);

  const handlePanChange = useCallback((panX: number, panY: number) => {
    dispatch({ type: 'SET_CANVAS', canvas: { panX, panY } });
  }, [dispatch]);

  const handleDrawingUpdate = useCallback((newPaths: any[]) => {
    // Find or create a drawing layer
    let drawingLayer = state.layers.find(l => l.type === 'drawing') as DrawingLayer | undefined;
    
    if (!drawingLayer) {
      const newId = addDrawingLayer();
      drawingLayer = state.layers.find(l => l.id === newId) as DrawingLayer;
    }

    if (drawingLayer) {
      dispatch({
        type: 'UPDATE_LAYER',
        layerId: drawingLayer.id,
        updates: {
          paths: [...(drawingLayer.paths || []), ...newPaths],
        },
      });
    }
  }, [state.layers, addDrawingLayer, dispatch]);

  const handleSave = useCallback(async () => {
    // Export canvas as image
    const canvas = document.querySelector('.canvas-wrapper canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const preview = canvas.toDataURL('image/png');
    
    onSave?.({
      layers: state.layers,
      preview,
    });
  }, [state.layers, onSave]);

  const handleExport = useCallback(() => {
    const canvas = document.querySelector('.canvas-wrapper canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `thumbnail-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  return (
    <div className={`thumbnail-studio ${isFullCanvas ? 'thumbnail-studio--fullscreen' : ''}`}>
      {/* Top Toolbar */}
      <header className="editor-toolbar">
        <div className="editor-toolbar__left">
          {onClose && (
            <button className="editor-btn editor-btn--icon" onClick={onClose} title="Close">
              <Icons.X />
            </button>
          )}
          <h1 className="editor-toolbar__title">Thumbnail Studio</h1>
          <div className="editor-toolbar__divider" />
          <button 
            className="editor-btn editor-btn--icon" 
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Icons.Undo />
          </button>
          <button 
            className="editor-btn editor-btn--icon"
            onClick={() => dispatch({ type: 'REDO' })}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Icons.Redo />
          </button>
        </div>

        <div className="editor-toolbar__center">
          {/* Canvas size selector could go here */}
        </div>

        <div className="editor-toolbar__right">
          <button
            className="editor-btn editor-btn--icon"
            onClick={() => setIsFullCanvas(prev => !prev)}
            title={isFullCanvas ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'}
          >
            {isFullCanvas ? <Icons.Minimize /> : <Icons.Maximize />}
          </button>
          <div className="editor-toolbar__divider" />
          <button className="editor-btn" onClick={handleExport}>
            <Icons.Download />
            Export
          </button>
          <button className="editor-btn editor-btn--primary" onClick={handleSave}>
            <Icons.Save />
            Save
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="editor-main">
        {/* Left Tools Panel */}
        <ToolsPanel
          activeTool={state.activeTool}
          toolSettings={state.toolSettings}
          onToolSelect={handleToolSelect}
          onSettingsChange={(settings) => dispatch({ type: 'UPDATE_TOOL_SETTINGS', settings })}
        />

        {/* Canvas Area */}
        <CanvasEngine
          state={state}
          onZoomChange={handleZoomChange}
          onPanChange={handlePanChange}
          onLayerSelect={handleLayerSelect}
          onDrawingUpdate={handleDrawingUpdate}
        />

        {/* Toggle panel button (visible when collapsed or in fullscreen) */}
        {(isPanelCollapsed || isFullCanvas) && !isFullCanvas && (
          <button
            className="toggle-panels-btn"
            onClick={() => setIsPanelCollapsed(false)}
            style={{ right: 0 }}
          >
            <Icons.ChevronLeft />
          </button>
        )}

        {/* Right Panels */}
        {!isFullCanvas && (
          <aside className={`panels-container ${isPanelCollapsed ? 'panels-container--collapsed' : ''} ${activeTab === 'ai' ? 'panels-container--ai-mode' : ''}`}>
            {!isPanelCollapsed && (
              <>
                {/* Panel tabs */}
                <div className="panels-tabs">
                  <button
                    className={`panels-tab ${activeTab === 'layers' ? 'panels-tab--active' : ''}`}
                    onClick={() => setActiveTab('layers')}
                  >
                    <Icons.Layers />
                    Layers
                  </button>
                  <button
                    className={`panels-tab ${activeTab === 'ai' ? 'panels-tab--active' : ''}`}
                    onClick={() => setActiveTab('ai')}
                  >
                    <Icons.Sparkles />
                    AI
                  </button>
                  <button
                    className={`panels-tab ${activeTab === 'properties' ? 'panels-tab--active' : ''}`}
                    onClick={() => setActiveTab('properties')}
                  >
                    <Icons.Settings />
                    Props
                  </button>
                  <button
                    onClick={() => setIsPanelCollapsed(true)}
                    style={{
                      width: 32,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--editor-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icons.ChevronRight />
                  </button>
                </div>

                {/* Panel content */}
                <div className="panel-content">
                  {activeTab === 'layers' && (
                    <LayersPanel
                      layers={state.layers}
                      layerOrder={state.layerOrder}
                      selection={state.selection}
                      onLayerSelect={selectLayer}
                      onLayerVisibilityToggle={handleLayerVisibilityToggle}
                      onLayerLockToggle={handleLayerLockToggle}
                      onLayerReorder={handleLayerReorder}
                      onLayerDelete={handleLayerDelete}
                      onLayerDuplicate={handleLayerDuplicate}
                      onLayerUpdate={handleLayerUpdate}
                      onAddLayer={handleAddLayer}
                      onGroupLayers={handleGroupLayers}
                      onMergeLayers={handleMergeLayers}
                    />
                  )}
                  {activeTab === 'ai' && (
                    <AIToolsPanel
                      selectedLayers={selectedLayers}
                      onAddImageLayer={addImageLayer}
                      onUpdateLayer={handleLayerUpdate}
                    />
                  )}
                  {activeTab === 'properties' && (
                    <div className="properties-panel">
                      {selectedLayers.length === 0 ? (
                        <div style={{
                          padding: '24px',
                          textAlign: 'center',
                          color: 'var(--editor-text-muted)',
                          fontSize: '12px',
                        }}>
                          Select a layer to view properties
                        </div>
                      ) : (
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
                                    onChange={(e) => handleLayerUpdate(layer.id, {
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
                                    onChange={(e) => handleLayerUpdate(layer.id, {
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
                                    onChange={(e) => handleLayerUpdate(layer.id, {
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
                                    onChange={(e) => handleLayerUpdate(layer.id, {
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
                                    onChange={(e) => handleLayerUpdate(layer.id, {
                                      transform: { ...layer.transform, rotation: parseInt(e.target.value) || 0 }
                                    })}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default ThumbnailStudio;
