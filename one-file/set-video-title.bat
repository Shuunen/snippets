@echo off
REM set need to be here, outside the logging section

REM the video file we want to set title to
REM in : "D:\Downloads\Big Buck Bunny (2003)\Big Buck Bunny (2003).mkv"
set targetFile=%1

REM this script folder
REM in : "D:\Apps\Set.Title\"
SET thisFolder=%~dp0

REM get the target file folder name
REM in  : D:\Downloads\Big Buck Bunny (2003)\
REM out : Big Buck Bunny (2003)
set folder="%~p1"
FOR /F "TOKENS=1* DELIMS=\\" %%G IN (%folder%) DO set folder=%%H
set folder=%folder:~0,-1%

REM echo  Set Title
echo    __      _     _____ _ _   _
echo   / _\ ___^| ^|_  /__   (_) ^|_^| ^| ___
echo   \ \ / _ \ __^|   / /\/ ^| __^| ^|/ _ \
echo   _\ \  __/ ^|_   / /  ^| ^| ^|_^| ^|  __/
echo   \__/\___^|\__^|  \/   ^|_^|\__^|_^|\___^|
echo.
echo   Video folder name : %folder%
echo.
echo   Please type a title or just enter to use the folder name :
echo.
REM below command let user type something or the right part will be used as default
SET /P title=" > " || SET title=%folder%

REM add surroundings double quote to title
REM in  : Big Buck Bunny (2003)
REM out : "Big Buck Bunny (2003)"
set title="%title%"

> %thisFolder%/set-video-title.log (
echo Set title - start
echo %date:~6,4%/%date:~3,2%/%date:~0,2% @ %time:~0,2%h%time:~3,2%
echo.
echo Here is the active variables :
echo - param0 : %0
echo - param1 : %1
echo -  title : %title%
echo.
echo Calling mkvpropedit to set the title...
mkvpropedit %targetFile% -e info -s title=%title%
echo.
echo Set title - end
)
