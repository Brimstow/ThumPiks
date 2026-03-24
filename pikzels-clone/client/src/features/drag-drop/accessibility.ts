/**
 * Drag-and-Drop Accessibility Utilities
 * 
 * Screen reader announcements and keyboard support for WCAG 2.5.7 compliance.
 * 
 * @see https://www.w3.org/WAI/WCAG21/Understanding/dragging-movements.html
 */

/**
 * Drag event types for layer announcements
 */
export type DragEventType = 'pickup' | 'move' | 'drop' | 'cancel';

/**
 * Drag event types for template announcements
 */
export type TemplateDragEventType = 
  | 'pickup'
  | 'over-canvas'
  | 'over-trash'
  | 'drop-canvas'
  | 'drop-trash'
  | 'cancel';

/**
 * Build screen reader announcement for layer drag operations.
 * 
 * @param event - The drag event type
 * @param layerName - Name of the layer being dragged
 * @param position - Current position (1-indexed for human readability)
 * @param total - Total number of layers
 * @returns Announcement string for aria-live region
 */
export function buildLayerAnnouncement(
  event: DragEventType,
  layerName: string,
  position: number,
  total: number
): string {
  switch (event) {
    case 'pickup':
      return `Picked up layer ${layerName}, position ${position} of ${total}. Use arrow keys to move, Space or Enter to drop, Escape to cancel.`;
    case 'move':
      return `Layer ${layerName} moved to position ${position} of ${total}.`;
    case 'drop':
      return `Layer ${layerName} dropped at position ${position} of ${total}.`;
    case 'cancel':
      return `Drag cancelled. Layer ${layerName} returned to position ${position} of ${total}.`;
  }
}

/**
 * Keyboard key codes for drag operations
 */
export const DRAG_KEYS = {
  PICKUP: ['Space', 'Enter'],
  DROP: ['Space', 'Enter'],
  MOVE_UP: ['ArrowUp'],
  MOVE_DOWN: ['ArrowDown'],
  CANCEL: ['Escape'],
} as const;

/**
 * Check if a keyboard event matches pickup/drop action
 */
export function isPickupDropKey(key: string): boolean {
  return DRAG_KEYS.PICKUP.includes(key as typeof DRAG_KEYS.PICKUP[number]);
}

/**
 * Check if a keyboard event matches move up action
 */
export function isMoveUpKey(key: string): boolean {
  return DRAG_KEYS.MOVE_UP.includes(key as typeof DRAG_KEYS.MOVE_UP[number]);
}

/**
 * Check if a keyboard event matches move down action
 */
export function isMoveDownKey(key: string): boolean {
  return DRAG_KEYS.MOVE_DOWN.includes(key as typeof DRAG_KEYS.MOVE_DOWN[number]);
}

/**
 * Check if a keyboard event matches cancel action
 */
export function isCancelKey(key: string): boolean {
  return DRAG_KEYS.CANCEL.includes(key as typeof DRAG_KEYS.CANCEL[number]);
}

/**
 * Build screen reader announcement for template drag operations.
 * 
 * @param event - The template drag event type
 * @param templateName - Name of the template being dragged
 * @param layerCount - Number of layers in the template (optional)
 * @returns Announcement string for aria-live region
 */
export function buildTemplateAnnouncement(
  event: TemplateDragEventType,
  templateName: string,
  layerCount?: number
): string {
  const layerInfo = layerCount ? `${layerCount} layer${layerCount !== 1 ? 's' : ''}` : 'layers';
  
  switch (event) {
    case 'pickup':
      return `Template "${templateName}" picked up. Use arrow keys to move, Enter to drop on canvas, Escape to cancel.`;
    case 'over-canvas':
      return `Over canvas drop zone. Release or press Enter to add as ${layerInfo}.`;
    case 'over-trash':
      return `Over trash zone. Release or press Enter to remove layer.`;
    case 'drop-canvas':
      return `Template "${templateName}" added to canvas as ${layerInfo}.`;
    case 'drop-trash':
      return `Layer removed from canvas.`;
    case 'cancel':
      return `Drag cancelled. "${templateName}" returned to original position.`;
  }
}

/**
 * Build screen reader announcement for layer removal operations.
 * 
 * @param layerName - Name of the layer being removed
 * @param isGroupRemoval - Whether removing entire template group
 * @param groupLayerCount - Number of layers in the group (if applicable)
 * @returns Announcement string for aria-live region
 */
export function buildLayerRemovalAnnouncement(
  layerName: string,
  isGroupRemoval: boolean = false,
  groupLayerCount?: number
): string {
  if (isGroupRemoval && groupLayerCount && groupLayerCount > 1) {
    return `Removed ${groupLayerCount} layers from template group.`;
  }
  return `Layer "${layerName}" removed from canvas.`;
}

/**
 * Screen reader instructions text for template drag operations.
 * Used for aria-describedby references.
 */
export const TEMPLATE_DRAG_INSTRUCTIONS = 
  'To pick up a draggable template, press Space or Enter. ' +
  'While dragging, use Arrow keys to move. ' +
  'Press Enter to drop on the canvas, or Escape to cancel.';

/**
 * Screen reader instructions text for layer drag operations (reordering).
 * Used for aria-describedby references.
 */
export const LAYER_DRAG_INSTRUCTIONS = 
  'Press Space or Enter to pick up. Use Arrow keys to move. ' +
  'Press Space or Enter to drop. Press Escape to cancel.';

/**
 * Keyboard movement step size in pixels for arrow key navigation
 */
export const KEYBOARD_MOVE_STEP = 10;
