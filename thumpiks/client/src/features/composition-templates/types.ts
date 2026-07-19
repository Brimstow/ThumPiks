/**
 * Composition Templates — Type Definitions
 *
 * A composition template describes a multi-image layout preset
 * (e.g. split-screen, person + background, triple panel).
 * Each template contains "slots" — named drop-zones where the
 * user places images.  Slots carry positioning, sizing, masking
 * and blend-mode metadata so the template can be applied to both
 * Quick Edit (simplified) and the Advanced Editor (full layer stack).
 */

// ============================================
// SLOT (Drop Zone) TYPES
// ============================================

/** How a slot's image should be cropped/fit within its bounds */
export type SlotFit = 'cover' | 'contain' | 'fill' | 'none';

/** Mask shape applied to a slot */
export type SlotMaskShape =
  | 'none'
  | 'rectangle'
  | 'ellipse'
  | 'diagonal-left'   // diagonal cut, left-to-right
  | 'diagonal-right'  // diagonal cut, right-to-left
  | 'arch'
  | 'custom';         // SVG path

/** Blend mode matching editor.types BlendMode */
export type SlotBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light';

/** A single drop-zone within a composition template */
export interface CompositionSlot {
  /** Unique id within the template (e.g. "person", "background") */
  id: string;

  /** Human-readable label shown in the UI */
  label: string;

  /** Slot purpose hint — helps AI and auto-fill */
  role: 'primary' | 'secondary' | 'background' | 'accent' | 'text';

  /**
   * Position & size as fractions of the canvas (0–1).
   * This makes templates resolution-independent.
   */
  bounds: {
    x: number;      // left edge (0–1)
    y: number;      // top edge  (0–1)
    width: number;   // fraction of canvas width
    height: number;  // fraction of canvas height
  };

  /** How the image fits within bounds */
  fit: SlotFit;

  /** Z-order (lower = further back) */
  zIndex: number;

  /** Optional mask shape */
  mask: SlotMaskShape;

  /** Custom SVG mask path (only when mask === 'custom') */
  maskPath?: string;

  /** Blend mode for this slot's layer */
  blendMode: SlotBlendMode;

  /** Opacity 0–100 */
  opacity: number;

  /** Optional CSS/Canvas filter string (e.g. "blur(4px) brightness(0.6)") */
  filter?: string;

  /** Whether this slot should have its background removed before compositing */
  autoRemoveBg?: boolean;

  /** Whether this slot is required (template can't render without it) */
  required: boolean;
}

// ============================================
// TEXT SLOT
// ============================================

/** Pre-positioned text area within a composition */
export interface CompositionTextSlot {
  id: string;
  label: string;
  role: 'text';

  /** Position as fractions of canvas */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  zIndex: number;

  /** Default text styling */
  defaultStyle: {
    fontFamily: string;
    fontSize: number;       // in px at 1920×1080 reference
    fontWeight: number;
    color: string;
    stroke?: string;
    strokeWidth?: number;
    textAlign: 'left' | 'center' | 'right';
    textTransform?: 'none' | 'uppercase' | 'lowercase';
  };

  /** Placeholder text shown in the editor */
  placeholder: string;
}

// ============================================
// COMPOSITION TEMPLATE
// ============================================

/** Categories for browsing/filtering */
export type TemplateCategory =
  | 'split-screen'
  | 'person-bg'
  | 'collage'
  | 'comparison'
  | 'reaction'
  | 'cinematic'
  | 'minimal'
  | 'custom';

export interface LayoutPreset {
  /** Unique template identifier */
  id: string;

  /** Display name */
  name: string;

  /** Short description */
  description: string;

  /** Category for filtering */
  category: TemplateCategory;

  /** Tags for search */
  tags: string[];

  /** Preview image URL (rendered example) */
  previewUrl?: string;

  /** SVG thumbnail showing the layout wireframe */
  wireframeSvg: string;

  /** Canvas dimensions (reference size) */
  canvasWidth: number;
  canvasHeight: number;

  /** Image drop-zones */
  slots: CompositionSlot[];

  /** Pre-positioned text areas */
  textSlots: CompositionTextSlot[];

  /** Optional background color/gradient when no background slot is filled */
  fallbackBackground?: string;

  /** Whether this is a built-in preset (vs. user-created) */
  builtIn: boolean;

  /** Popularity score (for sorting) */
  popularity?: number;
}

// ============================================
// APPLIED COMPOSITION STATE
// ============================================

/** Maps a slot id to the user's chosen image */
export interface SlotFill {
  slotId: string;
  imageUrl: string;          // data URL or remote URL
  originalWidth?: number;
  originalHeight?: number;
}

/** Maps a text slot id to the user's entered text */
export interface TextSlotFill {
  slotId: string;
  content: string;
  styleOverrides?: Partial<CompositionTextSlot['defaultStyle']>;
}

/** The full state of a composition being edited */
export interface CompositionState {
  templateId: string;
  slotFills: SlotFill[];
  textFills: TextSlotFill[];
}
