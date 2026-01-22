import React from 'react';
import type { ToolType, ToolSettings } from '../types/editor.types';

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
};

const toolGroups: { name: string; tools: ToolItem[] }[] = [
  {
    name: 'Selection',
    tools: [
      { id: 'select', icon: <Icons.Select />, label: 'Select', shortcut: 'V' },
      { id: 'move', icon: <Icons.Move />, label: 'Move', shortcut: 'M' },
    ],
  },
  {
    name: 'Drawing',
    tools: [
      { id: 'brush', icon: <Icons.Brush />, label: 'Brush', shortcut: 'B' },
      { id: 'eraser', icon: <Icons.Eraser />, label: 'Eraser', shortcut: 'E' },
      { id: 'pen', icon: <Icons.Pen />, label: 'Pen', shortcut: 'P' },
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

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  activeTool,
  onToolSelect,
}) => {
  return (
    <aside className="tools-panel">
      {toolGroups.map((group, groupIndex) => (
        <div key={group.name} className="tools-panel__group">
          {group.tools.map((tool) => (
            <button
              key={tool.id}
              className={`tool-button ${activeTool === tool.id ? 'tool-button--active' : ''}`}
              onClick={() => onToolSelect(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
            >
              {tool.icon}
              <span className="tool-button__tooltip">
                {tool.label}
                <span className="tool-button__shortcut">{tool.shortcut}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
};

export default ToolsPanel;
