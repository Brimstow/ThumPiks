import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CanvasEditor from '../components/CanvasEditor';

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

  const handleClose = () => {
    navigate('/dashboard');
  };

  const handleSave = async (canvasData: CanvasData) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/thumbnails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Canvas Thumbnail',
          imageUrl: canvasData.imageData,
          prompt: 'Created with Canvas Editor',
          parameters: {
            width: canvasData.metadata.width,
            height: canvasData.metadata.height,
            tool: canvasData.metadata.tool,
          },
        }),
      });

      if (response.ok) {
        console.log('Canvas saved successfully');
        navigate('/dashboard');
      } else {
        const error = await response.json();
        console.error('Save failed:', error);
        alert(`Failed to save: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save canvas. Please try again.');
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <CanvasEditor 
        thumbnailId={id}
        onClose={handleClose} 
        onSave={handleSave} 
      />
    </div>
  );
};

export default CanvasEditorPage;
