const { app, BrowserWindow, Notification, ipcMain } = require('electron');
const path = require('path');

const BASE_URL = 'https://inteira.app';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'icons', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    title: 'Inteira',
    show: false,
  });

  // Load splash screen first
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

// Navigate from splash to a path on inteira.app
ipcMain.on('navigate', (_, routePath) => {
  if (!mainWindow) return;
  const safe = routePath.startsWith('/') ? routePath : '/' + routePath;
  mainWindow.loadURL(BASE_URL + safe);
});

ipcMain.on('notify', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
