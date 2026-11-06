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
MONGO_URI="mongodb+srv://your_mongo_uri.mongodb.net/FitWise?appName=Cluster0"
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
=======
# FitWise – AI Size & Fit Recommendation

> Wrong sizing drives 30–40% of fashion returns. FitWise predicts the right size for every shopper from their past purchases and body measurements, with the goal of cutting size-related returns by 20%.

FitWise is an embeddable size recommendation widget for online fashion stores. A shopper enters a few measurements (or lets the system use their purchase history), and a machine learning model recommends the size most likely to fit.

---

## Features

- **Personalized size prediction** from body measurements and past purchase/return history
- **Embeddable React widget** that drops into any product page with a single snippet
- **Fast responses** through Redis caching of repeated predictions
- **Separate ML service** (FastAPI) so models can be retrained and deployed independently
- **Containerized and automated**: Docker images and CI/CD via GitHub Actions
- **Cloud-ready** deployment on AWS Lambda / ECS

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend widget | React |
| API / backend | Node.js, Express |
| ML service | Python, FastAPI, scikit-learn, LightGBM |
| Database | MongoDB |
| Cache | Redis |
| DevOps | Docker, GitHub Actions |
| Cloud | AWS Lambda, AWS ECS |

---

## Architecture

```
 ┌──────────────┐      ┌────────────────────┐      ┌────────────────────┐
 │ React Widget │ ───▶ │ Node/Express API   │ ───▶ │ FastAPI ML Service │
 │ (embeddable) │ ◀─── │ (auth, validation) │ ◀─── │ scikit-learn /     │
 └──────────────┘      └─────────┬──────────┘      │ LightGBM           │
                                 │                 └────────────────────┘
                        ┌────────┴────────┐
                        │ MongoDB │ Redis │
                        └─────────────────┘
```

1. The widget collects measurements and sends them to the Express API.
2. The API validates the request, checks Redis for a cached result, and loads purchase history from MongoDB.
3. If there's no cache hit, the API calls the FastAPI service, which runs the trained model and returns a recommended size with a confidence score.
4. The result is cached and shown to the shopper in the widget.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker and Docker Compose
- MongoDB and Redis (provided by Docker Compose)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/fitwise.git
cd fitwise

# Copy environment variables
cp .env.example .env

# Start all services
docker compose up --build
```

### Running services individually

```bash
# Backend API
cd server
npm install
npm run dev

# ML service
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload

# Widget
cd widget
npm install
npm start
```

### Environment variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL |
| `ML_SERVICE_URL` | Base URL of the FastAPI service |
| `PORT` | Express server port |

---

## Usage

### Embed the widget

```html
<div id="fitwise-widget" data-product-id="PRODUCT_ID"></div>
<script src="https://<your-domain>/fitwise.js"></script>
```

### API example

```http
POST /api/recommend
Content-Type: application/json

{
  "productId": "SKU-1042",
  "measurements": { "height_cm": 172, "weight_kg": 68, "chest_cm": 94, "waist_cm": 80 },
  "userId": "optional-user-id"
}
```

Response:

```json
{
  "recommendedSize": "M",
  "confidence": 0.87,
  "alternatives": ["L"]
}
```

---

## How the Model Works

- **Inputs:** body measurements, brand/product size charts, and the shopper's past purchases (kept vs. returned).
- **Models:** scikit-learn baselines and a LightGBM classifier for size prediction.
- **Output:** the most likely size, a confidence score, and an alternative size when confidence is low.
- **Retraining:** the ML service is separate, so a new model version can be trained and deployed without touching the API or widget.

---

## Project Structure

```
fitwise/
├── widget/          # React embeddable widget
├── server/          # Node/Express API
├── ml-service/      # FastAPI + model training code
├── docker-compose.yml
└── .github/workflows/   # CI/CD pipelines
```

---

## Deployment

- Docker images are built and tested on every push by **GitHub Actions**.
- Services are deployed to **AWS ECS** (API and ML service) and **AWS Lambda** (lightweight endpoints).

---

## Roadmap

- [ ] A/B testing to measure the real drop in return rate
- [ ] Brand-specific size chart ingestion
- [ ] Model monitoring and automated retraining
- [ ] Shopify / WooCommerce plugins

---

## Contributing

Contributions are welcome. Fork the repo, create a feature branch, and open a pull request.

## License

Distributed under the MIT License. See `LICENSE` for details.

## Author

**Riya Jayaswal**: [GitHub](https://github.com/RIYAJAYASWAL) 
