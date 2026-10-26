# Faceless Autopilot: Deployment & Cloud Infrastructure Guide

This guide describes how the **Faceless Autopilot** cloud backend is deployed, executed, and maintained to reliably sustain 60 videos per month (40 Shorts + 20 Long-form).

---

## 1. Architecture Overview

```
                                +---------------------------+
                                |  Mobile Android Client    |
                                |  (PWA / Jetpack Compose)  |
                                +-------------+-------------+
                                              | HTTPS REST
                                              v
+---------------------------------------------------------------------------------+
| Cloud Backend (Port 3000)                                                       |
|                                                                                 |
|  +--------------------+  +----------------------+  +-------------------------+  |
|  | Autonomous Cron    |  | Gemini 3.8 Flash     |  | Gemini Flash Lite TTS / |  |
|  | Scheduler (45s)    |  | AI Research & Script |  | Edge TTS Voice Engine   |  |
|  +---------+----------+  +----------+-----------+  +------------+------------+  |
|            |                        |                           |               |
|            +-------------------+----+---------------------------+               |
|                                |                                                |
|                                v                                                |
|  +---------------------------------------------------------------------------+  |
|  | 14-Stage Production Pipeline Manager (Idempotent, Retry, State Recovery)  |  |
|  +-------------------------------------+-------------------------------------+  |
|                                        |                                        |
|  +-------------------------------------+-------------------------------------+  |
|  | Video Compositor Engine (Remotion/Canvas, Ken Burns, Subtitle Sync)        |  |
|  +-------------------------------------+-------------------------------------+  |
|                                        |                                        |
|  +-------------------------------------+-------------------------------------+  |
|  | YouTube v3 API & OAuth Service (Private / Unlisted / Public Uploads)       |  |
|  +-------------------------------------+-------------------------------------+  |
|                                        |                                        |
|  +-------------------------------------+-------------------------------------+  |
|  | Persistent Store (data/db.json) + Budget Ceiling Enforcer (AED 500)        |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

---

## 2. Recommended Deployment Options

### Option A: Google Cloud Run (Fully Automated & Serverless)
1. Build and push container to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/faceless-autopilot
   ```
2. Deploy to Cloud Run with persistent volume or minimum 1 instance for continuous scheduling:
   ```bash
   gcloud run deploy faceless-autopilot \
     --image gcr.io/YOUR_PROJECT_ID/faceless-autopilot \
     --platform managed \
     --region europe-west3 \
     --min-instances 1 \
     --memory 2Gi \
     --cpu 2 \
     --set-env-vars "NODE_ENV=production,GEMINI_API_KEY=YOUR_KEY"
   ```

### Option B: Docker Compose on VPS (Hetzner, DigitalOcean, Linode)
1. Clone repository to server.
2. Create `.env` file with `GEMINI_API_KEY`.
3. Launch container with automatic restart:
   ```bash
   docker-compose up -d --build
   ```
4. Verify server health:
   ```bash
   curl http://localhost:3000/api/status
   ```

### Option C: Railway / Render (Zero Devops)
1. Connect repository on Railway or Render dashboard.
2. Environment variables:
   - `GEMINI_API_KEY`
   - `NODE_ENV=production`
   - `PORT=3000`
3. Start command: `npm start`.

---

## 3. Persistent Database & Backup

- Database file: `/app/data/db.json`
- Storage file directory: `/app/data/storage`
- The database uses atomic temporary write and rename (`fs.renameSync`) to ensure zero file corruption on unexpected crashes.
- Upon container restart, `PipelineManager.recoverInterruptedTasks()` scans for in-flight tasks and safely re-queues them.

---

## 4. Verification Commands

Run the built-in test suite via HTTP:
```bash
curl -X POST http://localhost:3000/api/tests/run
```
Expected response:
```json
{
  "allPassed": true,
  "tests": [
    { "name": "Database State & File Persistence", "passed": true },
    { "name": "Budget Calculation & Ceiling Rules", "passed": true },
    { "name": "Gemini AI Script & Hook Generation", "passed": true },
    { "name": "Audio Synthesis & Karaoke Subtitle Sync", "passed": true },
    { "name": "1280x720 / 1080x1920 Thumbnail Composition", "passed": true },
    { "name": "Video Composition & Quality Gate Verification", "passed": true }
  ]
}
```
