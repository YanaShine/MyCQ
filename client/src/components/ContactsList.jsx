import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  XMarkIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  VideoCameraIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

const ContactsList = ({ currentUser, onClose, onSelectContact }) => {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContactData, setNewContactData] = useState({
    username: '',
    nickname: ''
  });

  useEffect(() => {
    if (currentUser) {
      loadContacts();
    }
  }, [currentUser]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:3000/api/contacts/${currentUser.id}`
      );
      
      if (response.data.success) {
        setContacts(response.data.contacts || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки контактов:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:3000/api/users/search?q=${searchQuery}`
      );
      
      if (response.data.success) {
        // Фильтруем уже добавленные контакты
        const contactIds = contacts.map(c => c.contact_id);
        const newUsers = response.data.users.filter(
          user => !contactIds.includes(user.id) && user.id !== currentUser.id
        );
        
        // Показываем результаты поиска
        setContacts(prev => [
          ...prev,
          ...newUsers.map(user => ({
            contact_id: user.id,
            user_info: user,
            is_search_result: true
          }))
        ]);
      }
    } catch (error) {
      console.error('Ошибка поиска:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async (user) => {
    try {
      await axios.post('http://localhost:3000/api/contacts', {
        user_id: currentUser.id,
        contact_id: user.id,
        nickname: newContactData.nickname || user.display_name
      });
      
      setNewContactData({ username: '', nickname: '' });
      setShowAddForm(false);
      loadContacts(); // Перезагружаем список
      
      alert(`Контакт ${user.display_name} добавлен!`);
    } catch (error) {
      console.error('Ошибка добавления:', error);
      alert('Ошибка добавления контакта');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const user = contact.user_info;
    if (!user) return false;
    
    return user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.mycq_id?.includes(searchQuery);
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
            Контакты
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
            >
              <UserPlusIcon className="w-4 h-4" />
              Добавить контакт
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Форма добавления контакта */}
        {showAddForm && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Добавить новый контакт</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newContactData.username}
                onChange={(e) => setNewContactData({ ...newContactData, username: e.target.value })}
                placeholder="Имя пользователя или MyCQ ID"
                className="input-field flex-1"
              />
              <input
                type="text"
                value={newContactData.nickname}
                onChange={(e) => setNewContactData({ ...newContactData, nickname: e.target.value })}
                placeholder="Псевдоним (необязательно)"
                className="input-field w-48"
              />
              <button
                onClick={() => searchUsers()}
                className="btn-primary flex items-center gap-2"
                disabled={!newContactData.username.trim()}
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
                Найти
              </button>
            </div>
          </div>
        )}

        {/* Поиск */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск контактов..."
              className="input-field w-full pl-12"
            />
          </div>
        </div>

        {/* Список контактов */}
        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-mycq-primary/30 border-t-mycq-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Загрузка контактов...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <UserPlusIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Контакты не найдены</h4>
              <p className="text-gray-400 mb-4">
                {searchQuery ? 'Попробуйте изменить запрос поиска' : 'Добавьте свой первый контакт!'}
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary"
              >
                Добавить контакт
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact) => {
                const user = contact.user_info;
                if (!user) return null;

                return (
                  <div
                    key={contact.contact_id}
                    className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      if (!contact.is_search_result) {
                        onSelectContact(user);
                        onClose();
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: user.avatar_color || '#667eea' }}
                        >
                          {user.display_name?.charAt(0) || user.username?.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(user.status)}`}></div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white">
                            {contact.nickname || user.display_name || user.username}
                          </h4>
                          {contact.is_favorite && (
                            <StarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                          {contact.is_search_result && (
                            <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full">
                              Найден
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          @{user.username} • ID: {user.mycq_id}
                        </p>
                        {user.status_message && (
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            {user.status_message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!contact.is_search_result ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectContact(user);
                              onClose();
                            }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Начать чат"
                          >
                            <ChatBubbleLeftRightIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert('Звонок скоро будет доступен!');
                            }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Позвонить"
                          >
                            <PhoneIcon className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddContact(user);
                          }}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          Добавить
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Меню действий
                        }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Статистика */}
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-800/30 rounded-xl">
              <p className="text-2xl font-bold text-white">
                {contacts.filter(c => !c.is_search_result).length}
              </p>
              <p className="text-sm text-gray-400">Контакты</p>
            </div>
            <div className="text-center p-3 bg-gray-800/30 rounded-xl">
              <p className="text-2xl font-bold text-white">
                {contacts.filter(c => c.user_info?.status === 'online').length}
              </p>
              <p className="text-sm text-gray-400">В сети</p>
            </div>
            <div className="text-center p-3 bg-gray-800/30 rounded-xl">
              <p className="text-2xl font-bold text-white">
                {contacts.filter(c => c.is_favorite).length}
              </p>
              <p className="text-sm text-gray-400">Избранные</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsList;