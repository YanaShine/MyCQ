const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto'); // Добавим для хеширования файлов

// Подключение к PostgreSQL
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Увеличим лимит для загрузки звуков

// ==== ПОДКЛЮЧЕНИЕ К POSTGRESQL ====
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mycq_db',
  password: 'postgres',
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Вспомогательная функция для проверки UUID
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Хранилище онлайн пользователей
const onlineUsers = new Map(); // userId -> socketId

// ==== API ЭНДПОИНТЫ ====

// 1. РЕГИСТРАЦИЯ (исправлена для UUID)
app.post('/api/register', async (req, res) => {
  const { username, email, password, display_name } = req.body;
  
  try {
    // Проверяем существование пользователя
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Пользователь уже существует' 
      });
    }
    
    // PostgreSQL сама сгенерирует MyCQ ID через триггер
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Сохраняем пользователя
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name, status) 
       VALUES ($1, $2, $3, $4, 'online') 
       RETURNING id, mycq_id, username, display_name, status, avatar_color, created_at`,
      [username, email, passwordHash, display_name || username]
    );
    
    const newUser = result.rows[0];
    
    // Создаём дефолтные настройки звуков
    const defaultSounds = [
      ['message', 'Оповещение о сообщении', true, 80],
      ['call', 'Входящий звонок', true, 90],
      ['user_online', 'Друг онлайн', true, 60],
      ['user_offline', 'Друг офлайн', false, 60],
      ['call_start', 'Начало звонка', true, 70],
      ['call_end', 'Конец звонка', true, 70]
    ];
    
    for (const [sound_type, sound_name, enabled, volume] of defaultSounds) {
      await pool.query(
        `INSERT INTO user_sound_settings 
         (user_id, sound_type, sound_name, enabled, volume, is_custom)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [newUser.id, sound_type, sound_name, enabled, volume]
      );
    }
    
    res.json({
      success: true,
      message: `Добро пожаловать в MyCQ! Ваш ID: ${newUser.mycq_id}`,
      user: newUser
    });
    
    console.log(`✅ Зарегистрирован: ${username} (MyCQ ID: ${newUser.mycq_id})`);
    
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. ВХОД (исправлен для UUID)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Ищем пользователя
    const result = await pool.query(
      `SELECT id, mycq_id, username, display_name, password_hash, 
              avatar_color, status, status_message, created_at
       FROM users WHERE username = $1 OR email = $1`,
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный логин или пароль' 
      });
    }
    
    const user = result.rows[0];
    
    // Проверяем пароль
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный логин или пароль' 
      });
    }
    
    // Обновляем статус
    await pool.query(
      'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
      ['online', user.id]
    );
    
    // Удаляем хеш пароля из ответа
    const { password_hash, ...userWithoutHash } = user;
    
    res.json({
      success: true,
      message: 'Вход выполнен успешно!',
      user: userWithoutHash
    });
    
    console.log(`✅ Пользователь вошел: ${user.username} (ID: ${user.mycq_id})`);
    
  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. ПОИСК ПОЛЬЗОВАТЕЛЕЙ
app.get('/api/users/search', async (req, res) => {
  const query = req.query.q;
  
  try {
    const result = await pool.query(
      `SELECT id, mycq_id, username, display_name, avatar_color, 
              status, status_message, last_seen,
              ua.activity_type, ua.activity_name, ua.platform, ua.details
       FROM users u
       LEFT JOIN user_activities ua ON u.id = ua.user_id AND ua.is_active = true
       WHERE username ILIKE $1 OR display_name ILIKE $1 OR mycq_id ILIKE $1
       ORDER BY 
         CASE status 
           WHEN 'online' THEN 1
           WHEN 'gaming' THEN 2
           WHEN 'streaming' THEN 3
           WHEN 'away' THEN 4
           WHEN 'busy' THEN 5
           ELSE 6
         END,
         username
       LIMIT 20`,
      [`%${query}%`]
    );
    
    res.json({ success: true, users: result.rows });
    
  } catch (error) {
    console.error('❌ Ошибка поиска:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. ПОЛУЧЕНИЕ КОНТАКТОВ (с активностями)
app.get('/api/contacts/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    if (!isValidUUID(userId)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат ID' });
    }
    
    const result = await pool.query(
      `SELECT c.contact_id, c.nickname, c.is_favorite,
              u.mycq_id, u.username, u.display_name, u.avatar_color, 
              u.status, u.status_message, u.last_seen,
              ua.activity_type, ua.activity_name, ua.platform, ua.details,
              ua.start_timestamp as activity_started
       FROM contacts c
       JOIN users u ON c.contact_id = u.id
       LEFT JOIN user_activities ua ON u.id = ua.user_id AND ua.is_active = true
       WHERE c.user_id = $1
       ORDER BY 
         CASE u.status 
           WHEN 'online' THEN 1
           WHEN 'gaming' THEN 2
           WHEN 'streaming' THEN 3
           WHEN 'away' THEN 4
           WHEN 'busy' THEN 5
           ELSE 6
         END,
         c.is_favorite DESC,
         u.display_name`,
      [userId]
    );
    
    res.json({ success: true, contacts: result.rows });
    
  } catch (error) {
    console.error('❌ Ошибка загрузки контактов:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. ДОБАВЛЕНИЕ КОНТАКТА
app.post('/api/contacts', async (req, res) => {
  const { user_id, contact_id, nickname } = req.body;
  
  try {
    if (!isValidUUID(user_id) || !isValidUUID(contact_id)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат ID' });
    }
    
    if (user_id === contact_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Нельзя добавить себя в контакты' 
      });
    }
    
    await pool.query(
      `INSERT INTO contacts (user_id, contact_id, nickname)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, contact_id) DO UPDATE 
       SET nickname = EXCLUDED.nickname,
           is_favorite = COALESCE(EXCLUDED.is_favorite, contacts.is_favorite)`,
      [user_id, contact_id, nickname]
    );
    
    res.json({ success: true, message: 'Контакт добавлен' });
    
  } catch (error) {
    console.error('❌ Ошибка добавления контакта:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. ИСТОРИЯ СООБЩЕНИЙ
app.get('/api/messages/:userId/:contactId', async (req, res) => {
  const { userId, contactId } = req.params;
  
  try {
    if (!isValidUUID(userId) || !isValidUUID(contactId)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат ID' });
    }
    
    const result = await pool.query(
      `SELECT m.*, 
              s.username as sender_name, s.display_name as sender_display,
              r.username as receiver_name, r.display_name as receiver_display
       FROM messages m
       LEFT JOIN users s ON m.sender_id = s.id
       LEFT JOIN users r ON m.recipient_id = r.id
       WHERE (m.sender_id = $1 AND m.recipient_id = $2)
          OR (m.sender_id = $2 AND m.recipient_id = $1)
       ORDER BY m.created_at DESC
       LIMIT 100`,
      [userId, contactId]
    );
    
    // Помечаем сообщения как прочитанные
    await pool.query(
      `UPDATE messages SET is_read = true 
       WHERE recipient_id = $1 AND sender_id = $2 AND is_read = false`,
      [userId, contactId]
    );
    
    res.json({ success: true, messages: result.rows.reverse() });
    
  } catch (error) {
    console.error('❌ Ошибка загрузки сообщений:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. ОБНОВЛЕНИЕ ПРОФИЛЯ
app.put('/api/profile/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { display_name, avatar_color, status, status_message } = req.body;
  
  try {
    if (!isValidUUID(userId)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат ID' });
    }
    
    const result = await pool.query(
      `UPDATE users 
       SET display_name = COALESCE($1, display_name),
           avatar_color = COALESCE($2, avatar_color),
           status = COALESCE($3, status),
           status_message = COALESCE($4, status_message),
           last_seen = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING mycq_id, username, display_name, avatar_color, status, status_message`,
      [display_name, avatar_color, status, status_message, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    res.json({ success: true, message: 'Профиль обновлен', user: result.rows[0] });
    
  } catch (error) {
    console.error('❌ Ошибка обновления профиля:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==== НОВЫЕ ЭНДПОИНТЫ ДЛЯ КАСТОМНЫХ ЗВУКОВ ====

// 8. ПОЛУЧЕНИЕ НАСТРОЕК ЗВУКОВ
app.get('/api/sounds/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    if (!isValidUUID(userId)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат ID' });
    }
    
    const result = await pool.query(
      `SELECT sound_type, sound_name, file_path, file_hash, volume, enabled, is_custom
       FROM user_sound_settings
       WHERE user_id = $1
       ORDER BY 
         CASE sound_type
           WHEN 'message' THEN 1
           WHEN 'call' THEN 2
           WHEN 'call_start' THEN 3
           WHEN 'call_end' THEN 4
           WHEN 'user_online' THEN 5
           WHEN 'user_offline' THEN 6
           ELSE 7
         END`,
      [userId]
    );
    
    // Если нет настроек - возвращаем дефолтные
    const sounds = result.rows.length > 0 ? result.rows : [
      { sound_type: 'message', sound_name: 'Оповещение о сообщении', enabled: true, volume: 80, is_custom: false },
      { sound_type: 'call', sound_name: 'Входящий звонок', enabled: true, volume: 90, is_custom: false },
      { sound_type: 'user_online', sound_name: 'Друг онлайн', enabled: true, volume: 60, is_custom: false },
      { sound_type: 'user_offline', sound_name: 'Друг офлайн', enabled: false, volume: 60, is_custom: false }
    ];
    
    res.json({ success: true, sounds });
    
  } catch (error) {
    console.error('❌ Ошибка загрузки звуков:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. ОБНОВЛЕНИЕ НАСТРОЕК ЗВУКА
app.put('/api/sounds/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { sound_type, file_path, file_data, volume, enabled } = req.body;
  
  try {
    if (!isValidUUID(userId)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат ID' });
    }
    
    let file_hash = null;
    if (file_data) {
      // Генерируем хеш для проверки целостности файла
      file_hash = crypto.createHash('sha256').update(file_data).digest('hex');
    }
    
    const result = await pool.query(
      `INSERT INTO user_sound_settings 
       (user_id, sound_type, sound_name, file_path, file_hash, volume, enabled, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (user_id, sound_type) DO UPDATE
       SET file_path = COALESCE(EXCLUDED.file_path, user_sound_settings.file_path),
           file_hash = COALESCE(EXCLUDED.file_hash, user_sound_settings.file_hash),
           volume = COALESCE(EXCLUDED.volume, user_sound_settings.volume),
           enabled = COALESCE(EXCLUDED.enabled, user_sound_settings.enabled),
           is_custom = true,
           last_used = CURRENT_TIMESTAMP
       RETURNING sound_type, sound_name, file_path, volume, enabled, is_custom`,
      [userId, sound_type, `Пользовательский звук (${sound_type})`, file_path, file_hash, volume || 80, enabled !== undefined ? enabled : true]
    );
    
    res.json({ success: true, message: 'Настройки звука обновлены', sound: result.rows[0] });
    
  } catch (error) {
    console.error('❌ Ошибка обновления звука:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 10. СБРОС ЗВУКА НА ДЕФОЛТНЫЙ
app.delete('/api/sounds/:userId/:soundType', async (req, res) => {
  const { userId, soundType } = req.params;
  
  try {
    if (!isValidUUID(userId)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат ID' });
    }
    
    await pool.query(
      'DELETE FROM user_sound_settings WHERE user_id = $1 AND sound_type = $2',
      [userId, soundType]
    );
    
    res.json({ success: true, message: 'Звук сброшен на стандартный' });
    
  } catch (error) {
    console.error('❌ Ошибка сброса звука:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==== ЭНДПОИНТЫ ДЛЯ СТАТУСОВ АКТИВНОСТИ ====

// 11. ОБНОВЛЕНИЕ СТАТУСА АКТИВНОСТИ
app.post('/api/activity/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { activity_type, activity_name, platform, details, sharing_enabled } = req.body;
  
  try {
    if (!isValidUUID(userId)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат ID' });
    }
    
    // Обновляем статус пользователя
    let userStatus = 'online';
    if (activity_type === 'playing' || activity_type === 'gaming') userStatus = 'gaming';
    else if (activity_type === 'streaming') userStatus = 'streaming';
    
    await pool.query(
      'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
      [userStatus, userId]
    );
    
    // Добавляем активность
    const result = await pool.query(
      `INSERT INTO user_activities 
       (user_id, activity_type, activity_name, platform, details, is_active, sharing_enabled)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, activity_type, activity_name, platform, details, start_timestamp`,
      [userId, activity_type, activity_name, platform, details, sharing_enabled !== false]
    );
    
    const activity = result.rows[0];
    
    res.json({ 
      success: true, 
      message: 'Статус активности обновлен', 
      activity,
      user_status: userStatus 
    });
    
    // Оповещаем всех через WebSocket
    io.emit('user_activity_changed', {
      user_id: userId,
      activity,
      status: userStatus
    });
    
  } catch (error) {
    console.error('❌ Ошибка обновления активности:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 12. ОСТАНОВКА АКТИВНОСТИ
app.post('/api/activity/:userId/stop', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    if (!isValidUUID(userId)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат ID' });
    }
    
    // Завершаем все активные активности
    await pool.query(
      `UPDATE user_activities 
       SET is_active = false, end_timestamp = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    
    // Возвращаем стандартный статус
    await pool.query(
      'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
      ['online', userId]
    );
    
    res.json({ success: true, message: 'Активность остановлена' });
    
    // Оповещаем всех
    io.emit('user_activity_stopped', { user_id: userId, status: 'online' });
    
  } catch (error) {
    console.error('❌ Ошибка остановки активности:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 13. ПОЛУЧЕНИЕ АКТИВНЫХ АКТИВНОСТЕЙ ДРУЗЕЙ
app.get('/api/activities/friends/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    if (!isValidUUID(userId)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат ID' });
    }
    
    const result = await pool.query(
      `SELECT ua.*, u.display_name, u.avatar_color, u.status
       FROM user_activities ua
       JOIN users u ON ua.user_id = u.id
       JOIN contacts c ON ua.user_id = c.contact_id
       WHERE c.user_id = $1 
         AND ua.is_active = true
         AND ua.sharing_enabled = true
       ORDER BY ua.start_timestamp DESC`,
      [userId]
    );
    
    res.json({ success: true, activities: result.rows });
    
  } catch (error) {
    console.error('❌ Ошибка загрузки активностей:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==== WebSocket СОЕДИНЕНИЯ ====
io.on('connection', (socket) => {
  console.log('🔌 Новое WebSocket подключение:', socket.id);
  
  // Пользователь входит онлайн
  socket.on('user_online', (userId) => {
    if (!isValidUUID(userId)) {
      console.error('❌ Неверный формат userId:', userId);
      return;
    }
    
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    
    // Обновляем статус в БД
    pool.query(
      'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
      ['online', userId]
    );
    
    // Оповещаем всех о новом онлайн пользователе
    socket.broadcast.emit('user_status_changed', {
      user_id: userId,
      status: 'online'
    });
    
    console.log(`✅ Пользователь ${userId} онлайн`);
  });
  
  // Отправка сообщения с проверкой звуков
  socket.on('send_message', async (data) => {
    const { receiver_id, content } = data;
    const sender_id = socket.userId;
    
    try {
      if (!isValidUUID(sender_id) || !isValidUUID(receiver_id)) {
        throw new Error('Некорректный формат ID');
      }
      
      // Сохраняем сообщение
      const result = await pool.query(
        `INSERT INTO messages (sender_id, recipient_id, content, is_delivered) 
         VALUES ($1, $2, $3, false)
         RETURNING id, sender_id, recipient_id, content, created_at`,
        [sender_id, receiver_id, content]
      );
      
      const message = result.rows[0];
      
      // Получаем настройки звуков получателя
      const soundResult = await pool.query(
        `SELECT sound_type, file_path, volume 
         FROM user_sound_settings 
         WHERE user_id = $1 AND sound_type = 'message' AND enabled = true`,
        [receiver_id]
      );
      
      // Отправляем получателю, если он онлайн
      const receiverSocketId = onlineUsers.get(receiver_id);
      if (receiverSocketId) {
        const soundSettings = soundResult.rows[0] || null;
        
        io.to(receiverSocketId).emit('new_message', {
          message: {
            ...message,
            is_delivered: true
          },
          sound_notification: soundSettings ? {
            enabled: true,
            sound_path: soundSettings.file_path,
            volume: soundSettings.volume || 80,
            is_custom: true
          } : {
            enabled: true,
            sound_path: null,
            volume: 80,
            is_custom: false
          }
        });
        
        // Помечаем как доставленное
        await pool.query(
          'UPDATE messages SET is_delivered = true WHERE id = $1',
          [message.id]
        );
      }
      
      // Подтверждение отправителю
      socket.emit('message_sent', {
        message_id: message.id,
        status: receiverSocketId ? 'delivered' : 'sent'
      });
      
      console.log(`💬 Сообщение ${sender_id} -> ${receiver_id}`);
      
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
      socket.emit('message_error', { error: 'Не удалось отправить сообщение' });
    }
  });
  
  // Изменение статуса
  socket.on('update_status', async (data) => {
    const { status, status_message } = data;
    const userId = socket.userId;
    
    if (userId && isValidUUID(userId)) {
      await pool.query(
        'UPDATE users SET status = $1, status_message = $2, last_seen = CURRENT_TIMESTAMP WHERE id = $3',
        [status, status_message, userId]
      );
      
      socket.broadcast.emit('user_status_changed', {
        user_id: userId,
        status: status,
        status_message: status_message
      });
      
      console.log(`🔄 Пользователь ${userId} сменил статус: ${status}`);
    }
  });
  
  // Обновление активности
  socket.on('update_activity', async (data) => {
    const userId = socket.userId;
    if (!userId || !isValidUUID(userId)) return;
    
    const { activity_type, activity_name, platform, details } = data;
    
    try {
      // Обновляем статус пользователя
      let userStatus = 'online';
      if (activity_type === 'playing') userStatus = 'gaming';
      else if (activity_type === 'streaming') userStatus = 'streaming';
      
      await pool.query(
        'UPDATE users SET status = $1 WHERE id = $2',
        [userStatus, userId]
      );
      
      // Добавляем активность
      const result = await pool.query(
        `INSERT INTO user_activities 
         (user_id, activity_type, activity_name, platform, details, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (user_id) DO UPDATE
         SET activity_type = EXCLUDED.activity_type,
             activity_name = EXCLUDED.activity_name,
             platform = EXCLUDED.platform,
             details = EXCLUDED.details,
             start_timestamp = CURRENT_TIMESTAMP,
             is_active = true
         RETURNING *`,
        [userId, activity_type, activity_name, platform, details]
      );
      
      const activity = result.rows[0];
      
      socket.broadcast.emit('user_activity_changed', {
        user_id: userId,
        activity: activity,
        status: userStatus
      });
      
    } catch (error) {
      console.error('❌ Ошибка обновления активности:', error);
    }
  });
  
  // Отключение
  socket.on('disconnect', async () => {
    const userId = socket.userId;
    
    if (userId && isValidUUID(userId)) {
      onlineUsers.delete(userId);
      
      // Обновляем статус в БД
      await pool.query(
        'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
        ['offline', userId]
      );
      
      // Останавливаем активности
      await pool.query(
        'UPDATE user_activities SET is_active = false WHERE user_id = $1 AND is_active = true',
        [userId]
      );
      
      // Оповещаем всех
      socket.broadcast.emit('user_status_changed', {
        user_id: userId,
        status: 'offline'
      });
      
      console.log(`🔌 Пользователь ${userId} отключился`);
    }
  });
});

// ==== ЗАПУСК СЕРВЕРА ====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║        MyCQ Messenger Server         ║
  ║           Версия 2.0.0               ║
  ║    Расширенная версия с UUID         ║
  ╚═══════════════════════════════════════╝
  
  ✅ Сервер запущен!
  📍 HTTP API: http://localhost:${PORT}
  📡 WebSocket: ws://localhost:${PORT}
  
  📋 Новые эндпоинты:
     GET  /api/sounds/:userId           - Настройки звуков
     PUT  /api/sounds/:userId           - Обновление звука
     DEL  /api/sounds/:userId/:type     - Сброс звука
     POST /api/activity/:userId         - Обновление активности
     POST /api/activity/:userId/stop    - Остановка активности
     GET  /api/activities/friends/:id   - Активности друзей
  
  ⏳ Ожидание подключений...
  `);
});