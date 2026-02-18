/**
 * ElevenLabs Override Configuration
 *
 * Enables "First message" (and related) overrides on agents so that:
 * - Website Voice AI can inject time-aware greetings (e.g. "Good evening" at 9 PM)
 * - CRM/owner agents can personalize greetings at conversation start
 *
 * Overrides are disabled by default in ElevenLabs for security.
 * This module ensures they are enabled whenever agents are created.
 */

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

/**
 * Platform settings for agent overrides (prompt/language). first_message excluded -
 * clients don't override it; agent uses conversation_config.agent.first_message.
 */
export const PLATFORM_SETTINGS_WITH_OVERRIDES = {
  allowed_overrides: {
    agent: ['prompt', 'language'] as const,
  },
} as const;

/**
 * Enable first_message (and prompt/language) overrides on an existing agent via PATCH.
 * Call this after agent creation to ensure overrides work without manual dashboard setup.
 *
 * @returns true if successful, false if non-fatal (e.g. API doesn't support field)
 */
export async function enableFirstMessageOverride(
  agentId: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch current agent to preserve existing platform_settings
    const getRes = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
    });

    let platformSettings: Record<string, unknown> = {};
    if (getRes.ok) {
      const agent = await getRes.json();
      platformSettings = agent?.platform_settings || {};
    }

    const patchBody = {
      platform_settings: {
        ...platformSettings,
        ...PLATFORM_SETTINGS_WITH_OVERRIDES,
      },
    };

    const patchRes = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchBody),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.warn(
        `[ElevenLabs] Could not enable first_message override for agent ${agentId}:`,
        patchRes.status,
        errText
      );
      return { success: false, error: errText };
    }

    console.log(`✅ [ElevenLabs] Enabled first_message override for agent ${agentId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ElevenLabs] enableFirstMessageOverride error for ${agentId}:`, msg);
    return { success: false, error: msg };
  }
}
