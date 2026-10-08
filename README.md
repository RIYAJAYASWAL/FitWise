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
