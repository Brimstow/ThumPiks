import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  initializeCanvas,
  clearCanvas as clearCanvasHelper,
  beginDrawPath,
  drawToPoint,
  getCanvasCoordinates,
  captureCanvasState,
  restoreCanvasState,
  exportCanvasAsDataURL,
  type Point,
  type DrawingConfig,
} from './editor/canvas/canvasDrawingHelpers';
import { INLINE_EDIT_STYLES } from '../hooks/useInlineTextEdit';

interface CanvasEditorProps {
  thumbnailId?: string;
  onClose: () => void;
  onSave: (canvasData: CanvasData) => void;
}

interface CanvasData {
  imageData: string;
  metadata: {
    width: number;
    height: number;
    tool: string;
  };
}

type Tool = 'brush' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text' | 'select';

const CanvasEditor: React.FC<CanvasEditorProps> = ({ thumbnailId, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  // Text tool state
  const [textInput, setTextInput] = useState<{ x: number; y: number; text: string } | null>(null);

  const commitText = useCallback(() => {
    if (!textInput || !textInput.text.trim()) {
      setTextInput(null);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) { setTextInput(null); return; }

    ctx.font = `${brushSize * 4}px Inter, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.fillText(textInput.text, textInput.x, textInput.y);
    setTextInput(null);
    // saveToHistory is called after state update via effect
  }, [textInput, brushSize, color]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize canvas with white background (using helper)
    initializeCanvas(ctx, canvas.width, canvas.height);

    // Save initial state
    saveToHistory();
  }, []);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = captureCanvasState(ctx, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const prevStep = historyStep - 1;
        restoreCanvasState(ctx, history[prevStep]);
        setHistoryStep(prevStep);
      }
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const nextStep = historyStep + 1;
        restoreCanvasState(ctx, history[nextStep]);
        setHistoryStep(nextStep);
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearCanvasHelper(ctx, canvas.width, canvas.height);
    saveToHistory();
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = exportCanvasAsDataURL(canvas);
    const canvasData: CanvasData = {
      imageData,
      metadata: {
        width: canvas.width,
        height: canvas.height,
        tool: selectedTool,
      },
    };
    onSave(canvasData);
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasCoordinates(canvas, e.clientX, e.clientY);

    // Text tool: place input overlay instead of drawing
    if (selectedTool === 'text') {
      // Commit any previous text first
      if (textInput) commitText();
      setTextInput({ x: point.x, y: point.y, text: '' });
      return;
    }

    setIsDrawing(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: DrawingConfig = {
      color,
      lineWidth: brushSize,
      lineCap: 'round',
      strokeStyle: selectedTool === 'eraser' ? '#ffffff' : color,
    };

    beginDrawPath(ctx, point, config);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasCoordinates(canvas, e.clientX, e.clientY);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawToPoint(ctx, point);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const tools: { id: Tool; icon: string; label: string }[] = [
    { id: 'brush', icon: '🖌️', label: 'Brush' },
    { id: 'eraser', icon: '🧹', label: 'Eraser' },
    { id: 'rectangle', icon: '⬜', label: 'Rectangle' },
    { id: 'circle', icon: '⭕', label: 'Circle' },
    { id: 'line', icon: '📏', label: 'Line' },
    { id: 'text', icon: '📝', label: 'Text' },
    { id: 'select', icon: '👆', label: 'Select' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">Canvas Editor</h1>
          {thumbnailId && (
            <span className="text-sm text-gray-500">ID: {thumbnailId}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            Save Thumbnail
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 space-y-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`
                w-14 h-14 rounded-lg flex items-center justify-center text-2xl
                transition-all duration-200 relative group
                ${
                  selectedTool === tool.id
                    ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
              title={tool.label}
            >
              {tool.icon}
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {tool.label}
              </span>
            </button>
          ))}
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas Container */}
          <div className="flex-1 flex items-center justify-center bg-gray-100 p-8 overflow-auto">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden border-2 border-gray-300 relative">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className={selectedTool === 'text' ? 'cursor-text' : 'cursor-crosshair'}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              {/* Text tool input overlay */}
              {textInput && (
                <textarea
                  autoFocus
                  value={textInput.text}
                  onChange={e => setTextInput(prev => prev ? { ...prev, text: e.target.value } : null)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setTextInput(null); }
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); saveToHistory(); }
                  }}
                  onBlur={() => { commitText(); saveToHistory(); }}
                  style={{
                    ...INLINE_EDIT_STYLES,
                    position: 'absolute',
                    left: textInput.x,
                    top: textInput.y,
                    width: 400,
                    minHeight: brushSize * 5,
                    fontSize: brushSize * 4,
                    fontFamily: 'Inter, Arial, sans-serif',
                    color: color,
                    caretColor: '#6366f1',
                    zIndex: 10,
                  }}
                  placeholder="Type here..."
                />
              )}
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="h-16 bg-white border-t border-gray-200 px-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-4">
              {/* Undo/Redo */}
              <div className="flex space-x-2">
                <button
                  onClick={undo}
                  disabled={historyStep === 0}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${
                      historyStep === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }
                  `}
                  title="Undo (Ctrl+Z)"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <button
                  onClick={redo}
                  disabled={historyStep === history.length - 1}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${
                      historyStep === history.length - 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }
                  `}
                  title="Redo (Ctrl+Y)"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>

              <div className="h-8 w-px bg-gray-300" />

              {/* Clear Canvas */}
              <button
                onClick={clearCanvas}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium"
              >
                Clear Canvas
              </button>
            </div>

            {/* Color & Brush Size */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Color:</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 border border-gray-300 rounded-md cursor-pointer"
                />
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Size:</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-600 w-8 text-right">{brushSize}px</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CanvasEditor;
