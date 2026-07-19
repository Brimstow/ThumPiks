import type { ReactNode } from 'react';

export const DragDropProvider = ({ children }: { children?: ReactNode }) => children ?? null;
export const DragOverlay = ({ children }: { children?: ReactNode }) => children ?? null;

const noopRef = () => {};
export const useDroppable = () => ({ ref: noopRef, isDropTarget: false });
export const useDraggable = () => ({ ref: noopRef, handleRef: noopRef, isDragging: false });
