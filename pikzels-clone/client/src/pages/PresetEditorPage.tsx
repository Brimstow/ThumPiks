import React, { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PresetEditor from '../components/preset-editor/PresetEditor';

/**
 * Built-in preset definitions.
 * Matches the presets in CreatePlusPage.tsx so we can resolve from URL param alone.
 */
const PLATFORM_PRESETS: Record<string, { platform: string; width: number; height: number; name: string }> = {
  'youtube-16-9': { platform: 'YouTube', width: 1280, height: 720, name: 'YouTube' },
  'tiktok-9-16': { platform: 'TikTok', width: 1080, height: 1920, name: 'TikTok' },
  'upscrolled-9-16': { platform: 'UpScrolled', width: 1080, height: 1920, name: 'UpScrolled' },
  'instagram-1-1': { platform: 'Instagram', width: 1080, height: 1080, name: 'Instagram Square' },
  'instagram-4-5': { platform: 'Instagram', width: 1080, height: 1350, name: 'Instagram Portrait' },
  'instagram-16-9': { platform: 'Instagram', width: 1080, height: 607, name: 'Instagram Landscape' },
  'twitch': { platform: 'Twitch', width: 1280, height: 720, name: 'Twitch' },
};

interface PresetRouteState {
  platform?: string;
  width?: number;
  height?: number;
  name?: string;
}

const PresetEditorPage: React.FC = () => {
  const { presetId } = useParams<{ presetId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const preset = useMemo(() => {
    // Try built-in preset first
    if (presetId && PLATFORM_PRESETS[presetId]) {
      return PLATFORM_PRESETS[presetId];
    }

    // Fallback to route state (for custom presets)
    const routeState = location.state as PresetRouteState | undefined;
    if (routeState?.width && routeState?.height) {
      return {
        platform: routeState.platform || 'Custom',
        width: routeState.width,
        height: routeState.height,
        name: routeState.name || 'Custom',
      };
    }

    // Ultimate fallback: YouTube defaults
    return PLATFORM_PRESETS['youtube-16-9'];
  }, [presetId, location.state]);

  const handleClose = () => {
    navigate('/dashboard/create-plus');
  };

  const handleOpenFullEditor = (editorState?: { layers: any[]; preview: string }) => {
    navigate('/dashboard/editor', {
      state: {
        initialImage: editorState?.preview,
        platformPreset: preset,
        source: 'preset-editor',
      },
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <PresetEditor
        preset={preset}
        onClose={handleClose}
        onOpenFullEditor={handleOpenFullEditor}
      />
    </div>
  );
};

export default PresetEditorPage;
