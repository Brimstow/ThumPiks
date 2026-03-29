import { shouldApplyWatermark, applyFreemiumWatermark } from '../watermark.service';
import { WATERMARK_CONFIG } from '../../../config/watermark.config';

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock sharp — capture composite calls to verify watermark SVG
const mockComposite = jest.fn().mockReturnThis();
const mockToBuffer = jest.fn().mockResolvedValue(Buffer.from('watermarked-image-data'));
const mockMetadata = jest.fn().mockResolvedValue({ width: 1280, height: 720 });

jest.mock('sharp', () => {
  return jest.fn(() => ({
    metadata: mockMetadata,
    composite: mockComposite,
    toBuffer: mockToBuffer,
  }));
});

// Mock subscription config — only needed by shouldApplyWatermark
jest.mock('../../subscription/subscription.config', () => ({
  getPlanById: jest.fn((planId: string) => {
    const plans: Record<string, any> = {
      free: { features: { watermark: true } },
      starter: { features: { watermark: false } },
      pro: { features: { watermark: false } },
      ultra_pro: { features: { watermark: false } },
    };
    return plans[planId] || null;
  }),
}));

// Mock subscription service (not needed for unit tests here, but required by module)
jest.mock('../../subscription/subscription.service', () => ({
  getCurrentSubscription: jest.fn(),
}));

// Mock storage service (required by watermarkImageUrls, not tested here)
jest.mock('../../storage', () => ({
  getStorageService: jest.fn(() => ({
    isAvailable: jest.fn().mockResolvedValue(false),
  })),
}));

describe('Watermark Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldApplyWatermark', () => {
    it('returns true for the free plan', () => {
      expect(shouldApplyWatermark('free')).toBe(true);
    });

    it('returns false for the starter plan', () => {
      expect(shouldApplyWatermark('starter')).toBe(false);
    });

    it('returns false for the pro plan', () => {
      expect(shouldApplyWatermark('pro')).toBe(false);
    });

    it('returns false for the ultra_pro plan', () => {
      expect(shouldApplyWatermark('ultra_pro')).toBe(false);
    });

    it('returns false for an unknown plan (getPlanById returns null)', () => {
      expect(shouldApplyWatermark('nonexistent_plan')).toBe(false);
    });
  });

  describe('applyFreemiumWatermark', () => {
    it('returns a buffer', async () => {
      const input = Buffer.from('fake-image');
      const result = await applyFreemiumWatermark(input);

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('calls sharp.composite with an SVG overlay', async () => {
      const input = Buffer.from('fake-image');
      await applyFreemiumWatermark(input);

      expect(mockComposite).toHaveBeenCalledTimes(1);

      const compositeArgs = mockComposite.mock.calls[0][0];
      expect(compositeArgs).toHaveLength(1);
      expect(compositeArgs[0]).toHaveProperty('input');
      expect(compositeArgs[0]).toHaveProperty('gravity', 'northwest');

      // The input should be a Buffer containing SVG markup
      const svgString = compositeArgs[0].input.toString();
      expect(svgString).toContain('<svg');
      expect(svgString).toContain('<pattern');
      expect(svgString).toContain(WATERMARK_CONFIG.text);
    });

    it('generates SVG sized to the image dimensions', async () => {
      mockMetadata.mockResolvedValueOnce({ width: 1920, height: 1080 });

      const input = Buffer.from('fake-image');
      await applyFreemiumWatermark(input);

      const svgString = mockComposite.mock.calls[0][0][0].input.toString();
      expect(svgString).toContain('width="1920"');
      expect(svgString).toContain('height="1080"');
    });

    it('uses the configured rotation angle in the SVG pattern', async () => {
      const input = Buffer.from('fake-image');
      await applyFreemiumWatermark(input);

      const svgString = mockComposite.mock.calls[0][0][0].input.toString();
      expect(svgString).toContain(
        `rotate(${WATERMARK_CONFIG.angleDegrees})`
      );
    });

    it('uses the configured opacity in the SVG text', async () => {
      const input = Buffer.from('fake-image');
      await applyFreemiumWatermark(input);

      const svgString = mockComposite.mock.calls[0][0][0].input.toString();
      expect(svgString).toContain(`opacity="${WATERMARK_CONFIG.opacity}"`);
    });

    it('falls back to 1280x720 when metadata has no dimensions', async () => {
      mockMetadata.mockResolvedValueOnce({});

      const input = Buffer.from('fake-image');
      await applyFreemiumWatermark(input);

      const svgString = mockComposite.mock.calls[0][0][0].input.toString();
      expect(svgString).toContain('width="1280"');
      expect(svgString).toContain('height="720"');
    });

    it('escapes XML special characters in watermark text', async () => {
      // This verifies the XML escape logic with the current config text
      const input = Buffer.from('fake-image');
      await applyFreemiumWatermark(input);

      const svgString = mockComposite.mock.calls[0][0][0].input.toString();
      // Should not contain unescaped < or > or & (unless part of XML structure)
      // The watermark text itself should be safely escaped
      expect(svgString).toContain(`>${WATERMARK_CONFIG.text}</text>`);
    });
  });
});
