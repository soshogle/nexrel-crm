const { EventEmitter } = require("events");
const { chromium } = require("playwright");
const os = require("os");
const fs = require("fs");
const path = require("path");
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

function resolveNavigateTarget(value) {
  const raw = String(value || "").trim();
  const normalized = normalizeUrl(raw);
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (!raw) return "";
  return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
}

function normalizeAppName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("spotify")) return "Spotify";
  if (lower.includes("slack")) return "Slack";
  if (lower.includes("zoom")) return "zoom.us";
  if (lower.includes("notion")) return "Notion";
  if (lower.includes("calendar")) return "Calendar";
  if (lower.includes("outlook")) return "Microsoft Outlook";
  if (lower.includes("chrome")) return "Google Chrome";
  if (lower.includes("safari")) return "Safari";
  if (lower.startsWith("open ")) {
    return raw.replace(/^open\s+/i, "").trim();
  }
  return raw;
}

function buildWorkerStartUrl(config) {
  const explicit = normalizeUrl(config?.startUrl || "");
  if (/^https?:\/\//i.test(explicit)) return explicit;
  return "about:blank";
}

const KEY_CODE_MAP = {
  enter: 36,
  return: 36,
  tab: 48,
  esc: 53,
  escape: 53,
  space: 49,
  delete: 51,
  backspace: 51,
  left: 123,
  right: 124,
  down: 125,
  up: 126,
};

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
    this.stopping = false;
    this.liveBoost = false;
    this.burstUntil = 0;
    this.heartbeatLoop = null;
    this.pollLoop = null;
    this.lastDesktopCaptureAt = 0;
    this.cachedFrameImageDataUrl = null;
    this.lastDesktopCaptureWarnAt = 0;
    this.preferDesktopCapture = false;
    this.desktopCaptureBlocked = false;
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

  markBurst(ms = 12000) {
    this.burstUntil = Math.max(this.burstUntil, Date.now() + ms);
  }

  isBursting() {
    return Date.now() < this.burstUntil;
  }

  getHeartbeatInterval() {
    if (this.liveBoost) return 350;
    if (this.isBursting()) return 650;
    return Number(this.config?.heartbeatMs || 2200);
  }

  getPollInterval() {
    if (this.liveBoost) return 450;
    if (this.isBursting()) return 700;
    return Number(this.config?.pollMs || 1500);
  }

  getDesktopCaptureInterval() {
    if (this.liveBoost) return 700;
    if (this.isBursting()) return 900;
    return 1500;
  }

  async captureDesktopFrame() {
    const platform = os.platform();
    if (platform !== "darwin") return null;

    const tmpFile = path.join(
      os.tmpdir(),
      `nexrel-desktop-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
    );

    try {
      await execFileAsync("screencapture", ["-x", "-t", "jpg", tmpFile], {
        timeout: 4500,
      });
      if (!fs.existsSync(tmpFile)) return null;
      const bytes = fs.readFileSync(tmpFile);
      if (!bytes || bytes.length === 0) return null;
      return `data:image/jpeg;base64,${bytes.toString("base64")}`;
    } catch (error) {
      const message = error?.message || String(error);
      if (
        /not permitted|not authorized|permission|operation not permitted/i.test(
          message,
        )
      ) {
        this.desktopCaptureBlocked = true;
        this.preferDesktopCapture = false;
      }
      const now = Date.now();
      if (now - this.lastDesktopCaptureWarnAt > 30000) {
        this.lastDesktopCaptureWarnAt = now;
        this.log(
          "warn",
          "Desktop capture unavailable, falling back to browser frame",
          {
            error: message,
          },
        );
      }
      return null;
    } finally {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  }

  clearLoops() {
    if (this.heartbeatLoop) clearTimeout(this.heartbeatLoop);
    if (this.pollLoop) clearTimeout(this.pollLoop);
    this.heartbeatLoop = null;
    this.pollLoop = null;
  }

  scheduleHeartbeatLoop() {
    if (!this.running) return;
    const wait = this.getHeartbeatInterval();
    this.heartbeatLoop = setTimeout(async () => {
      if (!this.running) return;
      try {
        await this.sendHeartbeat();
      } catch (error) {
        await this.handleBridgeFailure("Heartbeat", error);
        this.log("error", "Heartbeat failed", {
          error: error?.message || String(error),
        });
      } finally {
        this.scheduleHeartbeatLoop();
      }
    }, wait);
  }

  schedulePollLoop() {
    if (!this.running) return;
    const wait = this.getPollInterval();
    this.pollLoop = setTimeout(async () => {
      if (!this.running) return;
      try {
        await this.processQueue();
      } catch (error) {
        this.log("error", "Queue run failed", {
          error: error?.message || String(error),
        });
      } finally {
        this.schedulePollLoop();
      }
    }, wait);
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
      const error = new Error(
        payload.error || `Bridge request failed (${response.status})`,
      );
      if (response.status === 401) error.code = "UNAUTHORIZED";
      throw error;
    }
    return payload;
  }

  async ensurePageReady() {
    if (!this.running || !this.config) return;
    if (this.page && !this.page.isClosed()) return;

    if (!this.browser || !this.context) {
      this.browser = await this.launchBrowser(this.config.headed);
      this.context = await this.browser.newContext({
        viewport: { width: 1600, height: 940 },
      });
    }

    this.page = await this.context.newPage();
    await this.page.goto(buildWorkerStartUrl(this.config), {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    this.log("warn", "Reopened browser page after it was closed");
  }

  async handleBridgeFailure(scope, error) {
    if (error?.code !== "UNAUTHORIZED") return;
    this.log("error", `${scope} failed`, {
      error:
        "Unauthorized worker token. Generate a new Desktop Key and reconnect.",
    });
    if (!this.stopping) {
      await this.stop();
      this.status({ running: false, state: "error" });
    }
  }

  async executeOpenApp(command) {
    const appName = normalizeAppName(command.target || command.value || "");
    if (!appName) throw new Error("open_app command missing app name");
    const platform = os.platform();
    if (platform === "darwin") {
      await execFileAsync("open", ["-a", appName]);
      const desktopKeys = Array.isArray(command?.meta?.desktopKeys)
        ? command.meta.desktopKeys
        : [];
      const desktopText = String(command?.meta?.desktopText || "");
      if (desktopKeys.length > 0 || desktopText) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        for (const key of desktopKeys) {
          await this.runMacShortcut(String(key));
        }
        if (desktopText) {
          await this.runMacTypeText(desktopText);
        }
      }
      const event = command?.meta?.calendarEvent;
      if (appName === "Calendar" && event) {
        const startDate = new Date(event.startAt || Date.now());
        const endDate = new Date(
          event.endAt || startDate.getTime() + 60 * 60 * 1000,
        );
        const title = String(event.title || "Nexrel Appointment").replace(
          /"/g,
          '\\"',
        );
        const notes = String(event.notes || "").replace(/"/g, '\\"');
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const startMonth = monthNames[startDate.getMonth()];
        const endMonth = monthNames[endDate.getMonth()];
        await execFileAsync("osascript", [
          "-e",
          'tell application "Calendar"',
          "-e",
          "activate",
          "-e",
          "set targetCalendar to first calendar",
          "-e",
          "set startDate to (current date)",
          "-e",
          `set year of startDate to ${startDate.getFullYear()}`,
          "-e",
          `set month of startDate to ${startMonth}`,
          "-e",
          `set day of startDate to ${startDate.getDate()}`,
          "-e",
          `set time of startDate to ${startDate.getHours() * 3600 + startDate.getMinutes() * 60}`,
          "-e",
          "set endDate to (current date)",
          "-e",
          `set year of endDate to ${endDate.getFullYear()}`,
          "-e",
          `set month of endDate to ${endMonth}`,
          "-e",
          `set day of endDate to ${endDate.getDate()}`,
          "-e",
          `set time of endDate to ${endDate.getHours() * 3600 + endDate.getMinutes() * 60}`,
          "-e",
          'tell targetCalendar to set newEvent to make new event with properties {summary:"' +
            `${title}` +
            '", start date:startDate, end date:endDate}',
          "-e",
          'tell newEvent to set description to "' + `${notes}` + '"',
          "-e",
          "end tell",
        ]);
      }
      return `Opened app ${appName}`;
    }
    if (platform === "win32") {
      await execFileAsync("cmd", ["/c", "start", "", appName]);
      return `Started app ${appName}`;
    }
    await execFileAsync("sh", ["-lc", appName]);
    return `Executed app launcher ${appName}`;
  }

  async runMacShortcut(shortcut) {
    const parts = String(shortcut || "")
      .split("+")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length === 0) return;
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);
    const mappedModifiers = modifiers
      .map((m) => {
        if (m === "cmd" || m === "command") return "command down";
        if (m === "ctrl" || m === "control") return "control down";
        if (m === "shift") return "shift down";
        if (m === "alt" || m === "option") return "option down";
        return "";
      })
      .filter(Boolean);

    const keyCode = KEY_CODE_MAP[key];
    if (keyCode) {
      const using = mappedModifiers.length
        ? ` using {${mappedModifiers.join(", ")}}`
        : "";
      await execFileAsync("osascript", [
        "-e",
        `tell application "System Events" to key code ${keyCode}${using}`,
      ]);
      return;
    }

    const printableKey = key.length === 1 ? key : "";
    if (!printableKey) return;
    const using = mappedModifiers.length
      ? ` using {${mappedModifiers.join(", ")}}`
      : "";
    await execFileAsync("osascript", [
      "-e",
      `tell application "System Events" to keystroke "${printableKey.replace(/"/g, '\\"')}"${using}`,
    ]);
  }

  async runMacTypeText(text) {
    const chunk = String(text || "").slice(0, 3000);
    if (!chunk) return;
    await execFileAsync("osascript", [
      "-e",
      `tell application "System Events" to keystroke "${chunk.replace(/"/g, '\\"')}"`,
    ]);
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

  getCommandTimeout(command, fallback = 20000) {
    const fromProfile = Number(
      command?.meta?.executionProfile?.commandTimeoutMs,
    );
    if (Number.isFinite(fromProfile) && fromProfile > 1000) {
      return Math.min(fromProfile, 120000);
    }
    return fallback;
  }

  classifyCommandError(message) {
    const text = String(message || "").toLowerCase();
    if (text.includes("captcha")) return "captcha";
    if (
      text.includes("2fa") ||
      text.includes("two-factor") ||
      text.includes("verification code")
    ) {
      return "two_factor";
    }
    if (
      text.includes("login wall") ||
      text.includes("auth/signin") ||
      text.includes("sign in")
    ) {
      return "login_wall";
    }
    if (text.includes("selector") || text.includes("strict mode violation")) {
      return "selector_drift";
    }
    if (
      text.includes("dialog") ||
      text.includes("modal") ||
      text.includes("popup")
    ) {
      return "modal_trap";
    }
    if (
      text.includes("timeout") ||
      text.includes("timed out") ||
      text.includes("net::")
    ) {
      return "network_timeout";
    }
    if (
      text.includes("permission") ||
      text.includes("not permitted") ||
      text.includes("access denied")
    ) {
      return "permission_denied";
    }
    if (text.includes("invalid url") || text.includes("cannot navigate")) {
      return "invalid_url";
    }
    return "unknown";
  }

  isRecoverableErrorClass(errorClass) {
    return (
      errorClass === "selector_drift" ||
      errorClass === "network_timeout" ||
      errorClass === "modal_trap"
    );
  }

  async applyRecovery(errorClass) {
    if (!this.page || this.page.isClosed()) return;
    if (errorClass === "modal_trap") {
      await this.page.keyboard.press("Escape").catch(() => undefined);
      await this.page.waitForTimeout(300).catch(() => undefined);
      return;
    }
    if (errorClass === "network_timeout") {
      await this.page
        .reload({ waitUntil: "domcontentloaded", timeout: 15000 })
        .catch(() => undefined);
      return;
    }
    if (errorClass === "selector_drift") {
      await this.page.waitForTimeout(450).catch(() => undefined);
    }
  }

  async executeBrowserCommand(command) {
    await this.ensurePageReady();
    if (!this.page) throw new Error("Browser page is not initialized");

    if (command.actionType === "navigate") {
      const url = resolveNavigateTarget(
        command?.meta?.url || command.target || command.value || "",
      );
      if (!url) throw new Error("navigate command missing URL");
      await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: this.getCommandTimeout(command, 60000),
      });
      return `Navigated to ${url}`;
    }

    if (command.actionType === "click") {
      const clickX = Number(command?.meta?.x);
      const clickY = Number(command?.meta?.y);
      if (Number.isFinite(clickX) && Number.isFinite(clickY)) {
        await this.page.mouse.click(clickX, clickY);
        return `Clicked at (${Math.round(clickX)}, ${Math.round(clickY)})`;
      }
      const selector = String(command.target || "").trim();
      if (selector) {
        try {
          await this.page
            .locator(selector)
            .first()
            .click({ timeout: this.getCommandTimeout(command, 20000) });
          return `Clicked ${selector}`;
        } catch {
          const safeText = selector
            .replace(/[#.>~:\[\]\(\)"'`]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (safeText) {
            await this.page
              .getByText(safeText, { exact: false })
              .first()
              .click({
                timeout: this.getCommandTimeout(command, 12000),
              });
            return `Clicked via text fallback ${safeText}`;
          }
          throw new Error(`selector click failed for ${selector}`);
        }
      }

      const textLabel = String(command.value || "").trim();
      if (textLabel) {
        await this.page
          .getByText(textLabel, { exact: false })
          .first()
          .click({
            timeout: this.getCommandTimeout(command, 20000),
          });
        return `Clicked text ${textLabel}`;
      }

      throw new Error("click command missing selector or label");
    }

    if (command.actionType === "type") {
      const selector = String(command.target || "").trim();
      const value = String(command?.meta?.text || command.value || "");
      if (!value) throw new Error("type command missing value");
      const typeX = Number(command?.meta?.x);
      const typeY = Number(command?.meta?.y);
      if (Number.isFinite(typeX) && Number.isFinite(typeY)) {
        await this.page.mouse.click(typeX, typeY);
        await this.page.keyboard.type(value, { delay: 15 });
        return `Typed at (${Math.round(typeX)}, ${Math.round(typeY)})`;
      }
      if (selector) {
        try {
          await this.page
            .locator(selector)
            .first()
            .fill(value, { timeout: this.getCommandTimeout(command, 20000) });
          return `Typed into ${selector}`;
        } catch {
          const placeholder = selector
            .replace(/[#.>~:\[\]\(\)"'`]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (placeholder) {
            await this.page
              .getByPlaceholder(placeholder, { exact: false })
              .first()
              .fill(value, { timeout: this.getCommandTimeout(command, 12000) });
            return `Typed via placeholder fallback ${placeholder}`;
          }
          throw new Error(`selector type failed for ${selector}`);
        }
      }
      if (command?.meta?.label) {
        await this.page
          .getByLabel(String(command.meta.label), { exact: false })
          .first()
          .fill(value, { timeout: this.getCommandTimeout(command, 20000) });
        return `Typed via label ${command.meta.label}`;
      }
      await this.page.keyboard.type(value, { delay: 15 });
      return "Typed via keyboard fallback";
    }

    if (command.actionType === "extract") {
      const url = this.page.url();
      if (!url || url === "about:blank") {
        throw new Error("No active workspace loaded for extract");
      }
      const title = await this.page.title().catch(() => "unknown");
      return `Extracted context: ${title} @ ${this.page.url()}`;
    }

    if (command.actionType === "verify") {
      await this.page.waitForLoadState("domcontentloaded", {
        timeout: this.getCommandTimeout(command, 15000),
      });
      const currentUrl = this.page.url();
      if (!currentUrl || currentUrl === "about:blank") {
        throw new Error("No active workspace loaded for verification");
      }
      const bodyText = await this.page
        .locator("body")
        .innerText()
        .catch(() => "");
      const body = String(bodyText || "").toLowerCase();
      const goal = String(command?.meta?.goal || "").toLowerCase();
      const loginSignals =
        /auth\/signin|\/login\b|sign in|log in|authentication required/i.test(
          `${currentUrl} ${body}`,
        );
      if (loginSignals && !/login|sign in|authenticate/.test(goal)) {
        throw new Error(`login wall detected at ${currentUrl}`);
      }
      if (body.includes("captcha")) {
        throw new Error(`captcha challenge detected at ${currentUrl}`);
      }
      if (
        body.includes("two-factor") ||
        body.includes("2fa") ||
        body.includes("verification code")
      ) {
        throw new Error(`2FA verification required at ${currentUrl}`);
      }
      return `Verified ${currentUrl}`;
    }

    throw new Error(`Unsupported browser action: ${command.actionType}`);
  }

  async executeCommand(command) {
    if (command.actionType === "open_app") return this.executeOpenApp(command);
    if (command.actionType === "run_command")
      return this.executeRunCommand(command);
    return this.executeBrowserCommand(command);
  }

  formatCommandDetail(command, detail, status = "completed") {
    const runtime = String(command?.meta?.executionRuntime || "legacy_worker");
    const objective = String(command?.meta?.goal || "").slice(0, 240);
    const pageText = String(detail || "");
    const evidence = {
      status,
      runtime,
      actionType: command?.actionType,
      timestamp: new Date().toISOString(),
      pageUrl: this.page && !this.page.isClosed() ? this.page.url() : null,
      objective,
      blockerClass:
        status === "failed" ? this.classifyCommandError(pageText) : null,
      detail: pageText.slice(0, 500),
    };
    return JSON.stringify(evidence);
  }

  async sendHeartbeat() {
    await this.ensurePageReady();
    let frameImageDataUrl = undefined;

    const now = Date.now();
    const shouldCaptureDesktop =
      this.config?.desktopCaptureEnabled !== false &&
      !this.desktopCaptureBlocked &&
      now - this.lastDesktopCaptureAt >= this.getDesktopCaptureInterval();
    if (shouldCaptureDesktop) {
      this.lastDesktopCaptureAt = now;
      const desktopImage = await this.captureDesktopFrame();
      if (desktopImage) {
        frameImageDataUrl = desktopImage;
        this.cachedFrameImageDataUrl = desktopImage;
        this.preferDesktopCapture = true;
      }
    } else if (this.cachedFrameImageDataUrl) {
      frameImageDataUrl = this.cachedFrameImageDataUrl;
    }

    if (
      !frameImageDataUrl &&
      this.preferDesktopCapture &&
      this.cachedFrameImageDataUrl
    ) {
      frameImageDataUrl = this.cachedFrameImageDataUrl;
    }

    if (
      !frameImageDataUrl &&
      this.page &&
      (!this.preferDesktopCapture || this.desktopCaptureBlocked)
    ) {
      try {
        const shot = await this.page.screenshot({
          type: "jpeg",
          quality: this.liveBoost ? 55 : this.isBursting() ? 48 : 36,
          fullPage: false,
          timeout: 5000,
        });
        frameImageDataUrl = `data:image/jpeg;base64,${shot.toString("base64")}`;
        this.cachedFrameImageDataUrl = frameImageDataUrl;
      } catch (error) {
        const message = error?.message || String(error);
        if (/has been closed|Target page, context or browser/i.test(message)) {
          await this.ensurePageReady().catch(() => undefined);
          if (this.page && !this.page.isClosed()) {
            try {
              const retry = await this.page.screenshot({
                type: "jpeg",
                quality: this.liveBoost ? 55 : this.isBursting() ? 48 : 36,
                fullPage: false,
                timeout: 5000,
              });
              frameImageDataUrl = `data:image/jpeg;base64,${retry.toString("base64")}`;
              this.cachedFrameImageDataUrl = frameImageDataUrl;
            } catch (retryError) {
              this.log("warn", "Screenshot capture failed", {
                error: retryError?.message || String(retryError),
              });
            }
          }
        } else {
          this.log("warn", "Screenshot capture failed", { error: message });
        }
      }
    }

    const payload = await this.postBridge({
      action: "heartbeat",
      status: "online",
      framePreview: `Desktop worker active at ${new Date().toLocaleTimeString()}`,
      frameImageDataUrl,
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
    const nextBoost = Boolean(payload?.session?.output?.worker?.liveBoost);
    if (nextBoost !== this.liveBoost) {
      this.liveBoost = nextBoost;
      this.log(
        "info",
        this.liveBoost ? "Live Boost enabled" : "Live Boost disabled",
      );
    }
    this.status({ running: true, state: "online" });
  }

  async processQueue() {
    if (this.polling || !this.running) return;
    this.polling = true;
    try {
      const pulled = await this.postBridge({ action: "pull_commands" });
      const commands = Array.isArray(pulled.commands) ? pulled.commands : [];
      if (commands.length > 0) this.markBurst(15000);
      for (const command of commands) {
        try {
          this.markBurst(15000);
          this.log("info", `Executing ${command.actionType}`, {
            commandId: command.commandId,
          });
          let detail = "";
          let status = "completed";
          const maxAttempts = Number(command?.meta?.retryBudget || 2);
          for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
              detail = await this.executeCommand(command);
              status = "completed";
              break;
            } catch (error) {
              const message = error?.message || "Command execution failed";
              const errorClass = this.classifyCommandError(message);
              if (
                attempt < maxAttempts &&
                this.isRecoverableErrorClass(errorClass)
              ) {
                this.log("warn", `Recoverable failure on attempt ${attempt}`, {
                  commandId: command.commandId,
                  errorClass,
                  message,
                });
                await this.applyRecovery(errorClass);
                continue;
              }
              status = "failed";
              detail = message;
              break;
            }
          }

          const formattedDetail = this.formatCommandDetail(
            command,
            detail,
            status,
          );
          if (status === "failed") {
            await this.postBridge({
              action: "ack_command",
              commandId: command.commandId,
              status: "failed",
              detail: formattedDetail,
            });
            this.log("error", `Failed ${command.commandId}`, {
              detail: formattedDetail,
            });
            continue;
          }

          await this.postBridge({
            action: "ack_command",
            commandId: command.commandId,
            status: "completed",
            detail: formattedDetail,
          });
          this.log("info", `Completed ${command.commandId}`, {
            detail: formattedDetail,
          });
        } catch (error) {
          if (error?.code === "UNAUTHORIZED") {
            await this.handleBridgeFailure("Command execution", error);
            throw error;
          }
          const detail = error?.message || "Command execution failed";
          const formattedDetail = this.formatCommandDetail(
            command,
            detail,
            "failed",
          );
          try {
            await this.postBridge({
              action: "ack_command",
              commandId: command.commandId,
              status: "failed",
              detail: formattedDetail,
            });
          } catch (ackError) {
            await this.handleBridgeFailure("Command acknowledge", ackError);
            this.log("error", `Failed to acknowledge ${command.commandId}`, {
              error: ackError?.message || String(ackError),
            });
            throw ackError;
          }
          this.log("error", `Failed ${command.commandId}`, {
            detail: formattedDetail,
          });
        }
      }
    } catch (error) {
      await this.handleBridgeFailure("Queue polling", error);
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
      heartbeatMs: Number(config.heartbeatMs || 2200),
      pollMs: Number(config.pollMs || 1500),
      desktopCaptureEnabled: config.desktopCaptureEnabled !== false,
    };
    this.liveBoost = false;
    this.burstUntil = 0;
    this.preferDesktopCapture = os.platform() === "darwin";
    this.desktopCaptureBlocked = false;

    this.browser = await this.launchBrowser(config.headed);
    this.context = await this.browser.newContext({
      viewport: { width: 1600, height: 940 },
    });
    this.page = await this.context.newPage();
    await this.page.goto(buildWorkerStartUrl(config), {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    this.running = true;
    this.log("info", "Desktop worker started", {
      sessionId: this.config.sessionId,
      baseUrl: this.config.baseUrl,
    });

    await this.sendHeartbeat();
    await this.processQueue();
    this.scheduleHeartbeatLoop();
    this.schedulePollLoop();
  }

  async stop() {
    if (this.stopping) return;
    this.stopping = true;
    if (!this.running) {
      this.stopping = false;
      return;
    }
    this.running = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.clearLoops();
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
    this.stopping = false;
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
