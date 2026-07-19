import { z } from 'zod';

/**
 * Zod schema for Template.parameters JSON column.
 *
 * Template parameters store AI generation settings and layout config.
 * Uses .passthrough() to allow variant-specific fields.
 */
export const TemplateParametersSchema = z
  .object({
    style: z.string().optional(),
    layout: z.string().optional(),
  })
  .passthrough();

export type TemplateParameters = z.infer<typeof TemplateParametersSchema>;

/**
 * Zod schema for Template.tags.
 *
 * Tags are stored as a JSON-stringified array of strings in the database.
 * This schema validates the pre-stringify array shape.
 */
export const TemplateTagsSchema = z.array(z.string().min(1).max(100));

export type TemplateTags = z.infer<typeof TemplateTagsSchema>;
