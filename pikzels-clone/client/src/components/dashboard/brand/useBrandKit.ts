import { useState, useCallback, useEffect } from 'react';
import {
  BrandKitState,
  BrandCategoryType,
  ModalMode,
  LogoAsset,
  ColorPalette,
  ColorSwatch,
  FontFamily,
  BrandVoice,
  PhotoAsset,
  GraphicAsset,
  IconAsset,
  StylePreset,
  BrandUsageStat,
  BrandActivityItem,
  CustomCategory,
} from './types';
import * as brandKitApi from '../../../services/brand-kit.service';
import { initialBrandKitState as mockBrandKitState, brandUsageStats as mockUsageStats, brandActivityFeed as mockActivityFeed } from './brandKitMockData';

// Check if API returned empty data (no real brand kit yet)
const isEmptyBrandKit = (data: BrandKitState): boolean => {
  return (
    data.logos.length === 0 &&
    data.colorPalettes.length === 0 &&
    data.fonts.length === 0 &&
    !data.brandVoice &&
    data.photos.length === 0 &&
    data.graphics.length === 0 &&
    data.icons.length === 0 &&
    data.styles.length === 0
  );
};

// Generate local ID for optimistic updates
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ── Hook Return Type ──────────────────────────────────────────────────

export interface UseBrandKitReturn {
  state: BrandKitState;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  usageStats: BrandUsageStat[];
  activityFeed: BrandActivityItem[];
  isUsingMockData: boolean;
  clearSampleData: () => void;

  // Modal state
  activeCategory: BrandCategoryType | null;
  modalMode: ModalMode;
  isModalOpen: boolean;
  openModal: (category: BrandCategoryType, mode?: ModalMode) => void;
  closeModal: () => void;

  // Category counts (for card display)
  getCategoryCount: (category: BrandCategoryType) => string;

  // ── Logo CRUD ──
  addLogo: (logo: Omit<LogoAsset, 'id' | 'createdAt'>) => void;
  updateLogo: (id: string, updates: Partial<LogoAsset>) => void;
  deleteLogo: (id: string) => void;
  setPrimaryLogo: (id: string) => void;

  // ── Color CRUD ──
  addColorPalette: (palette: Omit<ColorPalette, 'id' | 'createdAt'>) => void;
  updateColorPalette: (id: string, updates: Partial<ColorPalette>) => void;
  deleteColorPalette: (id: string) => void;
  addColorToPalette: (paletteId: string, color: Omit<ColorSwatch, 'id'>) => void;
  removeColorFromPalette: (paletteId: string, colorId: string) => void;

  // ── Font CRUD ──
  addFont: (font: Omit<FontFamily, 'id' | 'createdAt'>) => void;
  updateFont: (id: string, updates: Partial<FontFamily>) => void;
  deleteFont: (id: string) => void;

  // ── Brand Voice CRUD ──
  updateBrandVoice: (updates: Partial<BrandVoice>) => void;
  resetBrandVoice: () => void;

  // ── Photo CRUD ──
  addPhoto: (photo: Omit<PhotoAsset, 'id' | 'createdAt'>) => void;
  updatePhoto: (id: string, updates: Partial<PhotoAsset>) => void;
  deletePhoto: (id: string) => void;

  // ── Graphic CRUD ──
  addGraphic: (graphic: Omit<GraphicAsset, 'id' | 'createdAt'>) => void;
  updateGraphic: (id: string, updates: Partial<GraphicAsset>) => void;
  deleteGraphic: (id: string) => void;

  // ── Icon CRUD ──
  addIcon: (icon: Omit<IconAsset, 'id' | 'createdAt'>) => void;
  updateIcon: (id: string, updates: Partial<IconAsset>) => void;
  deleteIcon: (id: string) => void;

  // ── Style CRUD ──
  addStyle: (style: Omit<StylePreset, 'id' | 'createdAt'>) => void;
  updateStyle: (id: string, updates: Partial<StylePreset>) => void;
  deleteStyle: (id: string) => void;

  // ── Custom Category Management ──
  addCustomCategory: (category: Omit<CustomCategory, 'id' | 'createdAt'>) => void;
  deleteCustomCategory: (id: string) => void;
}

// ── Hook Implementation ───────────────────────────────────────────────

export function useBrandKit(): UseBrandKitReturn {
  // Start with mock data for immediate UI, replace with real data when loaded
  const [state, setState] = useState<BrandKitState>(mockBrandKitState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageStats] = useState<BrandUsageStat[]>(mockUsageStats);
  const [activityFeed, setActivityFeed] = useState<BrandActivityItem[]>(mockActivityFeed);
  const [isUsingMockData, setIsUsingMockData] = useState(true);

  // Modal state
  const [activeCategory, setActiveCategory] = useState<BrandCategoryType | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Fetch Brand Kit on Mount ───────────────────────────────────────────

  const fetchBrandKit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await brandKitApi.getBrandKit();
      // Only use API data if user has real brand kit data, otherwise keep mock data for preview
      if (!isEmptyBrandKit(data)) {
        setState(data);
        setIsUsingMockData(false);
      } else {
        // Keep mock data for nice preview when user has no real data yet
        setIsUsingMockData(true);
      }
    } catch (err) {
      // On error, keep mock data for preview
      setError(err instanceof Error ? err.message : 'Failed to load brand kit');
      console.error('Failed to fetch brand kit:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrandKit();
  }, [fetchBrandKit]);

  const openModal = useCallback((category: BrandCategoryType, mode: ModalMode = 'view') => {
    setActiveCategory(category);
    setModalMode(mode);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setActiveCategory(null);
    setModalMode('view');
  }, []);

  // ── Activity Logger ─────────────────────────────────────────────────

  const logActivity = useCallback(
    (action: BrandActivityItem['action'], assetType: BrandCategoryType, assetName: string, description: string) => {
      const newActivity: BrandActivityItem = {
        id: generateId('act'),
        action,
        assetType,
        assetName,
        timestamp: new Date().toISOString(),
        description,
      };
      setActivityFeed((prev) => [newActivity, ...prev]);
    },
    []
  );

  // ── Category Counts ─────────────────────────────────────────────────

  const getCategoryCount = useCallback(
    (category: BrandCategoryType): string => {
      switch (category) {
        case 'logos':
          return `${state.logos.length} asset${state.logos.length !== 1 ? 's' : ''}`;
        case 'colors':
          return `${state.colorPalettes.length} palette${state.colorPalettes.length !== 1 ? 's' : ''}`;
        case 'fonts':
          return `${state.fonts.length} famil${state.fonts.length !== 1 ? 'ies' : 'y'}`;
        case 'brand-voice':
          return state.brandVoice ? 'Set up' : 'Not set';
        case 'photos':
          return `${state.photos.length} item${state.photos.length !== 1 ? 's' : ''}`;
        case 'graphics':
          return `${state.graphics.length} item${state.graphics.length !== 1 ? 's' : ''}`;
        case 'icons':
          return `${state.icons.length} icon${state.icons.length !== 1 ? 's' : ''}`;
        case 'styles':
          return `${state.styles.length} preset${state.styles.length !== 1 ? 's' : ''}`;
        default:
          return '0 items';
      }
    },
    [state]
  );

  // ── Logo CRUD ───────────────────────────────────────────────────────

  const addLogo = useCallback(
    async (logo: Omit<LogoAsset, 'id' | 'createdAt'>) => {
      // If using mock data, start fresh with empty state for this category
      if (isUsingMockData) {
        setState((prev) => ({ ...prev, logos: [] }));
      }
      // Optimistic update
      const tempId = generateId('logo');
      const tempLogo: LogoAsset = { ...logo, id: tempId, createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, logos: [...prev.logos, tempLogo] }));
      logActivity('uploaded', 'logos', logo.name, `Uploaded ${logo.variant} logo variant`);

      try {
        const newLogo = await brandKitApi.addLogo(logo);
        setState((prev) => ({
          ...prev,
          logos: prev.logos.map((l) => (l.id === tempId ? newLogo : l)),
        }));
        // Switch to real data mode after first real item added
        if (isUsingMockData) {
          setIsUsingMockData(false);
          fetchBrandKit(); // Refresh to get clean real data
        }
      } catch (err) {
        // Rollback on error
        setState((prev) => ({ ...prev, logos: prev.logos.filter((l) => l.id !== tempId) }));
        console.error('Failed to add logo:', err);
      }
    },
    [logActivity, isUsingMockData, fetchBrandKit]
  );

  const updateLogo = useCallback(
    async (id: string, updates: Partial<LogoAsset>) => {
      const original = state.logos.find((l) => l.id === id);
      // Optimistic update
      setState((prev) => ({
        ...prev,
        logos: prev.logos.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      }));
      logActivity('updated', 'logos', updates.name || 'Logo', 'Updated logo details');

      try {
        await brandKitApi.updateLogo(id, updates);
      } catch (err) {
        // Rollback on error
        if (original) {
          setState((prev) => ({
            ...prev,
            logos: prev.logos.map((l) => (l.id === id ? original : l)),
          }));
        }
        console.error('Failed to update logo:', err);
      }
    },
    [state.logos, logActivity]
  );

  const deleteLogo = useCallback(
    async (id: string) => {
      const logo = state.logos.find((l) => l.id === id);
      // Optimistic update
      setState((prev) => ({ ...prev, logos: prev.logos.filter((l) => l.id !== id) }));
      logActivity('deleted', 'logos', logo?.name || 'Logo', 'Removed logo from brand kit');

      try {
        await brandKitApi.deleteLogo(id);
      } catch (err) {
        // Rollback on error
        if (logo) {
          setState((prev) => ({ ...prev, logos: [...prev.logos, logo] }));
        }
        console.error('Failed to delete logo:', err);
      }
    },
    [state.logos, logActivity]
  );

  const setPrimaryLogo = useCallback(async (id: string) => {
    const originalLogos = [...state.logos];
    // Optimistic update
    setState((prev) => ({
      ...prev,
      logos: prev.logos.map((l) => ({ ...l, isPrimary: l.id === id })),
    }));

    try {
      await brandKitApi.setPrimaryLogo(id);
    } catch (err) {
      // Rollback on error
      setState((prev) => ({ ...prev, logos: originalLogos }));
      console.error('Failed to set primary logo:', err);
    }
  }, [state.logos]);

  // ── Color CRUD ──────────────────────────────────────────────────────

  const addColorPalette = useCallback(
    async (palette: Omit<ColorPalette, 'id' | 'createdAt'>) => {
      if (isUsingMockData) {
        setState((prev) => ({ ...prev, colorPalettes: [] }));
      }
      const tempId = generateId('palette');
      const tempPalette: ColorPalette = { ...palette, id: tempId, colors: [], createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, colorPalettes: [...prev.colorPalettes, tempPalette] }));
      logActivity('created', 'colors', palette.name, `Created new color palette "${palette.name}"`);

      try {
        const newPalette = await brandKitApi.addColorPalette({ name: palette.name, isPrimary: palette.isPrimary });
        setState((prev) => ({
          ...prev,
          colorPalettes: prev.colorPalettes.map((p) => (p.id === tempId ? newPalette : p)),
        }));
        if (isUsingMockData) {
          setIsUsingMockData(false);
          fetchBrandKit();
        }
      } catch (err) {
        setState((prev) => ({ ...prev, colorPalettes: prev.colorPalettes.filter((p) => p.id !== tempId) }));
        console.error('Failed to add palette:', err);
      }
    },
    [logActivity, isUsingMockData, fetchBrandKit]
  );

  const updateColorPalette = useCallback(
    async (id: string, updates: Partial<ColorPalette>) => {
      const original = state.colorPalettes.find((p) => p.id === id);
      setState((prev) => ({
        ...prev,
        colorPalettes: prev.colorPalettes.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));
      logActivity('updated', 'colors', updates.name || 'Palette', 'Updated color palette');

      try {
        await brandKitApi.updateColorPalette(id, updates);
      } catch (err) {
        if (original) {
          setState((prev) => ({
            ...prev,
            colorPalettes: prev.colorPalettes.map((p) => (p.id === id ? original : p)),
          }));
        }
        console.error('Failed to update palette:', err);
      }
    },
    [state.colorPalettes, logActivity]
  );

  const deleteColorPalette = useCallback(
    async (id: string) => {
      const palette = state.colorPalettes.find((p) => p.id === id);
      setState((prev) => ({ ...prev, colorPalettes: prev.colorPalettes.filter((p) => p.id !== id) }));
      logActivity('deleted', 'colors', palette?.name || 'Palette', 'Removed color palette');

      try {
        await brandKitApi.deleteColorPalette(id);
      } catch (err) {
        if (palette) {
          setState((prev) => ({ ...prev, colorPalettes: [...prev.colorPalettes, palette] }));
        }
        console.error('Failed to delete palette:', err);
      }
    },
    [state.colorPalettes, logActivity]
  );

  const addColorToPalette = useCallback(
    async (paletteId: string, color: Omit<ColorSwatch, 'id'>) => {
      const tempId = generateId('color');
      const tempColor: ColorSwatch = { ...color, id: tempId };
      setState((prev) => ({
        ...prev,
        colorPalettes: prev.colorPalettes.map((p) =>
          p.id === paletteId ? { ...p, colors: [...p.colors, tempColor] } : p
        ),
      }));
      logActivity('updated', 'colors', color.name, `Added ${color.hex} to palette`);

      try {
        const newColor = await brandKitApi.addColorToPalette(paletteId, color);
        setState((prev) => ({
          ...prev,
          colorPalettes: prev.colorPalettes.map((p) =>
            p.id === paletteId
              ? { ...p, colors: p.colors.map((c) => (c.id === tempId ? newColor : c)) }
              : p
          ),
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          colorPalettes: prev.colorPalettes.map((p) =>
            p.id === paletteId ? { ...p, colors: p.colors.filter((c) => c.id !== tempId) } : p
          ),
        }));
        console.error('Failed to add color:', err);
      }
    },
    [logActivity]
  );

  const removeColorFromPalette = useCallback(
    async (paletteId: string, colorId: string) => {
      const palette = state.colorPalettes.find((p) => p.id === paletteId);
      const color = palette?.colors.find((c) => c.id === colorId);
      setState((prev) => ({
        ...prev,
        colorPalettes: prev.colorPalettes.map((p) =>
          p.id === paletteId ? { ...p, colors: p.colors.filter((c) => c.id !== colorId) } : p
        ),
      }));

      try {
        await brandKitApi.removeColorFromPalette(colorId);
      } catch (err) {
        if (color) {
          setState((prev) => ({
            ...prev,
            colorPalettes: prev.colorPalettes.map((p) =>
              p.id === paletteId ? { ...p, colors: [...p.colors, color] } : p
            ),
          }));
        }
        console.error('Failed to remove color:', err);
      }
    },
    [state.colorPalettes]
  );

  // ── Font CRUD ───────────────────────────────────────────────────────

  const addFont = useCallback(
    async (font: Omit<FontFamily, 'id' | 'createdAt'>) => {
      const tempId = generateId('font');
      const tempFont: FontFamily = { ...font, id: tempId, createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, fonts: [...prev.fonts, tempFont] }));
      logActivity('uploaded', 'fonts', font.name, `Added ${font.name} font family`);

      try {
        const newFont = await brandKitApi.addFont(font);
        setState((prev) => ({
          ...prev,
          fonts: prev.fonts.map((f) => (f.id === tempId ? newFont : f)),
        }));
      } catch (err) {
        setState((prev) => ({ ...prev, fonts: prev.fonts.filter((f) => f.id !== tempId) }));
        console.error('Failed to add font:', err);
      }
    },
    [logActivity]
  );

  const updateFont = useCallback(
    async (id: string, updates: Partial<FontFamily>) => {
      const original = state.fonts.find((f) => f.id === id);
      setState((prev) => ({
        ...prev,
        fonts: prev.fonts.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      }));
      logActivity('updated', 'fonts', updates.name || 'Font', 'Updated font settings');

      try {
        await brandKitApi.updateFont(id, updates);
      } catch (err) {
        if (original) {
          setState((prev) => ({
            ...prev,
            fonts: prev.fonts.map((f) => (f.id === id ? original : f)),
          }));
        }
        console.error('Failed to update font:', err);
      }
    },
    [state.fonts, logActivity]
  );

  const deleteFont = useCallback(
    async (id: string) => {
      const font = state.fonts.find((f) => f.id === id);
      setState((prev) => ({ ...prev, fonts: prev.fonts.filter((f) => f.id !== id) }));
      logActivity('deleted', 'fonts', font?.name || 'Font', 'Removed font from brand kit');

      try {
        await brandKitApi.deleteFont(id);
      } catch (err) {
        if (font) {
          setState((prev) => ({ ...prev, fonts: [...prev.fonts, font] }));
        }
        console.error('Failed to delete font:', err);
      }
    },
    [state.fonts, logActivity]
  );

  // ── Brand Voice CRUD ────────────────────────────────────────────────

  const updateBrandVoice = useCallback(
    async (updates: Partial<BrandVoice>) => {
      const original = state.brandVoice;
      setState((prev) => ({
        ...prev,
        brandVoice: prev.brandVoice
          ? { ...prev.brandVoice, ...updates, updatedAt: new Date().toISOString() }
          : {
              id: generateId('voice'),
              tone: updates.tone || '',
              description: updates.description || '',
              keywords: updates.keywords || [],
              dos: updates.dos || [],
              donts: updates.donts || [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
      }));
      logActivity('updated', 'brand-voice', 'Brand Voice', 'Updated brand voice settings');

      try {
        const newVoice = await brandKitApi.updateBrandVoice(updates);
        setState((prev) => ({ ...prev, brandVoice: newVoice }));
      } catch (err) {
        setState((prev) => ({ ...prev, brandVoice: original }));
        console.error('Failed to update brand voice:', err);
      }
    },
    [state.brandVoice, logActivity]
  );

  const resetBrandVoice = useCallback(async () => {
    const original = state.brandVoice;
    setState((prev) => ({ ...prev, brandVoice: null }));
    logActivity('deleted', 'brand-voice', 'Brand Voice', 'Reset brand voice settings');

    try {
      await brandKitApi.resetBrandVoice();
    } catch (err) {
      setState((prev) => ({ ...prev, brandVoice: original }));
      console.error('Failed to reset brand voice:', err);
    }
  }, [state.brandVoice, logActivity]);

  // Clear sample data and start fresh
  const clearSampleData = useCallback(() => {
    setState({
      logos: [],
      colorPalettes: [],
      fonts: [],
      brandVoice: null,
      photos: [],
      graphics: [],
      icons: [],
      styles: [],
      customCategories: [],
    });
    setIsUsingMockData(false);
    setActivityFeed([]);
  }, []);

  // ── Photo CRUD ──────────────────────────────────────────────────────

  const addPhoto = useCallback(
    async (photo: Omit<PhotoAsset, 'id' | 'createdAt'>) => {
      const tempId = generateId('photo');
      const tempPhoto: PhotoAsset = { ...photo, id: tempId, createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, photos: [...prev.photos, tempPhoto] }));
      logActivity('uploaded', 'photos', photo.name, `Uploaded photo "${photo.name}"`);

      try {
        const newPhoto = await brandKitApi.addPhoto(photo);
        setState((prev) => ({
          ...prev,
          photos: prev.photos.map((p) => (p.id === tempId ? newPhoto : p)),
        }));
      } catch (err) {
        setState((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== tempId) }));
        console.error('Failed to add photo:', err);
      }
    },
    [logActivity]
  );

  const updatePhoto = useCallback(
    async (id: string, updates: Partial<PhotoAsset>) => {
      const original = state.photos.find((p) => p.id === id);
      setState((prev) => ({
        ...prev,
        photos: prev.photos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));

      try {
        await brandKitApi.updatePhoto(id, updates);
      } catch (err) {
        if (original) {
          setState((prev) => ({
            ...prev,
            photos: prev.photos.map((p) => (p.id === id ? original : p)),
          }));
        }
        console.error('Failed to update photo:', err);
      }
    },
    [state.photos]
  );

  const deletePhoto = useCallback(
    async (id: string) => {
      const photo = state.photos.find((p) => p.id === id);
      setState((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== id) }));
      logActivity('deleted', 'photos', photo?.name || 'Photo', 'Removed photo from brand kit');

      try {
        await brandKitApi.deletePhoto(id);
      } catch (err) {
        if (photo) {
          setState((prev) => ({ ...prev, photos: [...prev.photos, photo] }));
        }
        console.error('Failed to delete photo:', err);
      }
    },
    [state.photos, logActivity]
  );

  // ── Graphic CRUD ────────────────────────────────────────────────────

  const addGraphic = useCallback(
    async (graphic: Omit<GraphicAsset, 'id' | 'createdAt'>) => {
      const tempId = generateId('gfx');
      const tempGraphic: GraphicAsset = { ...graphic, id: tempId, createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, graphics: [...prev.graphics, tempGraphic] }));
      logActivity('uploaded', 'graphics', graphic.name, `Uploaded graphic "${graphic.name}"`);

      try {
        const newGraphic = await brandKitApi.addGraphic(graphic);
        setState((prev) => ({
          ...prev,
          graphics: prev.graphics.map((g) => (g.id === tempId ? newGraphic : g)),
        }));
      } catch (err) {
        setState((prev) => ({ ...prev, graphics: prev.graphics.filter((g) => g.id !== tempId) }));
        console.error('Failed to add graphic:', err);
      }
    },
    [logActivity]
  );

  const updateGraphic = useCallback(
    async (id: string, updates: Partial<GraphicAsset>) => {
      const original = state.graphics.find((g) => g.id === id);
      setState((prev) => ({
        ...prev,
        graphics: prev.graphics.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      }));

      try {
        await brandKitApi.updateGraphic(id, updates);
      } catch (err) {
        if (original) {
          setState((prev) => ({
            ...prev,
            graphics: prev.graphics.map((g) => (g.id === id ? original : g)),
          }));
        }
        console.error('Failed to update graphic:', err);
      }
    },
    [state.graphics]
  );

  const deleteGraphic = useCallback(
    async (id: string) => {
      const graphic = state.graphics.find((g) => g.id === id);
      setState((prev) => ({ ...prev, graphics: prev.graphics.filter((g) => g.id !== id) }));
      logActivity('deleted', 'graphics', graphic?.name || 'Graphic', 'Removed graphic from brand kit');

      try {
        await brandKitApi.deleteGraphic(id);
      } catch (err) {
        if (graphic) {
          setState((prev) => ({ ...prev, graphics: [...prev.graphics, graphic] }));
        }
        console.error('Failed to delete graphic:', err);
      }
    },
    [state.graphics, logActivity]
  );

  // ── Icon CRUD ───────────────────────────────────────────────────────

  const addIcon = useCallback(
    async (icon: Omit<IconAsset, 'id' | 'createdAt'>) => {
      const tempId = generateId('icon');
      const tempIcon: IconAsset = { ...icon, id: tempId, createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, icons: [...prev.icons, tempIcon] }));
      logActivity('uploaded', 'icons', icon.name, `Added "${icon.name}" icon`);

      try {
        const newIcon = await brandKitApi.addIcon(icon);
        setState((prev) => ({
          ...prev,
          icons: prev.icons.map((i) => (i.id === tempId ? newIcon : i)),
        }));
      } catch (err) {
        setState((prev) => ({ ...prev, icons: prev.icons.filter((i) => i.id !== tempId) }));
        console.error('Failed to add icon:', err);
      }
    },
    [logActivity]
  );

  const updateIcon = useCallback(
    async (id: string, updates: Partial<IconAsset>) => {
      const original = state.icons.find((i) => i.id === id);
      setState((prev) => ({
        ...prev,
        icons: prev.icons.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      }));

      try {
        await brandKitApi.updateIcon(id, updates);
      } catch (err) {
        if (original) {
          setState((prev) => ({
            ...prev,
            icons: prev.icons.map((i) => (i.id === id ? original : i)),
          }));
        }
        console.error('Failed to update icon:', err);
      }
    },
    [state.icons]
  );

  const deleteIcon = useCallback(
    async (id: string) => {
      const icon = state.icons.find((i) => i.id === id);
      setState((prev) => ({ ...prev, icons: prev.icons.filter((i) => i.id !== id) }));
      logActivity('deleted', 'icons', icon?.name || 'Icon', 'Removed icon from brand kit');

      try {
        await brandKitApi.deleteIcon(id);
      } catch (err) {
        if (icon) {
          setState((prev) => ({ ...prev, icons: [...prev.icons, icon] }));
        }
        console.error('Failed to delete icon:', err);
      }
    },
    [state.icons, logActivity]
  );

  // ── Style CRUD ──────────────────────────────────────────────────────

  const addStyle = useCallback(
    async (style: Omit<StylePreset, 'id' | 'createdAt'>) => {
      const tempId = generateId('style');
      const tempStyle: StylePreset = { ...style, id: tempId, createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, styles: [...prev.styles, tempStyle] }));
      logActivity('created', 'styles', style.name, `Created style preset "${style.name}"`);

      try {
        const newStyle = await brandKitApi.addStyle(style);
        setState((prev) => ({
          ...prev,
          styles: prev.styles.map((s) => (s.id === tempId ? newStyle : s)),
        }));
      } catch (err) {
        setState((prev) => ({ ...prev, styles: prev.styles.filter((s) => s.id !== tempId) }));
        console.error('Failed to add style:', err);
      }
    },
    [logActivity]
  );

  const updateStyle = useCallback(
    async (id: string, updates: Partial<StylePreset>) => {
      const original = state.styles.find((s) => s.id === id);
      setState((prev) => ({
        ...prev,
        styles: prev.styles.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }));
      logActivity('updated', 'styles', updates.name || 'Style', 'Updated style preset');

      try {
        await brandKitApi.updateStyle(id, updates);
      } catch (err) {
        if (original) {
          setState((prev) => ({
            ...prev,
            styles: prev.styles.map((s) => (s.id === id ? original : s)),
          }));
        }
        console.error('Failed to update style:', err);
      }
    },
    [state.styles, logActivity]
  );

  const deleteStyle = useCallback(
    async (id: string) => {
      const style = state.styles.find((s) => s.id === id);
      setState((prev) => ({ ...prev, styles: prev.styles.filter((s) => s.id !== id) }));
      logActivity('deleted', 'styles', style?.name || 'Style', 'Removed style preset');

      try {
        await brandKitApi.deleteStyle(id);
      } catch (err) {
        if (style) {
          setState((prev) => ({ ...prev, styles: [...prev.styles, style] }));
        }
        console.error('Failed to delete style:', err);
      }
    },
    [state.styles, logActivity]
  );

  // ── Custom Category CRUD ───────────────────────────────────────────────

  const addCustomCategory = useCallback(
    async (category: Omit<CustomCategory, 'id' | 'createdAt'>) => {
      const tempId = generateId('custom-cat');
      const tempCategory: CustomCategory = {
        ...category,
        id: tempId,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({ ...prev, customCategories: [...prev.customCategories, tempCategory] }));
      logActivity('created', 'custom', category.name, `Created new category "${category.name}"`);

      try {
        const newCategory = await brandKitApi.addCustomCategory(category);
        setState((prev) => ({
          ...prev,
          customCategories: prev.customCategories.map((c) => (c.id === tempId ? newCategory : c)),
        }));
      } catch (err) {
        setState((prev) => ({ ...prev, customCategories: prev.customCategories.filter((c) => c.id !== tempId) }));
        console.error('Failed to add custom category:', err);
      }
    },
    [logActivity]
  );

  const deleteCustomCategory = useCallback(
    async (id: string) => {
      const category = state.customCategories.find((c) => c.id === id);
      setState((prev) => ({ ...prev, customCategories: prev.customCategories.filter((c) => c.id !== id) }));
      logActivity('deleted', 'custom', category?.name || 'Category', 'Removed custom category');

      try {
        await brandKitApi.deleteCustomCategory(id);
      } catch (err) {
        if (category) {
          setState((prev) => ({ ...prev, customCategories: [...prev.customCategories, category] }));
        }
        console.error('Failed to delete category:', err);
      }
    },
    [state.customCategories, logActivity]
  );

  // ── Return ──────────────────────────────────────────────────────────

  return {
    state,
    isLoading,
    error,
    refetch: fetchBrandKit,
    usageStats,
    activityFeed,
    isUsingMockData,
    clearSampleData,

    activeCategory,
    modalMode,
    isModalOpen,
    openModal,
    closeModal,

    getCategoryCount,

    addLogo,
    updateLogo,
    deleteLogo,
    setPrimaryLogo,

    addColorPalette,
    updateColorPalette,
    deleteColorPalette,
    addColorToPalette,
    removeColorFromPalette,

    addFont,
    updateFont,
    deleteFont,

    updateBrandVoice,
    resetBrandVoice,

    addPhoto,
    updatePhoto,
    deletePhoto,

    addGraphic,
    updateGraphic,
    deleteGraphic,

    addIcon,
    updateIcon,
    deleteIcon,

    addStyle,
    updateStyle,
    deleteStyle,

    addCustomCategory,
    deleteCustomCategory,
  };
}