import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThumbnailEditor from '../components/ThumbnailEditor';

const ThumbnailEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  const handleClose = () => {
    navigate('/thumbnails');
  };

  const handleSave = (edits: any) => {
    console.log('Saving edits:', edits);
    // In a real implementation, this would save the edits
    setSaved(true);
    alert('Edits saved! (This is a preview mode)');
  };

  return (
    <ThumbnailEditor
      onClose={handleClose}
      onSave={handleSave}
    />
  );
};

export default ThumbnailEditorPage;
