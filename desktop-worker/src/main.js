const path = require("path");
const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  systemPreferences,
} = require("electron");
const { WorkerEngine } = require("./worker-engine");
const { loadConfig, saveConfig } = require("./store");

let mainWindow = null;
const engine = new WorkerEngine();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: "#09090b",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function setStartup(runOnStartup) {
  app.setLoginItemSettings({
    openAtLogin: Boolean(runOnStartup),
    openAsHidden: true,
  });
}

app.whenReady().then(() => {
  createWindow();

  engine.on("event", (payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("worker:event", payload);
  });

  ipcMain.handle("config:get", () => {
    return loadConfig();
  });

  ipcMain.handle("config:save", (_, input) => {
    const next = saveConfig(input || {});
    setStartup(next.runOnStartup);
    return next;
  });

  ipcMain.handle("worker:start", async (_, config) => {
    await engine.start(config || {});
    return engine.getState();
  });

  ipcMain.handle("worker:stop", async () => {
    await engine.stop();
    return engine.getState();
  });

  ipcMain.handle("worker:state", () => {
    return engine.getState();
  });

  ipcMain.handle("permissions:get", () => {
    const platform = process.platform;
    if (platform !== "darwin") {
      return {
        platform,
        screen: "unsupported",
        accessibility: "unsupported",
      };
    }

    const screen = systemPreferences.getMediaAccessStatus("screen");
    const accessibility = systemPreferences.isTrustedAccessibilityClient(false)
      ? "granted"
      : "denied";

    return {
      platform,
      screen,
      accessibility,
    };
  });

  ipcMain.handle("permissions:open", async (_, area) => {
    if (process.platform !== "darwin") return { ok: false };
    const target =
      area === "accessibility"
        ? "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        : "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";
    await shell.openExternal(target);
    return { ok: true };
  });

  ipcMain.handle("app:open-docs", async () => {
    await shell.openExternal(
      "https://www.soshogle.com/dashboard/agent-command-center/desktop-worker",
    );
    return { ok: true };
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", async () => {
  await engine.stop().catch(() => undefined);
  if (process.platform !== "darwin") app.quit();
});
