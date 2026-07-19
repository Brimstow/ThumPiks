// ── Mocks (hoisted) ─────────────────────────────────────────────────

jest.mock('node-fetch', () => jest.fn());
jest.mock('../../../utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────

import fetch from 'node-fetch';
import { analyzeFeedback } from '../feedback.ai';

const { Response } = jest.requireActual('node-fetch');
const mockFetch = fetch as unknown as jest.Mock;

// ── Tests ────────────────────────────────────────────────────────────

describe('analyzeFeedback', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns default analysis when API key is not set', async () => {
    delete process.env.OPENROUTER_API_KEY;

    const result = await analyzeFeedback('BUG', 'Test', 'Message');

    expect(result).toEqual({
      sentiment: 'NEUTRAL',
      sentimentScore: 0.5,
      category: 'other',
      tags: [],
      summary: '',
      priority: 'MEDIUM',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('parses valid AI response correctly', async () => {
    const aiResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            sentiment: 'NEGATIVE',
            sentimentScore: 0.2,
            category: 'ui',
            tags: ['button', 'save', 'broken'],
            summary: 'User reports broken save button',
            priority: 'HIGH',
          }),
        },
      }],
    };

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(aiResponse), { status: 200 })
    );

    const result = await analyzeFeedback('BUG', 'Broken button', 'Save does not work');

    expect(result.sentiment).toBe('NEGATIVE');
    expect(result.sentimentScore).toBe(0.2);
    expect(result.category).toBe('ui');
    expect(result.tags).toEqual(['button', 'save', 'broken']);
    expect(result.priority).toBe('HIGH');
  });

  it('strips markdown fences from AI response', async () => {
    const jsonContent = JSON.stringify({
      sentiment: 'POSITIVE',
      sentimentScore: 0.9,
      category: 'feature',
      tags: ['request'],
      summary: 'Nice feature idea',
      priority: 'LOW',
    });

    const aiResponse = {
      choices: [{ message: { content: '```json\n' + jsonContent + '\n```' } }],
    };

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(aiResponse), { status: 200 })
    );

    const result = await analyzeFeedback('FEATURE_REQUEST', 'Add dark mode', 'Would be great');

    expect(result.sentiment).toBe('POSITIVE');
    expect(result.priority).toBe('LOW');
  });

  it('returns default on API error response', async () => {
    mockFetch.mockResolvedValue(
      new Response('Internal Server Error', { status: 500 })
    );

    const result = await analyzeFeedback('BUG', 'Error', 'Something broke');

    expect(result.priority).toBe('MEDIUM');
    expect(result.sentiment).toBe('NEUTRAL');
  });

  it('returns default on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await analyzeFeedback('GENERAL', 'Hi', 'Feedback');

    expect(result).toEqual(expect.objectContaining({
      sentiment: 'NEUTRAL',
      priority: 'MEDIUM',
    }));
  });

  it('returns default on empty AI response', async () => {
    const aiResponse = { choices: [{ message: { content: '' } }] };

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(aiResponse), { status: 200 })
    );

    const result = await analyzeFeedback('GENERAL', 'Test', 'Message');

    expect(result.sentiment).toBe('NEUTRAL');
  });

  it('normalizes invalid sentiment to NEUTRAL', async () => {
    const aiResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            sentiment: 'INVALID',
            sentimentScore: 0.5,
            category: 'ui',
            tags: [],
            summary: 'Test',
            priority: 'MEDIUM',
          }),
        },
      }],
    };

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(aiResponse), { status: 200 })
    );

    const result = await analyzeFeedback('GENERAL', 'Test', 'Message');

    expect(result.sentiment).toBe('NEUTRAL');
  });

  it('clamps sentimentScore between 0 and 1', async () => {
    const aiResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            sentiment: 'POSITIVE',
            sentimentScore: 5.0,
            category: 'other',
            tags: [],
            summary: 'Test',
            priority: 'LOW',
          }),
        },
      }],
    };

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(aiResponse), { status: 200 })
    );

    const result = await analyzeFeedback('GENERAL', 'Test', 'Great');

    expect(result.sentimentScore).toBe(1);
  });

  it('limits tags to 5 items', async () => {
    const aiResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            sentiment: 'NEUTRAL',
            sentimentScore: 0.5,
            category: 'other',
            tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
            summary: '',
            priority: 'LOW',
          }),
        },
      }],
    };

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(aiResponse), { status: 200 })
    );

    const result = await analyzeFeedback('GENERAL', 'Test', 'Msg');

    expect(result.tags).toHaveLength(5);
  });

  it('sends correct headers and model to OpenRouter', async () => {
    const aiResponse = {
      choices: [{ message: { content: '{"sentiment":"NEUTRAL","sentimentScore":0.5,"category":"other","tags":[],"summary":"","priority":"MEDIUM"}' } }],
    };

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(aiResponse), { status: 200 })
    );

    await analyzeFeedback('BUG', 'Test', 'Message');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      })
    );
  });
});
