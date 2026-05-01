import electron from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const { app, BrowserWindow, ipcMain, protocol } = electron;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let splashWindow = null;
let localServer = null;

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
      preload: path.join(__dirname, 'preload.js')
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

  try {
    const { startChessServer } = await import('../server/chessServer.js');
    const port = Number(process.env.CHESS_UNLEASHED_SERVER_PORT || 8080);
    localServer = startChessServer({
      port,
      host: '127.0.0.1',
      logPrefix: '[Chess Unleashed Local Server]'
    });
  } catch (error) {
    console.error('[Chess Unleashed] Local multiplayer server did not start:', error);
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
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
  localServer?.wss?.close();
  closeSplashWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
