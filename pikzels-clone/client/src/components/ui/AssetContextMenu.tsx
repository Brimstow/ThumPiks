import React from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Youtube, Instagram, Music, Twitter, User, Image, Palette, ArrowRightLeft } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type ThumbnailPlatform = 'youtube' | 'tiktok' | 'instagram' | 'twitter';
export type AssetType = 'face' | 'background' | 'logo' | 'other';

interface BaseCMProps {
  children: React.ReactNode;
}

interface ThumbnailContextMenuProps extends BaseCMProps {
  variant: 'thumbnail';
  currentPlatform?: ThumbnailPlatform;
  onRecategorize: (platform: ThumbnailPlatform) => void;
}

interface AssetContextMenuProps extends BaseCMProps {
  variant: 'asset';
  currentType: AssetType;
  onRecategorize: (type: AssetType) => void;
}

type Props = ThumbnailContextMenuProps | AssetContextMenuProps;

// ═══════════════════════════════════════════════════════════════════
// PLATFORM / TYPE OPTIONS
// ═══════════════════════════════════════════════════════════════════

const PLATFORM_OPTIONS: { value: ThumbnailPlatform; label: string; icon: React.ReactNode }[] = [
  { value: 'youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4 text-red-400" /> },
  { value: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4 text-pink-400" /> },
  { value: 'tiktok', label: 'TikTok', icon: <Music className="w-4 h-4 text-cyan-400" /> },
  { value: 'twitter', label: 'Twitter / X', icon: <Twitter className="w-4 h-4 text-slate-400" /> },
];

const ASSET_TYPE_OPTIONS: { value: AssetType; label: string; icon: React.ReactNode }[] = [
  { value: 'face', label: 'Faces', icon: <User className="w-4 h-4 text-purple-400" /> },
  { value: 'background', label: 'Images', icon: <Image className="w-4 h-4 text-blue-400" /> },
  { value: 'logo', label: 'Brand', icon: <Palette className="w-4 h-4 text-amber-400" /> },
];

// ═══════════════════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════════════════

const menuContentClass =
  'min-w-[180px] bg-[#0F172A] border border-slate-700 rounded-xl p-1.5 shadow-2xl shadow-black/50 z-[100] animate-in fade-in-0 zoom-in-95';

const menuItemClass =
  'flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 rounded-lg outline-none cursor-pointer select-none data-[highlighted]:bg-slate-800 data-[highlighted]:text-white transition-colors';

const menuLabelClass = 'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500';

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

const AssetContextMenu: React.FC<Props> = (props) => {
  const { children } = props;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={menuContentClass}>
          <ContextMenu.Label className={menuLabelClass}>
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft className="w-3 h-3" />
              Move to
            </span>
          </ContextMenu.Label>

          {props.variant === 'thumbnail' && (
            <>
              {PLATFORM_OPTIONS.map((opt) => (
                <ContextMenu.Item
                  key={opt.value}
                  disabled={props.currentPlatform === opt.value}
                  onSelect={() => props.onRecategorize(opt.value)}
                  className={menuItemClass}
                >
                  {opt.icon}
                  {opt.label}
                  {props.currentPlatform === opt.value && (
                    <span className="ml-auto text-[10px] text-slate-500">Current</span>
                  )}
                </ContextMenu.Item>
              ))}
            </>
          )}

          {props.variant === 'asset' && (
            <>
              {ASSET_TYPE_OPTIONS.map((opt) => (
                <ContextMenu.Item
                  key={opt.value}
                  disabled={props.currentType === opt.value}
                  onSelect={() => props.onRecategorize(opt.value)}
                  className={menuItemClass}
                >
                  {opt.icon}
                  {opt.label}
                  {props.currentType === opt.value && (
                    <span className="ml-auto text-[10px] text-slate-500">Current</span>
                  )}
                </ContextMenu.Item>
              ))}
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export default AssetContextMenu;
