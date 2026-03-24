/**
 * Feedback AI Analysis
 *
 * WHAT: Analyzes feedback with OpenRouter (Gemini Flash) for sentiment,
 *       categorization, priority, and summarization
 * WHY: Automatically enriches feedback so admins get pre-triaged, actionable data
 * HOW: Single structured JSON prompt to OpenRouter → parse → return analysis
 *
 * Alignment:
 * - Service Layer: Pure logic, no HTTP/DB concerns
 * - DRY: Single AI model config from env, reused across analysis calls
 */

import fetch from 'node-fetch';
import { logger } from '../../utils/logger';
import type { FeedbackAIAnalysis, FeedbackType } from './types';

const OPENROUTER_API_URL =
  process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL_FEEDBACK || 'google/gemini-2.5-flash';

/**
 * Analyze feedback text with AI. Returns enrichment data.
 * Gracefully degrades: returns defaults on any failure.
 */
export async function analyzeFeedback(
  type: FeedbackType,
  subject: string,
  message: string
): Promise<FeedbackAIAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    logger.warn('OPENROUTER_API_KEY not set, skipping AI analysis');
    return defaultAnalysis();
  }

  const prompt = buildPrompt(type, subject, message);

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:8556',
        'X-Title': 'Thumbnail Maker Feedback Analysis',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a feedback analysis assistant. Respond ONLY with valid JSON, no markdown fences or extra text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenRouter API error', new Error(errorText), {
        status: response.status,
      });
      return defaultAnalysis();
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      logger.warn('Empty AI response for feedback analysis');
      return defaultAnalysis();
    }

    return parseAnalysis(content);
  } catch (error) {
    logger.error(
      'Feedback AI analysis failed',
      error as Error,
      { type, subject }
    );
    return defaultAnalysis();
  }
}

// ---- Internals ----

function buildPrompt(
  type: FeedbackType,
  subject: string,
  message: string
): string {
  return `Analyze this user feedback for a thumbnail-making SaaS application.

Type: ${type}
Subject: ${subject}
Message: ${message}

Return a JSON object with exactly these fields:
{
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED",
  "sentimentScore": <number 0.0 to 1.0 where 1.0 is most positive>,
  "category": "<one of: ui, performance, billing, feature, bug, documentation, onboarding, other>",
  "tags": ["<up to 5 relevant lowercase tags>"],
  "summary": "<1-2 sentence summary of the feedback>",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}

Rules:
- BUG type with words like "crash", "broken", "cannot" → priority HIGH or CRITICAL
- FEATURE_REQUEST → default priority MEDIUM unless urgent language used
- Negative sentiment about billing → priority HIGH
- Be concise in the summary`;
}

function parseAnalysis(raw: string): FeedbackAIAnalysis {
  try {
    // Strip markdown fences if present
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate and normalize
    const validSentiments = ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    return {
      sentiment: validSentiments.includes(parsed.sentiment)
        ? parsed.sentiment
        : 'NEUTRAL',
      sentimentScore: clamp(Number(parsed.sentimentScore) || 0.5, 0, 1),
      category: String(parsed.category || 'other').toLowerCase(),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.slice(0, 5).map(String)
        : [],
      summary: String(parsed.summary || '').slice(0, 500),
      priority: validPriorities.includes(parsed.priority)
        ? parsed.priority
        : 'MEDIUM',
    };
  } catch (error) {
    logger.warn('Failed to parse AI analysis response', { raw });
    return defaultAnalysis();
  }
}

function defaultAnalysis(): FeedbackAIAnalysis {
  return {
    sentiment: 'NEUTRAL',
    sentimentScore: 0.5,
    category: 'other',
    tags: [],
    summary: '',
    priority: 'MEDIUM',
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
