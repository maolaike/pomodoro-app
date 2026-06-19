const { app, BrowserWindow, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');

// 初始化数据存储
const store = new Store({
  defaults: {
    settings: {
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartPomodoros: false
    },
    tasks: [],
    history: []
  }
});

let mainWindow = null;
let tray = null;
let isQuitting = false;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'src/assets/icon.png'),
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 最小化到托盘
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// 创建系统托盘
function createTray() {
  const iconPath = path.join(__dirname, 'src/assets/icon.png');
  let trayIcon;

  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: '开始/暂停',
      click: () => {
        mainWindow.webContents.send('toggle-timer');
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('番茄钟');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

// 显示通知
function showNotification(title, body) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, 'src/assets/icon.png')
    });
    notification.show();
  }
}

// 应用准备好时
app.whenReady().then(() => {
  createWindow();
  createTray();
});

// 所有窗口关闭时（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// IPC 处理程序
const { ipcMain } = require('electron');

ipcMain.handle('get-settings', () => {
  return store.get('settings');
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  return true;
});

ipcMain.handle('get-tasks', () => {
  return store.get('tasks');
});

ipcMain.handle('add-task', (event, task) => {
  const tasks = store.get('tasks');
  task.id = Date.now().toString();
  tasks.push(task);
  store.set('tasks', tasks);
  return task;
});

ipcMain.handle('update-task', (event, task) => {
  const tasks = store.get('tasks');
  const index = tasks.findIndex(t => t.id === task.id);
  if (index !== -1) {
    tasks[index] = task;
    store.set('tasks', tasks);
  }
  return task;
});

ipcMain.handle('delete-task', (event, id) => {
  const tasks = store.get('tasks');
  const filtered = tasks.filter(t => t.id !== id);
  store.set('tasks', filtered);
  return true;
});

ipcMain.handle('get-history', () => {
  return store.get('history');
});

ipcMain.handle('add-history', (event, record) => {
  const history = store.get('history');
  record.id = Date.now().toString();
  history.push(record);
  store.set('history', history);
  return record;
});

ipcMain.handle('show-notification', (event, title, body) => {
  showNotification(title, body);
  return true;
});
