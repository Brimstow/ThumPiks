/**
 * ModelTierSelector Component
 *
 * The "Intel Inside" pattern: branded quality tiers with transparent
 * model attribution. Users see ThumPiks Flash / Standard / Pro as the
 * primary choice, with the actual AI model name shown underneath for
 * transparency and trust.
 *
 * Layout per tier card:
 * ┌──────────────────────────────┐
 * │  ⚡ ThumPiks Flash    [1 cr] │
 * │  Fast iterations, good quality│
 * │  ─────────────────────────── │
 * │  Powered by FLUX.2 Klein     │
 * │  ~3s                         │
 * └──────────────────────────────┘
 *
 * Placement: Renders inside the left controls panel of AIToolsPage,
 * below the tool-specific options and above the Process button.
 */

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Info, Cpu } from 'lucide-react';
import type { ModelTier, ModelTierId, ToolTierConfig } from '../types';

/**
 * Props for the ModelTierSelector component.
 *
 * `tierConfig` is now passed in from the parent (via useModelTiers hook)
 * instead of being imported from a hardcoded local file.
 * This follows the LibreChat pattern: backend owns the data, frontend renders it.
 */
export interface ModelTierSelectorProps {
  /** Which tool is currently active */
  toolId: string;

  /** Tier config fetched from the backend (null while loading) */
  tierConfig: ToolTierConfig | null;

  /** Currently selected tier */
  selectedTierId: ModelTierId;

  /** Callback when the user selects a different tier */
  onTierChange: (tierId: ModelTierId) => void;

  /** Whether generation is currently in progress (disables interaction) */
  disabled?: boolean;

  /** Optional className for layout overrides */
  className?: string;
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Badge pill shown on recommended / best-quality tiers.
 */
const TierBadge: React.FC<{ text: string; tierId: ModelTierId }> = ({
  text,
  tierId,
}) => {
  const colorMap: Record<ModelTierId, string> = {
    flash: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    standard: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    pro: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border leading-none ${colorMap[tierId]}`}
    >
      {text}
    </span>
  );
};

/**
 * "Powered by" model attribution line — the "Intel Inside" sticker.
 */
const ModelAttribution: React.FC<{
  modelLabel: string;
  estimatedTime: string;
  isSelected: boolean;
}> = ({ modelLabel, estimatedTime, isSelected }) => (
  <div
    className={`flex items-center justify-between mt-2 pt-2 border-t transition-colors ${
      isSelected ? 'border-slate-600' : 'border-slate-700/50'
    }`}
  >
    <div className="flex items-center gap-1.5">
      <Cpu className="w-3 h-3 text-slate-500 flex-shrink-0" />
      <span className="text-[11px] text-slate-500">
        Powered by{' '}
        <span
          className={
            isSelected ? 'text-slate-300 font-medium' : 'text-slate-400'
          }
        >
          {modelLabel}
        </span>
      </span>
    </div>
    <span className="text-[11px] text-slate-500">{estimatedTime}</span>
  </div>
);

/**
 * Individual tier card — the selectable option.
 */
const TierCard: React.FC<{
  tier: ModelTier;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
  accentColor: string;
}> = ({ tier, isSelected, onSelect, disabled, accentColor }) => {
  // Determine ring / border color per tier
  const ringColorMap: Record<ModelTierId, string> = {
    flash: 'border-amber-500 ring-amber-500/20',
    standard: 'border-blue-500 ring-blue-500/20',
    pro: 'border-purple-500 ring-purple-500/20',
  };

  const iconBgMap: Record<ModelTierId, string> = {
    flash: 'bg-amber-500/10',
    standard: 'bg-blue-500/10',
    pro: 'bg-purple-500/10',
  };

  const selectedClasses = isSelected
    ? `${ringColorMap[tier.id]} ring-2`
    : 'border-slate-700 hover:border-slate-600';

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        relative w-full text-left p-3 rounded-xl border transition-all duration-200
        ${selectedClasses}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isSelected ? 'bg-slate-800/80' : 'bg-slate-800/40 hover:bg-slate-800/60'}
      `}
      aria-pressed={isSelected}
      aria-label={`Select ${tier.label} tier — ${tier.tagline}`}
    >
      {/* Top row: icon + name + credits */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Tier icon */}
          <span
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm ${iconBgMap[tier.id]}`}
          >
            {tier.icon}
          </span>

          {/* Tier name */}
          <span
            className={`text-sm font-semibold truncate ${
              isSelected ? 'text-white' : 'text-slate-300'
            }`}
          >
            {tier.label}
          </span>
        </div>

        {/* Credit cost */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {tier.badge && <TierBadge text={tier.badge} tierId={tier.id} />}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-md ${
              isSelected
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {tier.credits} cr
          </span>
        </div>
      </div>

      {/* Tagline */}
      <p
        className={`text-xs mt-1.5 ml-9 ${
          isSelected ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        {tier.tagline}
      </p>

      {/* "Powered by" attribution — the Intel Inside sticker */}
      <div className="ml-9">
        <ModelAttribution
          modelLabel={tier.modelLabel}
          estimatedTime={tier.estimatedTime}
          isSelected={isSelected}
        />
      </div>

      {/* Selected indicator dot */}
      {isSelected && (
        <div
          className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
            tier.id === 'flash'
              ? 'bg-amber-400'
              : tier.id === 'standard'
                ? 'bg-blue-400'
                : 'bg-purple-400'
          }`}
          aria-hidden="true"
        />
      )}
    </button>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const ModelTierSelector: React.FC<ModelTierSelectorProps> = ({
  toolId,
  tierConfig,
  selectedTierId,
  onTierChange,
  disabled = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // No config → either non-tiered tool, or still loading from backend
  if (!tierConfig) return null;

  const { tiers } = tierConfig;

  // Guard against empty tiers array
  if (!tiers || tiers.length === 0) return null;

  const selectedTier = tiers.find(t => t.id === selectedTierId) ?? tiers[0];

  const handleTierSelect = useCallback(
    (tierId: ModelTierId) => {
      if (!disabled && tierId !== selectedTierId) {
        onTierChange(tierId);
      }
    },
    [disabled, selectedTierId, onTierChange]
  );

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className={`${className}`}>
      {/* Section header with collapse toggle */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex items-center justify-between w-full group mb-3"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-300 cursor-pointer">
            Quality Tier
          </label>
          <div className="relative group/tooltip">
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-400 transition-colors cursor-help" />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-xs text-slate-300 w-64 opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:pointer-events-auto transition-opacity duration-200 z-50 shadow-xl">
              <p className="font-medium text-white mb-1">How tiers work</p>
              <p>
                Each tier uses a different AI model optimized for a specific
                quality–speed–cost tradeoff. Higher tiers produce better results
                but use more credits and take longer.
              </p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-700" />
            </div>
          </div>
        </div>

        {/* Collapse / expand chevron */}
        <div className="flex items-center gap-2">
          {/* Current selection summary (shown when collapsed) */}
          {!isExpanded && (
            <span className="text-xs text-slate-400">
              {selectedTier.icon} {selectedTier.label}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
          )}
        </div>
      </button>

      {/* Tier cards — collapsible */}
      {isExpanded && (
        <div
          className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
          role="radiogroup"
          aria-label="Select quality tier"
        >
          {tiers.map(tier => (
            <TierCard
              key={tier.id}
              tier={tier}
              isSelected={tier.id === selectedTierId}
              onSelect={() => handleTierSelect(tier.id)}
              disabled={disabled}
              accentColor=""
            />
          ))}

          {/* Cost comparison hint */}
          <p className="text-[11px] text-slate-600 text-center pt-1">
            Credits deducted per generation · Higher tiers = better quality
          </p>
        </div>
      )}
    </div>
  );
};

export default ModelTierSelector;
