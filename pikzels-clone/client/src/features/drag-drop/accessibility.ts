/**
 * Drag-and-Drop Accessibility Utilities
 * 
 * Screen reader announcements and keyboard support for WCAG 2.5.7 compliance.
 * 
 * @see https://www.w3.org/WAI/WCAG21/Understanding/dragging-movements.html
 */

/**
 * Drag event types for announcements
 */
export type DragEventType = 'pickup' | 'move' | 'drop' | 'cancel';

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
