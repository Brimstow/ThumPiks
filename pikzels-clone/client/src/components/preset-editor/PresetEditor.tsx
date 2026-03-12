import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useEditorState } from '../editor/hooks/useEditorState';
import CanvasEngine from '../editor/canvas/CanvasEngine';
import AIToolsPanel from '../editor/panels/AIToolsPanel';
import LayersPanel from '../editor/panels/LayersPanel';
import AdjustmentsPanel from '../editor/panels/AdjustmentsPanel';
import AICommandBar from '../editor/components/AICommandBar';
import { useCommandExecutor } from '../editor/hooks/useCommandExecutor';
import { useBackendAI } from '../../hooks/useBackendAI';
import { useAIToolsStore } from '../../stores/aiToolsStore';
import {
  useLayouts,
  TemplatePicker,
  SlotEditor,
  compositionToLayers,
} from '../../features/composition-templates';
import { ChatPanel, useChatConversation, useChatActions } from '../../features/ai-chat';
import type { PlatformPresetContext } from '../../features/ai-chat';
import type {
  ToolType,
  LayerType,
  Layer,
  ImageLayer,
  TextLayer,
  DrawingLayer,
} from '../editor/types/editor.types';
import type { ExtractedFrame } from '../../services/video';
import { authPost } from '../../utils/api';
import './PresetEditor.css';

// ============================================================================
// PresetEditor
// AI-first thumbnail editor launched from platform presets on CreatePlusPage.
// Shares the same canvas engine, hooks, and AI piping as ThumbnailStudio
// but with a layout optimised for prompt-driven creation.
// ============================================================================

interface PresetEditorProps {
  preset: {
    platform: string;
    width: number;
    height: number;
    name: string;
  };
  onClose: () => void;
  onOpenFullEditor: (state?: { layers: Layer[]; preview: string }) => void;
}

type SideTab = 'ai' | 'layers' | 'layouts' | 'adjust';

const PresetEditor: React.FC<PresetEditorProps> = ({ preset, onClose, onOpenFullEditor }) => {
  // ---- Editor state (same hook as ThumbnailStudio, with preset dimensions) ---
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
    updateAdjustments,
    markSaved,
  } = useEditorState(preset.width, preset.height);

  // ---- UI state ---
  const [sideTab, setSideTab] = useState<SideTab>('ai');
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);

  // Chat state
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { callBackendAI, isLoading: isAILoading } = useBackendAI();

  // Auto-fit canvas to viewport on mount so all presets are centered and visible
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    // Wait one frame for layout to settle
    const raf = requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const padding = 48;
      const scaleX = (rect.width - padding) / preset.width;
      const scaleY = (rect.height - padding) / preset.height;
      const fitZoom = Math.min(scaleX, scaleY, 1);
      dispatch({ type: 'SET_CANVAS', canvas: { zoom: fitZoom, panX: 0, panY: 0 } });
    });
    return () => cancelAnimationFrame(raf);
  }, [preset.width, preset.height, dispatch]);

  // ---- Handlers (same pattern as ThumbnailStudio) ---
  const handleLayerSelect = useCallback((layerId: string | null) => {
    if (layerId) selectLayer(layerId);
    else clearSelection();
  }, [selectLayer, clearSelection]);

  const handleLayerVisibilityToggle = useCallback((layerId: string) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer) dispatch({ type: 'UPDATE_LAYER', layerId, updates: { visible: !layer.visible } });
  }, [state.layers, dispatch]);

  const handleLayerLockToggle = useCallback((layerId: string) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer) dispatch({ type: 'UPDATE_LAYER', layerId, updates: { locked: !layer.locked } });
  }, [state.layers, dispatch]);

  const handleLayerReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...state.layerOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
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
      case 'text': addTextLayer('New Text'); break;
      case 'shape': addShapeLayer('rectangle'); break;
      case 'drawing': addDrawingLayer(); break;
      default: break;
    }
  }, [addTextLayer, addShapeLayer, addDrawingLayer]);

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
    const sel = selectedLayers;
    if (sel.length === 1 && sel[0].type === 'drawing') {
      dispatch({
        type: 'UPDATE_LAYER',
        layerId: sel[0].id,
        updates: { paths: newPaths } as Partial<DrawingLayer>,
      });
    }
  }, [selectedLayers, dispatch]);

  const handleShapeCreate = useCallback((
    type: 'rectangle' | 'ellipse' | 'polygon' | 'line' | 'arrow',
    x: number, y: number, w: number, h: number
  ) => {
    addShapeLayer(type, x, y, w, h);
  }, [addShapeLayer]);

  const handleTextCreate = useCallback((x: number, y: number) => {
    addTextLayer('Double click to edit', x, y);
  }, [addTextLayer]);

  const handleColorPick = useCallback((color: string) => {
    dispatch({
      type: 'UPDATE_TOOL_SETTINGS',
      settings: {
        brush: { ...state.toolSettings.brush, color },
      },
    });
  }, [dispatch, state.toolSettings.brush]);

  const handleFillArea = useCallback((x: number, y: number, color: string) => {
    // Fill handled by canvas engine
  }, []);

  const handleCrop = useCallback((x: number, y: number, width: number, height: number) => {
    dispatch({ type: 'SET_CANVAS', canvas: { width: Math.round(width), height: Math.round(height) } });
  }, [dispatch]);

  // ---- Command executor (AI command bar + chat) ---
  const commandExecutor = useCommandExecutor({
    addImageLayer,
    addTextLayer,
    addShapeLayer,
    updateLayer: handleLayerUpdate,
    deleteLayer: handleLayerDelete,
    duplicateLayer: handleLayerDuplicate,
    selectLayer,
    reorderLayers: (layerIds: string[]) => dispatch({ type: 'REORDER_LAYERS', layerIds }),
    callBackendAI,
    getLayers: () => state.layers,
    getLayerOrder: () => state.layerOrder,
    getSelectedLayerIds: () => state.selection.layerIds,
    getCanvasSize: () => ({ width: state.canvas.width, height: state.canvas.height }),
  });

  // ---- Chat ---
  const platformPresetCtx: PlatformPresetContext = useMemo(() => ({
    platform: preset.platform,
    width: preset.width,
    height: preset.height,
    name: preset.name,
  }), [preset]);

  const chatConversation = useChatConversation({
    getCanvasContext: commandExecutor.buildContext,
    platformPreset: platformPresetCtx,
    onActions: (actions, messageId) => {
      chatActionsHook.executeActions(actions, messageId);
    },
  });

  const chatActionsHook = useChatActions({
    commandExecutor,
    updateActionResult: chatConversation.updateActionResult,
  });

  const toggleChatCollapsed = useCallback(() => {
    setIsChatCollapsed(prev => !prev);
  }, []);

  // ---- Layouts ---
  const layouts = useLayouts();

  // Chat upload handler — read file as data URL and add as image layer
  const handleChatUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      addImageLayer(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  }, [addImageLayer]);

  const handleApplyLayoutToEditor = useCallback(() => {
    if (!layouts.selectedTemplate || !layouts.compositionState) return;
    const missing = layouts.getMissingSlots();
    if (missing.length > 0) return;

    const { layers: newLayers } = compositionToLayers(
      layouts.selectedTemplate,
      layouts.compositionState,
    );

    newLayers.forEach((layer: any) => {
      if (layer.type === 'image' && layer.src) {
        addImageLayer(layer.src, layer.name || 'Layout Image');
      } else if (layer.type === 'text' && layer.content) {
        addTextLayer(layer.content, layer.transform?.x, layer.transform?.y);
      }
    });

    layouts.clearTemplate();
  }, [layouts, addImageLayer, addTextLayer]);

  // ---- Toggle command bar ---
  const toggleCommandBar = useCallback(() => {
    setIsCommandBarOpen(prev => !prev);
  }, []);

  // ---- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) { if (canRedo) dispatch({ type: 'REDO' }); }
            else { if (canUndo) dispatch({ type: 'UNDO' }); }
            break;
          case 'y':
            e.preventDefault();
            if (canRedo) dispatch({ type: 'REDO' });
            break;
          case 'k':
            e.preventDefault();
            toggleCommandBar();
            break;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selection.layerIds.length > 0) {
          state.selection.layerIds.forEach(id => dispatch({ type: 'REMOVE_LAYER', layerId: id }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, dispatch, state.selection.layerIds, toggleCommandBar]);

  // ---- Export canvas for saving ---
  const getCanvasPreview = useCallback((): string | null => {
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }, []);

  // ---- Save to thumbnails collection ---
  const handleSaveToCollection = useCallback(async () => {
    setIsSaving(true);
    setSaveMenuOpen(false);
    try {
      const preview = getCanvasPreview();
      if (!preview) throw new Error('Could not capture canvas');

      const response = await authPost('/api/thumbnails', {
        title: `${preset.name} Thumbnail`,
        imageUrl: preview,
        prompt: `Created with ${preset.name} preset editor`,
        parameters: {
          width: preset.width,
          height: preset.height,
          platform: preset.platform,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }

      markSaved();
      alert('Thumbnail saved to your collection!');
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [getCanvasPreview, preset, markSaved]);

  // ---- Continue in full editor ---
  const handleContinueInFullEditor = useCallback(() => {
    setSaveMenuOpen(false);
    const preview = getCanvasPreview();
    onOpenFullEditor(preview ? { layers: state.layers, preview } : undefined);
  }, [getCanvasPreview, state.layers, onOpenFullEditor]);

  // ---- Render ---
  return (
    <div className="preset-editor">
      {/* ---- Top Bar ---- */}
      <header className="preset-editor__topbar">
        <div className="preset-editor__topbar-left">
          <button className="pe-btn pe-btn--icon" onClick={onClose} title="Back to Create">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="preset-editor__badge">
            <span className="preset-editor__badge-platform">{preset.name}</span>
            <span className="preset-editor__badge-size">{preset.width} x {preset.height}</span>
          </div>
          <div className="pe-divider" />
          <button className="pe-btn pe-btn--icon" onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo} title="Undo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button className="pe-btn pe-btn--icon" onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo} title="Redo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
            </svg>
          </button>
        </div>

        <div className="preset-editor__topbar-center">
          <button
            className="pe-btn pe-btn--command"
            onClick={toggleCommandBar}
            title="AI Command Bar (Ctrl+K)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            Ask AI anything...
            <kbd>Ctrl+K</kbd>
          </button>
        </div>

        <div className="preset-editor__topbar-right">
          <div className="preset-editor__save-group">
            <button
              className="pe-btn pe-btn--primary"
              onClick={handleSaveToCollection}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              className="pe-btn pe-btn--primary pe-btn--dropdown"
              onClick={() => setSaveMenuOpen(prev => !prev)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {saveMenuOpen && (
              <div className="preset-editor__save-menu">
                <button onClick={handleSaveToCollection}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save to Collection
                </button>
                <button onClick={handleContinueInFullEditor}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Continue in Full Editor
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---- Main Content ---- */}
      <div className="preset-editor__main">
        {/* Canvas area */}
        <div className="preset-editor__canvas" ref={canvasContainerRef}>
          <CanvasEngine
            state={state}
            onZoomChange={handleZoomChange}
            onPanChange={handlePanChange}
            onLayerSelect={handleLayerSelect}
            onDrawingUpdate={handleDrawingUpdate}
            onShapeCreate={handleShapeCreate}
            onTextCreate={handleTextCreate}
            onColorPick={handleColorPick}
            onFillArea={handleFillArea}
            onCrop={handleCrop}
          />
        </div>

        {/* Right panel: AI-first layout */}
        <aside className="preset-editor__panel">
          {/* Tab bar */}
          <div className="preset-editor__tabs">
            <button
              className={`preset-editor__tab ${sideTab === 'ai' ? 'preset-editor__tab--active' : ''}`}
              onClick={() => setSideTab('ai')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              AI Tools
            </button>
            <button
              className={`preset-editor__tab ${sideTab === 'layers' ? 'preset-editor__tab--active' : ''}`}
              onClick={() => setSideTab('layers')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
              </svg>
              Layers
            </button>
            <button
              className={`preset-editor__tab ${sideTab === 'layouts' ? 'preset-editor__tab--active' : ''}`}
              onClick={() => setSideTab('layouts')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
              Layouts
            </button>
            <button
              className={`preset-editor__tab ${sideTab === 'adjust' ? 'preset-editor__tab--active' : ''}`}
              onClick={() => setSideTab('adjust')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              Adjust
            </button>
          </div>

          {/* Tab content */}
          <div className="preset-editor__tab-content">
            {sideTab === 'ai' && (
              <AIToolsPanel
                selectedLayers={selectedLayers}
                onAddImageLayer={addImageLayer}
                onAddTextLayer={addTextLayer}
                onUpdateLayer={handleLayerUpdate}
              />
            )}
            {sideTab === 'layers' && (
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
            {sideTab === 'layouts' && (
              <div className="preset-editor__layouts-content">
                {layouts.selectedTemplate && layouts.compositionState ? (
                  <div className="preset-editor__slot-editor">
                    <SlotEditor
                      template={layouts.selectedTemplate}
                      compositionState={layouts.compositionState}
                      onFillSlot={layouts.fillSlot}
                      onClearSlot={layouts.clearSlot}
                      onFillTextSlot={layouts.fillTextSlot}
                      onClearTextSlot={layouts.clearTextSlot}
                    />
                    <div className="preset-editor__layout-actions">
                      <button className="pe-btn pe-btn--secondary" onClick={() => layouts.clearTemplate()}>
                        Cancel
                      </button>
                      <button
                        className="pe-btn pe-btn--primary"
                        onClick={handleApplyLayoutToEditor}
                        disabled={!layouts.isComplete()}
                      >
                        Add to Canvas
                      </button>
                    </div>
                  </div>
                ) : (
                  <TemplatePicker
                    templates={layouts.filteredTemplates}
                    selectedTemplateId={null}
                    categoryFilter={layouts.categoryFilter}
                    searchQuery={layouts.searchQuery}
                    onCategoryChange={layouts.setCategoryFilter}
                    onSearchChange={layouts.setSearchQuery}
                    onSelectTemplate={layouts.selectTemplate}
                    onClearTemplate={layouts.clearTemplate}
                  />
                )}
              </div>
            )}
            {sideTab === 'adjust' && (
              <AdjustmentsPanel
                adjustments={state.adjustments}
                onChange={updateAdjustments}
              />
            )}
          </div>

          {/* Chat divider + panel at bottom */}
          <div
            className="preset-editor__chat-divider"
            onDoubleClick={toggleChatCollapsed}
            title="Double-click to toggle chat"
          />
          <ChatPanel
            messages={chatConversation.messages}
            isStreaming={chatConversation.isStreaming}
            onSend={chatConversation.sendMessage}
            onStop={chatConversation.stopStreaming}
            onClear={chatConversation.clearMessages}
            selectedLayers={selectedLayers}
            isCollapsed={isChatCollapsed}
            onToggleCollapse={toggleChatCollapsed}
            onUpload={handleChatUpload}
          />
        </aside>
      </div>

      {/* AI Command Bar Modal */}
      <AICommandBar
        isOpen={isCommandBarOpen}
        onToggle={toggleCommandBar}
        onParseCommand={commandExecutor.parseCommand}
        onExecuteAll={commandExecutor.executeAll}
        isLoading={isAILoading}
      />

      {/* Click-away to close save menu */}
      {saveMenuOpen && (
        <div className="preset-editor__overlay" onClick={() => setSaveMenuOpen(false)} />
      )}
    </div>
  );
};

export default PresetEditor;
