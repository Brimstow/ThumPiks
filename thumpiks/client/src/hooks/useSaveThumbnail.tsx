/**
 * useSaveThumbnail - DRY hook for save-with-modal flow
 *
 * Wraps SaveThumbnailModal + useImageActions.saveToLibrary into a single
 * reusable hook. Any page that needs "Save" just calls triggerSave() and
 * renders {SaveModal}.
 *
 * Usage:
 *   const { triggerSave, SaveModal } = useSaveThumbnail();
 *   // ...
 *   <button onClick={() => triggerSave(imageUrl, { title: 'My Thumb', source: 'quick-edit' })}>Save</button>
 *   {SaveModal}
 */

import React, { useState, useCallback } from 'react';
import SaveThumbnailModal from '../components/ui/SaveThumbnailModal';
import { useImageActions } from './useImageActions';
import type { SaveMetadata, SaveModalResult, ActionResult } from '../types/image-actions.types';

export interface UseSaveThumbnailReturn {
  /** Open the save modal with pre-filled metadata */
  triggerSave: (imageUrl: string, metadata?: SaveMetadata) => void;
  /** The modal element — render this in your JSX */
  SaveModal: React.ReactElement | null;
  /** Whether a save API call is in progress */
  isSaving: boolean;
  /** Last save result */
  lastResult: ActionResult | null;
}

export function useSaveThumbnail(): UseSaveThumbnailReturn {
  const { saveToLibrary, isLoading } = useImageActions();

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingMetadata, setPendingMetadata] = useState<SaveMetadata | undefined>();
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);

  const triggerSave = useCallback((imageUrl: string, metadata?: SaveMetadata) => {
    setPendingImageUrl(imageUrl);
    setPendingMetadata(metadata);
    setModalOpen(true);
  }, []);

  const handleModalSave = useCallback(async (result: SaveModalResult) => {
    if (!pendingImageUrl) return;

    // Merge modal result with original metadata for the API call
    const fullMetadata: SaveMetadata = {
      ...pendingMetadata,
      title: result.title,
      projectId: result.projectId,
      prompt: result.prompt,
    };

    const apiResult = await saveToLibrary(pendingImageUrl, fullMetadata);
    setLastResult(apiResult);

    if (apiResult.success) {
      setModalOpen(false);
      setPendingImageUrl(null);
      setPendingMetadata(undefined);
    }
  }, [pendingImageUrl, pendingMetadata, saveToLibrary]);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    setPendingImageUrl(null);
    setPendingMetadata(undefined);
  }, []);

  const SaveModal = modalOpen ? (
    <SaveThumbnailModal
      open={modalOpen}
      onClose={handleClose}
      onSave={handleModalSave}
      metadata={pendingMetadata}
      imageUrl={pendingImageUrl || undefined}
    />
  ) : null;

  return {
    triggerSave,
    SaveModal,
    isSaving: isLoading.save,
    lastResult,
  };
}
