@echo off
setlocal
cd /d "%~dp0"

rem Local server + proxy for importing teams from perm-volley.ru.
rem Keep this window open while using the app.

if exist "%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe" (
  start "Passport Server" "%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe" "%~dp0server.py"
  goto :open
)

where py >nul 2>nul
if not errorlevel 1 (
  start "Passport Server" py -3 "%~dp0server.py"
  goto :open
)

where python >nul 2>nul
if not errorlevel 1 (
  start "Passport Server" python "%~dp0server.py"
  goto :open
)

echo.
echo Python not found. Opening the app without the local server.
echo Site import by URL will be unavailable; use an HTML file instead.
echo.
start "" "%~dp0index.html"
exit /b

:open
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8777/"
