import React, { useState, useEffect } from 'react';

interface Thumbnail {
  id: string;
  title: string;
  imageUrl: string;
  prompt: string;
  parameters: any;
  createdAt: string;
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
  textOverlays?: {
    id: string;
    text: string;
    position: 'top' | 'bottom' | 'center';
    fontSize: number;
    color: string;
  }[];
  watermark?: {
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
  };
}

interface BatchEditorProps {
  thumbnails: Thumbnail[];
  onClose: () => void;
  onSave: (edits: EditParameters) => void;
}

const BatchEditor: React.FC<BatchEditorProps> = ({
  thumbnails,
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
    watermark: {
      type: 'text',
      text: '© Your Brand',
      position: 'bottom-right',
      opacity: 50,
      size: 24,
    },
  });
  const [activeTab, setActiveTab] = useState<
    'adjust' | 'transform' | 'filters' | 'text' | 'watermark'
  >('adjust');
  const [processing, setProcessing] = useState(false);

  const handleSave = async () => {
    setProcessing(true);
    try {
      await onSave(edits);
    } catch (error) {
      console.error('Error applying batch edits:', error);
      alert('Failed to apply batch edits. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSliderChange = (
    property: keyof EditParameters,
    value: number
  ) => {
    setEdits({
      ...edits,
      [property]: value,
    });
  };

  const handleCheckboxChange = (
    property: keyof EditParameters,
    value: boolean
  ) => {
    setEdits({
      ...edits,
      [property]: value,
    });
  };

  const handleTextOverlayChange = (id: string, field: string, value: any) => {
    const newTextOverlays =
      edits.textOverlays?.map(overlay =>
        overlay.id === id ? { ...overlay, [field]: value } : overlay
      ) || [];

    setEdits({
      ...edits,
      textOverlays: newTextOverlays,
    });
  };

  const addTextOverlay = () => {
    setEdits({
      ...edits,
      textOverlays: [
        ...(edits.textOverlays || []),
        {
          id: Date.now().toString(),
          text: '',
          position: 'bottom',
          fontSize: 24,
          color: '#FFFFFF',
        },
      ],
    });
  };

  const removeTextOverlay = (id: string) => {
    setEdits({
      ...edits,
      textOverlays:
        edits.textOverlays?.filter(overlay => overlay.id !== id) || [],
    });
  };

  const handleResizeChange = (
    field: keyof EditParameters['resize'],
    value: number
  ) => {
    setEdits({
      ...edits,
      resize: {
        ...edits.resize,
        [field]: value,
      } as EditParameters['resize'],
    });
  };

  const handleFilterChange = (filter: string) => {
    setEdits({
      ...edits,
      filter,
    });
  };

  // Watermark functions
  const handleWatermarkTypeChange = (type: 'text' | 'image') => {
    setEdits({
      ...edits,
      watermark: {
        ...edits.watermark,
        type,
      } as EditParameters['watermark'],
    });
  };

  const handleWatermarkTextChange = (text: string) => {
    setEdits({
      ...edits,
      watermark: {
        ...edits.watermark,
        text,
      } as EditParameters['watermark'],
    });
  };

  const handleWatermarkImageUrlChange = (imageUrl: string) => {
    setEdits({
      ...edits,
      watermark: {
        ...edits.watermark,
        imageUrl,
      } as EditParameters['watermark'],
    });
  };

  const handleWatermarkPositionChange = (
    position: EditParameters['watermark']['position']
  ) => {
    setEdits({
      ...edits,
      watermark: {
        ...edits.watermark,
        position,
      } as EditParameters['watermark'],
    });
  };

  const handleWatermarkOpacityChange = (opacity: number) => {
    setEdits({
      ...edits,
      watermark: {
        ...edits.watermark,
        opacity,
      } as EditParameters['watermark'],
    });
  };

  const handleWatermarkSizeChange = (size: number) => {
    setEdits({
      ...edits,
      watermark: {
        ...edits.watermark,
        size,
      } as EditParameters['watermark'],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Batch Edit ({thumbnails.length} thumbnails)
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <nav className="p-4">
              <button
                onClick={() => setActiveTab('adjust')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                  activeTab === 'adjust'
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                Adjust
              </button>

              <button
                onClick={() => setActiveTab('transform')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                  activeTab === 'transform'
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                onClick={() => setActiveTab('filters')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                  activeTab === 'filters'
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                onClick={() => setActiveTab('text')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                  activeTab === 'text'
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                onClick={() => setActiveTab('watermark')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'watermark'
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
            </nav>
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview Thumbnails */}
            <div className="h-32 border-b border-gray-200 dark:border-gray-700 overflow-x-auto bg-gray-100 dark:bg-gray-900">
              <div className="flex p-2 space-x-2">
                {thumbnails.slice(0, 10).map(thumbnail => (
                  <div
                    key={thumbnail.id}
                    className="flex-shrink-0 w-24 h-24 relative"
                  >
                    <img
                      src={thumbnail.imageUrl}
                      alt={thumbnail.title}
                      className="w-full h-full object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium">
                        {thumbnail.title}
                      </span>
                    </div>
                  </div>
                ))}
                {thumbnails.length > 10 && (
                  <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-md">
                    <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                      +{thumbnails.length - 10} more
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
              <div className="p-4">
                {/* Adjust Tab */}
                {activeTab === 'adjust' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Adjustments
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Brightness: {edits.brightness}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={edits.brightness}
                          onChange={e =>
                            handleSliderChange(
                              'brightness',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Contrast: {edits.contrast}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={edits.contrast}
                          onChange={e =>
                            handleSliderChange(
                              'contrast',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Saturation: {edits.saturation}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={edits.saturation}
                          onChange={e =>
                            handleSliderChange(
                              'saturation',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Hue: {edits.hue}°
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={edits.hue}
                          onChange={e =>
                            handleSliderChange('hue', parseInt(e.target.value))
                          }
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Blur: {edits.blur}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={edits.blur}
                          onChange={e =>
                            handleSliderChange('blur', parseInt(e.target.value))
                          }
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sharpen: {edits.sharpen}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={edits.sharpen}
                          onChange={e =>
                            handleSliderChange(
                              'sharpen',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Transform Tab */}
                {activeTab === 'transform' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Transform
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Rotation: {edits.rotation}°
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={edits.rotation}
                          onChange={e =>
                            handleSliderChange(
                              'rotation',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="flex space-x-4 items-end">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={edits.flipHorizontal}
                            onChange={e =>
                              handleCheckboxChange(
                                'flipHorizontal',
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Flip Horizontal
                          </span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={edits.flipVertical}
                            onChange={e =>
                              handleCheckboxChange(
                                'flipVertical',
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Flip Vertical
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Filters Tab */}
                {activeTab === 'filters' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
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
                          onClick={() => handleFilterChange(filter)}
                          className={`p-3 rounded-md text-center ${
                            edits.filter === filter
                              ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className="font-medium text-gray-900 dark:text-white capitalize">
                            {filter === 'blackwhite' ? 'Black & White' : filter}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text Tab */}
                {activeTab === 'text' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
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
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                        >
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              value={overlay.text}
                              onChange={e =>
                                handleTextOverlayChange(
                                  overlay.id,
                                  'text',
                                  e.target.value
                                )
                              }
                              placeholder="Enter text"
                              className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <select
                              value={overlay.position}
                              onChange={e =>
                                handleTextOverlayChange(
                                  overlay.id,
                                  'position',
                                  e.target.value
                                )
                              }
                              className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="top">Top</option>
                              <option value="center">Center</option>
                              <option value="bottom">Bottom</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                                Font Size
                              </label>
                              <input
                                type="number"
                                value={overlay.fontSize}
                                onChange={e =>
                                  handleTextOverlayChange(
                                    overlay.id,
                                    'fontSize',
                                    parseInt(e.target.value) || 12
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                                Color
                              </label>
                              <input
                                type="color"
                                value={overlay.color}
                                onChange={e =>
                                  handleTextOverlayChange(
                                    overlay.id,
                                    'color',
                                    e.target.value
                                  )
                                }
                                className="w-full h-8 border border-gray-300 dark:border-gray-600 rounded-md"
                              />
                            </div>
                          </div>

                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => removeTextOverlay(overlay.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Watermark Tab */}
                {activeTab === 'watermark' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Watermark
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Watermark Type
                        </label>
                        <div className="flex space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="watermarkType"
                              checked={edits.watermark?.type === 'text'}
                              onChange={e => handleWatermarkTypeChange('text')}
                              className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Text
                            </span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="watermarkType"
                              checked={edits.watermark?.type === 'image'}
                              onChange={e => handleWatermarkTypeChange('image')}
                              className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Image
                            </span>
                          </label>
                        </div>
                      </div>

                      {edits.watermark?.type === 'text' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Text
                          </label>
                          <input
                            type="text"
                            value={edits.watermark?.text || ''}
                            onChange={e =>
                              handleWatermarkTextChange(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {edits.watermark?.type === 'image' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Image URL
                          </label>
                          <input
                            type="text"
                            value={edits.watermark?.imageUrl || ''}
                            onChange={e =>
                              handleWatermarkImageUrlChange(e.target.value)
                            }
                            placeholder="Enter image URL"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Position
                        </label>
                        <select
                          value={edits.watermark?.position}
                          onChange={e =>
                            handleWatermarkPositionChange(e.target.value as any)
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Opacity: {edits.watermark?.opacity}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={edits.watermark?.opacity}
                            onChange={e =>
                              handleWatermarkOpacityChange(
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Size: {edits.watermark?.size}px
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={edits.watermark?.size}
                            onChange={e =>
                              handleWatermarkSizeChange(
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Applying edits to {thumbnails.length} thumbnails
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={processing}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {processing ? 'Applying...' : 'Apply to All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchEditor;
