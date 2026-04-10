@echo off
setlocal

cd /d "%~dp0"

set "CHECK_ONLY=0"
if /I "%~1"=="--check" set "CHECK_ONLY=1"

if not exist "config.json" (
  echo [ERROR] config.json not found. Please run this file inside the project folder.
  exit /b 1
)

if not exist "src\sync.ts" (
  echo [ERROR] src\sync.ts not found. Please make sure the project files are complete.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Please install Node.js first.
  echo https://nodejs.org/
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Please reinstall Node.js first.
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

if not exist "node_modules\.bin\tsx.cmd" (
  echo [INFO] First run detected. Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed. Please check your network and try again.
    exit /b 1
  )
)

echo [INFO] Starting sync script...
call "node_modules\.bin\tsx.cmd" src\sync.ts
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Sync script failed. Exit code: %EXIT_CODE%
  exit /b %EXIT_CODE%
)

echo [DONE] Sync script finished.
exit /b 0
