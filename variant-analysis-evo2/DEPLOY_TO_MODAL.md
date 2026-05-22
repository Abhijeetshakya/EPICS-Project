# Deploy to Modal - Step by Step Guide

## 🎯 Goal
Switch from local backend (mock scores) to Modal (real EVO2 predictions)

---

## 📋 Prerequisites

1. ✅ Modal CLI installed (you have it: version 1.3.0.post1)
2. ✅ Modal account set up (`modal setup` completed)
3. ✅ Internet connection

---

## 🚀 Step-by-Step Deployment

### Step 1: Deploy to Modal

```bash
cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-backend
modal deploy main.py
```

**What happens:**
- Modal builds the Docker image (this takes 10-30 minutes first time)
- Installs EVO2, dependencies, and GPU drivers
- Deploys the app to cloud
- Provides you with an endpoint URL

**Expected output:**
```
✓ Created objects.
  → Created Evo2Model.analyze_single_variant
  → https://your-username--variant-analysis-evo2-evo2model-analyze-single-variant-xxxxx.modal.run
```

**⚠️ Important:** Copy the URL that ends with `.modal.run`

---

### Step 2: Get the Modal Endpoint URL

After deployment, you'll see a URL like:
```
https://your-username--variant-analysis-evo2-evo2model-analyze-single-variant-xxxxx.modal.run
```

**Or check with:**
```bash
modal app show variant-analysis-evo2
```

**Or list endpoints:**
```bash
modal app list
```

---

### Step 3: Update Frontend Configuration

Edit `evo2-frontend/.env.local`:

```env
# Disable dev tools that cause localStorage errors
NEXT_DISABLE_DEV_TOOLS=1

# Modal Backend Configuration
NEXT_PUBLIC_EVO2_API_URL=https://your-username--variant-analysis-evo2-evo2model-analyze-single-variant-xxxxx.modal.run
```

**Replace** `https://your-username--variant-analysis-evo2-evo2model-analyze-single-variant-xxxxx.modal.run` with your actual Modal URL.

---

### Step 4: Check API Route Compatibility

The Modal endpoint uses a different format than local backend. Check if the API route needs updates.

**Modal endpoint:** `analyze_single_variant` (from `main.py`)
**Local endpoint:** `analyze-variant` (from `app.py`)

The API route should automatically detect Modal URLs and use them directly (no `/analyze-variant` suffix).

---

### Step 5: Restart Frontend

```powershell
# Stop frontend (Ctrl+C)
# Then restart:
cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-frontend
npm run dev
```

---

### Step 6: Test

1. Open http://localhost:3000
2. Try analyzing a variant
3. Check the results - they should now be **real EVO2 predictions**!

---

## 🔍 Verify Modal is Working

### Check Modal Status:
```bash
modal app list
```

Should show:
- App: `variant-analysis-evo2`
- State: `running` (or `stopped` if scaled down)

### Test Modal Endpoint Directly:
```powershell
$modalUrl = "https://your-modal-url.modal.run"
$body = @{
    variant_position = 43119628
    alternative = "G"
    genome = "hg38"
    chromosome = "chr17"
} | ConvertTo-Json

Invoke-WebRequest -Uri $modalUrl -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

---

## ⚠️ Important Notes

### Modal Response Format:
Modal returns:
```json
{
  "position": 43119628,
  "reference": "T",
  "alternative": "G",
  "delta_score": -0.045,
  "prediction": "Likely pathogenic",
  "classification_confidence": 0.85
}
```

The API route should handle this format automatically.

### First Request:
- **Cold start:** First request takes 1-3 minutes (model loading)
- **Warm requests:** Subsequent requests are faster (model cached)

### Costs:
- Modal charges per GPU usage time
- H100 GPU: ~$X per hour (check Modal pricing)
- Only charged when app is running/processing

---

## 🛑 Stopping Modal

When you're done:

```bash
# Stop the app (no charges when stopped)
modal app stop variant-analysis-evo2

# Or scale down
modal app scale variant-analysis-evo2 --containers 0

# Or delete completely
modal app delete variant-analysis-evo2
```

---

## 🔄 Switching Back to Local Backend

If you want to switch back:

1. **Update `.env.local`:**
   ```env
   NEXT_PUBLIC_EVO2_API_URL=http://localhost:8000
   ```

2. **Restart frontend**

3. **Start local backend:**
   ```bash
   cd c:\Users\Admin\Desktop\backend\variant-analysis-evo2\evo2-backend
   python app.py
   ```

---

## 📊 Comparison

| Feature | Local (Mock) | Local (Real EVO2) | Modal |
|---------|-------------|-------------------|-------|
| **Accuracy** | Simulated | Real | Real |
| **Cost** | Free | Free | Pay per use |
| **Speed** | Fast | Slow (CPU) | Fast (GPU) |
| **Setup** | Easy | Hard (GPU needed) | Easy |
| **Internet** | Not needed | Not needed | Required |

---

## ✅ Quick Checklist

- [ ] Deploy to Modal: `modal deploy main.py`
- [ ] Copy the Modal endpoint URL
- [ ] Update `.env.local` with Modal URL
- [ ] Restart frontend
- [ ] Test variant analysis
- [ ] Verify real EVO2 predictions

---

**Ready to deploy? Run: `modal deploy main.py`**
