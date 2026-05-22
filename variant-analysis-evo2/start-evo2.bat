@echo off
REM Start EVO2 Variant Analysis (Frontend + Backend)
REM This script starts both the FastAPI backend and Next.js frontend

echo.
echo ========================================
echo EVO2 Variant Analysis Application
echo ========================================
echo.

REM Kill any existing node and python processes
echo Stopping any existing processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

REM Adjust PATH to bypass conda
setlocal enabledelayedexpansion
set PATH=C:\Users\Admin\AppData\Roaming\nodejs-v18;%PATH:C:\ProgramData\anaconda3=!%
set PATH=!PATH:C:\Users\Admin\miniconda3=!

REM Start backend
echo.
echo [1/2] Starting EVO2 FastAPI Backend on port 8000...
echo.
cd /d c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-backend
start "EVO2 Backend" python app.py

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo.
echo [2/2] Starting Frontend on port 3000...
echo.
cd /d c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-frontend
start "EVO2 Frontend" npm run dev

echo.
echo ========================================
echo Services Starting:
echo - Frontend: http://localhost:3000
echo - Backend:  http://localhost:8000
echo - Health:   http://localhost:8000/health
echo ========================================
echo.
echo Close this window to stop services.
pause
