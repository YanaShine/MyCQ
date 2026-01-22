const { contextBridge, ipcRenderer } = require('electron');

// Экспортируем безопасные API для рендерера
contextBridge.exposeInMainWorld('electronAPI', {
  // Получение информации о приложении
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // Показать уведомление
  showNotification: (title, body) => ipcRenderer.send('show-notification', title, body),
  
  // Минимизировать окно
  minimize: () => ipcRenderer.send('minimize-window'),
  
  // Закрыть окно
  close: () => ipcRenderer.send('close-window'),
  
  // Выход из приложения
  quit: () => ipcRenderer.send('quit-app')
});