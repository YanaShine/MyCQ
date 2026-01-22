const fs = require('fs');
const https = require('https');
const path = require('path');

// Создаем папку для звуков
const soundsDir = path.join(__dirname, 'public', 'sounds');
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
}

// Список звуков для скачивания (бесплатные звуки с Mixkit)
const sounds = [
    {
        name: 'message.mp3',
        url: 'https://assets.mixkit.co/sfx/download/mixkit-message-pop-alert-2354.mp3'
    },
    {
        name: 'notification.mp3',
        url: 'https://assets.mixkit.co/sfx/download/mixkit-happy-bell-alert-601.mp3'
    },
    {
        name: 'contact_online.mp3',
        url: 'https://assets.mixkit.co/sfx/download/mixkit-doorbell-tone-2864.mp3'
    },
    {
        name: 'error.mp3',
        url: 'https://assets.mixkit.co/sfx/download/mixkit-wrong-answer-fail-notification-946.mp3'
    },
    {
        name: 'login.mp3',
        url: 'https://assets.mixkit.co/sfx/download/mixkit-correct-answer-tone-2870.mp3'
    },
    {
        name: 'send_message.mp3',
        url: 'https://assets.mixkit.co/sfx/download/mixkit-select-click-1109.mp3'
    },
    {
        name: 'click.mp3',
        url: 'https://assets.mixkit.co/sfx/download/mixkit-ui-click-1109.mp3'
    }
];

console.log('🎵 Начинаю скачивание звуков для MyCQ...\n');

let downloaded = 0;
const total = sounds.length;

sounds.forEach(sound => {
    const filePath = path.join(soundsDir, sound.name);
    const file = fs.createWriteStream(filePath);
    
    https.get(sound.url, (response) => {
        response.pipe(file);
        
        file.on('finish', () => {
            file.close();
            downloaded++;
            console.log(`✅ Скачан: ${sound.name} (${downloaded}/${total})`);
            
            if (downloaded === total) {
                console.log('\n🎉 Все звуки успешно скачаны!');
                console.log('📍 Папка:', soundsDir);
                console.log('\nТеперь можно запускать MyCQ с звуками!');
            }
        });
    }).on('error', (err) => {
        fs.unlink(filePath, () => {});
        console.error(`❌ Ошибка при скачивании ${sound.name}:`, err.message);
    });
});