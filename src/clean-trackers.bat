@echo off

powershell -c "(New-Object Media.SoundPlayer 'windows-xp-notify.wav').PlaySync();"

bun "%USERPROFILE%\Projects\github\snippets\src\clean-trackers.cli.js" > "%USERPROFILE%\Projects\github\snippets\src\clean-trackers.log"

