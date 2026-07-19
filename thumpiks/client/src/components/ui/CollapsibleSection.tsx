import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import './CollapsibleSection.css';

// ============================================================================
// Disclosure Preferences — shared localStorage persistence
// ============================================================================

const STORAGE_KEY = 'thumpiks_disclosure_prefs';

export interface DisclosurePrefs {
  sidebar: { moreExpanded: boolean };
  dashboard: { customizeExpanded: boolean };
  editor: {
    toolsExpanded: boolean;
    layersAdvanced: boolean;
    adjustmentsAdvanced: boolean;
    topBarOverflowSeen: boolean;
  };
}

const DEFAULT_PREFS: DisclosurePrefs = {
  sidebar: { moreExpanded: false },
  dashboard: { customizeExpanded: false },
  editor: {
    toolsExpanded: false,
    layersAdvanced: false,
    adjustmentsAdvanced: false,
    topBarOverflowSeen: false,
  },
};

/** Read a nested value from disclosure prefs using a dot-path key like "editor.toolsExpanded" */
export function getDisclosurePref(key: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const prefs: DisclosurePrefs = raw ? JSON.parse(raw) : DEFAULT_PREFS;
    const parts = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = prefs;
    for (const part of parts) {
      if (current == null) return false;
      current = current[part];
    }
    return typeof current === 'boolean' ? current : false;
  } catch {
    return false;
  }
}

/** Write a nested value to disclosure prefs */
export function setDisclosurePref(key: string, value: boolean): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const prefs: DisclosurePrefs = raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
    const parts = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = prefs;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] == null) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable — silently fail
  }
}

// ============================================================================
// Editor Mode Persistence — separate from DisclosurePrefs (string, not boolean)
// ============================================================================

const EDITOR_MODE_KEY = 'thumpiks_editor_mode';

export type EditorMode = 'simple' | 'pro';

/** Read editor mode preference from localStorage */
export function getEditorMode(): EditorMode {
  try {
    const raw = localStorage.getItem(EDITOR_MODE_KEY);
    if (raw === 'simple' || raw === 'pro') {
      return raw;
    }
    return 'simple'; // Default to simple mode for Grandma Test compliance
  } catch {
    return 'simple';
  }
}

/** Write editor mode preference to localStorage */
export function setEditorMode(mode: EditorMode): void {
  try {
    localStorage.setItem(EDITOR_MODE_KEY, mode);
  } catch {
    // localStorage unavailable — silently fail
  }
}

// ============================================================================
// CollapsibleSection Component
// ============================================================================

interface CollapsibleSectionProps {
  /** Display label next to the chevron */
  label: string;
  /** Dot-path key for localStorage persistence, e.g. "editor.toolsExpanded" */
  storageKey: string;
  /** Whether to start open (overridden by stored preference) */
  defaultOpen?: boolean;
  /** Optional CSS class on the outer wrapper */
  className?: string;
  /** Optional CSS class on the content wrapper */
  contentClassName?: string;
  /** Optional icon to show next to the label */
  icon?: React.ReactNode;
  /** Optional badge count */
  badge?: number;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  label,
  storageKey,
  defaultOpen = false,
  className = '',
  contentClassName = '',
  icon,
  badge,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(() => {
    return getDisclosurePref(storageKey) || defaultOpen;
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentHeight(entry.contentRect.height);
        }
      });
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      setDisclosurePref(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return (
    <div className={`collapsible-section ${className}`}>
      <button
        type="button"
        className="collapsible-section__toggle"
        onClick={toggle}
        aria-expanded={isOpen}
      >
        <ChevronRight
          className={`collapsible-section__chevron ${isOpen ? 'collapsible-section__chevron--open' : ''}`}
          size={14}
        />
        {icon && <span className="collapsible-section__icon">{icon}</span>}
        <span className="collapsible-section__label">{label}</span>
        {badge != null && badge > 0 && (
          <span className="collapsible-section__badge">{badge}</span>
        )}
      </button>
      <div
        className="collapsible-section__content-wrapper"
        style={{ height: isOpen ? contentHeight : 0 }}
      >
        <div ref={contentRef} className={`collapsible-section__content ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
