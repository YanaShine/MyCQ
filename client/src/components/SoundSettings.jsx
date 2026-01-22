import React, { useState, useEffect, useRef } from 'react';
import { 
  XMarkIcon, 
  MusicalNoteIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  ArrowPathIcon,
  TrashIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import soundManager from '../utils/SoundManager';
import { useAuth } from '../contexts/AuthContext';

const SoundSettings = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [sounds, setSounds] = useState({});
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [selectedSound, setSelectedSound] = useState(null);
  const fileInputRef = useRef(null);
  
  const soundTypes = [
    { id: 'message', name: 'Сообщения', description: 'Звук при получении нового сообщения' },
    { id: 'call', name: 'Звонки', description: 'Звук входящего звонка' },
    { id: 'user_online', name: 'Друг онлайн', description: 'Звук когда друг появляется в сети' },
    { id: 'user_offline', name: 'Друг офлайн', description: 'Звук когда друг выходит из сети' },
    { id: 'call_start', name: 'Начало звонка', description: 'Звук начала звонка' },
    { id: 'call_end', name: 'Конец звонка', description: 'Звук завершения звонка' }
  ];
  
  useEffect(() => {
    loadSoundSettings();
  }, []);
  
  const loadSoundSettings = async () => {
    if (!currentUser?.id) return;
    
    try {
      // Инициализируем SoundManager
      await soundManager.init(currentUser.id);
      
      // Получаем настройки
      const settings = soundManager.getAllSettings();
      setSounds(settings);
      
    } catch (error) {
      console.error('Ошибка загрузки настроек звуков:', error);
    }
  };
  
  const handleVolumeChange = async (soundType, volume) => {
    if (!currentUser?.id) return;
    
    try {
      const success = await soundManager.updateSetting(
        currentUser.id, 
        soundType, 
        { volume: parseInt(volume) }
      );
      
      if (success) {
        setSounds(prev => ({
          ...prev,
          [soundType]: { ...prev[soundType], volume: parseInt(volume) }
        }));
      }
    } catch (error) {
      console.error('Ошибка изменения громкости:', error);
    }
  };
  
  const handleToggleSound = async (soundType, enabled) => {
    if (!currentUser?.id) return;
    
    try {
      const success = await soundManager.updateSetting(
        currentUser.id, 
        soundType, 
        { enabled }
      );
      
      if (success) {
        setSounds(prev => ({
          ...prev,
          [soundType]: { ...prev[soundType], enabled }
        }));
      }
    } catch (error) {
      console.error('Ошибка переключения звука:', error);
    }
  };
  
  const handleFileSelect = (soundType) => {
    setSelectedSound(soundType);
    fileInputRef.current.click();
  };
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedSound || !currentUser?.id) return;
    
    // Проверяем формат файла
    const validTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'];
    if (!validTypes.includes(file.type)) {
      alert('Пожалуйста, выберите файл в формате MP3, WAV или OGG');
      return;
    }
    
    // Проверяем размер (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер: 5MB');
      return;
    }
    
    setUploading(true);
    
    try {
      await soundManager.uploadCustomSound(currentUser.id, selectedSound, file);
      
      // Обновляем состояние
      const settings = soundManager.getAllSettings();
      setSounds(settings);
      
      alert('Звук успешно загружен!');
      
    } catch (error) {
      console.error('Ошибка загрузки звука:', error);
      alert('Не удалось загрузить звук');
    } finally {
      setUploading(false);
      setSelectedSound(null);
      event.target.value = ''; // Сбрасываем input
    }
  };
  
  const handleResetSound = async (soundType) => {
    if (!currentUser?.id || !window.confirm('Сбросить звук на стандартный?')) return;
    
    try {
      const success = await soundManager.resetToDefault(currentUser.id, soundType);
      
      if (success) {
        const settings = soundManager.getAllSettings();
        setSounds(settings);
        alert('Звук сброшен на стандартный');
      }
    } catch (error) {
      console.error('Ошибка сброса звука:', error);
      alert('Не удалось сбросить звук');
    }
  };
  
  const handlePlaySound = (soundType) => {
    setPlaying(soundType);
    soundManager.play(soundType);
    
    // Сбрасываем состояние через секунду
    setTimeout(() => setPlaying(null), 1000);
  };
  
  const renderSoundCard = (soundType, config) => {
    const soundInfo = soundTypes.find(s => s.id === soundType);
    if (!soundInfo) return null;
    
    const isCustom = config?.is_custom || false;
    const isEnabled = config?.enabled !== false;
    
    return (
      <div key={soundType} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-700/50 rounded-lg">
              <MusicalNoteIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">{soundInfo.name}</h3>
              <p className="text-sm text-gray-400">{soundInfo.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePlaySound(soundType)}
              disabled={playing === soundType || !isEnabled}
              className={`p-2 rounded-lg ${playing === soundType ? 'bg-mycq-primary/20' : 'bg-gray-700/50 hover:bg-gray-700/80'}`}
              title="Прослушать"
            >
              {playing === soundType ? (
                <StopIcon className="w-4 h-4 text-white" />
              ) : (
                <PlayIcon className="w-4 h-4 text-gray-300" />
              )}
            </button>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => handleToggleSound(soundType, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mycq-primary"></div>
            </label>
          </div>
        </div>
        
        {/* Индикатор кастомного звука */}
        {isCustom && (
          <div className="mb-3">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-mycq-primary/20 text-mycq-primary">
              Пользовательский звук
            </span>
          </div>
        )}
        
        {/* Громкость */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Громкость</span>
            <span className="text-sm text-white">{config?.volume || 80}%</span>
          </div>
          <div className="flex items-center gap-3">
            <SpeakerXMarkIcon className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={config?.volume || 80}
              onChange={(e) => handleVolumeChange(soundType, e.target.value)}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              disabled={!isEnabled}
            />
            <SpeakerWaveIcon className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        
        {/* Управление звуком */}
        <div className="flex gap-2">
          <button
            onClick={() => handleFileSelect(soundType)}
            className="flex-1 btn-secondary py-2 text-sm"
            disabled={uploading}
          >
            {isCustom ? 'Изменить звук' : 'Загрузить свой звук'}
          </button>
          
          {isCustom && (
            <button
              onClick={() => handleResetSound(soundType)}
              className="btn-danger py-2 px-3"
              title="Сбросить на стандартный"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-mycq-primary/20 rounded-lg">
              <MusicalNoteIcon className="w-6 h-6 text-mycq-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Настройки звуков</h2>
              <p className="text-gray-400">Настройте звуки уведомлений для разных событий</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Основные настройки */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Звуки уведомлений</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {soundTypes.map(soundType => renderSoundCard(soundType.id, sounds[soundType.id]))}
          </div>
          
          <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
            <h4 className="font-medium text-white mb-2 flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4" />
              Сброс всех настроек
            </h4>
            <p className="text-sm text-gray-400 mb-3">
              Вернет все звуки к стандартным настройкам
            </p>
            <button
              onClick={() => {
                if (window.confirm('Сбросить ВСЕ звуки на стандартные?')) {
                  soundTypes.forEach(st => handleResetSound(st.id));
                }
              }}
              className="btn-danger py-2 px-4"
            >
              Сбросить все звуки
            </button>
          </div>
        </div>
        
        {/* Информация */}
        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
          <h4 className="font-medium text-white mb-2">Информация</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Поддерживаемые форматы: MP3, WAV, OGG (макс. 5MB)</li>
            <li>• Звуки хранятся локально на вашем устройстве</li>
            <li>• Для браузера звуки конвертируются в Base64</li>
            <li>• Для Electron звуки сохраняются в папке приложения</li>
          </ul>
        </div>
        
        {/* Скрытый input для загрузки файлов */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".mp3,.wav,.ogg,.mpeg"
          className="hidden"
        />
        
        {/* Индикатор загрузки */}
        {uploading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mycq-primary"></div>
              <p className="text-white">Загрузка звука...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoundSettings;