@echo off
title Uninstalling Bharat Voice Studio
echo ========================================================
echo   Uninstalling Bharat Voice Studio
echo ========================================================
taskkill /f /im BharatVoiceStudio.exe 2>nul
set "TARGET_DIR=%LOCALAPPDATA%\Programs\BharatVoiceStudio"
set "DESKTOP_LNK=%USERPROFILE%\Desktop\Bharat Voice Studio.lnk"
set "START_LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Bharat Voice Studio.lnk"

if exist "%DESKTOP_LNK%" del /f /q "%DESKTOP_LNK%"
if exist "%START_LNK%" del /f /q "%START_LNK%"
if exist "%TARGET_DIR%" rmdir /s /q "%TARGET_DIR%"

echo.
echo Bharat Voice Studio has been completely removed from the system.
pause
