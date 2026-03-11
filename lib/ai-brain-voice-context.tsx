/**
 * AI Brain Voice Agent Context
 * Shared state management for persistent voice agent across pages
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { getExplicitVoiceNavigationTarget } from "@/lib/voice-navigation-policy";

const STORAGE_KEY = "ai-brain-voice-agent-state";
const VISUALIZATION_EVENT = "ai-brain-visualization-update";
const CONVERSATION_STATE_EVENT = "ai-brain-conversation-state";
const NAVIGATION_EVENT = "ai-brain-voice-navigate";

interface AIBrainVoiceContextType {
  agentId: string | null;
  loading: boolean;
  error: string | null;
  conversationActive: boolean;
  setConversationActive: (active: boolean) => void;
  fetchCrmStatistics: (chartIntent?: string) => Promise<void>;
  handleMessage: (message: any) => void;
  navigateTo: (path: string) => void;
}

const AIBrainVoiceContext = createContext<AIBrainVoiceContextType | undefined>(
  undefined,
);

export function AIBrainVoiceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationActive, setConversationActiveState] = useState(false);
  const lastStatsCheckRef = useRef<number>(0);
  const lastNavigateRef = useRef<number>(0);
  const pendingNavigationPathRef = useRef<string | null>(null);

  // Load persisted state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          setConversationActiveState(state.conversationActive || false);
        } catch (e) {
          console.error("Failed to load AI Brain voice agent state:", e);
        }
      }

      // Listen for conversation state changes from other components
      const handleStateChange = (event: CustomEvent) => {
        if (event.detail?.conversationActive !== undefined) {
          setConversationActiveState(event.detail.conversationActive);
        }
      };

      window.addEventListener(
        CONVERSATION_STATE_EVENT,
        handleStateChange as EventListener,
      );
      return () => {
        window.removeEventListener(
          CONVERSATION_STATE_EVENT,
          handleStateChange as EventListener,
        );
      };
    }
  }, []);

  useEffect(() => {
    if (!conversationActive) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch("/api/crm-voice-agent/navigation", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        const path = data?.intent?.path;
        if (!cancelled && typeof path === "string" && path.trim()) {
          pendingNavigationPathRef.current = path;
        }
      } catch {
        // Ignore transient polling errors
      }
    };

    poll();
    const interval = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationActive]);

  // Save state to localStorage
  const setConversationActive = useCallback((active: boolean) => {
    setConversationActiveState(active);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          conversationActive: active,
        }),
      );
      // Broadcast state change
      window.dispatchEvent(
        new CustomEvent(CONVERSATION_STATE_EVENT, {
          detail: { conversationActive: active },
        }),
      );
    }
  }, []);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setLoading(true);
        console.log("🔄 [AI Brain Voice Context] Loading CRM voice agent...");
        const response = await fetch("/api/crm-voice-agent");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.agentId) {
            setAgentId(data.agentId);
            console.log(
              "✅ [AI Brain Voice Context] CRM voice agent loaded:",
              data.agentId,
            );
          } else {
            throw new Error(data.error || "Failed to get voice agent");
          }
        } else {
          throw new Error("Failed to get voice agent");
        }
      } catch (err: any) {
        console.error(
          "❌ [AI Brain Voice Context] Error fetching CRM voice agent:",
          err,
        );
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, []);

  const fetchCrmStatistics = useCallback(async (chartIntent?: string) => {
    try {
      console.log(
        "📊 [AI Brain Voice Context] Fetching CRM statistics...",
        chartIntent ? { chartIntent } : "",
      );
      const response = await fetch("/api/crm-voice-agent/functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          function_name: "get_statistics",
          parameters: chartIntent ? { chartIntent } : {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "❌ [AI Brain Voice Context] Failed to fetch statistics:",
          response.status,
          errorText,
        );
        // Try to parse as JSON for better error details
        try {
          const errorData = JSON.parse(errorText);
          console.error(
            "❌ [AI Brain Voice Context] Error details:",
            errorData,
          );
        } catch {
          // Not JSON, use text
        }
        return;
      }

      const data = await response.json();
      console.log("📥 [AI Brain Voice Context] Statistics response:", data);

      if (data.success && data.statistics) {
        // Dispatch custom event to notify AI Brain page to show visualizations
        if (typeof window !== "undefined") {
          console.log(
            "📊 [AI Brain Voice Context] Dispatching visualization event with statistics:",
            JSON.stringify(data.statistics, null, 2),
          );
          const event = new CustomEvent(VISUALIZATION_EVENT, {
            detail: {
              statistics: data.statistics,
              show: true,
            },
          });
          window.dispatchEvent(event);
          console.log(
            "✅ [AI Brain Voice Context] Event dispatched:",
            event.type,
            event.detail,
          );
        }
      } else if (data.error) {
        console.error(
          "❌ [AI Brain Voice Context] Statistics API returned error:",
          data.error,
        );
        if (data.details) {
          console.error(
            "❌ [AI Brain Voice Context] Error details:",
            data.details,
          );
        }
      } else {
        console.warn(
          "⚠️ [AI Brain Voice Context] Unexpected response format:",
          data,
        );
      }
    } catch (error: any) {
      console.error(
        "❌ [AI Brain Voice Context] Failed to fetch CRM statistics:",
        error,
      );
      console.error("❌ [AI Brain Voice Context] Error stack:", error.stack);
    }
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      const now = Date.now();
      if (now - lastNavigateRef.current < 2000) return; // Throttle
      lastNavigateRef.current = now;
      if (typeof window !== "undefined" && path) {
        window.dispatchEvent(
          new CustomEvent(NAVIGATION_EVENT, { detail: { path } }),
        );
        router.push(path);
      }
    },
    [router],
  );

  const handleMessage = useCallback(
    async (message: any) => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastStatsCheckRef.current;
      if (timeSinceLastCheck < 3000) return;

      const activeDraftId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("activeWorkflowDraftId")
          : null;
      const isOnWorkflowsPage =
        typeof window !== "undefined" &&
        window.location.pathname.includes("/workflows");
      const isOnWorkflowBuilder =
        isOnWorkflowsPage &&
        typeof window !== "undefined" &&
        window.location.search.includes("openBuilder=1");
      const inWorkflowBuildingMode = !!activeDraftId || isOnWorkflowBuilder;

      if (message.role === "agent" && message.content) {
        const content = message.content.toLowerCase();
        // Back to workflow builder - user asked to go back
        const backToWorkflowMatch =
          /\b(workflow\s*builder|back\s*to\s*workflow|take\s*me\s*back|take\s*you\s*back|taking\s*you\s*back|go\s*back\s*to\s*workflow|workflow\s*page)\b/.test(
            content,
          );
        if (backToWorkflowMatch) {
          console.log(
            "📋 [AI Brain Voice Context] Detected back to workflow builder, navigating",
          );
          lastStatsCheckRef.current = now;
          let draftId = activeDraftId;
          if (!draftId) {
            try {
              const r = await fetch("/api/workflows/active-draft");
              const d = r.ok ? await r.json() : null;
              draftId = d?.draftId || null;
            } catch {
              // ignore
            }
          }
          navigateTo(
            draftId
              ? `/dashboard/workflows?openBuilder=1&draftId=${draftId}`
              : "/dashboard/workflows?openBuilder=1",
          );
          return;
        }

        if (!inWorkflowBuildingMode) {
          const explicitTarget = getExplicitVoiceNavigationTarget(content);
          if (explicitTarget) {
            console.log(
              "🧭 [AI Brain Voice Context] Explicit post-action navigation:",
              explicitTarget,
            );
            lastStatsCheckRef.current = now;
            const resolvedNavigationPath =
              pendingNavigationPathRef.current || explicitTarget;
            pendingNavigationPathRef.current = null;
            navigateTo(resolvedNavigationPath);
            if (explicitTarget.includes("/business-ai")) {
              fetchCrmStatistics(message.content);
            }
            return;
          }
        }
      }
    },
    [fetchCrmStatistics, navigateTo],
  );

  return (
    <AIBrainVoiceContext.Provider
      value={{
        agentId,
        loading,
        error,
        conversationActive,
        setConversationActive,
        fetchCrmStatistics,
        handleMessage,
        navigateTo,
      }}
    >
      {children}
    </AIBrainVoiceContext.Provider>
  );
}

export function useAIBrainVoice() {
  const context = useContext(AIBrainVoiceContext);
  if (context === undefined) {
    throw new Error("useAIBrainVoice must be used within AIBrainVoiceProvider");
  }
  return context;
}

export const AI_BRAIN_VISUALIZATION_EVENT = VISUALIZATION_EVENT;
