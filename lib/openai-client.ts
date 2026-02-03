/**
 * Centralized OpenAI API Client
 * Replaces Abacus AI RouteLLM for all chat completions
 */

export interface ChatCompletionOptions {
  model?: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

/**
 * Map Abacus model names to OpenAI equivalents
 */
function mapModelName(model: string): string {
  const modelMap: Record<string, string> = {
    'gpt-4.1-mini': 'gpt-4o-mini',
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
  };
  
  return modelMap[model] || model;
}

/**
 * Call OpenAI Chat Completions API
 */
export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not configured. Please add it to your Vercel environment variables.');
  }

  const model = mapModelName(options.model || 'gpt-4o-mini');
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  console.log('[OpenAI Client] Calling OpenAI API:', {
    model,
    messageCount: options.messages.length,
    temperature: options.temperature,
    max_tokens: options.max_tokens,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: options.stream ?? false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OpenAI Client] API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText.substring(0, 200),
    });

    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY is correct.');
    } else if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    } else if (response.status === 400) {
      throw new Error(`Invalid request: ${errorText.substring(0, 200)}`);
    }

    throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Stream OpenAI Chat Completions API
 */
export async function* streamChatCompletion(
  options: ChatCompletionOptions
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not configured.');
  }

  const model = mapModelName(options.model || 'gpt-4o-mini');
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
