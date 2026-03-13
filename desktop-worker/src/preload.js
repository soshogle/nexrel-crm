const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopWorker", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (input) => ipcRenderer.invoke("config:save", input),
  startWorker: (input) => ipcRenderer.invoke("worker:start", input),
  stopWorker: () => ipcRenderer.invoke("worker:stop"),
  getState: () => ipcRenderer.invoke("worker:state"),
  openDocs: () => ipcRenderer.invoke("app:open-docs"),
  onWorkerEvent: (handler) => {
    const listener = (_, payload) => handler(payload);
    ipcRenderer.on("worker:event", listener);
    return () => ipcRenderer.removeListener("worker:event", listener);
  },
});
