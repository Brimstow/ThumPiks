/**
 * Tests for TrashDropZone component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock @dnd-kit/react useDroppable
const mockUseDroppable = jest.fn();
jest.mock('@dnd-kit/react', () => ({
  useDroppable: (config: unknown) => mockUseDroppable(config),
}));

// Mock the context hook
const mockContextValue: {
  isDraggingLayer: boolean;
  draggingLayer: any;
  setIsOverTrash: jest.Mock;
} = {
  isDraggingLayer: false,
  draggingLayer: null,
  setIsOverTrash: jest.fn(),
};
jest.mock('../components/TemplateDragDropProvider', () => ({
  useTemplateDragDropContext: () => mockContextValue,
}));

import { TrashDropZone } from '../components/TrashDropZone';

describe('TrashDropZone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue.isDraggingLayer = false;
    mockContextValue.draggingLayer = null;
    mockContextValue.setIsOverTrash = jest.fn();
    mockUseDroppable.mockReturnValue({
      ref: jest.fn(),
      isDropTarget: false,
    });
  });

  it('renders nothing when not dragging a layer', () => {
    const { container } = render(<TrashDropZone />);
    // The component returns null when not dragging
    expect(container.querySelector('[role="region"]')).toBeNull();
  });

  it('renders when dragging a layer', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Test Layer',
      layerType: 'image',
    };

    render(<TrashDropZone />);

    const region = screen.getByRole('region');
    expect(region).toBeInTheDocument();
  });

  it('shows default "Drop here to remove" text', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Background',
      layerType: 'image',
    };

    render(<TrashDropZone />);

    expect(screen.getByText('Drop here to remove')).toBeInTheDocument();
  });

  it('shows "Release to remove layer" when over drop target', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Background',
      layerType: 'image',
    };
    mockUseDroppable.mockReturnValue({
      ref: jest.fn(),
      isDropTarget: true,
    });

    render(<TrashDropZone />);

    expect(screen.getByText('Release to remove layer')).toBeInTheDocument();
  });

  it('shows group layer count when dragging template layer', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Hero BG',
      layerType: 'image',
      groupId: 'group-abc',
    };

    const getGroupLayerCount = jest.fn().mockReturnValue(4);

    render(<TrashDropZone getGroupLayerCount={getGroupLayerCount} />);

    expect(getGroupLayerCount).toHaveBeenCalledWith('group-abc');
    expect(screen.getByText(/template: 4 layers/)).toBeInTheDocument();
  });

  it('shows group info indicator for template layers', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Hero BG',
      layerType: 'image',
      groupId: 'group-abc',
    };

    const getGroupLayerCount = jest.fn().mockReturnValue(3);

    render(<TrashDropZone getGroupLayerCount={getGroupLayerCount} />);

    expect(screen.getByText('Part of template group (3 layers)')).toBeInTheDocument();
  });

  it('does not show group info when layer has no groupId', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Standalone',
      layerType: 'image',
    };

    const getGroupLayerCount = jest.fn().mockReturnValue(0);

    render(<TrashDropZone getGroupLayerCount={getGroupLayerCount} />);

    expect(screen.queryByText(/template group/)).not.toBeInTheDocument();
  });

  it('has correct aria-label with layer name', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'My Layer',
      layerType: 'text',
    };

    render(<TrashDropZone />);

    const region = screen.getByRole('region');
    expect(region).toHaveAttribute(
      'aria-label',
      expect.stringContaining('My Layer')
    );
  });

  it('has aria-dropeffect=move when dragging', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Layer',
      layerType: 'image',
    };

    render(<TrashDropZone />);

    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-dropeffect', 'move');
  });

  it('calls setIsOverTrash when isDropTarget changes', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Layer',
      layerType: 'image',
    };
    mockUseDroppable.mockReturnValue({
      ref: jest.fn(),
      isDropTarget: true,
    });

    render(<TrashDropZone />);

    expect(mockContextValue.setIsOverTrash).toHaveBeenCalledWith(true);
  });

  it('configures useDroppable with correct accept filter', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Layer',
      layerType: 'image',
    };

    render(<TrashDropZone />);

    expect(mockUseDroppable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'trash-drop-zone',
        accept: expect.any(Function),
      })
    );

    const acceptFn = mockUseDroppable.mock.calls[0][0].accept;

    // Should accept any canvas-layer item
    expect(acceptFn({
      data: { type: 'canvas-layer', layerId: '1', layerName: 'L', layerType: 'image' }
    })).toBe(true);

    // Should accept canvas-layer with groupId
    expect(acceptFn({
      data: { type: 'canvas-layer', layerId: '1', layerName: 'L', layerType: 'image', groupId: 'g' }
    })).toBe(true);

    // Should reject template items
    expect(acceptFn({
      data: { type: 'template', template: {}, compositionState: {} }
    })).toBe(false);

    // Should reject layer reorder items
    expect(acceptFn({
      data: { type: 'layer', id: '1', index: 0 }
    })).toBe(false);
  });

  it('shows screen reader status for drop confirmation', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Photo',
      layerType: 'image',
    };
    mockUseDroppable.mockReturnValue({
      ref: jest.fn(),
      isDropTarget: true,
    });

    render(<TrashDropZone />);

    // Find the sr-only status region with confirmation text
    const statusElements = screen.getAllByRole('status');
    const confirmStatus = statusElements.find(el =>
      el.textContent?.includes('Will remove')
    );
    expect(confirmStatus).toBeDefined();
    expect(confirmStatus?.textContent).toContain('Photo');
  });
});
