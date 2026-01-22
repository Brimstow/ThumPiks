import React from 'react';
import ThumbnailStudio from '../components/editor/ThumbnailStudio';

const ThumbnailStudioPage: React.FC = () => {
  const handleSave = (data: { layers: any[]; preview: string }) => {
    console.log('Saving thumbnail:', data);
    // In a real app, you would save to the backend here
    // Example: POST to /api/thumbnails with the data
  };

  const handleClose = () => {
    // Navigate back to dashboard or previous page
    window.history.back();
  };

  return (
    <ThumbnailStudio
      onSave={handleSave}
      onClose={handleClose}
    />
  );
};

export default ThumbnailStudioPage;
