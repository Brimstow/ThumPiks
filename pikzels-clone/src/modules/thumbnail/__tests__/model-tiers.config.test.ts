import {
  resolveModelFromTier,
  resolveVisionModelFromTier,
  getCreditCostForTier,
  getDefaultTier,
  TOOL_TIER_CONFIG,
  TIERED_TOOL_IDS,
} from '../model-tiers.config';

describe('model-tiers.config', () => {
  // =========================================================================
  // resolveVisionModelFromTier
  // =========================================================================
  describe('resolveVisionModelFromTier', () => {
    it('returns Qwen 3.5 Flash for flash tier generate-text', () => {
      expect(resolveVisionModelFromTier('flash', 'generate-text')).toBe('qwen/qwen3.5-flash');
    });

    it('returns Gemini 2.5 Flash for standard tier generate-text', () => {
      expect(resolveVisionModelFromTier('standard', 'generate-text')).toBe('google/gemini-2.5-flash');
    });

    it('returns Grok 4.1 Fast for pro tier generate-text', () => {
      expect(resolveVisionModelFromTier('pro', 'generate-text')).toBe('x-ai/grok-4.1-fast');
    });

    it('returns default tier vision model when tier is undefined', () => {
      // Default tier for generate-text is flash
      const result = resolveVisionModelFromTier(undefined, 'generate-text');
      expect(result).toBe('qwen/qwen3.5-flash');
    });

    it('returns undefined for invalid tier', () => {
      expect(resolveVisionModelFromTier('ultra', 'generate-text')).toBeUndefined();
    });

    it('returns undefined for tools without vision models', () => {
      // The 'generate' tool does not have visionModelId set
      expect(resolveVisionModelFromTier('flash', 'generate')).toBeUndefined();
      expect(resolveVisionModelFromTier('standard', 'inpaint')).toBeUndefined();
      expect(resolveVisionModelFromTier('flash', 'face-swap')).toBeUndefined();
    });

    it('returns undefined for invalid tool', () => {
      expect(resolveVisionModelFromTier('flash', 'non-existent' as any)).toBeUndefined();
    });
  });

  // =========================================================================
  // resolveModelFromTier (existing — regression check)
  // =========================================================================
  describe('resolveModelFromTier', () => {
    it('returns GPT-4.1 Nano for flash tier generate-text', () => {
      expect(resolveModelFromTier('flash', 'generate-text')).toBe('openai/gpt-4.1-nano');
    });

    it('returns GPT-4.1 Mini for standard tier generate-text', () => {
      expect(resolveModelFromTier('standard', 'generate-text')).toBe('openai/gpt-4.1-mini');
    });

    it('returns GPT-4.1 for pro tier generate-text', () => {
      expect(resolveModelFromTier('pro', 'generate-text')).toBe('openai/gpt-4.1');
    });

    it('returns undefined when tier is undefined', () => {
      expect(resolveModelFromTier(undefined, 'generate-text')).toBeUndefined();
    });

    it('returns undefined for invalid tier', () => {
      expect(resolveModelFromTier('ultra', 'generate-text')).toBeUndefined();
    });
  });

  // =========================================================================
  // Vision tier config structure
  // =========================================================================
  describe('generate-text tier config', () => {
    const config = TOOL_TIER_CONFIG['generate-text'];

    it('has all three tiers', () => {
      expect(config.tiers).toHaveLength(3);
      expect(config.tiers.map(t => t.id)).toEqual(['flash', 'standard', 'pro']);
    });

    it('defaults to flash tier', () => {
      expect(config.defaultTierId).toBe('flash');
    });

    it('all tiers have visionModelId set', () => {
      for (const tier of config.tiers) {
        expect(tier.visionModelId).toBeDefined();
        expect(typeof tier.visionModelId).toBe('string');
        expect(tier.visionModelId!.length).toBeGreaterThan(0);
      }
    });

    it('all tiers have visionModelLabel set', () => {
      for (const tier of config.tiers) {
        expect(tier.visionModelLabel).toBeDefined();
        expect(typeof tier.visionModelLabel).toBe('string');
      }
    });

    it('all tiers have supportsVision capability', () => {
      for (const tier of config.tiers) {
        expect(tier.capabilities).toBeDefined();
        expect(tier.capabilities!.supportsVision).toBe(true);
      }
    });

    it('text-only modelId is distinct from visionModelId for every tier', () => {
      for (const tier of config.tiers) {
        expect(tier.modelId).not.toBe(tier.visionModelId);
      }
    });

    it('preserves credit costs (1/2/3)', () => {
      expect(config.tiers[0]!.credits).toBe(1); // flash
      expect(config.tiers[1]!.credits).toBe(2); // standard
      expect(config.tiers[2]!.credits).toBe(3); // pro
    });
  });

  // =========================================================================
  // getCreditCostForTier (regression)
  // =========================================================================
  describe('getCreditCostForTier', () => {
    it('returns correct costs for generate-text tiers', () => {
      expect(getCreditCostForTier('flash', 'generate-text')).toBe(1);
      expect(getCreditCostForTier('standard', 'generate-text')).toBe(2);
      expect(getCreditCostForTier('pro', 'generate-text')).toBe(3);
    });

    it('returns default tier cost when tier is undefined', () => {
      // Default is flash (1 credit)
      expect(getCreditCostForTier(undefined, 'generate-text')).toBe(1);
    });
  });

  // =========================================================================
  // getDefaultTier (regression)
  // =========================================================================
  describe('getDefaultTier', () => {
    it('returns flash tier as default for generate-text', () => {
      const tier = getDefaultTier('generate-text');
      expect(tier).toBeDefined();
      expect(tier!.id).toBe('flash');
      expect(tier!.modelId).toBe('openai/gpt-4.1-nano');
      expect(tier!.visionModelId).toBe('qwen/qwen3.5-flash');
    });
  });

  // =========================================================================
  // Non-generate-text tools should NOT have vision models (regression)
  // =========================================================================
  describe('non-text tools have no vision models', () => {
    const nonTextTools = ['generate', 'inpaint', 'face-swap', 'upscale'] as const;

    for (const toolId of nonTextTools) {
      it(`${toolId} tiers have no visionModelId`, () => {
        const config = TOOL_TIER_CONFIG[toolId];
        for (const tier of config.tiers) {
          expect(tier.visionModelId).toBeUndefined();
        }
      });
    }
  });

  // =========================================================================
  // TIERED_TOOL_IDS (regression)
  // =========================================================================
  describe('TIERED_TOOL_IDS', () => {
    it('contains all expected tools including generate-text', () => {
      expect(TIERED_TOOL_IDS).toContain('generate');
      expect(TIERED_TOOL_IDS).toContain('generate-text');
      expect(TIERED_TOOL_IDS).toContain('inpaint');
      expect(TIERED_TOOL_IDS).toContain('face-swap');
      expect(TIERED_TOOL_IDS).toContain('upscale');
    });
  });
});
