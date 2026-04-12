/**
 * Tests for TemplateResetDropZone component
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
  setIsOverReset: jest.Mock;
} = {
  isDraggingLayer: false,
  draggingLayer: null,
  setIsOverReset: jest.fn(),
};
jest.mock('../components/TemplateDragDropProvider', () => ({
  useTemplateDragDropContext: () => mockContextValue,
}));

import { TemplateResetDropZone } from '../components/TemplateResetDropZone';

describe('TemplateResetDropZone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue.isDraggingLayer = false;
    mockContextValue.draggingLayer = null;
    mockContextValue.setIsOverReset = jest.fn();
    mockUseDroppable.mockReturnValue({
      ref: jest.fn(),
      isDropTarget: false,
    });
  });

  it('renders children', () => {
    render(
      <TemplateResetDropZone>
        <div data-testid="child">Layouts Content</div>
      </TemplateResetDropZone>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Layouts Content')).toBeInTheDocument();
  });

  it('has role=region with default aria-label', () => {
    render(
      <TemplateResetDropZone>
        <span>Content</span>
      </TemplateResetDropZone>
    );

    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', 'Layouts panel');
  });

  it('sets aria-dropeffect to none when not dragging template layer', () => {
    render(
      <TemplateResetDropZone>
        <span>Content</span>
      </TemplateResetDropZone>
    );

    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-dropeffect', 'none');
  });

  it('shows overlay feedback when dragging a template layer (with groupId)', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Hero Image',
      layerType: 'image',
      groupId: 'group-abc',
    };

    render(
      <TemplateResetDropZone>
        <span>Content</span>
      </TemplateResetDropZone>
    );

    expect(screen.getByText('Drop here to remove from canvas')).toBeInTheDocument();
  });

  it('shows "Release to remove template" when actively over drop target', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Hero Image',
      layerType: 'image',
      groupId: 'group-abc',
    };
    mockUseDroppable.mockReturnValue({
      ref: jest.fn(),
      isDropTarget: true,
    });

    render(
      <TemplateResetDropZone>
        <span>Content</span>
      </TemplateResetDropZone>
    );

    expect(screen.getByText('Release to remove template')).toBeInTheDocument();
  });

  it('does NOT show overlay when dragging layer without groupId', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Standalone Layer',
      layerType: 'image',
      groupId: undefined,
    };

    render(
      <TemplateResetDropZone>
        <span>Content</span>
      </TemplateResetDropZone>
    );

    expect(screen.queryByText('Drop here to remove from canvas')).not.toBeInTheDocument();
    expect(screen.queryByText('Release to remove template')).not.toBeInTheDocument();
  });

  it('does NOT show overlay when not dragging', () => {
    mockContextValue.isDraggingLayer = false;
    mockContextValue.draggingLayer = null;

    render(
      <TemplateResetDropZone>
        <span>Content</span>
      </TemplateResetDropZone>
    );

    expect(screen.queryByText('Drop here to remove from canvas')).not.toBeInTheDocument();
  });

  it('updates aria-label with layer name when dragging template layer', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Banner BG',
      layerType: 'image',
      groupId: 'group-123',
    };

    render(
      <TemplateResetDropZone>
        <span>Content</span>
      </TemplateResetDropZone>
    );

    const region = screen.getByRole('region');
    expect(region).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Banner BG')
    );
    expect(region).toHaveAttribute(
      'aria-label',
      expect.stringContaining('remove template from canvas')
    );
  });

  it('sets aria-dropeffect to move when showing feedback', () => {
    mockContextValue.isDraggingLayer = true;
    mockContextValue.draggingLayer = {
      type: 'canvas-layer',
      layerId: 'layer-1',
      layerName: 'Layer',
      layerType: 'image',
      groupId: 'group-abc',
    };

    render(
      <TemplateResetDropZone>
        <span>Content</span>
      </TemplateResetDropZone>
    );

    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-dropeffect', 'move');
  });

  it('calls setIsOverReset when isDropTarget changes', () => {
    mockUseDroppable.mockReturnValue({
      ref: jest.fn(),
      isDropTarget: true,
    });

    render(
      <TemplateResetDropZone>
        <span>Content</span>
      </TemplateResetDropZone>
    );

    expect(mockContextValue.setIsOverReset).toHaveBeenCalledWith(true);
  });

  it('configures useDroppable with correct accept filter', () => {
    render(
      <TemplateResetDropZone>
        <span>Content</span>
      </TemplateResetDropZone>
    );

    expect(mockUseDroppable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'template-reset-drop-zone',
        accept: expect.any(Function),
      })
    );

    // Test the accept filter
    const acceptFn = mockUseDroppable.mock.calls[0][0].accept;

    // Should accept canvas-layer with groupId
    expect(acceptFn({
      data: { type: 'canvas-layer', layerId: '1', layerName: 'L', layerType: 'image', groupId: 'g1' }
    })).toBe(true);

    // Should reject canvas-layer without groupId
    expect(acceptFn({
      data: { type: 'canvas-layer', layerId: '1', layerName: 'L', layerType: 'image' }
    })).toBe(false);

    // Should reject template items
    expect(acceptFn({
      data: { type: 'template', template: {}, compositionState: {} }
    })).toBe(false);

    // Should reject layer reorder items
    expect(acceptFn({
      data: { type: 'layer', id: '1', index: 0 }
    })).toBe(false);
  });
});
