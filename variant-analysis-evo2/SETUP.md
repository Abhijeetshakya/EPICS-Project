# EVO2 Variant Analysis - Full Integration Setup

## Overview
The application now has full EVO2 integration with:
- **Frontend**: Next.js 15.3.1 running on `http://localhost:3000`
- **Backend**: FastAPI with EVO2 analysis running on `http://localhost:8000`

## Quick Start

### Option 1: Batch Script (Windows)
```cmd
c:\Users\Admin\Desktop\backend\variant-analysis-evo2\start-evo2.bat
```

### Option 2: PowerShell Script
```powershell
powershell -ExecutionPolicy Bypass -File c:\Users\Admin\Desktop\backend\variant-analysis-evo2\start-evo2.ps1
```

### Option 3: Manual Start

**Terminal 1 - Backend:**
```powershell
$env:PATH = "C:\Users\Admin\AppData\Roaming\nodejs-v18;$env:PATH" -replace "C:\\ProgramData\\anaconda3[^;]*;?", "" -replace "C:\\Users\\Admin\\miniconda3[^;]*;?", ""
cd 'c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-backend'
python app.py
```

**Terminal 2 - Frontend:**
```powershell
$env:PATH = "C:\Users\Admin\AppData\Roaming\nodejs-v18;$env:PATH" -replace "C:\\ProgramData\\anaconda3[^;]*;?", "" -replace "C:\\Users\\Admin\\miniconda3[^;]*;?", ""
cd 'c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-frontend'
npm run dev
```

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Web interface for variant analysis |
| Backend API | http://localhost:8000 | EVO2 analysis REST API |
| Health Check | http://localhost:8000/health | API status check |
| API Docs | http://localhost:8000/docs | Swagger documentation |

## Backend API Endpoints

### POST /analyze-variant
Analyze a single variant using EVO2

**Request:**
```json
{
  "variant_position": 43119628,
  "alternative": "G",
  "genome": "hg38",
  "chromosome": "chr17",
  "reference": "A"
}
```

**Response:**
```json
{
  "position": 43119628,
  "reference": "A",
  "alternative": "G",
  "evo2_score": -0.234,
  "delta_score": -0.456,
  "classification": "LOF"
}
```

### GET /health
Check if the API is running

**Response:**
```json
{
  "status": "ok",
  "service": "EVO2 Variant Analysis API"
}
```

### GET /models
List available EVO2 models

**Response:**
```json
{
  "available_models": [
    "evo2-1b-8k",
    "evo2-7b-8k",
    "evo2-7b-1m",
    "evo2-40b-8k",
    "evo2-40b-1m"
  ],
  "current_model": "evo2-40b-8k"
}
```

## Frontend Integration

The frontend now has EVO2 support with:

1. **Health Check** - Detects if EVO2 backend is available
2. **Variant Analysis** - Can score variants using EVO2 model
3. **Classification** - Shows LOF (Loss of Function) or FUNC (Functional) predictions

### Functions Available

```typescript
// Analyze a variant with EVO2
analyzeVariantWithEvo2(
  position: number,
  alternative: string,
  genome: string,
  chromosome: string,
  reference?: string
): Promise<AnalysisResult>

// Check if EVO2 backend is available
checkEvo2Health(): Promise<boolean>
```

## Troubleshooting

### Backend won't start
- Make sure Python packages are installed: `pip install -r requirements.txt`
- Check if port 8000 is already in use: `netstat -ano | findstr :8000`
- Kill existing process: `taskkill /F /PID <PID>`

### Frontend won't connect to backend
- Verify backend is running: `http://localhost:8000/health`
- Check .env.local has `NEXT_PUBLIC_EVO2_API_URL=http://localhost:8000`
- Clear frontend cache: `Remove-Item -Recurse -Force .next`

### EVO2 model not loading
- Install EVO2: `pip install evo2`
- Make sure CUDA is available (for GPU acceleration)
- Check disk space (models are large ~40GB)

## Architecture

```
┌─────────────────────┐
│   Next.js Frontend  │ (Port 3000)
│   React Components  │
└──────────┬──────────┘
           │ HTTP
           │ /analyze-variant
           ▼
┌─────────────────────┐
│  FastAPI Backend    │ (Port 8000)
│   EVO2 Analysis     │
│  UCSC Genome API    │
└─────────────────────┘
```

## Configuration

**Frontend Environment (.env.local):**
```
NEXT_DISABLE_DEV_TOOLS=1
NEXT_PUBLIC_EVO2_API_URL=http://localhost:8000
```

**Backend:**
- Loads EVO2 model on first request
- Caches model in memory for performance
- Fetches genome sequences from UCSC API

## Next Steps

1. ✅ Start both services using one of the startup methods
2. ✅ Open http://localhost:3000 in browser
3. ✅ Search for a gene (e.g., BRCA1)
4. ✅ View gene details
5. ✅ Variants will be analyzed with EVO2 (when implemented in UI)

## Notes

- The application bypasses Conda to avoid Node.js experimental flag conflicts
- Node v18 LTS is used for stability
- EVO2 model is loaded lazily (first request takes longer)
- All genome data comes from public UCSC and NCBI APIs
