export type VisionFallbackRequest = {
  actionType: "click" | "type";
  x: number;
  y: number;
  targetHint?: string;
  confidence?: number;
  text?: string;
};

export function normalizeVisionFallbackRequest(
  input: any,
): VisionFallbackRequest {
  const actionType =
    String(input?.actionType || "click").toLowerCase() === "type"
      ? "type"
      : "click";
  const x = Math.max(0, Math.round(Number(input?.x || 0)));
  const y = Math.max(0, Math.round(Number(input?.y || 0)));
  const confidenceRaw = Number(input?.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : undefined;
  const targetHint = String(input?.targetHint || "").trim();
  const text = String(input?.text || "");

  return {
    actionType,
    x,
    y,
    targetHint: targetHint || undefined,
    confidence,
    text: text || undefined,
  };
}
