/**
 * EditorRouter Component
 * Routes between MobileEditor and ThumbnailStudio based on device type
 * Passes same props to both editors for full compatibility
 */

import React from 'react';
import { useShouldUseMobileEditor } from '../../hooks/useDeviceDetection';
import ThumbnailStudio from './ThumbnailStudio';
import { MobileEditor } from './mobile';
import type { Layer, AdjustmentState } from './types/editor.types';

export interface EditorRouterProps {
  thumbnailId?: string;
  thumbnailData?: {
    id: string;
    title?: string;
    imageUrl: string;
    parameters?: {
      edits?: Partial<AdjustmentState>;
      [key: string]: unknown;
    };
  };
  initialImage?: string;
  onSave: (data: { layers: Layer[]; preview: string }) => void;
  onClose: () => void;
}

/**
 * EditorRouter automatically routes to the appropriate editor
 * based on the user's device:
 * - Mobile/Tablet devices → MobileEditor (touch-first UI)
 * - Desktop devices → ThumbnailStudio (full-featured editor)
 * 
 * Both editors receive the same props for state compatibility.
 */
export function EditorRouter({
  thumbnailId,
  thumbnailData,
  initialImage,
  onSave,
  onClose,
}: EditorRouterProps) {
  const shouldUseMobile = useShouldUseMobileEditor();

  if (shouldUseMobile) {
    return (
      <MobileEditor
        thumbnailId={thumbnailId}
        thumbnailData={thumbnailData}
        initialImage={initialImage}
        onSave={onSave}
        onClose={onClose}
      />
    );
  }

  return (
    <ThumbnailStudio
      thumbnailId={thumbnailId}
      thumbnailData={thumbnailData}
      initialImage={initialImage}
      onSave={onSave}
      onClose={onClose}
    />
  );
}

export default EditorRouter;
