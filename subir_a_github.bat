@echo off
REM Script para subir automáticamente los cambios a GitHub
cd /d "%~dp0"
git add .
git commit -m "Actualizacion automatica"
git push origin main
pause