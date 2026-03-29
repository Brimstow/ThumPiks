import React, { useState, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  Star,
  Upload,
  Edit3,
  Save,
  Tag,
} from 'lucide-react';
import {
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
  BrandKitState,
} from './types';
import { UseBrandKitReturn } from './useBrandKit';
import Tooltip from '../../ui/Tooltip';

// ── Props ─────────────────────────────────────────────────────────────

interface BrandKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: BrandCategoryType | null;
  mode: ModalMode;
  brandKit: UseBrandKitReturn;
}

// ── Main Modal ────────────────────────────────────────────────────────

const BrandKitModal: React.FC<BrandKitModalProps> = ({
  isOpen,
  onClose,
  category,
  mode,
  brandKit,
}) => {
  if (!isOpen || !category) return null;

  const title = getCategoryTitle(category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#020818] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl shadow-black/80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
          <Tooltip content="Close">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
          </Tooltip>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          <ModalContent category={category} mode={mode} brandKit={brandKit} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default BrandKitModal;

// ── Content Router ────────────────────────────────────────────────────

const ModalContent: React.FC<{
  category: BrandCategoryType;
  mode: ModalMode;
  brandKit: UseBrandKitReturn;
  onClose: () => void;
}> = ({ category, mode, brandKit, onClose }) => {
  switch (category) {
    case 'logos':
      return <LogosContent brandKit={brandKit} />;
    case 'colors':
      return <ColorsContent brandKit={brandKit} />;
    case 'fonts':
      return <FontsContent brandKit={brandKit} />;
    case 'brand-voice':
      return <BrandVoiceContent brandKit={brandKit} />;
    case 'photos':
      return <PhotosContent brandKit={brandKit} />;
    case 'graphics':
      return <GraphicsContent brandKit={brandKit} />;
    case 'icons':
      return <IconsContent brandKit={brandKit} />;
    case 'styles':
      return <StylesContent brandKit={brandKit} />;
    default:
      return <p className="text-slate-400">Unknown category</p>;
  }
};

// ── Logos Content ─────────────────────────────────────────────────────

const LogosContent: React.FC<{ brandKit: UseBrandKitReturn }> = ({ brandKit }) => {
  const { state, addLogo, deleteLogo, setPrimaryLogo } = brandKit;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVariant, setNewVariant] = useState<LogoAsset['variant']>('full');

  const handleAdd = () => {
    if (!newName.trim()) return;
    addLogo({
      name: newName,
      url: '/brand/logo-placeholder.svg',
      variant: newVariant,
      isPrimary: state.logos.length === 0,
      fileType: 'svg',
    });
    setNewName('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Logo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {state.logos.map((logo) => (
          <div
            key={logo.id}
            className={`relative group rounded-xl border p-4 transition-all ${
              logo.isPrimary
                ? 'border-blue-500/50 bg-blue-500/5'
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
            }`}
          >
            {/* Logo Preview */}
            <div className="h-20 w-full flex items-center justify-center mb-3">
              <div
                className={`h-16 w-16 rounded-xl flex items-center justify-center ${
                  logo.variant === 'dark' || logo.variant === 'icon'
                    ? 'bg-slate-950 border border-slate-800'
                    : 'bg-white border border-slate-200'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full ${
                    logo.variant === 'dark' || logo.variant === 'icon' ? 'bg-white' : 'bg-slate-950'
                  }`}
                />
              </div>
            </div>

            <p className="text-sm font-medium text-slate-200 truncate">{logo.name}</p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{logo.variant} • {logo.fileType.toUpperCase()}</p>

            {/* Primary Badge */}
            {logo.isPrimary && (
              <span className="absolute top-2 right-2 text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded">
                PRIMARY
              </span>
            )}

            {/* Actions (on hover) */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {!logo.isPrimary && (
                <Tooltip content="Set as primary">
                <button
                  onClick={() => setPrimaryLogo(logo.id)}
                  className="p-1.5 bg-slate-800 hover:bg-blue-600 rounded-lg transition-colors"
                >
                  <Star className="w-3.5 h-3.5 text-slate-300" />
                </button>
                </Tooltip>
              )}
              <Tooltip content="Delete logo">
              <button
                onClick={() => deleteLogo(logo.id)}
                className="p-1.5 bg-slate-800 hover:bg-red-600 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-300" />
              </button>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showAddForm ? (
        <div className="border border-slate-700 rounded-xl p-4 space-y-3">
          <input
            type="text"
            placeholder="Logo name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={newVariant}
            onChange={(e) => setNewVariant(e.target.value as LogoAsset['variant'])}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="full">Full Wordmark</option>
            <option value="icon">Icon Only</option>
            <option value="light">Light Variant</option>
            <option value="dark">Dark Variant</option>
          </select>
          <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-slate-600 transition-colors">
            <Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <p className="text-xs text-slate-400">Click or drag to upload SVG, PNG, or JPG</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              Add Logo
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full border border-dashed border-slate-700 rounded-xl p-4 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Logo
        </button>
      )}
    </div>
  );
};

// ── Colors Content ────────────────────────────────────────────────────

const ColorsContent: React.FC<{ brandKit: UseBrandKitReturn }> = ({ brandKit }) => {
  const { state, addColorPalette, deleteColorPalette, addColorToPalette, removeColorFromPalette } = brandKit;
  const [showAddPalette, setShowAddPalette] = useState(false);
  const [newPaletteName, setNewPaletteName] = useState('');
  const [addingColorTo, setAddingColorTo] = useState<string | null>(null);
  const [newColorHex, setNewColorHex] = useState('#3B82F6');
  const [newColorName, setNewColorName] = useState('');

  const handleAddPalette = () => {
    if (!newPaletteName.trim()) return;
    addColorPalette({ name: newPaletteName, colors: [], isPrimary: state.colorPalettes.length === 0 });
    setNewPaletteName('');
    setShowAddPalette(false);
  };

  const handleAddColor = (paletteId: string) => {
    if (!newColorHex) return;
    addColorToPalette(paletteId, {
      hex: newColorHex,
      name: newColorName || newColorHex,
      role: 'custom',
    });
    setNewColorHex('#3B82F6');
    setNewColorName('');
    setAddingColorTo(null);
  };

  return (
    <div className="space-y-6">
      {state.colorPalettes.map((palette) => (
        <div key={palette.id} className="border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-200">{palette.name}</h3>
              {palette.isPrimary && (
                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                  PRIMARY
                </span>
              )}
            </div>
            <button
              onClick={() => deleteColorPalette(palette.id)}
              className="p-1.5 hover:bg-red-600/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
            </button>
          </div>

          {/* Color Swatches */}
          <div className="flex flex-wrap gap-2 mb-3">
            {palette.colors.map((color) => (
              <div key={color.id} className="group relative">
                <Tooltip content={`${color.name} (${color.hex})`}>
                <div
                  className="w-12 h-12 rounded-lg shadow-sm cursor-pointer ring-1 ring-white/10 transition-transform hover:scale-110"
                  style={{ backgroundColor: color.hex }}
                />
                </Tooltip>
                <Tooltip content="Remove color">
                <button
                  onClick={() => removeColorFromPalette(palette.id, color.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
                </Tooltip>
                <p className="text-[10px] text-slate-500 mt-1 text-center truncate w-12">
                  {color.hex}
                </p>
              </div>
            ))}

            {/* Add Color Button */}
            {addingColorTo === palette.id ? (
              <div className="flex items-end gap-2">
                <div>
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Color name"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAddColor(palette.id)}
                      className="px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingColorTo(null)}
                      className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColorTo(palette.id)}
                className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center hover:border-slate-500 transition-colors"
              >
                <Plus className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Add Palette */}
      {showAddPalette ? (
        <div className="border border-slate-700 rounded-xl p-4 space-y-3">
          <input
            type="text"
            placeholder="Palette name..."
            value={newPaletteName}
            onChange={(e) => setNewPaletteName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddPalette(false)} className="px-4 py-2 text-sm text-slate-400">
              Cancel
            </button>
            <button
              onClick={handleAddPalette}
              disabled={!newPaletteName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              Create Palette
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddPalette(true)}
          className="w-full border border-dashed border-slate-700 rounded-xl p-4 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Palette
        </button>
      )}
    </div>
  );
};

// ── Fonts Content ─────────────────────────────────────────────────────

const FontsContent: React.FC<{ brandKit: UseBrandKitReturn }> = ({ brandKit }) => {
  const { state, addFont, deleteFont, updateFont } = brandKit;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFontName, setNewFontName] = useState('');
  const [newFontRole, setNewFontRole] = useState<FontFamily['role']>('heading');

  const handleAdd = () => {
    if (!newFontName.trim()) return;
    addFont({
      name: newFontName,
      fontFamily: `"${newFontName}", sans-serif`,
      role: newFontRole,
      previewText: 'Aa',
      weights: [{ weight: 400, label: 'Regular', style: 'normal' }],
    });
    setNewFontName('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {state.fonts.map((font) => (
        <div
          key={font.id}
          className="group border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-slate-200">{font.name}</h3>
                <span className="text-[10px] font-medium bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded capitalize">
                  {font.role}
                </span>
              </div>
              <p className="text-xs text-slate-500">{font.weights.length} weight{font.weights.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => deleteFont(font.id)}
              className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
            </button>
          </div>
          <div className="mt-3 flex items-baseline gap-4">
            <span className="text-3xl font-bold text-slate-100" style={{ fontFamily: font.fontFamily }}>
              {font.previewText}
            </span>
            <span className="text-3xl text-slate-400" style={{ fontFamily: font.fontFamily, fontStyle: 'italic' }}>
              {font.previewText}
            </span>
            <span className="text-lg text-slate-500" style={{ fontFamily: font.fontFamily }}>
              The quick brown fox jumps
            </span>
          </div>
        </div>
      ))}

      {showAddForm ? (
        <div className="border border-slate-700 rounded-xl p-4 space-y-3">
          <input
            type="text"
            placeholder="Font family name..."
            value={newFontName}
            onChange={(e) => setNewFontName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={newFontRole}
            onChange={(e) => setNewFontRole(e.target.value as FontFamily['role'])}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="heading">Heading</option>
            <option value="subheading">Subheading</option>
            <option value="body">Body</option>
            <option value="custom">Custom</option>
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-slate-400">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newFontName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              Add Font
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full border border-dashed border-slate-700 rounded-xl p-4 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Font Family
        </button>
      )}
    </div>
  );
};

// ── Brand Voice Content ───────────────────────────────────────────────

const BrandVoiceContent: React.FC<{ brandKit: UseBrandKitReturn }> = ({ brandKit }) => {
  const { state, updateBrandVoice, resetBrandVoice } = brandKit;
  const voice = state.brandVoice;
  const [isEditing, setIsEditing] = useState(false);
  const [tone, setTone] = useState(voice?.tone || '');
  const [description, setDescription] = useState(voice?.description || '');
  const [keywords, setKeywords] = useState(voice?.keywords.join(', ') || '');
  const [dos, setDos] = useState(voice?.dos.join('\n') || '');
  const [donts, setDonts] = useState(voice?.donts.join('\n') || '');

  const handleSave = () => {
    updateBrandVoice({
      tone,
      description,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      dos: dos.split('\n').filter(Boolean),
      donts: donts.split('\n').filter(Boolean),
    });
    setIsEditing(false);
  };

  if (isEditing || !voice) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Tone</label>
          <input
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="e.g., Friendly & Professional"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your brand's voice and tone..."
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Keywords (comma-separated)</label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="bold, creative, engaging..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-emerald-400 mb-1.5">Do's (one per line)</label>
            <textarea
              value={dos}
              onChange={(e) => setDos(e.target.value)}
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-red-400 mb-1.5">Don'ts (one per line)</label>
            <textarea
              value={donts}
              onChange={(e) => setDonts(e.target.value)}
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {voice && (
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-slate-400">
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Voice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{voice.tone}</h3>
          <p className="text-sm text-slate-400 mt-1">{voice.description}</p>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Edit3 className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Keywords */}
      <div className="flex flex-wrap gap-2">
        {voice.keywords.map((kw, i) => (
          <span key={i} className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300">
            {kw}
          </span>
        ))}
      </div>

      {/* Do's & Don'ts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Do's</h4>
          {voice.dos.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>{d}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Don'ts</h4>
          {voice.donts.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="text-red-400 mt-0.5">✗</span>
              <span>{d}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={resetBrandVoice}
        className="text-xs text-red-400 hover:text-red-300 transition-colors"
      >
        Reset Brand Voice
      </button>
    </div>
  );
};

// ── Photos Content ────────────────────────────────────────────────────

const PhotosContent: React.FC<{ brandKit: UseBrandKitReturn }> = ({ brandKit }) => {
  const { state, addPhoto, deletePhoto } = brandKit;
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? state.photos : state.photos.filter((p) => p.category === filter);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'headshot', 'background', 'product', 'lifestyle'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((photo) => (
          <div key={photo.id} className="group relative rounded-xl overflow-hidden aspect-square">
            <img
              src={photo.url}
              alt={photo.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs font-medium text-white truncate">{photo.name}</p>
                <div className="flex gap-1 mt-1">
                  {photo.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => deletePhoto(photo.id)}
                className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Button */}
      <button
        onClick={() => {
          addPhoto({
            name: `Photo ${state.photos.length + 1}`,
            url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=800&fit=crop',
            thumbnailUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=150&h=150&fit=crop',
            tags: ['new'],
            category: 'custom',
          });
        }}
        className="w-full border border-dashed border-slate-700 rounded-xl p-4 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all flex items-center justify-center gap-2"
      >
        <Upload className="w-4 h-4" /> Upload Photo
      </button>
    </div>
  );
};

// ── Graphics Content ──────────────────────────────────────────────────

const GraphicsContent: React.FC<{ brandKit: UseBrandKitReturn }> = ({ brandKit }) => {
  const { state, addGraphic, deleteGraphic } = brandKit;
  const [filter, setFilter] = useState<string>('all');

  const types = ['all', 'overlay', 'shape', 'pattern', 'sticker', 'badge'];
  const filtered = filter === 'all' ? state.graphics : state.graphics.filter((g) => g.type === filter);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Graphics Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {filtered.map((graphic) => (
          <div
            key={graphic.id}
            className="group relative rounded-xl border border-slate-800 bg-slate-900/50 p-3 hover:border-slate-700 transition-colors"
          >
            <div className="aspect-square flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                <Tag className="w-6 h-6 text-slate-500" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-slate-300 truncate text-center">{graphic.name}</p>
            <p className="text-[10px] text-slate-500 text-center capitalize">{graphic.type}</p>
            <button
              onClick={() => deleteGraphic(graphic.id)}
              className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded transition-all"
            >
              <Trash2 className="w-3 h-3 text-slate-500 hover:text-red-400" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          addGraphic({
            name: `Graphic ${state.graphics.length + 1}`,
            url: '/brand/graphics/new.svg',
            thumbnailUrl: '/brand/graphics/new-thumb.png',
            type: 'custom',
          });
        }}
        className="w-full border border-dashed border-slate-700 rounded-xl p-4 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all flex items-center justify-center gap-2"
      >
        <Upload className="w-4 h-4" /> Upload Graphic
      </button>
    </div>
  );
};

// ── Icons Content ─────────────────────────────────────────────────────

const IconsContent: React.FC<{ brandKit: UseBrandKitReturn }> = ({ brandKit }) => {
  const { state, deleteIcon } = brandKit;
  const [filter, setFilter] = useState<string>('all');

  const categories = ['all', 'action', 'social', 'media', 'ui'];
  const filtered = filter === 'all' ? state.icons : state.icons.filter((i) => i.category === filter);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === cat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Icons Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {filtered.map((icon) => (
          <div
            key={icon.id}
            className="group relative flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <div
              className="w-8 h-8 text-slate-300"
              dangerouslySetInnerHTML={{ __html: icon.svg }}
            />
            <p className="text-[10px] text-slate-400 truncate w-full text-center">{icon.name}</p>
            <button
              onClick={(e) => { e.stopPropagation(); deleteIcon(icon.id); }}
              className="absolute top-1 right-1 p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded transition-all"
            >
              <X className="w-3 h-3 text-slate-500 hover:text-red-400" />
            </button>
          </div>
        ))}
      </div>

      <button className="w-full border border-dashed border-slate-700 rounded-xl p-4 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Browse Icon Library
      </button>
    </div>
  );
};

// ── Styles Content ────────────────────────────────────────────────────

const StylesContent: React.FC<{ brandKit: UseBrandKitReturn }> = ({ brandKit }) => {
  const { state, deleteStyle } = brandKit;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {state.styles.map((style) => (
          <div
            key={style.id}
            className="group relative rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors"
          >
            {/* Preview */}
            <div className="aspect-video relative">
              <img
                src={style.previewUrl}
                alt={style.name}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ backgroundColor: style.overlayColor, opacity: style.overlayOpacity }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-lg font-bold drop-shadow-lg">{style.name}</span>
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">{style.name}</h3>
                <button
                  onClick={() => deleteStyle(style.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-slate-500">Fonts: {style.fontPairing.heading}</span>
                <div className="flex gap-1">
                  {style.colorScheme.map((c, i) => (
                    <div key={i} className="w-3 h-3 rounded-full ring-1 ring-white/10" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full border border-dashed border-slate-700 rounded-xl p-4 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Save Current as Style
      </button>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────

function getCategoryTitle(category: BrandCategoryType): string {
  const titles: Record<BrandCategoryType, string> = {
    logos: 'Logos',
    colors: 'Color Palettes',
    fonts: 'Font Families',
    'brand-voice': 'Brand Voice',
    photos: 'Photos',
    graphics: 'Graphics',
    icons: 'Icon Library',
    styles: 'Style Presets',
    custom: 'Custom Category',
  };
  return titles[category] || 'Brand Kit';
}
