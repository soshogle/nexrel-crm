/**
 * Eastern timezone context for voice agents.
 */

const TZ = "America/New_York";

export function getEasternHour(): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()),
    10
  );
}

export function getEasternPeriod(): "morning" | "afternoon" | "evening" {
  const hour = getEasternHour();
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

export function getEasternTimeContext(): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
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
