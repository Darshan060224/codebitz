@echo off
setlocal

cd /d "%~dp0"
echo Launching Codebitz dev environment...
echo.

call :kill_port 5000 "Server"
call :kill_port 5173 "Client"
echo.

start "Codebitz Server" cmd /k "cd /d "%~dp0server" && if not exist node_modules npm install && npm run dev"
start "Codebitz Client" cmd /k "cd /d "%~dp0client" && if not exist node_modules npm install && npm run dev"

echo Server and client are starting in separate windows.
echo Server URL: http://localhost:5000
echo Client URL: http://localhost:5173
echo If this is your first run, dependency install may take a minute.
goto :eof

:kill_port
set "PORT=%~1"
set "NAME=%~2"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
	echo Freeing %NAME% port %PORT% - PID %%P
	taskkill /F /PID %%P >nul 2>&1
)
exit /b 0
