import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { getLiveRun } from "@/lib/ai-employees/live-run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resolvedCtx = await resolveDalContext(session.user.id).catch(
    () => null,
  );
  const ctx = getDalContextFromSession(session) ?? resolvedCtx;
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let sentSignature = "";

      const send = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const interval = setInterval(async () => {
        try {
          const run = await getLiveRun(ctx, params.sessionId);
          if (!run) {
            send("error", { message: "Live run session not found" });
            clearInterval(interval);
            controller.close();
            return;
          }

          const output = (run.output || {}) as any;
          const events = Array.isArray(output.events) ? output.events : [];
          const worker = output.worker || null;
          const signature = JSON.stringify({
            count: events.length,
            progress: run.progress,
            state: output.sessionState || "queued",
            heartbeat: worker?.lastHeartbeatAt || null,
            framePreview: output.framePreview || null,
            frameImage: worker?.frameImageDataUrl || null,
          });
          if (signature !== sentSignature) {
            sentSignature = signature;
            send("state", {
              sessionState: output.sessionState || "queued",
              progress: run.progress,
              framePreview: output.framePreview || null,
              steps: Array.isArray(output.steps) ? output.steps : [],
              worker,
              events,
            });
          }
        } catch (error: any) {
          send("error", { message: error?.message || "Stream failed" });
        }
      }, 1000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
