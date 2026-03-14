import { createHash, createHmac } from "crypto";

export type CommandRiskTier = "LOW" | "MEDIUM" | "HIGH";

export type CommandEnvelopeInput = {
  sessionId: string;
  userId: string;
  actionType: string;
  target?: string;
  value?: string;
  riskTier: CommandRiskTier;
  requiresApproval: boolean;
  correlationId: string;
  idempotencyKey?: string;
  issuedAt?: string;
};

export type CommandEnvelope = {
  version: "v1";
  keyId: string;
  correlationId: string;
  idempotencyKey?: string;
  riskTier: CommandRiskTier;
  requiresApproval: boolean;
  payloadHash: string;
  issuedAt: string;
  signature: string;
};

function getCommandBusSecret(): string {
  return (
    process.env.NEXREL_AGENT_COMMAND_BUS_SECRET ||
    process.env.NEXREL_AI_LIVE_RUN_WORKER_SECRET ||
    ""
  );
}

function canonicalPayload(input: CommandEnvelopeInput): string {
  return JSON.stringify({
    sessionId: input.sessionId,
    userId: input.userId,
    actionType: input.actionType,
    target: input.target || "",
    value: input.value || "",
    riskTier: input.riskTier,
    requiresApproval: Boolean(input.requiresApproval),
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey || "",
  });
}

export function buildCommandEnvelope(
  input: CommandEnvelopeInput,
): CommandEnvelope {
  const secret = getCommandBusSecret();
  const keyId = secret ? "command_bus_primary" : "unsigned";
  const issuedAt = input.issuedAt || new Date().toISOString();
  const payload = canonicalPayload(input);
  const payloadHash = createHash("sha256").update(payload).digest("hex");

  const signature = secret
    ? createHmac("sha256", secret)
        .update(`${payloadHash}.${issuedAt}`)
        .digest("hex")
    : "unsigned";

  return {
    version: "v1",
    keyId,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    riskTier: input.riskTier,
    requiresApproval: Boolean(input.requiresApproval),
    payloadHash,
    issuedAt,
    signature,
  };
}

export function verifyCommandEnvelope(
  input: CommandEnvelopeInput,
  envelope: CommandEnvelope,
): boolean {
  if (envelope.version !== "v1") return false;
  if (!envelope.signature) return false;
  const rebuilt = buildCommandEnvelope({
    ...input,
    issuedAt: envelope.issuedAt,
  });
  return (
    rebuilt.payloadHash === envelope.payloadHash &&
    rebuilt.signature === envelope.signature
  );
}
