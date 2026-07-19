export type ViewState =
  | 'start'
  | 'url-input'
  | 'frame-picker'
  | 'ai-generate'
  | 'upload'
  | 'result';

export interface TextOverlay {
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

export interface QuickEditViewProps {
  onClose?: () => void;
  onOpenEditor?: (imageUrl: string) => void;
}

export interface PersistedState {
  view: ViewState;
  urlInput: string;
  videoTitle: string;
  selectedFrameIdx: number | null;
  resultImageUrl: string | null;
  originalImageUrl: string | null;
  videoFrames: import('../../../services/quickEditService').VideoFrame[];
  aiPrompt: string;
  selectedStyle: string | null;
}
