# FitWise Platform Deployment Guide

This comprehensive guide covers end-to-end production deployment for the **FitWise** sizing and returns intelligence platform using **MongoDB Atlas**, **Render**, **Vercel**, and **GitHub Actions**.

---

## Architecture Overview

```
                      +-----------------------------+
                      |   Vercel Frontend Hosting   |
                      |  - fitwise-dashboard (Vite) |
                      |  - fitwise-widget (Vite)    |
                      +--------------+--------------+
                                     |
                          HTTPS / CORS Requests
                                     |
                                     v
+------------------------------------+--------------------------------------+
|                           Render Cloud                                    |
|                                                                           |
|   +-----------------------+              +----------------------------+   |
|   |     fitwise-api       | ------------ |       fitwise-ml           |   |
|   |  (Node.js Express)    |  x-internal  |  (FastAPI / LightGBM)      |   |
|   |      [Port 5000]      |    -key      |        [Port 8000]         |   |
|   +-----------+-----------+              +----------------------------+   |
|               |                                                           |
|       +-------+-------+                                                   |
|       |               |                                                   |
|       v               v                                                   |
|  +---------+   +---------------+                                          |
|  | fitwise |   | fitwise-cache |                                          |
|  | -shared |   |  (Key-Value / |                                          |
|  |  Group  |   |  Redis Cache) |                                          |
|  +---------+   +---------------+                                          |
+-------+-------------------------------------------------------------------+
        |
        | Mongoose Driver
        v
+-------------------------------+             +-----------------------------+
|      MongoDB Atlas (M0)       |             |     GitHub Actions CI/CD    |
|   Stores: Products, Events,   | <---------- |  - Node 20 & Py 3.11 tests  |
|  Purchases, Recommendations   |   Seed DB   |  - Nightly Chart Doctor     |
+-------------------------------+  from Laptop+-----------------------------+
```

---

## 1. MongoDB Atlas Setup

FitWise uses MongoDB Atlas for persistence across the API server, recommendations log, size charts, analytics events, and A/B experiments.

### Step 1.1: Create a Cluster
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new cluster under the **M0 Free Tier** (shared RAM and CPU, no credit card required).
3. Select an AWS/GCP region geographically close to your Render deployment region (e.g., `us-east-1` or `oregon`).

### Step 1.2: Configure Database Access
1. Navigate to **Security > Database Access**.
2. Click **Add New Database User**.
3. Choose **Password** authentication:
   - **Username**: `fitwise_app`
   - **Password**: Generate a secure password (save this safely).
4. Assign user privileges: **Read and write to any database** (or restrict to `fitwise`).

### Step 1.3: Configure Network Access
1. Navigate to **Security > Network Access**.
2. Click **Add IP Address**.
3. Add `0.0.0.0/0` (Allow Access from Anywhere) with a description `Render API and Local Seeder`.
   > **Note:** Render Free Tier instances use dynamic egress IP addresses. Restricting by specific static IPs is only available on Render Team/Enterprise plans with static outbound IPs.

### Step 1.4: Retrieve the Connection String
1. Go to **Database > Clusters** and click **Connect**.
2. Select **Drivers** (Node.js).
3. Copy the SRV connection URI:
   ```
   mongodb+srv://fitwise_app:<password>@cluster0.abcde.mongodb.net/fitwise?retryWrites=true&w=majority
   ```
   Replace `<password>` with the password created above.

---

## 2. Seeding Atlas Database from Laptop

Before launching the web frontend or running recommendations, initialize the database with demo products, sizes, historical purchase data, and A/B experiments.

### Step 2.1: Run the Seeder
From your local terminal, navigate to the `server/` directory and execute the seed script against your Atlas cluster:

**On macOS / Linux / Git Bash:**
```bash
cd server
MONGO_URI="mongodb+srv://fitwise_app:<password>@cluster0.abcde.mongodb.net/fitwise?retryWrites=true&w=majority" npm run seed
```

**On Windows (PowerShell):**
```powershell
cd server
$env:MONGO_URI="mongodb+srv://fitwise_app:<password>@cluster0.abcde.mongodb.net/fitwise?retryWrites=true&w=majority"
npm run seed
```

### Step 2.2: Verify Seed Output
The seed script will verify database connectivity, wipe existing demo collections, and seed:
- **1 Demo Store**: `store_fitwise_demo`
  - **Publishable Key**: `fw_pub_demo_984f1a23c7e0`
  - **Secret Key**: `fw_sec_demo_a41b89c372ef`
- **1 Active A/B Experiment**: Default split testing widget conversion.
- **8 Products**: Spanning all categories (`tshirt`, `jeans`, `kurta`, `blouse`) and regional standard charts (`US`, `UK`, `EU`, `IN`).
- **300 Historical Purchases**: Sizing purchases with realistic return reasons (including deliberate size biases for Chart Doctor testing).

---

## 3. Render Deployment via Blueprint (`render.yaml`)

FitWise includes an Infrastructure-as-Code Blueprint file ([render.yaml](file:///c:/Users/riyaj/FitWise/render.yaml)) at the repository root that declares all backend microservices, Redis caching, and shared environment groups.

### Step 3.1: Connect Repository to Render
1. Sign in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub/GitLab repository containing FitWise.
4. Render detects [render.yaml](file:///c:/Users/riyaj/FitWise/render.yaml) automatically and plans 3 services + 1 environment group:
   - **`fitwise-api`**: Node.js 20 Web Service (`server/`)
   - **`fitwise-ml`**: Python 3.11 Web Service (`ml-service/`)
   - **`fitwise-cache`**: Render Key Value (Redis-compatible) cache
   - **`fitwise-shared`**: Environment Group with auto-generated `INTERNAL_KEY`

### Step 3.2: Configure Environment Variables
During blueprint creation, Render will prompt for variables with `sync: false`:

| Service / Group | Variable Name | Required Value / Description |
|---|---|---|
| `fitwise-api` | `MONGO_URI` | Your Atlas connection string from Step 1.4 |
| `fitwise-api` | `ALLOWED_ORIGINS` | Comma-separated Vercel URLs (e.g. `https://fitwise-dashboard.vercel.app,https://fitwise-widget.vercel.app,https://*.vercel.app`) |
| `fitwise-api` | `ML_SERVICE_URL` | Render URL for ML service, e.g. `https://fitwise-ml.onrender.com` |
| `fitwise-api` | `ML_TIMEOUT_MS` | `60000` (Pre-set in blueprint) |
| `fitwise-api` | `ENABLE_CRON` | `false` (Pre-set in blueprint; cron is managed by GitHub Actions) |
| `fitwise-shared` | `INTERNAL_KEY` | Auto-generated by Render (256-bit random key) |

> **Internal Key Sharing**: `fitwise-shared` generates a single 256-bit secret. Both `fitwise-api` (for Chart Doctor internal trigger and outgoing ML requests) and `fitwise-ml` (for incoming inference verification) automatically consume this secret.

### Step 3.3: Verify Deployment
Once build and deployment complete:
- Verify API health: `curl https://fitwise-api.onrender.com/health` -> `{"status":"ok"}`
- Verify ML health: `curl https://fitwise-ml.onrender.com/health` -> `{"status":"ok"}`

---

## 4. Vercel Deployment (Dashboard and Widget)

The FitWise frontend consists of two separate Vite single-page applications inside the monorepo:
1. `dashboard/`: Merchant analytics, A/B testing controls, and Chart Doctor size chart editor.
2. `widget/`: Embeddable sizing drawer and merchant demo store page.

Deploy each as an independent project in [Vercel](https://vercel.com):

### Project 1: Merchant Dashboard (`fitwise-dashboard`)
1. In the Vercel Dashboard, click **Add New... > Project**.
2. Select your FitWise repository.
3. Under **Root Directory**, click **Edit** and set:
   ```
   dashboard
   ```
4. Configure Build and Output settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://fitwise-api.onrender.com`
   - `VITE_WIDGET_URL`: `https://<your-widget-project-name>.vercel.app`
   - `VITE_PUBLISHABLE_KEY`: `fw_pub_demo_984f1a23c7e0`
6. Click **Deploy**.

### Project 2: Customer Sizing Widget (`fitwise-widget`)
1. In the Vercel Dashboard, click **Add New... > Project**.
2. Select the same FitWise repository.
3. Under **Root Directory**, click **Edit** and set:
   ```
   widget
   ```
4. Configure Build and Output settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://fitwise-api.onrender.com`
   - `VITE_PUBLISHABLE_KEY`: `fw_pub_demo_984f1a23c7e0`
6. Click **Deploy**.

> **Post-Deployment Step**: Copy the generated production URLs for both projects (e.g., `https://fitwise-dashboard.vercel.app` and `https://fitwise-widget.vercel.app`) and update the `ALLOWED_ORIGINS` environment variable in the Render `fitwise-api` settings.

---

## 5. GitHub Repository Secrets Configuration

To enable automated testing and scheduled background operations, configure secrets in your GitHub repository:

1. Navigate to **GitHub Repository > Settings > Secrets and variables > Actions**.
2. Click **New repository secret** and add the following:

| Secret Name | Description | Example / Source |
|---|---|---|
| `API_URL` | Public HTTPS URL of the deployed Render API | `https://fitwise-api.onrender.com` |
| `INTERNAL_KEY` | Shared microservice secret generated by Render | Copy from Render's `fitwise-shared` Environment Group |

### Testing Workflows
- **CI/CD (`.github/workflows/ci-cd.yml`)**:
  Triggers automatically on every `push` and `pull_request` to `main`/`master`. Runs Node.js 20 Jest tests and Python 3.11 Pytest tests concurrently.
- **Chart Doctor Cron (`.github/workflows/chart-doctor-cron.yml`)**:
  Runs nightly at 02:00 UTC. To verify immediately, navigate to **Actions > Chart Doctor Nightly Job > Run workflow** (workflow dispatch).

---

## 6. Machine Learning Build Fallback (OOM Handling)

On Render's Free Tier, build containers have a memory limit of **512 MB RAM**. Running `python -m training.generate_data && python -m training.train` creates synthetic datasets and trains four LightGBM multi-output classifiers, which may occasionally trigger an Out-Of-Memory error (`exit code 137` / `Killed`).

### If Render Build Runs Out of Memory:
1. **Train locally on your machine**:
   ```bash
   cd ml-service
   # Activate your local python environment
   pip install -r requirements.txt
   python -m training.generate_data
   python -m training.train
   ```
2. **Verify generated models**:
   Confirm that `.joblib` model artifacts and JSON metadata files are present in `ml-service/models/`:
   - `tshirt.joblib`, `tshirt_meta.json`
   - `jeans.joblib`, `jeans_meta.json`
   - `kurta.joblib`, `kurta_meta.json`
   - `blouse.joblib`, `blouse_meta.json`
   - `fairness_report.json`
3. **Commit pre-trained models to Git**:
   ```bash
   git add ml-service/models/*.joblib ml-service/models/*.json
   git commit -m "chore(ml): commit pre-trained models for lightweight build"
   git push origin main
   ```
4. **Update `render.yaml` build command**:
   Change the `fitwise-ml` build command in [render.yaml](file:///c:/Users/riyaj/FitWise/render.yaml) to omit on-instance training:
   ```yaml
   buildCommand: pip install -r requirements.txt
   ```
   Push the update to trigger a lightweight build that simply installs runtime dependencies and serves the pre-compiled models directly.

---

## 7. Troubleshooting Guide

### 7.1 Cold Starts (Free Tier Spin-Down)
- **Symptom**: The first API request, recommendation call, or Chart Doctor run takes 30-60 seconds to respond or returns 504 Gateway Timeout.
- **Cause**: Render Free Web Services automatically spin down after 15 minutes of inactivity. When a new HTTP request arrives, the container boots from scratch.
- **Remedies**:
  - The API server configures `ML_TIMEOUT_MS=60000` to allow the Python ML service sufficient time to boot before the Node API gives up.
  - The GitHub Actions Chart Doctor cron uses `--retry 5 --retry-delay 30 --max-time 120` specifically to absorb container wake-up delays without failing the job.
  - For zero cold starts, upgrade both `fitwise-api` and `fitwise-ml` from `free` to `starter` in [render.yaml](file:///c:/Users/riyaj/FitWise/render.yaml).

### 7.2 CORS Errors (`Access-Control-Allow-Origin`)
- **Symptom**: Browser console displays:
  ```
  Access to fetch at 'https://fitwise-api.onrender.com/api/...' from origin 'https://fitwise-dashboard.vercel.app'
  has been blocked by CORS policy.
  ```
- **Cause**: The origin URL of the Vercel frontend is not listed in `ALLOWED_ORIGINS`.
- **Remedy**:
  - In Render Dashboard under `fitwise-api` **Environment**, inspect `ALLOWED_ORIGINS`.
  - Ensure origins are comma-separated and do **not** include trailing slashes:
    ```
    ALLOWED_ORIGINS=https://fitwise-dashboard.vercel.app,https://fitwise-widget.vercel.app,https://*.vercel.app
    ```
  - `server/src/app.js` natively supports wildcard matching (`https://*.vercel.app`), which permits all Vercel preview and production deployments.

### 7.3 401 Unauthorized Errors
- **Symptom**: Endpoint returns `{"error": {"code": "UNAUTHORIZED", "message": "..."}}`.
- **Cause & Diagnosis**:
  - **Chart Doctor Cron (401)**: The GitHub Secret `INTERNAL_KEY` does not match the Render Environment Group `fitwise-shared`'s `INTERNAL_KEY`. Resync the secret in GitHub Settings.
  - **Dashboard Login (401)**: Ensure you are using the demo secret key (`fw_sec_demo_a41b89c372ef`) seeded into Atlas.
  - **Widget Recommendation (401)**: Ensure `VITE_PUBLISHABLE_KEY` in Vercel matches `fw_pub_demo_984f1a23c7e0`.

### 7.4 ML Service Timeout (`503 ML_UNAVAILABLE`)
- **Symptom**: `POST /api/recommend` returns `503 SERVICE_UNAVAILABLE` with code `ML_UNAVAILABLE`.
- **Cause**: The Node API timed out waiting for `fitwise-ml`, or `ML_SERVICE_URL` is pointing to an incorrect host.
- **Remedy**:
  - Verify `ML_SERVICE_URL` in `fitwise-api` environment variables is set to the full HTTPS URL of `fitwise-ml` (e.g. `https://fitwise-ml.onrender.com`), not `http://localhost:8000`.
  - Check the logs of `fitwise-ml` in the Render dashboard to verify the Uvicorn server started cleanly and loaded the models.
  - Verify that `ML_TIMEOUT_MS` is set to `60000` (60 seconds) to tolerate Render cold start latency.
