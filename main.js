const { app, BrowserWindow, Menu, ipcMain, session, shell } = require('electron');
const Store = require('electron-store');
const path = require('path');

const store = new Store();
const DEFAULT_URL = 'https://fermi.chat';
let mainWindow;

function createWindow() {
  const targetUrl = store.get('targetUrl', DEFAULT_URL);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Fermi Desktop",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // --- THE FIXES ---
      webSecurity: false,             // Bypasses the CORS policy block for your custom domain
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false, 
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Use a modern Chrome User Agent
  mainWindow.webContents.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  mainWindow.loadURL(targetUrl);

  // External links handler
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  createMenu();
}

function setupPermissions() {
  // Grant permissions for Mic, Camera, and Notifications
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'display-capture', 'notifications', 'fullscreen'];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ['media', 'display-capture', 'notifications', 'fullscreen'];
    return allowed.includes(permission);
  });
}

function createMenu() {
  const template = [
    {
      label: 'Fermi',
      submenu: [
        { label: 'Set Server URL', click: openSettingsWindow },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function openSettingsWindow() {
  let settingsWin = new BrowserWindow({
    width: 400,
    height: 300,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  settingsWin.loadFile('settings.html');
}

ipcMain.on('save-url', (event, newUrl) => {
  store.set('targetUrl', newUrl);
  if (mainWindow) mainWindow.loadURL(newUrl);
});

app.whenReady().then(() => {
  app.setAppUserModelId("Fermi Desktop");
  setupPermissions();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});