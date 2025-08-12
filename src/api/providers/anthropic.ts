import {
  BaseProvider,
  ModelInfo,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
  ProviderConfig,
  ChatMessage
} from './base';
import { SecurityManager } from '../../security/manager';

export interface AnthropicConfig extends ProviderConfig {
  version?: string;
}

export class AnthropicProvider extends BaseProvider {
  private readonly baseUrl: string;
  private readonly version: string;
  private readonly models: ModelInfo[] = [
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      capabilities: {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
        supportsFunctions: false,
        contextWindow: 200000,
        costPer1kTokens: {
          input: 0.015,
          output: 0.075
        }
      },
      description: 'Most powerful Claude model for complex tasks'
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      capabilities: {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
        supportsFunctions: false,
        contextWindow: 200000,
        costPer1kTokens: {
          input: 0.003,
          output: 0.015
        }
      },
      description: 'Balanced performance and speed'
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      capabilities: {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
        supportsFunctions: false,
        contextWindow: 200000,
        costPer1kTokens: {
          input: 0.00025,
          output: 0.00125
        }
      },
      description: 'Fastest Claude model for simple tasks'
    },
    {
      id: 'claude-2.1',
      name: 'Claude 2.1',
      provider: 'anthropic',
      capabilities: {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsVision: false,
        supportsTools: false,
        supportsFunctions: false,
        contextWindow: 200000,
        costPer1kTokens: {
          input: 0.008,
          output: 0.024
        }
      },
      description: 'Previous generation Claude model'
    },
    {
      id: 'claude-2.0',
      name: 'Claude 2.0',
      provider: 'anthropic',
      capabilities: {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsVision: false,
        supportsTools: false,
        supportsFunctions: false,
        contextWindow: 100000,
        costPer1kTokens: {
          input: 0.008,
          output: 0.024
        }
      },
      description: 'Original Claude 2 model'
    }
  ];

  constructor(config: AnthropicConfig, security: SecurityManager) {
    super('Anthropic', config, security);
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.version = config.version || '2023-06-01';
  }

  public getAvailableModels(): ModelInfo[] {
    return [...this.models];
  }

  public getModelInfo(modelId: string): ModelInfo | null {
    return this.models.find(model => model.id === modelId) || null;
  }

  public async validateConfig(): Promise<boolean> {
    try {
      // Anthropic doesn't have a simple health check endpoint
      // So we'll make a minimal completion request
      const response = await this.makeRequest(
        `${this.baseUrl}/v1/messages`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        }
      );
      
      const data = await response.json();
      return data.type === 'message';
    } catch (error) {
      this.logger.error('Config validation failed', error);
      return false;
    }
  }

  public async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}/v1/messages`;
    const body = this.formatRequest(request);
    
    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      // Convert Anthropic response to OpenAI format
      const converted = this.convertResponse(data, request.model);
      
      // Update metrics with token usage
      if (data.usage) {
        const cost = this.calculateCost(
          request.model,
          data.usage.input_tokens,
          data.usage.output_tokens
        );
        this.updateMetrics(true, data.usage.input_tokens + data.usage.output_tokens, undefined, cost);
      }
      
      return converted;
    } catch (error) {
      this.logger.error('Chat completion failed', error);
      throw error;
    }
  }

  public async *createStreamingChatCompletion(request: ChatCompletionRequest): AsyncIterable<StreamChunk> {
    const url = `${this.baseUrl}/v1/messages`;
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
              const converted = this.convertStreamChunk(data, request.model);
              if (converted) {
                yield converted;
              }
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
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': this.version
    };
  }

  private formatRequest(request: ChatCompletionRequest): any {
    // Convert OpenAI format to Anthropic format
    const { messages, system } = this.convertMessages(request.messages);
    
    const formatted: any = {
      model: request.model,
      messages,
      max_tokens: request.max_tokens || 4096,
      ...(system && { system }),
      ...(request.temperature !== undefined && { temperature: request.temperature }),
      ...(request.top_p !== undefined && { top_p: request.top_p }),
      ...(request.stop && { stop_sequences: Array.isArray(request.stop) ? request.stop : [request.stop] }),
      ...(request.stream !== undefined && { stream: request.stream })
    };
    
    // Handle tools if supported
    if (request.tools && this.supportsTools(request.model)) {
      formatted.tools = request.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters
      }));
    }
    
    return formatted;
  }

  private convertMessages(messages: ChatMessage[]): { messages: any[]; system?: string } {
    let system: string | undefined;
    const convertedMessages: any[] = [];
    
    for (const message of messages) {
      if (message.role === 'system') {
        system = message.content;
        continue;
      }
      
      if (message.role === 'tool') {
        // Convert tool response to user message
        convertedMessages.push({
          role: 'user',
          content: `Tool result: ${message.content}`
        });
        continue;
      }
      
      convertedMessages.push({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content
      });
    }
    
    return { messages: convertedMessages, system };
  }

  private convertResponse(anthropicResponse: any, model: string): ChatCompletionResponse {
    return {
      id: anthropicResponse.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: anthropicResponse.content?.[0]?.text || ''
          },
          finish_reason: this.mapStopReason(anthropicResponse.stop_reason)
        }
      ],
      usage: {
        prompt_tokens: anthropicResponse.usage?.input_tokens || 0,
        completion_tokens: anthropicResponse.usage?.output_tokens || 0,
        total_tokens: (anthropicResponse.usage?.input_tokens || 0) + (anthropicResponse.usage?.output_tokens || 0)
      }
    };
  }

  private convertStreamChunk(anthropicChunk: any, model: string): StreamChunk | null {
    if (anthropicChunk.type === 'content_block_delta') {
      return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            delta: {
              content: anthropicChunk.delta?.text || ''
            }
          }
        ]
      };
    }
    
    if (anthropicChunk.type === 'message_stop') {
      return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop'
          }
        ]
      };
    }
    
    return null;
  }

  private mapStopReason(reason: string): 'stop' | 'length' | 'tool_calls' | 'content_filter' {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }

  private supportsTools(model: string): boolean {
    const modelInfo = this.getModelInfo(model);
    return modelInfo?.capabilities.supportsTools || false;
  }

  public async getModelDetails(): Promise<ModelInfo[]> {
    // Anthropic doesn't have a models endpoint, so return our static list
    return this.getAvailableModels();
  }
}