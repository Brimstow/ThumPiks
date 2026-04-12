import { EDITOR_TOOLS, buildToolsSystemPrompt } from '../tool-definitions';

describe('tool-definitions', () => {
  describe('EDITOR_TOOLS', () => {
    it('exports an array of 23 tool definitions', () => {
      expect(Array.isArray(EDITOR_TOOLS)).toBe(true);
      expect(EDITOR_TOOLS).toHaveLength(23);
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
