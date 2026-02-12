/**
 * Nexrel EHR Desktop Bridge - Electron Main Process
 * Screen capture, Vision API integration, and RPA-style command execution
 */

const { app, BrowserWindow, desktopCapturer, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const API_BASE = process.env.NEXREL_API_BASE || 'https://www.nexrel.soshogle.com';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

async function getSources() {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 320, height: 180 },
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnailBase64: s.thumbnail.toPNG().toString('base64'),
  }));
}

async function captureSource(sourceId) {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
  });
  const source = sources.find((s) => s.id === sourceId);
  if (!source) return null;
  return source.thumbnail.toPNG();
}

ipcMain.handle('get-sources', () => getSources());
ipcMain.handle('capture-source', (_, sourceId) => captureSource(sourceId));

ipcMain.handle('capture-and-send', async (_, { sourceId, token, ehrType }) => {
  const png = await captureSource(sourceId);
  if (!png) throw new Error('Capture failed');
  const base = process.env.NEXREL_API_BASE || API_BASE;
  const res = await fetch(`${base}/api/ehr-bridge/schedule/analyze-screenshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      imageBase64: png.toString('base64'),
      ehrType: ehrType || 'generic',
      captureDate: new Date().toISOString(),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
});

ipcMain.handle('poll-pending-actions', async (_, { token }) => {
  const base = process.env.NEXREL_API_BASE || API_BASE;
  const res = await fetch(`${base}/api/ehr-bridge/desktop/actions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.actions || [];
});

ipcMain.handle('execute-action', async (_, action) => {
  const { type, payload } = action;
  if (type === 'exec') {
    const { command } = payload || {};
    if (command) {
      const { exec } = require('child_process');
      return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });
    }
  }
  throw new Error(`Unknown action type: ${type}`);
});

ipcMain.handle('write-rpa-export', (_, { filepath, actions }) => {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(actions, null, 2), 'utf8');
  return { success: true, filepath };
});

ipcMain.handle('get-export-path', () => {
  const os = require('os');
  return path.join(os.homedir(), '.nexrel', 'rpa-actions.json');
});
