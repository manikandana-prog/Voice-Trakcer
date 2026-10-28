@echo off
title Installing Bharat Voice Studio
cd /d "%~dp0"
echo ========================================================
echo   Installing Bharat Voice Studio into your Windows system
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
if %errorlevel% neq 0 (
    echo.
    echo Installation encountered an error.
    pause
)
