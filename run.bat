@echo off
echo ========================================
echo        MyCQ Messenger Launcher
echo ========================================
echo.

echo 1. Проверяем Node.js...
node --version >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js не установлен!
    echo Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo 2. Устанавливаем зависимости сервера...
cd /d "%~dp0server"
call npm install

echo 3. Устанавливаем зависимости клиента...
cd /d "%~dp0client"
call npm install

echo 4. Запускаем сервер MyCQ...
start "MyCQ Server" cmd /k "cd /d "%~dp0server" && npm start"

echo 5. Ждем запуска сервера...
timeout /t 5

echo 6. Запускаем клиент MyCQ...
start "MyCQ Client" cmd /k "cd /d "%~dp0client" && npm start"

echo.
echo ========================================
echo ✅ MyCQ Messenger запущен!
echo 📍 Сервер: http://localhost:3000
echo 🖥️  Клиент: Electron приложение
echo ========================================
echo.
echo 🚀 Для доступа из интернета используйте ngrok:
echo    ngrok http 3000
echo.
pause