/**
 * Renders Tavus and/or ElevenLabs based on voice config from CRM or env.
 */
import { trpc } from "@/lib/trpc";
import ElevenLabsVoiceAgent from "./ElevenLabsVoiceAgent";

export default function VoiceAIOrchestrator() {
  const { data: config } = trpc.voice.getConfig.useQuery();

  const showTavus = config?.enableTavusAvatar ?? false;
  const showElevenLabs = !!(config?.enableVoiceAI && config?.elevenLabsAgentId);

  return (
    <>
      {showTavus && null}
      {showElevenLabs && (
        <ElevenLabsVoiceAgent
          agentId={config!.elevenLabsAgentId!}
          websiteId={config?.websiteId ?? null}
        />
      )}
    </>
  );
}
