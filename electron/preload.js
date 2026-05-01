import electron from 'electron';

const { contextBridge, ipcRenderer } = electron;

contextBridge.exposeInMainWorld('chessUnleashedAssets', {
  savePackageAssets: (payload) => ipcRenderer.invoke('chess-assets:save-package-assets', payload)
});

const splashListeners = new Set();

ipcRenderer.on('splash:update', (_event, payload) => {
  splashListeners.forEach(listener => listener(payload));
});

contextBridge.exposeInMainWorld('chessUnleashedSplash', {
  onStatus: (listener) => {
    if (typeof listener !== 'function') return () => {};
    splashListeners.add(listener);
    return () => splashListeners.delete(listener);
  }
});
