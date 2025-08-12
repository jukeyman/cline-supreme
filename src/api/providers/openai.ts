import {
  BaseProvider,
  ModelInfo,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
  ProviderConfig
} from './base';
import { SecurityManager } from '../../security/manager';

export interface OpenAIConfig extends ProviderConfig {
  organization?: string;
  project?: string;
}

export class OpenAIProvider extends BaseProvider {
  private readonly baseUrl: string;
  private readonly models: ModelInfo[] = [
    {
      id: 'gpt-4-turbo-preview',
      name: 'GPT-4 Turbo Preview',
      provider: 'openai',
      capabilities: {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
        supportsFunctions: true,
        contextWindow: 128000,
        costPer1kTokens: {
          input: 0.01,
          output: 0.03
        }
      },
      description: 'Most capable GPT-4 model with improved instruction following'
    },
    {
      id: 'gpt-4-1106-preview',
      name: 'GPT-4 Turbo (1106)',
      provider: 'openai',
      capabilities: {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsVision: false,
        supportsTools: true,
        supportsFunctions: true,
        contextWindow: 128000,
        costPer1kTokens: {
          input: 0.01,
          output: 0.03
        }
      }
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      capabilities: {
        maxTokens: 8192,
        supportsStreaming: true,
        supportsVision: false,
        supportsTools: true,
        supportsFunctions: true,
        contextWindow: 8192,
        costPer1kTokens: {
          input: 0.03,
          output: 0.06
        }
      }
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      capabilities: {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsVision: false,
        supportsTools: true,
        supportsFunctions: true,
        contextWindow: 16385,
        costPer1kTokens: {
          input: 0.0015,
          output: 0.002
        }
      }
    },
    {
      id: 'gpt-3.5-turbo-1106',
      name: 'GPT-3.5 Turbo (1106)',
      provider: 'openai',
      capabilities: {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsVision: false,
        supportsTools: true,
        supportsFunctions: true,
        contextWindow: 16385,
        costPer1kTokens: {
          input: 0.001,
          output: 0.002
        }
      }
    }
  ];

  constructor(config: OpenAIConfig, security: SecurityManager) {
    super('OpenAI', config, security);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  public getAvailableModels(): ModelInfo[] {
    return [...this.models];
  }

  public getModelInfo(modelId: string): ModelInfo | null {
    return this.models.find(model => model.id === modelId) || null;
  }

  public async validateConfig(): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        `${this.baseUrl}/models`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );
      
      const data = await response.json();
      return data.object === 'list' && Array.isArray(data.data);
    } catch (error) {
      this.logger.error('Config validation failed', error);
      return false;
    }
  }

  public async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    const body = this.formatRequest(request);
    
    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      // Update metrics with token usage
      if (data.usage) {
        const cost = this.calculateCost(
          request.model,
          data.usage.prompt_tokens,
          data.usage.completion_tokens
        );
        this.updateMetrics(true, data.usage.total_tokens, undefined, cost);
      }
      
      return data;
    } catch (error) {
      this.logger.error('Chat completion failed', error);
      throw error;
    }
  }

  public async *createStreamingChatCompletion(request: ChatCompletionRequest): AsyncIterable<StreamChunk> {
    const url = `${this.baseUrl}/chat/completions`;
    const body = this.formatRequest({ ...request, stream: true });
    
    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.body) {
        throw new Error('No response body for streaming');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed === '') continue;
            if (trimmed === 'data: [DONE]') return;
            if (!trimmed.startsWith('data: ')) continue;
            
            try {
              const data = JSON.parse(trimmed.slice(6));
              yield data;
            } catch (error) {
              this.logger.warn('Failed to parse streaming chunk', error);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.logger.error('Streaming chat completion failed', error);
      throw error;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };
    
    const openaiConfig = this.config as OpenAIConfig;
    if (openaiConfig.organization) {
      headers['OpenAI-Organization'] = openaiConfig.organization;
    }
    
    if (openaiConfig.project) {
      headers['OpenAI-Project'] = openaiConfig.project;
    }
    
    return headers;
  }

  private formatRequest(request: ChatCompletionRequest): any {
    const formatted: any = {
      model: request.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
        ...(msg.tool_calls && { tool_calls: msg.tool_calls })
      })),
      ...(request.temperature !== undefined && { temperature: request.temperature }),
      ...(request.max_tokens !== undefined && { max_tokens: request.max_tokens }),
      ...(request.top_p !== undefined && { top_p: request.top_p }),
      ...(request.frequency_penalty !== undefined && { frequency_penalty: request.frequency_penalty }),
      ...(request.presence_penalty !== undefined && { presence_penalty: request.presence_penalty }),
      ...(request.stop && { stop: request.stop }),
      ...(request.stream !== undefined && { stream: request.stream }),
      ...(request.tools && { tools: request.tools }),
      ...(request.tool_choice && { tool_choice: request.tool_choice })
    };
    
    return formatted;
  }

  public async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest(
        `${this.baseUrl}/models`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );
      
      const data = await response.json();
      
      // Filter to only chat models and map to our format
      const chatModels = data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => {
          const existing = this.getModelInfo(model.id);
          if (existing) {
            return existing;
          }
          
          // Create basic model info for unknown models
          return {
            id: model.id,
            name: model.id,
            provider: 'openai',
            capabilities: {
              maxTokens: 4096,
              supportsStreaming: true,
              supportsVision: false,
              supportsTools: false,
              supportsFunctions: false,
              contextWindow: 4096,
              costPer1kTokens: {
                input: 0.002,
                output: 0.002
              }
            }
          };
        });
      
      return chatModels;
    } catch (error) {
      this.logger.error('Failed to list models', error);
      return this.getAvailableModels();
    }
  }

  public async getUsage(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (startDate) {
        params.append('start_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString().split('T')[0]);
      }
      
      const response = await this.makeRequest(
        `${this.baseUrl}/usage?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );
      
      return await response.json();
    } catch (error) {
      this.logger.error('Failed to get usage data', error);
      throw error;
    }
  }
}