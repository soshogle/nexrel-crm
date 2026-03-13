import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type WorkerCommand = {
  commandId: string;
  stepId: string;
  actionType:
    | "navigate"
    | "click"
    | "type"
    | "extract"
    | "verify"
    | "open_app"
    | "run_command";
  target?: string;
  value?: string;
  status: "queued" | "running" | "completed" | "failed";
};

type Config = {
  baseUrl: string;
  sessionId: string;
  userId: string;
  token: string;
  headed: boolean;
  heartbeatMs: number;
  pollMs: number;
};

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const key = raw.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function getConfig(): Config {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = String(
    args.baseUrl || process.env.NEXREL_BASE_URL || "https://www.soshogle.com",
  )
    .trim()
    .replace(/\/$/, "");
  const sessionId = String(
    args.sessionId || process.env.NEXREL_SESSION_ID || "",
  ).trim();
  const userId = String(args.userId || process.env.NEXREL_USER_ID || "").trim();
  const token = String(
    args.token || process.env.NEXREL_WORKER_TOKEN || "",
  ).trim();
  const headed = !Boolean(
    args.headless || process.env.NEXREL_WORKER_HEADLESS === "true",
  );
  const heartbeatMs = Number(
    args.heartbeatMs || process.env.NEXREL_HEARTBEAT_MS || 5000,
  );
  const pollMs = Number(args.pollMs || process.env.NEXREL_POLL_MS || 2200);

  if (!sessionId || !token || !userId) {
    throw new Error(
      "Missing required args: --sessionId, --userId, --token (or env NEXREL_SESSION_ID/NEXREL_USER_ID/NEXREL_WORKER_TOKEN)",
    );
  }

  return {
    baseUrl,
    sessionId,
    userId,
    token,
    headed,
    heartbeatMs: Number.isFinite(heartbeatMs) ? heartbeatMs : 5000,
    pollMs: Number.isFinite(pollMs) ? pollMs : 2200,
  };
}

async function postBridge(config: Config, body: Record<string, any>) {
  const response = await fetch(
    `${config.baseUrl}/api/ai-employees/live-run/${encodeURIComponent(config.sessionId)}/worker-open`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({ ...body, userId: config.userId }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.error || `Bridge request failed (${response.status})`,
    );
  }
  return payload;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

async function executeCommand(
  command: WorkerCommand,
  page: Page,
): Promise<string> {
  if (command.actionType === "open_app") {
    const appName = String(command.target || command.value || "").trim();
    if (!appName) throw new Error("open_app command missing app name");
    if (os.platform() === "darwin") {
      await execFileAsync("open", ["-a", appName]);
      return `Opened app ${appName}`;
    }
    if (os.platform() === "win32") {
      await execFileAsync("cmd", ["/c", "start", "", appName]);
      return `Started app ${appName}`;
    }
    await execFileAsync("sh", ["-lc", appName]);
    return `Executed app launcher ${appName}`;
  }

  if (command.actionType === "run_command") {
    const shellCommand = String(command.value || command.target || "").trim();
    if (!shellCommand) throw new Error("run_command missing command text");
    if (process.env.NEXREL_ALLOW_LOCAL_COMMANDS !== "true") {
      throw new Error(
        "run_command blocked: set NEXREL_ALLOW_LOCAL_COMMANDS=true on worker machine",
      );
    }
    const { stdout, stderr } = await execFileAsync(
      "sh",
      ["-lc", shellCommand],
      {
        timeout: 60000,
        maxBuffer: 1024 * 1024,
      },
    );
    const snippet = [stdout, stderr].filter(Boolean).join("\n").trim();
    return `Command executed: ${shellCommand}${snippet ? ` | ${snippet.slice(0, 240)}` : ""}`;
  }

  if (command.actionType === "navigate") {
    const url = normalizeUrl(command.target || command.value || "");
    if (!url) throw new Error("Navigate command missing target URL");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    return `Navigated to ${url}`;
  }

  if (command.actionType === "click") {
    const selector = String(command.target || "").trim();
    if (!selector) throw new Error("Click command missing selector target");
    await page.locator(selector).first().click({ timeout: 20000 });
    return `Clicked ${selector}`;
  }

  if (command.actionType === "type") {
    const selector = String(command.target || "").trim();
    const value = String(command.value || "");
    if (selector) {
      await page.locator(selector).first().fill(value, { timeout: 20000 });
      return `Typed into ${selector}`;
    }
    await page.keyboard.type(value, { delay: 15 });
    return "Typed with keyboard fallback";
  }

  if (command.actionType === "extract") {
    const title = await page.title().catch(() => "unknown title");
    const url = page.url();
    return `Extracted page context: ${title} @ ${url}`;
  }

  if (command.actionType === "verify") {
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
    return `Verified page ${page.url()}`;
  }

  return "No-op command";
}

async function bootstrapBrowser(headed: boolean): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> {
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    viewport: { width: 1560, height: 940 },
  });
  const page = await context.newPage();
  await page.goto("about:blank");
  return { browser, context, page };
}

async function run() {
  const config = getConfig();
  const { browser, context, page } = await bootstrapBrowser(config.headed);
  let stopping = false;

  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  };

  process.on("SIGINT", () => {
    stop().finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    stop().finally(() => process.exit(0));
  });

  console.log("[desktop-worker] connected", {
    sessionId: config.sessionId,
    baseUrl: config.baseUrl,
    headed: config.headed,
  });

  const heartbeatTimer = setInterval(() => {
    postBridge(config, {
      action: "heartbeat",
      framePreview: `Desktop worker online at ${new Date().toLocaleTimeString()}`,
      status: "online",
      capabilities: [
        "playwright",
        "navigate",
        "click",
        "type",
        "extract",
        "verify",
        "open_app",
        "run_command",
      ],
    }).catch((error) => {
      console.error(
        "[desktop-worker] heartbeat error",
        error?.message || error,
      );
    });
  }, config.heartbeatMs);

  const pollTimer = setInterval(async () => {
    try {
      const data = await postBridge(config, { action: "pull_commands" });
      const commands: WorkerCommand[] = Array.isArray(data?.commands)
        ? data.commands
        : [];
      for (const command of commands) {
        try {
          console.log(
            `[desktop-worker] executing ${command.actionType} ${command.commandId}`,
          );
          const detail = await executeCommand(command, page);
          await postBridge(config, {
            action: "ack_command",
            commandId: command.commandId,
            status: "completed",
            detail,
          });
          console.log(`[desktop-worker] completed ${command.commandId}`);
        } catch (error: any) {
          const detail = error?.message || "Command execution failed";
          await postBridge(config, {
            action: "ack_command",
            commandId: command.commandId,
            status: "failed",
            detail,
          });
          console.error(
            `[desktop-worker] failed ${command.commandId}: ${detail}`,
          );
        }
      }
    } catch (error: any) {
      console.error("[desktop-worker] poll error", error?.message || error);
    }
  }, config.pollMs);

  await postBridge(config, {
    action: "heartbeat",
    framePreview: "Desktop worker started",
    status: "online",
    capabilities: [
      "playwright",
      "navigate",
      "click",
      "type",
      "extract",
      "verify",
      "open_app",
      "run_command",
    ],
  });

  await new Promise<void>(() => undefined);

  clearInterval(heartbeatTimer);
  clearInterval(pollTimer);
  await stop();
}

run().catch((error) => {
  console.error("[desktop-worker] fatal", error?.message || error);
  process.exit(1);
});
