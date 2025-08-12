import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { SecurityManager } from '../security/manager';
import { ConfigManager } from '../config/manager';
import {
  BaseProvider,
  ModelInfo,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
  ProviderConfig,
  ProviderMetrics
} from './providers/base';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';

export interface ModelSelectionCriteria {
  taskComplexity: 'low' | 'medium' | 'high';
  latencyRequirement: 'low' | 'medium' | 'high';
  costSensitivity: 'low' | 'medium' | 'high';
  requiresVision?: boolean;
  requiresTools?: boolean;
  maxTokens?: number;
  preferredProvider?: string;
}

export interface ModelRecommendation {
  model: ModelInfo;
  provider: BaseProvider;
  score: number;
  reasoning: string;
}

export interface LoadBalancingConfig {
  enabled: boolean;
  strategy: 'round-robin' | 'least-loaded' | 'fastest' | 'cheapest';
  healthCheckInterval: number;
  failoverEnabled: boolean;
}

export class ModelManager {
  private logger: Logger;
  private security: SecurityManager;
  private config: ConfigManager;
  private providers: Map<string, BaseProvider> = new Map();
  private modelCache: Map<string, ModelInfo[]> = new Map();
  private loadBalancing: LoadBalancingConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private requestCounts: Map<string, number> = new Map();

  constructor(security: SecurityManager, config: ConfigManager) {
    this.logger = new Logger('ModelManager');
    this.security = security;
    this.config = config;
    this.loadBalancing = this.loadLoadBalancingConfig();
    this.initializeProviders();
    this.startHealthChecks();
  }

  private getProviderConfig(provider: string): ProviderConfig | null {
    const credentials = this.config.getAllCredentials();
    
    switch (provider) {
      case 'openai':
        if (credentials.openaiApiKey) {
          return {
            apiKey: credentials.openaiApiKey,
            baseUrl: this.config.getConfig('customApiEndpoint'),
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000
          };
        }
        break;
      case 'anthropic':
        if (credentials.anthropicApiKey) {
          return {
            apiKey: credentials.anthropicApiKey,
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000
          };
        }
        break;
      // Add more providers as needed
    }
    
    return null;
  }

  private loadLoadBalancingConfig(): LoadBalancingConfig {
    const config = vscode.workspace.getConfiguration('cline.loadBalancing');
    return {
      enabled: config.get('enabled', true),
      strategy: config.get('strategy', 'least-loaded'),
      healthCheckInterval: config.get('healthCheckInterval', 60000),
      failoverEnabled: config.get('failoverEnabled', true)
    };
  }

  private async initializeProviders(): Promise<void> {
    this.logger.info('Initializing AI providers...');

    // Initialize OpenAI provider
    const openaiConfig = this.getProviderConfig('openai');
    if (openaiConfig?.apiKey) {
      try {
        const provider = new OpenAIProvider(openaiConfig, this.security);
        if (await provider.validateConfig()) {
          this.providers.set('openai', provider);
          this.logger.info('OpenAI provider initialized successfully');
        } else {
          this.logger.warn('OpenAI provider validation failed');
        }
      } catch (error) {
        this.logger.error('Failed to initialize OpenAI provider', error);
      }
    }

    // Initialize Anthropic provider
    const anthropicConfig = this.getProviderConfig('anthropic');
    if (anthropicConfig?.apiKey) {
      try {
        const provider = new AnthropicProvider(anthropicConfig, this.security);
        if (await provider.validateConfig()) {
          this.providers.set('anthropic', provider);
          this.logger.info('Anthropic provider initialized successfully');
        } else {
          this.logger.warn('Anthropic provider validation failed');
        }
      } catch (error) {
        this.logger.error('Failed to initialize Anthropic provider', error);
      }
    }

    // TODO: Add more providers (Azure, AWS Bedrock, Google, etc.)
    
    this.logger.info(`Initialized ${this.providers.size} providers`);
  }

  private startHealthChecks(): void {
    if (!this.loadBalancing.enabled) return;

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.loadBalancing.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      try {
        const isHealthy = await provider.healthCheck();
        if (!isHealthy) {
          this.logger.warn(`Provider ${name} failed health check`);
        }
        return { name, healthy: isHealthy };
      } catch (error) {
        this.logger.error(`Health check failed for provider ${name}`, error);
        return { name, healthy: false };
      }
    });

    const results = await Promise.all(healthPromises);
    const unhealthyProviders = results.filter(r => !r.healthy);
    
    if (unhealthyProviders.length > 0) {
      this.logger.warn(`${unhealthyProviders.length} providers are unhealthy: ${unhealthyProviders.map(p => p.name).join(', ')}`);
    }
  }

  public async getAllModels(): Promise<ModelInfo[]> {
    const allModels: ModelInfo[] = [];
    
    for (const [providerName, provider] of this.providers.entries()) {
      try {
        let models = this.modelCache.get(providerName);
        if (!models) {
          models = provider.getAvailableModels();
          this.modelCache.set(providerName, models);
        }
        allModels.push(...models);
      } catch (error) {
        this.logger.error(`Failed to get models from provider ${providerName}`, error);
      }
    }
    
    return allModels;
  }

  public async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    for (const provider of this.providers.values()) {
      const modelInfo = provider.getModelInfo(modelId);
      if (modelInfo) {
        return modelInfo;
      }
    }
    return null;
  }

  public async recommendModel(criteria: ModelSelectionCriteria): Promise<ModelRecommendation[]> {
    const allModels = await this.getAllModels();
    const recommendations: ModelRecommendation[] = [];

    for (const model of allModels) {
      const provider = this.getProviderForModel(model.id);
      if (!provider) continue;

      const score = this.calculateModelScore(model, criteria);
      const reasoning = this.generateRecommendationReasoning(model, criteria, score);

      recommendations.push({
        model,
        provider,
        score,
        reasoning
      });
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  private calculateModelScore(model: ModelInfo, criteria: ModelSelectionCriteria): number {
    let score = 0;
    const weights = {
      complexity: 0.3,
      latency: 0.25,
      cost: 0.25,
      features: 0.2
    };

    // Task complexity scoring
    if (criteria.taskComplexity === 'high') {
      if (model.capabilities.contextWindow > 100000) score += 30;
      if (model.id.includes('gpt-4') || model.id.includes('opus')) score += 25;
    } else if (criteria.taskComplexity === 'medium') {
      if (model.capabilities.contextWindow > 16000) score += 20;
      if (model.id.includes('sonnet') || model.id.includes('gpt-3.5')) score += 15;
    } else {
      if (model.id.includes('haiku') || model.id.includes('gpt-3.5')) score += 20;
    }

    // Latency scoring (inverse of typical response time)
    if (criteria.latencyRequirement === 'high') {
      if (model.id.includes('haiku')) score += 25;
      if (model.id.includes('gpt-3.5')) score += 20;
    }

    // Cost scoring (inverse of cost)
    if (criteria.costSensitivity === 'high') {
      const avgCost = (model.capabilities.costPer1kTokens.input + model.capabilities.costPer1kTokens.output) / 2;
      if (avgCost < 0.002) score += 25;
      else if (avgCost < 0.01) score += 15;
      else if (avgCost < 0.03) score += 10;
    }

    // Feature requirements
    if (criteria.requiresVision && model.capabilities.supportsVision) score += 20;
    if (criteria.requiresTools && model.capabilities.supportsTools) score += 15;
    if (criteria.maxTokens && model.capabilities.maxTokens >= criteria.maxTokens) score += 10;

    // Provider preference
    if (criteria.preferredProvider && model.provider === criteria.preferredProvider) {
      score += 15;
    }

    return Math.min(100, score);
  }

  private generateRecommendationReasoning(model: ModelInfo, criteria: ModelSelectionCriteria, score: number): string {
    const reasons: string[] = [];

    if (criteria.taskComplexity === 'high' && model.capabilities.contextWindow > 100000) {
      reasons.push('Large context window suitable for complex tasks');
    }

    if (criteria.latencyRequirement === 'high' && model.id.includes('haiku')) {
      reasons.push('Optimized for fast response times');
    }

    if (criteria.costSensitivity === 'high') {
      const avgCost = (model.capabilities.costPer1kTokens.input + model.capabilities.costPer1kTokens.output) / 2;
      if (avgCost < 0.002) {
        reasons.push('Very cost-effective option');
      }
    }

    if (criteria.requiresVision && model.capabilities.supportsVision) {
      reasons.push('Supports vision/image analysis');
    }

    if (criteria.requiresTools && model.capabilities.supportsTools) {
      reasons.push('Supports tool/function calling');
    }

    return reasons.length > 0 ? reasons.join('; ') : 'General purpose model';
  }

  public async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const provider = this.selectProvider(request.model);
    if (!provider) {
      throw new Error(`No provider available for model: ${request.model}`);
    }

    try {
      this.incrementRequestCount(provider.getName());
      return await provider.createChatCompletion(request);
    } catch (error) {
      if (this.loadBalancing.failoverEnabled) {
        return await this.attemptFailover(request, provider.getName());
      }
      throw error;
    }
  }

  public async *createStreamingChatCompletion(request: ChatCompletionRequest): AsyncIterable<StreamChunk> {
    const provider = this.selectProvider(request.model);
    if (!provider) {
      throw new Error(`No provider available for model: ${request.model}`);
    }

    try {
      this.incrementRequestCount(provider.getName());
      yield* provider.createStreamingChatCompletion(request);
    } catch (error) {
      if (this.loadBalancing.failoverEnabled) {
        yield* this.attemptStreamingFailover(request, provider.getName());
      } else {
        throw error;
      }
    }
  }

  private selectProvider(modelId: string): BaseProvider | null {
    // First, try to find the provider that has this specific model
    for (const provider of this.providers.values()) {
      if (provider.getModelInfo(modelId)) {
        return provider;
      }
    }

    // If load balancing is enabled and no specific model found, use strategy
    if (this.loadBalancing.enabled && this.providers.size > 0) {
      return this.selectProviderByStrategy();
    }

    return null;
  }

  private selectProviderByStrategy(): BaseProvider | null {
    const availableProviders = Array.from(this.providers.values());
    if (availableProviders.length === 0) return null;

    switch (this.loadBalancing.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(availableProviders);
      case 'least-loaded':
        return this.selectLeastLoaded(availableProviders);
      case 'fastest':
        return this.selectFastest(availableProviders);
      case 'cheapest':
        return this.selectCheapest(availableProviders);
      default:
        return availableProviders[0];
    }
  }

  private selectRoundRobin(providers: BaseProvider[]): BaseProvider {
    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    return providers[totalRequests % providers.length];
  }

  private selectLeastLoaded(providers: BaseProvider[]): BaseProvider {
    return providers.reduce((least, current) => {
      const leastCount = this.requestCounts.get(least.getName()) || 0;
      const currentCount = this.requestCounts.get(current.getName()) || 0;
      return currentCount < leastCount ? current : least;
    });
  }

  private selectFastest(providers: BaseProvider[]): BaseProvider {
    return providers.reduce((fastest, current) => {
      const fastestLatency = fastest.getMetrics().averageLatency;
      const currentLatency = current.getMetrics().averageLatency;
      return currentLatency < fastestLatency ? current : fastest;
    });
  }

  private selectCheapest(providers: BaseProvider[]): BaseProvider {
    return providers.reduce((cheapest, current) => {
      const cheapestCost = cheapest.getMetrics().totalCost;
      const currentCost = current.getMetrics().totalCost;
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  private incrementRequestCount(providerName: string): void {
    const current = this.requestCounts.get(providerName) || 0;
    this.requestCounts.set(providerName, current + 1);
  }

  private async attemptFailover(request: ChatCompletionRequest, failedProvider: string): Promise<ChatCompletionResponse> {
    this.logger.warn(`Attempting failover from provider: ${failedProvider}`);
    
    for (const [name, provider] of this.providers.entries()) {
      if (name === failedProvider) continue;
      
      try {
        // Try to find a similar model or use the provider's default
        const availableModels = provider.getAvailableModels();
        if (availableModels.length > 0) {
          const fallbackRequest = { ...request, model: availableModels[0].id };
          return await provider.createChatCompletion(fallbackRequest);
        }
      } catch (error) {
        this.logger.warn(`Failover to provider ${name} also failed`, error);
      }
    }
    
    throw new Error('All providers failed');
  }

  private async *attemptStreamingFailover(request: ChatCompletionRequest, failedProvider: string): AsyncIterable<StreamChunk> {
    this.logger.warn(`Attempting streaming failover from provider: ${failedProvider}`);
    
    for (const [name, provider] of this.providers.entries()) {
      if (name === failedProvider) continue;
      
      try {
        const availableModels = provider.getAvailableModels();
        if (availableModels.length > 0) {
          const fallbackRequest = { ...request, model: availableModels[0].id };
          yield* provider.createStreamingChatCompletion(fallbackRequest);
          return;
        }
      } catch (error) {
        this.logger.warn(`Streaming failover to provider ${name} also failed`, error);
      }
    }
    
    throw new Error('All providers failed for streaming');
  }

  public getProviderForModel(modelId: string): BaseProvider | null {
    for (const provider of this.providers.values()) {
      if (provider.getModelInfo(modelId)) {
        return provider;
      }
    }
    return null;
  }

  public getProviderMetrics(): Map<string, ProviderMetrics> {
    const metrics = new Map<string, ProviderMetrics>();
    for (const [name, provider] of this.providers.entries()) {
      metrics.set(name, provider.getMetrics());
    }
    return metrics;
  }

  public async refreshProviders(): Promise<void> {
    this.logger.info('Refreshing providers...');
    
    // Clear cache
    this.modelCache.clear();
    
    // Dispose existing providers
    for (const provider of this.providers.values()) {
      provider.dispose();
    }
    this.providers.clear();
    
    // Reinitialize
    await this.initializeProviders();
  }

  public dispose(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    for (const provider of this.providers.values()) {
      provider.dispose();
    }
    
    this.providers.clear();
    this.modelCache.clear();
    this.requestCounts.clear();
  }
}