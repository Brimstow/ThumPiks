import { useState, useCallback } from 'react';
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
import {
  initialBrandKitState,
  brandUsageStats as initialUsageStats,
  brandActivityFeed as initialActivityFeed,
  generateId,
} from './brandKitMockData';

// ── Hook Return Type ──────────────────────────────────────────────────

export interface UseBrandKitReturn {
  state: BrandKitState;
  usageStats: BrandUsageStat[];
  activityFeed: BrandActivityItem[];

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
  const [state, setState] = useState<BrandKitState>(initialBrandKitState);
  const [usageStats] = useState<BrandUsageStat[]>(initialUsageStats);
  const [activityFeed, setActivityFeed] = useState<BrandActivityItem[]>(initialActivityFeed);

  // Modal state
  const [activeCategory, setActiveCategory] = useState<BrandCategoryType | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    (logo: Omit<LogoAsset, 'id' | 'createdAt'>) => {
      const newLogo: LogoAsset = { ...logo, id: generateId('logo'), createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, logos: [...prev.logos, newLogo] }));
      logActivity('uploaded', 'logos', logo.name, `Uploaded ${logo.variant} logo variant`);
    },
    [logActivity]
  );

  const updateLogo = useCallback(
    (id: string, updates: Partial<LogoAsset>) => {
      setState((prev) => ({
        ...prev,
        logos: prev.logos.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      }));
      logActivity('updated', 'logos', updates.name || 'Logo', 'Updated logo details');
    },
    [logActivity]
  );

  const deleteLogo = useCallback(
    (id: string) => {
      const logo = state.logos.find((l) => l.id === id);
      setState((prev) => ({ ...prev, logos: prev.logos.filter((l) => l.id !== id) }));
      logActivity('deleted', 'logos', logo?.name || 'Logo', 'Removed logo from brand kit');
    },
    [state.logos, logActivity]
  );

  const setPrimaryLogo = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      logos: prev.logos.map((l) => ({ ...l, isPrimary: l.id === id })),
    }));
  }, []);

  // ── Color CRUD ──────────────────────────────────────────────────────

  const addColorPalette = useCallback(
    (palette: Omit<ColorPalette, 'id' | 'createdAt'>) => {
      const newPalette: ColorPalette = { ...palette, id: generateId('palette'), createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, colorPalettes: [...prev.colorPalettes, newPalette] }));
      logActivity('created', 'colors', palette.name, `Created new color palette "${palette.name}"`);
    },
    [logActivity]
  );

  const updateColorPalette = useCallback(
    (id: string, updates: Partial<ColorPalette>) => {
      setState((prev) => ({
        ...prev,
        colorPalettes: prev.colorPalettes.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));
      logActivity('updated', 'colors', updates.name || 'Palette', 'Updated color palette');
    },
    [logActivity]
  );

  const deleteColorPalette = useCallback(
    (id: string) => {
      const palette = state.colorPalettes.find((p) => p.id === id);
      setState((prev) => ({ ...prev, colorPalettes: prev.colorPalettes.filter((p) => p.id !== id) }));
      logActivity('deleted', 'colors', palette?.name || 'Palette', 'Removed color palette');
    },
    [state.colorPalettes, logActivity]
  );

  const addColorToPalette = useCallback(
    (paletteId: string, color: Omit<ColorSwatch, 'id'>) => {
      const newColor: ColorSwatch = { ...color, id: generateId('color') };
      setState((prev) => ({
        ...prev,
        colorPalettes: prev.colorPalettes.map((p) =>
          p.id === paletteId ? { ...p, colors: [...p.colors, newColor] } : p
        ),
      }));
      logActivity('updated', 'colors', color.name, `Added ${color.hex} to palette`);
    },
    [logActivity]
  );

  const removeColorFromPalette = useCallback(
    (paletteId: string, colorId: string) => {
      setState((prev) => ({
        ...prev,
        colorPalettes: prev.colorPalettes.map((p) =>
          p.id === paletteId ? { ...p, colors: p.colors.filter((c) => c.id !== colorId) } : p
        ),
      }));
    },
    []
  );

  // ── Font CRUD ───────────────────────────────────────────────────────

  const addFont = useCallback(
    (font: Omit<FontFamily, 'id' | 'createdAt'>) => {
      const newFont: FontFamily = { ...font, id: generateId('font'), createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, fonts: [...prev.fonts, newFont] }));
      logActivity('uploaded', 'fonts', font.name, `Added ${font.name} font family`);
    },
    [logActivity]
  );

  const updateFont = useCallback(
    (id: string, updates: Partial<FontFamily>) => {
      setState((prev) => ({
        ...prev,
        fonts: prev.fonts.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      }));
      logActivity('updated', 'fonts', updates.name || 'Font', 'Updated font settings');
    },
    [logActivity]
  );

  const deleteFont = useCallback(
    (id: string) => {
      const font = state.fonts.find((f) => f.id === id);
      setState((prev) => ({ ...prev, fonts: prev.fonts.filter((f) => f.id !== id) }));
      logActivity('deleted', 'fonts', font?.name || 'Font', 'Removed font from brand kit');
    },
    [state.fonts, logActivity]
  );

  // ── Brand Voice CRUD ────────────────────────────────────────────────

  const updateBrandVoice = useCallback(
    (updates: Partial<BrandVoice>) => {
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
    },
    [logActivity]
  );

  const resetBrandVoice = useCallback(() => {
    setState((prev) => ({ ...prev, brandVoice: null }));
    logActivity('deleted', 'brand-voice', 'Brand Voice', 'Reset brand voice settings');
  }, [logActivity]);

  // ── Photo CRUD ──────────────────────────────────────────────────────

  const addPhoto = useCallback(
    (photo: Omit<PhotoAsset, 'id' | 'createdAt'>) => {
      const newPhoto: PhotoAsset = { ...photo, id: generateId('photo'), createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, photos: [...prev.photos, newPhoto] }));
      logActivity('uploaded', 'photos', photo.name, `Uploaded photo "${photo.name}"`);
    },
    [logActivity]
  );

  const updatePhoto = useCallback(
    (id: string, updates: Partial<PhotoAsset>) => {
      setState((prev) => ({
        ...prev,
        photos: prev.photos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));
    },
    []
  );

  const deletePhoto = useCallback(
    (id: string) => {
      const photo = state.photos.find((p) => p.id === id);
      setState((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== id) }));
      logActivity('deleted', 'photos', photo?.name || 'Photo', 'Removed photo from brand kit');
    },
    [state.photos, logActivity]
  );

  // ── Graphic CRUD ────────────────────────────────────────────────────

  const addGraphic = useCallback(
    (graphic: Omit<GraphicAsset, 'id' | 'createdAt'>) => {
      const newGraphic: GraphicAsset = { ...graphic, id: generateId('gfx'), createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, graphics: [...prev.graphics, newGraphic] }));
      logActivity('uploaded', 'graphics', graphic.name, `Uploaded graphic "${graphic.name}"`);
    },
    [logActivity]
  );

  const updateGraphic = useCallback(
    (id: string, updates: Partial<GraphicAsset>) => {
      setState((prev) => ({
        ...prev,
        graphics: prev.graphics.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      }));
    },
    []
  );

  const deleteGraphic = useCallback(
    (id: string) => {
      const graphic = state.graphics.find((g) => g.id === id);
      setState((prev) => ({ ...prev, graphics: prev.graphics.filter((g) => g.id !== id) }));
      logActivity('deleted', 'graphics', graphic?.name || 'Graphic', 'Removed graphic from brand kit');
    },
    [state.graphics, logActivity]
  );

  // ── Icon CRUD ───────────────────────────────────────────────────────

  const addIcon = useCallback(
    (icon: Omit<IconAsset, 'id' | 'createdAt'>) => {
      const newIcon: IconAsset = { ...icon, id: generateId('icon'), createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, icons: [...prev.icons, newIcon] }));
      logActivity('uploaded', 'icons', icon.name, `Added "${icon.name}" icon`);
    },
    [logActivity]
  );

  const updateIcon = useCallback(
    (id: string, updates: Partial<IconAsset>) => {
      setState((prev) => ({
        ...prev,
        icons: prev.icons.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      }));
    },
    []
  );

  const deleteIcon = useCallback(
    (id: string) => {
      const icon = state.icons.find((i) => i.id === id);
      setState((prev) => ({ ...prev, icons: prev.icons.filter((i) => i.id !== id) }));
      logActivity('deleted', 'icons', icon?.name || 'Icon', 'Removed icon from brand kit');
    },
    [state.icons, logActivity]
  );

  // ── Style CRUD ──────────────────────────────────────────────────────

  const addStyle = useCallback(
    (style: Omit<StylePreset, 'id' | 'createdAt'>) => {
      const newStyle: StylePreset = { ...style, id: generateId('style'), createdAt: new Date().toISOString() };
      setState((prev) => ({ ...prev, styles: [...prev.styles, newStyle] }));
      logActivity('created', 'styles', style.name, `Created style preset "${style.name}"`);
    },
    [logActivity]
  );

  const updateStyle = useCallback(
    (id: string, updates: Partial<StylePreset>) => {
      setState((prev) => ({
        ...prev,
        styles: prev.styles.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }));
      logActivity('updated', 'styles', updates.name || 'Style', 'Updated style preset');
    },
    [logActivity]
  );

  const deleteStyle = useCallback(
    (id: string) => {
      const style = state.styles.find((s) => s.id === id);
      setState((prev) => ({ ...prev, styles: prev.styles.filter((s) => s.id !== id) }));
      logActivity('deleted', 'styles', style?.name || 'Style', 'Removed style preset');
    },
    [state.styles, logActivity]
  );

  // ── Custom Category CRUD ───────────────────────────────────────────────

  const addCustomCategory = useCallback(
    (category: Omit<CustomCategory, 'id' | 'createdAt'>) => {
      const newCategory: CustomCategory = {
        ...category,
        id: generateId('custom-cat'),
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({ ...prev, customCategories: [...prev.customCategories, newCategory] }));
      logActivity('created', 'custom', category.name, `Created new category "${category.name}"`);
    },
    [logActivity]
  );

  const deleteCustomCategory = useCallback(
    (id: string) => {
      const category = state.customCategories.find((c) => c.id === id);
      setState((prev) => ({ ...prev, customCategories: prev.customCategories.filter((c) => c.id !== id) }));
      logActivity('deleted', 'custom', category?.name || 'Category', 'Removed custom category');
    },
    [state.customCategories, logActivity]
  );

  // ── Return ──────────────────────────────────────────────────────────

  return {
    state,
    usageStats,
    activityFeed,

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