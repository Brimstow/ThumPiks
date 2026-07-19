/**
 * Tests for JSON column validation with Zod schemas (Task 13).
 *
 * Verifies:
 * - Valid JSON writes succeed
 * - Invalid JSON writes throw ZodError (→ 400 in controllers)
 * - Legacy invalid JSON reads log a warning but don't crash
 * - Schemas accept passthrough (extra fields preserved)
 */

import { ZodError } from 'zod';
import { ThumbnailParametersSchema } from '../../thumbnail/types';
import { UserSettingsSchema } from '../../user/types';
import {
  TemplateParametersSchema,
  TemplateTagsSchema,
} from '../../templates/types';
import {
  validateJsonColumn,
  safeParseJsonColumn,
  isZodError,
} from '../../../utils/json-validation';

// Mock the logger so we can assert on warnings
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    security: jest.fn(),
  },
}));

// Import mock after jest.mock
import { logger } from '../../../utils/logger';
const mockLogger = logger as jest.Mocked<typeof logger>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// ThumbnailParametersSchema
// ---------------------------------------------------------------------------
describe('ThumbnailParametersSchema', () => {
  it('accepts valid AI generation parameters', () => {
    const data = { style: 'bold', variation: 1, aiGenerated: true };
    const result = ThumbnailParametersSchema.parse(data);
    expect(result.style).toBe('bold');
    expect(result.aiGenerated).toBe(true);
  });

  it('accepts valid canvas editor parameters', () => {
    const data = { width: 1280, height: 720, tool: 'brush' };
    const result = ThumbnailParametersSchema.parse(data);
    expect(result.width).toBe(1280);
    expect(result.tool).toBe('brush');
  });

  it('accepts empty object (minimal valid parameters)', () => {
    const result = ThumbnailParametersSchema.parse({});
    expect(result).toEqual({});
  });

  it('preserves extra fields via passthrough', () => {
    const data = { style: 'bold', customField: 'hello', nested: { a: 1 } };
    const result = ThumbnailParametersSchema.parse(data);
    expect((result as any).customField).toBe('hello');
    expect((result as any).nested).toEqual({ a: 1 });
  });

  it('rejects non-object types (string)', () => {
    expect(() => ThumbnailParametersSchema.parse('not-an-object')).toThrow(
      ZodError
    );
  });

  it('rejects non-object types (array)', () => {
    expect(() => ThumbnailParametersSchema.parse([1, 2, 3])).toThrow(ZodError);
  });

  it('rejects non-object types (number)', () => {
    expect(() => ThumbnailParametersSchema.parse(42)).toThrow(ZodError);
  });

  it('rejects null', () => {
    expect(() => ThumbnailParametersSchema.parse(null)).toThrow(ZodError);
  });

  it('rejects wrong field types (style must be string)', () => {
    expect(() => ThumbnailParametersSchema.parse({ style: 123 })).toThrow(
      ZodError
    );
  });

  it('rejects wrong field types (width must be number)', () => {
    expect(() => ThumbnailParametersSchema.parse({ width: 'big' })).toThrow(
      ZodError
    );
  });
});

// ---------------------------------------------------------------------------
// UserSettingsSchema
// ---------------------------------------------------------------------------
describe('UserSettingsSchema', () => {
  it('accepts valid user settings', () => {
    const data = {
      storageUsedGB: 5.2,
      storageTotalGB: 100,
      autoSave: true,
      autoImport: false,
    };
    const result = UserSettingsSchema.parse(data);
    expect(result.autoSave).toBe(true);
    expect(result.storageUsedGB).toBe(5.2);
  });

  it('accepts empty object', () => {
    const result = UserSettingsSchema.parse({});
    expect(result).toEqual({});
  });

  it('preserves extra fields via passthrough', () => {
    const data = { autoSave: true, legacySetting: 'old-value' };
    const result = UserSettingsSchema.parse(data);
    expect((result as any).legacySetting).toBe('old-value');
  });

  it('rejects negative storageUsedGB', () => {
    expect(() => UserSettingsSchema.parse({ storageUsedGB: -1 })).toThrow(
      ZodError
    );
  });

  it('rejects non-boolean autoSave', () => {
    expect(() => UserSettingsSchema.parse({ autoSave: 'yes' })).toThrow(
      ZodError
    );
  });

  it('rejects non-object types', () => {
    expect(() => UserSettingsSchema.parse('settings-string')).toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// TemplateParametersSchema
// ---------------------------------------------------------------------------
describe('TemplateParametersSchema', () => {
  it('accepts valid template parameters', () => {
    const data = { style: 'neon', layout: 'grid' };
    const result = TemplateParametersSchema.parse(data);
    expect(result.style).toBe('neon');
  });

  it('accepts empty object', () => {
    expect(TemplateParametersSchema.parse({})).toEqual({});
  });

  it('preserves extra fields', () => {
    const data = { customProp: [1, 2, 3] };
    const result = TemplateParametersSchema.parse(data);
    expect((result as any).customProp).toEqual([1, 2, 3]);
  });

  it('rejects non-object', () => {
    expect(() => TemplateParametersSchema.parse(null)).toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// TemplateTagsSchema
// ---------------------------------------------------------------------------
describe('TemplateTagsSchema', () => {
  it('accepts valid string array', () => {
    const result = TemplateTagsSchema.parse(['gaming', 'neon', 'purple']);
    expect(result).toEqual(['gaming', 'neon', 'purple']);
  });

  it('accepts empty array', () => {
    expect(TemplateTagsSchema.parse([])).toEqual([]);
  });

  it('rejects array with non-string elements', () => {
    expect(() => TemplateTagsSchema.parse([1, 2, 3])).toThrow(ZodError);
  });

  it('rejects array with empty string elements', () => {
    expect(() => TemplateTagsSchema.parse(['valid', ''])).toThrow(ZodError);
  });

  it('rejects non-array', () => {
    expect(() => TemplateTagsSchema.parse('not-an-array')).toThrow(ZodError);
  });

  it('rejects object', () => {
    expect(() => TemplateTagsSchema.parse({ tags: ['a'] })).toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// validateJsonColumn (write path)
// ---------------------------------------------------------------------------
describe('validateJsonColumn', () => {
  it('returns parsed data on valid input', () => {
    const result = validateJsonColumn(
      ThumbnailParametersSchema,
      { style: 'bold' },
      'Thumbnail.parameters'
    );
    expect(result.style).toBe('bold');
  });

  it('throws ZodError on invalid input', () => {
    expect(() =>
      validateJsonColumn(
        ThumbnailParametersSchema,
        'invalid',
        'Thumbnail.parameters'
      )
    ).toThrow(ZodError);
  });

  it('logs a warning when validation fails', () => {
    try {
      validateJsonColumn(
        ThumbnailParametersSchema,
        null,
        'Thumbnail.parameters'
      );
    } catch {
      // expected
    }
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'JSON validation failed for Thumbnail.parameters',
      expect.objectContaining({ columnName: 'Thumbnail.parameters' })
    );
  });
});

// ---------------------------------------------------------------------------
// safeParseJsonColumn (read path)
// ---------------------------------------------------------------------------
describe('safeParseJsonColumn', () => {
  it('returns parsed data on valid input', () => {
    const data = { autoSave: true, storageUsedGB: 5 };
    const result = safeParseJsonColumn(
      UserSettingsSchema,
      data,
      'User.settings'
    );
    expect(result.autoSave).toBe(true);
  });

  it('returns raw data and logs warning on invalid input', () => {
    const invalidData = 'not-an-object';
    const result = safeParseJsonColumn(
      UserSettingsSchema,
      invalidData,
      'User.settings'
    );

    // Returns raw data so app doesn't crash
    expect(result).toBe('not-an-object');

    // Logs a warning
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Legacy data validation warning for User.settings',
      expect.objectContaining({ columnName: 'User.settings' })
    );
  });

  it('returns raw data for legacy data with wrong field types', () => {
    const legacyData = { autoSave: 'yes-please' }; // should be boolean
    const result = safeParseJsonColumn(
      UserSettingsSchema,
      legacyData,
      'User.settings'
    );

    // Returns raw data
    expect((result as any).autoSave).toBe('yes-please');

    // Logs a warning
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('does not log when data is valid', () => {
    safeParseJsonColumn(
      UserSettingsSchema,
      { autoSave: true },
      'User.settings'
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// isZodError
// ---------------------------------------------------------------------------
describe('isZodError', () => {
  it('returns true for ZodError instances', () => {
    try {
      ThumbnailParametersSchema.parse(null);
    } catch (err) {
      expect(isZodError(err)).toBe(true);
    }
  });

  it('returns false for regular Error', () => {
    expect(isZodError(new Error('plain error'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isZodError('string')).toBe(false);
    expect(isZodError(null)).toBe(false);
    expect(isZodError(undefined)).toBe(false);
  });
});
