/**
 * TemplateGroupDragHandle Component
 *
 * A DOM overlay rendered on top of the canvas that provides a draggable
 * handle for template group layers. When a selected layer has a groupId,
 * this component renders a small drag handle at the top-right corner of
 * the template group's bounding box.
 *
 * Dragging the handle to the Layouts panel removes all layers from the
 * template group (via TemplateResetDropZone → TemplateDragDropProvider).
 * Clicking the handle removes the group directly (WCAG 2.5.7 non-drag alt).
 *
 * Follows the same positioning pattern as UploadZoneOverlay: positioned
 * absolutely inside the `scale(zoom)` div, using canvas-coordinate values.
 *
 * PERFORMANCE: useMemo for bounding box calculation.
 */
import React, { useMemo, useCallback, memo } from 'react';
import { useDraggable } from '@dnd-kit/react';
import type { Layer, Selection } from '../../../components/editor/types/editor.types';
import type { CanvasLayerDragItem } from '../types';
import Tooltip from '../../../components/ui/Tooltip';

export interface TemplateGroupDragHandleProps {
  /** All layers in the editor */
  layers: Layer[];
  /** Current selection state */
  selection: Selection;
  /** Callback to remove a template group (WCAG non-drag alternative) */
  onRemoveGroup?: (groupId: string) => void;
}

/** Compute the union bounding box of all layers sharing a groupId */
function computeGroupBounds(layers: Layer[], groupId: string) {
  const groupLayers = layers.filter((l) => l.groupId === groupId);
  if (groupLayers.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const layer of groupLayers) {
    const t = layer.transform;
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + t.width);
    maxY = Math.max(maxY, t.y + t.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

const HANDLE_SIZE = 28;
const HANDLE_OFFSET = 6; // offset outside the bounding box

const TemplateGroupDragHandleInner: React.FC<TemplateGroupDragHandleProps> = ({
  layers,
  selection,
  onRemoveGroup,
}) => {
  // Determine the unique groupId from selected layers
  const groupInfo = useMemo(() => {
    if (selection.layerIds.length === 0) return null;

    const groupIds = new Set<string>();
    let firstGroupLayer: Layer | null = null;

    for (const layerId of selection.layerIds) {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer?.groupId) continue;
      groupIds.add(layer.groupId);
      if (!firstGroupLayer) firstGroupLayer = layer;
    }

    // Only show handle when exactly one unique groupId is selected
    if (groupIds.size !== 1 || !firstGroupLayer) return null;

    const groupId = [...groupIds][0];
    const groupLayerCount = layers.filter((l) => l.groupId === groupId).length;

    return {
      groupId,
      layer: firstGroupLayer,
      layerCount: groupLayerCount,
    };
  }, [layers, selection.layerIds]);

  // Compute bounding box for the group
  const bounds = useMemo(() => {
    if (!groupInfo) return null;
    return computeGroupBounds(layers, groupInfo.groupId);
  }, [layers, groupInfo]);

  // Drag data for @dnd-kit
  const dragData: CanvasLayerDragItem | null = groupInfo
    ? {
        type: 'canvas-layer',
        layerId: groupInfo.layer.id,
        layerName: groupInfo.layer.name,
        layerType: groupInfo.layer.type,
        groupId: groupInfo.groupId,
      }
    : null;

  const { ref, isDragging } = useDraggable({
    id: 'canvas-template-drag-handle',
    data: dragData ?? undefined,
    disabled: !groupInfo,
  });

  // Click handler: WCAG 2.5.7 non-drag alternative
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (groupInfo && onRemoveGroup) {
        onRemoveGroup(groupInfo.groupId);
      }
    },
    [groupInfo, onRemoveGroup],
  );

  // Don't render if no valid template group selected or no bounds
  if (!groupInfo || !bounds) return null;

  // Position: top-right corner of the group bounding box
  const handleLeft = bounds.x + bounds.width + HANDLE_OFFSET;
  const handleTop = bounds.y - HANDLE_SIZE - HANDLE_OFFSET;

  const tooltipContent = (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <strong>Template Group</strong>
      <span style={{ opacity: 0.85 }}>
        {groupInfo.layerCount} layer{groupInfo.layerCount !== 1 ? 's' : ''}
      </span>
      <span style={{ opacity: 0.7, fontSize: 11 }}>
        Drag to Layouts to remove, or click to remove
      </span>
    </span>
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 45,
      }}
    >
      <Tooltip content={tooltipContent} side="top" sideOffset={6} delayDuration={400}>
        <div
          ref={ref}
          role="button"
          tabIndex={0}
          aria-label={`Remove template group "${groupInfo.layer.name}" (${groupInfo.layerCount} layer${groupInfo.layerCount !== 1 ? 's' : ''}). Drag to Layouts panel or click to remove.`}
          aria-grabbed={isDragging}
          aria-describedby="template-drag-instructions"
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              if (groupInfo && onRemoveGroup) {
                onRemoveGroup(groupInfo.groupId);
              }
            }
          }}
          style={{
            position: 'absolute',
            left: handleLeft,
            top: handleTop,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            borderRadius: HANDLE_SIZE / 2,
            background: isDragging
              ? 'rgba(99, 102, 241, 0.95)'
              : 'rgba(99, 102, 241, 0.8)',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            pointerEvents: 'auto',
            touchAction: 'none',
            opacity: isDragging ? 0.6 : 1,
            transition: 'background 150ms ease-out, opacity 150ms ease-out',
          }}
        >
          {/* Return arrow icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 14 4 9 9 4" />
            <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
          </svg>
        </div>
      </Tooltip>
    </div>
  );
};

export const TemplateGroupDragHandle = memo(TemplateGroupDragHandleInner);
TemplateGroupDragHandle.displayName = 'TemplateGroupDragHandle';

export default TemplateGroupDragHandle;
