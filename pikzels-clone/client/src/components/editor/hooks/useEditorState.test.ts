import { renderHook, act } from '@testing-library/react';
import { useEditorState } from './useEditorState';
import { DEFAULT_ADJUSTMENTS } from '../types/editor.types';

describe('useEditorState', () => {
  describe('initial state', () => {
    it('initializes with default dimensions when none provided', () => {
      const { result } = renderHook(() => useEditorState());
      
      expect(result.current.state.canvas.width).toBe(1920);
      expect(result.current.state.canvas.height).toBe(1080);
    });

    it('initializes with custom dimensions when provided', () => {
      const { result } = renderHook(() => useEditorState(1280, 720));
      
      expect(result.current.state.canvas.width).toBe(1280);
      expect(result.current.state.canvas.height).toBe(720);
    });

    it('initializes with default adjustments', () => {
      const { result } = renderHook(() => useEditorState());
      
      expect(result.current.state.adjustments).toEqual(DEFAULT_ADJUSTMENTS);
    });

    it('initializes with empty layers', () => {
      const { result } = renderHook(() => useEditorState());
      
      expect(result.current.state.layers).toEqual([]);
      expect(result.current.state.layerOrder).toEqual([]);
    });

    it('initializes with isModified false', () => {
      const { result } = renderHook(() => useEditorState());
      
      expect(result.current.isModified).toBe(false);
      expect(result.current.state.isModified).toBe(false);
    });

    it('initializes history with single entry', () => {
      const { result } = renderHook(() => useEditorState());
      
      expect(result.current.state.history).toHaveLength(1);
      expect(result.current.state.historyIndex).toBe(0);
    });
  });

  describe('adjustment mutations', () => {
    it('updates brightness adjustment', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });

      expect(result.current.state.adjustments.brightness).toBe(150);
    });

    it('updates multiple adjustments at once', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({
          brightness: 120,
          contrast: 80,
          saturation: 110,
        });
      });

      expect(result.current.state.adjustments.brightness).toBe(120);
      expect(result.current.state.adjustments.contrast).toBe(80);
      expect(result.current.state.adjustments.saturation).toBe(110);
    });

    it('preserves other adjustments when updating specific ones', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });

      // Other values should remain at defaults
      expect(result.current.state.adjustments.contrast).toBe(100);
      expect(result.current.state.adjustments.saturation).toBe(100);
      expect(result.current.state.adjustments.hue).toBe(0);
    });

    it('updates filter preset', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ filter: 'vintage' });
      });

      expect(result.current.state.adjustments.filter).toBe('vintage');
    });

    it('updates sharpen settings', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({
          sharpenEnabled: true,
          sharpenStrength: 'strong',
        });
      });

      expect(result.current.state.adjustments.sharpenEnabled).toBe(true);
      expect(result.current.state.adjustments.sharpenStrength).toBe('strong');
    });

    it('updates transform settings', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({
          rotation: 45,
          flipHorizontal: true,
        });
      });

      expect(result.current.state.adjustments.rotation).toBe(45);
      expect(result.current.state.adjustments.flipHorizontal).toBe(true);
    });

    it('sets isModified to true after adjustment update', () => {
      const { result } = renderHook(() => useEditorState());
      
      expect(result.current.isModified).toBe(false);
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });

      expect(result.current.isModified).toBe(true);
    });

    it('adds history entry after adjustment update', () => {
      const { result } = renderHook(() => useEditorState());
      
      const initialHistoryLength = result.current.state.history.length;
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });

      expect(result.current.state.history.length).toBe(initialHistoryLength + 1);
    });
  });

  describe('undo/redo', () => {
    it('canUndo is false initially', () => {
      const { result } = renderHook(() => useEditorState());
      
      expect(result.current.canUndo).toBe(false);
    });

    it('canRedo is false initially', () => {
      const { result } = renderHook(() => useEditorState());
      
      expect(result.current.canRedo).toBe(false);
    });

    it('canUndo becomes true after making changes', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });

      expect(result.current.canUndo).toBe(true);
    });

    it('undo reverts adjustments to previous state', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });

      expect(result.current.state.adjustments.brightness).toBe(150);
      
      act(() => {
        result.current.dispatch({ type: 'UNDO' });
      });

      expect(result.current.state.adjustments.brightness).toBe(100); // default
    });

    it('redo restores adjustments after undo', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });
      
      act(() => {
        result.current.dispatch({ type: 'UNDO' });
      });

      expect(result.current.state.adjustments.brightness).toBe(100);
      
      act(() => {
        result.current.dispatch({ type: 'REDO' });
      });

      expect(result.current.state.adjustments.brightness).toBe(150);
    });

    it('canRedo becomes true after undo', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });
      
      act(() => {
        result.current.dispatch({ type: 'UNDO' });
      });

      expect(result.current.canRedo).toBe(true);
    });

    it('multiple undos work correctly', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 110 });
      });
      act(() => {
        result.current.updateAdjustments({ brightness: 120 });
      });
      act(() => {
        result.current.updateAdjustments({ brightness: 130 });
      });

      expect(result.current.state.adjustments.brightness).toBe(130);
      
      act(() => {
        result.current.dispatch({ type: 'UNDO' });
      });
      expect(result.current.state.adjustments.brightness).toBe(120);
      
      act(() => {
        result.current.dispatch({ type: 'UNDO' });
      });
      expect(result.current.state.adjustments.brightness).toBe(110);
      
      act(() => {
        result.current.dispatch({ type: 'UNDO' });
      });
      expect(result.current.state.adjustments.brightness).toBe(100); // default
    });

    it('new action truncates redo future', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });
      act(() => {
        result.current.updateAdjustments({ brightness: 200 });
      });
      
      // Undo once
      act(() => {
        result.current.dispatch({ type: 'UNDO' });
      });
      expect(result.current.canRedo).toBe(true);
      
      // Make new change - should truncate future
      act(() => {
        result.current.updateAdjustments({ brightness: 175 });
      });
      
      // Redo should no longer be possible
      expect(result.current.canRedo).toBe(false);
      expect(result.current.state.adjustments.brightness).toBe(175);
    });

    it('undo does nothing when at initial state', () => {
      const { result } = renderHook(() => useEditorState());
      
      const initialState = result.current.state;
      
      act(() => {
        result.current.dispatch({ type: 'UNDO' });
      });

      // State should be unchanged
      expect(result.current.state.historyIndex).toBe(initialState.historyIndex);
    });

    it('redo does nothing when at latest state', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });
      
      const historyIndex = result.current.state.historyIndex;
      
      act(() => {
        result.current.dispatch({ type: 'REDO' });
      });

      // State should be unchanged
      expect(result.current.state.historyIndex).toBe(historyIndex);
    });
  });

  describe('history 50-state limit', () => {
    it('caps history at 50 entries', () => {
      const { result } = renderHook(() => useEditorState());
      
      // Make 55 changes (initial + 55 = 56 entries, should be capped to 50)
      for (let i = 1; i <= 55; i++) {
        act(() => {
          result.current.updateAdjustments({ brightness: 100 + i });
        });
      }

      expect(result.current.state.history.length).toBeLessThanOrEqual(50);
    });

    it('oldest history entries are removed when limit reached', () => {
      const { result } = renderHook(() => useEditorState());
      
      // Make 55 changes
      for (let i = 1; i <= 55; i++) {
        act(() => {
          result.current.updateAdjustments({ brightness: 100 + i });
        });
      }

      // The most recent entry should have brightness = 155
      const lastEntry = result.current.state.history[result.current.state.history.length - 1];
      expect(lastEntry.adjustments.brightness).toBe(155);
      
      // The oldest entry should NOT have brightness = 100 (initial) since it was evicted
      const firstEntry = result.current.state.history[0];
      expect(firstEntry.adjustments.brightness).toBeGreaterThan(100);
    });

    it('historyIndex stays valid after history truncation', () => {
      const { result } = renderHook(() => useEditorState());
      
      // Make 55 changes
      for (let i = 1; i <= 55; i++) {
        act(() => {
          result.current.updateAdjustments({ brightness: 100 + i });
        });
      }

      // historyIndex should point to last entry
      expect(result.current.state.historyIndex).toBe(result.current.state.history.length - 1);
    });
  });

  describe('markSaved', () => {
    it('resets isModified to false', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });
      expect(result.current.isModified).toBe(true);
      
      act(() => {
        result.current.markSaved();
      });
      expect(result.current.isModified).toBe(false);
    });

    it('isModified becomes true again after new changes', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.updateAdjustments({ brightness: 150 });
      });
      
      act(() => {
        result.current.markSaved();
      });
      expect(result.current.isModified).toBe(false);
      
      act(() => {
        result.current.updateAdjustments({ contrast: 80 });
      });
      expect(result.current.isModified).toBe(true);
    });
  });

  describe('layer operations', () => {
    it('addImageLayer creates an image layer', () => {
      const { result } = renderHook(() => useEditorState());
      
      let layerId: string;
      act(() => {
        layerId = result.current.addImageLayer('https://example.com/image.png', 'Test Image');
      });

      expect(result.current.state.layers).toHaveLength(1);
      expect(result.current.state.layers[0].type).toBe('image');
      expect(result.current.state.layers[0].name).toBe('Test Image');
    });

    it('addImageLayer with locked=true creates locked layer', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.addImageLayer('https://example.com/image.png', 'Background', true);
      });

      expect(result.current.state.layers[0].locked).toBe(true);
    });

    it('addImageLayer with locked=false creates unlocked layer', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.addImageLayer('https://example.com/image.png', 'Normal Image', false);
      });

      expect(result.current.state.layers[0].locked).toBe(false);
    });

    it('addTextLayer creates a text layer', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.addTextLayer('Hello World', 100, 200);
      });

      expect(result.current.state.layers).toHaveLength(1);
      expect(result.current.state.layers[0].type).toBe('text');
      const textLayer = result.current.state.layers[0] as any;
      expect(textLayer.content).toBe('Hello World');
    });

    it('addShapeLayer creates a shape layer', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.addShapeLayer('rectangle', 100, 100, 200, 150);
      });

      expect(result.current.state.layers).toHaveLength(1);
      expect(result.current.state.layers[0].type).toBe('shape');
      const shapeLayer = result.current.state.layers[0] as any;
      expect(shapeLayer.shapeType).toBe('rectangle');
    });

    it('adding a layer sets isModified to true', () => {
      const { result } = renderHook(() => useEditorState());
      
      expect(result.current.isModified).toBe(false);
      
      act(() => {
        result.current.addImageLayer('https://example.com/image.png');
      });

      expect(result.current.isModified).toBe(true);
    });

    it('adding a layer adds history entry', () => {
      const { result } = renderHook(() => useEditorState());
      
      const initialHistoryLength = result.current.state.history.length;
      
      act(() => {
        result.current.addImageLayer('https://example.com/image.png');
      });

      expect(result.current.state.history.length).toBe(initialHistoryLength + 1);
    });

    it('undo removes added layer', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.addImageLayer('https://example.com/image.png');
      });
      expect(result.current.state.layers).toHaveLength(1);
      
      act(() => {
        result.current.dispatch({ type: 'UNDO' });
      });
      expect(result.current.state.layers).toHaveLength(0);
    });
  });

  describe('selection', () => {
    it('selectLayer selects a layer', () => {
      const { result } = renderHook(() => useEditorState());
      
      let layerId = '';
      act(() => {
        layerId = result.current.addImageLayer('https://example.com/image.png');
      });
      
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.state.selection.layerIds).toHaveLength(0);
      
      act(() => {
        result.current.selectLayer(layerId);
      });
      expect(result.current.state.selection.layerIds).toContain(layerId);
    });

    it('clearSelection clears all selections', () => {
      const { result } = renderHook(() => useEditorState());
      
      act(() => {
        result.current.addImageLayer('https://example.com/image.png');
      });
      // Layer is auto-selected on add
      expect(result.current.state.selection.layerIds).toHaveLength(1);
      
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.state.selection.layerIds).toHaveLength(0);
    });

    it('multi-select adds to selection', () => {
      const { result } = renderHook(() => useEditorState());
      
      let layerId1 = '';
      let layerId2 = '';
      
      act(() => {
        layerId1 = result.current.addImageLayer('https://example.com/image1.png');
      });
      act(() => {
        layerId2 = result.current.addImageLayer('https://example.com/image2.png');
      });
      
      // Layer 2 is auto-selected, now multi-select layer 1
      act(() => {
        result.current.selectLayer(layerId1, true);
      });
      
      expect(result.current.state.selection.layerIds).toContain(layerId1);
      expect(result.current.state.selection.layerIds).toContain(layerId2);
      expect(result.current.state.selection.layerIds).toHaveLength(2);
    });
  });

  describe('clearCanvas', () => {
    it('removes all layers', () => {
      const { result } = renderHook(() => useEditorState());

      act(() => {
        result.current.addImageLayer('https://example.com/img1.png', 'Layer 1');
      });
      act(() => {
        result.current.addTextLayer('Hello', 10, 20);
      });
      expect(result.current.state.layers).toHaveLength(2);

      act(() => {
        result.current.clearCanvas();
      });

      expect(result.current.state.layers).toHaveLength(0);
      expect(result.current.state.layerOrder).toHaveLength(0);
    });

    it('preserves canvas dimensions', () => {
      const { result } = renderHook(() => useEditorState(1280, 720));

      act(() => {
        result.current.addImageLayer('https://example.com/img.png');
      });
      act(() => {
        result.current.clearCanvas();
      });

      expect(result.current.state.canvas.width).toBe(1280);
      expect(result.current.state.canvas.height).toBe(720);
    });

    it('resets adjustments to defaults', () => {
      const { result } = renderHook(() => useEditorState());

      act(() => {
        result.current.updateAdjustments({ brightness: 150, contrast: 80 });
      });
      expect(result.current.state.adjustments.brightness).toBe(150);

      act(() => {
        result.current.clearCanvas();
      });

      expect(result.current.state.adjustments).toEqual(DEFAULT_ADJUSTMENTS);
    });

    it('clears selection', () => {
      const { result } = renderHook(() => useEditorState());

      act(() => {
        result.current.addImageLayer('https://example.com/img.png');
      });
      expect(result.current.state.selection.layerIds).toHaveLength(1);

      act(() => {
        result.current.clearCanvas();
      });

      expect(result.current.state.selection.layerIds).toHaveLength(0);
    });

    it('resets history to single entry', () => {
      const { result } = renderHook(() => useEditorState());

      act(() => {
        result.current.addImageLayer('https://example.com/img.png');
      });
      act(() => {
        result.current.updateAdjustments({ brightness: 120 });
      });
      expect(result.current.state.history.length).toBeGreaterThan(1);

      act(() => {
        result.current.clearCanvas();
      });

      expect(result.current.state.history).toHaveLength(1);
      expect(result.current.state.historyIndex).toBe(0);
    });

    it('sets isModified to true', () => {
      const { result } = renderHook(() => useEditorState());

      act(() => {
        result.current.addImageLayer('https://example.com/img.png');
      });
      act(() => {
        result.current.markSaved();
      });
      expect(result.current.isModified).toBe(false);

      act(() => {
        result.current.clearCanvas();
      });

      expect(result.current.isModified).toBe(true);
    });

    it('resets active tool to select', () => {
      const { result } = renderHook(() => useEditorState());

      act(() => {
        result.current.clearCanvas();
      });

      expect(result.current.state.activeTool).toBe('select');
    });

    it('canUndo is false after clear (fresh history)', () => {
      const { result } = renderHook(() => useEditorState());

      act(() => {
        result.current.addImageLayer('https://example.com/img.png');
      });
      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.clearCanvas();
      });

      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('options.store parameter', () => {
    it('accepts an external store hook', () => {
      // Create a minimal mock store that returns default-shaped state
      const mockStoreHook = (() => ({
        layers: [],
        layerOrder: [],
        selection: { layerIds: [] },
        activeTool: 'select',
        toolSettings: {},
        canvas: { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 },
        adjustments: DEFAULT_ADJUSTMENTS,
        smartSelection: { enabled: false, segments: [], selectedSegmentIds: [], selectionMode: 'click' },
        // Store actions (unused by useEditorState initialization but part of shape)
        setLayers: jest.fn(),
        setLayerOrder: jest.fn(),
        setSelection: jest.fn(),
        setActiveTool: jest.fn(),
        setToolSettings: jest.fn(),
        setCanvas: jest.fn(),
        setAdjustments: jest.fn(),
        setSmartSelection: jest.fn(),
        addLayer: jest.fn(),
        removeLayer: jest.fn(),
        updateLayer: jest.fn(),
        reorderLayers: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn(),
        reset: jest.fn(),
      })) as any;

      const { result } = renderHook(() => useEditorState(undefined, undefined, { store: mockStoreHook }));

      // Hook should initialize successfully with the injected store
      expect(result.current.state.layers).toEqual([]);
      expect(result.current.state.canvas.width).toBe(1920); // Default, since mock store has empty layers
    });

    it('uses default store when options.store not provided', () => {
      const { result } = renderHook(() => useEditorState());

      // Should work without options parameter
      expect(result.current.state).toBeDefined();
      expect(result.current.state.canvas.width).toBe(1920);
    });
  });
});
