import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { getPrisma } from '../../utils/prisma-factory';
import { CacheService } from '../../services/cache.service';
import { getFrontendUrl } from '../../utils/env';
import { deductCredits } from '../credit/credit.service';
import { logger } from '../../utils/logger';
import {
  VisionElements,
  VisionAnalysisResult,
  BingImageResult,
  VisionServiceDependencies,
} from './types';

/** Minimal shape of an OpenRouter chat-completion response */
interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/** Minimal shape of a SearXNG image search result item */
interface SearXNGImageResult {
  img_src?: string;
  title?: string;
  url?: string;
  thumbnail_src?: string;
  resolution?: string;
}

/** Minimal shape of a SearXNG search response */
interface SearXNGResponse {
  results?: SearXNGImageResult[];
}

/** Minimal shape of a SerpAPI image result item */
interface SerpApiImageResult {
  original?: string;
  link?: string;
  title?: string;
  source?: string;
  original_width?: number;
  original_height?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
}

/** Minimal shape of a SerpAPI image search response */
interface SerpApiResponse {
  images_results?: SerpApiImageResult[];
}

/** Minimal shape of a Bing image result item */
interface BingImageItem {
  contentUrl?: string;
  name?: string;
  hostPageUrl?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

/** Minimal shape of a Bing image search response */
interface BingApiResponse {
  value?: BingImageItem[];
}

const VISION_SYSTEM_PROMPT = `You are a thumbnail design analyst and CTR prediction expert. Analyze the provided image and return a JSON response with these exact fields:

{
  "description": "A detailed 2-3 sentence description of the image's visual design",
  "elements": {
    "mainSubject": "The primary subject/focus of the image",
    "faces": 0,
    "faceDetails": [
      {
        "position": "left|center|right",
        "verticalPosition": "top|middle|bottom",
        "expression": "excited|surprised|happy|serious|neutral|sad|angry|confident",
        "size": "small|medium|large",
        "eyeContact": true
      }
    ],
    "textOverlay": ["list of any text visible in the image"],
    "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
    "dominantColor": "#hex of the most prominent color",
    "colorContrast": "low|medium|high",
    "mood": "one word: energetic|calm|dramatic|playful|serious|mysterious|inspiring|urgent",
    "style": "one word: minimalist|bold|cinematic|professional|creative|gaming|retro|clean",
    "composition": "one phrase: centered|rule-of-thirds|diagonal|symmetrical|asymmetrical|framed",
    "ctrFactors": {
      "faceScore": 0,
      "textScore": 0,
      "colorScore": 0,
      "compositionScore": 0,
      "emotionScore": 0,
      "overallCTR": 0
    },
    "suggestions": ["up to 3 actionable suggestions to improve thumbnail CTR"]
  }
}

CTR scoring rules (0-100 each):
- faceScore: 80+ if large face with eye contact and excited/surprised expression. 50 if face present but neutral. 20 if no face.
- textScore: 80+ if bold, readable text with high contrast. 50 if text present but small/low contrast. 20 if no text.
- colorScore: 80+ if high contrast, saturated, complementary colors. 50 if moderate. 20 if dull/monochrome.
- compositionScore: 80+ if clear focal point, rule-of-thirds, balanced. 50 if centered. 20 if cluttered.
- emotionScore: 80+ if image evokes strong curiosity or excitement. 50 if neutral. 20 if boring.
- overallCTR: Weighted average (face 30%, emotion 25%, color 20%, text 15%, composition 10%).

Return ONLY valid JSON, no markdown, no explanation.`;

export class VisionService {
  private prisma: PrismaClient;
  private cache: CacheService;
  private openrouterApiKey: string;
  private openrouterApiUrl: string;
  private bingApiKey: string;
  private bingEndpoint: string;
  private serpApiKey: string;
  private searxngUrl: string;

  constructor(dependencies: VisionServiceDependencies = {}) {
    this.prisma = dependencies.prisma || getPrisma();
    this.cache = dependencies.cache || CacheService.getInstance();
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
    this.openrouterApiUrl =
      process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
    this.bingApiKey = process.env.BING_SEARCH_API_KEY || '';
    this.bingEndpoint =
      process.env.BING_SEARCH_ENDPOINT ||
      'https://api.bing.microsoft.com/v7.0/images/search';
    this.serpApiKey = process.env.SERPAPI_KEY || '';
    this.searxngUrl = process.env.SEARXNG_URL || '';
  }

  async analyzeImage(
    imageUrl: string,
    userId: string
  ): Promise<VisionAnalysisResult> {
    if (!this.openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Deduct 1 credit for vision analysis
    const creditDeducted = await deductCredits(
      userId,
      1,
      'Vision analysis - thumbnail reference'
    );
    if (!creditDeducted) {
      throw new Error('Insufficient credits for vision analysis');
    }

    // Call OpenRouter Gemini vision model
    const visionModel =
      process.env.OPENROUTER_MODEL_VISION || 'google/gemini-2.5-flash';

    // If image is a localhost URL (dev), fetch it and convert to base64
    // since external AI models cannot access localhost
    let resolvedImageUrl = imageUrl;
    if (
      !imageUrl.startsWith('data:') &&
      (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1'))
    ) {
      try {
        const imgResponse = await fetch(imageUrl);
        if (imgResponse.ok) {
          const buffer = await imgResponse.buffer();
          const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
          resolvedImageUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
        }
      } catch (err: unknown) {
        logger.warn('Failed to convert localhost image to base64', { error: err instanceof Error ? err.message : String(err) });
      }
    }

    const requestBody = {
      model: visionModel,
      messages: [
        {
          role: 'system' as const,
          content: VISION_SYSTEM_PROMPT,
        },
        {
          role: 'user' as const,
          content: [
            {
              type: 'image_url' as const,
              image_url: { url: resolvedImageUrl },
            },
            {
              type: 'text' as const,
              text: 'Analyze this image as a thumbnail design reference. Return the JSON analysis.',
            },
          ],
        },
      ],
      stream: false,
    };

    const response = await fetch(`${this.openrouterApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openrouterApiKey}`,
        'HTTP-Referer': getFrontendUrl(),
        'X-Title': 'ThumPiks Vision Analysis',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Vision analysis failed (${response.status}): ${errorText}`
      );
    }

    const data = await response.json() as OpenRouterResponse;
    const rawContent =
      data.choices?.[0]?.message?.content || '';

    // Parse the JSON response from the vision model
    const parsed = this.parseVisionResponse(rawContent);

    // Generate a suggested prompt from the extracted elements
    const suggestedPrompt = this.generatePromptFromElements(parsed);

    // Save to database
    const record = await this.prisma.visionAnalysis.create({
      data: {
        id: uuidv4(),
        userId,
        imageUrl,
        description: parsed.description,
        suggestedPrompt,
        elements: parsed.elements as unknown as import('@prisma/client').Prisma.InputJsonValue,
        sourceType: imageUrl.startsWith('data:') ? 'upload' : 'url',
      },
    });

    return {
      id: record.id,
      imageUrl: record.imageUrl,
      description: record.description,
      suggestedPrompt: record.suggestedPrompt,
      elements: parsed.elements,
      createdAt: record.createdAt,
    };
  }

  async searchWebImages(
    query: string,
    count: number = 20
  ): Promise<BingImageResult[]> {
    // Priority: SearXNG (free/self-hosted) -> SerpAPI -> Bing
    if (this.searxngUrl) {
      return this.searchWithSearXNG(query, count);
    }
    if (this.serpApiKey) {
      return this.searchWithSerpApi(query, count);
    }
    if (this.bingApiKey) {
      return this.searchWithBing(query, count);
    }
    throw new Error('No image search API configured. Set SEARXNG_URL, SERPAPI_KEY, or BING_SEARCH_API_KEY.');
  }

  private async searchWithSearXNG(
    query: string,
    count: number
  ): Promise<BingImageResult[]> {
    const cacheKey = `searxng:images:${query}:${count}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached as BingImageResult[];
    }

    const params = new URLSearchParams({
      q: query,
      categories: 'images',
      format: 'json',
      safesearch: '1',
    });

    try {
      const response = await fetch(`${this.searxngUrl}/search?${params}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`SearXNG failed (${response.status})`);
      }

      const data = await response.json() as SearXNGResponse;
      const results: BingImageResult[] = (data.results || [])
        .slice(0, count)
        .filter((img: SearXNGImageResult) => img.img_src)
        .map((img: SearXNGImageResult) => ({
          url: img.img_src!,
          title: img.title || '',
          sourceUrl: img.url || img.img_src!,
          width: img.resolution?.split('x')[0] ? parseInt(img.resolution.split('x')[0]!) : 0,
          height: img.resolution?.split('x')[1] ? parseInt(img.resolution.split('x')[1]!) : 0,
          thumbnailUrl: img.thumbnail_src || img.img_src!,
        }));

      await this.cache.set(cacheKey, results, 1800);
      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // Fallback to SerpAPI or Bing if SearXNG fails
      if (this.serpApiKey) {
        logger.warn('SearXNG failed, falling back to SerpAPI', { error: message });
        return this.searchWithSerpApi(query, count);
      }
      if (this.bingApiKey) {
        logger.warn('SearXNG failed, falling back to Bing', { error: message });
        return this.searchWithBing(query, count);
      }
      throw error;
    }
  }

  private async searchWithSerpApi(
    query: string,
    count: number
  ): Promise<BingImageResult[]> {
    const cacheKey = `serpapi:images:${query}:${count}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached as BingImageResult[];
    }

    const params = new URLSearchParams({
      q: query,
      tbm: 'isch', // image search
      num: String(Math.min(count, 100)),
      api_key: this.serpApiKey,
      safe: 'active',
    });

    const response = await fetch(`https://serpapi.com/search?${params}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If SerpAPI fails and Bing is available, try Bing
      if (this.bingApiKey) {
        logger.warn('SerpAPI failed, falling back to Bing', { error: errorText });
        return this.searchWithBing(query, count);
      }
      throw new Error(`SerpAPI Image Search failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as SerpApiResponse;
    const results: BingImageResult[] = (data.images_results || [])
      .slice(0, count)
      .filter((img: SerpApiImageResult) => (img.original_width ?? 0) >= 800 || (img.width ?? 0) >= 800)
      .map((img: SerpApiImageResult) => ({
        url: img.original || img.link || '',
        title: img.title || '',
        sourceUrl: img.source || img.link || '',
        width: img.original_width || img.width || 0,
        height: img.original_height || img.height || 0,
        thumbnailUrl: img.thumbnail || '',
      }));

    await this.cache.set(cacheKey, results, 1800);
    return results;
  }

  private async searchWithBing(
    query: string,
    count: number
  ): Promise<BingImageResult[]> {
    const cacheKey = `bing:images:${query}:${count}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached as BingImageResult[];
    }

    const params = new URLSearchParams({
      q: query,
      count: String(count),
      imageType: 'Photo',
      size: 'Large',
      safeSearch: 'Moderate',
    });

    const response = await fetch(`${this.bingEndpoint}?${params}`, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': this.bingApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Bing Image Search failed (${response.status}): ${errorText}`
      );
    }

    const data = await response.json() as BingApiResponse;
    const results: BingImageResult[] = (data.value || [])
      .filter((img: BingImageItem) => (img.width ?? 0) >= 800)
      .map((img: BingImageItem) => ({
        url: img.contentUrl || '',
        title: img.name || '',
        sourceUrl: img.hostPageUrl || '',
        width: img.width ?? 0,
        height: img.height ?? 0,
        thumbnailUrl: img.thumbnailUrl || '',
      }));

    await this.cache.set(cacheKey, results, 1800);
    return results;
  }

  async getHistory(
    userId: string,
    limit: number = 20
  ): Promise<VisionAnalysisResult[]> {
    const cacheKey = `vision:history:${userId}:${limit}`;

    const fetchFn = async () => {
      const records = await this.prisma.visionAnalysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return records.map((r) => ({
        id: r.id,
        imageUrl: r.imageUrl,
        description: r.description,
        suggestedPrompt: r.suggestedPrompt,
        elements: r.elements as unknown as VisionElements,
        createdAt: r.createdAt,
      }));
    };

    return this.cache.getOrSet(cacheKey, fetchFn, 300);
  }

  private parseVisionResponse(rawContent: string): {
    description: string;
    elements: VisionElements;
  } {
    // Strip markdown code fences if present
    let content = rawContent.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const defaultCTR: import('./types').CTRFactors = {
      faceScore: 0,
      textScore: 0,
      colorScore: 0,
      compositionScore: 0,
      emotionScore: 0,
      overallCTR: 0,
    };

    try {
      const parsed = JSON.parse(content);
      const el = parsed.elements || {};
      return {
        description: parsed.description || 'No description available',
        elements: {
          mainSubject: el.mainSubject || 'Unknown',
          faces: typeof el.faces === 'number' ? el.faces : 0,
          faceDetails: Array.isArray(el.faceDetails) ? el.faceDetails : [],
          textOverlay: Array.isArray(el.textOverlay) ? el.textOverlay : [],
          colorPalette: Array.isArray(el.colorPalette) ? el.colorPalette : [],
          dominantColor: el.dominantColor || '#000000',
          colorContrast: ['low', 'medium', 'high'].includes(el.colorContrast) ? el.colorContrast : 'medium',
          mood: el.mood || 'neutral',
          style: el.style || 'default',
          composition: el.composition || 'centered',
          ctrFactors: el.ctrFactors ? { ...defaultCTR, ...el.ctrFactors } : defaultCTR,
          suggestions: Array.isArray(el.suggestions) ? el.suggestions : [],
        },
      };
    } catch {
      // Fallback: use raw content as description if JSON parsing fails
      return {
        description: rawContent.slice(0, 500),
        elements: {
          mainSubject: 'Unknown',
          faces: 0,
          faceDetails: [],
          textOverlay: [],
          colorPalette: [],
          dominantColor: '#000000',
          colorContrast: 'medium',
          mood: 'neutral',
          style: 'default',
          composition: 'centered',
          ctrFactors: defaultCTR,
          suggestions: [],
        },
      };
    }
  }

  private generatePromptFromElements(parsed: {
    description: string;
    elements: VisionElements;
  }): string {
    const { elements } = parsed;
    const parts: string[] = [];

    parts.push(`Create a ${elements.style} YouTube thumbnail`);

    if (elements.mood !== 'neutral') {
      parts.push(`with a ${elements.mood} mood`);
    }

    if (elements.mainSubject !== 'Unknown') {
      parts.push(`featuring ${elements.mainSubject}`);
    }

    if (elements.colorPalette.length > 0) {
      parts.push(
        `using colors: ${elements.colorPalette.slice(0, 3).join(', ')}`
      );
    }

    if (elements.textOverlay.length > 0) {
      parts.push(`with text: "${elements.textOverlay[0]}"`);
    }

    parts.push(`${elements.composition} composition`);

    return parts.join('. ') + '.';
  }
}
