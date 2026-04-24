/**
 * Tests for drag-drop type guards
 */
import { isTemplateDragItem, isLayerDragItem, isCanvasLayerDragItem } from '../types';

describe('drag-drop type guards', () => {
  describe('isTemplateDragItem', () => {
    it('returns true for valid template drag items', () => {
      const item = {
        type: 'template',
        template: { name: 'Test', slots: [], textSlots: [] },
        compositionState: { filledSlots: {} },
      };
      expect(isTemplateDragItem(item)).toBe(true);
    });

    it('returns false for canvas-layer items', () => {
      const item = {
        type: 'canvas-layer',
        layerId: '123',
        layerName: 'Layer 1',
        layerType: 'image',
      };
      expect(isTemplateDragItem(item)).toBe(false);
    });

    it('returns false for layer reorder items', () => {
      const item = { type: 'layer', id: '123', index: 0 };
      expect(isTemplateDragItem(item)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isTemplateDragItem(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isTemplateDragItem(undefined)).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(isTemplateDragItem(42)).toBe(false);
      expect(isTemplateDragItem('template')).toBe(false);
      expect(isTemplateDragItem(true)).toBe(false);
    });

    it('returns false for objects without type field', () => {
      expect(isTemplateDragItem({ name: 'test' })).toBe(false);
    });
  });

  describe('isLayerDragItem', () => {
    it('returns true for valid layer drag items', () => {
      const item = { type: 'layer', id: 'layer-1', index: 2 };
      expect(isLayerDragItem(item)).toBe(true);
    });

    it('returns false for template items', () => {
      const item = { type: 'template', template: {}, compositionState: {} };
      expect(isLayerDragItem(item)).toBe(false);
    });

    it('returns false for canvas-layer items', () => {
      const item = {
        type: 'canvas-layer',
        layerId: '123',
        layerName: 'Test',
        layerType: 'image',
      };
      expect(isLayerDragItem(item)).toBe(false);
    });

    it('returns false for null and undefined', () => {
      expect(isLayerDragItem(null)).toBe(false);
      expect(isLayerDragItem(undefined)).toBe(false);
    });
  });

  describe('isCanvasLayerDragItem', () => {
    it('returns true for valid canvas-layer drag items', () => {
      const item = {
        type: 'canvas-layer',
        layerId: 'layer-abc',
        layerName: 'Background Image',
        layerType: 'image',
      };
      expect(isCanvasLayerDragItem(item)).toBe(true);
    });

    it('returns true for canvas-layer items with groupId', () => {
      const item = {
        type: 'canvas-layer',
        layerId: 'layer-abc',
        layerName: 'Template Layer',
        layerType: 'image',
        groupId: 'group-xyz',
      };
      expect(isCanvasLayerDragItem(item)).toBe(true);
    });

    it('returns false for layer reorder items', () => {
      const item = { type: 'layer', id: '123', index: 0 };
      expect(isCanvasLayerDragItem(item)).toBe(false);
    });

    it('returns false for template items', () => {
      const item = { type: 'template', template: {}, compositionState: {} };
      expect(isCanvasLayerDragItem(item)).toBe(false);
    });

    it('returns false for null, undefined, and primitives', () => {
      expect(isCanvasLayerDragItem(null)).toBe(false);
      expect(isCanvasLayerDragItem(undefined)).toBe(false);
      expect(isCanvasLayerDragItem(42)).toBe(false);
      expect(isCanvasLayerDragItem('')).toBe(false);
    });
  });
});
