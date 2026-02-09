import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { getPrisma } from '../../utils/prisma-factory';
import { CacheService } from '../../services/cache.service';
import { deductCredits } from '../credit/credit.service';
import {
  VisionElements,
  VisionAnalysisResult,
  BingImageResult,
  VisionServiceDependencies,
} from './types';

const VISION_SYSTEM_PROMPT = `You are a thumbnail design analyst. Analyze the provided image and return a JSON response with these exact fields:

{
  "description": "A detailed 2-3 sentence description of the image's visual design",
  "elements": {
    "mainSubject": "The primary subject/focus of the image",
    "faces": 0,
    "textOverlay": ["list of any text visible in the image"],
    "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
    "mood": "one word: energetic|calm|dramatic|playful|serious|mysterious|inspiring|urgent",
    "style": "one word: minimalist|bold|cinematic|professional|creative|gaming|retro|clean",
    "composition": "one phrase: centered|rule-of-thirds|diagonal|symmetrical|asymmetrical|framed"
  }
}

Return ONLY valid JSON, no markdown, no explanation.`;

export class VisionService {
  private prisma: PrismaClient;
  private cache: CacheService;
  private openrouterApiKey: string;
  private openrouterApiUrl: string;
  private bingApiKey: string;
  private bingEndpoint: string;

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
      process.env.OPENROUTER_MODEL_VISION || 'google/gemini-2.5-flash-preview';

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
              image_url: { url: imageUrl },
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
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:8556',
        'X-Title': 'Pikzels Vision Analysis',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Vision analysis failed (${response.status}): ${errorText}`
      );
    }

    const data: any = await response.json();
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
        elements: parsed.elements as any,
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
    if (!this.bingApiKey) {
      throw new Error('Bing Search API key not configured');
    }

    // Check cache first
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

    const data: any = await response.json();
    const results: BingImageResult[] = (data.value || [])
      .filter((img: any) => img.width >= 800)
      .map((img: any) => ({
        url: img.contentUrl,
        title: img.name,
        sourceUrl: img.hostPageUrl,
        width: img.width,
        height: img.height,
        thumbnailUrl: img.thumbnailUrl,
      }));

    // Cache for 30 minutes
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

    try {
      const parsed = JSON.parse(content);
      return {
        description: parsed.description || 'No description available',
        elements: {
          mainSubject: parsed.elements?.mainSubject || 'Unknown',
          faces: typeof parsed.elements?.faces === 'number' ? parsed.elements.faces : 0,
          textOverlay: Array.isArray(parsed.elements?.textOverlay)
            ? parsed.elements.textOverlay
            : [],
          colorPalette: Array.isArray(parsed.elements?.colorPalette)
            ? parsed.elements.colorPalette
            : [],
          mood: parsed.elements?.mood || 'neutral',
          style: parsed.elements?.style || 'default',
          composition: parsed.elements?.composition || 'centered',
        },
      };
    } catch {
      // Fallback: use raw content as description if JSON parsing fails
      return {
        description: rawContent.slice(0, 500),
        elements: {
          mainSubject: 'Unknown',
          faces: 0,
          textOverlay: [],
          colorPalette: [],
          mood: 'neutral',
          style: 'default',
          composition: 'centered',
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
