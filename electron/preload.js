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

const lanGameListeners = new Set();

ipcRenderer.on('chess-lan:games-updated', (_event, games) => {
  lanGameListeners.forEach(listener => listener(games));
});

contextBridge.exposeInMainWorld('chessUnleashedLan', {
  startListening: () => ipcRenderer.invoke('chess-lan:start-listening'),
  getServerInfo: () => ipcRenderer.invoke('chess-lan:get-server-info'),
  startBroadcast: (payload) => ipcRenderer.invoke('chess-lan:start-broadcast', payload),
  stopBroadcast: () => ipcRenderer.invoke('chess-lan:stop-broadcast'),
  onGamesUpdated: (listener) => {
    if (typeof listener !== 'function') return () => {};
    lanGameListeners.add(listener);
    return () => lanGameListeners.delete(listener);
  }
});
