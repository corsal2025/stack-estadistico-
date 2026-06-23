@echo off
title Licentia Server
cd /d "%~dp0server"
set NODE_ENV=production
echo ============================================
echo   Licentia - Servidor de Licencias
echo   Local:  http://localhost:3002
echo   Red:    http://192.168.16.80:3002
echo ============================================
echo.
echo Servidor iniciando... (no cierres esta ventana)
echo.
node src/app.js
echo.
echo El servidor se detuvo. Presiona una tecla para cerrar.
pause >nul
