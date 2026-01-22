class SoundManager {
  constructor() {
    this.sounds = new Map();
    this.settings = {
      message: { enabled: true, volume: 80, path: null },
      call: { enabled: true, volume: 90, path: null },
      user_online: { enabled: true, volume: 60, path: null },
      user_offline: { enabled: false, volume: 60, path: null },
      call_start: { enabled: true, volume: 70, path: null },
      call_end: { enabled: true, volume: 70, path: null }
    };
    
    this.audioContext = null;
    this.initialized = false;
    
    // Дефолтные звуки (встроенные)
    this.defaultSounds = {
      message: this.createDefaultNotificationSound,
      call: this.createDefaultCallSound,
      login: this.createDefaultLoginSound,
      logout: this.createDefaultLogoutSound,
      status_change: this.createDefaultStatusSound
    };
  }
  
  // Инициализация
  async init(userId) {
    try {
      // Загружаем настройки с сервера
      const response = await fetch(`http://localhost:3000/api/sounds/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          data.sounds.forEach(sound => {
            this.settings[sound.sound_type] = {
              enabled: sound.enabled,
              volume: sound.volume,
              path: sound.file_path,
              is_custom: sound.is_custom
            };
          });
        }
      }
      
      // Инициализируем AudioContext
      if (window.AudioContext || window.webkitAudioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      this.initialized = true;
      console.log('✅ SoundManager инициализирован');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации SoundManager:', error);
      this.initialized = false;
    }
  }
  
  // Воспроизведение звука
  play(soundType, customPath = null) {
    if (!this.initialized || !this.settings[soundType]?.enabled) return;
    
    const settings = this.settings[soundType];
    const volume = settings.volume / 100;
    
    // Если есть кастомный файл
    if (settings.path || customPath) {
      this.playFile(settings.path || customPath, volume);
      return;
    }
    
    // Иначе играем дефолтный звук
    if (this.defaultSounds[soundType]) {
      this.defaultSounds[soundType](volume);
    }
  }
  
  // Воспроизведение файла
  playFile(filePath, volume) {
    if (!filePath) return;
    
    try {
      // Для Electron: путь к локальному файлу
      if (window.electronAPI) {
        window.electronAPI.playSound(filePath, volume);
        return;
      }
      
      // Для браузера: создаем аудио элемент
      const audio = new Audio();
      audio.src = filePath.startsWith('http') ? filePath : `file://${filePath}`;
      audio.volume = volume;
      audio.play().catch(e => console.warn('Не удалось воспроизвести звук:', e));
      
    } catch (error) {
      console.error('Ошибка воспроизведения файла:', error);
    }
  }
  
  // Обновление настроек
  async updateSetting(userId, soundType, setting) {
    try {
      const response = await fetch(`http://localhost:3000/api/sounds/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sound_type: soundType,
          ...setting
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.settings[soundType] = {
            ...this.settings[soundType],
            ...setting
          };
          return true;
        }
      }
      return false;
      
    } catch (error) {
      console.error('Ошибка обновления настроек звука:', error);
      return false;
    }
  }
  
  // Загрузка кастомного звука
  async uploadCustomSound(userId, soundType, file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          // Для Electron: сохраняем файл локально
          if (window.electronAPI) {
            const savedPath = await window.electronAPI.saveSoundFile(file);
            
            const response = await fetch(`http://localhost:3000/api/sounds/${userId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sound_type: soundType,
                file_path: savedPath,
                volume: this.settings[soundType]?.volume || 80,
                enabled: true
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                this.settings[soundType] = {
                  ...this.settings[soundType],
                  path: savedPath,
                  is_custom: true
                };
                resolve(savedPath);
              }
            }
          } else {
            // Для браузера: конвертируем в base64
            const base64Data = e.target.result.split(',')[1];
            
            const response = await fetch(`http://localhost:3000/api/sounds/${userId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sound_type: soundType,
                file_data: base64Data,
                volume: this.settings[soundType]?.volume || 80,
                enabled: true
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                this.settings[soundType] = {
                  ...this.settings[soundType],
                  is_custom: true
                };
                resolve(data.sound.file_path);
              }
            }
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  // Сброс на стандартный звук
  async resetToDefault(userId, soundType) {
    try {
      const response = await fetch(`http://localhost:3000/api/sounds/${userId}/${soundType}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.settings[soundType] = {
            ...this.settings[soundType],
            path: null,
            is_custom: false
          };
          return true;
        }
      }
      return false;
      
    } catch (error) {
      console.error('Ошибка сброса звука:', error);
      return false;
    }
  }
  
  // Дефолтные звуки (Web Audio API)
  createDefaultNotificationSound(volume = 0.8) {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }
  
  createDefaultCallSound(volume = 0.9) {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.2);
    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.4);
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.8);
  }
  
  createDefaultLoginSound(volume = 0.7) {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // Создаем несколько осцилляторов для более богатого звука
    for (let i = 0; i < 3; i++) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(300 + (i * 100), now);
      oscillator.frequency.setValueAtTime(500 + (i * 100), now + 0.3);
      oscillator.type = i === 0 ? 'sine' : 'triangle';
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume * (0.7 - i * 0.2), now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    }
  }
  
  createDefaultLogoutSound(volume = 0.6) {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime + 0.2);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.4);
  }
  
  createDefaultStatusSound(volume = 0.5) {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(700, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.1);
    oscillator.type = 'triangle';
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }
  
  // Методы для удобства
  playMessage() { this.play('message'); }
  playCall() { this.play('call'); }
  playLogin() { this.play('login'); }
  playLogout() { this.play('logout'); }
  playStatusChange(status) { this.play('status_change'); }
  
  // Получение всех настроек
  getAllSettings() {
    return this.settings;
  }
  
  // Получение конкретной настройки
  getSetting(soundType) {
    return this.settings[soundType];
  }
  
  // Проверка, инициализирован ли менеджер
  isInitialized() {
    return this.initialized;
  }
}

// Экспортируем синглтон
const soundManager = new SoundManager();
export default soundManager;