import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  PlayIcon, 
  MusicalNoteIcon, 
  VideoCameraIcon,
  ComputerDesktopIcon,
  EyeSlashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import activityMonitor from '../utils/ActivityMonitor';
import { useAuth } from '../contexts/AuthContext';

const ActivityStatus = ({ onClose, socket }) => {
  const { currentUser } = useAuth();
  const [isSharing, setIsSharing] = useState(true);
  const [manualActivity, setManualActivity] = useState('');
  const [stats, setStats] = useState(null);
  
  const activityTypes = [
    { id: 'playing', icon: PlayIcon, label: 'Играет в', color: 'text-green-400' },
    { id: 'listening', icon: MusicalNoteIcon, label: 'Слушает', color: 'text-purple-400' },
    { id: 'watching', icon: VideoCameraIcon, label: 'Смотрит', color: 'text-red-400' },
    { id: 'streaming', icon: ComputerDesktopIcon, label: 'Стримит', color: 'text-blue-400' },
    { id: 'working', icon: ComputerDesktopIcon, label: 'Работает в', color: 'text-yellow-400' }
  ];
  
  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const updateStats = () => {
    setStats(activityMonitor.getStats());
  };
  
  const handleShareToggle = () => {
    const newSharing = !isSharing;
    setIsSharing(newSharing);
    activityMonitor.updateConfig({ shareActivities: newSharing });
  };
  
  const handleSetManualActivity = (type) => {
    if (!manualActivity.trim()) {
      alert('Введите название активности');
      return;
    }
    
    activityMonitor.setManualActivity({
      type,
      name: manualActivity.trim(),
      platform: 'manual'
    });
    
    setManualActivity('');
  };
  
  const handleStopActivity = () => {
    activityMonitor.stopCurrentActivity();
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Статус активности</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Текущая активность */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Текущая активность</h3>
            
            <button
              onClick={handleShareToggle}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isSharing ? 'bg-green-900/30 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}
            >
              {isSharing ? (
                <>
                  <EyeIcon className="w-4 h-4" />
                  <span>Поделиться</span>
                </>
              ) : (
                <>
                  <EyeSlashIcon className="w-4 h-4" />
                  <span>Скрыть</span>
                </>
              )}
            </button>
          </div>
          
          {stats?.currentActivity ? (
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {activityTypes.find(a => a.id === stats.currentActivity.type)?.icon && 
                      React.createElement(
                        activityTypes.find(a => a.id === stats.currentActivity.type).icon,
                        { className: `w-5 h-5 ${activityTypes.find(a => a.id === stats.currentActivity.type).color}` }
                      )
                    }
                    <span className="text-white font-medium">
                      {activityTypes.find(a => a.id === stats.currentActivity.type)?.label || 'Активен в'}
                    </span>
                  </div>
                  <p className="text-xl text-white">{stats.currentActivity.name}</p>
                  {stats.currentActivity.platform && (
                    <p className="text-sm text-gray-400 mt-1">Платформа: {stats.currentActivity.platform}</p>
                  )}
                  {stats.monitoringDuration > 0 && (
                    <p className="text-sm text-gray-400 mt-1">
                      Длительность: {Math.floor(stats.monitoringDuration / 60000)} мин.
                    </p>
                  )}
                </div>
                
                <button
                  onClick={handleStopActivity}
                  className="px-4 py-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors"
                >
                  Остановить
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/30 rounded-xl p-8 text-center border border-gray-700/50">
              <p className="text-gray-400">Активность не обнаружена</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats?.isMonitoring ? 
                  'Отслеживание активно...' : 
                  'Отслеживание остановлено'}
              </p>
            </div>
          )}
        </div>
        
        {/* Ручная установка активности */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Ручная установка</h3>
          
          <div className="mb-4">
            <input
              type="text"
              value={manualActivity}
              onChange={(e) => setManualActivity(e.target.value)}
              placeholder="Введите название игры, трека или видео..."
              className="input-field w-full mb-3"
            />
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {activityTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleSetManualActivity(type.id)}
                  disabled={!manualActivity.trim()}
                  className={`p-3 rounded-xl border ${type.color} border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <type.icon className="w-5 h-5" />
                    <span className="text-xs">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Статистика */}
        {stats && (
          <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-3">Статистика отслеживания</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Статус отслеживания</p>
                <p className="text-white font-medium">
                  {stats.isMonitoring ? 'Активно' : 'Остановлено'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Поделиться активностью</p>
                <p className="text-white font-medium">
                  {isSharing ? 'Включено' : 'Отключено'}
                </p>
              </div>
              
              {stats.currentActivity && (
                <>
                  <div>
                    <p className="text-sm text-gray-400">Тип активности</p>
                    <p className="text-white font-medium capitalize">{stats.currentActivity.type}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Время отслеживания</p>
                    <p className="text-white font-medium">
                      {Math.floor(stats.monitoringDuration / 60000)} мин.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityStatus;