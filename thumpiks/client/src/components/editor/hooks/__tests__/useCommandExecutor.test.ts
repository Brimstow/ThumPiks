/**
 * Retroactive tests for useCommandExecutor hook
 * Covers:
 *   Phase 1: Shape enum passed correctly to addShapeLayer
 *   Phase 2: Target resolution (selected, name-based, type-based, auto)
 *   Phase 3: rotateLayer, groupLayers, ungroupLayers, cropLayer
 *   Phase 4: Batch undo (startBatch/endBatch called)
 *   Phase 5: analyzeImage / vision return text
 */

import { renderHook } from '@testing-library/react';
import { useCommandExecutor } from '../useCommandExecutor';
import type { CommandExecutorCallbacks } from '../useCommandExecutor';

// Mock API utilities
jest.mock('../../../../utils/api', () => ({
  authPost: jest.fn(),
  createAIToolAbortController: jest.fn(() => ({
    controller: new AbortController(),
    timeoutId: setTimeout(() => {}, 60000),
  })),
}));

// ============================================================================
// Helpers
// ============================================================================

function createMockCallbacks(overrides: Partial<CommandExecutorCallbacks> = {}): CommandExecutorCallbacks {
  return {
    addTextLayer: jest.fn(),
    addShapeLayer: jest.fn(),
    addImageLayer: jest.fn(),
    updateLayer: jest.fn(),
    deleteLayer: jest.fn(),
    duplicateLayer: jest.fn(),
    selectLayer: jest.fn(),
    reorderLayers: jest.fn(),
    groupLayers: jest.fn(),
    ungroupLayers: jest.fn(),
    callBackendAI: jest.fn().mockResolvedValue([]),
    getLayers: jest.fn().mockReturnValue([]),
    getLayerOrder: jest.fn().mockReturnValue([]),
    getSelectedLayerIds: jest.fn().mockReturnValue([]),
    getCanvasSize: jest.fn().mockReturnValue({ width: 1920, height: 1080 }),
    startBatch: jest.fn(),
    endBatch: jest.fn(),
    getCanvasScreenshot: jest.fn().mockReturnValue('data:image/png;base64,abc123'),
    ...overrides,
  };
}

function makeTextLayer(id: string, name: string) {
  return {
    id,
    type: 'text' as const,
    name,
    visible: true,
    locked: false,
    transform: { x: 100, y: 50, width: 200, height: 40, rotation: 0 },
    opacity: 100,
    blendMode: 'normal',
    content: 'Hello',
    fontFamily: 'Arial',
    fontSize: 24,
    fill: '#FFFFFF',
  };
}

function makeImageLayer(id: string, name: string) {
  return {
    id,
    type: 'image' as const,
    name,
    visible: true,
    locked: false,
    transform: { x: 0, y: 0, width: 800, height: 600, rotation: 0 },
    opacity: 100,
    blendMode: 'normal',
    src: 'data:image/png;base64,testimage',
    filters: {},
  };
}

function makeGroupLayer(id: string, name: string) {
  return {
    id,
    type: 'group' as const,
    name,
    visible: true,
    locked: false,
    transform: { x: 0, y: 0, width: 400, height: 300, rotation: 0 },
    opacity: 100,
    blendMode: 'normal',
    children: ['l1', 'l2'],
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useCommandExecutor', () => {
  // ==========================================================================
  // Phase 1: Shape enum mismatch fix
  // ==========================================================================

  describe('Phase 1: addShape passes correct shape enum', () => {
    it('passes "ellipse" for ellipse shapes (not "circle")', async () => {
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'addShape',
        target: 'new',
        description: 'Add ellipse',
        params: { shape: 'ellipse', x: 100, y: 100, width: 200, height: 200 },
      });

      expect(callbacks.addShapeLayer).toHaveBeenCalledWith('ellipse', 100, 100, 200, 200);
    });

    it('passes "polygon" for polygon shapes (not "triangle")', async () => {
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'addShape',
        target: 'new',
        description: 'Add polygon',
        params: { shape: 'polygon', x: 50, y: 50, width: 150, height: 150 },
      });

      expect(callbacks.addShapeLayer).toHaveBeenCalledWith('polygon', 50, 50, 150, 150);
    });

    it('uses default dimensions when not provided', async () => {
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'addShape',
        target: 'new',
        description: 'Add default shape',
        params: { shape: 'rectangle' },
      });

      expect(callbacks.addShapeLayer).toHaveBeenCalledWith('rectangle', 100, 100, 200, 200);
    });
  });

  // ==========================================================================
  // Phase 2: Target resolution
  // ==========================================================================

  describe('Phase 2: target resolution', () => {
    it('resolves "selected" to the currently selected layer', async () => {
      const textLayer = makeTextLayer('t1', 'Title');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([textLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'updateText',
        target: 'selected',
        description: 'Update text',
        params: { text: 'New Text' },
      });

      expect(callbacks.updateLayer).toHaveBeenCalledWith('t1', expect.objectContaining({ content: 'New Text' }));
    });

    it('resolves by layer name (case-insensitive substring match)', async () => {
      const textLayer = makeTextLayer('t1', 'Main Title');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([textLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue([]),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'deleteLayer',
        target: 'title',
        description: 'Delete title',
        params: {},
      });

      expect(callbacks.deleteLayer).toHaveBeenCalledWith('t1');
    });

    it('throws error when target layer not found', async () => {
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([]),
        getSelectedLayerIds: jest.fn().mockReturnValue([]),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: 'deleteLayer',
          target: 'nonexistent',
          description: 'Delete',
          params: {},
        })
      ).rejects.toThrow(/could not find/i);
    });

    it('throws descriptive error for wrong layer type', async () => {
      const textLayer = makeTextLayer('t1', 'Title');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([textLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: 'removeBackground',
          target: 'selected',
          description: 'Remove bg',
          params: {},
        })
      ).rejects.toThrow(/not an image layer/i);
    });
  });

  // ==========================================================================
  // Phase 3: rotateLayer
  // ==========================================================================

  describe('Phase 3: rotateLayer', () => {
    it('rotates layer by specified angle', async () => {
      const imageLayer = makeImageLayer('img1', 'Photo');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([imageLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'rotateLayer',
        target: 'selected',
        description: 'Rotate 90 degrees',
        params: { angle: 90 },
      });

      expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
        transform: expect.objectContaining({ rotation: 90 }),
      });
    });

    it('accumulates rotation (existing 45 + 90 = 135)', async () => {
      const imageLayer = {
        ...makeImageLayer('img1', 'Photo'),
        transform: { x: 0, y: 0, width: 800, height: 600, rotation: 45 },
      };
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([imageLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'rotateLayer',
        target: 'selected',
        description: 'Rotate 90 more',
        params: { angle: 90 },
      });

      expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
        transform: expect.objectContaining({ rotation: 135 }),
      });
    });

    it('wraps rotation at 360 degrees', async () => {
      const imageLayer = {
        ...makeImageLayer('img1', 'Photo'),
        transform: { x: 0, y: 0, width: 800, height: 600, rotation: 350 },
      };
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([imageLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'rotateLayer',
        target: 'selected',
        description: 'Rotate 20 more',
        params: { angle: 20 },
      });

      expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
        transform: expect.objectContaining({ rotation: 10 }),
      });
    });

    it('throws when angle param is missing', async () => {
      const imageLayer = makeImageLayer('img1', 'Photo');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([imageLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: 'rotateLayer',
          target: 'selected',
          description: 'Rotate',
          params: {},
        })
      ).rejects.toThrow(/angle/i);
    });
  });

  // ==========================================================================
  // Phase 3: groupLayers
  // ==========================================================================

  describe('Phase 3: groupLayers', () => {
    it('resolves layer names to IDs and calls groupLayers callback', async () => {
      const layers = [
        makeTextLayer('t1', 'Title'),
        makeImageLayer('img1', 'Background'),
      ];
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue(layers),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'groupLayers',
        target: 'new',
        description: 'Group title and background',
        params: { layerNames: ['Title', 'Background'] },
      });

      expect(callbacks.groupLayers).toHaveBeenCalledWith(['t1', 'img1']);
    });

    it('throws when fewer than 2 layer names provided', async () => {
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: 'groupLayers',
          target: 'new',
          description: 'Group one',
          params: { layerNames: ['Solo'] },
        })
      ).rejects.toThrow(/at least 2/i);
    });

    it('throws when a named layer cannot be found', async () => {
      const layers = [makeTextLayer('t1', 'Title')];
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue(layers),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: 'groupLayers',
          target: 'new',
          description: 'Group',
          params: { layerNames: ['Title', 'Nonexistent'] },
        })
      ).rejects.toThrow(/could not find layer/i);
    });
  });

  // ==========================================================================
  // Phase 3: ungroupLayers
  // ==========================================================================

  describe('Phase 3: ungroupLayers', () => {
    it('ungroups a group layer', async () => {
      const groupLayer = makeGroupLayer('g1', 'My Group');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([groupLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['g1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'ungroupLayers',
        target: 'selected',
        description: 'Ungroup',
        params: {},
      });

      expect(callbacks.ungroupLayers).toHaveBeenCalledWith('g1');
    });

    it('throws when target is not a group layer', async () => {
      const textLayer = makeTextLayer('t1', 'Title');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([textLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: 'ungroupLayers',
          target: 'selected',
          description: 'Ungroup',
          params: {},
        })
      ).rejects.toThrow(/not a group layer/i);
    });
  });

  // ==========================================================================
  // Phase 3: cropLayer
  // ==========================================================================

  describe('Phase 3: cropLayer', () => {
    it('throws when target is not an image layer', async () => {
      const textLayer = makeTextLayer('t1', 'Title');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([textLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: 'cropLayer',
          target: 'selected',
          description: 'Crop',
          params: { region: 'top-half' },
        })
      ).rejects.toThrow(/not an image layer/i);
    });

    it('throws for unknown crop region', async () => {
      // cropLayer with image target but invalid region
      const imgLayer = makeImageLayer('img1', 'Photo');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([imgLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: 'cropLayer',
          target: 'selected',
          description: 'Crop unknown region',
          params: { region: 'invalid-region' },
        })
      ).rejects.toThrow(/unknown crop region/i);
    });
  });

  // ==========================================================================
  // Phase 5: analyzeImage returns text
  // ==========================================================================

  describe('Phase 5: analyzeImage returns description text', () => {
    it('returns text from vision API response', async () => {
      const { authPost } = require('../../../../utils/api');
      authPost.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ description: 'A colorful thumbnail with a person and text overlay' }),
      });

      const imgLayer = makeImageLayer('img1', 'Photo');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([imgLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      const text = await result.current.executeAction({
        action: 'analyzeImage',
        target: 'selected',
        description: 'Analyze image',
        params: {},
      });

      expect(text).toBe('A colorful thumbnail with a person and text overlay');
    });

    it('falls back to canvas screenshot when no image layer targeted', async () => {
      const { authPost } = require('../../../../utils/api');
      authPost.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ description: 'Canvas with two layers' }),
      });

      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([]),
        getSelectedLayerIds: jest.fn().mockReturnValue([]),
        getCanvasScreenshot: jest.fn().mockReturnValue('data:image/png;base64,screenshot'),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      const text = await result.current.executeAction({
        action: 'analyzeImage',
        target: 'auto',
        description: 'Analyze',
        params: {},
      });

      expect(text).toBe('Canvas with two layers');
      expect(authPost).toHaveBeenCalledWith('/api/vision/describe', expect.objectContaining({
        imageBase64: 'data:image/png;base64,screenshot',
      }));
    });

    it('throws when no image source available', async () => {
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([]),
        getSelectedLayerIds: jest.fn().mockReturnValue([]),
        getCanvasScreenshot: jest.fn().mockReturnValue(null),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: 'analyzeImage',
          target: 'auto',
          description: 'Analyze',
          params: {},
        })
      ).rejects.toThrow(/no image available/i);
    });
  });

  // ==========================================================================
  // Phase 5: vision returns text
  // ==========================================================================

  describe('Phase 5: vision returns description text', () => {
    it('returns text from vision describe endpoint', async () => {
      const { authPost } = require('../../../../utils/api');
      authPost.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ description: 'Bright gaming thumbnail' }),
      });

      const imgLayer = makeImageLayer('img1', 'Photo');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([imgLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      const text = await result.current.executeAction({
        action: 'vision',
        target: 'selected',
        description: 'Describe image',
        params: {},
      });

      expect(text).toBe('Bright gaming thumbnail');
    });
  });

  // ==========================================================================
  // executeAll
  // ==========================================================================

  describe('executeAll', () => {
    it('executes all actions and returns count', async () => {
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([makeTextLayer('t1', 'Title')]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      const outcome = await result.current.executeAll({
        success: true,
        actions: [
          { action: 'deleteLayer', target: 'selected', description: 'Delete', params: {} },
        ],
        summary: 'Delete layer',
        needsAutoTarget: false,
      });

      expect(outcome.executed).toBe(1);
      expect(outcome.errors).toHaveLength(0);
    });

    it('collects errors without stopping execution', async () => {
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([]),
        getSelectedLayerIds: jest.fn().mockReturnValue([]),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      const outcome = await result.current.executeAll({
        success: true,
        actions: [
          { action: 'deleteLayer', target: 'selected', description: 'Delete selected', params: {} },
          { action: 'addText', target: 'new', description: 'Add text', params: { text: 'Hi' } },
        ],
        summary: 'Multi-action',
        needsAutoTarget: false,
      });

      // First action fails (no target), second succeeds
      expect(outcome.errors.length).toBeGreaterThanOrEqual(1);
      expect(outcome.executed).toBe(1);
    });
  });

  // ==========================================================================
  // buildContext
  // ==========================================================================

  describe('buildContext', () => {
    it('returns canvas size and empty layers array', () => {
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      const ctx = result.current.buildContext();
      expect(ctx.width).toBe(1920);
      expect(ctx.height).toBe(1080);
      expect(ctx.layers).toEqual([]);
    });

    it('maps layer transform and metadata to LayerContext', () => {
      const textLayer = makeTextLayer('t1', 'Title');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([textLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      const ctx = result.current.buildContext();
      expect(ctx.layers).toHaveLength(1);
      expect(ctx.layers[0]).toEqual(expect.objectContaining({
        id: 't1',
        type: 'text',
        name: 'Title',
        selected: true,
        x: 100,
        y: 50,
        width: 200,
        height: 40,
        text: 'Hello',
        font: 'Arial',
        fontSize: 24,
        color: '#FFFFFF',
      }));
    });
  });

  // ==========================================================================
  // Phase 6: addEffect / removeEffect
  // ==========================================================================

  describe('Phase 6: addEffect / removeEffect', () => {
    function makeLayerWithEffects(id: string, name: string, effects: any[] = []) {
      return {
        ...makeImageLayer(id, name),
        effects,
      };
    }

    describe('addEffect', () => {
      it('adds shadow effect with defaults when only effectType specified', async () => {
        const layer = makeLayerWithEffects('img1', 'Photo');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'addEffect',
          target: 'selected',
          description: 'Add shadow',
          params: { effectType: 'shadow' },
        });

        expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
          effects: [expect.objectContaining({
            type: 'shadow',
            enabled: true,
            settings: expect.objectContaining({
              color: '#000000',
              offsetX: 4,
              offsetY: 4,
              blur: 8,
              opacity: 80,
            }),
          })],
        });
      });

      it('merges AI-provided params over defaults', async () => {
        const layer = makeLayerWithEffects('img1', 'Photo');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'addEffect',
          target: 'selected',
          description: 'Add red shadow',
          params: { effectType: 'shadow', color: '#FF0000', blur: 20 },
        });

        expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
          effects: [expect.objectContaining({
            type: 'shadow',
            enabled: true,
            settings: expect.objectContaining({
              color: '#FF0000',
              blur: 20,
              offsetX: 4,  // default preserved
              offsetY: 4,  // default preserved
            }),
          })],
        });
      });

      it('replaces existing effect of same type', async () => {
        const existingShadow = { id: 'old-shadow', type: 'shadow', enabled: true, settings: { color: '#000000', offsetX: 2, offsetY: 2, blur: 4, opacity: 50 } };
        const layer = makeLayerWithEffects('img1', 'Photo', [existingShadow]);
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'addEffect',
          target: 'selected',
          description: 'Replace shadow',
          params: { effectType: 'shadow', color: '#FF0000' },
        });

        const call = (callbacks.updateLayer as jest.Mock).mock.calls[0];
        const effects = call[1].effects;
        expect(effects).toHaveLength(1);
        expect(effects[0].settings.color).toBe('#FF0000');
      });

      it('preserves effects of different types', async () => {
        const existingBlur = { id: 'blur-1', type: 'blur', enabled: true, settings: { radius: 4, opacity: 100 } };
        const layer = makeLayerWithEffects('img1', 'Photo', [existingBlur]);
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'addEffect',
          target: 'selected',
          description: 'Add shadow',
          params: { effectType: 'shadow' },
        });

        const call = (callbacks.updateLayer as jest.Mock).mock.calls[0];
        const effects = call[1].effects;
        expect(effects).toHaveLength(2);
        expect(effects.find((e: any) => e.type === 'blur')).toBeDefined();
        expect(effects.find((e: any) => e.type === 'shadow')).toBeDefined();
      });

      it('throws when target layer not found', async () => {
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([]),
          getSelectedLayerIds: jest.fn().mockReturnValue([]),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await expect(
          result.current.executeAction({
            action: 'addEffect',
            target: 'selected',
            description: 'Add shadow',
            params: { effectType: 'shadow' },
          })
        ).rejects.toThrow(/could not find target layer/i);
      });

      it('glow defaults have offsetX and offsetY of 0', async () => {
        const layer = makeLayerWithEffects('img1', 'Photo');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'addEffect',
          target: 'selected',
          description: 'Add glow',
          params: { effectType: 'glow' },
        });

        expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
          effects: [expect.objectContaining({
            type: 'glow',
            settings: expect.objectContaining({
              offsetX: 0,
              offsetY: 0,
              blur: 15,
            }),
          })],
        });
      });

      it('bevel defaults include angle, lightColor, and shadowColor', async () => {
        const layer = makeLayerWithEffects('img1', 'Photo');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'addEffect',
          target: 'selected',
          description: 'Add bevel',
          params: { effectType: 'bevel' },
        });

        expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
          effects: [expect.objectContaining({
            type: 'bevel',
            settings: expect.objectContaining({
              lightColor: '#FFFFFF',
              shadowColor: '#000000',
              depth: 3,
              angle: 135,
            }),
          })],
        });
      });

      it('maps spread param to width for stroke effect', async () => {
        const layer = makeLayerWithEffects('img1', 'Photo');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'addEffect',
          target: 'selected',
          description: 'Add stroke',
          params: { effectType: 'stroke', spread: 5, color: '#FF0000' },
        });

        expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
          effects: [expect.objectContaining({
            type: 'stroke',
            settings: expect.objectContaining({
              width: 5,
              color: '#FF0000',
            }),
          })],
        });
      });
    });

    describe('removeEffect', () => {
      it('removes matching effect type from layer', async () => {
        const existingShadow = { id: 'shadow-1', type: 'shadow', enabled: true, settings: { color: '#000000', offsetX: 4, offsetY: 4, blur: 8, opacity: 80 } };
        const layer = makeLayerWithEffects('img1', 'Photo', [existingShadow]);
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'removeEffect',
          target: 'selected',
          description: 'Remove shadow',
          params: { effectType: 'shadow' },
        });

        expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
          effects: [],
        });
      });

      it('is idempotent when effect does not exist', async () => {
        const layer = makeLayerWithEffects('img1', 'Photo', []);
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'removeEffect',
          target: 'selected',
          description: 'Remove blur',
          params: { effectType: 'blur' },
        });

        expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
          effects: [],
        });
      });

      it('preserves effects of other types', async () => {
        const shadow = { id: 'shadow-1', type: 'shadow', enabled: true, settings: { color: '#000000', offsetX: 4, offsetY: 4, blur: 8, opacity: 80 } };
        const blur = { id: 'blur-1', type: 'blur', enabled: true, settings: { radius: 4, opacity: 100 } };
        const layer = makeLayerWithEffects('img1', 'Photo', [shadow, blur]);
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'removeEffect',
          target: 'selected',
          description: 'Remove shadow',
          params: { effectType: 'shadow' },
        });

        const call = (callbacks.updateLayer as jest.Mock).mock.calls[0];
        const effects = call[1].effects;
        expect(effects).toHaveLength(1);
        expect(effects[0].type).toBe('blur');
      });

      it('throws when target layer not found', async () => {
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([]),
          getSelectedLayerIds: jest.fn().mockReturnValue([]),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await expect(
          result.current.executeAction({
            action: 'removeEffect',
            target: 'selected',
            description: 'Remove shadow',
            params: { effectType: 'shadow' },
          })
        ).rejects.toThrow(/could not find target layer/i);
      });
    });
  });

  // ==========================================================================
  // Phase 7: faceSwap error reporting & executeAll batch undo
  // ==========================================================================

  describe('Phase 7: faceSwap + batch undo', () => {
    describe('faceSwap error reporting', () => {
      it('throws when target layer is not found', async () => {
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([]),
          getSelectedLayerIds: jest.fn().mockReturnValue([]),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await expect(
          result.current.executeAction({
            action: 'faceSwap',
            target: 'selected',
            description: 'Swap face',
            params: { prompt: 'new face' },
          })
        ).rejects.toThrow(/could not find target layer/i);
      });

      it('throws when target layer is not an image', async () => {
        const textLayer = makeTextLayer('t1', 'Title');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([textLayer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await expect(
          result.current.executeAction({
            action: 'faceSwap',
            target: 'selected',
            description: 'Swap face',
            params: { prompt: 'new face' },
          })
        ).rejects.toThrow(/not an image layer/i);
      });
    });

    describe('executeAll batch undo', () => {
      it('calls startBatch before executing actions', async () => {
        const layer = makeTextLayer('t1', 'Title');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAll({
          success: true,
          actions: [
            { action: 'deleteLayer', target: 'selected', description: 'Delete', params: {} },
          ],
          summary: 'AI command',
          needsAutoTarget: false,
        });

        expect(callbacks.startBatch).toHaveBeenCalledTimes(1);
        expect(callbacks.startBatch).toHaveBeenCalledWith('AI command');
      });

      it('calls endBatch after all actions complete', async () => {
        const layer = makeTextLayer('t1', 'Title');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAll({
          success: true,
          actions: [
            { action: 'deleteLayer', target: 'selected', description: 'Delete', params: {} },
          ],
          summary: 'AI command',
          needsAutoTarget: false,
        });

        expect(callbacks.endBatch).toHaveBeenCalledTimes(1);
      });

      it('calls endBatch even when actions fail', async () => {
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([]),
          getSelectedLayerIds: jest.fn().mockReturnValue([]),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAll({
          success: true,
          actions: [
            { action: 'deleteLayer', target: 'selected', description: 'Delete', params: {} },
          ],
          summary: 'Failing action',
          needsAutoTarget: false,
        });

        // endBatch must be called even on failure (like finally)
        expect(callbacks.endBatch).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ==========================================================================
  // Retroactive: Layer Management Actions
  // ==========================================================================

  describe('Layer management actions', () => {
    describe('duplicateLayer', () => {
      it('calls duplicateLayer callback with target id', async () => {
        const layer = makeTextLayer('t1', 'Title');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'duplicateLayer',
          target: 'selected',
          description: 'Duplicate layer',
          params: {},
        });

        expect(callbacks.duplicateLayer).toHaveBeenCalledWith('t1');
      });

      it('throws when target not found', async () => {
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([]),
          getSelectedLayerIds: jest.fn().mockReturnValue([]),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await expect(
          result.current.executeAction({
            action: 'duplicateLayer',
            target: 'selected',
            description: 'Duplicate layer',
            params: {},
          })
        ).rejects.toThrow(/could not find target layer/i);
      });
    });

    describe('reorderLayer', () => {
      it('moves layer up one position', async () => {
        const layer1 = makeTextLayer('t1', 'Bottom');
        const layer2 = makeTextLayer('t2', 'Top');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer1, layer2]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
          getLayerOrder: jest.fn().mockReturnValue(['t1', 't2']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'reorderLayer',
          target: 'selected',
          description: 'Move up',
          params: { direction: 'up' },
        });

        expect(callbacks.reorderLayers).toHaveBeenCalledWith(['t2', 't1']);
      });

      it('moves layer to top', async () => {
        const layer1 = makeTextLayer('t1', 'Bottom');
        const layer2 = makeTextLayer('t2', 'Middle');
        const layer3 = makeTextLayer('t3', 'Top');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer1, layer2, layer3]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
          getLayerOrder: jest.fn().mockReturnValue(['t1', 't2', 't3']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'reorderLayer',
          target: 'selected',
          description: 'Move to top',
          params: { direction: 'top' },
        });

        expect(callbacks.reorderLayers).toHaveBeenCalledWith(['t2', 't3', 't1']);
      });

      it('moves layer to bottom', async () => {
        const layer1 = makeTextLayer('t1', 'Bottom');
        const layer2 = makeTextLayer('t2', 'Middle');
        const layer3 = makeTextLayer('t3', 'Top');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer1, layer2, layer3]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['t3']),
          getLayerOrder: jest.fn().mockReturnValue(['t1', 't2', 't3']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'reorderLayer',
          target: 'selected',
          description: 'Move to bottom',
          params: { direction: 'bottom' },
        });

        expect(callbacks.reorderLayers).toHaveBeenCalledWith(['t3', 't1', 't2']);
      });
    });

    describe('moveLayer', () => {
      it('moves layer to absolute x/y position', async () => {
        const layer = makeTextLayer('t1', 'Title');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'moveLayer',
          target: 'selected',
          description: 'Move to position',
          params: { x: 300, y: 150 },
        });

        expect(callbacks.updateLayer).toHaveBeenCalledWith('t1', {
          transform: expect.objectContaining({ x: 300, y: 150 }),
        });
      });

      it('moves layer to named center position', async () => {
        const layer = makeTextLayer('t1', 'Title');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
          getCanvasSize: jest.fn().mockReturnValue({ width: 1920, height: 1080 }),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'moveLayer',
          target: 'selected',
          description: 'Move to center',
          params: { position: 'center' },
        });

        const call = (callbacks.updateLayer as jest.Mock).mock.calls[0];
        const transform = call[1].transform;
        // Layer is 200x40, canvas is 1920x1080 -> center x = (1920-200)/2 = 860, y = (1080-40)/2 = 520
        expect(transform.x).toBe(860);
        expect(transform.y).toBe(520);
      });

      it('throws when target not found', async () => {
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([]),
          getSelectedLayerIds: jest.fn().mockReturnValue([]),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await expect(
          result.current.executeAction({
            action: 'moveLayer',
            target: 'selected',
            description: 'Move',
            params: { x: 0, y: 0 },
          })
        ).rejects.toThrow(/could not find target layer/i);
      });
    });

    describe('resizeLayer', () => {
      it('resizes layer by scale factor', async () => {
        const layer = makeImageLayer('img1', 'Photo');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'resizeLayer',
          target: 'selected',
          description: 'Scale up',
          params: { scale: 2 },
        });

        const call = (callbacks.updateLayer as jest.Mock).mock.calls[0];
        const transform = call[1].transform;
        // Original: 800x600, scale 2x -> 1600x1200
        expect(transform.width).toBe(1600);
        expect(transform.height).toBe(1200);
      });

      it('resizes layer to explicit width/height', async () => {
        const layer = makeImageLayer('img1', 'Photo');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'resizeLayer',
          target: 'selected',
          description: 'Resize',
          params: { width: 400, height: 300 },
        });

        const call = (callbacks.updateLayer as jest.Mock).mock.calls[0];
        const transform = call[1].transform;
        expect(transform.width).toBe(400);
        expect(transform.height).toBe(300);
      });

      it('throws when target not found', async () => {
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([]),
          getSelectedLayerIds: jest.fn().mockReturnValue([]),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await expect(
          result.current.executeAction({
            action: 'resizeLayer',
            target: 'selected',
            description: 'Resize',
            params: { scale: 2 },
          })
        ).rejects.toThrow(/could not find target layer/i);
      });
    });

    describe('selectLayer', () => {
      it('selects layer matching name query', async () => {
        const layer = makeTextLayer('t1', 'Title');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue([]),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'selectLayer',
          target: '',
          description: 'Select Title',
          params: { query: 'title' },
        });

        expect(callbacks.selectLayer).toHaveBeenCalledWith('t1');
      });

      it('selects layer matching type query', async () => {
        const layer = makeImageLayer('img1', 'My Photo');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue([]),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'selectLayer',
          target: '',
          description: 'Select image',
          params: { query: 'image' },
        });

        expect(callbacks.selectLayer).toHaveBeenCalledWith('img1');
      });

      it('throws when no matching layer found', async () => {
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([makeTextLayer('t1', 'Title')]),
          getSelectedLayerIds: jest.fn().mockReturnValue([]),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await expect(
          result.current.executeAction({
            action: 'selectLayer',
            target: '',
            description: 'Select photo',
            params: { query: 'nonexistent' },
          })
        ).rejects.toThrow(/could not find a layer matching/i);
      });
    });

    describe('adjustImage', () => {
      it('applies filter adjustments to image layer', async () => {
        const layer = makeImageLayer('img1', 'Photo');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'adjustImage',
          target: 'selected',
          description: 'Adjust brightness',
          params: { brightness: 120, contrast: 110 },
        });

        expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', {
          filters: { brightness: 120, contrast: 110 },
        });
      });

      it('applies opacity as separate update', async () => {
        const layer = makeImageLayer('img1', 'Photo');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await result.current.executeAction({
          action: 'adjustImage',
          target: 'selected',
          description: 'Adjust opacity',
          params: { opacity: 50 },
        });

        expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', { opacity: 0.5 });
      });

      it('throws when target is not an image', async () => {
        const layer = makeTextLayer('t1', 'Title');
        const callbacks = createMockCallbacks({
          getLayers: jest.fn().mockReturnValue([layer]),
          getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
        });
        const { result } = renderHook(() => useCommandExecutor(callbacks));

        await expect(
          result.current.executeAction({
            action: 'adjustImage',
            target: 'selected',
            description: 'Adjust',
            params: { brightness: 120 },
          })
        ).rejects.toThrow(/not an image layer/i);
      });
    });
  });

  // ==========================================================================
  // Retroactive: AI backend action error paths
  // ==========================================================================

  describe('AI backend action error paths', () => {
    it.each([
      ['removeBackground'],
      ['enhance'],
      ['upscale'],
      ['inpaint'],
    ])('%s throws when target not found', async (actionName) => {
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([]),
        getSelectedLayerIds: jest.fn().mockReturnValue([]),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: actionName,
          target: 'selected',
          description: `Run ${actionName}`,
          params: { prompt: 'test' },
        })
      ).rejects.toThrow(/could not find target layer/i);
    });

    it.each([
      ['removeBackground'],
      ['enhance'],
      ['upscale'],
      ['inpaint'],
    ])('%s throws when target is not an image', async (actionName) => {
      const textLayer = makeTextLayer('t1', 'Title');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([textLayer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['t1']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await expect(
        result.current.executeAction({
          action: actionName,
          target: 'selected',
          description: `Run ${actionName}`,
          params: { prompt: 'test' },
        })
      ).rejects.toThrow(/not an image layer/i);
    });

    it('generate calls callBackendAI and adds result as image layer', async () => {
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([]),
        getSelectedLayerIds: jest.fn().mockReturnValue([]),
        callBackendAI: jest.fn().mockResolvedValue(['data:image/png;base64,generated']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'generate',
        target: '',
        description: 'Generate image',
        params: { prompt: 'a sunset', style: 'realistic' },
      });

      expect(callbacks.callBackendAI).toHaveBeenCalledWith('generate', {
        prompt: 'a sunset',
        style: 'realistic',
      });
      expect(callbacks.addImageLayer).toHaveBeenCalledWith('data:image/png;base64,generated', 'AI Generated');
    });

    it('removeBackground updates layer src on success', async () => {
      const layer = makeImageLayer('img1', 'Photo');
      const callbacks = createMockCallbacks({
        getLayers: jest.fn().mockReturnValue([layer]),
        getSelectedLayerIds: jest.fn().mockReturnValue(['img1']),
        callBackendAI: jest.fn().mockResolvedValue(['data:image/png;base64,nobg']),
      });
      const { result } = renderHook(() => useCommandExecutor(callbacks));

      await result.current.executeAction({
        action: 'removeBackground',
        target: 'selected',
        description: 'Remove background',
        params: {},
      });

      expect(callbacks.updateLayer).toHaveBeenCalledWith('img1', { src: 'data:image/png;base64,nobg' });
    });
  });
});
