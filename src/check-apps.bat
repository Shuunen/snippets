@echo off
:loop
cls
call bun "%USERPROFILE%\Projects\github\snippets\src\check-apps.cli.js" "D:\Apps\\"
echo.
echo Press a key to re-run...
pause >nul
goto loop
