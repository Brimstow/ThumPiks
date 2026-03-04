import { useCallback } from 'react';
import { authPost } from '../../../utils/api';
import type { Layer, TextLayer, ImageLayer, ShapeLayer } from '../types/editor.types';

// ============================================================================
// AI Command Executor Hook
// Maps structured editor actions from the LLM to existing editor dispatch/handlers
// ============================================================================

/** Matches the backend EditorAction type */
export interface EditorAction {
  action: string;
  target: 'selected' | 'auto' | string;
  description: string;
  params: Record<string, unknown>;
}

/** Matches the backend EditorCommandResult type */
export interface EditorCommandResult {
  success: boolean;
  actions: EditorAction[];
  summary: string;
  needsAutoTarget: boolean;
  autoTargetQuery?: string;
}

/** Layer context sent to the backend for LLM awareness */
export interface LayerContext {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
  text?: string;
  font?: string;
  fontSize?: number;
  color?: string;
}

/** Editor callbacks that the executor wires into */
export interface CommandExecutorCallbacks {
  // Layer operations
  addTextLayer: (text: string, x: number, y: number) => void;
  addShapeLayer: (shape: 'rectangle' | 'ellipse' | 'polygon' | 'line' | 'star' | 'arrow' | 'custom', x: number, y: number, w: number, h: number) => void;
  addImageLayer: (src: string, name?: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  selectLayer: (layerId: string) => void;
  reorderLayers: (layerIds: string[]) => void;
  // AI operations (via useBackendAI)
  callBackendAI: (operation: 'generate' | 'inpaint' | 'face-swap' | 'upscale' | 'remove-background' | 'enhance' | 'segment', request: Record<string, unknown>) => Promise<string[]>;
  // State getters
  getLayers: () => Layer[];
  getLayerOrder: () => string[];
  getSelectedLayerIds: () => string[];
  getCanvasSize: () => { width: number; height: number };
}

interface UseCommandExecutorReturn {
  /** Send a natural language prompt to the LLM and get structured actions */
  parseCommand: (prompt: string) => Promise<EditorCommandResult>;
  /** Execute a single parsed action using editor callbacks */
  executeAction: (action: EditorAction) => Promise<void>;
  /** Execute all actions from a command result */
  executeAll: (result: EditorCommandResult) => Promise<{ executed: number; errors: string[] }>;
  /** Build the canvas context payload for the backend */
  buildContext: () => { width: number; height: number; layers: LayerContext[] };
}

export function useCommandExecutor(
  callbacks: CommandExecutorCallbacks
): UseCommandExecutorReturn {
  /** Build canvas context from current editor state */
  const buildContext = useCallback(() => {
    const layers = callbacks.getLayers();
    const selectedIds = callbacks.getSelectedLayerIds();
    const { width, height } = callbacks.getCanvasSize();

    const layerContexts: LayerContext[] = layers.map((layer) => {
      const ctx: LayerContext = {
        id: layer.id,
        type: layer.type,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        selected: selectedIds.includes(layer.id),
      };

      if (layer.type === 'text') {
        const tl = layer as TextLayer;
        ctx.text = tl.content;
        ctx.font = tl.fontFamily;
        ctx.fontSize = tl.fontSize;
        ctx.color = tl.fill;
      }

      if (layer.type === 'shape') {
        const sl = layer as ShapeLayer;
        ctx.color = sl.fill;
      }

      return ctx;
    });

    return { width, height, layers: layerContexts };
  }, [callbacks]);

  /** Send prompt to backend LLM for structured parsing */
  const parseCommand = useCallback(
    async (prompt: string): Promise<EditorCommandResult> => {
      const canvasContext = buildContext();

      const response = await authPost('/api/editor-command', {
        prompt,
        canvasContext,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 402) {
          throw new Error(data.error || 'Insufficient credits');
        }
        throw new Error(data.error || 'Failed to parse command');
      }

      const data: EditorCommandResult = await response.json();
      return data;
    },
    [buildContext]
  );

  /** Find the target layer for an action */
  const resolveTarget = useCallback(
    (action: EditorAction): Layer | null => {
      const layers = callbacks.getLayers();
      const selectedIds = callbacks.getSelectedLayerIds();

      if (action.target === 'selected') {
        // Use the currently selected layer
        const selectedId = selectedIds[0];
        return layers.find((l) => l.id === selectedId) || null;
      }

      if (action.target === 'auto' || action.target === 'new') {
        // For 'new', no target needed (creating something)
        // For 'auto', SAM targeting would happen here in the future
        return null;
      }

      // Try to match by layer name or type
      const byName = layers.find(
        (l) => l.name.toLowerCase().includes(action.target.toLowerCase())
      );
      if (byName) return byName;

      // Try to match by layer type
      const byType = layers.find(
        (l) => l.type === action.target
      );
      return byType || null;
    },
    [callbacks]
  );

  /** Execute a single editor action */
  const executeAction = useCallback(
    async (action: EditorAction): Promise<void> => {
      const { width, height } = callbacks.getCanvasSize();
      const targetLayer = resolveTarget(action);

      switch (action.action) {
        // ---- LAYER CREATION ----
        case 'addText': {
          const p = action.params;
          const x = typeof p.x === 'number' ? p.x : width / 2;
          const y = typeof p.y === 'number' ? p.y : height / 2;
          const text = (p.text as string) || 'New Text';
          callbacks.addTextLayer(text, x, y);

          // After adding, update styling if specified
          // The newly added layer will be the last one
          const layers = callbacks.getLayers();
          const newLayer = layers[layers.length - 1];
          if (newLayer && newLayer.type === 'text') {
            const updates: Partial<TextLayer> = {};
            if (p.fontSize) updates.fontSize = p.fontSize as number;
            if (p.fontFamily) updates.fontFamily = p.fontFamily as string;
            if (p.color) updates.fill = p.color as string;
            if (p.bold) updates.fontWeight = 700;
            if (p.italic) updates.fontStyle = 'italic';
            if (Object.keys(updates).length > 0) {
              callbacks.updateLayer(newLayer.id, updates);
            }
          }
          break;
        }

        case 'addShape': {
          const p = action.params;
          const shape = (p.shape as string) || 'rectangle';
          const x = typeof p.x === 'number' ? p.x : 100;
          const y = typeof p.y === 'number' ? p.y : 100;
          const w = typeof p.width === 'number' ? p.width : 200;
          const h = typeof p.height === 'number' ? p.height : 200;
          callbacks.addShapeLayer(shape as 'rectangle' | 'ellipse' | 'polygon' | 'line' | 'star' | 'arrow' | 'custom', x, y, w, h);

          if (p.color) {
            const layers = callbacks.getLayers();
            const newLayer = layers[layers.length - 1];
            if (newLayer && newLayer.type === 'shape') {
              callbacks.updateLayer(newLayer.id, { fill: p.color as string } as Partial<ShapeLayer>);
            }
          }
          break;
        }

        // ---- TEXT EDITING ----
        case 'updateText': {
          if (!targetLayer || targetLayer.type !== 'text') break;
          const p = action.params;
          const updates: Partial<TextLayer> = {};
          if (p.text !== undefined) updates.content = p.text as string;
          if (p.fontSize !== undefined) updates.fontSize = p.fontSize as number;
          if (p.fontFamily !== undefined) updates.fontFamily = p.fontFamily as string;
          if (p.color !== undefined) updates.fill = p.color as string;
          if (p.bold !== undefined) updates.fontWeight = p.bold ? 700 : 400;
          if (p.italic !== undefined) updates.fontStyle = p.italic ? 'italic' : 'normal';
          callbacks.updateLayer(targetLayer.id, updates);
          break;
        }

        case 'recolorLayer': {
          if (!targetLayer) break;
          const color = action.params.color as string;
          if (targetLayer.type === 'text') {
            callbacks.updateLayer(targetLayer.id, { fill: color } as Partial<TextLayer>);
          } else if (targetLayer.type === 'shape') {
            callbacks.updateLayer(targetLayer.id, { fill: color } as Partial<ShapeLayer>);
          }
          break;
        }

        // ---- IMAGE AI OPERATIONS ----
        case 'removeBackground': {
          if (!targetLayer || targetLayer.type !== 'image') break;
          const images = await callbacks.callBackendAI('remove-background', {
            image: (targetLayer as ImageLayer).src,
          });
          if (images.length > 0) {
            callbacks.updateLayer(targetLayer.id, { src: images[0] } as Partial<ImageLayer>);
          }
          break;
        }

        case 'enhance': {
          if (!targetLayer || targetLayer.type !== 'image') break;
          const enhanceType = (action.params.enhancementType as string) || 'auto';
          const images = await callbacks.callBackendAI('enhance', {
            image: (targetLayer as ImageLayer).src,
            enhancementType: enhanceType,
          });
          if (images.length > 0) {
            callbacks.updateLayer(targetLayer.id, { src: images[0] } as Partial<ImageLayer>);
          }
          break;
        }

        case 'upscale': {
          if (!targetLayer || targetLayer.type !== 'image') break;
          const scale = (action.params.scale as string) || '2x';
          const images = await callbacks.callBackendAI('upscale', {
            image: (targetLayer as ImageLayer).src,
            scale,
          });
          if (images.length > 0) {
            callbacks.updateLayer(targetLayer.id, { src: images[0] } as Partial<ImageLayer>);
          }
          break;
        }

        case 'inpaint': {
          if (!targetLayer || targetLayer.type !== 'image') break;
          const images = await callbacks.callBackendAI('inpaint', {
            image: (targetLayer as ImageLayer).src,
            prompt: action.params.prompt as string,
          });
          if (images.length > 0) {
            callbacks.updateLayer(targetLayer.id, { src: images[0] } as Partial<ImageLayer>);
          }
          break;
        }

        case 'generate': {
          const p = action.params;
          const images = await callbacks.callBackendAI('generate', {
            prompt: p.prompt as string,
            style: (p.style as string) || undefined,
          });
          if (images.length > 0) {
            callbacks.addImageLayer(images[0], 'AI Generated');
          }
          break;
        }

        case 'faceSwap': {
          if (!targetLayer || targetLayer.type !== 'image') break;
          const images = await callbacks.callBackendAI('face-swap', {
            targetImage: (targetLayer as ImageLayer).src,
            prompt: (action.params.prompt as string) || undefined,
          });
          if (images.length > 0) {
            callbacks.updateLayer(targetLayer.id, { src: images[0] } as Partial<ImageLayer>);
          }
          break;
        }

        // ---- IMAGE ADJUSTMENTS ----
        case 'adjustImage': {
          if (!targetLayer || targetLayer.type !== 'image') break;
          const p = action.params;
          const filters: Record<string, number> = {};
          if (p.brightness !== undefined) filters.brightness = p.brightness as number;
          if (p.contrast !== undefined) filters.contrast = p.contrast as number;
          if (p.saturation !== undefined) filters.saturation = p.saturation as number;
          if (p.hue !== undefined) filters.hue = p.hue as number;
          if (p.blur !== undefined) filters.blur = p.blur as number;
          if (p.opacity !== undefined) {
            callbacks.updateLayer(targetLayer.id, { opacity: (p.opacity as number) / 100 });
          }
          if (Object.keys(filters).length > 0) {
            const currentFilters = (targetLayer as ImageLayer).filters || {};
            callbacks.updateLayer(targetLayer.id, {
              filters: { ...currentFilters, ...filters },
            } as Partial<ImageLayer>);
          }
          break;
        }

        // ---- LAYER MANAGEMENT ----
        case 'deleteLayer': {
          if (!targetLayer) break;
          callbacks.deleteLayer(targetLayer.id);
          break;
        }

        case 'duplicateLayer': {
          if (!targetLayer) break;
          callbacks.duplicateLayer(targetLayer.id);
          break;
        }

        case 'reorderLayer': {
          if (!targetLayer) break;
          const order = [...callbacks.getLayerOrder()];
          const idx = order.indexOf(targetLayer.id);
          if (idx === -1) break;

          const dir = action.params.direction as string;
          let newIdx = idx;
          if (dir === 'up') newIdx = Math.min(idx + 1, order.length - 1);
          if (dir === 'down') newIdx = Math.max(idx - 1, 0);
          if (dir === 'top') newIdx = order.length - 1;
          if (dir === 'bottom') newIdx = 0;

          if (newIdx !== idx) {
            const [removed] = order.splice(idx, 1);
            order.splice(newIdx, 0, removed);
            callbacks.reorderLayers(order);
          }
          break;
        }

        case 'moveLayer': {
          if (!targetLayer) break;
          const p = action.params;
          const transform = { ...targetLayer.transform };

          if (typeof p.x === 'number') transform.x = p.x;
          if (typeof p.y === 'number') transform.y = p.y;

          // Handle named positions
          if (p.position) {
            const pos = p.position as string;
            const lw = transform.width;
            const lh = transform.height;

            if (pos.includes('center')) { transform.x = (width - lw) / 2; transform.y = (height - lh) / 2; }
            if (pos.includes('top')) transform.y = 20;
            if (pos.includes('bottom')) transform.y = height - lh - 20;
            if (pos.includes('left')) transform.x = 20;
            if (pos.includes('right')) transform.x = width - lw - 20;
          }

          callbacks.updateLayer(targetLayer.id, { transform });
          break;
        }

        case 'resizeLayer': {
          if (!targetLayer) break;
          const p = action.params;
          const t = { ...targetLayer.transform };

          if (typeof p.scale === 'number') {
            t.width = t.width * (p.scale as number);
            t.height = t.height * (p.scale as number);
          } else {
            if (typeof p.width === 'number') t.width = p.width;
            if (typeof p.height === 'number') t.height = p.height;
          }

          callbacks.updateLayer(targetLayer.id, { transform: t });
          break;
        }

        case 'selectLayer': {
          const query = (action.params.query as string) || '';
          const layers = callbacks.getLayers();
          const match = layers.find(
            (l) =>
              l.name.toLowerCase().includes(query.toLowerCase()) ||
              l.type === query.toLowerCase()
          );
          if (match) {
            callbacks.selectLayer(match.id);
          }
          break;
        }

        case 'decompose': {
          if (!targetLayer || targetLayer.type !== 'image') break;
          const maxLayers = typeof action.params.maxLayers === 'number' ? action.params.maxLayers : 8;
          const decomposeResp = await authPost('/api/thumbnails/ai/decompose', {
            image: (targetLayer as ImageLayer).src,
            maxLayers,
          });
          if (decomposeResp.ok) {
            const decomposeData = await decomposeResp.json();
            if (decomposeData.success && decomposeData.layers) {
              decomposeData.layers.forEach((layer: { imageBase64: string }, idx: number) => {
                callbacks.addImageLayer(layer.imageBase64, `Decomposed ${idx + 1}`);
              });
            }
          }
          break;
        }

        case 'analyzeImage': {
          // This would trigger the vision analysis panel
          // For now, we'll log it — can wire to the vision tab later
          console.log('[AI Command] Analyze image requested');
          break;
        }

        default:
          console.warn(`[AI Command] Unknown action: ${action.action}`);
      }
    },
    [callbacks, resolveTarget]
  );

  /** Execute all actions from a parsed command result */
  const executeAll = useCallback(
    async (result: EditorCommandResult): Promise<{ executed: number; errors: string[] }> => {
      let executed = 0;
      const errors: string[] = [];

      for (const action of result.actions) {
        try {
          await executeAction(action);
          executed++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${action.description}: ${msg}`);
          console.error(`[AI Command] Failed: ${action.action}`, err);
        }
      }

      return { executed, errors };
    },
    [executeAction]
  );

  return { parseCommand, executeAction, executeAll, buildContext };
}
