/**
 * Centralized OpenAI API Client
 * Replaces Abacus AI RouteLLM for all chat completions
 */

import { recordDependencyResult } from "@/lib/reliability/dependency-health";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function getChatCompletionsEndpoint(): string {
  const baseUrl =
    process.env.OPENAI_API_BASE_URL ||
    process.env.LITELLM_BASE_URL ||
    "https://api.openai.com/v1";
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`;
}

function getApiKeyForEndpoint(endpoint: string): string {
  const openaiDefaultEndpoint = "https://api.openai.com/v1/chat/completions";
  const isDirectOpenAI = endpoint === openaiDefaultEndpoint;

  if (isDirectOpenAI) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable is not configured. Please add it to your environment variables.",
      );
    }
    return openaiKey;
  }

  const routedKey = process.env.LITELLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!routedKey) {
    throw new Error(
      "Missing API key for routed LLM endpoint. Set LITELLM_API_KEY (preferred) or OPENAI_API_KEY.",
    );
  }

  return routedKey;
}

export interface ChatCompletionOptions {
  model?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
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
    "gpt-4.1-mini": "gpt-4o-mini",
    "gpt-4o": "gpt-4o",
    "gpt-4o-mini": "gpt-4o-mini",
  };

  return modelMap[model] || model;
}

/**
 * Call OpenAI Chat Completions API
 */
export async function chatCompletion(
  options: ChatCompletionOptions,
): Promise<ChatCompletionResponse> {
  const startedAt = Date.now();
  const endpoint = getChatCompletionsEndpoint();
  const apiKey = getApiKeyForEndpoint(endpoint);

  const model = mapModelName(options.model || "gpt-4o-mini");

  console.log("[OpenAI Client] Calling LLM endpoint:", {
    model,
    endpoint,
    messageCount: options.messages.length,
    temperature: options.temperature,
    max_tokens: options.max_tokens,
  });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens,
        stream: options.stream ?? false,
      }),
    });
  } catch (error: any) {
    recordDependencyResult({
      dependency: "openai",
      success: false,
      source: "runtime",
      latencyMs: Date.now() - startedAt,
      message: error?.message || "Network error",
    });
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[OpenAI Client] API error:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText.substring(0, 200),
    });

    recordDependencyResult({
      dependency: "openai",
      success: false,
      source: "runtime",
      statusCode: response.status,
      latencyMs: Date.now() - startedAt,
      message: response.statusText,
    });

    if (response.status === 401) {
      throw new Error(
        "Invalid OpenAI API key. Please check your OPENAI_API_KEY is correct.",
      );
    } else if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    } else if (response.status === 400) {
      throw new Error(`Invalid request: ${errorText.substring(0, 200)}`);
    }

    throw new Error(
      `OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`,
    );
  }

  const data = await response.json();
  recordDependencyResult({
    dependency: "openai",
    success: true,
    source: "runtime",
    statusCode: response.status,
    latencyMs: Date.now() - startedAt,
  });
  return data;
}

/**
 * Stream OpenAI Chat Completions API
 */
export async function* streamChatCompletion(
  options: ChatCompletionOptions,
): AsyncGenerator<string, void, unknown> {
  const endpoint = getChatCompletionsEndpoint();
  const apiKey = getApiKeyForEndpoint(endpoint);

  const model = mapModelName(options.model || "gpt-4o-mini");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;

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
