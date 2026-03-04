/**
 * useLayouts Hook
 *
 * React hook for browsing, filtering, and applying layout presets.
 * Manages the layout state (which slots are filled, text content)
 * and provides actions for slot fill/clear and rendering.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  LayoutPreset,
  CompositionState,
  SlotFill,
  TextSlotFill,
  TemplateCategory,
} from './types';
import { BUILTIN_LAYOUTS } from './presets';
import { CompositionEngine } from './composition-engine';
import type { RenderOptions } from './composition-engine';

// ============================================
// API → LayoutPreset mapper
// ============================================

function mapApiLayout(row: any): LayoutPreset {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category as TemplateCategory,
    tags: Array.isArray(row.tags) ? row.tags : [],
    previewUrl: row.previewUrl ?? undefined,
    wireframeSvg: row.wireframeSvg,
    canvasWidth: row.canvasWidth,
    canvasHeight: row.canvasHeight,
    slots: Array.isArray(row.slots) ? row.slots : [],
    textSlots: Array.isArray(row.textSlots) ? row.textSlots : [],
    fallbackBackground: row.fallbackBackground ?? undefined,
    builtIn: row.builtIn ?? false,
    popularity: row.popularity ?? 0,
  };
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseLayoutsReturn {
  /** All available layouts (built-in + custom) */
  templates: LayoutPreset[];

  /** Layouts filtered by current category/search */
  filteredTemplates: LayoutPreset[];

  /** Currently selected layout (null = none) */
  selectedTemplate: LayoutPreset | null;

  /** Current composition state (slot fills + text) */
  compositionState: CompositionState | null;

  /** Active category filter */
  categoryFilter: TemplateCategory | 'all';

  /** Search query */
  searchQuery: string;

  /** Whether layouts are being loaded from the API */
  isLoading: boolean;

  // Actions
  setCategoryFilter: (cat: TemplateCategory | 'all') => void;
  setSearchQuery: (q: string) => void;
  selectTemplate: (templateId: string) => void;
  clearTemplate: () => void;
  fillSlot: (slotId: string, imageUrl: string, width?: number, height?: number) => void;
  clearSlot: (slotId: string) => void;
  fillTextSlot: (slotId: string, content: string, styleOverrides?: Partial<TextSlotFill['styleOverrides']>) => void;
  clearTextSlot: (slotId: string) => void;
  renderComposition: (options?: RenderOptions) => Promise<string>;
  getMissingSlots: () => string[];
  isComplete: () => boolean;
}

// ============================================
// HOOK
// ============================================

export function useLayouts(): UseLayoutsReturn {
  const [selectedTemplate, setSelectedTemplate] = useState<LayoutPreset | null>(null);
  const [compositionState, setCompositionState] = useState<CompositionState | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiTemplates, setApiTemplates] = useState<LayoutPreset[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch layouts from API on mount, fall back to hardcoded presets
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/composition-layouts?sortBy=popularity&sortOrder=desc&limit=100');
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setApiTemplates(data.map(mapApiLayout));
        }
      } catch {
        // API unavailable — will use hardcoded fallback
        console.warn('[useLayouts] API unavailable, using built-in presets');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Use API data if available, otherwise fall back to hardcoded presets
  const templates = useMemo(() => {
    const source = apiTemplates ?? BUILTIN_LAYOUTS;
    return [...source].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  }, [apiTemplates]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.includes(q))
      );
    }

    return result;
  }, [templates, categoryFilter, searchQuery]);

  // Select a template and initialize empty composition state
  const selectTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find(t => t.id === templateId);
      if (!tmpl) return;

      setSelectedTemplate(tmpl);
      setCompositionState({
        templateId: tmpl.id,
        slotFills: [],
        textFills: [],
      });
    },
    [templates]
  );

  const clearTemplate = useCallback(() => {
    setSelectedTemplate(null);
    setCompositionState(null);
  }, []);

  // Fill an image slot
  const fillSlot = useCallback(
    (slotId: string, imageUrl: string, width?: number, height?: number) => {
      setCompositionState(prev => {
        if (!prev) return prev;
        const existing = prev.slotFills.filter(f => f.slotId !== slotId);
        const fill: SlotFill = { slotId, imageUrl, originalWidth: width, originalHeight: height };
        return { ...prev, slotFills: [...existing, fill] };
      });
    },
    []
  );

  const clearSlot = useCallback((slotId: string) => {
    setCompositionState(prev => {
      if (!prev) return prev;
      return { ...prev, slotFills: prev.slotFills.filter(f => f.slotId !== slotId) };
    });
  }, []);

  // Fill a text slot
  const fillTextSlot = useCallback(
    (slotId: string, content: string, styleOverrides?: Partial<TextSlotFill['styleOverrides']>) => {
      setCompositionState(prev => {
        if (!prev) return prev;
        const existing = prev.textFills.filter(f => f.slotId !== slotId);
        const fill: TextSlotFill = {
          slotId,
          content,
          ...(styleOverrides ? { styleOverrides: styleOverrides as TextSlotFill['styleOverrides'] } : {}),
        };
        return { ...prev, textFills: [...existing, fill] };
      });
    },
    []
  );

  const clearTextSlot = useCallback((slotId: string) => {
    setCompositionState(prev => {
      if (!prev) return prev;
      return { ...prev, textFills: prev.textFills.filter(f => f.slotId !== slotId) };
    });
  }, []);

  // Render the current composition to a data URL
  const renderComposition = useCallback(
    async (options?: RenderOptions): Promise<string> => {
      if (!selectedTemplate || !compositionState) {
        throw new Error('No template selected');
      }
      return CompositionEngine.renderToDataUrl(selectedTemplate, compositionState, options);
    },
    [selectedTemplate, compositionState]
  );

  // Check which required slots are missing
  const getMissingSlots = useCallback((): string[] => {
    if (!selectedTemplate || !compositionState) return [];
    return CompositionEngine.getMissingSlots(selectedTemplate, compositionState);
  }, [selectedTemplate, compositionState]);

  // Check if all required slots are filled
  const isComplete = useCallback((): boolean => {
    return getMissingSlots().length === 0 && selectedTemplate !== null;
  }, [getMissingSlots, selectedTemplate]);

  return {
    templates,
    filteredTemplates,
    selectedTemplate,
    compositionState,
    categoryFilter,
    searchQuery,
    isLoading,
    setCategoryFilter,
    setSearchQuery,
    selectTemplate,
    clearTemplate,
    fillSlot,
    clearSlot,
    fillTextSlot,
    clearTextSlot,
    renderComposition,
    getMissingSlots,
    isComplete,
  };
}
