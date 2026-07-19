import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';
import { openRouterService, cometService, zenmuxService } from './thumbnail.shared';
import type { Request } from 'express';
import {
  resolveModelFromTier,
  resolveVisionModelFromTier,
  buildTierAPIResponse,
  getCreditCostForTier,
  getProviderForTier,
} from './model-tiers.config';
import { deductCredits, refundCredits } from '../credit/credit.service';
import { getAIPriorityQueue } from './ai-priority-queue.service';
import type { AIJobParams } from './ai-priority-queue.service';
import { getCurrentSubscription } from '../subscription/subscription.service';
import { emitAnalyticsEvent } from '../../events/event-emitter';
import { watermarkImageUrls } from './watermark.service';

/**
 * Generate images from text prompt
 * Model: tier-based (Flash/Standard/Pro) via model-tiers.config
 */
export const aiGenerate = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { prompt, style, tier, model: modelOverride } = req.body;

    logger.info('AI Generate request', {
      prompt: prompt?.substring(0, 50),
      style,
      tier,
      modelOverride,
    });

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required',
      });
    }

    // Determine which provider to use based on tier
    const provider = tier ? getProviderForTier(tier) : 'openrouter';
    logger.info('AI Generate resolved provider', { provider, tier: tier || 'none' });

    // Check if the required provider is configured
    if (provider === 'comet' && !cometService.isConfigured()) {
      return res.status(503).json({
        error: 'Comet AI service not configured. Please set COMET_API_KEY.',
      });
    }
    if (provider === 'zenmux' && !zenmuxService.isConfigured()) {
      return res.status(503).json({
        error: 'ZenMux AI service not configured. Please set ZENMUX_API_KEY.',
      });
    }
    if (provider === 'openrouter' && !openRouterService.isConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured. Please set OPENROUTER_API_KEY.',
      });
    }

    // Resolve model: direct override takes priority, then tier-based lookup, then default
    const resolvedModel =
      modelOverride || resolveModelFromTier(tier, 'generate');
    const model =
      resolvedModel || openRouterService.getModelForTool('generate');
    logger.info('AI Generate using model', { model, tier: tier || 'none', override: modelOverride || 'none' });

    // Credit check & deduction (before API call)
    const creditCost = getCreditCostForTier(tier, 'generate');
    const deducted = await deductCredits(
      user.id,
      creditCost,
      `AI generate - ${tier || 'default'} tier`
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      let imageUrls: string[];

      // Build the direct executor (the actual AI call)
      const directExecutor = async () => {
        let urls: string[];
        if (provider === 'comet') {
          urls = await cometService.generateImages(
            prompt,
            style || 'thumbnail'
          );
        } else if (provider === 'zenmux') {
          urls = await zenmuxService.generateImages(
            prompt,
            style || 'thumbnail'
          );
        } else {
          urls = await openRouterService.generateImages(
            prompt,
            resolvedModel || undefined,
            style || 'thumbnail'
          );
        }
        return { images: urls };
      };

      // Route through priority queue (Ultra Pro users dequeue first)
      const aiQueue = getAIPriorityQueue();
      if (aiQueue.isReady()) {
        const subscription = await getCurrentSubscription(user.id);
        const planType = subscription?.planType || 'free';
        const jobParams: AIJobParams = {
          operationType: 'generate',
          userId: user.id,
          planType,
          provider,
          model,
          tier: tier || 'default',
          payload: { prompt, style: style || 'thumbnail', model: resolvedModel },
          toolTimeout: 60000,
        };
        const result = await aiQueue.executeViaQueue(jobParams, directExecutor);
        imageUrls = result.images as string[];
      } else {
        // Queue not ready — direct execution (graceful degradation)
        const result = await directExecutor();
        imageUrls = result.images;
      }

      // Emit analytics event
      emitAnalyticsEvent(user.id, 'ai-tool', 'generate', 'ai-generate', {
        model,
        promptLength: prompt.length,
        style: style || 'thumbnail',
        provider,
      });

      // Watermark free-tier outputs
      const wmResult = await watermarkImageUrls(user.id, imageUrls);

      return res.status(200).json({
        success: true,
        images: wmResult.displayUrls,
        originals: wmResult.originalUrls,
        model,
        provider,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(user.id, creditCost, `AI generate failed`);
      throw apiError;
    }
  } catch (error) {
    logger.error('Error in AI generate', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI generate failed',
    });
  }
};

/**
 * Generate AI text suggestions for thumbnails (titles, captions)
 * Supports vision mode: analyze an image to generate contextual text
 */
export const aiGenerateText = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const {
      prompt: rawPrompt,
      context,
      tone = 'clickbait',
      count = 5,
      maxLength = 60,
      tier,
      imageUrl,
      imageBase64,
    } = req.body;

    const isVisionMode = !!(imageUrl || imageBase64);

    // In vision mode, a prompt is optional — default to a sensible instruction
    const prompt = rawPrompt || (isVisionMode
      ? 'Generate click-worthy text for this YouTube thumbnail'
      : '');

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!openRouterService.isConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured. Please set OPENROUTER_API_KEY.',
      });
    }

    // Resolve model and credit cost from tier config
    const textModel =
      resolveModelFromTier(tier, 'generate-text') || 'openai/gpt-4.1-nano';
    const creditCost = getCreditCostForTier(tier, 'generate-text');
    const deducted = await deductCredits(
      user.id,
      creditCost,
      `AI text generation - ${tier || 'flash'} tier${isVisionMode ? ' (vision)' : ''}`
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      // ---- Vision mode: resolve image and select vision model ----
      let actualModel = textModel;
      let resolvedImageUrl: string | null = null;
      let fallbackUsed = false;

      if (isVisionMode) {
        // Select vision-capable model for this tier
        const visionModel = resolveVisionModelFromTier(tier, 'generate-text');
        if (visionModel) {
          actualModel = visionModel;
        }

        // Resolve image input to a format the API can consume
        const imageInput = imageBase64 || imageUrl;
        if (imageInput) {
          // Validate size for base64 inputs (~10MB limit)
          if (imageInput.startsWith('data:') && imageInput.length > 10 * 1024 * 1024 * 1.37) {
            await refundCredits(user.id, creditCost, 'Image too large');
            return res.status(413).json({
              error: 'Image too large for vision analysis. Please use an image under 10MB.',
            });
          }

          // Localhost URLs must be converted to base64 since external AI APIs can't access them
          if (!imageInput.startsWith('data:') &&
              (imageInput.includes('localhost') || imageInput.includes('127.0.0.1'))) {
            try {
              const imgResp = await fetch(imageInput);
              if (imgResp.ok) {
                const buffer = Buffer.from(await imgResp.arrayBuffer());
                const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
                resolvedImageUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
              } else {
                resolvedImageUrl = imageInput;
              }
            } catch {
              resolvedImageUrl = imageInput;
            }
          } else if (imageInput.startsWith('data:') || imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
            resolvedImageUrl = imageInput;
          } else {
            // Assume raw base64 string without data URI prefix
            resolvedImageUrl = `data:image/png;base64,${imageInput}`;
          }
        }
      }

      // Build the system prompt for title generation
      const toneInstructions: Record<string, string> = {
        clickbait:
          'Maximum clicks & curiosity. Use power words, numbers, emotional triggers. Create FOMO.',
        professional:
          'Clean, authoritative, trustworthy. No hype, just clear value propositions.',
        casual:
          'Friendly, relatable, conversational. Like talking to a friend.',
        dramatic:
          'High emotion, urgency, impact. Create suspense and excitement.',
        educational:
          'Informative, clear, structured. Focus on learning outcomes and value.',
      };

      const styleTypes = [
        'bold',
        'question',
        'listicle',
        'emotional',
        'curiosity',
      ];

      // Random session seed injected into system prompt to ensure unique results each call
      const sessionSeed = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

      // Vision-specific instructions appended when an image is provided
      const visionBlock = (isVisionMode && resolvedImageUrl) ? `
VISUAL ANALYSIS INSTRUCTIONS:
- You can SEE the thumbnail image provided. Analyze its composition, colors, subjects, facial expressions, and mood.
- Generate text that directly complements and enhances what you see in the image.
- Consider the dominant colors — suggest text that would contrast well and be readable over the image.
- If faces are present, leverage the emotional tone (excited, surprised, serious) in your suggestions.
- If existing text overlay is visible, generate improved alternatives or complementary text.
` : '';

      let systemPrompt = `You are an expert YouTube thumbnail text generator${isVisionMode ? ' with vision capability' : ''}. Generate exactly ${count} short, punchy text suggestions for a YouTube thumbnail overlay.

Session: ${sessionSeed}
${visionBlock}
Rules:
- Each suggestion must be ${maxLength} characters or fewer
- Text must be readable at thumbnail size (short, impactful)
- Use UPPERCASE for key words to simulate thumbnail text styling
- Tone: ${toneInstructions[tone] || toneInstructions.clickbait}
- IMPORTANT: Be creative and produce COMPLETELY DIFFERENT suggestions each time. Never repeat previous ideas. Explore totally new angles, phrasings, and hooks every session.
- CRITICAL: Spell all names, brands, and proper nouns EXACTLY as provided in the prompt or context. Never alter, phonetically substitute, or "improve" proper nouns.
${context ? `- Context: ${context}` : ''}

For each suggestion, assign one of these styles: ${styleTypes.join(', ')}
Also assign a click-worthiness score from 0.0 to 1.0.`;

      // ---- Build response_format based on model compatibility ----
      // Models that support strict json_schema: OpenAI and Google
      // Others (Qwen, Grok, etc.): use json_object mode + prompt instructions
      const supportsJsonSchema = actualModel.startsWith('openai/') || actualModel.startsWith('google/');

      const jsonSchemaFormat = {
        type: 'json_schema' as const,
        json_schema: {
          name: 'thumbnail_suggestions',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    style: {
                      type: 'string',
                      enum: ['bold', 'question', 'listicle', 'emotional', 'curiosity'],
                    },
                    score: { type: 'number' },
                  },
                  required: ['text', 'style', 'score'],
                  additionalProperties: false,
                },
              },
            },
            required: ['suggestions'],
            additionalProperties: false,
          },
        },
      };

      let responseFormat: Record<string, unknown>;
      if (supportsJsonSchema) {
        responseFormat = jsonSchemaFormat;
      } else {
        responseFormat = { type: 'json_object' };
        // Add explicit JSON formatting instructions for models without strict schema
        systemPrompt += `\n\nYou MUST respond with a valid JSON object in this exact format:
{ "suggestions": [{ "text": "YOUR TEXT", "style": "bold", "score": 0.85 }] }
Do not include any text outside the JSON object.`;
      }

      // ---- Build messages array (multimodal when vision, text-only otherwise) ----
      interface ChatMessage { role: 'system' | 'user'; content: string | Array<{ type: string; [key: string]: unknown }> }

      const userMessage: ChatMessage =
        (isVisionMode && resolvedImageUrl)
          ? {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: resolvedImageUrl } },
                { type: 'text', text: prompt },
              ],
            }
          : { role: 'user', content: prompt };

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        userMessage,
      ];

      // ---- API call with vision fallback ----
      const apiUrl =
        process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';

      const makeApiCall = async (model: string, msgs: ChatMessage[], resFormat: Record<string, unknown>) => {
        return fetch(`${apiUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_URL || 'https://thumpiks.com',
            'X-Title': 'ThumPiks AI Text Generator',
          },
          body: JSON.stringify({
            model,
            messages: msgs,
            temperature: 0.7,
            max_tokens: 1024,
            response_format: resFormat,
          }),
        });
      };

      let response = await makeApiCall(actualModel, messages, responseFormat);

      // Vision fallback: if vision model fails, retry with text-only model
      if (!response.ok && isVisionMode && actualModel !== textModel) {
        logger.warn('Vision model failed, falling back to text model', {
          visionModel: actualModel,
          textModel,
          status: response.status,
        });
        fallbackUsed = true;
        actualModel = textModel;

        // Use json_schema for text model fallback (OpenAI models support it)
        const fallbackFormat = (textModel.startsWith('openai/') || textModel.startsWith('google/'))
          ? jsonSchemaFormat
          : responseFormat;

        // Strip image from messages for text-only fallback
        const fallbackMessages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ];
        response = await makeApiCall(textModel, fallbackMessages, fallbackFormat);
      }

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        await refundCredits(
          user.id,
          creditCost,
          'AI text generation failed'
        );
        throw new Error(
          errData.error?.message || `OpenRouter API error (${response.status})`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content || '';

      // Parse the JSON response — structured output should return { suggestions: [...] }
      let suggestions: Array<{ text: string; style: string; score: number }>;
      try {
        // Strip markdown code fences if present (safety net)
        const cleaned = content
          .replace(/```json?\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        const parsed = JSON.parse(cleaned);

        // Structured output wraps in { suggestions: [...] }, but handle bare array too
        const rawSuggestions = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.suggestions)
            ? parsed.suggestions
            : null;

        if (!rawSuggestions) {
          throw new Error('Response has no suggestions array');
        }

        // Validate and sanitize
        suggestions = rawSuggestions
          .filter(
            (s: unknown) => s !== null && typeof s === 'object' &&
              typeof (s as Record<string, unknown>).text === 'string' &&
              ((s as Record<string, unknown>).text as string).trim().length > 2
          )
          .slice(0, count)
          .map((s: unknown) => {
            const item = s as { text: string; style?: string; score?: unknown };
            return {
              text: item.text.trim().slice(0, maxLength + 20),
              style: styleTypes.includes(item.style ?? '') ? item.style! : 'bold',
              score:
                typeof item.score === 'number'
                  ? Math.min(1, Math.max(0, item.score))
                  : 0.8,
            };
          });
      } catch {
        // Bulletproof fallback: extract "text" values via regex, filter JSON artifacts
        const textMatches: string[] = [];
        const textRegex = /"text"\s*:\s*"([^"]+)"/g;
        let match: RegExpExecArray | null;
        while ((match = textRegex.exec(content)) !== null) {
          if (match[1]) textMatches.push(match[1]);
        }

        // Filter out JSON syntax artifacts and too-short entries
        const jsonArtifacts = /[{}[\]"`:]/;
        suggestions = textMatches
          .filter(t => t.trim().length > 2 && !jsonArtifacts.test(t.trim().slice(0, 3)))
          .slice(0, count)
          .map((text: string, i: number) => ({
            text: text.trim().slice(0, maxLength + 20),
            style: styleTypes[i % styleTypes.length] as string,
            score: 0.75,
          }));
      }

      if (suggestions.length === 0) {
        await refundCredits(
          user.id,
          creditCost,
          'AI text generation returned no results'
        );
        return res
          .status(500)
          .json({ error: 'No valid suggestions generated. Please try again.' });
      }

      // Emit analytics
      emitAnalyticsEvent(user.id, 'ai-tool', 'generate-text', 'ai-text', {
        promptLength: prompt.length,
        tone,
        tier: tier || 'flash',
        suggestionsCount: suggestions.length,
        visionMode: isVisionMode,
        visionModel: isVisionMode ? actualModel : undefined,
        imageSource: imageBase64 ? 'base64' : imageUrl ? 'url' : null,
        fallbackUsed,
      });

      return res.status(200).json({
        success: true,
        suggestions,
        model: actualModel,
        tier: tier || 'flash',
        creditCost,
        visionMode: isVisionMode,
        ...(fallbackUsed && { fallbackUsed: true }),
      });
    } catch (apiError) {
      await refundCredits(user.id, creditCost, 'AI text generation failed');
      throw apiError;
    }
  } catch (error) {
    logger.error('Error in AI text generation', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'AI text generation failed',
    });
  }
};

/**
 * Get AI tool model configurations - shows which models are assigned to each tool
 */
export const getAIToolModels = async (_req: Request, res: Response) => {
  try {
    // Build the full tier response from the single source of truth.
    // The frontend fetches this on mount and renders the ModelTierSelector from it.
    // No hardcoded model data lives in the frontend — only here.
    const response = buildTierAPIResponse(openRouterService.isConfigured());

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching AI tool models', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};
