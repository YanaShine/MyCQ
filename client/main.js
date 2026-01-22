const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e'
  });

  // Загружаем index.html
  mainWindow.loadFile('index.html');

  // Открываем DevTools в режиме разработки
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Обработка закрытия окна
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  // Создаем иконку в трее
  createTray();
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/tray-icon.ico'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть MyCQ',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Выход',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('MyCQ Messenger');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.show();
  });
}

// Создаем окно при запуске
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Выход когда все окна закрыты
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC обработчики
ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform
  };
});

// Уведомления
ipcMain.on('show-notification', (event, title, body) => {
  if (process.platform === 'win32') {
    const notification = {
      title: title || 'MyCQ Messenger',
      body: body || '',
      icon: path.join(__dirname, 'assets/icon.ico')
    };
    
    // Создаем уведомление
    const { Notification } = require('electron');
    new Notification(notification).show();
  }
});