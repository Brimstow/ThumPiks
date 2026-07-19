import React, { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CanvasEditor from '../components/CanvasEditor';
import { useSaveThumbnail } from '../hooks/useSaveThumbnail';

interface CanvasData {
  imageData: string;
  metadata: {
    width: number;
    height: number;
    tool: string;
  };
}

const CanvasEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { triggerSave, SaveModal } = useSaveThumbnail();

  const handleClose = () => {
    navigate('/dashboard');
  };

  const handleSave = useCallback((canvasData: CanvasData) => {
    triggerSave(canvasData.imageData, {
      title: 'Canvas Thumbnail',
      source: 'canvas-editor',
    });
  }, [triggerSave]);

  return (
    <div className="h-screen w-screen overflow-hidden">
      <CanvasEditor 
        thumbnailId={id}
        onClose={handleClose} 
        onSave={handleSave} 
      />
      {SaveModal}
    </div>
  );
};

export default CanvasEditorPage;
