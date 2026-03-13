const { EventEmitter } = require("events");
const { chromium } = require("playwright");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function buildLiveConsoleUrl(baseUrl, sessionId) {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  const sid = encodeURIComponent(String(sessionId || ""));
  if (!normalizedBase || !sid) return "about:blank";
  return `${normalizedBase}/dashboard/ai-employees/live-console/${sid}`;
}

class WorkerEngine extends EventEmitter {
  constructor() {
    super();
    this.running = false;
    this.config = null;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.heartbeatTimer = null;
    this.pollTimer = null;
    this.polling = false;
  }

  log(level, message, meta = null) {
    this.emit("event", {
      type: "log",
      level,
      message,
      meta,
      at: new Date().toISOString(),
    });
  }

  status(payload) {
    this.emit("event", {
      type: "status",
      at: new Date().toISOString(),
      ...payload,
    });
  }

  async postBridge(body) {
    const response = await fetch(
      `${this.config.baseUrl}/api/ai-employees/live-run/${encodeURIComponent(this.config.sessionId)}/worker-open`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.token}`,
        },
        body: JSON.stringify({ ...body, userId: this.config.userId }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) {
      throw new Error(
        payload.error || `Bridge request failed (${response.status})`,
      );
    }
    return payload;
  }

  async executeOpenApp(command) {
    const appName = String(command.target || command.value || "").trim();
    if (!appName) throw new Error("open_app command missing app name");
    const platform = os.platform();
    if (platform === "darwin") {
      await execFileAsync("open", ["-a", appName]);
      return `Opened app ${appName}`;
    }
    if (platform === "win32") {
      await execFileAsync("cmd", ["/c", "start", "", appName]);
      return `Started app ${appName}`;
    }
    await execFileAsync("sh", ["-lc", appName]);
    return `Executed app launcher ${appName}`;
  }

  async executeRunCommand(command) {
    if (!this.config.allowLocalCommands) {
      throw new Error(
        "run_command blocked by policy: enable 'Allow local commands'",
      );
    }
    const shellCommand = String(command.value || command.target || "").trim();
    if (!shellCommand) throw new Error("run_command missing command text");
    const { stdout, stderr } = await execFileAsync(
      "sh",
      ["-lc", shellCommand],
      {
        timeout: 60000,
        maxBuffer: 1024 * 1024,
      },
    );
    const snippet = [stdout, stderr].filter(Boolean).join("\n").trim();
    return `Executed command: ${shellCommand}${snippet ? ` | ${snippet.slice(0, 240)}` : ""}`;
  }

  async executeBrowserCommand(command) {
    if (!this.page) throw new Error("Browser page is not initialized");

    if (command.actionType === "navigate") {
      const url = normalizeUrl(command.target || command.value || "");
      if (!url) throw new Error("navigate command missing URL");
      await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      return `Navigated to ${url}`;
    }

    if (command.actionType === "click") {
      const selector = String(command.target || "").trim();
      if (!selector) throw new Error("click command missing selector");
      await this.page.locator(selector).first().click({ timeout: 20000 });
      return `Clicked ${selector}`;
    }

    if (command.actionType === "type") {
      const selector = String(command.target || "").trim();
      const value = String(command.value || "");
      if (selector) {
        await this.page
          .locator(selector)
          .first()
          .fill(value, { timeout: 20000 });
        return `Typed into ${selector}`;
      }
      await this.page.keyboard.type(value, { delay: 15 });
      return "Typed via keyboard fallback";
    }

    if (command.actionType === "extract") {
      const title = await this.page.title().catch(() => "unknown");
      return `Extracted context: ${title} @ ${this.page.url()}`;
    }

    if (command.actionType === "verify") {
      await this.page.waitForLoadState("domcontentloaded", { timeout: 15000 });
      return `Verified ${this.page.url()}`;
    }

    throw new Error(`Unsupported browser action: ${command.actionType}`);
  }

  async executeCommand(command) {
    if (command.actionType === "open_app") return this.executeOpenApp(command);
    if (command.actionType === "run_command")
      return this.executeRunCommand(command);
    return this.executeBrowserCommand(command);
  }

  async sendHeartbeat() {
    await this.postBridge({
      action: "heartbeat",
      status: "online",
      framePreview: `Desktop worker active at ${new Date().toLocaleTimeString()}`,
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
    this.status({ running: true, state: "online" });
  }

  async processQueue() {
    if (this.polling || !this.running) return;
    this.polling = true;
    try {
      const pulled = await this.postBridge({ action: "pull_commands" });
      const commands = Array.isArray(pulled.commands) ? pulled.commands : [];
      for (const command of commands) {
        try {
          this.log("info", `Executing ${command.actionType}`, {
            commandId: command.commandId,
          });
          const detail = await this.executeCommand(command);
          await this.postBridge({
            action: "ack_command",
            commandId: command.commandId,
            status: "completed",
            detail,
          });
          this.log("info", `Completed ${command.commandId}`, { detail });
        } catch (error) {
          const detail = error?.message || "Command execution failed";
          await this.postBridge({
            action: "ack_command",
            commandId: command.commandId,
            status: "failed",
            detail,
          });
          this.log("error", `Failed ${command.commandId}`, { detail });
        }
      }
    } catch (error) {
      this.log("error", "Queue polling failed", {
        error: error?.message || String(error),
      });
    } finally {
      this.polling = false;
    }
  }

  async launchBrowser(headed) {
    const headless = !Boolean(headed);

    try {
      return await chromium.launch({ headless });
    } catch (error) {
      this.log("warn", "Default Playwright Chromium missing, trying fallback", {
        error: error?.message || String(error),
      });
    }

    try {
      return await chromium.launch({ headless, channel: "chrome" });
    } catch (error) {
      this.log("warn", "Chrome channel launch failed", {
        error: error?.message || String(error),
      });
    }

    const executableCandidates =
      os.platform() === "darwin"
        ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
        : os.platform() === "win32"
          ? [
              "C:/Program Files/Google/Chrome/Application/chrome.exe",
              "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
            ]
          : [
              "/usr/bin/google-chrome",
              "/usr/bin/google-chrome-stable",
              "/snap/bin/chromium",
            ];

    for (const executablePath of executableCandidates) {
      if (!fs.existsSync(executablePath)) continue;
      try {
        return await chromium.launch({ headless, executablePath });
      } catch (error) {
        this.log("warn", "Fallback executable launch failed", {
          executablePath,
          error: error?.message || String(error),
        });
      }
    }

    throw new Error(
      "No browser executable available. Install Google Chrome on this machine and reopen Nexrel Desktop Worker.",
    );
  }

  async start(config) {
    if (this.running) return;
    if (
      !config.baseUrl ||
      !config.sessionId ||
      !config.userId ||
      !config.token
    ) {
      throw new Error(
        "Missing required config: baseUrl, sessionId, userId, token",
      );
    }

    this.config = {
      ...config,
      heartbeatMs: Number(config.heartbeatMs || 5000),
      pollMs: Number(config.pollMs || 2200),
    };

    this.browser = await this.launchBrowser(config.headed);
    this.context = await this.browser.newContext({
      viewport: { width: 1600, height: 940 },
    });
    this.page = await this.context.newPage();
    await this.page.goto(
      buildLiveConsoleUrl(config.baseUrl, config.sessionId),
      {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      },
    );

    this.running = true;
    this.log("info", "Desktop worker started", {
      sessionId: this.config.sessionId,
      baseUrl: this.config.baseUrl,
    });

    await this.sendHeartbeat();
    await this.processQueue();

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat().catch((error) => {
        this.log("error", "Heartbeat failed", {
          error: error?.message || String(error),
        });
      });
    }, this.config.heartbeatMs);

    this.pollTimer = setInterval(() => {
      this.processQueue().catch((error) => {
        this.log("error", "Queue run failed", {
          error: error?.message || String(error),
        });
      });
    }, this.config.pollMs);
  }

  async stop() {
    if (!this.running) return;
    this.running = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.heartbeatTimer = null;
    this.pollTimer = null;
    this.polling = false;

    if (this.context) await this.context.close().catch(() => undefined);
    if (this.browser) await this.browser.close().catch(() => undefined);
    this.context = null;
    this.browser = null;
    this.page = null;
    this.status({ running: false, state: "idle" });
    this.log("info", "Desktop worker stopped");
  }

  getState() {
    return {
      running: this.running,
      sessionId: this.config?.sessionId || "",
      baseUrl: this.config?.baseUrl || "",
    };
  }
}

module.exports = {
  WorkerEngine,
};
