import React, { useState } from 'react';
import axios from 'axios';

const LoginScreen = ({ onLogin, onRegister, isLoading }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    display_name: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLoginMode) {
      // Проверка регистрации
      if (formData.password !== formData.confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
      if (formData.password.length < 6) {
        setError('Пароль должен быть не менее 6 символов');
        return;
      }
      if (!formData.username || !formData.email || !formData.password) {
        setError('Заполните все обязательные поля');
        return;
      }

      await onRegister({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        display_name: formData.display_name || formData.username
      });
    } else {
      // Вход
      if (!formData.username || !formData.password) {
        setError('Введите логин и пароль');
        return;
      }
      
      await onLogin({
        username: formData.username,
        password: formData.password
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-mycq-primary to-mycq-secondary rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">MQ</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-mycq-primary to-mycq-secondary bg-clip-text text-transparent">
              MyCQ Messenger
            </h1>
          </div>
          <p className="text-gray-400">
            Современный мессенджер с душой ICQ
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLoginMode && (
            <>
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">
                  Имя пользователя *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  placeholder="alice123"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  placeholder="alice@example.com"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">
                  Отображаемое имя
                </label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  placeholder="Алиса"
                />
              </div>
            </>
          )}

          {isLoginMode && (
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">
                Логин или Email *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="input-field w-full"
                placeholder="alice123 или alice@example.com"
                required
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">
              Пароль *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="input-field w-full"
              placeholder="••••••••"
              required
            />
          </div>

          {!isLoginMode && (
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">
                Подтвердите пароль *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="input-field w-full"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full mb-4"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                {isLoginMode ? 'Вход...' : 'Регистрация...'}
              </div>
            ) : (
              isLoginMode ? 'Войти в MyCQ' : 'Создать аккаунт'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError('');
                setFormData({
                  username: '',
                  email: '',
                  password: '',
                  display_name: '',
                  confirmPassword: ''
                });
              }}
              className="text-mycq-primary hover:text-mycq-secondary transition-colors"
            >
              {isLoginMode 
                ? 'Нет аккаунта? Зарегистрироваться' 
                : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-700/50">
          <p className="text-gray-500 text-sm text-center">
            Тестовые аккаунты:
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="text-center p-2 bg-gray-800/30 rounded-lg">
              <p className="text-gray-300 font-medium">alice</p>
              <p className="text-gray-500 text-xs">Пароль: 123</p>
            </div>
            <div className="text-center p-2 bg-gray-800/30 rounded-lg">
              <p className="text-gray-300 font-medium">bob</p>
              <p className="text-gray-500 text-xs">Пароль: 123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;