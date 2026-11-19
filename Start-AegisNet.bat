@echo off
setlocal
title AegisNet Launcher

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-aegisnet.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [AegisNet] Launcher stopped with an error. Review logs\aegisnet-launch.log for details.
    pause
    exit /b %ERRORLEVEL%
)
