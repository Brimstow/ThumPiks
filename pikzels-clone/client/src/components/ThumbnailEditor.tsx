import React, { useState, useEffect, useRef } from 'react';
import SocialShareModal from './SocialShareModal'; // Add this import
import CreateTemplateModal from './templates/CreateTemplateModal'; // Add this import

interface Thumbnail {
  id: string;
  title: string;
  imageUrl: string;
  prompt: string;
  parameters: any;
  createdAt: string;
}

interface TextOverlay {
  id: string;
  text: string;
  position: 'top' | 'bottom' | 'center';
  fontSize: number;
  color: string;
}

interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
}

interface Watermark {
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  position:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center';
  opacity: number;
  size: number;
}

interface EditPreset {
  id: string;
  name: string;
  edits: EditParameters;
}

interface EditParameters {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  blur?: number;
  sharpen?: number;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  resize?: {
    width: number;
    height: number;
  };
  filter?: string;
  textOverlays?: TextOverlay[];
  drawingPaths?: DrawingPath[];
  watermark?: Watermark;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ThumbnailEditorProps {
  thumbnail: Thumbnail;
  onClose: () => void;
  onSave: (edits: EditParameters) => void;
}

const ThumbnailEditor: React.FC<ThumbnailEditorProps> = ({
  thumbnail,
  onClose,
  onSave,
}) => {
  const [edits, setEdits] = useState<EditParameters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    sharpen: 0,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    resize: {
      width: 1280,
      height: 720,
    },
    filter: 'none',
    textOverlays: [
      {
        id: '1',
        text: '',
        position: 'bottom',
        fontSize: 24,
        color: '#FFFFFF',
      },
    ],
    drawingPaths: [],
    watermark: {
      type: 'text',
      text: '© Your Brand',
      position: 'bottom-right',
      opacity: 50,
      size: 24,
    },
    crop: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
  });
  const [history, setHistory] = useState<EditParameters[]>([{ ...edits }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>(thumbnail.imageUrl);
  const [activeTab, setActiveTab] = useState<
    | 'adjust'
    | 'transform'
    | 'text'
    | 'filters'
    | 'draw'
    | 'watermark'
    | 'presets'
  >('adjust');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>(
    []
  );
  const [drawingColor, setDrawingColor] = useState('#FF0000');
  const [drawingLineWidth, setDrawingLineWidth] = useState(5);
  const [presets, setPresets] = useState<EditPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Add state for keyboard shortcut help visibility
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [socialShareModal, setSocialShareModal] = useState(false); // Add this state
  const [createTemplateModal, setCreateTemplateModal] = useState(false); // Add this state

  // Initialize edits with existing parameters if any
  useEffect(() => {
    if (thumbnail.parameters?.edits) {
      setEdits(thumbnail.parameters.edits);
      setHistory([thumbnail.parameters.edits]);
    }
  }, [thumbnail]);

  // Apply edits to preview (in a real implementation, this would modify the actual image)
  useEffect(() => {
    // For demonstration purposes, we'll just show the original image
    // In a real implementation, this would apply the edits to generate a preview
    setPreviewUrl(thumbnail.imageUrl);
  }, [edits, thumbnail.imageUrl]);

  // Function to apply edits to the actual image
  const applyEditsToImage = async (editsToApply: EditParameters) => {
    setProcessing(true);
    try {
      const response = await fetch(
        `/api/thumbnails/${thumbnail.id}/apply-edits`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ edits: editsToApply }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to apply edits');
      }

      const result = await response.json();
      setPreviewUrl(result.processedImageUrl);
    } catch (error) {
      console.error('Error applying edits:', error);
      alert('Failed to apply edits. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Load presets from localStorage
  useEffect(() => {
    const savedPresets = localStorage.getItem('thumbnailEditorPresets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  const handleSave = () => {
    onSave(edits);
  };

  // History functions
  const addToHistory = (newEdits: EditParameters) => {
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ ...newEdits });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousEdits = history[newIndex];
      setEdits(previousEdits);
      // Apply the previous edits to the image
      applyEditsToImage(previousEdits);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextEdits = history[newIndex];
      setEdits(nextEdits);
      // Apply the next edits to the image
      applyEditsToImage(nextEdits);
    }
  };

  // Adjust functions
  const handleAdjustChange = (
    property: keyof EditParameters,
    value: number
  ) => {
    const newEdits = { ...edits, [property]: value };
    setEdits(newEdits);
    addToHistory(newEdits);
  };

  // Transform functions
  const handleRotationChange = (value: number) => {
    const newEdits = { ...edits, rotation: value };
    setEdits(newEdits);
    addToHistory(newEdits);
  };

  const handleFlip = (direction: 'horizontal' | 'vertical') => {
    if (direction === 'horizontal') {
      const newEdits = { ...edits, flipHorizontal: !edits.flipHorizontal };
      setEdits(newEdits);
      addToHistory(newEdits);
    } else {
      const newEdits = { ...edits, flipVertical: !edits.flipVertical };
      setEdits(newEdits);
      addToHistory(newEdits);
    }
  };

  const handleResizeChange = (dimension: 'width' | 'height', value: number) => {
    const newResize = { ...edits.resize, [dimension]: value };
    const newEdits = { ...edits, resize: newResize };
    setEdits(newEdits);
    addToHistory(newEdits);
  };

  // Text overlay functions
  const addTextOverlay = () => {
    const newTextOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: 'New Text',
      position: 'center',
      fontSize: 24,
      color: '#FFFFFF',
    };
    const newTextOverlays = [...(edits.textOverlays || []), newTextOverlay];
    const newEdits = { ...edits, textOverlays: newTextOverlays };
    setEdits(newEdits);
    addToHistory(newEdits);
  };

  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    const newTextOverlays = (edits.textOverlays || []).map(overlay =>
      overlay.id === id ? { ...overlay, ...updates } : overlay
    );
    const newEdits = { ...edits, textOverlays: newTextOverlays };
    setEdits(newEdits);
    addToHistory(newEdits);
  };

  const removeTextOverlay = (id: string) => {
    const newTextOverlays = (edits.textOverlays || []).filter(
      overlay => overlay.id !== id
    );
    const newEdits = { ...edits, textOverlays: newTextOverlays };
    setEdits(newEdits);
    addToHistory(newEdits);
  };

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPath(prev => [...prev, { x, y }]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = drawingLineWidth;
      ctx.lineCap = 'round';
      ctx.strokeStyle = drawingColor;

      ctx.beginPath();
      ctx.moveTo(
        currentPath[currentPath.length - 1].x,
        currentPath[currentPath.length - 1].y
      );
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (currentPath.length > 0) {
      const newDrawingPath: DrawingPath = {
        id: Date.now().toString(),
        points: [...currentPath],
        color: drawingColor,
        lineWidth: drawingLineWidth,
      };

      const newDrawingPaths = [...(edits.drawingPaths || []), newDrawingPath];
      const newEdits = { ...edits, drawingPaths: newDrawingPaths };
      setEdits(newEdits);
      addToHistory(newEdits);
    }

    setCurrentPath([]);
  };

  // Watermark functions
  const updateWatermark = (updates: Partial<Watermark>) => {
    const newWatermark = { ...edits.watermark, ...updates } as Watermark;
    const newEdits = { ...edits, watermark: newWatermark };
    setEdits(newEdits);
    addToHistory(newEdits);
  };

  // Preset functions
  const savePreset = () => {
    if (!newPresetName.trim()) {
      alert('Please enter a name for the preset');
      return;
    }

    const newPreset: EditPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      edits: { ...edits },
    };

    const newPresets = [...presets, newPreset];
    setPresets(newPresets);
    localStorage.setItem('thumbnailEditorPresets', JSON.stringify(newPresets));
    setNewPresetName('');
  };

  const applyPreset = (preset: EditPreset) => {
    setEdits(preset.edits);
    addToHistory(preset.edits);
    // Apply the preset edits to the image
    applyEditsToImage(preset.edits);
  };

  const deletePreset = (id: string) => {
    const newPresets = presets.filter(preset => preset.id !== id);
    setPresets(newPresets);
    localStorage.setItem('thumbnailEditorPresets', JSON.stringify(newPresets));
  };

  // Add this function for performing the actual share
  const performSocialShare = async (platforms: string[], message: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch('/api/social-share/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          thumbnailId: thumbnail.id,
          platforms,
          message,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Thumbnail shared successfully!');
        setSocialShareModal(false);
        return data.results;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share thumbnail');
      }
    } catch (error) {
      console.error('Error sharing thumbnail:', error);
      alert(
        `Failed to share thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo(); // Ctrl/Cmd + Shift + Z for redo
        } else {
          undo(); // Ctrl/Cmd + Z for undo
        }
      }

      // Ctrl/Cmd + S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }

      // Ctrl/Cmd + / for shortcut help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcutHelp(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [historyIndex, history]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      {/* Add the CreateTemplateModal component */}
      {createTemplateModal && (
        <CreateTemplateModal
          thumbnailId={thumbnail.id}
          thumbnailTitle={thumbnail.title}
          onClose={() => setCreateTemplateModal(false)}
          onTemplateCreated={() => {
            alert('Template created successfully!');
          }}
        />
      )}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Edit Thumbnail</h2>
          <div className="flex space-x-2">
            {/* Add the Create Template button */}
            <button
              onClick={() => setCreateTemplateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Create Template
            </button>
            <button
              onClick={() => setSocialShareModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Share
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <nav className="p-4">
              <button
                onClick={() => setActiveTab('adjust')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                  activeTab === 'adjust'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 0h4M4 4a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                Adjust
              </button>

              <button
                onClick={() => setActiveTab('transform')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                  activeTab === 'transform'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                  />
                </svg>
                Transform
              </button>

              <button
                onClick={() => setActiveTab('text')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                  activeTab === 'text'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                Text
              </button>

              <button
                onClick={() => setActiveTab('filters')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                  activeTab === 'filters'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filters
              </button>

              <button
                onClick={() => setActiveTab('draw')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                  activeTab === 'draw'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                Draw
              </button>

              <button
                onClick={() => setActiveTab('watermark')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                  activeTab === 'watermark'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                Watermark
              </button>

              <button
                onClick={() => setActiveTab('presets')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'presets'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                Presets
              </button>
            </nav>

            {/* History Controls */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <button
                  onClick={undo}
                  disabled={historyIndex === 0}
                  className={`flex-1 flex items-center justify-center px-3 py-2 text-sm rounded-md ${
                    historyIndex === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <svg
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Undo
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex === history.length - 1}
                  className={`flex-1 flex items-center justify-center px-3 py-2 text-sm rounded-md ${
                    historyIndex === history.length - 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Redo
                  <svg
                    className="h-4 w-4 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview Area */}
            <div className="flex-1 flex items-center justify-center bg-gray-100 p-4 overflow-auto">
              {processing ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-gray-700">Processing edits...</p>
                </div>
              ) : (
                <div className="relative max-w-full max-h-full">
                  <img
                    src={previewUrl}
                    alt="Thumbnail preview"
                    className="max-w-full max-h-full object-contain"
                  />
                  {activeTab === 'draw' && (
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 cursor-crosshair"
                      width={1280}
                      height={720}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="h-64 border-t border-gray-200 overflow-y-auto bg-white">
              <div className="p-4">
                {/* Adjust Tab */}
                {activeTab === 'adjust' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Adjustments
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Brightness: {edits.brightness}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={edits.brightness}
                          onChange={e =>
                            handleAdjustChange(
                              'brightness',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contrast: {edits.contrast}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={edits.contrast}
                          onChange={e =>
                            handleAdjustChange(
                              'contrast',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Saturation: {edits.saturation}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={edits.saturation}
                          onChange={e =>
                            handleAdjustChange(
                              'saturation',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hue: {edits.hue}°
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={edits.hue}
                          onChange={e =>
                            handleAdjustChange('hue', parseInt(e.target.value))
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Blur: {edits.blur}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={edits.blur}
                          onChange={e =>
                            handleAdjustChange('blur', parseInt(e.target.value))
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sharpen: {edits.sharpen}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={edits.sharpen}
                          onChange={e =>
                            handleAdjustChange(
                              'sharpen',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Transform Tab */}
                {activeTab === 'transform' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Transform
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rotation: {edits.rotation}°
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={edits.rotation}
                          onChange={e =>
                            handleRotationChange(parseInt(e.target.value))
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="flex space-x-4 items-end">
                        <button
                          onClick={() => handleFlip('horizontal')}
                          className={`px-4 py-2 rounded-md ${
                            edits.flipHorizontal
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Flip Horizontal
                        </button>
                        <button
                          onClick={() => handleFlip('vertical')}
                          className={`px-4 py-2 rounded-md ${
                            edits.flipVertical
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Flip Vertical
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Width: {edits.resize?.width}px
                        </label>
                        <input
                          type="number"
                          value={edits.resize?.width}
                          onChange={e =>
                            handleResizeChange(
                              'width',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Height: {edits.resize?.height}px
                        </label>
                        <input
                          type="number"
                          value={edits.resize?.height}
                          onChange={e =>
                            handleResizeChange(
                              'height',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Tab */}
                {activeTab === 'text' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Text Overlays
                      </h3>
                      <button
                        onClick={addTextOverlay}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <svg
                          className="-ml-1 mr-1 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Add Text
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(edits.textOverlays || []).map(overlay => (
                        <div
                          key={overlay.id}
                          className="p-3 bg-gray-50 rounded-md"
                        >
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              value={overlay.text}
                              onChange={e =>
                                updateTextOverlay(overlay.id, {
                                  text: e.target.value,
                                })
                              }
                              placeholder="Enter text"
                              className="px-3 py-1 border border-gray-300 dark:bg-gray-600 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <select
                              value={overlay.position}
                              onChange={e =>
                                updateTextOverlay(overlay.id, {
                                  position: e.target.value as any,
                                })
                              }
                              className="px-3 py-1 border border-gray-300 dark:bg-gray-600 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="top">Top</option>
                              <option value="center">Center</option>
                              <option value="bottom">Bottom</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">
                                Font Size
                              </label>
                              <input
                                type="number"
                                value={overlay.fontSize}
                                onChange={e =>
                                  updateTextOverlay(overlay.id, {
                                    fontSize: parseInt(e.target.value) || 12,
                                  })
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs text-gray-700 mb-1">
                                Color
                              </label>
                              <input
                                type="color"
                                value={overlay.color}
                                onChange={e =>
                                  updateTextOverlay(overlay.id, {
                                    color: e.target.value,
                                  })
                                }
                                className="w-full h-8 border border-gray-300 rounded-md"
                              />
                            </div>
                          </div>

                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => removeTextOverlay(overlay.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filters Tab */}
                {activeTab === 'filters' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Filters
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        'none',
                        'vintage',
                        'blackwhite',
                        'sepia',
                        'vibrant',
                        'cool',
                        'warm',
                      ].map(filter => (
                        <button
                          key={filter}
                          onClick={() => {
                            const newEdits = { ...edits, filter };
                            setEdits(newEdits);
                            addToHistory(newEdits);
                          }}
                          className={`p-3 rounded-md text-center ${
                            edits.filter === filter
                              ? 'ring-2 ring-indigo-500 bg-indigo-50'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          <div className="font-medium text-gray-900 capitalize">
                            {filter === 'blackwhite' ? 'Black & White' : filter}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Draw Tab */}
                {activeTab === 'draw' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Drawing Tools
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Color
                        </label>
                        <input
                          type="color"
                          value={drawingColor}
                          onChange={e => setDrawingColor(e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Line Width: {drawingLineWidth}px
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={drawingLineWidth}
                          onChange={e =>
                            setDrawingLineWidth(parseInt(e.target.value))
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            // Clear the canvas
                            if (canvasRef.current) {
                              const ctx = canvasRef.current.getContext('2d');
                              if (ctx) {
                                ctx.clearRect(
                                  0,
                                  0,
                                  canvasRef.current.width,
                                  canvasRef.current.height
                                );
                              }
                            }
                            // Clear drawing paths from edits
                            const newEdits = { ...edits, drawingPaths: [] };
                            setEdits(newEdits);
                            addToHistory(newEdits);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Clear Drawing
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      Click and drag on the image to draw. Press "Clear Drawing"
                      to remove all drawings.
                    </div>
                  </div>
                )}

                {/* Watermark Tab */}
                {activeTab === 'watermark' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Watermark
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Watermark Type
                        </label>
                        <div className="flex space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="watermarkType"
                              checked={edits.watermark?.type === 'text'}
                              onChange={() => updateWatermark({ type: 'text' })}
                              className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Text
                            </span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="watermarkType"
                              checked={edits.watermark?.type === 'image'}
                              onChange={() =>
                                updateWatermark({ type: 'image' })
                              }
                              className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Image
                            </span>
                          </label>
                        </div>
                      </div>

                      {edits.watermark?.type === 'text' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Text
                          </label>
                          <input
                            type="text"
                            value={edits.watermark?.text || ''}
                            onChange={e =>
                              updateWatermark({ text: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {edits.watermark?.type === 'image' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Image URL
                          </label>
                          <input
                            type="text"
                            value={edits.watermark?.imageUrl || ''}
                            onChange={e =>
                              updateWatermark({ imageUrl: e.target.value })
                            }
                            placeholder="Enter image URL"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Position
                        </label>
                        <select
                          value={edits.watermark?.position}
                          onChange={e =>
                            updateWatermark({ position: e.target.value as any })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="top-left">Top Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-right">Bottom Right</option>
                          <option value="center">Center</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Opacity: {edits.watermark?.opacity}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={edits.watermark?.opacity}
                            onChange={e =>
                              updateWatermark({
                                opacity: parseInt(e.target.value),
                              })
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Size: {edits.watermark?.size}px
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={edits.watermark?.size}
                            onChange={e =>
                              updateWatermark({
                                size: parseInt(e.target.value),
                              })
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Presets Tab */}
                {activeTab === 'presets' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Presets
                      </h3>
                      <div className="flex">
                        <input
                          type="text"
                          value={newPresetName}
                          onChange={e => setNewPresetName(e.target.value)}
                          placeholder="Preset name"
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                          onClick={savePreset}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {presets.map(preset => (
                        <div
                          key={preset.id}
                          className="p-3 bg-gray-50 rounded-md flex justify-between items-center"
                        >
                          <span className="font-medium text-gray-900">
                            {preset.name}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => applyPreset(preset)}
                              className="text-indigo-600 hover:text-indigo-800 text-sm"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => deletePreset(preset.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}

                      {presets.length === 0 && (
                        <div className="col-span-2 text-center py-4 text-gray-500">
                          No presets saved yet. Adjust your settings and click
                          "Save" to create a preset.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {historyIndex + 1} of {history.length} edits
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcut Help Modal */}
      {showShortcutHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcutHelp(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span className="text-gray-700">Undo</span>
                  <kbd className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                    Ctrl+Z
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-700">Redo</span>
                  <kbd className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                    Ctrl+Shift+Z
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-700">Save</span>
                  <kbd className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                    Ctrl+S
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-700">Close</span>
                  <kbd className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                    Esc
                  </kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-700">Show Shortcuts</span>
                  <kbd className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                    Ctrl+/
                  </kbd>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Social Share Modal */}
      {socialShareModal && (
        <SocialShareModal
          thumbnailId={thumbnail.id}
          thumbnailTitle={thumbnail.title}
          onClose={() => setSocialShareModal(false)}
          onShare={performSocialShare}
        />
      )}
    </div>
  );
};

export default ThumbnailEditor;
