import React, { useState } from 'react';
import {
  Share,
  Aperture,
  Palette,
  Type,
  Megaphone,
  Image as ImageIcon,
  Layers,
  Sticker,
  Sparkles,
  Plus,
  X,
  Folder,
  FileText,
  Video,
  Music,
  Bookmark,
  Heart,
  Zap,
  Crown,
  Gem,
  Target,
  Briefcase,
  Mail,
  Phone,
  Globe,
  CreditCard,
  Package,
  Gift,
  Clock,
  Calendar,
  Users,
  Star,
  Info,
  Wand2,
} from 'lucide-react';
import { BrandCategoryType, BrandCategory, CustomCategory } from './brand/types';
import { useBrandKit } from './brand/useBrandKit';
import BrandKitModal from './brand/BrandKitModal';
import BrandUsageOverview from './brand/BrandUsageOverview';
import RecentBrandActivity from './brand/RecentBrandActivity';
import BrandKitSetupWizard from './brand/BrandKitSetupWizard';

// ── Category Card Config (driven by hook state for counts) ────────────

const brandCategoryConfig: BrandCategory[] = [
  {
    id: 'logos',
    icon: Aperture,
    title: 'Logos',
    count: '', // filled dynamically
    color: 'blue',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    textColor: 'text-blue-400',
    hoverColor: 'group-hover:text-blue-300',
  },
  {
    id: 'colors',
    icon: Palette,
    title: 'Colors',
    count: '',
    color: 'purple',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    textColor: 'text-purple-400',
    hoverColor: 'group-hover:text-purple-300',
  },
  {
    id: 'fonts',
    icon: Type,
    title: 'Fonts',
    count: '',
    color: 'emerald',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    textColor: 'text-emerald-400',
    hoverColor: 'group-hover:text-emerald-300',
  },
  {
    id: 'brand-voice',
    icon: Megaphone,
    title: 'Brand Voice',
    count: '',
    color: 'rose',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    textColor: 'text-rose-400',
    hoverColor: 'group-hover:text-rose-300',
  },
  {
    id: 'photos',
    icon: ImageIcon,
    title: 'Photos',
    count: '',
    color: 'amber',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    textColor: 'text-amber-400',
    hoverColor: 'group-hover:text-amber-300',
  },
  {
    id: 'graphics',
    icon: Layers,
    title: 'Graphics',
    count: '',
    color: 'indigo',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    textColor: 'text-indigo-400',
    hoverColor: 'group-hover:text-indigo-300',
  },
  {
    id: 'icons',
    icon: Sticker,
    title: 'Icons',
    count: '',
    color: 'cyan',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    textColor: 'text-cyan-400',
    hoverColor: 'group-hover:text-cyan-300',
  },
  {
    id: 'styles',
    icon: Sparkles,
    title: 'Styles',
    count: '',
    color: 'orange',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    textColor: 'text-orange-400',
    hoverColor: 'group-hover:text-orange-300',
  },
];

// Available icons for custom categories
const customCategoryIcons: { name: string; icon: React.ElementType }[] = [
  { name: 'Folder', icon: Folder },
  { name: 'FileText', icon: FileText },
  { name: 'Video', icon: Video },
  { name: 'Music', icon: Music },
  { name: 'Bookmark', icon: Bookmark },
  { name: 'Heart', icon: Heart },
  { name: 'Zap', icon: Zap },
  { name: 'Crown', icon: Crown },
  { name: 'Gem', icon: Gem },
  { name: 'Target', icon: Target },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Mail', icon: Mail },
  { name: 'Phone', icon: Phone },
  { name: 'Globe', icon: Globe },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Package', icon: Package },
  { name: 'Gift', icon: Gift },
  { name: 'Clock', icon: Clock },
  { name: 'Calendar', icon: Calendar },
  { name: 'Users', icon: Users },
  { name: 'Star', icon: Star },
];

// Available colors for custom categories
const customCategoryColors = [
  { name: 'pink', color: 'pink', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/20', textColor: 'text-pink-400', hoverColor: 'group-hover:text-pink-300' },
  { name: 'red', color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', hoverColor: 'group-hover:text-red-300' },
  { name: 'yellow', color: 'yellow', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', textColor: 'text-yellow-400', hoverColor: 'group-hover:text-yellow-300' },
  { name: 'lime', color: 'lime', bgColor: 'bg-lime-500/10', borderColor: 'border-lime-500/20', textColor: 'text-lime-400', hoverColor: 'group-hover:text-lime-300' },
  { name: 'teal', color: 'teal', bgColor: 'bg-teal-500/10', borderColor: 'border-teal-500/20', textColor: 'text-teal-400', hoverColor: 'group-hover:text-teal-300' },
  { name: 'sky', color: 'sky', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/20', textColor: 'text-sky-400', hoverColor: 'group-hover:text-sky-300' },
  { name: 'slate', color: 'slate', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/20', textColor: 'text-slate-400', hoverColor: 'group-hover:text-slate-300' },
];

// Helper to get icon component by name
const getIconByName = (name: string): React.ElementType => {
  const found = customCategoryIcons.find((i) => i.name === name);
  return found ? found.icon : Folder;
};

// ── Dynamic Card Content Renderers ────────────────────────────────────

function LogosPreview({ logos }: { logos: ReturnType<typeof useBrandKit>['state']['logos'] }) {
  const visible = logos.slice(0, 2);
  const remaining = Math.max(0, logos.length - 2);
  return (
    <div className="mt-4 flex items-center gap-2">
      {visible.map((logo) => (
        <div
          key={logo.id}
          className={`h-10 w-10 rounded-lg flex items-center justify-center ${
            logo.variant === 'dark' || logo.variant === 'icon'
              ? 'bg-slate-950 border border-slate-800'
              : 'bg-white border border-slate-200'
          }`}
        >
          <div className={`w-4 h-4 rounded-full ${logo.variant === 'dark' || logo.variant === 'icon' ? 'bg-white' : 'bg-slate-950'}`} />
        </div>
      ))}
      {remaining > 0 && (
        <div className="h-10 w-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xs text-slate-500">
          +{remaining}
        </div>
      )}
      {logos.length === 0 && <span className="text-xs text-slate-500">No logos yet</span>}
    </div>
  );
}

function ColorsPreview({ palettes }: { palettes: ReturnType<typeof useBrandKit>['state']['colorPalettes'] }) {
  const primaryPalette = palettes.find((p) => p.isPrimary) || palettes[0];
  if (!primaryPalette) return <span className="mt-3 text-xs text-slate-500">No palettes yet</span>;
  return (
    <div className="mt-4 flex gap-2">
      {primaryPalette.colors.slice(0, 4).map((color) => (
        <div key={color.id} className="h-8 w-12 rounded shadow-sm" style={{ backgroundColor: color.hex }} />
      ))}
    </div>
  );
}

function FontsPreview({ fonts }: { fonts: ReturnType<typeof useBrandKit>['state']['fonts'] }) {
  if (fonts.length === 0) return <span className="mt-3 text-xs text-slate-500">No fonts yet</span>;
  return (
    <div className="mt-4 flex items-baseline gap-3">
      {fonts.slice(0, 2).map((font, i) => (
        <span
          key={font.id}
          className={`text-2xl ${i === 0 ? 'font-bold text-slate-200' : 'text-slate-400'}`}
          style={{ fontFamily: font.fontFamily }}
        >
          {font.previewText}
        </span>
      ))}
    </div>
  );
}

function BrandVoicePreview({ voice }: { voice: ReturnType<typeof useBrandKit>['state']['brandVoice'] }) {
  if (!voice) return <span className="mt-3 text-xs text-slate-500">Not configured</span>;
  return (
    <p className="mt-3 text-xs text-slate-400 leading-relaxed line-clamp-2">
      {voice.description}
    </p>
  );
}

function PhotosPreview({ photos }: { photos: ReturnType<typeof useBrandKit>['state']['photos'] }) {
  const visible = photos.slice(0, 3);
  const remaining = Math.max(0, photos.length - 3);
  if (photos.length === 0) return <span className="mt-3 text-xs text-slate-500">No photos yet</span>;
  return (
    <div className="mt-4 flex -space-x-2 overflow-hidden">
      {visible.map((photo) => (
        <img
          key={photo.id}
          className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover"
          src={photo.thumbnailUrl}
          alt={photo.name}
        />
      ))}
      {remaining > 0 && (
        <div className="h-8 w-8 rounded-full ring-2 ring-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}

function GraphicsPreview({ graphics }: { graphics: ReturnType<typeof useBrandKit>['state']['graphics'] }) {
  if (graphics.length === 0) return <span className="mt-3 text-xs text-slate-500">No graphics yet</span>;
  return (
    <div className="mt-4 grid grid-cols-4 gap-1 opacity-60">
      {graphics.slice(0, 4).map((_, i) => (
        <div key={i} className={`h-2 w-full rounded-sm ${i % 2 === 0 ? 'bg-indigo-500/40' : 'bg-slate-700'}`} />
      ))}
    </div>
  );
}

function IconsPreview({ icons }: { icons: ReturnType<typeof useBrandKit>['state']['icons'] }) {
  if (icons.length === 0) return <span className="mt-3 text-xs text-slate-500">No icons yet</span>;
  return (
    <div className="mt-4 flex gap-3 text-slate-500">
      {icons.slice(0, 3).map((icon) => (
        <div key={icon.id} className="w-5 h-5" dangerouslySetInnerHTML={{ __html: icon.svg }} />
      ))}
    </div>
  );
}

function StylesPreview({ styles }: { styles: ReturnType<typeof useBrandKit>['state']['styles'] }) {
  if (styles.length === 0) return <span className="mt-3 text-xs text-slate-500">No presets yet</span>;
  return (
    <div className="mt-4 flex items-end gap-1 h-6">
      {styles.slice(0, 3).map((style, i) => (
        <div
          key={style.id}
          className="w-2 rounded-t-sm"
          style={{
            backgroundColor: style.colorScheme[0] || '#F97316',
            height: `${100 - i * 25}%`,
            opacity: 1 - i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

// ── Render card content by category type ──────────────────────────────

function renderCardContent(categoryId: BrandCategoryType, state: ReturnType<typeof useBrandKit>['state']) {
  switch (categoryId) {
    case 'logos':
      return <LogosPreview logos={state.logos} />;
    case 'colors':
      return <ColorsPreview palettes={state.colorPalettes} />;
    case 'fonts':
      return <FontsPreview fonts={state.fonts} />;
    case 'brand-voice':
      return <BrandVoicePreview voice={state.brandVoice} />;
    case 'photos':
      return <PhotosPreview photos={state.photos} />;
    case 'graphics':
      return <GraphicsPreview graphics={state.graphics} />;
    case 'icons':
      return <IconsPreview icons={state.icons} />;
    case 'styles':
      return <StylesPreview styles={state.styles} />;
    default:
      return null;
  }
}

// ── BrandPage Component ───────────────────────────────────────────────

const BrandPage: React.FC = () => {
  const brandKit = useBrandKit();
  const { state, usageStats, activityFeed, getCategoryCount, openModal, closeModal, isModalOpen, activeCategory, modalMode, addCustomCategory, deleteCustomCategory, isUsingMockData, clearSampleData } = brandKit;
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Folder');
  const [newCategoryColor, setNewCategoryColor] = useState('pink');
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const handleStartManualSetup = (category: BrandCategoryType) => {
    openModal(category, 'add');
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    const colorConfig = customCategoryColors.find((c) => c.name === newCategoryColor) || customCategoryColors[0];
    addCustomCategory({
      name: newCategoryName,
      icon: newCategoryIcon,
      color: colorConfig.color,
      bgColor: colorConfig.bgColor,
      borderColor: colorConfig.borderColor,
      textColor: colorConfig.textColor,
      hoverColor: colorConfig.hoverColor,
    });
    setNewCategoryName('');
    setNewCategoryIcon('Folder');
    setNewCategoryColor('pink');
    setShowNewCategoryForm(false);
  };

  return (
    <>
      {/* Brand Kit Section */}
      <div className="mb-12 relative">
        <div className="absolute inset-0 -top-12 mx-auto h-96 max-w-6xl rounded-[40px] bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent blur-3xl -z-10"></div>

        {/* Sample Brand Kit Banner */}
        {isUsingMockData && !bannerDismissed && (
          <div className="mb-6 relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent"></div>
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-amber-100">Sample Brand Kit</h3>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Preview Mode
                    </span>
                  </div>
                  <p className="text-sm text-amber-200/70 mt-1">
                    You're viewing sample data to preview how your Brand Kit will look. Set up your own brand assets to get started.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowSetupWizard(true)}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs sm:text-sm font-semibold transition-all"
                >
                  <Wand2 className="w-4 h-4" />
                  Set Up My Brand
                </button>
                <button
                  onClick={() => setBannerDismissed(true)}
                  className="p-2 hover:bg-amber-500/20 rounded-lg transition-colors text-amber-400/70 hover:text-amber-300"
                  title="Dismiss"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-50">Brand Kit</h2>
            <p className="text-slate-400 mt-2 text-sm max-w-xl">
              Manage your brand identity assets to maintain consistency across all your thumbnails and designs.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {isUsingMockData && (
              <button
                onClick={() => setShowSetupWizard(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all"
              >
                <Wand2 className="w-4 h-4" />
                <span className="hidden sm:inline">Set Up Brand Kit</span>
                <span className="sm:hidden">Set Up</span>
              </button>
            )}
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 hover:bg-white text-slate-900 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all">
              <Share className="w-4 h-4" />
              <span className="hidden sm:inline">Share Kit</span>
              <span className="sm:hidden">Share</span>
            </button>
          </div>
        </div>

        {/* Brand Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {brandCategoryConfig.map((category) => {
            const IconComponent = category.icon;
            const count = getCategoryCount(category.id);
            return (
              <div
                key={category.id}
                onClick={() => openModal(category.id)}
                className="group relative rounded-2xl border border-slate-800 bg-[#020818]/80 hover:bg-slate-900/90 backdrop-blur-sm p-5 transition-all cursor-pointer hover:border-slate-700 hover:shadow-lg hover:shadow-black/20"
              >
                {/* Sample Badge */}
                {isUsingMockData && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Sample
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-2.5 rounded-xl ${category.bgColor} ${category.borderColor} border ${category.textColor} ${category.hoverColor} transition-colors`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                  {!isUsingMockData && (
                    <span className="text-xs font-medium text-slate-500 group-hover:text-slate-400">
                      {count}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-slate-100">{category.title}</h3>
                {renderCardContent(category.id, state)}
              </div>
            );
          })}

          {/* Custom Categories */}
          {state.customCategories.map((category) => {
            const IconComponent = getIconByName(category.icon);
            return (
              <div
                key={category.id}
                className="group relative rounded-2xl border border-slate-800 bg-[#020818]/80 hover:bg-slate-900/90 backdrop-blur-sm p-5 transition-all cursor-pointer hover:border-slate-700 hover:shadow-lg hover:shadow-black/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-2.5 rounded-xl ${category.bgColor} ${category.borderColor} border ${category.textColor} ${category.hoverColor} transition-colors`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCustomCategory(category.id);
                    }}
                    className="text-xs text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Delete
                  </button>
                </div>
                <h3 className="text-base font-semibold text-slate-100">{category.name}</h3>
                <p className="mt-3 text-xs text-slate-500">Custom category</p>
              </div>
            );
          })}

          {/* New Category Card */}
          {showNewCategoryForm ? (
            <div className="group relative rounded-2xl border border-slate-700 bg-slate-900/80 backdrop-blur-sm p-5 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-100">Create New Category</h3>
                <button
                  onClick={() => setShowNewCategoryForm(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category Name</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Templates, Videos..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {customCategoryIcons.slice(0, 8).map((iconOption) => (
                      <button
                        key={iconOption.name}
                        onClick={() => setNewCategoryIcon(iconOption.name)}
                        className={`p-2 rounded-lg border transition-all ${
                          newCategoryIcon === iconOption.name
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                            : 'border-slate-700 hover:border-slate-600 text-slate-400'
                        }`}
                      >
                        <iconOption.icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {customCategoryColors.map((colorOption) => (
                      <button
                        key={colorOption.name}
                        onClick={() => setNewCategoryColor(colorOption.name)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          newCategoryColor === colorOption.name
                            ? 'border-white scale-110'
                            : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: colorOption.color === 'slate' ? '#64748b' : `var(--${colorOption.name}-500)` }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create Category
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setShowNewCategoryForm(true)}
              className="group relative rounded-2xl border border-dashed border-slate-700 bg-slate-900/20 hover:bg-slate-900/50 backdrop-blur-sm p-5 transition-all cursor-pointer hover:border-slate-500 flex flex-col items-center justify-center text-center h-full min-h-[160px]"
            >
              <div className="p-3 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800 transition-all mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300 group-hover:text-slate-100">New Category</h3>
              <p className="text-xs text-slate-500 mt-1">Add custom asset type</p>
            </div>
          )}
        </div>
      </div>

      {/* Brand Usage & Activity Section (replaces old projects/stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BrandUsageOverview usageStats={usageStats} />
        <RecentBrandActivity activityFeed={activityFeed} />
      </div>

      {/* CRUD Modal */}
      <BrandKitModal
        isOpen={isModalOpen}
        onClose={closeModal}
        category={activeCategory}
        mode={modalMode}
        brandKit={brandKit}
      />

      {/* Setup Wizard Modal */}
      <BrandKitSetupWizard
        isOpen={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        onStartManualSetup={handleStartManualSetup}
        onClearSampleData={clearSampleData}
      />
    </>
  );
};

export default BrandPage;
