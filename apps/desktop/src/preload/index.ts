import { contextBridge, ipcRenderer } from 'electron';

// Expose narrow, named capabilities only; document content never gets raw IPC.
contextBridge.exposeInMainWorld('revise', {
  appVersion: '0.1.0',
  chooseContentFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('revise:collection.chooseFolder', {}),
});
