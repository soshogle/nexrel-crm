export function getExplicitVoiceNavigationTarget(
  content: string,
): string | null {
  const normalized = String(content || "").toLowerCase();
  const transitionIntent =
    normalized.includes("taking you to") ||
    normalized.includes("i will take you to") ||
    normalized.includes("i'll take you to") ||
    normalized.includes("navigate to") ||
    normalized.includes("opening the") ||
    normalized.includes("opening your");

  if (!transitionIntent) return null;

  if (
    normalized.includes("contacts page") ||
    normalized.includes("contact page")
  ) {
    return "/dashboard/contacts";
  }
  if (
    normalized.includes("reports page") ||
    normalized.includes("report page")
  ) {
    return "/dashboard/reports";
  }
  if (normalized.includes("pipeline")) {
    return "/dashboard/pipeline";
  }
  if (normalized.includes("campaign")) {
    return "/dashboard/campaigns";
  }
  if (normalized.includes("workflow")) {
    return "/dashboard/workflows";
  }
  if (normalized.includes("ai brain") || normalized.includes("business ai")) {
    return "/dashboard/business-ai?mode=voice";
  }
  if (normalized.includes("messages")) {
    return "/dashboard/messages";
  }
  if (normalized.includes("voice agent")) {
    return "/dashboard/voice-agents";
  }

  return null;
}
