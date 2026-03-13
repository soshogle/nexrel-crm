const fs = require("fs");
const path = require("path");
const { app, safeStorage } = require("electron");

const STORE_FILE = "desktop-worker-config.json";

function getStorePath() {
  return path.join(app.getPath("userData"), STORE_FILE);
}

function defaultConfig() {
  return {
    baseUrl: "https://www.soshogle.com",
    sessionId: "",
    userId: "",
    token: "",
    autoExecute: true,
    headed: true,
    allowLocalCommands: false,
    runOnStartup: false,
  };
}

function encryptToken(token) {
  if (!token) return "";
  if (!safeStorage.isEncryptionAvailable()) return token;
  return safeStorage.encryptString(token).toString("base64");
}

function decryptToken(token) {
  if (!token) return "";
  if (!safeStorage.isEncryptionAvailable()) return token;
  try {
    const buff = Buffer.from(token, "base64");
    return safeStorage.decryptString(buff);
  } catch {
    return "";
  }
}

function loadConfig() {
  const filePath = getStorePath();
  if (!fs.existsSync(filePath)) return defaultConfig();
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      ...defaultConfig(),
      ...raw,
      token: decryptToken(raw.token || ""),
    };
  } catch {
    return defaultConfig();
  }
}

function saveConfig(input) {
  const filePath = getStorePath();
  const current = loadConfig();
  const merged = {
    ...current,
    ...input,
  };
  const persisted = {
    ...merged,
    token: encryptToken(merged.token || ""),
  };
  fs.writeFileSync(filePath, JSON.stringify(persisted, null, 2));
  return merged;
}

module.exports = {
  loadConfig,
  saveConfig,
};
