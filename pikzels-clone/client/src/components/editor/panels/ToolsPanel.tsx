import React, { useState, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown } from 'lucide-react';
import type { ToolType, ToolSettings } from '../types/editor.types';
import { getDisclosurePref, setDisclosurePref } from '../../ui/CollapsibleSection';
import { useEditorStore, selectEditorMode } from '../../../stores/editorStore';
import Tooltip from '../../ui/Tooltip';

interface ToolsPanelProps {
  activeTool: ToolType;
  toolSettings: ToolSettings;
  onToolSelect: (tool: ToolType) => void;
  onSettingsChange: (settings: Partial<ToolSettings>) => void;
}

interface ToolItem {
  id: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

// SVG Icons as components
const Icons = {
  Select: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    </svg>
  ),
  SmartSelect: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      <circle cx="18" cy="18" r="4" fill="currentColor" stroke="none" />
      <path d="M16.5 18h3M18 16.5v3" stroke="#1a1a2e" strokeWidth="1.5" />
    </svg>
  ),
  Move: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 9 2 12 5 15" />
      <polyline points="9 5 12 2 15 5" />
      <polyline points="15 19 12 22 9 19" />
      <polyline points="19 9 22 12 19 15" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  ),
  Brush: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
    </svg>
  ),
  Eraser: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  ),
  Pen: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  ),
  Clone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </svg>
  ),
  Gradient: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="6" fill="url(#grad)" stroke="none" />
    </svg>
  ),
  Rectangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  ),
  Ellipse: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="10" ry="8" />
    </svg>
  ),
  Polygon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
    </svg>
  ),
  Line: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="19" y2="5" />
    </svg>
  ),
  Text: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  Eyedropper: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 22 1-1h3l9-9" />
      <path d="M3 21v-3l9-9" />
      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
    </svg>
  ),
  Fill: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
      <path d="m5 2 5 5" />
      <path d="M2 13h15" />
      <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
    </svg>
  ),
  Crop: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
  ),
  Hand: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  ),
  Zoom: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  // Composite shape icon for flyout button
  Shapes: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="10" height="10" rx="1" />
      <circle cx="17" cy="17" r="5" />
    </svg>
  ),
};

// Shape tools that will be consolidated into a flyout in Simple mode
export const SHAPE_TOOL_IDS: ToolType[] = ['rectangle', 'ellipse', 'polygon', 'line'];

// Simple mode only shows these essential tools
export const SIMPLE_MODE_TOOL_IDS: Set<string> = new Set([
  'select', 'text', 'eraser', 'crop', 'hand',
  // 'shapes' is handled separately via flyout
]);

const toolGroups: { name: string; tools: ToolItem[] }[] = [
  {
    name: 'Selection',
    tools: [
      { id: 'select', icon: <Icons.Select />, label: 'Select', shortcut: 'V' },
      { id: 'smart-select', icon: <Icons.SmartSelect />, label: 'Smart Select (AI)', shortcut: 'W' },
      { id: 'move', icon: <Icons.Move />, label: 'Move', shortcut: 'M' },
    ],
  },
  {
    name: 'Drawing',
    tools: [
      { id: 'brush', icon: <Icons.Brush />, label: 'Brush', shortcut: 'B' },
      { id: 'eraser', icon: <Icons.Eraser />, label: 'Eraser', shortcut: 'E' },
      { id: 'pen', icon: <Icons.Pen />, label: 'Pen', shortcut: 'P' },
      { id: 'clone', icon: <Icons.Clone />, label: 'Clone Stamp', shortcut: 'K' },
      { id: 'gradient', icon: <Icons.Gradient />, label: 'Gradient', shortcut: 'J' },
    ],
  },
  {
    name: 'Shapes',
    tools: [
      { id: 'rectangle', icon: <Icons.Rectangle />, label: 'Rectangle', shortcut: 'R' },
      { id: 'ellipse', icon: <Icons.Ellipse />, label: 'Ellipse', shortcut: 'O' },
      { id: 'polygon', icon: <Icons.Polygon />, label: 'Polygon', shortcut: 'G' },
      { id: 'line', icon: <Icons.Line />, label: 'Line', shortcut: 'L' },
    ],
  },
  {
    name: 'Text & Color',
    tools: [
      { id: 'text', icon: <Icons.Text />, label: 'Text', shortcut: 'T' },
      { id: 'eyedropper', icon: <Icons.Eyedropper />, label: 'Eyedropper', shortcut: 'I' },
      { id: 'fill', icon: <Icons.Fill />, label: 'Fill', shortcut: 'F' },
    ],
  },
  {
    name: 'Transform',
    tools: [
      { id: 'crop', icon: <Icons.Crop />, label: 'Crop', shortcut: 'C' },
    ],
  },
  {
    name: 'Navigation',
    tools: [
      { id: 'hand', icon: <Icons.Hand />, label: 'Hand', shortcut: 'H' },
      { id: 'zoom', icon: <Icons.Zoom />, label: 'Zoom', shortcut: 'Z' },
    ],
  },
];

// Progressive disclosure: essential tools always visible, rest behind "More Tools"
const ESSENTIAL_TOOL_IDS: Set<string> = new Set([
  'select', 'move', 'text', 'crop', 'rectangle', 'hand',
]);

// Shape tools lookup for flyout
const shapeTools: ToolItem[] = [
  { id: 'rectangle', icon: <Icons.Rectangle />, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: <Icons.Ellipse />, label: 'Ellipse', shortcut: 'O' },
  { id: 'polygon', icon: <Icons.Polygon />, label: 'Polygon', shortcut: 'G' },
  { id: 'line', icon: <Icons.Line />, label: 'Line', shortcut: 'L' },
];

// ShapesFlyout component for Simple mode
interface ShapesFlyoutProps {
  activeTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
}

const ShapesFlyout: React.FC<ShapesFlyoutProps> = ({ activeTool, onToolSelect }) => {
  const [open, setOpen] = useState(false);
  const isShapeActive = SHAPE_TOOL_IDS.includes(activeTool);
  
  // Get the active shape's icon, or default to Shapes icon
  const activeShapeTool = shapeTools.find(t => t.id === activeTool);
  const ActiveIcon: React.FC = activeShapeTool ? () => <>{activeShapeTool.icon}</> : Icons.Shapes;

  const handleSelect = (toolId: ToolType) => {
    onToolSelect(toolId);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={`tool-button tool-button--flyout ${isShapeActive ? 'tool-button--active' : ''}`}
          title="Shapes (R)"
          aria-label="Shapes (R)"
        >
          <ActiveIcon />
          <ChevronDown className="tool-button__chevron" size={10} />
          <span className="tool-button__tooltip">
            Shapes
            <span className="tool-button__shortcut">R</span>
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="shapes-flyout"
          side="right"
          sideOffset={8}
          align="start"
        >
          <div className="shapes-flyout__grid">
            {shapeTools.map((tool) => (
              <button
                key={tool.id}
                className={`shapes-flyout__item ${activeTool === tool.id ? 'shapes-flyout__item--active' : ''}`}
                onClick={() => handleSelect(tool.id)}
                title={`${tool.label} (${tool.shortcut})`}
              >
                {tool.icon}
                <span className="shapes-flyout__label">{tool.label}</span>
              </button>
            ))}
          </div>
          <Popover.Arrow className="shapes-flyout__arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  activeTool,
  toolSettings,
  onToolSelect,
  onSettingsChange,
}) => {
  // Editor mode from store
  const editorMode = useEditorStore(selectEditorMode);
  const isSimpleMode = editorMode === 'simple';

  // Progressive disclosure state
  const [toolsExpanded, setToolsExpanded] = useState(() => getDisclosurePref('editor.toolsExpanded'));

  const toggleToolsExpanded = () => {
    setToolsExpanded((prev) => {
      const next = !prev;
      setDisclosurePref('editor.toolsExpanded', next);
      return next;
    });
  };

  // Flatten all tools, split into essential/advanced
  const allTools = toolGroups.flatMap((g) => g.tools);
  
  // In Simple mode, filter to only simple mode tools (shapes handled via flyout)
  const getFilteredTools = () => {
    if (isSimpleMode) {
      // Simple mode: only essential tools, no shape tools (handled by flyout)
      return allTools.filter((t) => 
        SIMPLE_MODE_TOOL_IDS.has(t.id) && !SHAPE_TOOL_IDS.includes(t.id)
      );
    }
    // Pro mode: show all tools normally
    return allTools;
  };

  const filteredTools = getFilteredTools();
  const essentialTools = filteredTools.filter((t) => ESSENTIAL_TOOL_IDS.has(t.id) && !SHAPE_TOOL_IDS.includes(t.id));
  const advancedTools = filteredTools.filter((t) => !ESSENTIAL_TOOL_IDS.has(t.id) && !SHAPE_TOOL_IDS.includes(t.id));
  
  // Shape tools shown individually only in Pro mode
  const individualShapeTools = isSimpleMode ? [] : allTools.filter((t) => SHAPE_TOOL_IDS.includes(t.id));

  // Auto-expand if an advanced tool is active
  useEffect(() => {
    const isAdvancedActive = advancedTools.some((t) => t.id === activeTool);
    if (isAdvancedActive && !toolsExpanded) {
      setToolsExpanded(true);
      setDisclosurePref('editor.toolsExpanded', true);
    }
  }, [activeTool, advancedTools, toolsExpanded]);

  // Determine if a drawing tool is active
  const isDrawingTool = activeTool === 'brush' || activeTool === 'pen' || activeTool === 'eraser' || activeTool === 'clone';
  const isShapeTool = activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line' || activeTool === 'polygon';
  const isFillTool = activeTool === 'fill';
  const isGradientTool = activeTool === 'gradient';
  const showColorPicker = isDrawingTool || isShapeTool || isFillTool || isGradientTool;

  const handleColorChange = (color: string) => {
    if (isDrawingTool) {
      onSettingsChange({
        brush: { ...toolSettings.brush, color },
      });
    } else if (isShapeTool) {
      onSettingsChange({
        shape: { ...toolSettings.shape, fill: color },
      });
    } else if (isFillTool) {
      onSettingsChange({
        brush: { ...toolSettings.brush, color }, // Fill uses brush color
      });
    } else if (isGradientTool) {
      onSettingsChange({
        gradient: { ...toolSettings.gradient, colorStart: color },
      });
    }
  };

  const handleSizeChange = (size: number) => {
    if (activeTool === 'eraser') {
      onSettingsChange({
        eraser: { ...toolSettings.eraser, size },
      });
    } else if (activeTool === 'clone') {
      onSettingsChange({
        clone: { ...toolSettings.clone, size },
      });
    } else if (isDrawingTool) {
      onSettingsChange({
        brush: { ...toolSettings.brush, size },
      });
    } else if (isShapeTool) {
      onSettingsChange({
        shape: { ...toolSettings.shape, strokeWidth: size },
      });
    }
  };

  const handleOpacityChange = (opacity: number) => {
    if (activeTool === 'eraser') {
      onSettingsChange({
        eraser: { ...toolSettings.eraser, opacity },
      });
    } else if (activeTool === 'clone') {
      onSettingsChange({
        clone: { ...toolSettings.clone, opacity },
      });
    } else if (isDrawingTool) {
      onSettingsChange({
        brush: { ...toolSettings.brush, opacity },
      });
    }
  };

  // Get current color based on active tool
  const currentColor = isGradientTool
    ? toolSettings.gradient.colorStart
    : isShapeTool 
      ? toolSettings.shape.fill 
      : toolSettings.brush.color;
  
  // Get current size based on active tool
  const currentSize = activeTool === 'eraser'
    ? toolSettings.eraser.size
    : activeTool === 'clone'
      ? toolSettings.clone.size
      : isDrawingTool
        ? toolSettings.brush.size
        : toolSettings.shape.strokeWidth;

  // Get current opacity
  const currentOpacity = activeTool === 'eraser'
    ? toolSettings.eraser.opacity
    : activeTool === 'clone'
      ? toolSettings.clone.opacity
      : toolSettings.brush.opacity;

  const renderToolButton = (tool: ToolItem) => (
    <Tooltip key={tool.id} content={`${tool.label} (${tool.shortcut})`} side="right">
    <button
      className={`tool-button ${activeTool === tool.id ? 'tool-button--active' : ''}`}
      onClick={() => onToolSelect(tool.id)}
    >
      {tool.icon}
      <span className="tool-button__tooltip">
        {tool.label}
        <span className="tool-button__shortcut">{tool.shortcut}</span>
      </span>
    </button>
    </Tooltip>
  );

  return (
    <aside className="tools-panel">
      {/* Essential Tools — always visible */}
      <div className="tools-panel__group">
        {essentialTools.map(renderToolButton)}
        {/* Shapes flyout in Simple mode */}
        {isSimpleMode && (
          <ShapesFlyout activeTool={activeTool} onToolSelect={onToolSelect} />
        )}
      </div>

      {/* "More Tools" toggle — only show in Pro mode or if there are advanced tools */}
      {!isSimpleMode && advancedTools.length > 0 && (
        <>
          <button
            className="tools-panel__more-toggle"
            onClick={toggleToolsExpanded}
            aria-expanded={toolsExpanded}
            title={toolsExpanded ? 'Hide advanced tools' : `Show ${advancedTools.length + individualShapeTools.length} more tools`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`tools-panel__more-chevron ${toolsExpanded ? 'tools-panel__more-chevron--open' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {!toolsExpanded && (
              <span className="tools-panel__more-badge">{advancedTools.length + individualShapeTools.length}</span>
            )}
          </button>

          {/* Advanced Tools — collapsible */}
          <div
            className={`tools-panel__advanced ${toolsExpanded ? 'tools-panel__advanced--open' : ''}`}
          >
            {/* Individual shape tools in Pro mode */}
            {individualShapeTools.map(renderToolButton)}
            {advancedTools.map(renderToolButton)}
          </div>
        </>
      )}

      {/* Color & Size Controls for Drawing/Shape Tools */}
      {showColorPicker && (
        <div className="tools-panel__settings">
          {/* Color Picker */}
          {activeTool !== 'eraser' && (
            <div className="tools-panel__setting-row">
              <label className="tools-panel__label">Color</label>
              <div className="tools-panel__color-wrapper">
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="tools-panel__color-input"
                  title="Select color"
                />
                <span 
                  className="tools-panel__color-swatch"
                  style={{ backgroundColor: currentColor }}
                />
              </div>
            </div>
          )}

          {/* Size Slider */}
          <div className="tools-panel__setting-row">
            <label className="tools-panel__label">Size</label>
            <input
              type="range"
              min="1"
              max="100"
              value={currentSize}
              onChange={(e) => handleSizeChange(parseInt(e.target.value))}
              className="tools-panel__slider"
            />
            <span className="tools-panel__value">{currentSize}px</span>
          </div>

          {/* Opacity Slider (for drawing tools only) */}
          {isDrawingTool && (
            <div className="tools-panel__setting-row">
              <label className="tools-panel__label">Opacity</label>
              <input
                type="range"
                min="1"
                max="100"
                value={currentOpacity}
                onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
                className="tools-panel__slider"
              />
              <span className="tools-panel__value">{currentOpacity}%</span>
            </div>
          )}

          {/* Shape-specific: Stroke Color */}
          {isShapeTool && (
            <div className="tools-panel__setting-row">
              <label className="tools-panel__label">Stroke</label>
              <div className="tools-panel__color-wrapper">
                <input
                  type="color"
                  value={toolSettings.shape.stroke}
                  onChange={(e) => onSettingsChange({
                    shape: { ...toolSettings.shape, stroke: e.target.value },
                  })}
                  className="tools-panel__color-input"
                  title="Select stroke color"
                />
                <span 
                  className="tools-panel__color-swatch"
                  style={{ backgroundColor: toolSettings.shape.stroke }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default ToolsPanel;
