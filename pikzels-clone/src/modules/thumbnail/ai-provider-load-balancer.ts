import { CometAIService } from './comet-ai.service';
import { ZenmuxAIService } from './zenmux-ai.service';
import { OpenRouterAIService } from './openrouter-ai.service';
import { AIService } from './ai.service';

/**
 * AI Provider Load Balancer
 *
 * Production-ready load balancer for AI image generation with:
 * - Multi-provider failover
 * - Rate limit detection and handling
 * - Request queuing for high volume
 * - Health monitoring
 * - Usage tracking and analytics
 *
 * Designed for thumbnail maker sites with potentially hundreds of customers
 */

export type ProviderName = 'comet' | 'zenmux' | 'openrouter' | 'openai';

export interface ProviderStatus {
  name: ProviderName;
  healthy: boolean;
  available: boolean;
  rateLimited: boolean;
  rateLimitResetAt?: Date;
  lastError?: string;
  lastErrorAt?: Date;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  currentLoad: number; // Active requests
  maxConcurrent: number;
}

export interface LoadBalancerConfig {
  // Strategy for selecting providers
  strategy: 'round-robin' | 'least-loaded' | 'fastest' | 'weighted' | 'failover-only';

  // Provider weights for weighted strategy (higher = more traffic)
  weights?: Partial<Record<ProviderName, number>>;

  // Maximum concurrent requests per provider
  maxConcurrentPerProvider?: number;

  // Global maximum concurrent requests
  maxConcurrentTotal?: number;

  // Queue settings
  maxQueueSize?: number;
  queueTimeoutMs?: number;

  // Retry settings
  maxRetries?: number;
  retryDelayMs?: number;
  retryBackoffMultiplier?: number;

  // Health check settings
  healthCheckIntervalMs?: number;
  unhealthyThreshold?: number; // Failures before marking unhealthy
  healthyThreshold?: number; // Successes before marking healthy

  // Rate limit handling
  rateLimitCooldownMs?: number;

  // Priority order for failover
  priorityOrder?: ProviderName[];
}

export interface GenerationRequest {
  id: string;
  prompt: string;
  style?: string;
  priority?: 'low' | 'normal' | 'high';
  preferredProvider?: ProviderName;
  excludeProviders?: ProviderName[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface GenerationResult {
  success: boolean;
  images?: string[];
  provider: ProviderName;
  responseTimeMs: number;
  error?: string;
  retries: number;
  queueTimeMs?: number;
}

interface QueuedRequest {
  request: GenerationRequest;
  resolve: (result: GenerationResult) => void;
  reject: (error: Error) => void;
  enqueuedAt: Date;
}

export class AIProviderLoadBalancer {
  private providers: Map<ProviderName, any>;
  private providerStatus: Map<ProviderName, ProviderStatus>;
  private config: Required<LoadBalancerConfig>;
  private requestQueue: QueuedRequest[] = [];
  private activeRequests: Map<string, { provider: ProviderName; startTime: Date }> =
    new Map();
  private roundRobinIndex = 0;
  private healthCheckInterval?: NodeJS.Timeout;
  private queueProcessorInterval?: NodeJS.Timeout;
  private isProcessingQueue = false;

  // Analytics
  private totalRequests = 0;
  private totalSuccesses = 0;
  private totalFailures = 0;
  private totalQueuedRequests = 0;

  // Default configuration
  private static readonly DEFAULT_CONFIG: Required<LoadBalancerConfig> = {
    strategy: 'least-loaded',
    weights: { comet: 3, zenmux: 3, openrouter: 2, openai: 1 },
    maxConcurrentPerProvider: 5,
    maxConcurrentTotal: 15,
    maxQueueSize: 100,
    queueTimeoutMs: 60_000, // JJ: 60s (was 120s — queued requests shouldn't wait 2 min)
    maxRetries: 2,
    retryDelayMs: 2000, // JJ: 2s base (was 1s) — per Gemini API best practices
    retryBackoffMultiplier: 2,
    healthCheckIntervalMs: 30000, // 30 seconds
    unhealthyThreshold: 3,
    healthyThreshold: 2,
    rateLimitCooldownMs: 60000, // 1 minute
    priorityOrder: ['comet', 'zenmux', 'openrouter', 'openai'],
  };

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    this.config = { ...AIProviderLoadBalancer.DEFAULT_CONFIG, ...config };
    this.providers = new Map();
    this.providerStatus = new Map();

    this.initializeProviders();
    this.startHealthChecks();
    this.startQueueProcessor();
  }

  /**
   * Initialize all available providers
   */
  private initializeProviders(): void {
    // Initialize CometAPI
    const cometService = new CometAIService();
    if (cometService.isConfigured()) {
      this.providers.set('comet', cometService);
      this.initializeProviderStatus('comet');
    }

    // Initialize ZenMux
    const zenmuxService = new ZenmuxAIService();
    if (zenmuxService.isConfigured()) {
      this.providers.set('zenmux', zenmuxService);
      this.initializeProviderStatus('zenmux');
    }

    // Initialize OpenRouter
    const openrouterService = new OpenRouterAIService();
    if (openrouterService.isConfigured()) {
      this.providers.set('openrouter', openrouterService);
      this.initializeProviderStatus('openrouter');
    }

    // Initialize OpenAI (if available)
    try {
      const openaiService = new AIService();
      if (openaiService.isConfigured()) {
        this.providers.set('openai', openaiService);
        this.initializeProviderStatus('openai');
      }
    } catch {
      // OpenAI service may not be available
    }

    console.log(
      `[LoadBalancer] Initialized with ${this.providers.size} providers:`,
      Array.from(this.providers.keys()).join(', ')
    );
  }

  /**
   * Initialize status tracking for a provider
   */
  private initializeProviderStatus(name: ProviderName): void {
    this.providerStatus.set(name, {
      name,
      healthy: true,
      available: true,
      rateLimited: false,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      currentLoad: 0,
      maxConcurrent: this.config.maxConcurrentPerProvider,
    });
  }

  /**
   * Generate images with automatic load balancing and failover
   */
  async generateImages(request: Omit<GenerationRequest, 'id' | 'createdAt'>): Promise<GenerationResult> {
    const fullRequest: GenerationRequest = {
      ...request,
      id: this.generateRequestId(),
      createdAt: new Date(),
      priority: request.priority || 'normal',
    };

    this.totalRequests++;

    // Check if we can process immediately or need to queue
    if (this.shouldQueue()) {
      return this.enqueueRequest(fullRequest);
    }

    return this.processRequest(fullRequest);
  }

  /**
   * Check if request should be queued
   */
  private shouldQueue(): boolean {
    const totalActive = this.activeRequests.size;
    return totalActive >= this.config.maxConcurrentTotal;
  }

  /**
   * Enqueue a request for later processing
   */
  private enqueueRequest(request: GenerationRequest): Promise<GenerationResult> {
    if (this.requestQueue.length >= this.config.maxQueueSize) {
      return Promise.resolve({
        success: false,
        provider: 'comet' as ProviderName,
        responseTimeMs: 0,
        error: 'Queue is full. Please try again later.',
        retries: 0,
      });
    }

    this.totalQueuedRequests++;

    return new Promise((resolve, reject) => {
      // Insert based on priority
      const queuedRequest: QueuedRequest = {
        request,
        resolve,
        reject,
        enqueuedAt: new Date(),
      };

      if (request.priority === 'high') {
        // Find first non-high priority request and insert before it
        const insertIndex = this.requestQueue.findIndex(
          (r) => r.request.priority !== 'high'
        );
        if (insertIndex === -1) {
          this.requestQueue.push(queuedRequest);
        } else {
          this.requestQueue.splice(insertIndex, 0, queuedRequest);
        }
      } else if (request.priority === 'low') {
        this.requestQueue.push(queuedRequest);
      } else {
        // Normal priority - insert after high priority requests
        const insertIndex = this.requestQueue.findIndex(
          (r) => r.request.priority === 'low'
        );
        if (insertIndex === -1) {
          this.requestQueue.push(queuedRequest);
        } else {
          this.requestQueue.splice(insertIndex, 0, queuedRequest);
        }
      }

      console.log(
        `[LoadBalancer] Request ${request.id} queued. Queue size: ${this.requestQueue.length}`
      );
    });
  }

  /**
   * Process a single request with retries and failover
   */
  private async processRequest(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    let lastError: string | undefined;
    let retries = 0;
    const triedProviders: Set<ProviderName> = new Set();

    while (retries <= this.config.maxRetries) {
      // Select a provider
      const provider = this.selectProvider(request, triedProviders);

      if (!provider) {
        // No available providers
        return {
          success: false,
          provider: 'comet' as ProviderName,
          responseTimeMs: Date.now() - startTime,
          error: lastError || 'No available providers',
          retries,
        };
      }

      triedProviders.add(provider);

      try {
        const result = await this.callProvider(provider, request);
        this.totalSuccesses++;

        return {
          success: true,
          images: result,
          provider,
          responseTimeMs: Date.now() - startTime,
          retries,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.handleProviderError(provider, lastError);

        // Check if we should retry
        if (this.isRetryableError(lastError)) {
          retries++;
          if (retries <= this.config.maxRetries) {
            // JJ: Exponential backoff with jitter to prevent thundering herd
            const baseDelay =
              this.config.retryDelayMs *
              Math.pow(this.config.retryBackoffMultiplier, retries - 1);
            const jitter = Math.random() * 1000; // 0-1s random jitter
            await this.sleep(baseDelay + jitter);
          }
        } else {
          // Non-retryable error, try next provider
          retries++;
        }
      }
    }

    this.totalFailures++;

    return {
      success: false,
      provider: Array.from(triedProviders)[0] || ('comet' as ProviderName),
      responseTimeMs: Date.now() - startTime,
      error: lastError || 'All providers failed',
      retries,
    };
  }

  /**
   * Select the best provider based on strategy
   */
  private selectProvider(
    request: GenerationRequest,
    exclude: Set<ProviderName>
  ): ProviderName | null {
    // Get available providers
    const available = this.getAvailableProviders(request, exclude);

    if (available.length === 0) {
      return null;
    }

    // If preferred provider is available, use it
    if (request.preferredProvider && available.includes(request.preferredProvider)) {
      return request.preferredProvider;
    }

    switch (this.config.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(available);

      case 'least-loaded':
        return this.selectLeastLoaded(available);

      case 'fastest':
        return this.selectFastest(available);

      case 'weighted':
        return this.selectWeighted(available);

      case 'failover-only':
        return this.selectFailover(available);

      default:
        return available[0]!;
    }
  }

  /**
   * Get list of available providers
   */
  private getAvailableProviders(
    request: GenerationRequest,
    exclude: Set<ProviderName>
  ): ProviderName[] {
    const available: ProviderName[] = [];

    for (const [name, status] of this.providerStatus) {
      // Skip excluded providers
      if (exclude.has(name)) continue;
      if (request.excludeProviders?.includes(name)) continue;

      // Check if provider is available
      if (!status.healthy) continue;
      if (!status.available) continue;
      if (status.rateLimited) {
        // Check if cooldown has passed
        if (status.rateLimitResetAt && status.rateLimitResetAt > new Date()) {
          continue;
        }
        // Reset rate limit status
        status.rateLimited = false;
        delete status.rateLimitResetAt;
      }

      // Check if provider has capacity
      if (status.currentLoad >= status.maxConcurrent) continue;

      available.push(name);
    }

    // Sort by priority order if using failover
    if (this.config.strategy === 'failover-only') {
      available.sort((a, b) => {
        const aIndex = this.config.priorityOrder.indexOf(a);
        const bIndex = this.config.priorityOrder.indexOf(b);
        return aIndex - bIndex;
      });
    }

    return available;
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(available: ProviderName[]): ProviderName {
    const index = this.roundRobinIndex % available.length;
    this.roundRobinIndex++;
    return available[index]!;
  }

  /**
   * Select provider with lowest current load
   */
  private selectLeastLoaded(available: ProviderName[]): ProviderName {
    let minLoad = Infinity;
    let selected = available[0]!;

    for (const name of available) {
      const status = this.providerStatus.get(name);
      if (status && status.currentLoad < minLoad) {
        minLoad = status.currentLoad;
        selected = name;
      }
    }

    return selected;
  }

  /**
   * Select provider with fastest average response time
   */
  private selectFastest(available: ProviderName[]): ProviderName {
    let minTime = Infinity;
    let selected = available[0]!;

    for (const name of available) {
      const status = this.providerStatus.get(name);
      if (status && status.averageResponseTime < minTime && status.successCount > 0) {
        minTime = status.averageResponseTime;
        selected = name;
      }
    }

    return selected;
  }

  /**
   * Weighted random selection
   */
  private selectWeighted(available: ProviderName[]): ProviderName {
    const weights = available.map((name) => this.config.weights[name] || 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < available.length; i++) {
      random -= weights[i]!;
      if (random <= 0) {
        return available[i]!;
      }
    }

    return available[available.length - 1]!;
  }

  /**
   * Failover selection (strict priority order)
   */
  private selectFailover(available: ProviderName[]): ProviderName {
    // Available is already sorted by priority
    return available[0]!;
  }

  /**
   * Call a specific provider
   */
  private async callProvider(
    providerName: ProviderName,
    request: GenerationRequest
  ): Promise<string[]> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not available`);
    }

    const status = this.providerStatus.get(providerName)!;
    status.currentLoad++;
    this.activeRequests.set(request.id, {
      provider: providerName,
      startTime: new Date(),
    });

    const startTime = Date.now();

    try {
      let images: string[];

      switch (providerName) {
        case 'comet':
          images = await provider.generateImages(request.prompt, request.style);
          break;

        case 'zenmux':
          images = await provider.generateImages(request.prompt, request.style);
          break;

        case 'openrouter':
          images = await provider.generateImages(
            request.prompt,
            undefined, // Use default model
            request.style
          );
          break;

        case 'openai':
          images = await provider.generateThumbnails(
            request.prompt,
            request.style,
            1
          );
          break;

        default:
          throw new Error(`Unknown provider: ${providerName}`);
      }

      // Update success metrics
      const responseTime = Date.now() - startTime;
      this.updateProviderMetrics(providerName, true, responseTime);

      return images;
    } catch (error) {
      // Update failure metrics
      const responseTime = Date.now() - startTime;
      this.updateProviderMetrics(providerName, false, responseTime);
      throw error;
    } finally {
      status.currentLoad--;
      this.activeRequests.delete(request.id);
    }
  }

  /**
   * Update provider metrics after a request
   */
  private updateProviderMetrics(
    providerName: ProviderName,
    success: boolean,
    responseTime: number
  ): void {
    const status = this.providerStatus.get(providerName);
    if (!status) return;

    if (success) {
      status.successCount++;
      // Update rolling average response time
      status.averageResponseTime =
        (status.averageResponseTime * (status.successCount - 1) + responseTime) /
        status.successCount;

      // Check if we should mark as healthy again
      if (!status.healthy) {
        const recentSuccesses = status.successCount;
        if (recentSuccesses >= this.config.healthyThreshold) {
          status.healthy = true;
          console.log(`[LoadBalancer] Provider ${providerName} marked healthy`);
        }
      }
    } else {
      status.failureCount++;

      // Check if we should mark as unhealthy
      if (status.healthy) {
        // Check recent failure rate
        const totalRecent = status.successCount + status.failureCount;
        if (totalRecent >= 5) {
          const failureRate = status.failureCount / totalRecent;
          if (failureRate > 0.5 || status.failureCount >= this.config.unhealthyThreshold) {
            status.healthy = false;
            console.log(
              `[LoadBalancer] Provider ${providerName} marked unhealthy (failure rate: ${failureRate})`
            );
          }
        }
      }
    }
  }

  /**
   * Handle provider error
   */
  private handleProviderError(providerName: ProviderName, error: string): void {
    const status = this.providerStatus.get(providerName);
    if (!status) return;

    status.lastError = error;
    status.lastErrorAt = new Date();

    // Check for rate limiting
    if (this.isRateLimitError(error)) {
      status.rateLimited = true;
      status.rateLimitResetAt = new Date(
        Date.now() + this.config.rateLimitCooldownMs
      );
      console.log(
        `[LoadBalancer] Provider ${providerName} rate limited until ${status.rateLimitResetAt}`
      );
    }
  }

  /**
   * Check if error indicates rate limiting
   */
  private isRateLimitError(error: string): boolean {
    const rateLimitPatterns = [
      'rate limit',
      '429',
      'too many requests',
      'quota exceeded',
      'throttl',
    ];
    const lowerError = error.toLowerCase();
    return rateLimitPatterns.some((pattern) => lowerError.includes(pattern));
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: string): boolean {
    const nonRetryablePatterns = [
      'invalid api key',
      'authentication',
      'unauthorized',
      'forbidden',
      'not found',
      'invalid prompt',
      'content policy',
      'insufficient credits',   // JJ: billing issues, retrying won't help
      'model may not support',  // JJ: wrong model selected, retrying same model is pointless
    ];
    const lowerError = error.toLowerCase();
    return !nonRetryablePatterns.some((pattern) => lowerError.includes(pattern));
  }

  /**
   * Start health check interval
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.healthCheckIntervalMs
    );
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    for (const [name, status] of this.providerStatus) {
      // Reset rate limit if cooldown has passed
      if (status.rateLimited && status.rateLimitResetAt) {
        if (new Date() >= status.rateLimitResetAt) {
          status.rateLimited = false;
          delete status.rateLimitResetAt;
          console.log(`[LoadBalancer] Provider ${name} rate limit cooldown expired`);
        }
      }

      // Optionally perform active health checks
      // (For now, we rely on passive health monitoring from actual requests)
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    this.queueProcessorInterval = setInterval(
      () => this.processQueue(),
      100 // Check queue every 100ms
    );
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    if (this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;

    try {
      while (this.requestQueue.length > 0 && !this.shouldQueue()) {
        const queued = this.requestQueue.shift();
        if (!queued) break;

        // Check for timeout
        const queueTime = Date.now() - queued.enqueuedAt.getTime();
        if (queueTime > this.config.queueTimeoutMs) {
          queued.resolve({
            success: false,
            provider: 'comet' as ProviderName,
            responseTimeMs: 0,
            error: 'Request timed out in queue',
            retries: 0,
            queueTimeMs: queueTime,
          });
          continue;
        }

        // Process the request
        this.processRequest(queued.request)
          .then((result) => {
            result.queueTimeMs = queueTime;
            queued.resolve(result);
          })
          .catch((error) => {
            queued.reject(error);
          });
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get current status of all providers
   */
  getStatus(): {
    providers: ProviderStatus[];
    queue: { size: number; oldestRequestAge?: number };
    stats: {
      totalRequests: number;
      totalSuccesses: number;
      totalFailures: number;
      successRate: number;
      activeRequests: number;
    };
  } {
    const oldestRequest = this.requestQueue[0];

    return {
      providers: Array.from(this.providerStatus.values()),
      queue: {
        size: this.requestQueue.length,
        ...(oldestRequest && { oldestRequestAge: Date.now() - oldestRequest.enqueuedAt.getTime() }),
      },
      stats: {
        totalRequests: this.totalRequests,
        totalSuccesses: this.totalSuccesses,
        totalFailures: this.totalFailures,
        successRate:
          this.totalRequests > 0
            ? this.totalSuccesses / this.totalRequests
            : 0,
        activeRequests: this.activeRequests.size,
      },
    };
  }

  /**
   * Get available provider count
   */
  getAvailableProviderCount(): number {
    let count = 0;
    for (const status of this.providerStatus.values()) {
      if (status.healthy && status.available && !status.rateLimited) {
        count++;
      }
    }
    return count;
  }

  /**
   * Manually reset a provider's status
   */
  resetProvider(providerName: ProviderName): void {
    const status = this.providerStatus.get(providerName);
    if (status) {
      status.healthy = true;
      status.rateLimited = false;
      delete status.rateLimitResetAt;
      delete status.lastError;
      delete status.lastErrorAt;
      status.successCount = 0;
      status.failureCount = 0;
      console.log(`[LoadBalancer] Provider ${providerName} reset`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[LoadBalancer] Configuration updated');
  }

  /**
   * Shutdown the load balancer
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
    }

    // Reject all queued requests
    while (this.requestQueue.length > 0) {
      const queued = this.requestQueue.shift();
      if (queued) {
        queued.reject(new Error('Load balancer shutting down'));
      }
    }

    console.log('[LoadBalancer] Shutdown complete');
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance for easy use
let loadBalancerInstance: AIProviderLoadBalancer | null = null;

export function getLoadBalancer(
  config?: Partial<LoadBalancerConfig>
): AIProviderLoadBalancer {
  if (!loadBalancerInstance) {
    loadBalancerInstance = new AIProviderLoadBalancer(config);
  }
  return loadBalancerInstance;
}

export function resetLoadBalancer(): void {
  if (loadBalancerInstance) {
    loadBalancerInstance.shutdown();
    loadBalancerInstance = null;
  }
}
