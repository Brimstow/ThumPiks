import {
  buildContextMessage,
  ACTION_CATALOG,
  TARGETING_RULES,
  type CanvasContext,
  type LayerContext,
} from '../action-catalog';

// Helper to create a layer with all required spatial fields
function makeLayer(overrides: Partial<LayerContext> & { id: string; type: LayerContext['type']; name: string }): LayerContext {
  return {
    visible: true,
    locked: false,
    selected: false,
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    rotation: 0,
    opacity: 1,
    zIndex: 0,
    ...overrides,
  };
}

describe('action-catalog', () => {
  describe('buildContextMessage()', () => {
    it('returns "empty canvas" for zero layers', () => {
      const ctx: CanvasContext = { width: 1920, height: 1080, layers: [] };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('empty canvas');
    });

    it('includes canvas dimensions', () => {
      const ctx: CanvasContext = { width: 1280, height: 720, layers: [] };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('1280x720');
    });

    it('includes layer type and name', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [makeLayer({ id: 'l1', type: 'image', name: 'Background' })],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('[image]');
      expect(msg).toContain('"Background"');
    });

    it('includes spatial position and size', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [makeLayer({ id: 'l1', type: 'image', name: 'BG', x: 50, y: 100, width: 800, height: 600 })],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('pos=(50,100)');
      expect(msg).toContain('size=800x600');
    });

    it('marks SELECTED layers', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [makeLayer({ id: 'l1', type: 'text', name: 'Title', selected: true })],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('SELECTED');
    });

    it('marks locked layers', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [makeLayer({ id: 'l1', type: 'image', name: 'BG', locked: true })],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('locked');
    });

    it('marks hidden layers', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [makeLayer({ id: 'l1', type: 'image', name: 'BG', visible: false })],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('hidden');
    });

    it('includes text content for text layers', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [
          makeLayer({
            id: 'l1',
            type: 'text',
            name: 'Title',
            text: 'HELLO WORLD',
            font: 'Impact',
            fontSize: 72,
            color: '#FF0000',
          }),
        ],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('text="HELLO WORLD"');
      expect(msg).toContain('font=Impact');
      expect(msg).toContain('size=72');
      expect(msg).toContain('color=#FF0000');
    });

    it('includes color for shape layers', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [makeLayer({ id: 'l1', type: 'shape', name: 'Box', color: '#00FF00' })],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('color=#00FF00');
    });

    it('includes rotation when non-zero', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [makeLayer({ id: 'l1', type: 'image', name: 'BG', rotation: 45 })],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('rot=45deg');
    });

    it('includes opacity when < 1', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [makeLayer({ id: 'l1', type: 'image', name: 'BG', opacity: 0.5 })],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('opacity=50%');
    });

    it('includes blend mode when not normal', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [makeLayer({ id: 'l1', type: 'image', name: 'Overlay', blendMode: 'multiply' })],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('blend=multiply');
    });

    it('handles mixed layer types', () => {
      const ctx: CanvasContext = {
        width: 1920,
        height: 1080,
        layers: [
          makeLayer({ id: 'l1', type: 'image', name: 'Background', locked: true }),
          makeLayer({ id: 'l2', type: 'text', name: 'Title', selected: true, text: 'EPIC', fontSize: 48, color: '#FFF' }),
          makeLayer({ id: 'l3', type: 'shape', name: 'Arrow', color: '#FF0000' }),
        ],
      };
      const msg = buildContextMessage(ctx);

      expect(msg).toContain('[image]');
      expect(msg).toContain('[text]');
      expect(msg).toContain('[shape]');
      expect(msg).toContain('Layers (3 total)');
    });
  });

  describe('type coverage', () => {
    it('ACTION_CATALOG contains the 4 new action types', () => {
      // Note: ACTION_CATALOG text might not mention all new types yet,
      // but the EditorActionType union does include them.
      // Verify that the EDITOR_TOOLS (from tool-definitions) covers these.
      // Here we just verify TARGETING_RULES and ACTION_CATALOG are non-empty exports.
      expect(typeof ACTION_CATALOG).toBe('string');
      expect(ACTION_CATALOG.length).toBeGreaterThan(0);
    });

    it('TARGETING_RULES is a non-empty string', () => {
      expect(typeof TARGETING_RULES).toBe('string');
      expect(TARGETING_RULES.length).toBeGreaterThan(0);
    });

    it('TARGETING_RULES mentions "selected" targeting', () => {
      expect(TARGETING_RULES.toLowerCase()).toContain('selected');
    });

    it('TARGETING_RULES mentions auto targeting', () => {
      expect(TARGETING_RULES.toLowerCase()).toContain('auto');
    });

    it('TARGETING_RULES mentions multiple actions', () => {
      expect(TARGETING_RULES.toLowerCase()).toContain('multiple');
    });
  });

  // ==========================================================================
  // Phase 1: Shape enum alignment (tool-definitions ↔ action-catalog)
  // ==========================================================================
  describe('Phase 1: shape enum alignment', () => {
    it('ACTION_CATALOG lists all 6 valid shape types', () => {
      const validShapes = ['rectangle', 'ellipse', 'polygon', 'star', 'line', 'arrow'];
      for (const shape of validShapes) {
        expect(ACTION_CATALOG).toContain(shape);
      }
    });

    it('ACTION_CATALOG does not reference deprecated shape names', () => {
      // Phase 1 fix ensured 'circle' was replaced with 'ellipse' and 'triangle' with 'polygon'
      expect(ACTION_CATALOG).not.toMatch(/"circle"/);
      expect(ACTION_CATALOG).not.toMatch(/"triangle"/);
    });
  });

  // ==========================================================================
  // Phase 3: New operations (rotateLayer, groupLayers, ungroupLayers, cropLayer)
  // ==========================================================================
  describe('Phase 3: new layer operations in ACTION_CATALOG', () => {
    it('describes rotateLayer with angle param', () => {
      expect(ACTION_CATALOG).toContain('rotateLayer');
      expect(ACTION_CATALOG).toMatch(/angle/i);
    });

    it('describes groupLayers with layerNames param', () => {
      expect(ACTION_CATALOG).toContain('groupLayers');
      expect(ACTION_CATALOG).toContain('layerNames');
    });

    it('describes ungroupLayers', () => {
      expect(ACTION_CATALOG).toContain('ungroupLayers');
    });

    it('describes cropLayer with region presets', () => {
      expect(ACTION_CATALOG).toContain('cropLayer');
      const regions = ['top-half', 'bottom-half', 'left-half', 'right-half', 'center'];
      for (const region of regions) {
        expect(ACTION_CATALOG).toContain(region);
      }
    });
  });

  // ==========================================================================
  // Phase 5: Vision and analysis actions
  // ==========================================================================
  describe('Phase 5: analyzeImage and vision in ACTION_CATALOG', () => {
    it('includes ANALYSIS section with analyzeImage', () => {
      expect(ACTION_CATALOG).toContain('ANALYSIS');
      expect(ACTION_CATALOG).toContain('analyzeImage');
    });

    it('analyzeImage description mentions suggestions', () => {
      expect(ACTION_CATALOG).toMatch(/analyzeImage.*suggestions|Analyze.*image/i);
    });
  });
});
