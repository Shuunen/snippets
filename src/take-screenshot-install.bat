@echo off
REM Request admin privileges and run VBScript installer
REM This script elevates and runs the take-screenshot.vbs installer

setlocal enabledelayedexpansion

REM Get the current script folder
set thisFolder=%~dp0

REM Run VBScript with admin privileges using PowerShell
powershell -NoProfile -Command "Start-Process -FilePath 'cscript.exe' -ArgumentList '\"!thisFolder!take-screenshot.vbs\" --install' -Verb RunAs -Wait"

echo.
echo Installation complete! You can now right-click video files to use Take Screenshot.
