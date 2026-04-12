/**
 * Tests for TemplateDragDropProvider component
 * 
 * Tests the provider's context values, event handling, and integration
 * with child components via the useTemplateDragDropContext hook.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Track DragDropProvider props
let capturedOnDragStart: ((event: unknown) => void) | undefined;
let capturedOnDragEnd: ((event: unknown) => void) | undefined;
let capturedOnDragMove: ((event: unknown) => void) | undefined;

jest.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children, onDragStart, onDragEnd, onDragMove }: {
    children: React.ReactNode;
    onDragStart?: (event: unknown) => void;
    onDragEnd?: (event: unknown) => void;
    onDragMove?: (event: unknown) => void;
  }) => {
    capturedOnDragStart = onDragStart;
    capturedOnDragEnd = onDragEnd;
    capturedOnDragMove = onDragMove;
    return <div data-testid="dnd-provider">{children}</div>;
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  useDroppable: jest.fn().mockReturnValue({ ref: jest.fn(), isDropTarget: false }),
}));

import {
  TemplateDragDropProvider,
  useTemplateDragDropContext,
} from '../components/TemplateDragDropProvider';

// Consumer component that exposes context values for testing
const ContextConsumer: React.FC = () => {
  const ctx = useTemplateDragDropContext();
  return (
    <div>
      <span data-testid="isDragging">{String(ctx.isDragging)}</span>
      <span data-testid="isDraggingLayer">{String(ctx.isDraggingLayer)}</span>
      <span data-testid="isOverTrash">{String(ctx.isOverTrash)}</span>
      <span data-testid="isOverReset">{String(ctx.isOverReset)}</span>
      <span data-testid="isOverCanvas">{String(ctx.isOverCanvas)}</span>
      <span data-testid="draggingLayer">{JSON.stringify(ctx.draggingLayer)}</span>
      <span data-testid="announcement">{ctx.announcement}</span>
      <button
        data-testid="set-over-trash"
        onClick={() => ctx.setIsOverTrash(true)}
      />
      <button
        data-testid="set-over-reset"
        onClick={() => ctx.setIsOverReset(true)}
      />
      <button
        data-testid="clear-over-trash"
        onClick={() => ctx.setIsOverTrash(false)}
      />
      <button
        data-testid="clear-over-reset"
        onClick={() => ctx.setIsOverReset(false)}
      />
    </div>
  );
};

describe('TemplateDragDropProvider', () => {
  const defaultProps = {
    onDropTemplate: jest.fn(),
    onDropLayerToTrash: jest.fn(),
    canvasWidth: 1920,
    canvasHeight: 1080,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnDragStart = undefined;
    capturedOnDragEnd = undefined;
    capturedOnDragMove = undefined;
  });

  it('renders children', () => {
    render(
      <TemplateDragDropProvider {...defaultProps}>
        <div data-testid="child">Hello</div>
      </TemplateDragDropProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('provides default context values', () => {
    render(
      <TemplateDragDropProvider {...defaultProps}>
        <ContextConsumer />
      </TemplateDragDropProvider>
    );

    expect(screen.getByTestId('isDragging')).toHaveTextContent('false');
    expect(screen.getByTestId('isDraggingLayer')).toHaveTextContent('false');
    expect(screen.getByTestId('isOverTrash')).toHaveTextContent('false');
    expect(screen.getByTestId('isOverReset')).toHaveTextContent('false');
    expect(screen.getByTestId('isOverCanvas')).toHaveTextContent('false');
    expect(screen.getByTestId('draggingLayer')).toHaveTextContent('null');
  });

  it('renders ARIA live regions for announcements', () => {
    render(
      <TemplateDragDropProvider {...defaultProps}>
        <span>Child</span>
      </TemplateDragDropProvider>
    );

    const statusElements = screen.getAllByRole('status');
    expect(statusElements.length).toBeGreaterThanOrEqual(2);

    // Check assertive and polite live regions exist
    const assertive = statusElements.find(el => el.getAttribute('aria-live') === 'assertive');
    const polite = statusElements.find(el => el.getAttribute('aria-live') === 'polite');
    expect(assertive).toBeDefined();
    expect(polite).toBeDefined();
  });

  it('renders drag instructions for screen readers', () => {
    render(
      <TemplateDragDropProvider {...defaultProps}>
        <span>Child</span>
      </TemplateDragDropProvider>
    );

    const instructions = document.getElementById('template-drag-instructions');
    expect(instructions).not.toBeNull();
    expect(instructions?.textContent).toContain('pick up');
  });

  describe('canvas layer drag start', () => {
    it('detects canvas-layer drag start and updates context', () => {
      render(
        <TemplateDragDropProvider {...defaultProps}>
          <ContextConsumer />
        </TemplateDragDropProvider>
      );

      expect(capturedOnDragStart).toBeDefined();

      act(() => {
        capturedOnDragStart!({
          operation: {
            source: {
              data: {
                type: 'canvas-layer',
                layerId: 'layer-1',
                layerName: 'Hero Image',
                layerType: 'image',
                groupId: 'group-abc',
              },
            },
          },
        });
      });

      expect(screen.getByTestId('isDraggingLayer')).toHaveTextContent('true');
      expect(screen.getByTestId('draggingLayer')).toHaveTextContent('layer-1');
      expect(screen.getByTestId('draggingLayer')).toHaveTextContent('group-abc');
    });

    it('ignores drag start without source data', () => {
      render(
        <TemplateDragDropProvider {...defaultProps}>
          <ContextConsumer />
        </TemplateDragDropProvider>
      );

      act(() => {
        capturedOnDragStart!({ operation: { source: null } });
      });

      expect(screen.getByTestId('isDraggingLayer')).toHaveTextContent('false');
    });
  });

  describe('drag end - trash zone', () => {
    it('calls onDropLayerToTrash when dropped on trash zone', () => {
      render(
        <TemplateDragDropProvider {...defaultProps}>
          <ContextConsumer />
        </TemplateDragDropProvider>
      );

      // Start dragging a layer
      act(() => {
        capturedOnDragStart!({
          operation: {
            source: {
              data: {
                type: 'canvas-layer',
                layerId: 'layer-1',
                layerName: 'Background',
                layerType: 'image',
                groupId: 'group-xyz',
              },
            },
          },
        });
      });

      // Simulate over trash
      act(() => {
        screen.getByTestId('set-over-trash').click();
      });

      // End drag
      act(() => {
        capturedOnDragEnd!({
          operation: { source: { data: null } },
        });
      });

      expect(defaultProps.onDropLayerToTrash).toHaveBeenCalledWith('layer-1', 'group-xyz');
    });

    it('resets layer drag state after drag end', () => {
      render(
        <TemplateDragDropProvider {...defaultProps}>
          <ContextConsumer />
        </TemplateDragDropProvider>
      );

      // Start drag
      act(() => {
        capturedOnDragStart!({
          operation: {
            source: {
              data: {
                type: 'canvas-layer',
                layerId: 'layer-1',
                layerName: 'Test',
                layerType: 'image',
              },
            },
          },
        });
      });

      expect(screen.getByTestId('isDraggingLayer')).toHaveTextContent('true');

      // End drag
      act(() => {
        capturedOnDragEnd!({
          operation: { source: { data: null } },
        });
      });

      expect(screen.getByTestId('isDraggingLayer')).toHaveTextContent('false');
      expect(screen.getByTestId('isOverTrash')).toHaveTextContent('false');
      expect(screen.getByTestId('isOverReset')).toHaveTextContent('false');
      expect(screen.getByTestId('draggingLayer')).toHaveTextContent('null');
    });
  });

  describe('drag end - reset zone', () => {
    it('calls onDropLayerToTrash when dropped on reset zone with groupId', () => {
      render(
        <TemplateDragDropProvider {...defaultProps}>
          <ContextConsumer />
        </TemplateDragDropProvider>
      );

      // Start dragging a template layer (has groupId)
      act(() => {
        capturedOnDragStart!({
          operation: {
            source: {
              data: {
                type: 'canvas-layer',
                layerId: 'layer-2',
                layerName: 'Template BG',
                layerType: 'image',
                groupId: 'group-123',
              },
            },
          },
        });
      });

      // Simulate over reset zone
      act(() => {
        screen.getByTestId('set-over-reset').click();
      });

      // End drag
      act(() => {
        capturedOnDragEnd!({
          operation: { source: { data: null } },
        });
      });

      expect(defaultProps.onDropLayerToTrash).toHaveBeenCalledWith('layer-2', 'group-123');
    });

    it('does NOT call onDropLayerToTrash for reset zone when layer has no groupId', () => {
      render(
        <TemplateDragDropProvider {...defaultProps}>
          <ContextConsumer />
        </TemplateDragDropProvider>
      );

      // Start dragging a non-template layer (no groupId)
      act(() => {
        capturedOnDragStart!({
          operation: {
            source: {
              data: {
                type: 'canvas-layer',
                layerId: 'layer-3',
                layerName: 'Standalone',
                layerType: 'text',
                // no groupId
              },
            },
          },
        });
      });

      // Simulate over reset zone
      act(() => {
        screen.getByTestId('set-over-reset').click();
      });

      // End drag
      act(() => {
        capturedOnDragEnd!({
          operation: { source: { data: null } },
        });
      });

      // Should NOT have been called (no groupId = can't reset template)
      expect(defaultProps.onDropLayerToTrash).not.toHaveBeenCalled();
    });

    it('prioritizes trash zone over reset zone', () => {
      render(
        <TemplateDragDropProvider {...defaultProps}>
          <ContextConsumer />
        </TemplateDragDropProvider>
      );

      // Start dragging
      act(() => {
        capturedOnDragStart!({
          operation: {
            source: {
              data: {
                type: 'canvas-layer',
                layerId: 'layer-1',
                layerName: 'Layer',
                layerType: 'image',
                groupId: 'group-1',
              },
            },
          },
        });
      });

      // Set both trash and reset as active
      act(() => {
        screen.getByTestId('set-over-trash').click();
        screen.getByTestId('set-over-reset').click();
      });

      // End drag
      act(() => {
        capturedOnDragEnd!({
          operation: { source: { data: null } },
        });
      });

      // Should be called once (trash takes priority)
      expect(defaultProps.onDropLayerToTrash).toHaveBeenCalledTimes(1);
      expect(defaultProps.onDropLayerToTrash).toHaveBeenCalledWith('layer-1', 'group-1');
    });
  });

  describe('drag end - cancel (no zone)', () => {
    it('does not call onDropLayerToTrash when not over any zone', () => {
      render(
        <TemplateDragDropProvider {...defaultProps}>
          <ContextConsumer />
        </TemplateDragDropProvider>
      );

      // Start drag
      act(() => {
        capturedOnDragStart!({
          operation: {
            source: {
              data: {
                type: 'canvas-layer',
                layerId: 'layer-1',
                layerName: 'Layer',
                layerType: 'image',
                groupId: 'group-1',
              },
            },
          },
        });
      });

      // End drag without being over any zone
      act(() => {
        capturedOnDragEnd!({
          operation: { source: { data: null } },
        });
      });

      expect(defaultProps.onDropLayerToTrash).not.toHaveBeenCalled();
    });
  });

  describe('setIsOverReset context method', () => {
    it('updates isOverReset state via context', () => {
      render(
        <TemplateDragDropProvider {...defaultProps}>
          <ContextConsumer />
        </TemplateDragDropProvider>
      );

      expect(screen.getByTestId('isOverReset')).toHaveTextContent('false');

      act(() => {
        screen.getByTestId('set-over-reset').click();
      });

      expect(screen.getByTestId('isOverReset')).toHaveTextContent('true');

      act(() => {
        screen.getByTestId('clear-over-reset').click();
      });

      expect(screen.getByTestId('isOverReset')).toHaveTextContent('false');
    });
  });

  describe('setIsOverTrash context method', () => {
    it('updates isOverTrash state via context', () => {
      render(
        <TemplateDragDropProvider {...defaultProps}>
          <ContextConsumer />
        </TemplateDragDropProvider>
      );

      expect(screen.getByTestId('isOverTrash')).toHaveTextContent('false');

      act(() => {
        screen.getByTestId('set-over-trash').click();
      });

      expect(screen.getByTestId('isOverTrash')).toHaveTextContent('true');

      act(() => {
        screen.getByTestId('clear-over-trash').click();
      });

      expect(screen.getByTestId('isOverTrash')).toHaveTextContent('false');
    });
  });

  describe('addTemplateToCanvas', () => {
    it('calls onDropTemplate with center position', () => {
      const AddButton: React.FC = () => {
        const ctx = useTemplateDragDropContext();
        return (
          <button
            data-testid="add-btn"
            onClick={() => ctx.addTemplateToCanvas(
              { name: 'Test', slots: [{ id: 's1' }], textSlots: [{ id: 't1' }] } as any,
              { filledSlots: {} } as any
            )}
          />
        );
      };

      render(
        <TemplateDragDropProvider {...defaultProps}>
          <AddButton />
        </TemplateDragDropProvider>
      );

      act(() => {
        screen.getByTestId('add-btn').click();
      });

      expect(defaultProps.onDropTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test' }),
        expect.objectContaining({ filledSlots: {} }),
        { x: 960, y: 540 } // center of 1920x1080
      );
    });
  });
});
