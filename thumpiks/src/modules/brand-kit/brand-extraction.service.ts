/**
 * Brand Extraction Service
 *
 * Extracts brand identity assets (colors, fonts, logos) from a website URL.
 * Uses Brand.dev API for production, with HTTP fallback for basic extraction.
 *
 * SETUP REQUIRED:
 * - Set BRAND_DEV_API_KEY environment variable
 * - See docs/BRAND_EXTRACTION_SETUP.md for details
 */

import fetch from 'node-fetch';
import { logger } from '../../utils/logger';

// ── Types ─────────────────────────────────────────────────────────────

export interface ExtractedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  name?: string;
  usage: 'background' | 'text' | 'accent' | 'border' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  frequency: number;
}

export interface ExtractedFont {
  family: string;
  weights: string[];
  usage: 'heading' | 'body' | 'accent' | 'unknown';
  source?: string; // Google Fonts, Adobe, etc.
}

export interface ExtractedLogo {
  url: string;
  type: 'favicon' | 'og-image' | 'header-logo' | 'svg-logo';
  width?: number;
  height?: number;
}

export interface BrandExtractionResult {
  url: string;
  timestamp: string;
  colors: ExtractedColor[];
  fonts: ExtractedFont[];
  logos: ExtractedLogo[];
  metadata: {
    title?: string;
    description?: string;
    siteName?: string;
  };
  screenshot?: string; // Base64 encoded thumbnail
}

// ── Configuration ─────────────────────────────────────────────────────

const BRAND_DEV_API_KEY = process.env.BRAND_DEV_API_KEY || '';
const BRAND_DEV_API_URL = 'https://api.brand.dev/v1';

// ── Color Utilities ─────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  if (!result?.[1] || !result[2] || !result[3]) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// ── Brand.dev API Types ─────────────────────────────────────────────

interface BrandDevStyleguideResponse {
  status: string;
  domain: string;
  styleguide: {
    mode: 'light' | 'dark';
    colors: {
      accent?: string;
      background?: string;
      text?: string;
      primary?: string;
      secondary?: string;
    };
    typography: {
      headings?: {
        h1?: { fontFamily: string; fontSize: string; fontWeight: number };
        h2?: { fontFamily: string; fontSize: string; fontWeight: number };
      };
      p?: { fontFamily: string; fontSize: string; fontWeight: number };
    };
  };
}

interface BrandDevRetrieveResponse {
  status: string;
  domain: string;
  name?: string;
  description?: string;
  logos?: {
    logo_url?: string;
    icon_url?: string;
    favicon_url?: string;
  };
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  links?: {
    website?: string;
  };
}

interface BrandDevScreenshotResponse {
  status: string;
  screenshot_url?: string;
}

// ── Main Extraction Service ─────────────────────────────────────────

/**
 * Extract brand assets from a website URL using Brand.dev API
 * Falls back to basic HTTP extraction if API is not configured
 */
export async function extractBrandFromUrl(
  url: string
): Promise<BrandExtractionResult> {
  logger.info('[Brand Extraction] Starting extraction', { url });

  // Parse domain from URL
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace('www.', '');

  // Try Brand.dev API if configured
  if (BRAND_DEV_API_KEY) {
    try {
      return await extractWithBrandDevAPI(domain, url);
    } catch (error) {
      logger.error('[Brand Extraction] Brand.dev API failed, using fallback', error instanceof Error ? error : new Error(String(error)));
    }
  } else {
    logger.info('[Brand Extraction] No BRAND_DEV_API_KEY configured, using fallback');
  }

  // Fallback to basic HTTP extraction
  return await extractWithHttpFallback(url, domain);
}

/**
 * Extract brand data using Brand.dev API (production method)
 */
async function extractWithBrandDevAPI(
  domain: string,
  originalUrl: string
): Promise<BrandExtractionResult> {
  logger.info('[Brand Extraction] Using Brand.dev API for domain', { domain });

  // Call Brand.dev retrieve endpoint for logos and basic info
  const [retrieveData, styleguideData, screenshotData] = await Promise.all([
    callBrandDevAPI<BrandDevRetrieveResponse>(
      `/brand/retrieve?domain=${encodeURIComponent(domain)}`
    ),
    callBrandDevAPI<BrandDevStyleguideResponse>(
      `/brand/styleguide?domain=${encodeURIComponent(domain)}&prioritize=speed`
    ).catch(() => null),
    callBrandDevAPI<BrandDevScreenshotResponse>(
      `/brand/screenshot?domain=${encodeURIComponent(domain)}&width=1200&height=630`
    ).catch(() => null),
  ]);

  // Transform Brand.dev response to our format
  const colors: ExtractedColor[] = [];
  const fonts: ExtractedFont[] = [];
  const logos: ExtractedLogo[] = [];

  // Extract colors from both retrieve and styleguide endpoints
  const allColors = {
    ...retrieveData.colors,
    ...styleguideData?.styleguide?.colors,
  };

  if (allColors.primary) {
    const rgb = hexToRgb(allColors.primary);
    colors.push({
      hex: allColors.primary.toUpperCase(),
      rgb: rgb || { r: 0, g: 0, b: 0 },
      name: 'Primary',
      usage: 'accent',
      confidence: 'high',
      frequency: 10,
    });
  }

  if (allColors.secondary) {
    const rgb = hexToRgb(allColors.secondary);
    colors.push({
      hex: allColors.secondary.toUpperCase(),
      rgb: rgb || { r: 0, g: 0, b: 0 },
      name: 'Secondary',
      usage: 'accent',
      confidence: 'high',
      frequency: 8,
    });
  }

  if (allColors.accent) {
    const rgb = hexToRgb(allColors.accent);
    colors.push({
      hex: allColors.accent.toUpperCase(),
      rgb: rgb || { r: 0, g: 0, b: 0 },
      name: 'Accent',
      usage: 'accent',
      confidence: 'high',
      frequency: 6,
    });
  }

  if (allColors.background) {
    const rgb = hexToRgb(allColors.background);
    colors.push({
      hex: allColors.background.toUpperCase(),
      rgb: rgb || { r: 0, g: 0, b: 0 },
      name: 'Background',
      usage: 'background',
      confidence: 'high',
      frequency: 5,
    });
  }

  if (allColors.text) {
    const rgb = hexToRgb(allColors.text);
    colors.push({
      hex: allColors.text.toUpperCase(),
      rgb: rgb || { r: 0, g: 0, b: 0 },
      name: 'Text',
      usage: 'text',
      confidence: 'high',
      frequency: 5,
    });
  }

  // Extract fonts from styleguide
  if (styleguideData?.styleguide?.typography) {
    const typography = styleguideData.styleguide.typography;
    const seenFonts = new Set<string>();

    // Heading font
    const headingFont =
      typography.headings?.h1?.fontFamily ||
      typography.headings?.h2?.fontFamily;
    if (headingFont && !seenFonts.has(headingFont)) {
      seenFonts.add(headingFont);
      const headingFontObj: ExtractedFont = {
        family:
          headingFont.split(',')[0]?.trim().replace(/['"]/g, '') || headingFont,
        weights: [String(typography.headings?.h1?.fontWeight || 700)],
        usage: 'heading',
      };
      if (headingFont.toLowerCase().includes('google')) {
        headingFontObj.source = 'Google Fonts';
      }
      fonts.push(headingFontObj);
    }

    // Body font
    const bodyFont = typography.p?.fontFamily;
    if (bodyFont && !seenFonts.has(bodyFont)) {
      seenFonts.add(bodyFont);
      const bodyFontObj: ExtractedFont = {
        family: bodyFont.split(',')[0]?.trim().replace(/['"]/g, '') || bodyFont,
        weights: [String(typography.p?.fontWeight || 400)],
        usage: 'body',
      };
      if (bodyFont.toLowerCase().includes('google')) {
        bodyFontObj.source = 'Google Fonts';
      }
      fonts.push(bodyFontObj);
    }
  }

  // Extract logos
  if (retrieveData.logos?.logo_url) {
    logos.push({ url: retrieveData.logos.logo_url, type: 'header-logo' });
  }
  if (retrieveData.logos?.icon_url) {
    logos.push({ url: retrieveData.logos.icon_url, type: 'favicon' });
  }
  if (retrieveData.logos?.favicon_url) {
    logos.push({ url: retrieveData.logos.favicon_url, type: 'favicon' });
  }

  // Build metadata, only including defined values
  const metadata: BrandExtractionResult['metadata'] = {};
  if (retrieveData.name) metadata.title = retrieveData.name;
  if (retrieveData.description) metadata.description = retrieveData.description;
  if (retrieveData.name) metadata.siteName = retrieveData.name;

  const result: BrandExtractionResult = {
    url: originalUrl,
    timestamp: new Date().toISOString(),
    colors,
    fonts,
    logos,
    metadata,
  };

  if (screenshotData?.screenshot_url) {
    result.screenshot = screenshotData.screenshot_url;
  }

  return result;
}

/**
 * Call Brand.dev API endpoint
 */
async function callBrandDevAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BRAND_DEV_API_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${BRAND_DEV_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brand.dev API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Fallback extraction using basic HTTP requests (no browser)
 * Less accurate but works without external services
 */
async function extractWithHttpFallback(
  url: string,
  _domain: string
): Promise<BrandExtractionResult> {
  logger.info('[Brand Extraction] Using HTTP fallback', { url });

  const colors: ExtractedColor[] = [];
  const fonts: ExtractedFont[] = [];
  const logos: ExtractedLogo[] = [];
  const metadata: BrandExtractionResult['metadata'] = {};

  try {
    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ThumPiks/1.0; +https://thumpiks.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    const origin = new URL(url).origin;

    // Extract metadata from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i
      );
    const ogSiteMatch = html.match(
      /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i
    );

    // Only add metadata properties if they have values
    const title = titleMatch?.[1]?.trim();
    const description = descMatch?.[1]?.trim();
    const siteName = ogSiteMatch?.[1]?.trim();
    if (title) metadata.title = title;
    if (description) metadata.description = description;
    if (siteName) metadata.siteName = siteName;

    // Extract favicon
    const faviconMatch =
      html.match(
        /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i
      ) ||
      html.match(
        /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i
      );
    if (faviconMatch?.[1]) {
      const faviconUrl = faviconMatch[1].startsWith('http')
        ? faviconMatch[1]
        : faviconMatch[1].startsWith('/')
          ? origin + faviconMatch[1]
          : origin + '/' + faviconMatch[1];
      logos.push({ url: faviconUrl, type: 'favicon' });
    }

    // Extract OG image
    const ogImageMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    );
    if (ogImageMatch?.[1]) {
      logos.push({ url: ogImageMatch[1], type: 'og-image' });
    }

    // Extract theme color (often represents brand color)
    const themeColorMatch = html.match(
      /<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i
    );
    if (themeColorMatch?.[1]?.startsWith('#')) {
      const rgb = hexToRgb(themeColorMatch[1]);
      colors.push({
        hex: themeColorMatch[1].toUpperCase(),
        rgb: rgb || { r: 0, g: 0, b: 0 },
        name: 'Theme Color',
        usage: 'accent',
        confidence: 'high',
        frequency: 10,
      });
    }

    // Extract Google Fonts
    const googleFontsMatches = html.matchAll(
      /fonts\.googleapis\.com[^"']*family=([^"'&]+)/gi
    );
    for (const match of googleFontsMatches) {
      if (match[1]) {
        const fontName = decodeURIComponent(
          match[1].replace(/\+/g, ' ').split(':')[0] || ''
        );
        if (fontName && !fonts.some(f => f.family === fontName)) {
          fonts.push({
            family: fontName,
            weights: ['400'],
            usage: 'unknown',
            source: 'Google Fonts',
          });
        }
      }
    }
  } catch (error) {
    logger.error('[Brand Extraction] HTTP fallback error', error instanceof Error ? error : new Error(String(error)));
  }

  return {
    url,
    timestamp: new Date().toISOString(),
    colors,
    fonts,
    logos,
    metadata,
  };
}

// Legacy export for backwards compatibility (no-op now)
export async function closeBrowser(): Promise<void> {
  // No-op - Playwright browser no longer used
}
