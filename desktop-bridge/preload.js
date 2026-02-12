const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexrelBridge', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  captureSource: (id) => ipcRenderer.invoke('capture-source', id),
  captureAndSend: (opts) => ipcRenderer.invoke('capture-and-send', opts),
  pollPendingActions: (opts) => ipcRenderer.invoke('poll-pending-actions', opts),
  executeAction: (action) => ipcRenderer.invoke('execute-action', action),
  writeRpaExport: (opts) => ipcRenderer.invoke('write-rpa-export', opts),
  getExportPath: () => ipcRenderer.invoke('get-export-path'),
});
