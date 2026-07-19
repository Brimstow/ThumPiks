import { useCallback } from 'react';
import { authPost, createAIToolAbortController } from '../../../utils/api';

// ============================================================================
// Quick Edit Command Executor Hook
// Simplified version of useCommandExecutor for QuickEditView
// Maps AI-parsed actions to Quick Edit's text overlay + single image operations
// ============================================================================

/** Matches the backend EditorAction type */
interface EditorAction {
  action: string;
  target: 'selected' | 'auto' | string;
  description: string;
  params: Record<string, unknown>;
}

/** Matches the backend EditorCommandResult type */
interface EditorCommandResult {
  success: boolean;
  actions: EditorAction[];
  summary: string;
  needsAutoTarget: boolean;
  autoTargetQuery?: string;
}

/** Text overlay type from QuickEditView */
interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
  textStroke: string;
  textShadow: string;
  letterSpacing: string;
  backgroundColor: string;
  maxWidth: number;
}

/** Callbacks the executor needs from QuickEditView */
export interface QuickEditCallbacks {
  // Text overlay operations
  addTextOverlay: (overlay: TextOverlay) => void;
  updateOverlayProp: (id: string, patch: Partial<TextOverlay>) => void;
  removeOverlay: (id: string) => void;
  setActiveOverlayId: (id: string | null) => void;
  // Image state
  getResultImageUrl: () => string | null;
  setResultImageUrl: (url: string) => void;
  // Loading state
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (msg: string) => void;
  setError: (msg: string | null) => void;
  // Text overlay state
  getTextOverlays: () => TextOverlay[];
  getActiveOverlayId: () => string | null;
  // Face photo (for face swap)
  getFacePhoto: () => string | null;
}

interface UseQuickEditCommandExecutorReturn {
  parseCommand: (prompt: string) => Promise<EditorCommandResult>;
  executeAction: (action: EditorAction) => Promise<void>;
  executeAll: (result: EditorCommandResult) => Promise<{ executed: number; errors: string[] }>;
}

export function useQuickEditCommandExecutor(
  callbacks: QuickEditCallbacks
): UseQuickEditCommandExecutorReturn {
  /** Build a simplified canvas context for the LLM */
  const buildContext = useCallback(() => {
    const imageUrl = callbacks.getResultImageUrl();
    const overlays = callbacks.getTextOverlays();
    const activeId = callbacks.getActiveOverlayId();

    // Represent Quick Edit as a simplified layer list
    const layers: Array<{
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
    }> = [];

    // The base image is always "layer 0"
    if (imageUrl) {
      layers.push({
        id: 'base-image',
        type: 'image',
        name: 'Background Image',
        visible: true,
        locked: false,
        selected: !activeId,
      });
    }

    // Text overlays become text "layers"
    overlays.forEach((overlay) => {
      layers.push({
        id: overlay.id,
        type: 'text',
        name: `Text: ${overlay.text.substring(0, 20)}`,
        visible: true,
        locked: false,
        selected: overlay.id === activeId,
        text: overlay.text,
        font: overlay.fontFamily,
        fontSize: overlay.fontSize,
        color: overlay.color,
      });
    });

    return { width: 1280, height: 720, layers };
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

  /** Execute a single parsed action */
  const executeAction = useCallback(
    async (action: EditorAction): Promise<void> => {
      const overlays = callbacks.getTextOverlays();
      const activeId = callbacks.getActiveOverlayId();
      const imageUrl = callbacks.getResultImageUrl();

      // Resolve target overlay for text operations
      const resolveTextTarget = (): TextOverlay | null => {
        if (action.target === 'selected' && activeId) {
          return overlays.find((o) => o.id === activeId) || null;
        }
        if (action.target === 'auto' || action.target === 'selected') {
          // Pick the most recently added overlay
          return overlays.length > 0 ? overlays[overlays.length - 1] : null;
        }
        // Try to match by text content
        return overlays.find(
          (o) => o.text.toLowerCase().includes(action.target.toLowerCase())
        ) || null;
      };

      switch (action.action) {
        // ---- TEXT CREATION ----
        case 'addText': {
          const p = action.params;
          const text = (p.text as string) || 'New Text';
          const overlay: TextOverlay = {
            id: `text-${Date.now()}`,
            text,
            x: typeof p.x === 'number' ? p.x : 50,
            y: typeof p.y === 'number' ? p.y : 50,
            fontSize: typeof p.fontSize === 'number' ? p.fontSize : 48,
            color: (p.color as string) || '#FFFFFF',
            fontWeight: p.bold ? '900' : '700',
            fontFamily: (p.fontFamily as string) || 'Impact, Arial Black, sans-serif',
            textStroke: '2px black',
            textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
            letterSpacing: '1px',
            backgroundColor: '',
            maxWidth: 90,
          };
          callbacks.addTextOverlay(overlay);
          callbacks.setActiveOverlayId(overlay.id);
          break;
        }

        // ---- TEXT EDITING ----
        case 'updateText': {
          const target = resolveTextTarget();
          if (!target) break;
          const p = action.params;
          const patch: Partial<TextOverlay> = {};
          if (p.text !== undefined) patch.text = p.text as string;
          if (p.fontSize !== undefined) patch.fontSize = p.fontSize as number;
          if (p.fontFamily !== undefined) patch.fontFamily = p.fontFamily as string;
          if (p.color !== undefined) patch.color = p.color as string;
          if (p.bold !== undefined) patch.fontWeight = p.bold ? '900' : '400';
          if (p.italic !== undefined) {
            // Quick Edit doesn't have italic — skip gracefully
          }
          callbacks.updateOverlayProp(target.id, patch);
          break;
        }

        case 'recolorLayer': {
          const target = resolveTextTarget();
          if (!target) break;
          const color = action.params.color as string;
          callbacks.updateOverlayProp(target.id, { color });
          break;
        }

        // ---- TEXT MANAGEMENT ----
        case 'deleteLayer': {
          const target = resolveTextTarget();
          if (!target) break;
          callbacks.removeOverlay(target.id);
          break;
        }

        case 'moveLayer': {
          const target = resolveTextTarget();
          if (!target) break;
          const p = action.params;
          const patch: Partial<TextOverlay> = {};

          if (typeof p.x === 'number') patch.x = p.x;
          if (typeof p.y === 'number') patch.y = p.y;

          // Handle named positions (Quick Edit uses % coordinates 0-100)
          if (p.position) {
            const pos = p.position as string;
            if (pos.includes('center')) { patch.x = 50; patch.y = 50; }
            if (pos.includes('top')) patch.y = 10;
            if (pos.includes('bottom')) patch.y = 85;
            if (pos.includes('left')) patch.x = 10;
            if (pos.includes('right')) patch.x = 90;
          }

          callbacks.updateOverlayProp(target.id, patch);
          break;
        }

        case 'selectLayer': {
          const query = (action.params.query as string) || '';
          const match = overlays.find(
            (o) => o.text.toLowerCase().includes(query.toLowerCase())
          );
          if (match) {
            callbacks.setActiveOverlayId(match.id);
          }
          break;
        }

        // ---- AI IMAGE OPERATIONS ----
        case 'removeBackground': {
          if (!imageUrl) break;
          callbacks.setLoading(true);
          callbacks.setLoadingMessage('Removing background...');
          try {
            const res = await authPost('/api/thumbnails/ai/remove-background', {
              image: imageUrl,
            });
            if (!res.ok) throw new Error('Remove background failed');
            const data = await res.json();
            if (data.success && data.images?.length > 0) {
              callbacks.setResultImageUrl(data.images[0]);
            }
          } finally {
            callbacks.setLoading(false);
            callbacks.setLoadingMessage('');
          }
          break;
        }

        case 'enhance': {
          if (!imageUrl) break;
          callbacks.setLoading(true);
          callbacks.setLoadingMessage('Enhancing image...');
          // JJ: AbortController with per-tool timeout (40s for enhance)
          const { controller: enhanceCtrl, timeoutId: enhanceTimeout } = createAIToolAbortController('enhance');
          try {
            const res = await authPost('/api/thumbnails/ai/enhance', {
              image: imageUrl,  // JJ: FIXED — was 'imageUrl', backend expects 'image'
            }, { signal: enhanceCtrl.signal });
            if (!res.ok) throw new Error('Enhancement failed');
            const data = await res.json();
            // JJ: FIXED — backend returns data.images (array), not data.imageUrl
            if (data.images?.length > 0) {
              callbacks.setResultImageUrl(data.images[0]);
            }
          } catch (err: unknown) {
            // JJ: Handle abort/timeout
            if (err instanceof Error && err.name === 'AbortError') {
              callbacks.setError('Enhancement timed out. Please try again.');
            }
          } finally {
            clearTimeout(enhanceTimeout);
            callbacks.setLoading(false);
            callbacks.setLoadingMessage('');
          }
          break;
        }

        case 'upscale': {
          if (!imageUrl) break;
          callbacks.setLoading(true);
          callbacks.setLoadingMessage('Upscaling image...');
          try {
            const scale = (action.params.scale as string) || '2x';
            const res = await authPost('/api/thumbnails/ai/upscale', {
              image: imageUrl,
              scale,
            });
            if (!res.ok) throw new Error('Upscale failed');
            const data = await res.json();
            if (data.success && data.images?.length > 0) {
              callbacks.setResultImageUrl(data.images[0]);
            }
          } finally {
            callbacks.setLoading(false);
            callbacks.setLoadingMessage('');
          }
          break;
        }

        case 'faceSwap': {
          if (!imageUrl) break;
          const facePhoto = callbacks.getFacePhoto();
          if (!facePhoto) {
            callbacks.setError('Upload a face photo first (use the "Add Your Face" section)');
            break;
          }
          callbacks.setLoading(true);
          callbacks.setLoadingMessage('Swapping face...');
          // JJ: AbortController with per-tool timeout (face-swap sends two images = larger payload)
          const { controller: faceSwapCtrl, timeoutId: faceSwapTimeoutId } = createAIToolAbortController('face-swap');
          try {
            const res = await authPost('/api/thumbnails/ai/face-swap', {
              sourceImage: facePhoto,
              targetImage: imageUrl,
            }, { signal: faceSwapCtrl.signal });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'Face swap failed');
            }
            const data = await res.json();
            if (data.success && data.images?.length > 0) {
              callbacks.setResultImageUrl(data.images[0]);
            }
          } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
              callbacks.setError('Face swap timed out or was cancelled. Please try again.');
            } else {
              callbacks.setError(err instanceof Error ? err.message : 'Face swap failed');
            }
          } finally {
            clearTimeout(faceSwapTimeoutId);
            callbacks.setLoading(false);
            callbacks.setLoadingMessage('');
          }
          break;
        }

        case 'generate': {
          const prompt = action.params.prompt as string;
          if (!prompt) break;
          callbacks.setLoading(true);
          callbacks.setLoadingMessage('Generating image...');
          try {
            const res = await authPost('/api/thumbnails/ai/generate', {
              prompt,
              style: (action.params.style as string) || 'bold',
              tier: 'flash',
            });
            if (!res.ok) throw new Error('Generation failed');
            const data = await res.json();
            if (data.success && data.images?.length > 0) {
              callbacks.setResultImageUrl(data.images[0]);
            }
          } finally {
            callbacks.setLoading(false);
            callbacks.setLoadingMessage('');
          }
          break;
        }

        case 'inpaint': {
          if (!imageUrl) break;
          callbacks.setLoading(true);
          callbacks.setLoadingMessage('Editing image...');
          try {
            const res = await authPost('/api/thumbnails/ai/inpaint', {
              image: imageUrl,
              prompt: action.params.prompt as string,
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Inpaint failed (${res.status})`);
            }
            const data = await res.json();
            if (data.success && data.images?.length > 0) {
              callbacks.setResultImageUrl(data.images[0]);
            }
          } finally {
            callbacks.setLoading(false);
            callbacks.setLoadingMessage('');
          }
          break;
        }

        // ---- UNSUPPORTED IN QUICK EDIT ----
        case 'addShape':
        case 'duplicateLayer':
        case 'reorderLayer':
        case 'resizeLayer':
        case 'adjustImage':
        case 'analyzeImage':
        case 'decompose':
          console.log(`[Quick Edit AI] Action '${action.action}' not supported in Quick Edit — use Full Editor`);
          break;

        default:
          console.warn(`[Quick Edit AI] Unknown action: ${action.action}`);
      }
    },
    [callbacks]
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
          callbacks.setError(msg);
          console.error(`[Quick Edit AI] Failed: ${action.action}`, err);
        }
      }

      return { executed, errors };
    },
    [executeAction, callbacks]
  );

  return { parseCommand, executeAction, executeAll };
}
