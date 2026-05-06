import electron from 'electron';
import dgram from 'dgram';
import net from 'net';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const { app, BrowserWindow, ipcMain, protocol } = electron;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let splashWindow = null;
let localServer = null;
let lanDiscoverySocket = null;
let lanBroadcastTimer = null;
let lanStalePruneTimer = null;
let lanBroadcastPayload = null;
let ficsSocket = null;
let ficsSender = null;

function sendFicsToRenderer(channel, payload) {
  try {
    if (!ficsSender || ficsSender.isDestroyed?.()) return;
    ficsSender.send(channel, payload);
  } catch (error) {
    // Renderer may already be gone during app/window shutdown. Ignore late socket events.
  }
}

const LAN_DISCOVERY_PORT = Number(process.env.CHESS_UNLEASHED_LAN_DISCOVERY_PORT || 49494);
const LAN_DISCOVERY_APP_ID = 'chess-unleashed-lan-v1';
const LAN_DISCOVERY_STALE_MS = 6000;

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-asset', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

const sanitizePathPart = (value) => String(value || '').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'asset';

const getAssetRoot = () => path.join(app.getPath('userData'), 'assets', 'packages');

const resolveLocalAssetPath = (packageId, relativePath) => {
  const root = getAssetRoot();
  const safePackageId = sanitizePathPart(packageId);
  const parts = String(relativePath || '')
    .split(/[\\/]+/)
    .filter(Boolean)
    .map(sanitizePathPart);
  const target = path.join(root, safePackageId, ...parts);
  const resolvedRoot = path.resolve(root, safePackageId);
  const resolvedTarget = path.resolve(target);
  if (!resolvedTarget.startsWith(resolvedRoot)) throw new Error('Invalid local asset path.');
  return { target: resolvedTarget, safePackageId, relativePath: parts.join('/') };
};

const getDevServerUrl = () => process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL;

const splashHtmlPath = path.join(__dirname, 'splash.html');

function getLanAddresses() {
  const addresses = [];
  Object.values(os.networkInterfaces()).forEach(items => {
    (items || []).forEach(item => {
      if (!item || item.family !== 'IPv4' || item.internal) return;
      addresses.push(item.address);
    });
  });
  return addresses;
}

function getPrimaryLanAddress() {
  return getLanAddresses()[0] || '127.0.0.1';
}

async function resolveSplashImageUrl() {
  const candidates = [
    path.join(__dirname, '../dist/splash/chess-unleashed-splash.png'),
    path.join(__dirname, '../public/splash/chess-unleashed-splash.png')
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return pathToFileURL(candidate).toString();
    } catch {
      continue;
    }
  }

  return '';
}

async function createSplashWindow() {
  if (splashWindow || !singleInstanceLock) return splashWindow;

  const imageUrl = await resolveSplashImageUrl();
  splashWindow = new BrowserWindow({
    width: 560,
    height: 340,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    alwaysOnTop: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  splashWindow.removeMenu();
  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });
  splashWindow.on('closed', () => {
    splashWindow = null;
  });

  const search = imageUrl ? `?image=${encodeURIComponent(imageUrl)}` : '';
  await splashWindow.loadFile(splashHtmlPath, { search });
  splashWindow.webContents.send('splash:update', { status: 'Starting Chess Unleashed...', progress: 10 });
  return splashWindow;
}

function updateSplash(status, progress) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.webContents.send('splash:update', { status, progress });
}

function closeSplashWindow() {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.close();
  splashWindow = null;
}

async function startLocalServer() {
  if (process.env.CHESS_UNLEASHED_START_SERVER === '0') return;
  if (localServer) return localServer;

  try {
    const { startChessServer } = await import('../server/chessServer.js');
    const port = Number(process.env.CHESS_UNLEASHED_SERVER_PORT || 8080);
    localServer = startChessServer({
      port,
      host: '0.0.0.0',
      logPrefix: '[Chess Unleashed Local Server]'
    });
    return localServer;
  } catch (error) {
    console.error('[Chess Unleashed] Local multiplayer server did not start:', error);
    return null;
  }
}

function getLocalServerInfo() {
  const port = Number(process.env.CHESS_UNLEASHED_SERVER_PORT || localServer?.port || 8080);
  const addresses = getLanAddresses();
  const primaryAddress = addresses[0] || '127.0.0.1';
  return {
    port,
    addresses,
    primaryAddress,
    manualUrl: `${primaryAddress}:${port}`,
    discoveryPort: LAN_DISCOVERY_PORT,
    available: !!localServer
  };
}

const discoveredLanGames = new Map();

function getVisibleLanGames() {
  const now = Date.now();
  for (const [id, game] of discoveredLanGames.entries()) {
    if (now - game.lastSeen > LAN_DISCOVERY_STALE_MS) discoveredLanGames.delete(id);
  }
  return Array.from(discoveredLanGames.values())
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

function publishLanGames() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('chess-lan:games-updated', getVisibleLanGames());
}

function ensureLanDiscoverySocket() {
  if (lanDiscoverySocket) return lanDiscoverySocket;

  lanDiscoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  lanDiscoverySocket.on('error', (error) => {
    console.warn('[Chess Unleashed LAN] Discovery socket error:', error.message);
  });
  lanDiscoverySocket.on('message', (message, remote) => {
    try {
      const payload = JSON.parse(message.toString('utf8'));
      if (payload?.appId !== LAN_DISCOVERY_APP_ID) return;
      if (!payload.roomId || !payload.serverPort) return;
      const hostAddress = payload.hostAddress || remote.address;
      const id = `${hostAddress}:${payload.serverPort}:${payload.roomId}`;
      discoveredLanGames.set(id, {
        id,
        appId: LAN_DISCOVERY_APP_ID,
        appVersion: payload.appVersion || app.getVersion(),
        hostDisplayName: payload.hostDisplayName || 'LAN Host',
        hostAddress,
        serverPort: Number(payload.serverPort),
        roomId: String(payload.roomId).toUpperCase(),
        gameModeLabel: payload.gameModeLabel || 'Standard Chess',
        timestamp: payload.timestamp || new Date().toISOString(),
        lastSeen: Date.now()
      });
      publishLanGames();
    } catch (error) {
      console.warn('[Chess Unleashed LAN] Ignored invalid discovery packet:', error.message);
    }
  });
  lanDiscoverySocket.bind(LAN_DISCOVERY_PORT, () => {
    try {
      lanDiscoverySocket?.setBroadcast(true);
    } catch (error) {
      console.warn('[Chess Unleashed LAN] Broadcast mode unavailable:', error.message);
    }
  });

  if (!lanStalePruneTimer) {
    lanStalePruneTimer = setInterval(publishLanGames, 2000);
  }

  return lanDiscoverySocket;
}

function sendLanBroadcast() {
  if (!lanBroadcastPayload) return;
  const socket = ensureLanDiscoverySocket();
  const message = Buffer.from(JSON.stringify({
    appId: LAN_DISCOVERY_APP_ID,
    appVersion: app.getVersion(),
    ...lanBroadcastPayload,
    hostAddress: getPrimaryLanAddress(),
    serverPort: Number(process.env.CHESS_UNLEASHED_SERVER_PORT || localServer?.port || 8080),
    timestamp: new Date().toISOString()
  }));
  socket.send(message, 0, message.length, LAN_DISCOVERY_PORT, '255.255.255.255', (error) => {
    if (error) console.warn('[Chess Unleashed LAN] Broadcast failed:', error.message);
  });
}

function stopLanBroadcast() {
  if (lanBroadcastTimer) {
    clearInterval(lanBroadcastTimer);
    lanBroadcastTimer = null;
  }
  lanBroadcastPayload = null;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
    updateSplash('Opening main window...', 100);
    setTimeout(closeSplashWindow, 120);
  });

  const devServerUrl = getDevServerUrl();

  if (!app.isPackaged && devServerUrl) {
    updateSplash('Loading development server...', 60);
    await mainWindow.loadURL(devServerUrl);
  } else {
    updateSplash('Loading packaged app...', 60);
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  if (!app.isPackaged && process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    if (ficsSender && ficsSender.isDestroyed?.()) ficsSender = null;
    mainWindow = null;
  });
}

function registerLocalAssetProtocol() {
  protocol.registerFileProtocol('local-asset', (request, callback) => {
    try {
      const parsed = new URL(request.url);
      const { target } = resolveLocalAssetPath(parsed.hostname, decodeURIComponent(parsed.pathname.replace(/^\/+/, '')));
      callback({ path: target });
    } catch (error) {
      console.warn('[Chess Unleashed] Local asset could not be resolved:', error);
      callback({ error: -6 });
    }
  });
}

ipcMain.handle('chess-assets:save-package-assets', async (_event, payload) => {
  const packageId = sanitizePathPart(payload?.packageId || `package-${Date.now().toString(36)}`);
  const assets = Array.isArray(payload?.assets) ? payload.assets : [];
  const refs = {};
  const registryAssets = [];

  await Promise.all(assets.map(async (asset) => {
    const packagePath = String(asset.packagePath || '').replace(/^assets[\\/]+/, '');
    if (!packagePath) return;
    const { target, relativePath } = resolveLocalAssetPath(packageId, packagePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const bytes = asset.bytes instanceof ArrayBuffer ? new Uint8Array(asset.bytes) : new Uint8Array(asset.bytes ?? []);
    await fs.writeFile(target, Buffer.from(bytes));
    const localRef = `local-asset://${packageId}/${relativePath}`;
    refs[`package://assets/${packagePath.replace(/\\/g, '/')}`] = localRef;
    registryAssets.push({
      id: `${packageId}:${asset.id || relativePath}`,
      originalPackagePath: `assets/${packagePath.replace(/\\/g, '/')}`,
      localRef,
      mimeType: asset.mimeType || 'application/octet-stream',
      category: asset.category || 'ui',
      displayName: asset.displayName || path.basename(packagePath),
      packageId
    });
  }));

  return { packageId, refs, assets: registryAssets };
});

ipcMain.handle('chess-lan:start-listening', async () => {
  try {
    ensureLanDiscoverySocket();
    publishLanGames();
    return { available: true, games: getVisibleLanGames(), serverInfo: getLocalServerInfo() };
  } catch (error) {
    console.warn('[Chess Unleashed LAN] Listening failed:', error);
    return { available: false, games: [], error: 'LAN discovery is unavailable. Manual IP join is still available.' };
  }
});

ipcMain.handle('chess-lan:get-server-info', async () => {
  await startLocalServer();
  return getLocalServerInfo();
});

ipcMain.handle('chess-lan:start-broadcast', async (_event, payload) => {
  await startLocalServer();
  ensureLanDiscoverySocket();
  lanBroadcastPayload = {
    hostDisplayName: payload?.hostDisplayName || 'LAN Host',
    roomId: String(payload?.roomId || '').toUpperCase(),
    gameModeLabel: payload?.gameModeLabel || 'Standard Chess'
  };
  if (!lanBroadcastPayload.roomId) {
    stopLanBroadcast();
    return { available: false, error: 'Room is not ready yet.' };
  }
  sendLanBroadcast();
  if (!lanBroadcastTimer) {
    lanBroadcastTimer = setInterval(sendLanBroadcast, 1500);
  }
  return { available: true, serverInfo: getLocalServerInfo() };
});

ipcMain.handle('chess-lan:stop-broadcast', async () => {
  stopLanBroadcast();
  return { available: true };
});

ipcMain.handle('fics:connect', async (event, { host, port }) => {
  if (ficsSocket) {
    ficsSocket.destroy();
    ficsSocket = null;
  }
  ficsSender = event.sender;

  return new Promise((resolve, reject) => {
    let resolved = false;
    const socket = new net.Socket();
    ficsSocket = socket;

    socket.on('connect', () => {
      resolved = true;
      sendFicsToRenderer('fics:status', { status: 'connected' });
      resolve({ ok: true });
    });

    socket.on('data', (data) => {
      sendFicsToRenderer('fics:data', data.toString('utf8'));
    });

    socket.on('close', () => {
      if (ficsSocket === socket) ficsSocket = null;
      sendFicsToRenderer('fics:status', { status: 'disconnected' });
    });

    socket.on('error', (error) => {
      sendFicsToRenderer('fics:error', { message: error.message });
      if (!resolved) reject(new Error(error.message));
    });

    socket.connect(port, host);
  });
});

ipcMain.handle('fics:disconnect', async () => {
  ficsSocket?.destroy();
  ficsSocket = null;
  return { ok: true };
});

ipcMain.handle('fics:send', async (_event, { command }) => {
  if (!ficsSocket || ficsSocket.destroyed) throw new Error('FICS socket is not connected.');
  ficsSocket.write(command + '\n', 'utf8');
  return { ok: true };
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  if (splashWindow) {
    if (splashWindow.isMinimized()) splashWindow.restore();
    splashWindow.focus();
  }
});

app.whenReady().then(async () => {
  registerLocalAssetProtocol();
  await createSplashWindow();
  updateSplash('Starting local services...', 25);
  await startLocalServer();
  updateSplash('Loading interface...', 70);
  await createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow().then(() => createWindow());
  }
});

app.on('before-quit', () => {
  ficsSender = null;
  ficsSocket?.destroy();
  ficsSocket = null;
  localServer?.wss?.close();
  stopLanBroadcast();
  if (lanStalePruneTimer) {
    clearInterval(lanStalePruneTimer);
    lanStalePruneTimer = null;
  }
  lanDiscoverySocket?.close();
  lanDiscoverySocket = null;
  closeSplashWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
