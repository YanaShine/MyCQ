class ActivityMonitor {
  constructor() {
    this.currentActivity = null;
    this.isMonitoring = false;
    this.updateInterval = null;
    this.socket = null;
    this.userId = null;
    
    // Конфигурация отслеживания
    this.config = {
      checkInterval: 5000, // Проверка каждые 5 секунд
      minimalDuration: 10000, // Минимальная длительность активности
      shareActivities: true // Разрешить делиться активностями
    };
    
    // Кэш предыдущей активности
    this.lastActivity = null;
    this.activityStartTime = null;
    
    console.log('✅ ActivityMonitor инициализирован');
  }
  
  // Начало отслеживания
  startMonitoring(userId, socket) {
    if (this.isMonitoring) return;
    
    this.userId = userId;
    this.socket = socket;
    this.isMonitoring = true;
    
    // Запускаем периодическую проверку
    this.updateInterval = setInterval(() => {
      this.detectActivity();
    }, this.config.checkInterval);
    
    console.log('👁️  Начато отслеживание активности');
  }
  
  // Остановка отслеживания
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    clearInterval(this.updateInterval);
    this.isMonitoring = false;
    
    // Отправляем серверу, что активность остановлена
    if (this.currentActivity && this.userId) {
      this.sendActivityUpdate('stopped');
    }
    
    console.log('👁️  Отслеживание активности остановлено');
  }
  
  // Обнаружение активности
  async detectActivity() {
    try {
      // Для Electron: используем системные API
      if (window.electronAPI) {
        const activity = await window.electronAPI.getCurrentActivity();
        this.handleDetectedActivity(activity);
        return;
      }
      
      // Для браузера: ограниченные возможности
      const browserActivity = this.detectBrowserActivity();
      this.handleDetectedActivity(browserActivity);
      
    } catch (error) {
      console.error('Ошибка обнаружения активности:', error);
    }
  }
  
  // Обработка обнаруженной активности
  handleDetectedActivity(activity) {
    if (!activity || !activity.type) {
      // Нет активности
      if (this.currentActivity) {
        // Активность закончилась
        const duration = Date.now() - this.activityStartTime;
        if (duration > this.config.minimalDuration) {
          this.sendActivityUpdate('stopped');
        }
        this.currentActivity = null;
        this.activityStartTime = null;
      }
      return;
    }
    
    // Проверяем, изменилась ли активность
    const isSameActivity = this.currentActivity && 
      this.currentActivity.type === activity.type &&
      this.currentActivity.name === activity.name;
    
    if (!isSameActivity) {
      // Новая активность
      this.currentActivity = activity;
      this.activityStartTime = Date.now();
      
      // Отправляем на сервер через некоторое время
      setTimeout(() => {
        if (this.currentActivity === activity) {
          this.sendActivityUpdate('started');
        }
      }, this.config.minimalDuration);
      
    } else if (this.activityStartTime) {
      // Активность продолжается
      const duration = Date.now() - this.activityStartTime;
      // Можно отправлять периодические обновления, если нужно
    }
  }
  
  // Отправка обновления на сервер
  async sendActivityUpdate(action) {
    if (!this.userId || !this.socket) return;
    
    try {
      if (action === 'started' && this.currentActivity) {
        // Отправляем новую активность
        this.socket.emit('update_activity', {
          activity_type: this.currentActivity.type,
          activity_name: this.currentActivity.name,
          platform: this.currentActivity.platform || 'unknown',
          details: this.currentActivity.details || ''
        });
        
        // Также через REST API
        const response = await fetch(`http://localhost:3000/api/activity/${this.userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_type: this.currentActivity.type,
            activity_name: this.currentActivity.name,
            platform: this.currentActivity.platform,
            details: this.currentActivity.details,
            sharing_enabled: this.config.shareActivities
          })
        });
        
        if (response.ok) {
          console.log('📤 Активность отправлена на сервер:', this.currentActivity.name);
        }
        
      } else if (action === 'stopped') {
        // Останавливаем активность
        await fetch(`http://localhost:3000/api/activity/${this.userId}/stop`, {
          method: 'POST'
        });
        
        console.log('📤 Активность остановлена');
      }
      
    } catch (error) {
      console.error('Ошибка отправки активности:', error);
    }
  }
  
  // Обнаружение активности в браузере
  detectBrowserActivity() {
    // Определяем активную вкладку
    const isYouTube = window.location.hostname.includes('youtube.com');
    const isSpotify = window.location.hostname.includes('spotify.com');
    const isTwitch = window.location.hostname.includes('twitch.tv');
    
    // Получаем заголовок страницы
    const pageTitle = document.title;
    
    if (isYouTube && pageTitle) {
      return {
        type: 'watching',
        name: this.extractYouTubeTitle(pageTitle),
        platform: 'youtube',
        details: 'Смотрит видео'
      };
    } else if (isSpotify && pageTitle) {
      return {
        type: 'listening',
        name: this.extractSpotifyTitle(pageTitle),
        platform: 'spotify',
        details: 'Слушает музыку'
      };
    } else if (isTwitch && pageTitle) {
      return {
        type: 'watching',
        name: this.extractTwitchTitle(pageTitle),
        platform: 'twitch',
        details: 'Смотрит стрим'
      };
    } else if (document.hasFocus() && pageTitle) {
      // Общая активность в браузере
      return {
        type: 'working',
        name: pageTitle,
        platform: 'browser',
        details: 'Работает в браузере'
      };
    }
    
    return null;
  }
  
  // Парсинг заголовков
  extractYouTubeTitle(title) {
    // Пример: "Название видео - YouTube"
    return title.replace(' - YouTube', '');
  }
  
  extractSpotifyTitle(title) {
    // Пример: "Исполнитель - Трек • Spotify"
    return title.replace(' • Spotify', '');
  }
  
  extractTwitchTitle(title) {
    // Пример: "Стример - Игра • Twitch"
    return title.replace(' • Twitch', '');
  }
  
  // Ручная установка активности
  setManualActivity(activity) {
    this.currentActivity = activity;
    this.activityStartTime = Date.now();
    this.sendActivityUpdate('started');
  }
  
  // Остановка текущей активности
  stopCurrentActivity() {
    this.currentActivity = null;
    this.activityStartTime = null;
    this.sendActivityUpdate('stopped');
  }
  
  // Обновление конфигурации
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.shareActivities === false && this.currentActivity) {
      this.stopCurrentActivity();
    }
  }
  
  // Получение текущей активности
  getCurrentActivity() {
    return this.currentActivity;
  }
  
  // Получение статистики
  getStats() {
    return {
      isMonitoring: this.isMonitoring,
      currentActivity: this.currentActivity,
      monitoringDuration: this.activityStartTime ? 
        Date.now() - this.activityStartTime : 0,
      config: this.config
    };
  }
}

// Экспортируем синглтон
const activityMonitor = new ActivityMonitor();
export default activityMonitor;