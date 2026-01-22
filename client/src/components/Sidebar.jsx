import React, { useState } from 'react';
import { 
  UserCircleIcon, 
  UsersIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ user, onProfileClick, onContactsClick, onLogout }) => {
  const [activeTab, setActiveTab] = useState('chats');

  const menuItems = [
    { id: 'chats', icon: ChatBubbleLeftRightIcon, label: 'Чаты', count: 3 },
    { id: 'contacts', icon: UsersIcon, label: 'Контакты', action: onContactsClick },
    { id: 'search', icon: MagnifyingGlassIcon, label: 'Поиск' },
    { id: 'notifications', icon: BellIcon, label: 'Уведомления', count: 5 },
    { id: 'settings', icon: Cog6ToothIcon, label: 'Настройки' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-mycq-online';
      case 'away': return 'bg-mycq-away';
      case 'busy': return 'bg-mycq-busy';
      default: return 'bg-mycq-offline';
    }
  };

  return (
    <div className="w-20 lg:w-64 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50 flex flex-col">
      {/* Заголовок */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-center lg:justify-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-mycq-primary to-mycq-secondary rounded-xl flex items-center justify-center">
            <span className="text-lg font-bold text-white">MQ</span>
          </div>
          <div className="hidden lg:block">
            <h2 className="text-lg font-bold text-white">MyCQ</h2>
            <p className="text-xs text-gray-400">Messenger</p>
          </div>
        </div>
      </div>

      {/* Профиль пользователя */}
      <div 
        onClick={onProfileClick}
        className="p-4 border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold`}
                 style={{ backgroundColor: user?.avatar_color || '#667eea' }}>
              {user?.display_name?.charAt(0) || 'U'}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${getStatusColor(user?.status)}`}></div>
          </div>
          
          <div className="hidden lg:block flex-1">
            <p className="font-medium text-white truncate">
              {user?.display_name || user?.username}
            </p>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${getStatusColor(user?.status)}`}></span>
              <p className="text-xs text-gray-400 capitalize">
                {user?.status || 'offline'}
              </p>
            </div>
            <p className="text-xs text-gray-500 font-mono mt-1">
              ID: {user?.mycq_id || '000000000'}
            </p>
          </div>
          
          <UserCircleIcon className="hidden lg:block w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Меню */}
      <nav className="flex-1 p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.action) item.action();
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1 transition-all
                ${isActive 
                  ? 'bg-gradient-to-r from-mycq-primary/20 to-mycq-secondary/20 text-mycq-primary border border-mycq-primary/30' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/30'}`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.count && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {item.count}
                  </span>
                )}
              </div>
              <span className="hidden lg:block font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Выход */}
      <div className="p-4 border-t border-gray-700/50">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6" />
          <span className="hidden lg:block font-medium">Выйти</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;