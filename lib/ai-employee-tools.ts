/**
 * AI Employee Voice Agent Tools
 * Tools added to ElevenLabs agents so users can:
 * - Ask "what have you done?" → get_task_history
 * - Say "run your tasks" → run_tasks
 * - Say "only do X" / "disable Y" → update_task_toggles
 */

import type { Industry } from "@prisma/client";

const getBaseUrl = () =>
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.nexrel.soshogle.com";

export function getAiEmployeeFunctionsServerUrl(agentId: string): string {
  return `${getBaseUrl()}/api/ai-employees/functions?agentId=${agentId}`;
}

type ToolName =
  | "get_my_task_history"
  | "run_my_tasks"
  | "get_my_task_config"
  | "update_my_task_toggles";

interface ToolPolicyContext {
  source?: "industry" | "professional" | "real_estate" | "unknown";
  industry?: Industry | null;
  employeeType?: string;
}

interface AttachToolsOptions extends ToolPolicyContext {}

const ALL_TOOL_NAMES: ToolName[] = [
  "get_my_task_history",
  "run_my_tasks",
  "get_my_task_config",
  "update_my_task_toggles",
];

const INDUSTRY_TOOL_ALLOWLIST: Partial<Record<Industry, ToolName[]>> = {
  // Explicit allowlists harden all industry paths against accidental future tool drift.
  ACCOUNTING: [...ALL_TOOL_NAMES],
  CONSTRUCTION: [...ALL_TOOL_NAMES],
  DENTIST: [...ALL_TOOL_NAMES],
  HEALTH_CLINIC: [...ALL_TOOL_NAMES],
  HOSPITAL: [...ALL_TOOL_NAMES],
  LAW: [...ALL_TOOL_NAMES],
  MEDICAL: [...ALL_TOOL_NAMES],
  MEDICAL_SPA: [...ALL_TOOL_NAMES],
  OPTOMETRIST: [...ALL_TOOL_NAMES],
  ORTHODONTIST: [...ALL_TOOL_NAMES],
  RESTAURANT: [...ALL_TOOL_NAMES],
  RETAIL: [...ALL_TOOL_NAMES],
  SPORTS_CLUB: [...ALL_TOOL_NAMES],
  TECHNOLOGY: [...ALL_TOOL_NAMES],
};

function getAllowedTools(ctx: ToolPolicyContext): ToolName[] {
  if (ctx.source === "real_estate") {
    return [...ALL_TOOL_NAMES];
  }

  if (ctx.source === "professional") {
    return [...ALL_TOOL_NAMES];
  }

  if (ctx.source === "industry" && ctx.industry) {
    return INDUSTRY_TOOL_ALLOWLIST[ctx.industry] ?? [...ALL_TOOL_NAMES];
  }

  return [...ALL_TOOL_NAMES];
}

export function buildAiEmployeeTools(
  agentId: string,
  context: ToolPolicyContext = { source: "unknown" },
) {
  const serverUrl = getAiEmployeeFunctionsServerUrl(agentId);
  const allTools = [
    {
      name: "get_my_task_history",
      description:
        'Get what this AI employee has already done - past task runs, results, and summaries. Use when user asks "what have you done?", "what did you complete?", "show me your history", "what tasks have you run?", "summarize your work".',
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max number of past runs to return (default 10)",
          },
        },
      },
      server_url: serverUrl,
    },
    {
      name: "run_my_tasks",
      description:
        'Run this AI employee\'s tasks now. Use when user says "run your tasks", "execute your job", "do your work", "run now", "go ahead and run". Executes with current task toggles.',
      parameters: {
        type: "object",
        properties: {},
      },
      server_url: serverUrl,
    },
    {
      name: "get_my_task_config",
      description:
        'Get current task configuration - which tasks are enabled/disabled. Use when user asks "what tasks do you have?", "what can you do?", "show your task settings", "what\'s enabled?".',
      parameters: {
        type: "object",
        properties: {},
      },
      server_url: serverUrl,
    },
    {
      name: "update_my_task_toggles",
      description:
        'Enable or disable specific tasks. Use when user says "only do X", "disable Y", "turn off appointment reminders", "enable billing follow-ups", "just do the leads", "don\'t do invoices". Pass task keys and enabled (true/false).',
      parameters: {
        type: "object",
        properties: {
          taskKey: {
            type: "string",
            description:
              'Task identifier to toggle. E.g. "run", "confirm_appointments", "process_leads"',
          },
          enabled: {
            type: "boolean",
            description:
              "Whether to enable (true) or disable (false) this task",
          },
        },
        required: ["taskKey", "enabled"],
      },
      server_url: serverUrl,
    },
  ];

  const allowed = new Set(getAllowedTools(context));
  return allTools
    .filter((f) => allowed.has(f.name as ToolName))
    .map((f) => ({ type: "function" as const, function: f }));
}

const TASK_TOOLS_PROMPT = `

## Task Tools (use when the user asks)
You have tools to help with your work:
- When user asks "what have you done?", "show my history", "what did you complete?" → use get_my_task_history
- When user says "run your tasks", "execute your job", "do your work" → use run_my_tasks
- When user asks "what tasks do you have?", "what can you do?" → use get_my_task_config
- When user says "only do X", "disable Y", "just do leads" → use update_my_task_toggles

When you run tasks, only enabled tasks execute. Use get_my_task_config to see what's enabled. If the user asks you to perform something that's disabled, inform them and suggest enabling it in Manage Tasks.
`;

function getIndustryPromptSuffix(context: ToolPolicyContext): string {
  if (context.source !== "industry" || !context.industry) return "";

  if (context.industry === "ORTHODONTIST") {
    return `

## Orthodontist Domain Guardrails
- Stay within orthodontic coordination workflows and approved task actions.
- For users with existing mock-data-driven orthodontist workflows, preserve continuity and do not imply data resets or migrations.
`;
  }

  if (context.industry === "RETAIL") {
    return `

## Retail Domain Guardrails
- Prioritize order, inventory, returns, promotions, and loyalty workflows.
- Keep responses aligned with configured retail task toggles and current workflow settings.
`;
  }

  return "";
}

/**
 * Attach AI employee tools to an existing ElevenLabs agent.
 * Call after creating the agent and storing our DB id.
 */
export async function attachToolsToElevenLabsAgent(
  apiKey: string,
  elevenLabsAgentId: string,
  ourDbAgentId: string,
  options: AttachToolsOptions = { source: "unknown" },
): Promise<void> {
  const tools = buildAiEmployeeTools(ourDbAgentId, options);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`,
    {
      method: "GET",
      headers: { "xi-api-key": apiKey },
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch agent for tools: ${response.statusText}`);
  }
  const current = await response.json();
  const agentPrompt = current.conversation_config?.agent?.prompt?.prompt || "";
  const promptSuffix = TASK_TOOLS_PROMPT + getIndustryPromptSuffix(options);
  const newPrompt = agentPrompt.includes("Task Tools")
    ? agentPrompt
    : agentPrompt + promptSuffix;
  const { getElevenLabsLanguageCode } = await import("@/lib/voice-languages");
  // Match CRM Voice Assistant - do NOT set llm; ElevenLabs default works for English
  const agentConfig = {
    ...current.conversation_config?.agent,
    prompt: { prompt: newPrompt },
    language: getElevenLabsLanguageCode(
      current.conversation_config?.agent?.language || "en",
    ),
  };
  delete (agentConfig as Record<string, unknown>).llm; // Remove if present to avoid "English Agents must use turbo or flash v2"
  const updatePayload = {
    name: current.name,
    conversation_config: {
      ...current.conversation_config,
      agent: agentConfig,
    },
    platform_settings: current.platform_settings || {},
    tools,
  };
  const patchRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    },
  );
  if (!patchRes.ok) {
    const err = await patchRes.text();
    throw new Error(
      `Failed to attach AI employee tools: ${patchRes.statusText} - ${err}`,
    );
  }
}
