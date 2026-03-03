/**
 * ElevenLabs Conversational AI — shared constants for agent configuration.
 *
 * CRITICAL: The ElevenLabs API uses `turn.turn_timeout` (not `conversation.turn_timeout_seconds`).
 * When unset, it defaults to 7 seconds, causing premature disconnects.
 * Always include TURN_CONFIG when creating or updating agents.
 */

/** Max allowed turn timeout (seconds). Prevents premature disconnect when user pauses. */
export const TURN_TIMEOUT_SECONDS = 30;

/** Max conversation duration (seconds). Default 30 minutes. */
export const MAX_DURATION_SECONDS = 1800;

/**
 * Turn config for ElevenLabs agents.
 * MUST be included in conversation_config when creating/updating agents.
 * Without this, agents default to turn_timeout: 7 (causing 7s disconnect on silence).
 */
export const TURN_CONFIG = {
  mode: 'turn' as const,
  turn_timeout: TURN_TIMEOUT_SECONDS,
};

/**
 * Conversation config for ElevenLabs agents.
 * Use alongside TURN_CONFIG for full timeout coverage.
 */
export const CONVERSATION_CONFIG = {
  max_duration_seconds: MAX_DURATION_SECONDS,
  turn_timeout_seconds: TURN_TIMEOUT_SECONDS,
};
