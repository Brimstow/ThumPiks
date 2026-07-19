import { z } from 'zod';

/**
 * Zod schema for User.settings JSON column.
 *
 * Stores user preference settings including storage info, auto-save,
 * theme, timezone, etc. Uses .passthrough() to preserve any extra
 * fields from older versions of the settings object.
 */
export const UserSettingsSchema = z
  .object({
    storageUsedGB: z.number().min(0).optional(),
    storageTotalGB: z.number().min(0).optional(),
    autoSave: z.boolean().optional(),
    autoImport: z.boolean().optional(),
    theme: z.string().optional(),
    timezone: z.string().optional(),
  })
  .passthrough();

export type UserSettings = z.infer<typeof UserSettingsSchema>;
