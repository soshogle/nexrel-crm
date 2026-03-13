const baseUrlInput = document.getElementById("baseUrl");
const sessionIdInput = document.getElementById("sessionId");
const userIdInput = document.getElementById("userId");
const tokenInput = document.getElementById("token");
const connectionCodeInput = document.getElementById("connectionCode");
const applyCodeBtn = document.getElementById("applyCodeBtn");
const headedInput = document.getElementById("headed");
const autoExecuteInput = document.getElementById("autoExecute");
const allowLocalCommandsInput = document.getElementById("allowLocalCommands");
const runOnStartupInput = document.getElementById("runOnStartup");
const saveBtn = document.getElementById("saveBtn");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const openDocsBtn = document.getElementById("openDocsBtn");
const logList = document.getElementById("logList");
const statusPill = document.getElementById("status-pill");

function getFormValue() {
  return {
    baseUrl: baseUrlInput.value.trim(),
    sessionId: sessionIdInput.value.trim(),
    userId: userIdInput.value.trim(),
    token: tokenInput.value.trim(),
    headed: headedInput.checked,
    autoExecute: autoExecuteInput.checked,
    allowLocalCommands: allowLocalCommandsInput.checked,
    runOnStartup: runOnStartupInput.checked,
  };
}

function setStatus(state) {
  statusPill.className = `status-pill ${state}`;
  if (state === "online") statusPill.textContent = "Connected";
  else if (state === "error") statusPill.textContent = "Error";
  else statusPill.textContent = "Disconnected";
}

function appendLog(line, meta) {
  const item = document.createElement("div");
  item.className = "log-item";

  const text = document.createElement("p");
  text.textContent = line;
  item.appendChild(text);

  if (meta) {
    const detail = document.createElement("p");
    detail.className = "meta";
    detail.textContent = meta;
    item.appendChild(detail);
  }

  logList.prepend(item);
}

function decodeBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

function parseConnectionCode(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error("Connection code is empty");

  if (value.startsWith("nxa.")) {
    const parts = value.split(".");
    if (parts.length >= 3) {
      try {
        const payload = JSON.parse(decodeBase64Url(parts[1]));
        const parsed = {
          baseUrl: String(payload.baseUrl || "").trim(),
          sessionId: String(payload.sessionId || "").trim(),
          userId: String(payload.userId || "").trim(),
          token: value,
        };
        if (parsed.baseUrl && parsed.sessionId && parsed.userId) {
          return parsed;
        }
      } catch {}
    }
  }

  let payload = value;
  if (value.startsWith("nexrel://")) {
    const url = new URL(value);
    payload = url.searchParams.get("c") || "";
  }

  const candidates = [payload];
  try {
    candidates.push(decodeBase64Url(payload));
  } catch {}

  for (const candidate of candidates) {
    try {
      const data = JSON.parse(candidate);
      const parsed = {
        baseUrl: String(data.baseUrl || data.base_url || "").trim(),
        sessionId: String(data.sessionId || data.session_id || "").trim(),
        userId: String(data.userId || data.user_id || "").trim(),
        token: String(
          data.token || data.workerToken || data.worker_token || "",
        ).trim(),
      };
      if (parsed.baseUrl && parsed.sessionId && parsed.userId && parsed.token) {
        return parsed;
      }
    } catch {}
  }

  throw new Error("Invalid connection code");
}

function parseDesktopKey(raw) {
  const token = String(raw || "").trim();
  if (!token.startsWith("nxa.")) return null;
  const parts = token.split(".");
  if (parts.length < 3) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    return {
      baseUrl: String(payload.baseUrl || "").trim(),
      sessionId: String(payload.sessionId || "").trim(),
      userId: String(payload.userId || "").trim(),
    };
  } catch {
    return null;
  }
}

function applyConnectionCode(raw) {
  const parsed = parseConnectionCode(raw);
  baseUrlInput.value = parsed.baseUrl;
  sessionIdInput.value = parsed.sessionId;
  userIdInput.value = parsed.userId;
  tokenInput.value = parsed.token;
  appendLog(
    "Connection code applied",
    `${parsed.baseUrl} · ${parsed.sessionId}`,
  );
}

function autoFillFromDesktopKey() {
  const parsed = parseDesktopKey(tokenInput.value);
  if (!parsed) return;
  if (parsed.baseUrl) baseUrlInput.value = parsed.baseUrl;
  if (parsed.sessionId) sessionIdInput.value = parsed.sessionId;
  if (parsed.userId) userIdInput.value = parsed.userId;
  appendLog("Desktop key decoded", `${parsed.baseUrl} · ${parsed.sessionId}`);
}

async function hydrate() {
  const config = await window.desktopWorker.getConfig();
  baseUrlInput.value = config.baseUrl || "";
  sessionIdInput.value = config.sessionId || "";
  userIdInput.value = config.userId || "";
  tokenInput.value = config.token || "";
  headedInput.checked = Boolean(config.headed);
  autoExecuteInput.checked = Boolean(config.autoExecute);
  allowLocalCommandsInput.checked = Boolean(config.allowLocalCommands);
  runOnStartupInput.checked = Boolean(config.runOnStartup);

  const state = await window.desktopWorker.getState();
  setStatus(state.running ? "online" : "idle");
}

saveBtn.addEventListener("click", async () => {
  const config = getFormValue();
  await window.desktopWorker.saveConfig(config);
  appendLog("Configuration saved");
});

applyCodeBtn.addEventListener("click", () => {
  try {
    applyConnectionCode(connectionCodeInput.value);
  } catch (error) {
    appendLog(
      "Failed to apply connection code",
      error?.message || String(error),
    );
  }
});

tokenInput.addEventListener("change", autoFillFromDesktopKey);
tokenInput.addEventListener("input", autoFillFromDesktopKey);

startBtn.addEventListener("click", async () => {
  autoFillFromDesktopKey();
  const config = getFormValue();
  await window.desktopWorker.saveConfig(config);
  try {
    await window.desktopWorker.startWorker(config);
    setStatus("online");
    appendLog("Worker started", `${config.baseUrl} · ${config.sessionId}`);
  } catch (error) {
    setStatus("error");
    appendLog("Failed to start worker", error?.message || String(error));
  }
});

stopBtn.addEventListener("click", async () => {
  await window.desktopWorker.stopWorker();
  setStatus("idle");
  appendLog("Worker stopped");
});

openDocsBtn.addEventListener("click", () => {
  window.desktopWorker.openDocs();
});

window.desktopWorker.onWorkerEvent((event) => {
  if (event.type === "status") {
    setStatus(
      event.state === "online"
        ? "online"
        : event.state === "error"
          ? "error"
          : "idle",
    );
    return;
  }

  if (event.type === "log") {
    appendLog(event.message, event.meta ? JSON.stringify(event.meta) : "");
  }
});

hydrate().catch((error) => {
  appendLog("Failed to initialize app", error?.message || String(error));
});
