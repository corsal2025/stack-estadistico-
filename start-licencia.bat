@echo off
title Licencia.ai - Servidor Interno
cd /d "%~dp0server"
set NODE_ENV=production
set PORT=3002

:loop
echo ============================================
echo   Licencia.ai - Servidor Interno
echo   Local:  http://localhost:3002
echo   Red:    http://192.168.16.80:3002
echo   (No cierres esta ventana)
echo ============================================
echo.
node src/app.js
echo.
echo [%date% %time%] El servidor se detuvo. Reiniciando en 5s... (Ctrl+C para salir)
timeout /t 5 /nobreak >nul
goto loop
