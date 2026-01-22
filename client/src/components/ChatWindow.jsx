import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  PaperAirplaneIcon,
  PhotoIcon,
  FaceSmileIcon,
  PaperClipIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const ChatWindow = ({ socket, currentUser, activeChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Загрузка истории сообщений при выборе чата
  useEffect(() => {
    if (activeChat && currentUser) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [activeChat]);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Обработка WebSocket сообщений
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data.message && activeChat && 
          (data.message.sender_id === activeChat.id || 
           data.message.receiver_id === activeChat.id)) {
        setMessages(prev => [...prev, data.message]);
      }
    };

    const handleTyping = (data) => {
      if (data.user_id === activeChat?.id) {
        setIsTyping(data.is_typing);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [socket, activeChat]);

  const loadMessages = async () => {
    if (!activeChat || !currentUser) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:3000/api/messages/${currentUser.id}/${activeChat.id}`
      );
      
      if (response.data.success) {
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeChat || !socket) return;

    // Отправка через WebSocket
    socket.emit('send_message', {
      receiver_id: activeChat.id,
      content: newMessage.trim()
    });

    // Локальное добавление сообщения (для мгновенного отображения)
    const tempMessage = {
      id: Date.now(),
      sender_id: currentUser.id,
      receiver_id: activeChat.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      is_read: 0,
      is_delivered: 0
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    
    // Сброс индикатора набора
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('typing', {
      receiver_id: activeChat.id,
      is_typing: false
    });
  };

  const handleTyping = () => {
    if (!socket || !activeChat) return;

    // Оповещаем о наборе текста
    socket.emit('typing', {
      receiver_id: activeChat.id,
      is_typing: true
    });

    // Сбрасываем предыдущий таймер
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Через 2 секунды отправляем "перестал печатать"
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', {
        receiver_id: activeChat.id,
        is_typing: false
      });
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-r from-mycq-primary/20 to-mycq-secondary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ChatBubbleLeftRightIcon className="w-12 h-12 text-mycq-primary" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Добро пожаловать в MyCQ!
          </h3>
          <p className="text-gray-400 mb-6">
            Выберите собеседника из списка контактов или начните новый чат
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => alert('Функция поиска пользователей')}
              className="btn-secondary"
            >
              Найти пользователей
            </button>
            <button
              onClick={() => alert('Функция создания группы')}
              className="btn-primary"
            >
              Создать группу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Заголовок чата */}
      <div className="p-4 border-b border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: activeChat.avatar_color || '#4ecdc4' }}
              >
                {activeChat.display_name?.charAt(0) || activeChat.username?.charAt(0) || '?'}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                activeChat.status === 'online' ? 'bg-green-500' : 
                activeChat.status === 'away' ? 'bg-yellow-500' : 
                activeChat.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'
              }`}></div>
            </div>
            
            <div>
              <h3 className="font-bold text-white">
                {activeChat.display_name || activeChat.username}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-400">
                  {activeChat.status === 'online' ? 'В сети' : 
                   activeChat.status === 'away' ? 'Отошел' : 
                   activeChat.status === 'busy' ? 'Занят' : 'Не в сети'}
                </p>
                {isTyping && (
                  <div className="flex items-center gap-1 text-mycq-primary text-sm">
                    <div className="animate-typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    печатает...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors">
              <PhoneIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors">
              <VideoCameraIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors">
              <InformationCircleIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors">
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* История сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-mycq-primary/30 border-t-mycq-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Загрузка сообщений...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <PaperAirplaneIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Нет сообщений</h4>
              <p className="text-gray-400">Напишите первое сообщение!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUser.id;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 mb-2 ${
                  isOwn 
                    ? 'bg-gradient-to-r from-mycq-primary to-mycq-secondary text-white rounded-br-none' 
                    : 'bg-gray-700 text-gray-200 rounded-bl-none'
                }`}>
                  <p className="mb-1">{message.content}</p>
                  <div className={`flex items-center justify-end gap-2 text-xs ${
                    isOwn ? 'text-white/70' : 'text-gray-400'
                  }`}>
                    <span>{formatTime(message.created_at)}</span>
                    {isOwn && (
                      <span>
                        {message.is_delivered ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
        <div className="flex items-end gap-3">
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors">
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors">
              <PhotoIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors">
              <FaceSmileIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyPress}
              placeholder="Введите сообщение..."
              className="w-full input-field resize-none min-h-[60px] max-h-[120px]"
              rows={1}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-3 bg-gradient-to-r from-mycq-primary to-mycq-secondary text-white rounded-xl hover:shadow-lg hover:shadow-mycq-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>Нажмите Enter для отправки, Shift+Enter для новой строки</span>
          <span>{newMessage.length}/2000</span>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;