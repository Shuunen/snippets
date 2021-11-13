REM set need to be here, outside the logging section

REM the video file we want to set title to
REM like : "D:\Downloads\Big Buck Bunny (2003)\Big Buck Bunny (2003).mkv"
set targetFile=%1

REM this script folder
REM like : "D:\Apps\Set.Title\"
SET thisFolder=%~dp0

node %thisFolder%/take-screenshot.js %targetFile%
