import { Logger } from '../../utils/logger';
import { SecurityManager } from '../../security/manager';

export interface ModelCapabilities {
  maxTokens: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsFunctions: boolean;
  contextWindow: number;
  costPer1kTokens: {
    input: number;
    output: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: ModelCapabilities;
  description?: string;
  deprecated?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: Tool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Partial<ToolCall>[];
    };
    finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  }[];
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  rateLimitRpm?: number;
  rateLimitTpm?: number;
}

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageLatency: number;
  lastRequestTime?: Date;
  rateLimitHits: number;
}

export abstract class BaseProvider {
  protected logger: Logger;
  protected security: SecurityManager;
  protected config: ProviderConfig;
  protected metrics: ProviderMetrics;
  protected rateLimiter?: any;

  constructor(
    protected name: string,
    config: ProviderConfig,
    security: SecurityManager
  ) {
    this.logger = new Logger(`Provider:${name}`);
    this.security = security;
    this.config = config;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageLatency: 0,
      rateLimitHits: 0
    };
    this.initializeRateLimiter();
  }

  protected initializeRateLimiter(): void {
    if (this.config.rateLimitRpm || this.config.rateLimitTpm) {
      // Rate limiter implementation would go here
      // Using a simple in-memory rate limiter for now
    }
  }

  protected async checkRateLimit(): Promise<void> {
    // Rate limiting logic
    if (this.rateLimiter) {
      try {
        await this.rateLimiter.consume(1);
      } catch (error) {
        this.metrics.rateLimitHits++;
        throw new Error('Rate limit exceeded');
      }
    }
  }

  protected updateMetrics(success: boolean, tokens?: number, latency?: number, cost?: number): void {
    this.metrics.totalRequests++;
    this.metrics.lastRequestTime = new Date();
    
    if (success) {
      this.metrics.successfulRequests++;
      if (tokens) {
        this.metrics.totalTokensUsed += tokens;
      }
      if (cost) {
        this.metrics.totalCost += cost;
      }
    } else {
      this.metrics.failedRequests++;
    }
    
    if (latency) {
      const totalLatency = this.metrics.averageLatency * (this.metrics.totalRequests - 1) + latency;
      this.metrics.averageLatency = totalLatency / this.metrics.totalRequests;
    }
  }

  protected calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelInfo = this.getModelInfo(model);
    if (!modelInfo) return 0;
    
    const inputCost = (inputTokens / 1000) * modelInfo.capabilities.costPer1kTokens.input;
    const outputCost = (outputTokens / 1000) * modelInfo.capabilities.costPer1kTokens.output;
    
    return inputCost + outputCost;
  }

  protected async makeRequest(
    url: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<Response> {
    const startTime = Date.now();
    
    try {
      await this.checkRateLimit();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429 && retryCount < (this.config.maxRetries || 3)) {
          const retryDelay = this.config.retryDelay || 1000;
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount)));
          return this.makeRequest(url, options, retryCount + 1);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const latency = Date.now() - startTime;
      this.updateMetrics(true, undefined, latency);
      
      return response;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateMetrics(false, undefined, latency);
      
      if (retryCount < (this.config.maxRetries || 3)) {
        const retryDelay = this.config.retryDelay || 1000;
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount)));
        return this.makeRequest(url, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Abstract methods that must be implemented by providers
  abstract getAvailableModels(): ModelInfo[];
  abstract getModelInfo(modelId: string): ModelInfo | null;
  abstract createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  abstract createStreamingChatCompletion(request: ChatCompletionRequest): AsyncIterable<StreamChunk>;
  abstract validateConfig(): Promise<boolean>;

  // Common methods
  public getName(): string {
    return this.name;
  }

  public getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageLatency: 0,
      rateLimitHits: 0
    };
  }

  public updateConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeRateLimiter();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      return await this.validateConfig();
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  public dispose(): void {
    // Cleanup resources
    this.rateLimiter = undefined;
  }
}