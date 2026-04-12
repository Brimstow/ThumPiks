/**
 * Tests for useTemplateDragDrop hook
 */
import { renderHook, act } from '@testing-library/react';
import { useTemplateDragDrop } from '../hooks/useTemplateDragDrop';

describe('useTemplateDragDrop', () => {
  const defaultConfig = {
    onDropOnCanvas: jest.fn(),
    canvasWidth: 1920,
    canvasHeight: 1080,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggingTemplate).toBeNull();
    expect(result.current.draggingCompositionState).toBeNull();
    expect(result.current.isOverCanvas).toBe(false);
    expect(result.current.announcement).toBe('');
  });

  describe('handleDragStart', () => {
    it('sets isDragging to true for template items', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      act(() => {
        result.current.handleDragStart({
          operation: {
            source: {
              data: {
                type: 'template',
                template: { name: 'Hero', slots: [], textSlots: [] },
                compositionState: { filledSlots: {} },
              },
            },
          },
        });
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.draggingTemplate).toEqual(
        expect.objectContaining({ name: 'Hero' })
      );
    });

    it('sets announcement on drag start', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      act(() => {
        result.current.handleDragStart({
          operation: {
            source: {
              data: {
                type: 'template',
                template: { name: 'Banner', slots: [], textSlots: [] },
                compositionState: { filledSlots: {} },
              },
            },
          },
        });
      });

      expect(result.current.announcement).toContain('Banner');
      expect(result.current.announcement).toContain('Dragging template');
    });

    it('ignores non-template items', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      act(() => {
        result.current.handleDragStart({
          operation: {
            source: {
              data: { type: 'layer', id: '1', index: 0 },
            },
          },
        });
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggingTemplate).toBeNull();
    });

    it('ignores events without source', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      act(() => {
        result.current.handleDragStart({ operation: {} });
      });

      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('handleDragOverCanvas', () => {
    it('sets isOverCanvas state', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      // Start a template drag first
      act(() => {
        result.current.handleDragStart({
          operation: {
            source: {
              data: {
                type: 'template',
                template: { name: 'Grid', slots: [], textSlots: [] },
                compositionState: { filledSlots: {} },
              },
            },
          },
        });
      });

      act(() => {
        result.current.handleDragOverCanvas(true);
      });

      expect(result.current.isOverCanvas).toBe(true);
      expect(result.current.announcement).toContain('Over canvas');
    });

    it('clears isOverCanvas when leaving', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      act(() => {
        result.current.handleDragOverCanvas(true);
      });
      act(() => {
        result.current.handleDragOverCanvas(false);
      });

      expect(result.current.isOverCanvas).toBe(false);
    });
  });

  describe('handleDragEnd', () => {
    it('calls onDropOnCanvas with computed position when over canvas', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      const template = { name: 'Layout', slots: [{ id: 's1' }], textSlots: [] };
      const compositionState = { filledSlots: { s1: 'data' } };

      // Start dragging
      act(() => {
        result.current.handleDragStart({
          operation: {
            source: {
              data: { type: 'template', template, compositionState },
            },
          },
        });
      });

      // Move over canvas
      act(() => {
        result.current.handleDragOverCanvas(true);
      });

      // End drag with canvas rect and position
      const canvasRect = { left: 100, top: 50, width: 960, height: 540 } as DOMRect;
      const dropPosition = { x: 580, y: 320 };

      act(() => {
        result.current.handleDragEnd(
          { operation: { source: { data: { type: 'template', template, compositionState } } } },
          canvasRect,
          dropPosition
        );
      });

      expect(defaultConfig.onDropOnCanvas).toHaveBeenCalledWith(
        template,
        compositionState,
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        })
      );

      // Verify coordinate calculation: (580-100)*2 = 960, (320-50)*2 = 540
      expect(defaultConfig.onDropOnCanvas).toHaveBeenCalledWith(
        template,
        compositionState,
        { x: 960, y: 540 }
      );
    });

    it('resets state after drag end', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      act(() => {
        result.current.handleDragStart({
          operation: {
            source: {
              data: {
                type: 'template',
                template: { name: 'T', slots: [], textSlots: [] },
                compositionState: {},
              },
            },
          },
        });
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.handleDragEnd({ operation: { source: { data: { type: 'template' } } } }, null, null);
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggingTemplate).toBeNull();
      expect(result.current.isOverCanvas).toBe(false);
    });

    it('does not call onDropOnCanvas when not over canvas', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      act(() => {
        result.current.handleDragStart({
          operation: {
            source: {
              data: {
                type: 'template',
                template: { name: 'T', slots: [], textSlots: [] },
                compositionState: {},
              },
            },
          },
        });
      });

      // Don't move over canvas, just end drag
      act(() => {
        result.current.handleDragEnd(
          { operation: { source: { data: { type: 'template' } } } },
          null,
          null
        );
      });

      expect(defaultConfig.onDropOnCanvas).not.toHaveBeenCalled();
    });

    it('handles canceled drag', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      act(() => {
        result.current.handleDragStart({
          operation: {
            source: {
              data: {
                type: 'template',
                template: { name: 'T', slots: [], textSlots: [] },
                compositionState: {},
              },
            },
          },
        });
      });

      act(() => {
        result.current.handleDragEnd(
          { canceled: true, operation: { source: { data: { type: 'template' } } } },
          null,
          null
        );
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.announcement).toContain('cancelled');
      expect(defaultConfig.onDropOnCanvas).not.toHaveBeenCalled();
    });

    it('announces template not dropped when released off canvas', () => {
      const { result } = renderHook(() => useTemplateDragDrop(defaultConfig));

      act(() => {
        result.current.handleDragStart({
          operation: {
            source: {
              data: {
                type: 'template',
                template: { name: 'Grid', slots: [], textSlots: [] },
                compositionState: {},
              },
            },
          },
        });
      });

      act(() => {
        result.current.handleDragEnd(
          { operation: { source: { data: { type: 'template', template: { name: 'Grid', slots: [], textSlots: [] }, compositionState: {} } } } },
          null,
          null
        );
      });

      expect(result.current.announcement).toContain('not dropped on canvas');
    });
  });
});
