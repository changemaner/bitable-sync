@echo off
setlocal

cd /d "%~dp0"

set "CHECK_ONLY=0"
if /I "%~1"=="--check" set "CHECK_ONLY=1"

set "LOG_DIR=%~dp0logs"
set "LOG_FILE=%LOG_DIR%\last_run.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

> "%LOG_FILE%" echo ==== %date% %time% ====

if not exist "config.json" (
  >> "%LOG_FILE%" echo [ERROR] config.json not found.
  echo [ERROR] config.json not found. Please run this file inside the project folder.
  call :pause_on_error
  exit /b 1
)

if not exist "src\sync.ts" (
  >> "%LOG_FILE%" echo [ERROR] src\sync.ts not found.
  echo [ERROR] src\sync.ts not found. Please make sure the project files are complete.
  call :pause_on_error
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  >> "%LOG_FILE%" echo [ERROR] Node.js not found.
  echo [ERROR] Node.js not found. Please install Node.js first.
  echo https://nodejs.org/
  call :pause_on_error
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  >> "%LOG_FILE%" echo [ERROR] npm not found.
  echo [ERROR] npm not found. Please reinstall Node.js first.
  call :pause_on_error
  exit /b 1
)

if "%CHECK_ONLY%"=="1" (
  if exist "node_modules\.bin\tsx.cmd" (
    echo [OK] Environment check passed. Ready to run.
  ) else (
    echo [OK] Environment check passed. Dependencies will be installed on first run.
  )
  exit /b 0
)

echo [INFO] Log file: "%LOG_FILE%"
>> "%LOG_FILE%" echo [INFO] Log file: "%LOG_FILE%"

if not exist "node_modules\.bin\tsx.cmd" (
  echo [INFO] First run detected. Installing dependencies...
  >> "%LOG_FILE%" echo [INFO] First run detected. Installing dependencies...
  call npm install >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    echo [ERROR] npm install failed. Please check your network and try again.
    echo [ERROR] Full log:
    type "%LOG_FILE%"
    call :pause_on_error
    exit /b 1
  )
)

echo [INFO] Starting sync script...
>> "%LOG_FILE%" echo [INFO] Starting sync script...
call "node_modules\.bin\tsx.cmd" src\sync.ts >> "%LOG_FILE%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Sync script failed. See log below.
  echo [ERROR] Log file: "%LOG_FILE%"
  echo.
  type "%LOG_FILE%"
  call :pause_on_error
  exit /b %EXIT_CODE%
)

echo [DONE] Sync script finished.
>> "%LOG_FILE%" echo [DONE] Sync script finished.
exit /b 0

:pause_on_error
if not "%NO_PAUSE_ON_ERROR%"=="1" (
  echo.
  echo Press any key to close this window...
  pause >nul
)
exit /b 0
