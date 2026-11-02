# FitWise — AI Size Intelligence & Returns Reduction Platform

**FitWise** is an end-to-end e-commerce sizing intelligence and returns reduction system. It combines a lightweight, embeddable customer sizing widget, a high-performance machine learning microservice for tailored garment recommendations, an automated sizing diagnostics engine (**Chart Doctor**), and a comprehensive store owner analytics dashboard.

---

## Repository Folder Structure

```
FitWise/
├── .github/
│   └── workflows/
│       ├── ci-cd.yml                 # GitHub Actions CI/CD (Node 20 & Py 3.11 test suites)
│       └── chart-doctor-cron.yml     # Nightly automated Chart Doctor diagnostics run
├── docs/
│   ├── API_CONTRACT.md               # Universal REST API specification & data contracts
│   └── DEPLOYMENT.md                 # Production deployment guide (Atlas, Render, Vercel)
├── scripts/
│   ├── dev.md                        # Step-by-step local native development instructions
│   └── e2e.sh                        # End-to-end customer journey & API verification script
├── server/                           # Node.js Express REST API server
│   ├── scripts/
│   │   └── seed.js                   # Idempotent database seeder (demo store, products, history)
│   ├── src/
│   │   ├── config/                   # Environment validation (Zod), MongoDB, logger
│   │   ├── controllers/              # Request handlers (recommend, feedback, analytics)
│   │   ├── middleware/               # Auth (publishable/secret key), rate limiting, validation
│   │   ├── models/                   # Mongoose schemas (Product, Purchase, Experiment, etc.)
│   │   ├── routes/                   # Route declarations matching API Contract
│   │   └── services/                 # Chart Doctor, ML client, experiment assignment
│   └── tests/                        # Jest test suites (150+ tests using in-memory MongoDB)
├── ml-service/                       # Python 3.11 FastAPI machine learning microservice
│   ├── app/
│   │   ├── features.py               # Tailoring measurement feature engineering
│   │   ├── main.py                   # FastAPI application, auth middleware, health check
│   │   ├── model_loader.py           # Model caching and inference pipeline
│   │   └── predict.py                # Inference handler, fallback heuristics, explanations
│   ├── models/                       # Pre-trained LightGBM model artifacts (.joblib)
│   ├── tests/                        # Pytest suites (unit, API, feature, explanation tests)
│   └── training/                     # Synthetic data generator & model training scripts
├── dashboard/                        # Store Owner Analytics & Operations SPA (React + Vite)
│   ├── src/
│   │   ├── components/               # Layout, TopBar, Sidebar, ExperimentResultsPanel
│   │   ├── context/                  # AuthContext (session secret key), ThemeContext
│   │   ├── pages/                    # Overview, Products, Recommendations, Chart Doctor,
│   │   │                             # Experiments, Communities, Journals, Settings
│   │   └── api.js                    # Authenticated dashboard API client
│   └── package.json
├── widget/                           # Embeddable Sizing Widget & Demo Store (React + Vite)
│   ├── public/
│   │   └── demo.html                 # Complete merchant e-commerce product demo page
│   ├── src/
│   │   ├── api/                      # Client for recommendations, events, feedback
│   │   ├── components/               # FitModal, SizeForm, Result, WhyThisSize, FeedbackCard
│   │   ├── embed.js                  # Shadow DOM mounting script with window.FitWise SDK
│   │   └── styles.css                # Encapsulated CSS tokens injected into Shadow DOM
│   └── package.json
└── render.yaml                       # Render Infrastructure-as-Code Blueprint
```

---

## Native Run Instructions (No Docker)

All services run natively on macOS, Linux, or Windows without requiring Docker containers.

### Prerequisites
- **Node.js**: v18.x or v20.x (`node -v`)
- **npm**: v9.x or v10.x (`npm -v`)
- **Python**: v3.11.x or v3.12.x (`python --version`)
- **MongoDB**: A free MongoDB Atlas cluster connection URI (or local MongoDB on port 27017)

---

### 1. Machine Learning Service (`ml-service`)

The ML microservice serves predictions on port `8000`.

```bash
# 1. Navigate to ml-service
cd ml-service

# 2. Create and activate a Python virtual environment
# On Linux / macOS / Git Bash:
python3 -m venv .venv
source .venv/bin/activate

# On Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. (Optional) Generate data and train models if models/*.joblib do not already exist
python -m training.generate_data
python -m training.train

# 5. Start the FastAPI service
# On Linux / macOS / Git Bash:
export INTERNAL_KEY="dev-internal-key-secret-123"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# On Windows (PowerShell):
$env:INTERNAL_KEY="dev-internal-key-secret-123"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Service URL**: `http://localhost:8000`
- **Health Check**: `curl http://localhost:8000/health` -> `{"status":"ok"}`

---

### 2. Node.js API Server (`server`)

The API server runs on port `5000` and coordinates with MongoDB, the ML service, and the frontends.

```bash
# 1. Open a new terminal and navigate to server
cd server

# 2. Install dependencies
npm install

# 3. Configure environment variables in server/.env
# Copy server/.env.example to server/.env if needed:
PORT=5000
MONGO_URI="mongodb+srv://alex:pass123@cluster0.znidj0t.mongodb.net/FitWise?appName=Cluster0"
ML_SERVICE_URL="http://localhost:8000"
ML_TIMEOUT_MS=5000
ML_INTERNAL_KEY="dev-internal-key-secret-123"
INTERNAL_KEY="dev-internal-key-secret-123"
ALLOWED_ORIGINS="http://localhost:*"
ENABLE_CRON=false
NODE_ENV=development

# 4. Seed database with demo store, catalog, and purchase history
npm run seed

# 5. Start the development server
npm run dev
```
- **Service URL**: `http://localhost:5000`
- **Health Check**: `curl http://localhost:5000/health` -> `{"status":"ok"}`
- **Seeded Demo Keys**:
  - **Publishable Key** (Widget): `fw_pub_demo_984f1a23c7e0`
  - **Secret Key** (Dashboard): `fw_sec_demo_a41b89c372ef`

---

### 3. Customer Sizing Widget & Demo Store (`widget`)

The customer sizing widget runs on port `5173`.

```bash
# 1. Open a new terminal and navigate to widget
cd widget

# 2. Install dependencies
npm install

# 3. Build standalone embed script
npm run build

# 4. Start local development server
npm run dev
```
- **Local Dev Server**: `http://localhost:5173`
- **Merchant Demo Store**: `http://localhost:5173/demo.html`
  - Demonstrates the embedded Shadow DOM widget inside an UrbanClassic e-commerce PDP.

---

### 4. Store Owner Dashboard (`dashboard`)

The merchant analytics and sizing operations dashboard runs on port `5174`.

```bash
# 1. Open a new terminal and navigate to dashboard
cd dashboard

# 2. Install dependencies
npm install

# 3. Build production bundle
npm run build

# 4. Start local development server
npm run dev
```
- **Dashboard URL**: `http://localhost:5174`
- **Login / Connect**: Enter your credentials or click **Quick Sign In with Demo Key** (pre-configured with `fw_sec_demo_a41b89c372ef`).

---

## Testing & Verification

### Run Package Test Suites
```bash
# Server tests (Jest, 154 passing tests)
cd server && npm test

# ML Service tests (Pytest, 51 passing tests)
cd ml-service && pytest

# Widget tests (Vitest, 55 passing tests)
cd widget && npm test
```

### Run End-to-End Journey Verification Script
With both the ML service (port 8000) and API server (port 5000) running:
```bash
bash scripts/e2e.sh
```
This script exercises the complete end-to-end journey via curl:
1. **Assign Variant**: `GET /api/experiments/assign?visitorId=...`
2. **Fetch Size Chart**: `GET /api/products/SKU-TSHIRT-CLASSIC/sizechart`
3. **ML Recommendation**: `POST /api/recommend`
4. **Log Interaction Events**: `POST /api/events` (`widget_shown`, `add_to_cart`, `purchase`)
5. **Report Fit Outcome**: `POST /api/feedback` with return reasons (`too_small`)
6. **Trigger Chart Doctor**: `POST /internal/chart-doctor/run` with `x-internal-key`
7. **Query Flags**: `GET /api/chart-doctor/flags`
8. **Query Analytics Summary**: `GET /api/analytics/summary`
9. **Query A/B Experiment Results**: `GET /api/experiments/exp_fitwise_ab_01/results`

---

## Accessibility & Responsive Design

- **Keyboard Navigation**: All interactive elements (buttons, inputs, select dropdowns, modal tabs, drawers) feature distinct focus rings, support <kbd>Enter</kbd> / <kbd>Space</kbd> activation, and dismiss via <kbd>Escape</kbd>.
- **Screen Reader Support**: Standard ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-selected`, `aria-invalid`, `aria-describedby`, `aria-live="polite"`).
- **Loading & Empty States**: Polished skeleton placeholders, spinner states, and informative empty-state views are implemented across all dashboard pages and widget steps.
- **Responsive Layout**: Fluid breakpoints ensure comfortable viewing across desktop monitors, tablets, and mobile devices.
