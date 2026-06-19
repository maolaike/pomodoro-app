const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 获取设置
  getSettings: () => ipcRenderer.invoke('get-settings'),

  // 保存设置
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // 获取任务
  getTasks: () => ipcRenderer.invoke('get-tasks'),

  // 添加任务
  addTask: (task) => ipcRenderer.invoke('add-task', task),

  // 更新任务
  updateTask: (task) => ipcRenderer.invoke('update-task', task),

  // 删除任务
  deleteTask: (id) => ipcRenderer.invoke('delete-task', id),

  // 获取历史记录
  getHistory: () => ipcRenderer.invoke('get-history'),

  // 添加历史记录
  addHistory: (record) => ipcRenderer.invoke('add-history', record),

  // 显示通知
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),

  // 监听计时器切换
  onToggleTimer: (callback) => ipcRenderer.on('toggle-timer', callback)
});
