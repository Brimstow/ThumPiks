/**
 * VideoEditorPage
 * Full-page wrapper for the VideoThumbnailEditor component
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import VideoThumbnailEditor from '../components/video/VideoThumbnailEditor';

const VideoEditorPage: React.FC = () => {
  const navigate = useNavigate();

  const handleFramesExtracted = (frames: any[]) => {
    console.log('Frames extracted:', frames);
    // Could navigate to editor with frames, or save to state/API
  };

  const handleClose = () => {
    navigate('/dashboard');
  };

  return (
    <VideoThumbnailEditor
      onFramesExtracted={handleFramesExtracted}
      onClose={handleClose}
    />
  );
};

export default VideoEditorPage;
