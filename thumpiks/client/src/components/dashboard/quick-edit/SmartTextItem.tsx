import React from 'react';
import { X } from 'lucide-react';
import Tooltip from '../../ui/Tooltip';
import type { TextOverlay } from './types';

interface SmartTextItemProps {
  overlay: TextOverlay;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

const SmartTextItem: React.FC<SmartTextItemProps> = ({
  overlay,
  isActive,
  onSelect,
  onRemove,
}) => (
  <div
    onClick={onSelect}
    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all group
      ${
        isActive
          ? 'bg-purple-600/15 border-l-2 border-l-purple-500'
          : 'hover:bg-gray-700/30 border-l-2 border-l-transparent'
      }`}
  >
    <span
      className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-600"
      style={{ backgroundColor: overlay.color }}
    />
    <span
      className="text-sm text-gray-300 truncate flex-1"
      style={{ fontFamily: overlay.fontFamily }}
    >
      {overlay.text}
    </span>
    <Tooltip content="Remove text">
    <button
      onClick={e => {
        e.stopPropagation();
        onRemove();
      }}
      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-0.5"
      aria-label={`Remove text: ${overlay.text}`}
    >
      <X className="w-3 h-3" />
    </button>
    </Tooltip>
  </div>
);

export default SmartTextItem;
