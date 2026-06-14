import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import Tooltip from '../../ui/Tooltip';
import { THUMBNAIL_FONTS, TEXT_COLOR_PRESETS } from '../../../constants/text-styles';
import type { TextOverlay } from './types';

interface FloatingEditPanelProps {
  overlay: TextOverlay;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onUpdate: (updates: Partial<TextOverlay>) => void;
  savedPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
}

const FloatingEditPanel: React.FC<FloatingEditPanelProps> = ({
  overlay,
  anchorRef: _anchorRef,
  onClose,
  onUpdate,
  savedPosRef,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDocked, setIsDocked] = useState(!savedPosRef.current);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(savedPosRef.current);
  const draggingPanel = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // Sync docked state when overlay changes
  useEffect(() => {
    if (savedPosRef.current) {
      setPos(savedPosRef.current);
      setIsDocked(false);
    } else {
      setIsDocked(true);
    }
  }, [overlay.id, savedPosRef]);

  const onMouseDownHeader = (e: React.MouseEvent) => {
    // When docked, compute initial fixed position from the panel element
    if (isDocked && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      const startPos = { x: rect.left, y: rect.top };
      setPos(startPos);
      setIsDocked(false);
      draggingPanel.current = true;
      dragStart.current = { mx: e.clientX, my: e.clientY, px: startPos.x, py: startPos.y };
      e.preventDefault();
      return;
    }
    if (!pos) return;
    draggingPanel.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingPanel.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const newPos = { x: dragStart.current.px + dx, y: dragStart.current.py + dy };
      setPos(newPos);
    };
    const onUp = () => {
      if (draggingPanel.current && pos) {
        savedPosRef.current = pos;
      }
      draggingPanel.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [pos, savedPosRef]);

  const handleDock = () => {
    savedPosRef.current = null;
    setIsDocked(true);
    setPos(null);
  };

  return (
    <div
      ref={panelRef}
      style={isDocked ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 20,
      } : {
        position: 'fixed',
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        zIndex: 9999,
        width: 284,
      }}
      className="smart-text-edit-popover bg-gray-800 rounded-xl border border-purple-500/30 shadow-2xl"
    >
      {/* Drag handle header */}
      <div
        onMouseDown={onMouseDownHeader}
        className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700/60
                   cursor-grab active:cursor-grabbing select-none rounded-t-xl
                   bg-gray-750 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">{'\u2807'}</span>
          <span className="text-xs font-medium text-purple-300 uppercase tracking-wider">
            Edit Text
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isDocked && (
            <Tooltip content="Dock to sidebar">
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={handleDock}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-700"
              aria-label="Dock panel to sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            </Tooltip>
          )}
          <Tooltip content="Close panel">
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-700"
            aria-label="Close edit panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          </Tooltip>
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Text input */}
        <input
          type="text"
          value={overlay.text}
          onChange={e => onUpdate({ text: e.target.value })}
          className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-700
                     text-white text-sm focus:outline-none focus:border-purple-500"
        />

        {/* Font picker */}
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
            Font
          </span>
          <div className="grid grid-cols-2 gap-1">
            {THUMBNAIL_FONTS.map(f => (
              <button
                key={f.label}
                onClick={() => onUpdate({ fontFamily: f.value })}
                className={`px-2 py-1.5 rounded text-xs text-left truncate transition-all
                  ${
                    overlay.fontFamily === f.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
            Color
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {TEXT_COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => onUpdate({ color: c })}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  overlay.color === c
                    ? 'border-purple-400 scale-110'
                    : 'border-gray-600 hover:border-gray-400'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Set text color to ${c}`}
                title={c}
              />
            ))}
            <label
              className="relative w-6 h-6 rounded-full border-2 border-dashed border-gray-500 hover:border-gray-300 cursor-pointer flex items-center justify-center transition-colors"
              title="Custom color"
            >
              <span className="text-gray-400 text-[10px] leading-none">+</span>
              <input
                type="color"
                value={overlay.color}
                onChange={e => onUpdate({ color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Custom text color"
                title="Pick custom color"
              />
            </label>
          </div>
        </div>

        {/* Size slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-6">Size</span>
          <input
            type="range"
            min={30}
            max={120}
            value={overlay.fontSize}
            onChange={e => onUpdate({ fontSize: Number(e.target.value) })}
            className="flex-1 accent-purple-500"
            aria-label="Text size"
            title="Text size"
          />
          <span className="text-gray-400 text-[10px] w-6">
            {overlay.fontSize}
          </span>
        </div>

        {/* Banner toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 uppercase">
            Background banner
          </span>
          <button
            onClick={() =>
              onUpdate({
                backgroundColor: overlay.backgroundColor
                  ? ''
                  : 'rgba(0,0,0,0.6)',
              })
            }
            aria-label="Toggle background banner"
            title="Toggle background banner"
            className={`w-9 h-5 rounded-full transition-colors relative
              ${overlay.backgroundColor ? 'bg-purple-600' : 'bg-gray-700'}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform
                ${overlay.backgroundColor ? 'left-[18px]' : 'left-0.5'}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingEditPanel;
