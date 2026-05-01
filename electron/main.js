import electron from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const { app, BrowserWindow } = electron;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let localServer = null;

const getDevServerUrl = () => process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL;

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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
  });

  const devServerUrl = getDevServerUrl();

  if (!app.isPackaged && devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  if (!app.isPackaged && process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startLocalServer();
  await createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  localServer?.wss?.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
