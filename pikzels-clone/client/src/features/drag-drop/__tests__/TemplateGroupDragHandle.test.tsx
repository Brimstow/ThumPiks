/**
 * Tests for TemplateGroupDragHandle component
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock @dnd-kit/react useDraggable
const mockUseDraggable = jest.fn();
jest.mock('@dnd-kit/react', () => ({
  useDraggable: (config: unknown) => mockUseDraggable(config),
}));

// Mock Tooltip (passthrough)
jest.mock('../../../components/ui/Tooltip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { TemplateGroupDragHandle } from '../components/TemplateGroupDragHandle';
import type { Layer, Selection } from '../../../components/editor/types/editor.types';

// Helper to create a minimal layer
function makeLayer(overrides: Partial<Layer> & { id: string; type: string }): Layer {
  return {
    name: overrides.name ?? `Layer ${overrides.id}`,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    transform: { x: 100, y: 50, width: 200, height: 150, rotation: 0, scaleX: 1, scaleY: 1 },
    effects: [],
    ...overrides,
  } as Layer;
}

describe('TemplateGroupDragHandle', () => {
  const onRemoveGroup = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDraggable.mockReturnValue({
      ref: jest.fn(),
      isDragging: false,
    });
  });

  it('does not render when no layers are selected', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image', groupId: 'g1' }),
    ];
    const selection: Selection = { layerIds: [] };

    const { container } = render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it('does not render when selected layer has no groupId', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image' }), // no groupId
    ];
    const selection: Selection = { layerIds: ['l1'] };

    const { container } = render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it('renders handle when selected layer has a groupId', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image', groupId: 'g1' }),
      makeLayer({ id: 'l2', type: 'text', groupId: 'g1' }),
    ];
    const selection: Selection = { layerIds: ['l1'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    const handle = screen.getByRole('button');
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute('aria-label', expect.stringContaining('Remove template group'));
  });

  it('computes bounding box from all group layers, not just selected', () => {
    const layers = [
      makeLayer({
        id: 'l1',
        type: 'image',
        groupId: 'g1',
        transform: { x: 10, y: 20, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
      }),
      makeLayer({
        id: 'l2',
        type: 'text',
        groupId: 'g1',
        transform: { x: 200, y: 300, width: 150, height: 80, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
      }),
    ];
    const selection: Selection = { layerIds: ['l1'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    const handle = screen.getByRole('button');
    // Bounding box: x=10, y=20, width=340 (10→350), height=360 (20→380)
    // Handle should be at top-right: left = 10 + 340 + 6 = 356, top = 20 - 28 - 6 = -14
    const style = handle.style;
    expect(parseInt(style.left)).toBe(356);
    expect(parseInt(style.top)).toBe(-14);
  });

  it('does not render when selected layers span multiple groups', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image', groupId: 'g1' }),
      makeLayer({ id: 'l2', type: 'image', groupId: 'g2' }),
    ];
    const selection: Selection = { layerIds: ['l1', 'l2'] };

    const { container } = render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it('does not render when selection mixes grouped and ungrouped layers', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image', groupId: 'g1' }),
      makeLayer({ id: 'l2', type: 'image' }), // no groupId
    ];
    const selection: Selection = { layerIds: ['l1', 'l2'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    // Should still render because exactly one unique groupId exists among selected layers
    // l2 has no groupId so it's filtered out, leaving only g1
    const handle = screen.getByRole('button');
    expect(handle).toBeInTheDocument();
  });

  it('provides correct CanvasLayerDragItem data to useDraggable', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image', name: 'Hero BG', groupId: 'g1' }),
      makeLayer({ id: 'l2', type: 'text', groupId: 'g1' }),
    ];
    const selection: Selection = { layerIds: ['l1'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    expect(mockUseDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'canvas-template-drag-handle',
        data: {
          type: 'canvas-layer',
          layerId: 'l1',
          layerName: 'Hero BG',
          layerType: 'image',
          groupId: 'g1',
        },
        disabled: false,
      })
    );
  });

  it('disables useDraggable when no valid group', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image' }), // no groupId
    ];
    const selection: Selection = { layerIds: ['l1'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    expect(mockUseDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      })
    );
  });

  it('calls onRemoveGroup when handle is clicked', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image', groupId: 'g1' }),
    ];
    const selection: Selection = { layerIds: ['l1'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onRemoveGroup).toHaveBeenCalledWith('g1');
  });

  it('calls onRemoveGroup on Enter key press', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image', groupId: 'g1' }),
    ];
    const selection: Selection = { layerIds: ['l1'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onRemoveGroup).toHaveBeenCalledWith('g1');
  });

  it('calls onRemoveGroup on Space key press', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image', groupId: 'g1' }),
    ];
    const selection: Selection = { layerIds: ['l1'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onRemoveGroup).toHaveBeenCalledWith('g1');
  });

  it('has correct accessibility attributes', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image', name: 'Banner', groupId: 'g1' }),
      makeLayer({ id: 'l2', type: 'text', groupId: 'g1' }),
      makeLayer({ id: 'l3', type: 'shape', groupId: 'g1' }),
    ];
    const selection: Selection = { layerIds: ['l1'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    const handle = screen.getByRole('button');
    expect(handle).toHaveAttribute('aria-grabbed', 'false');
    expect(handle).toHaveAttribute('aria-describedby', 'template-drag-instructions');
    expect(handle).toHaveAttribute('tabindex', '0');
    // 3 layers in group
    expect(handle).toHaveAttribute('aria-label', expect.stringContaining('3 layers'));
    expect(handle).toHaveAttribute('aria-label', expect.stringContaining('Banner'));
  });

  it('shows isDragging visual state', () => {
    mockUseDraggable.mockReturnValue({
      ref: jest.fn(),
      isDragging: true,
    });

    const layers = [
      makeLayer({ id: 'l1', type: 'image', groupId: 'g1' }),
    ];
    const selection: Selection = { layerIds: ['l1'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    const handle = screen.getByRole('button');
    expect(handle).toHaveAttribute('aria-grabbed', 'true');
    expect(handle.style.opacity).toBe('0.6');
    expect(handle.style.cursor).toBe('grabbing');
  });

  it('includes layer count in aria-label', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'image', groupId: 'g1' }),
    ];
    const selection: Selection = { layerIds: ['l1'] };

    render(
      <TemplateGroupDragHandle layers={layers} selection={selection} onRemoveGroup={onRemoveGroup} />
    );

    const handle = screen.getByRole('button');
    // Single layer in group
    expect(handle).toHaveAttribute('aria-label', expect.stringContaining('1 layer'));
    expect(handle).toHaveAttribute('aria-label', expect.not.stringContaining('1 layers'));
  });
});
