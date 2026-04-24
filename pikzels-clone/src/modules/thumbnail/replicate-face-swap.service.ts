import fetch from 'node-fetch';
import { logger } from '../../utils/logger';

/**
 * ReplicateFaceSwapService
 *
 * Pipeline:
 *   Step 1 (always):  fofr/face-swap-with-ideogram  — Ideogram Character model
 *                     High-quality face placement into target scene
 *                     Inputs: character_image + target_image + optional prompt
 *
 *   Step 2 (pro tier only): reve/remix — Reve composition polish
 *                     $0.04/run · ~10s · always-warm official model
 *                     Enhances lighting/composition while preserving the swapped face
 *
 * Calling convention:
 *   - Uses `Prefer: wait` header for sync mode (Replicate holds connection up to 60s)
 *   - Falls back to polling if the response comes back as 'processing'
 *   - Both models routed through `runPrediction` helper
 *
 * Model env vars (12-Factor):
 *   REPLICATE_MODEL_FACE_SWAP     — defaults to fofr/face-swap-with-ideogram
 *   REPLICATE_MODEL_REVE_REMIX    — defaults to reve/remix
 */

// ─── Constants ─────────────────────────────────────────────────────────────

const FACE_SWAP_MODEL_DEFAULT = 'mertguvencli/face-swap-with-indexes';
const REVE_REMIX_MODEL_DEFAULT = 'reve/remix';

// Latest version hashes for community (non-official) models.
// Official Replicate models support /models/{owner}/{name}/predictions.
// Community models require the versioned /predictions endpoint with an explicit version ID.
const COMMUNITY_MODEL_VERSIONS: Record<string, string> = {
  // lucataco/faceswap — 27M runs, InsightFace inswapper, simple swap_image + target_image
  'lucataco/faceswap': '9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d',
  // mertguvencli/face-swap-with-indexes — index-based multi-face (upgrade path)
  'mertguvencli/face-swap-with-indexes': '518f2116425c40acb5c234031c55daf843c1357eff784370fe9489e57b65c150',
  // NOTE: fofr/face-swap-with-ideogram is a deployment model — no version hash, uses /models/ endpoint
};

const PREDICTION_TIMEOUT = 180_000;  // 180s — fofr cold boot ~85s, warm ~15-20s; Reve ~15s
const POLL_INTERVAL      = 1_000;   // 1s between polls

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FaceSwapOptions {
  /** Which face in the target image to replace (0 = leftmost, default 0) */
  targetFaceIndex?: number;
  /**
   * 'standard' — InsightFace only  (~3s, $0.00061)
   * 'pro'      — InsightFace + Reve Remix polish  (~13s, $0.04061)
   */
  tier?: 'flash' | 'standard' | 'pro';
}

export interface FaceSwapResult {
  /** URL of the final output image (Replicate CDN) */
  url: string;
  /** Pipeline stages that ran */
  pipeline: 'insightface' | 'insightface+reve';
}

// ─── Service ────────────────────────────────────────────────────────────────

export class ReplicateFaceSwapService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly faceSwapModel: string;
  private readonly reveRemixModel: string;

  constructor() {
    this.apiKey       = process.env.REPLICATE_API_KEY || '';
    this.baseUrl      = process.env.REPLICATE_API_URL || 'https://api.replicate.com/v1';
    this.faceSwapModel = process.env.REPLICATE_MODEL_FACE_SWAP || FACE_SWAP_MODEL_DEFAULT;
    this.reveRemixModel = process.env.REPLICATE_MODEL_REVE_REMIX || REVE_REMIX_MODEL_DEFAULT;

    if (!this.apiKey) {
      logger.warn('[FaceSwap] REPLICATE_API_KEY not set — face swap will fail at runtime');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: swapFace
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Swap a face in a target thumbnail.
   *
   * @param sourceImageUrl  HTTP URL to the face-donor image (uploaded to Cloudinary)
   * @param targetImageUrl  HTTP URL to the thumbnail where face will be placed
   * @param options         targetFaceIndex (0-based) and tier ('standard'|'pro')
   */
  async swapFace(
    sourceImageUrl: string,
    targetImageUrl: string,
    options: FaceSwapOptions = {}
  ): Promise<FaceSwapResult> {
    if (!this.isConfigured()) {
      throw new Error('Replicate API key not configured');
    }

    const targetFaceIndex = options.targetFaceIndex ?? 0;
    const tier            = options.tier ?? 'standard';

    logger.info('[FaceSwap] Starting pipeline', {
      tier,
      targetFaceIndex,
      model: this.faceSwapModel,
    });

    // ── Step 1: InsightFace swap ────────────────────────────────────────────
    const swappedUrl = await this.runInsightFaceSwap(
      sourceImageUrl,
      targetImageUrl,
      targetFaceIndex
    );

    logger.info('[FaceSwap] Step 1 complete — InsightFace swap', { swappedUrl });

    // ── Step 2: Reve Remix polish (pro tier only) ───────────────────────────
    if (tier === 'pro') {
      logger.info('[FaceSwap] Step 2 starting — Reve Remix polish');
      try {
        const polishedUrl = await this.runReveRemixPolish(swappedUrl, targetImageUrl);
        logger.info('[FaceSwap] Step 2 complete — Reve Remix polish', { polishedUrl });
        return { url: polishedUrl, pipeline: 'insightface+reve' };
      } catch (reveError) {
        // Reve failing must not block the user — return the InsightFace result
        logger.warn('[FaceSwap] Reve Remix failed, returning InsightFace result', {
          error: (reveError as Error).message,
        });
        return { url: swappedUrl, pipeline: 'insightface' };
      }
    }

    return { url: swappedUrl, pipeline: 'insightface' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: Step 1 — InsightFace
  // ─────────────────────────────────────────────────────────────────────────

  private async runInsightFaceSwap(
    sourceImageUrl: string,
    targetImageUrl: string,
    targetFaceIndex: number
  ): Promise<string> {
    const isMertModel  = this.faceSwapModel === 'mertguvencli/face-swap-with-indexes';
    const isFofrModel  = this.faceSwapModel === 'fofr/face-swap-with-ideogram';

    let input: Record<string, unknown>;

    if (isFofrModel) {
      // fofr/face-swap-with-ideogram — Ideogram Character model
      // character_image = the face donor, target_image = the thumbnail to place into
      input = {
        character_image: sourceImageUrl,
        target_image:    targetImageUrl,
        // No prompt = Claude auto-generates one from the target image
        cleanup:         false,  // skip Nano Banana pass (we handle polish in step 2 if pro tier)
      };
    } else if (isMertModel) {
      // mertguvencli/face-swap-with-indexes — InsightFace, index-based
      input = {
        execution_type:         'face_swap',
        source_face_image:      sourceImageUrl,
        destination_image:      targetImageUrl,
        source_face_index:      0,
        destination_face_index: targetFaceIndex,
      };
    } else {
      // lucataco/faceswap — simple InsightFace inswapper
      input = {
        swap_image:   sourceImageUrl,
        target_image: targetImageUrl,
      };
    }

    const prediction = await this.runPrediction(this.faceSwapModel, input);

    const output = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (!output || typeof output !== 'string') {
      throw new Error(`[FaceSwap] Model returned unexpected output: ${JSON.stringify(prediction.output)}`);
    }

    return output;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: Step 2 — Reve Remix
  // ─────────────────────────────────────────────────────────────────────────

  private async runReveRemixPolish(
    swappedUrl: string,
    originalThumbnailUrl: string
  ): Promise<string> {
    // <img1> = the face-swapped result (primary)
    // <img2> = original thumbnail (lighting/composition reference only)
    const prompt =
      'Enhance <img1> with cinematic lighting, professional color grading, and sharp detail. ' +
      'Use <img2> only as a reference for background composition and lighting direction. ' +
      'Preserve all faces, expressions, and text in <img1> exactly as shown. ' +
      'Do not change the identity or appearance of any person.';

    const input: Record<string, unknown> = {
      image_urls: [swappedUrl, originalThumbnailUrl],
      prompt,
      aspect_ratio: '16:9',
    };

    const prediction = await this.runPrediction(this.reveRemixModel, input);

    const output = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (!output || typeof output !== 'string') {
      throw new Error(`[FaceSwap] Reve Remix returned unexpected output: ${JSON.stringify(prediction.output)}`);
    }

    return output;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: Core Replicate prediction runner (sync + poll fallback)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Submit a Replicate prediction and return the completed result.
   *
   * Uses `Prefer: wait` for sync mode (holds HTTP connection for ~3s face swap).
   * If the server returns 'processing' (202 / cold boot), falls back to polling.
   */
  private async runPrediction(
    model: string,
    input: Record<string, unknown>
  ): Promise<any> {
    const hasVersion    = model.includes(':');
    // Community models need the versioned /predictions endpoint
    const communityVersion = COMMUNITY_MODEL_VERSIONS[model];
    // Deployment models (like fofr/*) use /models/{owner}/{name}/predictions with NO version

    let endpoint: string;
    let requestBody: Record<string, unknown>;

    if (hasVersion) {
      // Explicit version hash passed as "owner/name:version"
      endpoint = `${this.baseUrl}/predictions`;
      requestBody = { version: model.split(':')[1], input };
    } else if (communityVersion) {
      // Community model — use versioned endpoint
      endpoint = `${this.baseUrl}/predictions`;
      requestBody = { version: communityVersion, input };
    } else {
      // Deployment / official model — use models/{owner}/{name}/predictions (no version)
      endpoint = `${this.baseUrl}/models/${model}/predictions`;
      requestBody = { input };
    }

    const createRes = await fetch(endpoint, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Prefer:         'wait',          // Replicate sync mode
      },
      body: JSON.stringify(requestBody),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      throw Object.assign(
        new Error(`[FaceSwap] Replicate error (${createRes.status}): ${text}`),
        { statusCode: createRes.status }
      );
    }

    const prediction = await createRes.json() as any;
    return this.awaitPrediction(prediction);
  }

  /**
   * If the prediction already succeeded (sync mode), return immediately.
   * Otherwise poll until done or timeout.
   */
  private async awaitPrediction(prediction: any): Promise<any> {
    if (prediction.status === 'succeeded') return prediction;

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || '[FaceSwap] Prediction failed immediately');
    }

    const startTime = Date.now();

    while (
      prediction.status !== 'succeeded' &&
      prediction.status !== 'failed' &&
      prediction.status !== 'canceled'
    ) {
      if (Date.now() - startTime > PREDICTION_TIMEOUT) {
        // Attempt cancel to avoid billing for a stuck prediction
        try {
          await fetch(`${this.baseUrl}/predictions/${prediction.id}/cancel`, {
            method:  'POST',
            headers: { Authorization: `Bearer ${this.apiKey}` },
          });
        } catch { /* ignore */ }
        throw new Error(`[FaceSwap] Prediction timed out after ${PREDICTION_TIMEOUT / 1000}s`);
      }

      await sleep(POLL_INTERVAL);

      const pollUrl = prediction.urls?.get ?? `${this.baseUrl}/predictions/${prediction.id}`;
      const pollRes  = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!pollRes.ok) {
        throw new Error(`[FaceSwap] Poll failed (${pollRes.status})`);
      }

      Object.assign(prediction, await pollRes.json());
    }

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || '[FaceSwap] Prediction failed');
    }
    if (prediction.status === 'canceled') {
      throw new Error('[FaceSwap] Prediction was canceled');
    }

    return prediction;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: ReplicateFaceSwapService | null = null;

export function getFaceSwapService(): ReplicateFaceSwapService {
  if (!_instance) {
    _instance = new ReplicateFaceSwapService();
  }
  return _instance;
}

// ─── Utility ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
