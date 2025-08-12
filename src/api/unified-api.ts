/**
 * CLINE SUPREME - UNIFIED API SERVICE
 * Centralized API management for all AI models and services
 */

import { ConfigManager } from '../config/manager';
import { SecurityManager } from '../security/manager';
import { Logger } from '../utils/logger';

export interface ModelProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  maxTokens: number;
  supportsStreaming: boolean;
  costPerToken: number;
}

export interface APIRequest {
  provider: string;
  model: string;
  messages: any[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: any[];
  metadata?: Record<string, any>;
}

export interface APIResponse {
  id: string;
  provider: string;
  model: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  metadata?: Record<string, any>;
}

export class UnifiedAPIService {
  private static instance: UnifiedAPIService;
  private configManager: ConfigManager;
  private securityManager: SecurityManager;
  private logger: Logger;
  private providers: Map<string, ModelProvider> = new Map();
  private requestQueue: APIRequest[] = [];
  private isProcessing = false;

  private constructor() {
    this.configManager = new ConfigManager();
    this.securityManager = new SecurityManager();
    this.logger = new Logger('UnifiedAPIService');
    this.initializeProviders();
  }

  public static getInstance(): UnifiedAPIService {
    if (!UnifiedAPIService.instance) {
      UnifiedAPIService.instance = new UnifiedAPIService();
    }
    return UnifiedAPIService.instance;
  }

  private async initializeProviders(): Promise<void> {
    this.logger.info('Initializing AI model providers...');

    // OpenAI Provider
    const openaiKey = await this.securityManager.getCredential('OPENAI_API_KEY');
    if (openaiKey) {
      this.providers.set('openai', {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: openaiKey,
        models: [
          'gpt-4-turbo-preview',
          'gpt-4-1106-preview',
          'gpt-4',
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-16k'
        ],
        maxTokens: 128000,
        supportsStreaming: true,
        costPerToken: 0.00003
      });
    }

    // Anthropic Claude Provider
    const anthropicKey = await this.securityManager.getCredential('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      this.providers.set('anthropic', {
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: anthropicKey,
        models: [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2.1',
          'claude-2.0'
        ],
        maxTokens: 200000,
        supportsStreaming: true,
        costPerToken: 0.000015
      });
    }

    // Groq Provider
    const groqKey = await this.securityManager.getCredential('GROQ_API_KEY');
    if (groqKey) {
      this.providers.set('groq', {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: groqKey,
        models: [
          'llama2-70b-4096',
          'mixtral-8x7b-32768',
          'gemma-7b-it'
        ],
        maxTokens: 32768,
        supportsStreaming: true,
        costPerToken: 0.0000002
      });
    }

    // DeepSeek Provider
    const deepseekKey = await this.securityManager.getCredential('DEEPSEEK_API_KEY');
    if (deepseekKey) {
      this.providers.set('deepseek', {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: deepseekKey,
        models: [
          'deepseek-chat',
          'deepseek-coder'
        ],
        maxTokens: 32768,
        supportsStreaming: true,
        costPerToken: 0.000001
      });
    }

    // Together AI Provider
    const togetherKey = await this.securityManager.getCredential('TOGETHER_API_KEY');
    if (togetherKey) {
      this.providers.set('together', {
        name: 'Together AI',
        baseUrl: 'https://api.together.xyz/v1',
        apiKey: togetherKey,
        models: [
          'meta-llama/Llama-2-70b-chat-hf',
          'mistralai/Mixtral-8x7B-Instruct-v0.1',
          'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'
        ],
        maxTokens: 32768,
        supportsStreaming: true,
        costPerToken: 0.0000009
      });
    }

    // Perplexity Provider
    const perplexityKey = await this.securityManager.getCredential('PERPLEXITY_API_KEY');
    if (perplexityKey) {
      this.providers.set('perplexity', {
        name: 'Perplexity',
        baseUrl: 'https://api.perplexity.ai',
        apiKey: perplexityKey,
        models: [
          'llama-3-sonar-large-32k-online',
          'llama-3-sonar-small-32k-online',
          'llama-3-8b-instruct',
          'llama-3-70b-instruct'
        ],
        maxTokens: 32768,
        supportsStreaming: true,
        costPerToken: 0.000002
      });
    }

    // OpenRouter Provider
    const openrouterKey = await this.securityManager.getCredential('OPENROUTER_API_KEY');
    if (openrouterKey) {
      this.providers.set('openrouter', {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: openrouterKey,
        models: [
          'anthropic/claude-3-opus',
          'openai/gpt-4-turbo-preview',
          'meta-llama/llama-3-70b-instruct',
          'mistralai/mixtral-8x7b-instruct'
        ],
        maxTokens: 128000,
        supportsStreaming: true,
        costPerToken: 0.000015
      });
    }

    this.logger.info(`Initialized ${this.providers.size} AI providers`);
  }

  public async sendRequest(request: APIRequest): Promise<APIResponse> {
    const provider = this.providers.get(request.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${request.provider}`);
    }

    if (!provider.models.includes(request.model)) {
      throw new Error(`Model ${request.model} not supported by provider ${request.provider}`);
    }

    this.logger.info(`Sending request to ${provider.name} - ${request.model}`);

    try {
      const response = await this.makeAPICall(provider, request);
      return this.processResponse(response, provider, request);
    } catch (error) {
      this.logger.error(`API request failed for ${provider.name}:`, error);
      throw error;
    }
  }

  private async makeAPICall(provider: ModelProvider, request: APIRequest): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    };

    // Add provider-specific headers
    if (provider.name === 'Anthropic') {
      headers['anthropic-version'] = '2023-06-01';
    }

    const body: Record<string, any> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: Math.min(request.maxTokens || 4096, provider.maxTokens),
      stream: request.stream || false
    };

    // Add tools if supported
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private processResponse(response: any, provider: ModelProvider, request: APIRequest): APIResponse {
    const usage = response.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    };

    const cost = usage.total_tokens * provider.costPerToken;

    return {
      id: response.id || `req-${Date.now()}`,
      provider: provider.name,
      model: request.model,
      content: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost
      },
      metadata: {
        ...request.metadata,
        responseTime: Date.now(),
        finishReason: response.choices[0]?.finish_reason
      }
    };
  }

  public selectOptimalProvider(taskType: string, priority: 'speed' | 'quality' | 'cost' = 'quality'): string {
    const availableProviders = Array.from(this.providers.keys());
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    // Task-specific provider recommendations
    const taskProviderMap: Record<string, string[]> = {
      'code_generation': ['anthropic', 'openai', 'deepseek'],
      'creative_writing': ['anthropic', 'openai', 'openrouter'],
      'analysis': ['anthropic', 'openai', 'perplexity'],
      'research': ['perplexity', 'anthropic', 'openai'],
      'conversation': ['openai', 'anthropic', 'groq'],
      'reasoning': ['anthropic', 'openai', 'openrouter'],
      'course_creation': ['anthropic', 'openai', 'openrouter']
    };

    const preferredProviders = taskProviderMap[taskType] || availableProviders;
    const availablePreferred = preferredProviders.filter(p => availableProviders.includes(p));

    if (availablePreferred.length === 0) {
      return availableProviders[0];
    }

    // Select based on priority
    switch (priority) {
      case 'speed':
        return availablePreferred.includes('groq') ? 'groq' : availablePreferred[0];
      case 'cost':
        return availablePreferred.includes('deepseek') ? 'deepseek' : 
               availablePreferred.includes('groq') ? 'groq' : availablePreferred[0];
      case 'quality':
      default:
        return availablePreferred.includes('anthropic') ? 'anthropic' : 
               availablePreferred.includes('openai') ? 'openai' : availablePreferred[0];
    }
  }

  public getOptimalModel(provider: string, taskComplexity: 'simple' | 'medium' | 'complex' = 'medium'): string {
    const providerInfo = this.providers.get(provider);
    if (!providerInfo) {
      throw new Error(`Provider not found: ${provider}`);
    }

    const models = providerInfo.models;
    
    // Model selection based on complexity
    const modelPreferences: Record<string, Record<string, string[]>> = {
      'openai': {
        'simple': ['gpt-3.5-turbo', 'gpt-4'],
        'medium': ['gpt-4', 'gpt-4-turbo-preview'],
        'complex': ['gpt-4-turbo-preview', 'gpt-4-1106-preview']
      },
      'anthropic': {
        'simple': ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
        'medium': ['claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
        'complex': ['claude-3-opus-20240229', 'claude-3-sonnet-20240229']
      },
      'groq': {
        'simple': ['gemma-7b-it', 'llama2-70b-4096'],
        'medium': ['llama2-70b-4096', 'mixtral-8x7b-32768'],
        'complex': ['mixtral-8x7b-32768', 'llama2-70b-4096']
      }
    };

    const preferences = modelPreferences[provider]?.[taskComplexity] || models;
    const availableModel = preferences.find(model => models.includes(model));
    
    return availableModel || models[0];
  }

  public getProviderStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [name, provider] of this.providers.entries()) {
      status[name] = {
        name: provider.name,
        models: provider.models.length,
        maxTokens: provider.maxTokens,
        supportsStreaming: provider.supportsStreaming,
        costPerToken: provider.costPerToken,
        available: true // Could add health checks here
      };
    }
    
    return status;
  }

  public async testProvider(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return false;
    }

    try {
      const testRequest: APIRequest = {
        provider: providerName,
        model: provider.models[0],
        messages: [{
          role: 'user',
          content: 'Hello, this is a test message. Please respond with "Test successful".'
        }],
        temperature: 0.1,
        maxTokens: 50
      };

      const response = await this.sendRequest(testRequest);
      return response.content.toLowerCase().includes('test successful');
    } catch (error) {
      this.logger.error(`Provider test failed for ${providerName}:`, error);
      return false;
    }
  }

  public dispose(): void {
    this.providers.clear();
    this.requestQueue = [];
    this.isProcessing = false;
  }
}

export default UnifiedAPIService;