# Bharat Voice Studio System Installer
param(
    $LaunchAfterInstall = $true
)

$ErrorActionPreference = "Stop"
$shouldLaunch = ($LaunchAfterInstall -eq $true -or $LaunchAfterInstall -eq "true" -or $LaunchAfterInstall -eq 1)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     BHARAT VOICE STUDIO - SYSTEM INSTALLER" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$DistExe = Join-Path $CurrentDir "dist\BharatVoiceStudio.exe"
$AppIcon = Join-Path $CurrentDir "app_icon.ico"

if (-not (Test-Path $DistExe)) {
    Write-Host "[ERROR] BharatVoiceStudio.exe not found in dist folder!" -ForegroundColor Red
    Write-Host "Please build the executable first." -ForegroundColor Yellow
    Exit 1
}

$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\BharatVoiceStudio"
Write-Host ">> Target Installation Directory: $InstallDir" -ForegroundColor White

# Terminate existing instance if running
Get-Process BharatVoiceStudio -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

# Create target directory
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Copy executable and icon
Write-Host ">> Copying application files..." -ForegroundColor Green
Copy-Item -Path $DistExe -Destination (Join-Path $InstallDir "BharatVoiceStudio.exe") -Force
if (Test-Path $AppIcon) {
    Copy-Item -Path $AppIcon -Destination (Join-Path $InstallDir "app_icon.ico") -Force
}

# Copy key files to both InstallDir and AppData so all APIs work out-of-the-box
$KeyFiles = @(".gemini_key", ".groq_key", ".fish_key", ".hf_token")
$AppDataStudio = Join-Path $env:APPDATA "VoiceTrackingStudio"
if (-not (Test-Path $AppDataStudio)) {
    New-Item -ItemType Directory -Path $AppDataStudio -Force | Out-Null
}
foreach ($kf in $KeyFiles) {
    $srcKey = Join-Path $CurrentDir $kf
    if (Test-Path $srcKey) {
        Copy-Item -Path $srcKey -Destination (Join-Path $InstallDir $kf) -Force
        Copy-Item -Path $srcKey -Destination (Join-Path $AppDataStudio $kf) -Force
    }
}

$InstalledExe = Join-Path $InstallDir "BharatVoiceStudio.exe"
$InstalledIcon = Join-Path $InstallDir "app_icon.ico"
$WshShell = New-Object -ComObject WScript.Shell

# 1. Desktop Shortcut
$DesktopFolder = [Environment]::GetFolderPath("Desktop")
$DesktopShortcutPath = Join-Path $DesktopFolder "Bharat Voice Studio.lnk"
$Shortcut = $WshShell.CreateShortcut($DesktopShortcutPath)
$Shortcut.TargetPath = $InstalledExe
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "Bharat Voice Studio - 11 Languages AI Voice Studio"
if (Test-Path $InstalledIcon) {
    $Shortcut.IconLocation = "$InstalledIcon,0"
}
$Shortcut.Save()
Write-Host ">> Desktop Shortcut created: $DesktopShortcutPath" -ForegroundColor Green

# 2. Start Menu Shortcut
$StartMenuPrograms = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs"
$StartShortcutPath = Join-Path $StartMenuPrograms "Bharat Voice Studio.lnk"
$StartShortcut = $WshShell.CreateShortcut($StartShortcutPath)
$StartShortcut.TargetPath = $InstalledExe
$StartShortcut.WorkingDirectory = $InstallDir
$StartShortcut.Description = "Bharat Voice Studio - 11 Languages AI Voice Studio"
if (Test-Path $InstalledIcon) {
    $StartShortcut.IconLocation = "$InstalledIcon,0"
}
$StartShortcut.Save()
Write-Host ">> Start Menu Shortcut created: $StartShortcutPath" -ForegroundColor Green

# 3. Create Uninstaller Script inside install dir
$UninstallerBat = Join-Path $InstallDir "Uninstall.bat"
$UninstallContent = @"
@echo off
echo Uninstalling Bharat Voice Studio...
taskkill /f /im BharatVoiceStudio.exe 2>nul
del /f /q "$DesktopShortcutPath" 2>nul
del /f /q "$StartShortcutPath" 2>nul
timeout /t 1 /nobreak >nul
rmdir /s /q "$InstallDir"
echo Successfully uninstalled Bharat Voice Studio.
pause
"@
[System.IO.File]::WriteAllText($UninstallerBat, $UninstallContent)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SUCCESS: Bharat Voice Studio has been installed!" -ForegroundColor Green
Write-Host " - Desktop icon is ready" -ForegroundColor White
Write-Host " - Windows Start Menu searchable" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

if ($shouldLaunch) {
    Write-Host ">> Launching Bharat Voice Studio now..." -ForegroundColor Yellow
    Start-Process -FilePath $InstalledExe
}
