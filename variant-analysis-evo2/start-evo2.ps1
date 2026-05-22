# EVO2 Variant Analysis Startup Script (PowerShell)
# This script starts both the FastAPI backend and Next.js frontend

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EVO2 Variant Analysis Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes
Write-Host "Stopping any existing processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null
taskkill /F /IM python.exe 2>$null
Start-Sleep -Seconds 2

# Adjust PATH to bypass conda
$env:PATH = "C:\Users\Admin\AppData\Roaming\nodejs-v18;$env:PATH" -replace "C:\\ProgramData\\anaconda3[^;]*;?", "" -replace "C:\\Users\\Admin\\miniconda3[^;]*;?", ""

# Start backend
Write-Host ""
Write-Host "[1/2] Starting EVO2 FastAPI Backend on port 8000..." -ForegroundColor Green
Write-Host ""
Set-Location "c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-backend"
Start-Process python -ArgumentList "app.py" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend
Write-Host ""
Write-Host "[2/2] Starting Frontend on port 3000..." -ForegroundColor Green
Write-Host ""
Set-Location "c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-frontend"
Start-Process npm -ArgumentList "run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Services Starting:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "- Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "- Health:   http://localhost:8000/health" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Wait 10 seconds for services to start..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Open browser
Write-Host "Opening application in browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"
