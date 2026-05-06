const { contextBridge, ipcRenderer } = require('electron');

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

const ficsDataListeners = new Set();
const ficsStatusListeners = new Set();
const ficsErrorListeners = new Set();

ipcRenderer.on('fics:data', (_event, raw) => {
  ficsDataListeners.forEach(listener => listener(raw));
});

ipcRenderer.on('fics:status', (_event, payload) => {
  ficsStatusListeners.forEach(listener => listener(payload));
});

ipcRenderer.on('fics:error', (_event, payload) => {
  ficsErrorListeners.forEach(listener => listener(payload));
});

contextBridge.exposeInMainWorld('chessUnleashedFics', {
  connect: (host, port) => ipcRenderer.invoke('fics:connect', { host, port }),
  disconnect: () => ipcRenderer.invoke('fics:disconnect'),
  send: (command) => ipcRenderer.invoke('fics:send', { command }),
  onData: (listener) => {
    if (typeof listener !== 'function') return () => {};
    ficsDataListeners.add(listener);
    return () => ficsDataListeners.delete(listener);
  },
  onStatus: (listener) => {
    if (typeof listener !== 'function') return () => {};
    ficsStatusListeners.add(listener);
    return () => ficsStatusListeners.delete(listener);
  },
  onError: (listener) => {
    if (typeof listener !== 'function') return () => {};
    ficsErrorListeners.add(listener);
    return () => ficsErrorListeners.delete(listener);
  }
});
