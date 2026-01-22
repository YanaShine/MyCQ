import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  CameraIcon,
  CheckCircleIcon,
  PencilIcon,
  GlobeAltIcon,
  BellIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const UserProfile = ({ user, onClose, onUpdate }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    display_name: user?.display_name || '',
    status_message: user?.status_message || '',
    status: user?.status || 'online',
    avatar_color: user?.avatar_color || '#667eea'
  });
  const [statusColors] = useState([
    { value: 'online', label: 'В сети', color: '#10B981', bg: 'bg-green-900/20' },
    { value: 'away', label: 'Отошел', color: '#F59E0B', bg: 'bg-yellow-900/20' },
    { value: 'busy', label: 'Занят', color: '#EF4444', bg: 'bg-red-900/20' },
    { value: 'offline', label: 'Не в сети', color: '#6B7280', bg: 'bg-gray-900/20' }
  ]);

  const colorPresets = [
    '#667eea', '#764ba2', '#f56565', '#ed8936', '#ecc94b',
    '#48bb78', '#38b2ac', '#4299e1', '#9f7aea', '#ed64a6'
  ];

  useEffect(() => {
    setFormData({
      display_name: user?.display_name || '',
      status_message: user?.status_message || '',
      status: user?.status || 'online',
      avatar_color: user?.avatar_color || '#667eea'
    });
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
    setEditMode(false);
  };

  const handleColorSelect = (color) => {
    setFormData({ ...formData, avatar_color: color });
  };

  if (!user) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {editMode ? 'Редактирование профиля' : 'Мой профиль'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Аватар и основная информация */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            <div className="flex flex-col items-center">
              <div 
                className="w-32 h-32 rounded-2xl flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-xl"
                style={{ backgroundColor: formData.avatar_color }}
              >
                {formData.display_name?.charAt(0) || user.username?.charAt(0)}
              </div>
              
              {editMode && (
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2 text-center">Цвет аватара:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorSelect(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.avatar_color === color 
                            ? 'border-white' 
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">
                  Имя пользователя
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="input-field w-full bg-gray-900/50 cursor-not-allowed"
                  />
                  <span className="text-xs text-gray-500 font-mono px-3 py-2 bg-gray-800/50 rounded-lg">
                    ID: {user.mycq_id}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">
                  Отображаемое имя
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  disabled={!editMode}
                  className="input-field w-full"
                  placeholder="Введите имя"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">
                  Статус
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {statusColors.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => editMode && setFormData({ ...formData, status: status.value })}
                      className={`p-3 rounded-xl border transition-all ${
                        formData.status === status.value
                          ? 'border-gray-600 bg-gray-800/50'
                          : 'border-transparent hover:border-gray-600'
                      } ${status.bg} ${!editMode && 'cursor-default'}`}
                      disabled={!editMode}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-sm text-gray-300">{status.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">
                  Статус-сообщение
                </label>
                <input
                  type="text"
                  value={formData.status_message}
                  onChange={(e) => setFormData({ ...formData, status_message: e.target.value })}
                  disabled={!editMode}
                  className="input-field w-full"
                  placeholder="Например: За работой..."
                />
              </div>
            </div>
          </div>

          {/* Дополнительные настройки */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BellIcon className="w-5 h-5" />
              Настройки уведомлений
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl cursor-pointer hover:bg-gray-800/50 transition-colors">
                <span className="text-gray-300">Звуковые уведомления</span>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
              <label className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl cursor-pointer hover:bg-gray-800/50 transition-colors">
                <span className="text-gray-300">Уведомления в трее</span>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
              <label className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl cursor-pointer hover:bg-gray-800/50 transition-colors">
                <span className="text-gray-300">Уведомления о прочтении</span>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
            </div>
          </div>

          {/* Конфиденциальность */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5" />
              Конфиденциальность
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl cursor-pointer hover:bg-gray-800/50 transition-colors">
                <span className="text-gray-300">Показывать статус онлайн</span>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
              <label className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl cursor-pointer hover:bg-gray-800/50 transition-colors">
                <span className="text-gray-300">Разрешить добавлять в контакты</span>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
              <label className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl cursor-pointer hover:bg-gray-800/50 transition-colors">
                <span className="text-gray-300">Показывать время последнего посещения</span>
                <input type="checkbox" className="toggle" defaultChecked />
              </label>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-700/50">
            <div className="text-sm text-gray-500">
              <p>Аккаунт создан: {new Date(user.created_at).toLocaleDateString()}</p>
              <p>Последний вход: {new Date().toLocaleDateString()}</p>
            </div>
            
            <div className="flex gap-3">
              {editMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setFormData({
                        display_name: user.display_name || '',
                        status_message: user.status_message || '',
                        status: user.status || 'online',
                        avatar_color: user.avatar_color || '#667eea'
                      });
                    }}
                    className="btn-secondary"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center gap-2"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Сохранить
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <PencilIcon className="w-5 h-5" />
                  Редактировать профиль
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;