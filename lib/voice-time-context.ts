/**
 * Shared Eastern timezone context for all voice agents.
 * Ensures every agent knows the current date/time in Eastern (America/New_York).
 */

const TZ = "America/New_York";

/**
 * Static instruction to append to every voice agent system prompt.
 * Ensures agents use Eastern time when asked about date/time.
 */
export const EASTERN_TIME_SYSTEM_INSTRUCTION = `

When asked about the current date or time, use Eastern time (America/New_York). The client will provide the current Eastern date/time when the conversation starts.`;

/**
 * Get the current hour (0-23) in Eastern time for greeting (morning/afternoon/evening).
 */
export function getEasternHour(): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10
  );
}

/**
 * Get the period (morning/afternoon/evening) based on Eastern time.
 */
export function getEasternPeriod(): "morning" | "afternoon" | "evening" {
  const hour = getEasternHour();
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

/**
 * Get full Eastern time context string for agent prompts.
 * Use in custom_prompt, sendContextualUpdate, or system prompt.
 */
export function getEasternTimeContext(): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: TZ,
  });
  const period = getEasternPeriod();
  return `Current date and time in Eastern: ${dateStr} at ${timeStr} (${TZ}). Use "good ${period}" or similar — do NOT say "good morning" if it is afternoon or evening. When asked about today's date or time, use this Eastern time.`;
}

/**
 * Get time-aware greeting for firstMessage override.
 */
export function getEasternGreeting(greetingTemplate: string = "I'm your assistant. How can I help you today?"): string {
  const period = getEasternPeriod();
  return `Good ${period}! ${greetingTemplate}`;
}

/** Eastern timezone constant for dynamic variables */
export const EASTERN_TIMEZONE = "America/New_York";

/**
 * Get current datetime string for {{current_datetime}} dynamic variable.
 * Format: "2/17/2025, 3:30:45 PM" (en-US locale)
 */
export function getEasternDateTime(): string {
  return new Date().toLocaleString("en-US", { timeZone: EASTERN_TIMEZONE });
}

/**
 * Get current day of week for {{current_day}} dynamic variable.
 * Format: "Monday", "Tuesday", etc.
 */
export function getEasternDay(): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: EASTERN_TIMEZONE,
    weekday: "long",
  });
}
