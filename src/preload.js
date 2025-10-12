// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
    saveTokens: (tokens) => ipcRenderer.invoke("save-tokens", tokens),
    loadTokens: () => ipcRenderer.invoke("load-tokens"),
    getBaseUrl: () => ipcRenderer.invoke("get-base-url"),
    onServerReady: (callback) => ipcRenderer.on("server-ready", callback),
});
