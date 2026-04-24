import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import '@testing-library/jest-dom';
import ThumbnailStudioPage from '../../../pages/ThumbnailStudioPage';

// Mock the api utility
jest.mock('../../../utils/api', () => ({
  authGet: jest.fn(),
  authPost: jest.fn(),
  authFetch: jest.fn(),
}));

import { authGet } from '../../../utils/api';

// Mock all editor sub-components that use React.memo or complex dependencies
// to isolate ThumbnailStudioPage integration tests to routing/loading/state logic.
// Each mock must specify __esModule + default to satisfy ts-jest default-import resolution.
jest.mock('../canvas/CanvasEngine', () => ({
  __esModule: true,
  default: function MockCanvasEngine() {
    return <div data-testid="canvas-engine">Canvas Engine</div>;
  },
}));

jest.mock('../FloatingLayerToolbar', () => ({
  __esModule: true,
  default: function MockFloatingToolbar() {
    return null;
  },
}));

jest.mock('../panels/VideoFrameExtractor', () => ({
  __esModule: true,
  default: function MockVideoFrameExtractor() {
    return <div>Video Frame Extractor</div>;
  },
}));

jest.mock('../panels/AIToolsPanel', () => ({
  __esModule: true,
  default: function MockAIToolsPanel() {
    return <div>AI Tools Panel</div>;
  },
}));

jest.mock('../panels/LayersPanel', () => ({
  __esModule: true,
  default: function MockLayersPanel() {
    return <div data-testid="layers-panel">Layers Panel</div>;
  },
}));

jest.mock('../panels/AdjustmentsPanel', () => ({
  __esModule: true,
  default: function MockAdjustmentsPanel({ adjustments }: any) {
    return (
      <div data-testid="adjustments-panel">
        <span>Brightness</span>
        <span>Contrast</span>
        <span>Saturation</span>
        <span data-testid="brightness-value">{adjustments?.brightness}</span>
      </div>
    );
  },
}));

jest.mock('../panels/ToolsPanel', () => ({
  __esModule: true,
  default: function MockToolsPanel() {
    return <div data-testid="tools-panel">Tools Panel</div>;
  },
}));

const renderWithRouter = (initialEntry: string) => {
  const routes = [
    { path: '/dashboard/editor', element: <ThumbnailStudioPage /> },
    { path: '/dashboard/editor/:id', element: <ThumbnailStudioPage /> },
    { path: '/dashboard/thumbnails', element: <div data-testid="thumbnails-page">Thumbnails</div> },
  ];

  const router = createMemoryRouter(routes, {
    initialEntries: [initialEntry],
  });

  return render(<RouterProvider router={router} />);
};

describe('ThumbnailStudioPage integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('blank canvas mode', () => {
    it('renders editor without loading state when no id param', () => {
      renderWithRouter('/dashboard/editor');

      expect(screen.getByText('Thumbnail Studio')).toBeInTheDocument();
      expect(screen.queryByText('Loading thumbnail...')).not.toBeInTheDocument();
    });

    it('displays canvas engine', () => {
      renderWithRouter('/dashboard/editor');

      expect(screen.getByTestId('canvas-engine')).toBeInTheDocument();
    });

    it('shows right panel tabs including Adjust', () => {
      renderWithRouter('/dashboard/editor');

      expect(screen.getByText('Layers')).toBeInTheDocument();
      expect(screen.getByText('Adjust')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText('Props')).toBeInTheDocument();
    });
  });

  describe('thumbnail loading mode', () => {
    it('shows loading spinner while fetching thumbnail', async () => {
      // Never resolve to keep loading state
      (authGet as jest.Mock).mockReturnValue(new Promise(() => {}));

      renderWithRouter('/dashboard/editor/thumb-123');

      expect(screen.getByText('Loading thumbnail...')).toBeInTheDocument();
    });

    it('renders editor after successful thumbnail fetch', async () => {
      (authGet as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          thumbnail: {
            id: 'thumb-123',
            title: 'Test Thumbnail',
            imageUrl: 'https://example.com/thumb.jpg',
            parameters: {},
          },
        }),
      });

      renderWithRouter('/dashboard/editor/thumb-123');

      await waitFor(() => {
        expect(screen.getByText('Thumbnail Studio')).toBeInTheDocument();
      });

      expect(authGet).toHaveBeenCalledWith('/api/thumbnails/thumb-123');
    });

    it('shows error state with Retry button on fetch failure', async () => {
      (authGet as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      renderWithRouter('/dashboard/editor/thumb-123');

      await waitFor(() => {
        expect(screen.getByText('Failed to Load')).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    it('shows 404 message when thumbnail not found', async () => {
      (authGet as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      renderWithRouter('/dashboard/editor/thumb-123');

      await waitFor(() => {
        expect(screen.getByText('Thumbnail not found')).toBeInTheDocument();
      });
    });

    it('retries fetch when Retry button is clicked', async () => {
      // First call fails
      (authGet as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderWithRouter('/dashboard/editor/thumb-123');

      await waitFor(() => {
        expect(screen.getByText('Failed to Load')).toBeInTheDocument();
      });

      // Second call succeeds
      (authGet as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          thumbnail: {
            id: 'thumb-123',
            title: 'Test Thumbnail',
            imageUrl: 'https://example.com/thumb.jpg',
            parameters: {},
          },
        }),
      });

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('Thumbnail Studio')).toBeInTheDocument();
      });

      expect(authGet).toHaveBeenCalledTimes(2);
    });

    it('handles network errors gracefully', async () => {
      (authGet as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithRouter('/dashboard/editor/thumb-123');

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('adjustment panel interaction', () => {
    it('switches to Adjust tab when clicked', async () => {
      renderWithRouter('/dashboard/editor');

      const adjustTab = screen.getByText('Adjust');
      fireEvent.click(adjustTab);

      // Adjustment panel should render with default slider values
      await waitFor(() => {
        expect(screen.getByText('Brightness')).toBeInTheDocument();
      });
    });

    it('shows all adjustment sections', async () => {
      renderWithRouter('/dashboard/editor');

      fireEvent.click(screen.getByText('Adjust'));

      await waitFor(() => {
        expect(screen.getByText('Brightness')).toBeInTheDocument();
        expect(screen.getByText('Contrast')).toBeInTheDocument();
        expect(screen.getByText('Saturation')).toBeInTheDocument();
      });
    });
  });

  describe('toolbar controls', () => {
    it('renders Save and Export buttons', () => {
      renderWithRouter('/dashboard/editor');

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('renders Undo and Redo buttons', () => {
      renderWithRouter('/dashboard/editor');

      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');

      expect(undoButton).toBeInTheDocument();
      expect(redoButton).toBeInTheDocument();
      // Both should be disabled initially (no history)
      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });
  });
});
