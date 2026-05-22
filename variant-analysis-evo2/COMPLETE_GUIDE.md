# EVO2 Variant Analysis - Complete Guide

## 📋 Table of Contents
1. [Issues Encountered & Solutions](#issues-encountered--solutions)
2. [How to Start the Application](#how-to-start-the-application)
3. [How to Stop the Application](#how-to-stop-the-application)
4. [How to Restart the Application](#how-to-restart-the-application)
5. [Modal Deployment (Optional)](#modal-deployment-optional)
6. [Troubleshooting](#troubleshooting)

---

## 🔍 Issues Encountered & Solutions

### Issue #1: Frontend Not Starting (EPERM Error)

**Problem:**
- Frontend failed to start with error: `Error: spawn EPERM`
- Windows was blocking Node.js from spawning child processes
- Error code: `-4048` (Windows permission error)

**Solution:**
- Run PowerShell/CMD as **Administrator**
- This gives Node.js the necessary permissions to spawn processes
- Alternative: Add Node.js to Windows Defender exclusions

**Files Changed:** None (system-level fix)

---

### Issue #2: Backend Not Running

**Problem:**
- Backend wasn't started, causing 404 errors
- Frontend couldn't connect to API

**Solution:**
- Started backend manually: `python app.py` in `evo2-backend` directory
- Backend runs on port 8000

**Files Changed:** None (just needed to start the service)

---

### Issue #3: Frontend Calling Wrong API Endpoint (404 Error)

**Problem:**
- Frontend was configured to call Modal API endpoint (cloud deployment)
- Modal endpoint returned 404: `https://ajiteshshukla1234--variant-analysis-evo2-evo2model-analy-012766.modal.run`
- Frontend couldn't reach the local backend

**Solution:**
- Updated `.env.local` to use local backend:
  ```
  NEXT_PUBLIC_EVO2_API_URL=http://localhost:8000
  ```
- Updated API route to use `/analyze-variant` endpoint for local backend

**Files Changed:**
- `evo2-frontend/.env.local` - Changed API URL to localhost
- `evo2-frontend/src/app/api/analyze/route.ts` - Added logic to detect local backend

---

### Issue #4: Backend API Field Mismatch (500 Error)

**Problem:**
- Backend required `reference` field in request
- Frontend sometimes sent empty or missing `reference` field
- Backend returned 500 Internal Server Error

**Solution:**
- Made `reference` field optional in backend API
- Backend now automatically fetches reference from genome sequence if not provided
- Added better error logging to backend

**Files Changed:**
- `evo2-backend/app.py`:
  - Changed `reference: str` to `reference: Optional[str] = ""`
  - Added logic to fetch reference from sequence if not provided
  - Added traceback logging for errors

---

### Issue #5: Next.js Server-Side Fetch Can't Reach localhost (fetch failed)

**Problem:**
- Next.js API route couldn't connect to `localhost:8000` from server-side
- Error: `TypeError: fetch failed`
- This is a known Next.js limitation - server-side fetch can't resolve `localhost`

**Solution:**
- Automatically convert `localhost` to `127.0.0.1` in API route
- `127.0.0.1` works for server-side fetch in Next.js

**Files Changed:**
- `evo2-frontend/src/app/api/analyze/route.ts`:
  - Added code to replace `localhost` with `127.0.0.1` before making fetch request

---

## 🚀 How to Start the Application

### Option 1: Using Startup Scripts (Recommended)

#### Windows Batch Script:
```cmd
cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2
start-evo2.bat
```

#### PowerShell Script:
```powershell
cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2
powershell -ExecutionPolicy Bypass -File start-evo2.ps1
```

**Note:** For frontend, you may need to run PowerShell as Administrator to avoid EPERM errors.

---

### Option 2: Manual Start (Two Terminals)

#### Terminal 1 - Backend (Regular PowerShell):
```powershell
cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-backend
python app.py
```

**Wait for:** `Uvicorn running on http://0.0.0.0:8000`

#### Terminal 2 - Frontend (PowerShell as Administrator):
```powershell
# Set PATH to bypass conda
$env:PATH = "C:\Users\Admin\AppData\Roaming\nodejs-v18;$env:PATH" -replace "C:\\ProgramData\\anaconda3[^;]*;?", "" -replace "C:\\Users\\Admin\\miniconda3[^;]*;?", ""

# Navigate to frontend
cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-frontend

# Start frontend
npm run dev
```

**Wait for:** `Ready in X seconds` or `Local: http://localhost:3000`

---

### Option 3: Using Modal (Cloud Deployment)

If you want to use Modal instead of local backend:

1. **Deploy to Modal:**
   ```bash
   cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-backend
   modal deploy main.py
   ```

2. **Get Modal URL:**
   - After deployment, Modal will provide a URL
   - Example: `https://your-username--variant-analysis-evo2-evo2model-analy-xxxxx.modal.run`

3. **Update Frontend Config:**
   - Edit `evo2-frontend/.env.local`:
     ```
     NEXT_PUBLIC_EVO2_API_URL=https://your-modal-url.modal.run
     ```

4. **Start Only Frontend:**
   ```powershell
   cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-frontend
   npm run dev
   ```

---

## 🛑 How to Stop the Application

### Stop Local Services

#### Method 1: Stop in Terminals
1. **Backend Terminal:**
   - Press `Ctrl + C`
   - Wait for process to stop

2. **Frontend Terminal:**
   - Press `Ctrl + C`
   - Wait for process to stop

#### Method 2: Kill All Processes (PowerShell)
```powershell
# Stop all Node.js processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Stop all Python processes (be careful - this stops ALL Python processes)
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
```

#### Method 3: Kill Specific Ports
```powershell
# Find processes on ports
netstat -ano | findstr ":8000"
netstat -ano | findstr ":3000"

# Kill by PID (replace <PID> with actual process ID)
taskkill /F /PID <PID>
```

---

### Stop Modal Deployment

#### Method 1: Using Modal CLI
```bash
# List running deployments
modal app list

# Stop specific app
modal app stop variant-analysis-evo2

# Or delete the deployment
modal app delete variant-analysis-evo2
```

#### Method 2: Using Modal Dashboard
1. Go to: https://modal.com/apps
2. Find your app: `variant-analysis-evo2`
3. Click "Stop" or "Delete"

#### Method 3: Scale Down to Zero
```bash
# Scale down the app (stops all containers)
modal app scale variant-analysis-evo2 --containers 0
```

**Note:** Modal charges are based on usage. When stopped, you're not charged.

---

## 🔄 How to Restart the Application

### Restart Local Services

#### Quick Restart:
1. **Stop both services** (Ctrl+C in both terminals)
2. **Restart backend:**
   ```powershell
   cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-backend
   python app.py
   ```
3. **Restart frontend:**
   ```powershell
   cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-frontend
   npm run dev
   ```

#### Using Startup Script:
```powershell
cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2
.\start-evo2.ps1
```

---

### Restart Modal Deployment

#### Redeploy:
```bash
cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-backend
modal deploy main.py
```

#### Restart Existing Deployment:
```bash
# Restart the app
modal app restart variant-analysis-evo2

# Or scale up if scaled down
modal app scale variant-analysis-evo2 --containers 1
```

---

## ☁️ Modal Deployment (Optional)

### What is Modal?
Modal is a cloud platform for running Python applications with GPU support. The `main.py` file contains Modal deployment code.

### When to Use Modal vs Local Backend

**Use Local Backend When:**
- ✅ Developing/testing locally
- ✅ Want to avoid cloud costs
- ✅ Need faster iteration
- ✅ Working offline

**Use Modal When:**
- ✅ Need GPU acceleration (H100)
- ✅ Want to deploy for production
- ✅ Need to share with others
- ✅ Want serverless scaling

### Modal Setup

1. **Install Modal:**
   ```bash
   pip install modal
   ```

2. **Authenticate:**
   ```bash
   modal setup
   ```
   - Follow prompts to create account/login

3. **Deploy:**
   ```bash
   cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-backend
   modal deploy main.py
   ```

4. **Get Endpoint URL:**
   - After deployment, Modal provides a URL
   - Update `.env.local` with this URL

### Modal Commands

```bash
# Deploy
modal deploy main.py

# Run once (for testing)
modal run main.py

# View logs
modal app logs variant-analysis-evo2

# List apps
modal app list

# Stop app
modal app stop variant-analysis-evo2

# Delete app
modal app delete variant-analysis-evo2
```

---

## 🔧 Troubleshooting

### Frontend Won't Start (EPERM Error)

**Solution:**
- Run PowerShell as Administrator
- Or add Node.js to Windows Defender exclusions

### Backend Returns 500 Error

**Check:**
1. Backend terminal for error messages
2. Backend is running: http://localhost:8000/health
3. Check backend logs for traceback

**Common Causes:**
- EVO2 model not installed (runs in dev mode with mock data)
- Network issues fetching genome sequences
- Invalid variant position

### Frontend Can't Connect to Backend

**Check:**
1. Backend is running: http://localhost:8000/health
2. `.env.local` has correct URL: `NEXT_PUBLIC_EVO2_API_URL=http://localhost:8000`
3. Frontend was restarted after changing `.env.local`

### Port Already in Use

**Solution:**
```powershell
# Find process using port 8000
netstat -ano | findstr ":8000"

# Kill process (replace <PID>)
taskkill /F /PID <PID>

# Same for port 3000
netstat -ano | findstr ":3000"
taskkill /F /PID <PID>
```

### Environment Variables Not Loading

**Solution:**
1. Restart frontend after changing `.env.local`
2. Clear Next.js cache: `Remove-Item -Recurse -Force .next`
3. Hard refresh browser: `Ctrl + F5`

---

## 📊 Service Status Check

### Check Backend:
```powershell
# Test connection
Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing

# Or in browser
http://localhost:8000/health
```

### Check Frontend:
```powershell
# Test connection
Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing

# Or in browser
http://localhost:3000
```

### Check Both Ports:
```powershell
Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet
Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet
```

---

## 📝 Quick Reference

### Service URLs:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Backend Health:** http://localhost:8000/health
- **API Documentation:** http://localhost:8000/docs

### Key Files:
- **Backend Config:** `evo2-backend/app.py`
- **Frontend Config:** `evo2-frontend/.env.local`
- **API Route:** `evo2-frontend/src/app/api/analyze/route.ts`
- **Startup Scripts:** `start-evo2.ps1`, `start-evo2.bat`

### Important Notes:
- Frontend must run as Administrator (Windows permission issue)
- Backend can run in regular terminal
- Environment variables require frontend restart
- Modal is optional - local backend works fine for development

---

## ✅ Final Checklist

Before starting:
- [ ] Python installed and in PATH
- [ ] Node.js v18 installed
- [ ] Backend dependencies installed: `pip install -r requirements.txt`
- [ ] Frontend dependencies installed: `npm install`
- [ ] `.env.local` configured correctly

When running:
- [ ] Backend shows: `Uvicorn running on http://0.0.0.0:8000`
- [ ] Frontend shows: `Ready in X seconds`
- [ ] http://localhost:8000/health returns `{"status":"ok"}`
- [ ] http://localhost:3000 loads successfully

---

**Last Updated:** Based on troubleshooting session on 2026-01-23
