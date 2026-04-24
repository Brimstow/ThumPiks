import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock environment config to avoid import.meta.env issues
jest.mock('../../config/environment', () => ({
  environment: {
    apiBaseUrl: 'http://localhost:3001',
    appUrl: 'http://localhost:8556',
    isProduction: false,
    isNetlify: false,
    isVercel: false,
    isCloudflare: false,
    apiKeys: {
      replicateApiKey: null,
      openrouterApiKey: null,
      cometApiKey: null,
      zenmuxApiKey: null,
    },
  },
}));

// Mock api utils
jest.mock('../../utils/api', () => ({
  authPost: jest.fn(),
  authGet: jest.fn(),
}));

// Mock video service to avoid FFmpeg issues in tests
jest.mock('../../services/video', () => ({
  VideoService: {
    getInstance: () => ({
      initialize: jest.fn(),
      extractFrames: jest.fn(),
    }),
  },
}));

// Mock useVideoService hook
jest.mock('../../hooks/useVideoService', () => ({
  useVideoService: () => ({
    isLoaded: false,
    isLoading: false,
    progress: 0,
    error: null,
    extractFrames: jest.fn(),
    cleanupFrames: jest.fn(),
  }),
}));

// Import component after mocks are set up
import ThumbnailStudio from './ThumbnailStudio';
import type { ThumbnailStudioProps } from './types/editor.types';

// Mock CanvasEngine to avoid canvas rendering complexity
jest.mock('./canvas/CanvasEngine', () => {
  return function MockCanvasEngine({ adjustments }: any) {
    return (
      <div data-testid="canvas-engine" data-adjustments={JSON.stringify(adjustments)}>
        Canvas Engine Mock
      </div>
    );
  };
});

// Mock FloatingLayerToolbar
jest.mock('./FloatingLayerToolbar', () => {
  return function MockFloatingLayerToolbar() {
    return <div data-testid="floating-toolbar">Floating Toolbar</div>;
  };
});

describe('ThumbnailStudio', () => {
  const defaultProps: ThumbnailStudioProps = {
    onSave: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      render(<ThumbnailStudio {...defaultProps} />);
      expect(screen.getByText('Thumbnail Studio')).toBeInTheDocument();
    });

    it('renders toolbar with undo/redo buttons', () => {
      render(<ThumbnailStudio {...defaultProps} />);
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument();
    });

    it('renders save and export buttons', () => {
      render(<ThumbnailStudio {...defaultProps} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('renders panel tabs', () => {
      render(<ThumbnailStudio {...defaultProps} />);
      // Use getAllByRole since there may be multiple elements, then check specific ones
      const layersTab = screen.getByRole('button', { name: 'Layers' });
      const videoTab = screen.getByRole('button', { name: 'Video' });
      const aiTab = screen.getByRole('button', { name: 'AI' });
      const adjustTab = screen.getByRole('button', { name: 'Adjust' });
      
      expect(layersTab).toBeInTheDocument();
      expect(videoTab).toBeInTheDocument();
      expect(aiTab).toBeInTheDocument();
      expect(adjustTab).toBeInTheDocument();
    });
  });

  describe('thumbnail loading', () => {
    it('creates base layer when thumbnailData is provided', async () => {
      const thumbnailData = {
        id: 'thumb-123',
        imageUrl: 'https://example.com/thumbnail.png',
        title: 'Test Thumbnail',
        parameters: {},
      };

      render(
        <ThumbnailStudio
          {...defaultProps}
          thumbnailId="thumb-123"
          thumbnailData={thumbnailData}
        />
      );

      // Wait for layer to be created (via useEffect)
      await waitFor(() => {
        // The layers panel should show the Background layer
        expect(screen.queryByText('No layers yet.')).not.toBeInTheDocument();
      });
    });
  });

  describe('adjustments panel', () => {
    it('switches to adjustments tab when ADJUST clicked', async () => {
      render(<ThumbnailStudio {...defaultProps} />);
      
      const adjustTab = screen.getByRole('button', { name: /adjust/i });
      fireEvent.click(adjustTab);

      // Should show adjustment controls
      await waitFor(() => {
        expect(screen.getByText(/brightness/i)).toBeInTheDocument();
      });
    });

    it('shows brightness slider in adjustments panel', async () => {
      render(<ThumbnailStudio {...defaultProps} />);
      
      const adjustTab = screen.getByRole('button', { name: /adjust/i });
      fireEvent.click(adjustTab);

      await waitFor(() => {
        expect(screen.getByText(/brightness/i)).toBeInTheDocument();
      });
    });

    it('shows contrast slider in adjustments panel', async () => {
      render(<ThumbnailStudio {...defaultProps} />);
      
      const adjustTab = screen.getByRole('button', { name: /adjust/i });
      fireEvent.click(adjustTab);

      await waitFor(() => {
        expect(screen.getByText(/contrast/i)).toBeInTheDocument();
      });
    });

    it('shows saturation slider in adjustments panel', async () => {
      render(<ThumbnailStudio {...defaultProps} />);
      
      const adjustTab = screen.getByRole('button', { name: /adjust/i });
      fireEvent.click(adjustTab);

      await waitFor(() => {
        expect(screen.getByText(/saturation/i)).toBeInTheDocument();
      });
    });

    it('shows filter presets in adjustments panel', async () => {
      render(<ThumbnailStudio {...defaultProps} />);
      
      const adjustTab = screen.getByRole('button', { name: /adjust/i });
      fireEvent.click(adjustTab);

      await waitFor(() => {
        // Look for filter section
        expect(screen.getByText(/filter/i)).toBeInTheDocument();
      });
    });
  });

  describe('undo/redo functionality', () => {
    it('undo button is disabled initially', () => {
      render(<ThumbnailStudio {...defaultProps} />);
      
      const undoButton = screen.getByRole('button', { name: /undo/i });
      expect(undoButton).toBeDisabled();
    });

    it('redo button is disabled initially', () => {
      render(<ThumbnailStudio {...defaultProps} />);
      
      const redoButton = screen.getByRole('button', { name: /redo/i });
      expect(redoButton).toBeDisabled();
    });
  });

  describe('close button', () => {
    it('calls onClose when close button clicked', () => {
      const onClose = jest.fn();
      render(<ThumbnailStudio {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('fullscreen toggle', () => {
    it('renders fullscreen toggle button', () => {
      render(<ThumbnailStudio {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
    });
  });

  describe('tools panel', () => {
    it('renders tool buttons', () => {
      render(<ThumbnailStudio {...defaultProps} />);
      
      // Check for common tool buttons
      expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /move/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /text/i })).toBeInTheDocument();
    });
  });

  describe('zoom controls', () => {
    it('renders zoom tool button', () => {
      render(<ThumbnailStudio {...defaultProps} />);
      
      // Zoom tool in the toolbar
      expect(screen.getByRole('button', { name: /zoom.*z/i })).toBeInTheDocument();
    });
  });
});
