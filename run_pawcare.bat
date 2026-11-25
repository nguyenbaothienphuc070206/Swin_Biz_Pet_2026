@echo off
title PawCare Local Server (Next.js)
echo =====================================================================
echo                 DANG KHOI CHAY PAWCARE LOCAL SERVER
echo =====================================================================
echo.
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo [1] Kiem tra Node.js:
node -v
echo.
echo [2] Dia chi truy cap:
echo     - Tren may tinh (Desktop) : http://localhost:3000
for /f "delims=" %%i in ('node -e "const nets = require('os').networkInterfaces(); let ip = '127.0.0.1'; for (const k in nets) for (const n of nets[k]) if (n.family === 'IPv4' && !n.internal) ip = n.address; console.log(ip);"') do (
  echo     - Tren dien thoai (Wi-Fi) : http://%%i:3000
)
echo.
echo =====================================================================
echo   Meo: Tren dien thoai, ket noi cung mang Wi-Fi voi may tinh
echo        roi mo trinh duyet go dia chi ben tren de test dang nhap/ky.
echo =====================================================================
echo.

call npm.cmd run dev

pause
