@echo off
REM Script para subir automáticamente los cambios a GitHub
cd /d "%~dp0"
git add .
git commit -m "Actualización automática"
git push origin master
pause