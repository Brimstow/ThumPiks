/**
 * Tests for drag-drop accessibility utilities
 */
import {
  buildLayerAnnouncement,
  buildTemplateAnnouncement,
  buildLayerRemovalAnnouncement,
  isPickupDropKey,
  isMoveUpKey,
  isMoveDownKey,
  isCancelKey,
  DRAG_KEYS,
  TEMPLATE_DRAG_INSTRUCTIONS,
  LAYER_DRAG_INSTRUCTIONS,
  KEYBOARD_MOVE_STEP,
} from '../accessibility';

describe('drag-drop accessibility', () => {
  describe('buildLayerAnnouncement', () => {
    it('builds pickup announcement with position info', () => {
      const msg = buildLayerAnnouncement('pickup', 'Background', 2, 5);
      expect(msg).toContain('Picked up layer Background');
      expect(msg).toContain('position 2 of 5');
      expect(msg).toContain('arrow keys');
    });

    it('builds move announcement', () => {
      const msg = buildLayerAnnouncement('move', 'Title', 3, 4);
      expect(msg).toContain('Layer Title moved to position 3 of 4');
    });

    it('builds drop announcement', () => {
      const msg = buildLayerAnnouncement('drop', 'Logo', 1, 3);
      expect(msg).toContain('Layer Logo dropped at position 1 of 3');
    });

    it('builds cancel announcement', () => {
      const msg = buildLayerAnnouncement('cancel', 'Overlay', 2, 4);
      expect(msg).toContain('Drag cancelled');
      expect(msg).toContain('Overlay returned to position 2 of 4');
    });
  });

  describe('buildTemplateAnnouncement', () => {
    it('builds pickup announcement for template', () => {
      const msg = buildTemplateAnnouncement('pickup', 'Hero Layout');
      expect(msg).toContain('Template "Hero Layout" picked up');
      expect(msg).toContain('arrow keys');
    });

    it('builds over-canvas announcement', () => {
      const msg = buildTemplateAnnouncement('over-canvas', 'Grid', 4);
      expect(msg).toContain('Over canvas drop zone');
      expect(msg).toContain('4 layers');
    });

    it('builds over-trash announcement', () => {
      const msg = buildTemplateAnnouncement('over-trash', 'Sidebar');
      expect(msg).toContain('Over trash zone');
    });

    it('builds drop-canvas announcement with layer count', () => {
      const msg = buildTemplateAnnouncement('drop-canvas', 'Banner', 3);
      expect(msg).toContain('Template "Banner" added to canvas');
      expect(msg).toContain('3 layers');
    });

    it('builds drop-canvas announcement with singular layer', () => {
      const msg = buildTemplateAnnouncement('drop-canvas', 'Simple', 1);
      expect(msg).toContain('1 layer');
      expect(msg).not.toContain('1 layers');
    });

    it('builds drop-trash announcement', () => {
      const msg = buildTemplateAnnouncement('drop-trash', 'Layer X');
      expect(msg).toContain('Layer removed from canvas');
    });

    it('builds cancel announcement', () => {
      const msg = buildTemplateAnnouncement('cancel', 'Card Layout');
      expect(msg).toContain('Drag cancelled');
      expect(msg).toContain('"Card Layout" returned');
    });

    it('uses generic "layers" when layerCount not provided', () => {
      const msg = buildTemplateAnnouncement('drop-canvas', 'Test');
      expect(msg).toContain('layers');
    });
  });

  describe('buildLayerRemovalAnnouncement', () => {
    it('builds single layer removal announcement', () => {
      const msg = buildLayerRemovalAnnouncement('Background');
      expect(msg).toContain('Layer "Background" removed from canvas');
    });

    it('builds group removal announcement with count', () => {
      const msg = buildLayerRemovalAnnouncement('Template Layer', true, 5);
      expect(msg).toContain('Removed 5 layers from template group');
    });

    it('falls back to single layer when group count is 1', () => {
      const msg = buildLayerRemovalAnnouncement('Solo Layer', true, 1);
      expect(msg).toContain('Layer "Solo Layer" removed from canvas');
    });

    it('falls back to single layer when isGroupRemoval is false', () => {
      const msg = buildLayerRemovalAnnouncement('Layer A', false, 3);
      expect(msg).toContain('Layer "Layer A" removed from canvas');
    });
  });

  describe('keyboard key helpers', () => {
    it('isPickupDropKey recognizes Space', () => {
      expect(isPickupDropKey('Space')).toBe(true);
    });

    it('isPickupDropKey recognizes Enter', () => {
      expect(isPickupDropKey('Enter')).toBe(true);
    });

    it('isPickupDropKey rejects other keys', () => {
      expect(isPickupDropKey('Escape')).toBe(false);
      expect(isPickupDropKey('ArrowUp')).toBe(false);
      expect(isPickupDropKey('Tab')).toBe(false);
    });

    it('isMoveUpKey recognizes ArrowUp', () => {
      expect(isMoveUpKey('ArrowUp')).toBe(true);
    });

    it('isMoveUpKey rejects other keys', () => {
      expect(isMoveUpKey('ArrowDown')).toBe(false);
      expect(isMoveUpKey('Space')).toBe(false);
    });

    it('isMoveDownKey recognizes ArrowDown', () => {
      expect(isMoveDownKey('ArrowDown')).toBe(true);
    });

    it('isMoveDownKey rejects other keys', () => {
      expect(isMoveDownKey('ArrowUp')).toBe(false);
    });

    it('isCancelKey recognizes Escape', () => {
      expect(isCancelKey('Escape')).toBe(true);
    });

    it('isCancelKey rejects other keys', () => {
      expect(isCancelKey('Enter')).toBe(false);
      expect(isCancelKey('Space')).toBe(false);
    });
  });

  describe('constants', () => {
    it('DRAG_KEYS has all expected keys', () => {
      expect(DRAG_KEYS.PICKUP).toContain('Space');
      expect(DRAG_KEYS.PICKUP).toContain('Enter');
      expect(DRAG_KEYS.DROP).toContain('Space');
      expect(DRAG_KEYS.DROP).toContain('Enter');
      expect(DRAG_KEYS.MOVE_UP).toContain('ArrowUp');
      expect(DRAG_KEYS.MOVE_DOWN).toContain('ArrowDown');
      expect(DRAG_KEYS.CANCEL).toContain('Escape');
    });

    it('TEMPLATE_DRAG_INSTRUCTIONS is a non-empty string', () => {
      expect(TEMPLATE_DRAG_INSTRUCTIONS).toBeTruthy();
      expect(typeof TEMPLATE_DRAG_INSTRUCTIONS).toBe('string');
      expect(TEMPLATE_DRAG_INSTRUCTIONS.length).toBeGreaterThan(10);
    });

    it('LAYER_DRAG_INSTRUCTIONS is a non-empty string', () => {
      expect(LAYER_DRAG_INSTRUCTIONS).toBeTruthy();
      expect(typeof LAYER_DRAG_INSTRUCTIONS).toBe('string');
      expect(LAYER_DRAG_INSTRUCTIONS.length).toBeGreaterThan(10);
    });

    it('KEYBOARD_MOVE_STEP is a positive number', () => {
      expect(KEYBOARD_MOVE_STEP).toBeGreaterThan(0);
      expect(typeof KEYBOARD_MOVE_STEP).toBe('number');
    });
  });
});
