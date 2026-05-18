@echo off
setlocal
cd /d "%~dp0"

set "CODEX_NODE=%USERPROFILE%\AppData\Local\OpenAI\Codex\bin\node.exe"

if exist "%CODEX_NODE%" (
  start "" "http://127.0.0.1:8765"
  "%CODEX_NODE%" server.mjs
  goto :end
)

where node >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:8765"
  node server.mjs
  goto :end
)

echo.
echo Could not find Node.js.
echo Please install Node.js from https://nodejs.org/
echo.
pause

:end
endlocal
