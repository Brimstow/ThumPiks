import { useCallback } from 'react';
import { authPost, createAIToolAbortController } from '../../../utils/api';
import type { Layer, TextLayer, ImageLayer, ShapeLayer, LayerEffect } from '../types/editor.types';

// ============================================================================
// AI Command Executor Hook
// Maps structured editor actions from the LLM to existing editor dispatch/handlers
// ============================================================================

/** Default settings per effect type — merged with AI-provided params */
const EFFECT_DEFAULTS: Record<string, Record<string, number | string | boolean>> = {
  shadow: { color: '#000000', offsetX: 4, offsetY: 4, blur: 8, opacity: 80 },
  glow:   { color: '#FFFF00', offsetX: 0, offsetY: 0, blur: 15, opacity: 90 },
  blur:   { radius: 4, opacity: 100 },
  stroke: { color: '#000000', width: 3, opacity: 100 },
  bevel:  { lightColor: '#FFFFFF', shadowColor: '#000000', depth: 3, angle: 135, opacity: 70 },
};

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
  // Spatial data
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  blendMode?: string;
  zIndex: number;
  // Type-specific data
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
  groupLayers: (layerIds: string[]) => void;
  ungroupLayers: (groupId: string) => void;
  // AI operations (via useBackendAI)
  callBackendAI: (operation: 'generate' | 'inpaint' | 'face-swap' | 'upscale' | 'remove-background' | 'enhance' | 'segment', request: Record<string, unknown>) => Promise<string[]>;
  // State getters
  getLayers: () => Layer[];
  getLayerOrder: () => string[];
  getSelectedLayerIds: () => string[];
  getCanvasSize: () => { width: number; height: number };
  // Batch undo (Phase 4)
  startBatch?: (label: string) => void;
  endBatch?: () => void;
  // Vision (Phase 5)
  getCanvasScreenshot?: () => string | null;
}

interface UseCommandExecutorReturn {
  /** Send a natural language prompt to the LLM and get structured actions */
  parseCommand: (prompt: string) => Promise<EditorCommandResult>;
  /** Execute a single parsed action using editor callbacks. Returns text for analysis actions. */
  executeAction: (action: EditorAction) => Promise<string | void>;
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

    const layerContexts: LayerContext[] = layers.map((layer, index) => {
      const ctx: LayerContext = {
        id: layer.id,
        type: layer.type,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        selected: selectedIds.includes(layer.id),
        // Spatial data from transform
        x: layer.transform.x,
        y: layer.transform.y,
        width: layer.transform.width,
        height: layer.transform.height,
        rotation: layer.transform.rotation || 0,
        opacity: typeof layer.opacity === 'number' ? layer.opacity / 100 : 1,
        blendMode: layer.blendMode || 'normal',
        zIndex: index,
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
    async (action: EditorAction): Promise<string | void> => {
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
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a text layer first.`);
          if (targetLayer.type !== 'text') throw new Error(`Target "${targetLayer.name}" is not a text layer.`);
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
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a layer first.`);
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
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting an image layer first.`);
          if (targetLayer.type !== 'image') throw new Error(`Target "${targetLayer.name}" is not an image layer. Remove background only works on images.`);
          const images = await callbacks.callBackendAI('remove-background', {
            image: (targetLayer as ImageLayer).src,
          });
          if (images.length > 0) {
            callbacks.updateLayer(targetLayer.id, { src: images[0] } as Partial<ImageLayer>);
          }
          break;
        }

        case 'enhance': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting an image layer first.`);
          if (targetLayer.type !== 'image') throw new Error(`Target "${targetLayer.name}" is not an image layer. Enhance only works on images.`);
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
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting an image layer first.`);
          if (targetLayer.type !== 'image') throw new Error(`Target "${targetLayer.name}" is not an image layer. Upscale only works on images.`);
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
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting an image layer first.`);
          if (targetLayer.type !== 'image') throw new Error(`Target "${targetLayer.name}" is not an image layer. Inpaint only works on images.`);
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
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a layer first.`);
          if (targetLayer.type !== 'image') throw new Error(`Target "${targetLayer.name}" is not an image layer. Face swap only works on images.`);
          const images = await callbacks.callBackendAI('face-swap', {
            targetImage: (targetLayer as ImageLayer).src,
            prompt: (action.params.prompt as string) || undefined,
          });
          if (images.length > 0) {
            callbacks.updateLayer(targetLayer.id, { src: images[0] } as Partial<ImageLayer>);
          }
          break;
        }

        case 'adjustImage': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting an image layer first.`);
          if (targetLayer.type !== 'image') throw new Error(`Target "${targetLayer.name}" is not an image layer. Image adjustments only work on images.`);
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
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a layer first.`);
          callbacks.deleteLayer(targetLayer.id);
          break;
        }

        case 'duplicateLayer': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a layer first.`);
          callbacks.duplicateLayer(targetLayer.id);
          break;
        }

        case 'reorderLayer': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a layer first.`);
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
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a layer first.`);
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
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a layer first.`);
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
          if (!match) throw new Error(`Could not find a layer matching "${query}".`);
          callbacks.selectLayer(match.id);
          break;
        }

        // ---- ROTATION ----
        case 'rotateLayer': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a layer first.`);
          const angle = action.params.angle as number;
          if (typeof angle !== 'number') throw new Error('Rotation angle is required.');
          const currentRotation = targetLayer.transform.rotation || 0;
          const newRotation = ((currentRotation + angle) % 360 + 360) % 360;
          callbacks.updateLayer(targetLayer.id, {
            transform: { ...targetLayer.transform, rotation: newRotation },
          });
          break;
        }

        // ---- GROUPING ----
        case 'groupLayers': {
          const layerNames = action.params.layerNames as string[];
          if (!layerNames || !Array.isArray(layerNames) || layerNames.length < 2) {
            throw new Error('At least 2 layer names are required to create a group.');
          }
          const allLayers = callbacks.getLayers();
          const ids: string[] = [];
          for (const name of layerNames) {
            const found = allLayers.find(
              (l) => l.name.toLowerCase().includes(name.toLowerCase()) || l.type === name.toLowerCase()
            );
            if (!found) throw new Error(`Could not find layer matching "${name}" for grouping.`);
            ids.push(found.id);
          }
          callbacks.groupLayers(ids);
          break;
        }

        case 'ungroupLayers': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a group layer.`);
          if (targetLayer.type !== 'group') throw new Error(`Target "${targetLayer.name}" is not a group layer.`);
          callbacks.ungroupLayers(targetLayer.id);
          break;
        }

        // ---- CROP ----
        case 'cropLayer': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting an image layer first.`);
          if (targetLayer.type !== 'image') throw new Error(`Target "${targetLayer.name}" is not an image layer. Crop only works on images.`);
          const imgLayer = targetLayer as ImageLayer;
          const p = action.params;
          const lw = imgLayer.transform.width;
          const lh = imgLayer.transform.height;

          let cx = 0, cy = 0, cw = lw, ch = lh;

          if (p.region) {
            const region = p.region as string;
            switch (region) {
              case 'top-half': cx = 0; cy = 0; cw = lw; ch = lh / 2; break;
              case 'bottom-half': cx = 0; cy = lh / 2; cw = lw; ch = lh / 2; break;
              case 'left-half': cx = 0; cy = 0; cw = lw / 2; ch = lh; break;
              case 'right-half': cx = lw / 2; cy = 0; cw = lw / 2; ch = lh; break;
              case 'center': cx = lw * 0.25; cy = lh * 0.25; cw = lw * 0.5; ch = lh * 0.5; break;
              default: throw new Error(`Unknown crop region: ${region}`);
            }
          } else {
            if (typeof p.x === 'number') cx = p.x;
            if (typeof p.y === 'number') cy = p.y;
            if (typeof p.width === 'number') cw = p.width;
            if (typeof p.height === 'number') ch = p.height;
          }

          // Perform client-side crop using offscreen canvas
          const cropImg = new Image();
          cropImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            cropImg.onload = () => resolve();
            cropImg.onerror = () => reject(new Error('Failed to load image for cropping.'));
            cropImg.src = imgLayer.src;
          });

          // Calculate crop in image-space (may differ from display dimensions)
          const scaleX = cropImg.naturalWidth / lw;
          const scaleY = cropImg.naturalHeight / lh;
          const offscreen = document.createElement('canvas');
          offscreen.width = Math.round(cw * scaleX);
          offscreen.height = Math.round(ch * scaleY);
          const ctx = offscreen.getContext('2d');
          if (!ctx) throw new Error('Canvas context unavailable for crop.');
          ctx.drawImage(
            cropImg,
            Math.round(cx * scaleX), Math.round(cy * scaleY),
            offscreen.width, offscreen.height,
            0, 0,
            offscreen.width, offscreen.height
          );
          const croppedSrc = offscreen.toDataURL('image/png');

          callbacks.updateLayer(targetLayer.id, {
            src: croppedSrc,
            transform: {
              ...imgLayer.transform,
              x: imgLayer.transform.x + cx,
              y: imgLayer.transform.y + cy,
              width: cw,
              height: ch,
            },
          } as Partial<ImageLayer>);
          break;
        }

        case 'decompose': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting an image layer first.`);
          if (targetLayer.type !== 'image') throw new Error(`Target "${targetLayer.name}" is not an image layer. Decompose only works on images.`);
          const maxLayers = typeof action.params.maxLayers === 'number' ? action.params.maxLayers : 8;
          // JJ: Per-tool AbortController with timeout
          const { controller: decompCtrl, timeoutId: decompTimeout } = createAIToolAbortController('generate');
          try {
            const decomposeResp = await authPost('/api/thumbnails/ai/decompose', {
              image: (targetLayer as ImageLayer).src,
              maxLayers,
            }, { signal: decompCtrl.signal });
            clearTimeout(decompTimeout);
            if (decomposeResp.ok) {
              const decomposeData = await decomposeResp.json();
              if (decomposeData.success && decomposeData.layers) {
                decomposeData.layers.forEach((layer: { imageBase64: string }, idx: number) => {
                  callbacks.addImageLayer(layer.imageBase64, `Decomposed ${idx + 1}`);
                });
              }
            }
          } catch (err) {
            clearTimeout(decompTimeout);
            if (err instanceof Error && err.name !== 'AbortError') throw err;
            // AbortError: silently ignore timeout/abort for decompose
          }
          break;
        }

        case 'analyzeImage': {
          // Get image source: either from target layer or canvas screenshot
          let analyzeSource: string | null = null;
          if (targetLayer && targetLayer.type === 'image') {
            analyzeSource = (targetLayer as ImageLayer).src;
          } else {
            analyzeSource = callbacks.getCanvasScreenshot?.() || null;
          }
          if (!analyzeSource) throw new Error('No image available to analyze. Select an image layer or ensure the canvas has content.');

          const analyzeResp = await authPost('/api/vision/describe', {
            imageBase64: analyzeSource,
          });
          if (!analyzeResp.ok) {
            const errData = await analyzeResp.json().catch(() => ({}));
            throw new Error(errData.error || 'Image analysis failed.');
          }
          const analyzeData = await analyzeResp.json();
          return analyzeData.description || analyzeData.analysis || JSON.stringify(analyzeData);
        }

        // ---- EXPANDED CAPABILITIES ----
        case 'expand': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting an image layer first.`);
          if (targetLayer.type !== 'image') throw new Error(`Target "${targetLayer.name}" is not an image layer. Expand only works on images.`);
          const images = await callbacks.callBackendAI('generate', {
            image: (targetLayer as ImageLayer).src,
            direction: action.params.direction as string,
            prompt: (action.params.prompt as string) || undefined,
            operation: 'expand',
          });
          if (images.length > 0) {
            callbacks.updateLayer(targetLayer.id, { src: images[0] } as Partial<ImageLayer>);
          }
          break;
        }

        case 'aiText': {
          const p = action.params;
          // JJ: Per-tool AbortController with timeout (generate-text uses default 55s)
          const { controller: textCtrl, timeoutId: textTimeout } = createAIToolAbortController('generate');
          try {
            const resp = await authPost('/api/thumbnails/ai/generate-text', {
              prompt: p.prompt as string,
              style: (p.style as string) || undefined,
            }, { signal: textCtrl.signal });
            clearTimeout(textTimeout);
            if (resp.ok) {
              const data = await resp.json();
              if (data.text) {
                const x = width / 2;
                const y = height / 2;
                callbacks.addTextLayer(data.text, x, y);
              }
            }
          } catch (err) {
            clearTimeout(textTimeout);
            if (err instanceof Error && err.name !== 'AbortError') throw err;
          }
          break;
        }

        case 'vision': {
          // Describe what is visible on the canvas or a specific layer
          let visionSource: string | null = null;
          if (targetLayer && targetLayer.type === 'image') {
            visionSource = (targetLayer as ImageLayer).src;
          } else {
            visionSource = callbacks.getCanvasScreenshot?.() || null;
          }
          if (!visionSource) throw new Error('No image available to describe. Select an image layer or ensure the canvas has content.');

          const visionResp = await authPost('/api/vision/describe', {
            imageBase64: visionSource,
          });
          if (!visionResp.ok) {
            const errData = await visionResp.json().catch(() => ({}));
            throw new Error(errData.error || 'Vision description failed.');
          }
          const visionData = await visionResp.json();
          return visionData.description || visionData.analysis || JSON.stringify(visionData);
        }

        case 'visionSearch': {
          const query = action.params.query as string;
          const resp = await authPost('/api/vision/search', { query });
          if (resp.ok) {
            const data = await resp.json();
            if (data.imageUrl) {
              callbacks.addImageLayer(data.imageUrl, `Search: ${query}`);
            }
          }
          break;
        }

        // ---- LAYER EFFECTS ----
        case 'addEffect': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a layer first.`);
          const p = action.params;
          const effectType = p.effectType as string;
          if (!effectType || !EFFECT_DEFAULTS[effectType]) {
            throw new Error(`Invalid effect type "${effectType}". Must be one of: shadow, glow, blur, stroke, bevel.`);
          }

          // Build settings by merging AI params over defaults
          const defaults = { ...EFFECT_DEFAULTS[effectType] };
          const settings: Record<string, number | string | boolean> = { ...defaults };

          if (p.color !== undefined) settings.color = p.color as string;
          if (p.offsetX !== undefined) settings.offsetX = p.offsetX as number;
          if (p.offsetY !== undefined) settings.offsetY = p.offsetY as number;
          if (p.opacity !== undefined) settings.opacity = p.opacity as number;

          // Map 'blur' param to the correct settings key per effect type
          if (p.blur !== undefined) {
            if (effectType === 'blur') {
              settings.radius = p.blur as number;
            } else {
              settings.blur = p.blur as number;
            }
          }

          // Map 'spread' param to width (stroke) or depth (bevel)
          if (p.spread !== undefined) {
            if (effectType === 'stroke') {
              settings.width = p.spread as number;
            } else if (effectType === 'bevel') {
              settings.depth = p.spread as number;
            }
          }

          const newEffect: LayerEffect = {
            id: `effect-${effectType}-${Date.now()}`,
            type: effectType as LayerEffect['type'],
            enabled: true,
            settings,
          };

          // Replace existing effect of same type (one per type per layer)
          const currentEffects = (targetLayer as any).effects || [];
          const filtered = currentEffects.filter((e: LayerEffect) => e.type !== effectType);
          callbacks.updateLayer(targetLayer.id, { effects: [...filtered, newEffect] });
          break;
        }

        case 'removeEffect': {
          if (!targetLayer) throw new Error(`Could not find target layer "${action.target}". Try selecting a layer first.`);
          const rmEffectType = action.params.effectType as string;
          const rmCurrentEffects = (targetLayer as any).effects || [];
          const rmFiltered = rmCurrentEffects.filter((e: LayerEffect) => e.type !== rmEffectType);
          callbacks.updateLayer(targetLayer.id, { effects: rmFiltered });
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

      callbacks.startBatch?.(result.summary || 'AI command');
      try {
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
      } finally {
        callbacks.endBatch?.();
      }

      return { executed, errors };
    },
    [executeAction]
  );

  return { parseCommand, executeAction, executeAll, buildContext };
}
