/**
 * AI Brand Generator Service
 *
 * Generates brand identity suggestions using OpenRouter API based on user questionnaire responses.
 * Production-ready - uses the same AI infrastructure as the rest of the app.
 */

import fetch from 'node-fetch';
import { logger } from '../../utils/logger';

// ── Types ─────────────────────────────────────────────────────────────

export interface BrandGeneratorInput {
  brandName: string;
  tagline?: string;
  industry: string;
  stylePreferences: string[];
  colorPreferences: string[];
  brandPersonality: string[];
  targetAudience?: string;
}

export interface GeneratedColor {
  hex: string;
  name: string;
  usage: 'primary' | 'secondary' | 'accent' | 'background' | 'text';
  emotion?: string;
}

export interface GeneratedFont {
  name: string;
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
  usage: 'heading' | 'body' | 'accent';
  googleFontsUrl?: string;
}

export interface GeneratedBrandSuggestion {
  id: string;
  name: string;
  description: string;
  colors: GeneratedColor[];
  fonts: GeneratedFont[];
  moodKeywords: string[];
  voiceTone: string;
  visualStyle: string;
}

export interface BrandGeneratorResult {
  success: boolean;
  suggestions: GeneratedBrandSuggestion[];
  input: BrandGeneratorInput;
  generatedAt: string;
  error?: string;
}

// ── Configuration ─────────────────────────────────────────────────────

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_API_URL =
  process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL_CHAT || 'google/gemini-2.5-flash';

// Color palette mappings for generation guidance
const colorPaletteMap: Record<string, { primary: string; shades: string[] }> = {
  blue: {
    primary: '#2563EB',
    shades: ['#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD'],
  },
  purple: {
    primary: '#7C3AED',
    shades: ['#6D28D9', '#8B5CF6', '#A78BFA', '#C4B5FD'],
  },
  green: {
    primary: '#059669',
    shades: ['#047857', '#10B981', '#34D399', '#6EE7B7'],
  },
  orange: {
    primary: '#EA580C',
    shades: ['#C2410C', '#F97316', '#FB923C', '#FDBA74'],
  },
  red: {
    primary: '#DC2626',
    shades: ['#B91C1C', '#EF4444', '#F87171', '#FCA5A5'],
  },
  teal: {
    primary: '#0D9488',
    shades: ['#0F766E', '#14B8A6', '#2DD4BF', '#5EEAD4'],
  },
  pink: {
    primary: '#DB2777',
    shades: ['#BE185D', '#EC4899', '#F472B6', '#F9A8D4'],
  },
  neutral: {
    primary: '#1F2937',
    shades: ['#111827', '#4B5563', '#9CA3AF', '#D1D5DB'],
  },
};

// Font recommendations by style
const fontsByStyle: Record<
  string,
  Array<{ name: string; category: GeneratedFont['category'] }>
> = {
  minimal: [
    { name: 'Inter', category: 'sans-serif' },
    { name: 'Source Sans 3', category: 'sans-serif' },
  ],
  bold: [
    { name: 'Bebas Neue', category: 'display' },
    { name: 'Oswald', category: 'sans-serif' },
  ],
  elegant: [
    { name: 'Playfair Display', category: 'serif' },
    { name: 'Cormorant Garamond', category: 'serif' },
  ],
  playful: [
    { name: 'Quicksand', category: 'sans-serif' },
    { name: 'Poppins', category: 'sans-serif' },
  ],
  professional: [
    { name: 'Roboto', category: 'sans-serif' },
    { name: 'Open Sans', category: 'sans-serif' },
  ],
  modern: [
    { name: 'Montserrat', category: 'sans-serif' },
    { name: 'Raleway', category: 'sans-serif' },
  ],
  vintage: [
    { name: 'Libre Baskerville', category: 'serif' },
    { name: 'Merriweather', category: 'serif' },
  ],
  organic: [
    { name: 'Lora', category: 'serif' },
    { name: 'Nunito', category: 'sans-serif' },
  ],
};

// ── Prompt Engineering ────────────────────────────────────────────────

function buildBrandGenerationPrompt(input: BrandGeneratorInput): string {
  const industryLabels: Record<string, string> = {
    technology: 'Technology & Software',
    creative: 'Creative & Design',
    healthcare: 'Healthcare & Wellness',
    finance: 'Finance & Business',
    education: 'Education & Learning',
    retail: 'Retail & E-commerce',
    services: 'Professional Services',
    startup: 'Startup & Innovation',
    sustainability: 'Sustainability & Green',
    luxury: 'Luxury & Premium',
    entertainment: 'Entertainment & Media',
    other: 'General Business',
  };

  const styleLabels: Record<string, string> = {
    minimal: 'Minimal & Clean',
    bold: 'Bold & Dynamic',
    elegant: 'Elegant & Refined',
    playful: 'Playful & Fun',
    professional: 'Professional & Corporate',
    modern: 'Modern & Trendy',
    vintage: 'Vintage & Classic',
    organic: 'Organic & Natural',
  };

  const personalityLabels: Record<string, string> = {
    innovative: 'Innovative',
    trustworthy: 'Trustworthy',
    friendly: 'Friendly',
    professional: 'Professional',
    creative: 'Creative',
    bold: 'Bold',
    luxurious: 'Luxurious',
    sustainable: 'Sustainable',
    youthful: 'Youthful',
    authoritative: 'Authoritative',
  };

  return `You are a professional brand identity designer. Generate 3 distinct brand identity suggestions for the following brand.

BRAND INFORMATION:
- Brand Name: ${input.brandName}
${input.tagline ? `- Tagline: ${input.tagline}` : ''}
- Industry: ${industryLabels[input.industry] || input.industry}
- Desired Styles: ${input.stylePreferences.map(s => styleLabels[s] || s).join(', ')}
- Color Preferences: ${input.colorPreferences.join(', ')}
- Brand Personality: ${input.brandPersonality.map(p => personalityLabels[p] || p).join(', ')}
${input.targetAudience ? `- Target Audience: ${input.targetAudience}` : ''}

For each suggestion, provide:
1. A creative name for the brand direction (e.g., "Bold Innovator", "Refined Elegance")
2. A brief description (1-2 sentences) explaining the overall direction
3. 5 mood keywords that capture the essence
4. A recommended voice/tone for copywriting (1 sentence)
5. A visual style summary (1 sentence)

Format your response EXACTLY as JSON with this structure:
{
  "suggestions": [
    {
      "name": "Direction Name",
      "description": "Brief description",
      "moodKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "voiceTone": "Voice and tone description",
      "visualStyle": "Visual style description"
    }
  ]
}

Provide exactly 3 suggestions. Each should be distinctly different while still honoring the brand's preferences.
Only output valid JSON, no other text.`;
}

// ── AI Communication ──────────────────────────────────────────────────

async function callOpenRouter(prompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.CLIENT_URL || 'https://thumpiks.com',
      'X-Title': 'ThumPiks Brand Generator',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '';
}

function parseAIResponse(
  response: string
): Array<{
  name: string;
  description: string;
  moodKeywords: string[];
  voiceTone: string;
  visualStyle: string;
}> {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error('Invalid response structure');
    }
    return parsed.suggestions;
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}

// ── Color Generation ──────────────────────────────────────────────────

function generateColors(
  colorPreferences: string[],
  stylePreferences: string[],
  index: number
): GeneratedColor[] {
  const colors: GeneratedColor[] = [];
  const primaryPalette =
    colorPreferences[index % colorPreferences.length] ||
    colorPreferences[0] ||
    'blue';
  const secondaryPalette =
    colorPreferences[(index + 1) % colorPreferences.length] || primaryPalette;

  const primary = colorPaletteMap[primaryPalette] ?? colorPaletteMap.blue!;
  const secondary =
    colorPaletteMap[secondaryPalette] ?? colorPaletteMap.purple!;

  // Determine background/text based on style
  const isDark =
    stylePreferences.includes('bold') || stylePreferences.includes('modern');

  // Primary color
  colors.push({
    hex: primary.primary,
    name: `${primaryPalette.charAt(0).toUpperCase() + primaryPalette.slice(1)} Primary`,
    usage: 'primary',
    emotion: 'Main brand identity',
  });

  // Secondary color
  colors.push({
    hex: secondary.shades[1] ?? secondary.primary,
    name: `${secondaryPalette.charAt(0).toUpperCase() + secondaryPalette.slice(1)} Secondary`,
    usage: 'secondary',
    emotion: 'Supporting elements',
  });

  // Accent
  colors.push({
    hex: primary.shades[2] ?? primary.primary,
    name: 'Accent Highlight',
    usage: 'accent',
    emotion: 'Calls to action, highlights',
  });

  // Background
  colors.push({
    hex: isDark ? '#0F172A' : '#FFFFFF',
    name: isDark ? 'Dark Background' : 'Light Background',
    usage: 'background',
    emotion: 'Main surface color',
  });

  // Text
  colors.push({
    hex: isDark ? '#F8FAFC' : '#1E293B',
    name: isDark ? 'Light Text' : 'Dark Text',
    usage: 'text',
    emotion: 'Primary text color',
  });

  return colors;
}

// ── Font Generation ───────────────────────────────────────────────────

function generateFonts(
  stylePreferences: string[],
  index: number
): GeneratedFont[] {
  const fonts: GeneratedFont[] = [];
  const primaryStyle =
    stylePreferences[index % stylePreferences.length] ||
    stylePreferences[0] ||
    'modern';
  const secondaryStyle =
    stylePreferences[(index + 1) % stylePreferences.length] || primaryStyle;

  const primaryFonts = fontsByStyle[primaryStyle] ?? fontsByStyle.modern!;
  const secondaryFonts = fontsByStyle[secondaryStyle] ?? fontsByStyle.modern!;

  // Heading font
  const headingFont = primaryFonts[0];
  if (headingFont) {
    fonts.push({
      name: headingFont.name,
      category: headingFont.category,
      usage: 'heading',
      googleFontsUrl: `https://fonts.google.com/specimen/${encodeURIComponent(headingFont.name)}`,
    });
  }

  // Body font - prefer sans-serif for readability
  const bodyFont =
    secondaryFonts.find(f => f.category === 'sans-serif') ??
    secondaryFonts[1] ??
    primaryFonts[1];
  if (bodyFont) {
    fonts.push({
      name: bodyFont.name,
      category: bodyFont.category,
      usage: 'body',
      googleFontsUrl: `https://fonts.google.com/specimen/${encodeURIComponent(bodyFont.name)}`,
    });
  }

  return fonts;
}

// ── Main Service Function ─────────────────────────────────────────────

export async function generateBrandSuggestions(
  input: BrandGeneratorInput
): Promise<BrandGeneratorResult> {
  logger.info('[AI Brand Generator] Starting generation', { brandName: input.brandName });

  try {
    // Build and send prompt to OpenRouter
    const prompt = buildBrandGenerationPrompt(input);
    logger.info('[AI Brand Generator] Calling OpenRouter...');

    const aiResponse = await callOpenRouter(prompt);
    logger.info('[AI Brand Generator] Received response from OpenRouter');

    // Parse AI suggestions
    const aiSuggestions = parseAIResponse(aiResponse);
    logger.info('[AI Brand Generator] Parsed suggestions', { count: aiSuggestions.length });

    // Build full suggestions with colors and fonts
    const suggestions: GeneratedBrandSuggestion[] = aiSuggestions.map(
      (suggestion, index) => ({
        id: `brand-suggestion-${Date.now()}-${index}`,
        name: suggestion.name || `Brand Direction ${index + 1}`,
        description: suggestion.description || '',
        colors: generateColors(
          input.colorPreferences,
          input.stylePreferences,
          index
        ),
        fonts: generateFonts(input.stylePreferences, index),
        moodKeywords: suggestion.moodKeywords || [],
        voiceTone: suggestion.voiceTone || '',
        visualStyle: suggestion.visualStyle || '',
      })
    );

    return {
      success: true,
      suggestions,
      input,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('[AI Brand Generator] Error', error instanceof Error ? error : new Error(String(error)));

    // Fallback: generate suggestions without AI
    logger.info('[AI Brand Generator] Using fallback generation');
    return generateFallbackSuggestions(input);
  }
}

// ── Fallback Generation ───────────────────────────────────────────────

function generateFallbackSuggestions(
  input: BrandGeneratorInput
): BrandGeneratorResult {
  const suggestions: GeneratedBrandSuggestion[] = [
    {
      id: `brand-suggestion-${Date.now()}-0`,
      name: 'Classic Foundation',
      description: `A timeless brand identity for ${input.brandName} that balances professionalism with approachability.`,
      colors: generateColors(input.colorPreferences, input.stylePreferences, 0),
      fonts: generateFonts(input.stylePreferences, 0),
      moodKeywords: [
        'professional',
        'trustworthy',
        'established',
        'reliable',
        'confident',
      ],
      voiceTone:
        'Clear, confident, and approachable with a focus on building trust.',
      visualStyle:
        'Clean layouts with balanced typography and strategic use of brand colors.',
    },
    {
      id: `brand-suggestion-${Date.now()}-1`,
      name: 'Bold Expression',
      description: `A dynamic, attention-grabbing identity that positions ${input.brandName} as an industry leader.`,
      colors: generateColors(input.colorPreferences, input.stylePreferences, 1),
      fonts: generateFonts(input.stylePreferences, 1),
      moodKeywords: [
        'bold',
        'dynamic',
        'innovative',
        'energetic',
        'forward-thinking',
      ],
      voiceTone: 'Bold and direct with an emphasis on action and results.',
      visualStyle:
        'High contrast elements with impactful typography and strong visual hierarchy.',
    },
    {
      id: `brand-suggestion-${Date.now()}-2`,
      name: 'Modern Simplicity',
      description: `A refined, contemporary identity that communicates ${input.brandName}'s values through elegant simplicity.`,
      colors: generateColors(input.colorPreferences, input.stylePreferences, 2),
      fonts: generateFonts(input.stylePreferences, 2),
      moodKeywords: [
        'modern',
        'minimal',
        'elegant',
        'sophisticated',
        'thoughtful',
      ],
      voiceTone: 'Refined and concise, letting quality speak for itself.',
      visualStyle:
        'Generous whitespace, subtle details, and restrained color usage.',
    },
  ];

  return {
    success: true,
    suggestions,
    input,
    generatedAt: new Date().toISOString(),
    error: 'Generated using fallback (AI service unavailable)',
  };
}

export default {
  generateBrandSuggestions,
};
