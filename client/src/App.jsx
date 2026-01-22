import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

// Компоненты
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import UserProfile from './components/UserProfile';
import ContactsList from './components/ContactsList';
import SoundSettings from './components/SoundSettings';
import ActivityStatus from './components/ActivityStatus'; // Новый компонент

// Утилиты
import soundManager from './utils/SoundManager';
import activityMonitor from './utils/ActivityMonitor';

// Контекст
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { ActivityProvider } from './contexts/ActivityContext'; // Новый контекст

// Стили
import './styles/app.css';

// Конфигурация
const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [showActivityStatus, setShowActivityStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Инициализация приложения
  useEffect(() => {
    const savedUser = localStorage.getItem('mycq_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
        connectWebSocket(user.id);
        
        // Инициализируем SoundManager
        soundManager.init(user.id);
        
      } catch (error) {
        localStorage.removeItem('mycq_user');
      }
    }
  }, []);

  // Подключение WebSocket
  const connectWebSocket = (userId) => {
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket подключен');
      newSocket.emit('user_online', userId);
      
      // Запускаем отслеживание активности
      activityMonitor.startMonitoring(userId, newSocket);
    });

    newSocket.on('new_message', (data) => {
      handleNewMessage(data);
    });

    newSocket.on('user_status_changed', (data) => {
      handleUserStatusChange(data);
    });

    newSocket.on('user_activity_changed', (data) => {
      handleUserActivityChange(data);
    });

    newSocket.on('message_sent', (data) => {
      console.log('Сообщение отправлено:', data);
    });

    setSocket(newSocket);
  };

  // Обработка входа
  const handleLogin = async (credentials) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, credentials);
      
      if (response.data.success) {
        const user = response.data.user;
        setCurrentUser(user);
        setIsAuthenticated(true);
        
        localStorage.setItem('mycq_user', JSON.stringify(user));
        connectWebSocket(user.id);
        
        // Инициализируем SoundManager
        await soundManager.init(user.id);
        
        // Проигрываем мелодию входа
        soundManager.playLogin();
        
        // Уведомление
        if (window.electronAPI) {
          window.electronAPI.showNotification(
            'MyCQ Messenger',
            `Добро пожаловать, ${user.display_name}!`
          );
        }
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      alert(error.response?.data?.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка регистрации
  const handleRegister = async (userData) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/register`, userData);
      
      if (response.data.success) {
        alert(response.data.message);
        await handleLogin({
          username: userData.username,
          password: userData.password
        });
      }
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      alert(error.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  // Выход из системы
  const handleLogout = () => {
    // Останавливаем отслеживание активности
    activityMonitor.stopMonitoring();
    
    // Проигрываем мелодию выхода
    soundManager.playLogout();
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveChat(null);
    localStorage.removeItem('mycq_user');
  };

  // Обработка нового сообщения
  const handleNewMessage = (data) => {
    console.log('Новое сообщение:', data);
    
    // Воспроизводим звук уведомления
    if (data.sound_notification?.enabled) {
      if (data.sound_notification.is_custom && data.sound_notification.sound_path) {
        // Кастомный звук
        soundManager.playFile(data.sound_notification.sound_path, data.sound_notification.volume / 100);
      } else {
        // Дефолтный звук
        soundManager.playMessage();
      }
    }
    
    // Уведомление
    if (!document.hasFocus() && window.electronAPI) {
      window.electronAPI.showNotification(
        'Новое сообщение',
        data.message?.content?.substring(0, 100) || 'Новое сообщение'
      );
    }
  };

  // Обработка изменения статуса пользователя
  const handleUserStatusChange = (data) => {
    console.log('Статус пользователя изменился:', data);
    
    // Звук смены статуса
    soundManager.playStatusChange();
  };

  // Обработка изменения активности пользователя
  const handleUserActivityChange = (data) => {
    console.log('Активность пользователя изменилась:', data);
    
    // Можно обновить UI для показа активности друзей
    // Например, показать иконку игры/музыки рядом с именем
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLogin={handleLogin}
        onRegister={handleRegister}
        isLoading={isLoading}
      />
    );
  }

  return (
    <AuthProvider value={{ currentUser, logout: handleLogout }}>
      <ActivityProvider value={{ monitor: activityMonitor }}>
        <ChatProvider value={{ activeChat, setActiveChat }}>
          <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
            {/* Боковая панель */}
            <Sidebar 
              user={currentUser}
              onProfileClick={() => setShowProfile(true)}
              onContactsClick={() => setShowContacts(true)}
              onLogout={handleLogout}
              onSoundSettingsClick={() => setShowSoundSettings(true)}
              onActivityStatusClick={() => setShowActivityStatus(true)}
            />
            
            {/* Основное окно чата */}
            <div className="flex-1 flex flex-col">
              <ChatWindow 
                socket={socket}
                currentUser={currentUser}
                activeChat={activeChat}
              />
            </div>
            
            {/* Модальные окна */}
            {showProfile && (
              <UserProfile
                user={currentUser}
                onClose={() => setShowProfile(false)}
                onUpdate={(updates) => {
                  const updatedUser = { ...currentUser, ...updates };
                  setCurrentUser(updatedUser);
                  localStorage.setItem('mycq_user', JSON.stringify(updatedUser));
                  
                  if (socket) {
                    socket.emit('update_status', updates);
                  }
                }}
              />
            )}
            
            {showContacts && (
              <ContactsList
                currentUser={currentUser}
                onClose={() => setShowContacts(false)}
                onSelectContact={(contact) => {
                  setActiveChat(contact);
                  setShowContacts(false);
                }}
              />
            )}
            
            {showSoundSettings && (
              <SoundSettings onClose={() => setShowSoundSettings(false)} />
            )}
            
            {showActivityStatus && (
              <ActivityStatus 
                onClose={() => setShowActivityStatus(false)}
                socket={socket}
              />
            )}
          </div>
        </ChatProvider>
      </ActivityProvider>
    </AuthProvider>
  );
}

export default App;