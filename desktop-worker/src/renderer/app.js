const baseUrlInput = document.getElementById("baseUrl");
const sessionIdInput = document.getElementById("sessionId");
const userIdInput = document.getElementById("userId");
const tokenInput = document.getElementById("token");
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

startBtn.addEventListener("click", async () => {
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
