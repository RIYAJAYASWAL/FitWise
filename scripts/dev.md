# FitWise Local Native Development Guide

This guide describes how to run all FitWise services natively on your local machine without Docker.

---

## 1. Machine Learning Service (`ml-service`)

The ML microservice is built with FastAPI, scikit-learn, and joblib.

### Step 1.1: Navigate to `ml-service` and Create Virtual Environment
```bash
cd ml-service

# On Linux / macOS / Git Bash:
python3 -m venv .venv
source .venv/bin/activate

# On Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# On Windows (CMD):
python -m venv .venv
.\.venv\Scripts\activate.bat
```

### Step 1.2: Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 1.3: Generate Synthetic Data and Train Models (Optional if models exist)
If `models/*.joblib` files are not already present in `ml-service/models/`:
```bash
python -m training.generate_data
python -m training.train
```
*(If `blouse.joblib`, `jeans.joblib`, `kurta.joblib`, and `tshirt.joblib` already exist, this step can be skipped).*

### Step 1.4: Start the FastAPI Service with `INTERNAL_KEY`
```bash
# On Linux / macOS / Git Bash:
export INTERNAL_KEY="dev-internal-key-secret-123"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# On Windows (PowerShell):
$env:INTERNAL_KEY="dev-internal-key-secret-123"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The ML service will be available at: `http://localhost:8000`. You can verify health at `http://localhost:8000/health`.

---

## 2. Node.js API Server (`server`)

The API server is built with Node.js 18+ (ES modules), Express, and Mongoose.

### Step 2.1: Navigate to `server` and Install Dependencies
```bash
cd server
npm install
```

### Step 2.2: Configure Environment Variables
Create or update `server/.env` with your MongoDB Atlas connection string (or local instance) targeting the `fitwise_dev` database:

```env
# Server Port
PORT=5000

# MongoDB Connection URI (Atlas cluster or local instance, using fitwise_dev database)
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/fitwise_dev?retryWrites=true&w=majority

# ML Service Integration
ML_SERVICE_URL=http://localhost:8000
ML_TIMEOUT_MS=5000
ML_INTERNAL_KEY=dev-internal-key-secret-123
INTERNAL_KEY=dev-internal-key-secret-123

# Allowed Origins (supports wildcard for local frontends)
ALLOWED_ORIGINS=http://localhost:*

# Redis is optional: Leave REDIS_URL unset to operate without caching
# REDIS_URL=

# Cron jobs (optional)
ENABLE_CRON=false
```

### Step 2.3: Seed the Database
Run the idempotent seeder to populate the demo store, running A/B experiment, catalog products, and sample purchase history:
```bash
npm run seed
```
The seeder will output the demo API keys:
- **Publishable Key**: `fw_pub_demo_984f1a23c7e0`
- **Secret Key**: `fw_sec_demo_a41b89c372ef`

### Step 2.4: Start the API Server
```bash
npm run dev
```
The server will start listening at `http://localhost:5000`. You can verify health at `http://localhost:5000/health`.
*(Note: Redis is completely optional. If `REDIS_URL` is omitted, the API server logs a warning and continues without caching).*

---

## 3. End-to-End Verification Script (`scripts/e2e.sh`)

Once both the ML service (port 8000) and API server (port 5000) are running, execute the verification script using bash / curl:

```bash
# From the repository root:
bash scripts/e2e.sh
```

This runs a full simulated customer journey and merchant reporting flow:
1. Assigns variant (`control` or `treatment`) for a new visitor.
2. Fetches the product size chart.
3. Requests a size recommendation (calling the ML service).
4. Records customer interaction events (`widget_shown`, `add_to_cart`, `purchase`).
5. Posts purchase outcome feedback with return reasons (`too_small`).
6. Triggers Chart Doctor diagnostic aggregation with the internal key.
7. Queries Chart Doctor flags with the secret dashboard key.
8. Retrieves date-filtered analytics summary with the secret dashboard key.
9. Retrieves A/B experiment statistical results with the secret dashboard key.
