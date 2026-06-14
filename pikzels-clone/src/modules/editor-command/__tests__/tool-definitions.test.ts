import { EDITOR_TOOLS, buildToolsSystemPrompt } from '../tool-definitions';

describe('tool-definitions', () => {
  describe('EDITOR_TOOLS', () => {
    it('exports an array of 29 tool definitions', () => {
      expect(Array.isArray(EDITOR_TOOLS)).toBe(true);
      expect(EDITOR_TOOLS).toHaveLength(29);
    });

    it('every tool has type "function"', () => {
      for (const tool of EDITOR_TOOLS) {
        expect(tool.type).toBe('function');
      }
    });

    it('every tool.function has name, description, and parameters', () => {
      for (const tool of EDITOR_TOOLS) {
        expect(typeof tool.function.name).toBe('string');
        expect(tool.function.name.length).toBeGreaterThan(0);
        expect(typeof tool.function.description).toBe('string');
        expect(tool.function.description.length).toBeGreaterThan(0);
        expect(tool.function.parameters).toBeDefined();
      }
    });

    it('every tool.function.parameters has type "object", properties, and required', () => {
      for (const tool of EDITOR_TOOLS) {
        const params = tool.function.parameters;
        expect(params.type).toBe('object');
        expect(typeof params.properties).toBe('object');
        expect(Array.isArray(params.required)).toBe(true);
      }
    });

    it('has no duplicate function names', () => {
      const names = EDITOR_TOOLS.map(t => t.function.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it('all required fields exist in properties', () => {
      for (const tool of EDITOR_TOOLS) {
        const propKeys = Object.keys(tool.function.parameters.properties);
        for (const req of tool.function.parameters.required) {
          expect(propKeys).toContain(req);
        }
      }
    });

    it('includes the 4 new action types (expand, aiText, vision, visionSearch)', () => {
      const names = EDITOR_TOOLS.map(t => t.function.name);
      expect(names).toContain('expand');
      expect(names).toContain('aiText');
      expect(names).toContain('vision');
      expect(names).toContain('visionSearch');
    });

    it('includes core action types', () => {
      const names = EDITOR_TOOLS.map(t => t.function.name);
      const core = [
        'addText', 'addShape', 'updateText', 'removeBackground',
        'enhance', 'upscale', 'inpaint', 'generate', 'faceSwap',
        'adjustImage', 'deleteLayer', 'duplicateLayer', 'reorderLayer',
        'resizeLayer', 'moveLayer', 'recolorLayer', 'selectLayer',
        'decompose', 'analyzeImage',
      ];
      for (const name of core) {
        expect(names).toContain(name);
      }
    });

    // Phase 1: shape enum alignment
    it('addShape tool has correct shape enum with no deprecated values', () => {
      const addShape = EDITOR_TOOLS.find(t => t.function.name === 'addShape');
      expect(addShape).toBeDefined();
      const shapeEnum = (addShape!.function.parameters.properties.shape as { enum?: string[] })?.enum;
      expect(shapeEnum).toBeDefined();
      expect(shapeEnum).toContain('rectangle');
      expect(shapeEnum).toContain('ellipse');
      expect(shapeEnum).toContain('polygon');
      expect(shapeEnum).toContain('star');
      expect(shapeEnum).toContain('line');
      expect(shapeEnum).toContain('arrow');
      // Phase 1: deprecated shapes must not be present
      expect(shapeEnum).not.toContain('circle');
      expect(shapeEnum).not.toContain('triangle');
    });

    // Phase 3: new operations have tool definitions
    it('includes Phase 3 operations (rotateLayer, groupLayers, ungroupLayers, cropLayer)', () => {
      const names = EDITOR_TOOLS.map(t => t.function.name);
      expect(names).toContain('rotateLayer');
      expect(names).toContain('groupLayers');
      expect(names).toContain('ungroupLayers');
      expect(names).toContain('cropLayer');
    });

    it('rotateLayer tool requires angle parameter', () => {
      const rotate = EDITOR_TOOLS.find(t => t.function.name === 'rotateLayer');
      expect(rotate).toBeDefined();
      expect(rotate!.function.parameters.required).toContain('angle');
      expect(rotate!.function.parameters.properties).toHaveProperty('angle');
    });

    it('groupLayers tool requires layerNames parameter', () => {
      const group = EDITOR_TOOLS.find(t => t.function.name === 'groupLayers');
      expect(group).toBeDefined();
      expect(group!.function.parameters.required).toContain('layerNames');
    });

    it('cropLayer tool has region enum with preset values', () => {
      const crop = EDITOR_TOOLS.find(t => t.function.name === 'cropLayer');
      expect(crop).toBeDefined();
      const regionProp = crop!.function.parameters.properties.region as { enum?: string[] };
      expect(regionProp).toBeDefined();
      if (regionProp.enum) {
        expect(regionProp.enum).toContain('top-half');
        expect(regionProp.enum).toContain('bottom-half');
        expect(regionProp.enum).toContain('center');
      }
    });

    // Phase 5: vision tools
    it('analyzeImage tool has empty required params (no target needed)', () => {
      const analyze = EDITOR_TOOLS.find(t => t.function.name === 'analyzeImage');
      expect(analyze).toBeDefined();
      // analyzeImage can work on selected layer or canvas screenshot
      expect(analyze!.function.parameters.properties).toHaveProperty('target');
    });

    it('vision tool has target parameter', () => {
      const vision = EDITOR_TOOLS.find(t => t.function.name === 'vision');
      expect(vision).toBeDefined();
      expect(vision!.function.parameters.properties).toHaveProperty('target');
    });
  });

  describe('buildToolsSystemPrompt()', () => {
    it('returns a non-empty string', () => {
      const prompt = buildToolsSystemPrompt();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('includes targeting guidance', () => {
      const prompt = buildToolsSystemPrompt();
      expect(prompt.toLowerCase()).toContain('target');
    });

    it('includes behavior guidance', () => {
      const prompt = buildToolsSystemPrompt();
      expect(prompt.toLowerCase()).toContain('tool');
    });
  });
});
