import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { EditorRouter } from '../components/editor/EditorRouter';
import { authGet } from '../utils/api';
import type { AdjustmentState, Layer } from '../components/editor/types/editor.types';

interface ThumbnailData {
  id: string;
  title?: string;
  imageUrl: string;
  parameters?: {
    edits?: Partial<AdjustmentState>;
    [key: string]: unknown;
  };
}

// Route state passed from AI generation pages (CreatePlusPage, AIToolsPage)
interface EditorRouteState {
  initialImage?: string;
  projectId?: string;
  prompt?: string;
  style?: string;
  source?: string;
  platformPreset?: {
    platform: string;
    width: number;
    height: number;
    name: string;
  };
}

const ThumbnailStudioPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [thumbnailData, setThumbnailData] = useState<ThumbnailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialImageUrl, setInitialImageUrl] = useState<string | undefined>();
  const [platformPreset, setPlatformPreset] = useState<EditorRouteState['platformPreset']>();

  // Read initial image from route state or sessionStorage (for page refresh persistence)
  useEffect(() => {
    const routeState = location.state as EditorRouteState | undefined;
    
    if (routeState?.initialImage) {
      // Route state exists - use it and backup to sessionStorage
      setInitialImageUrl(routeState.initialImage);
      sessionStorage.setItem('pendingEditorImage', JSON.stringify(routeState));
    } else if (!id) {
      // No route state and no thumbnail ID - try to restore from sessionStorage
      const stored = sessionStorage.getItem('pendingEditorImage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as EditorRouteState;
          if (parsed.initialImage) {
            setInitialImageUrl(parsed.initialImage);
          }
        } catch {
          // Ignore corrupt sessionStorage data
        }
        // Clear after consumption to prevent stale data
        sessionStorage.removeItem('pendingEditorImage');
      }
    }

    // Extract platform preset from route state
    if (routeState?.platformPreset) {
      setPlatformPreset(routeState.platformPreset);
    }
  }, [location.state, id]);

  // Fetch thumbnail data when id is present
  const fetchThumbnail = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authGet(`/api/thumbnails/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Thumbnail not found');
        }
        throw new Error('Failed to load thumbnail');
      }
      
      const data = await response.json();
      
      if (data.thumbnail) {
        setThumbnailData(data.thumbnail);
      } else {
        throw new Error(data.error || 'Thumbnail not found');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load thumbnail';
      setError(message);
      console.error('Error fetching thumbnail:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchThumbnail();
  }, [fetchThumbnail]);

  const handleSave = (data: { layers: Layer[]; preview: string }) => {
    console.log('Saving thumbnail:', data);
    // TODO: Implement save logic with API call
  };

  const handleClose = () => {
    // Navigate back to dashboard
    navigate('/dashboard/thumbnails');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="thumbnail-studio" style={{ 
        position: 'fixed', 
        inset: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--editor-bg-darkest, #0a0a14)',
        zIndex: 50,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            border: '3px solid var(--editor-accent, #3b82f6)', 
            borderTopColor: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--editor-text-secondary, #9ca3af)', fontSize: 14 }}>
            Loading thumbnail...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="thumbnail-studio" style={{ 
        position: 'fixed', 
        inset: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--editor-bg-darkest, #0a0a14)',
        zIndex: 50,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
          <div style={{ 
            width: 64, 
            height: 64, 
            background: 'var(--editor-danger, #ef4444)', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            opacity: 0.2,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 32, height: 32, color: 'var(--editor-danger, #ef4444)' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={{ color: 'var(--editor-text-primary, #f9fafb)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Failed to Load
          </h2>
          <p style={{ color: 'var(--editor-text-muted, #6b7280)', fontSize: 14, marginBottom: 24 }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={fetchThumbnail}
              style={{
                padding: '10px 20px',
                background: 'var(--editor-accent, #3b82f6)',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
            <button
              onClick={handleClose}
              style={{
                padding: '10px 20px',
                background: 'var(--editor-bg-medium, #1f2937)',
                border: '1px solid var(--editor-border-default, #374151)',
                borderRadius: 8,
                color: 'var(--editor-text-secondary, #9ca3af)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <EditorRouter
        thumbnailId={id}
        thumbnailData={thumbnailData || undefined}
        initialImage={initialImageUrl}
        platformPreset={platformPreset}
        onSave={handleSave}
        onClose={handleClose}
      />
    </div>
  );
};

export default ThumbnailStudioPage;
