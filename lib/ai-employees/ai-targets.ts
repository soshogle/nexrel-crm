export function buildAiTarget(target: string, group = "agent_os") {
  return {
    "data-ai-target": target,
    "data-ai-group": group,
  } as const;
}
