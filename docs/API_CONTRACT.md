# FitWise API Contract

This document defines the strict API contract and data schemas for all services in the FitWise platform. Every component—the React Widget, Store Owner Dashboard, Node/Express API Server, and FastAPI ML Service—must adhere to these specifications.

---

## 1. GLOBAL SPECIFICATIONS

### 1.1 Sizes & Ordering
Standard sizes are strictly ordered from smallest to largest:
```
XS < S < M < L < XL < XXL
```
- Available Sizes: `["XS", "S", "M", "L", "XL", "XXL"]`

### 1.2 Regions
- Supported Regions: `["US", "UK", "EU", "IN"]`

### 1.3 Categories & Required Measurements
Each product category requires a dedicated set of measurement inputs:

| Category | Required Measurements |
| :--- | :--- |
| **`tshirt`** | `height_cm`, `weight_kg`, `chest_cm`, `waist_cm` |
| **`jeans`** | `height_cm`, `weight_kg`, `waist_cm`, `hip_cm` |
| **`kurta`** | `height_cm`, `shoulder_cm`, `bust_cm`, `length_cm` |
| **`blouse`** | `bust_cm`, `waist_cm`, `shoulder_cm` |

Measurement validation ranges (in cm / kg):
- `height_cm`: 120 – 220
- `weight_kg`: 30 – 200
- `chest_cm`, `waist_cm`, `hip_cm`, `shoulder_cm`, `bust_cm`, `length_cm`: 50 – 200

### 1.4 Size Chart Structure
A size chart is an array of chart rows: `[chart rows]`.
Each chart row conforms to:
```typescript
{
  size: "XS" | "S" | "M" | "L" | "XL" | "XXL",
  [field: string]: [min: number, max: number]
}
```

Fields per category:
- **`tshirt`**: `chest: [min, max]`, `waist: [min, max]`
- **`jeans`**: `waist: [min, max]`, `hip: [min, max]`
- **`kurta`**: `shoulder: [min, max]`, `bust: [min, max]`, `length: [min, max]`
- **`blouse`**: `bust: [min, max]`, `waist: [min, max]`, `shoulder: [min, max]`

Example (`tshirt`):
```json
[
  { "size": "XS", "chest": [84, 89], "waist": [70, 75] },
  { "size": "S", "chest": [89, 94], "waist": [75, 80] },
  { "size": "M", "chest": [94, 99], "waist": [80, 85] },
  { "size": "L", "chest": [99, 104], "waist": [85, 90] },
  { "size": "XL", "chest": [104, 110], "waist": [90, 96] },
  { "size": "XXL", "chest": [110, 118], "waist": [96, 104] }
]
```

### 1.5 Return Reasons & Variants
- **Return Reasons**: `["too_small", "too_large", "style", "quality", "other"]`
- **Experiment Variants**: `["control", "treatment"]`

### 1.6 Event Types
- **Tracked Event Types**:
  - `widget_shown`
  - `recommend_requested`
  - `add_to_cart`
  - `purchase`
  - `return`

### 1.7 Universal Error Format
All services must return errors in this uniform JSON structure:
```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human-readable explanation of error"
  }
}
```

Standard Error Codes:
- `BAD_REQUEST`: Invalid input body, missing required fields, or validation failed.
- `UNAUTHORIZED`: Missing or invalid `x-api-key` or `x-internal-key`.
- `FORBIDDEN`: Key lacks permission for the requested resource (e.g. publishable key on secret route).
- `NOT_FOUND`: Product, store, or experiment ID not found.
- `SERVICE_UNAVAILABLE`: Downstream ML service unavailable.
- `INTERNAL_ERROR`: Unexpected server error.

---

## 2. AUTHENTICATION & ACCESS CONTROL

### 2.1 Store API Keys (`x-api-key`)
Every store has two keys:
1. **PUBLISHABLE Key**: Safe for client-side embedding in the widget.
2. **SECRET Key**: Kept private for store owner dashboard use.

Security Rule:
- Only **SHA-256 hashes** of keys are stored in the database (`stores` collection: `publicKeyHash`, `secretKeyHash`). Raw keys are never stored.

Route Permissions for `x-api-key`:
- **Publishable Key** can call:
  - `GET /api/products/:id/sizechart`
  - `GET /api/experiments/assign`
  - `POST /api/recommend`
  - `POST /api/events`
  - `POST /api/feedback`
- **Secret Key** is required for:
  - `GET /api/products`
  - `GET /api/analytics/summary`
  - `GET /api/experiments/:id/results`
  - `GET /api/chart-doctor/flags`
  - `GET /api/suggestions`
  - `GET /api/community/groups`
  - `POST /api/community/groups`
  - `POST /api/community/groups/:id/join`
  - `POST /api/community/groups/:id/leave`
  - `GET /api/journals`
  - `POST /api/journals`
  - `POST /api/journals/:id/like`
  *(Note: The Secret Key is also authorized to call all publishable routes).*

### 2.2 Internal Key (`x-internal-key`)
- Shared secret (`INTERNAL_KEY` / `ML_INTERNAL_KEY`).
- Required for:
  - All routes on the FastAPI ML Service (except `/health`).
  - `POST /internal/chart-doctor/run` on the Node API server.

### 2.3 Health Endpoints (`/health`)
- `GET /health` on both the Node API and the ML Service requires **no authentication**.

---

## 3. ML SERVICE API (FastAPI)

Base Path: `http://<ml-service-host>`

### 3.1 POST /predict
Predicts optimal clothing size, confidence score, alternatives, and plain-language explanation.

- **Headers**:
  - `Content-Type: application/json`
  - `x-internal-key: <INTERNAL_KEY>`
- **Request Body**:
  ```json
  {
    "category": "tshirt",
    "measurements": {
      "height_cm": 175,
      "weight_kg": 70,
      "chest_cm": 96,
      "waist_cm": 82
    },
    "sizeChart": [
      { "size": "XS", "chest": [84, 89], "waist": [70, 75] },
      { "size": "S", "chest": [89, 94], "waist": [75, 80] },
      { "size": "M", "chest": [94, 99], "waist": [80, 85] },
      { "size": "L", "chest": [99, 104], "waist": [85, 90] },
      { "size": "XL", "chest": [104, 110], "waist": [90, 96] },
      { "size": "XXL", "chest": [110, 118], "waist": [96, 104] }
    ],
    "history": [
      { "sizeBought": "M", "kept": true }
    ],
    "bias": 0
  }
  ```
  - `bias`: Integer `-1..1` (default `0`). Applied from Chart Doctor flags to nudge recommendations.
- **Response Body** (`200 OK`):
  ```json
  {
    "recommendedSize": "M",
    "confidence": 0.88,
    "alternatives": ["L"],
    "explanation": {
      "summary": "Size M is recommended based on your chest and waist measurements.",
      "chartReason": "Your chest is 96 cm; this brand's M covers 94-99 cm.",
      "topFactors": [
        { "feature": "chest_cm", "impact": 0.42 },
        { "feature": "waist_cm", "impact": 0.28 }
      ]
    }
  }
  ```

### 3.2 GET /health
Health check endpoint.

- **Headers**: None required.
- **Response Body** (`200 OK`):
  ```json
  {
    "status": "ok",
    "modelsLoaded": ["tshirt", "jeans", "kurta", "blouse"]
  }
  ```

---

## 4. NODE API (Express)

Base Path: `http://<node-server-host>`

### 4.1 POST /api/recommend
Fetches size recommendation for a shopper on a product.

- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <publishable_or_secret_key>`
- **Request Body**:
  ```json
  {
    "productId": "SKU-1042",
    "measurements": {
      "height_cm": 172,
      "weight_kg": 68,
      "chest_cm": 94,
      "waist_cm": 80
    },
    "userId": "usr_9981",
    "visitorId": "vis_8123",
    "region": "US"
  }
  ```
  *(Note: `userId`, `visitorId`, and `region` are optional).*
- **Response Body** (`200 OK`):
  ```json
  {
    "recommendedSize": "M",
    "regionSize": "M",
    "confidence": 0.87,
    "alternatives": ["L"],
    "explanation": {
      "summary": "Size M is the best match for your body profile.",
      "chartReason": "Your chest is 94 cm; this brand's M covers 92-97 cm.",
      "topFactors": [
        { "feature": "chest_cm", "impact": 0.35 }
      ]
    },
    "lowConfidence": false
  }
  ```

### 4.2 POST /api/feedback
Records order outcome (kept or returned) to feed model training and Chart Doctor.

- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <publishable_or_secret_key>`
- **Request Body**:
  ```json
  {
    "userId": "usr_9981",
    "productId": "SKU-1042",
    "sizeBought": "M",
    "kept": false,
    "returnReason": "too_small",
    "variant": "treatment"
  }
  ```
  *(Note: `userId` and `variant` ("control" | "treatment") are optional. `returnReason` is required when `kept` is `false`).*
- **Response Body** (`200 OK`):
  ```json
  {
    "saved": true
  }
  ```

### 4.3 GET /api/products
Lists all products for store inventory and flag counts.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Response Body** (`200 OK`):
  ```json
  [
    {
      "sku": "SKU-1042",
      "name": "Classic Crewneck Tee",
      "imageUrl": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
      "brand": "UrbanClassic",
      "category": "tshirt",
      "region": "US",
      "flagCount": 1
    }
  ]
  ```

### 4.4 GET /api/products/:id/sizechart
Fetches the size chart for a given product SKU.

- **Headers**:
  - `x-api-key: <publishable_or_secret_key>`
- **Response Body** (`200 OK`):
  ```json
  {
    "sku": "SKU-1042",
    "brand": "UrbanClassic",
    "category": "tshirt",
    "region": "US",
    "sizeChart": [
      { "size": "XS", "chest": [84, 89], "waist": [70, 75] },
      { "size": "S", "chest": [89, 94], "waist": [75, 80] },
      { "size": "M", "chest": [94, 99], "waist": [80, 85] },
      { "size": "L", "chest": [99, 104], "waist": [85, 90] },
      { "size": "XL", "chest": [104, 110], "waist": [90, 96] },
      { "size": "XXL", "chest": [110, 118], "waist": [96, 104] }
    ]
  }
  ```

### 4.5 GET /api/experiments/assign?visitorId=
Determines A/B test variant assignment using deterministic hash of `visitorId`.

- **Headers**:
  - `x-api-key: <publishable_or_secret_key>`
- **Query Parameters**:
  - `visitorId` (string, required)
- **Response Body** (`200 OK`):
  ```json
  {
    "experimentId": "exp_fitwise_ab_01",
    "variant": "treatment"
  }
  ```

### 4.6 POST /api/events
Logs customer interaction event for A/B testing and analytics.

- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <publishable_or_secret_key>`
- **Request Body**:
  ```json
  {
    "visitorId": "vis_8123",
    "variant": "treatment",
    "type": "widget_shown",
    "sku": "SKU-1042",
    "timestamp": "2026-10-11T10:00:00.000Z"
  }
  ```
  *(Note: `sku` and `timestamp` are optional).*
- **Response Body** (`200 OK`):
  ```json
  {
    "saved": true
  }
  ```

### 4.7 GET /api/experiments/:id/results
Computes statistical comparison between control and treatment variants for an experiment.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Path Parameters**:
  - `id` (string, required): Experiment ID.
- **Response Body** (`200 OK`):
  ```json
  {
    "experimentId": "exp_fitwise_ab_01",
    "control": {
      "visitors": 1200,
      "addToCart": 240,
      "purchases": 120,
      "returns": 24
    },
    "treatment": {
      "visitors": 1210,
      "addToCart": 310,
      "purchases": 165,
      "returns": 18
    },
    "metrics": [
      {
        "name": "add_to_cart_rate",
        "controlRate": 0.2000,
        "treatmentRate": 0.2562,
        "diff": 0.0562,
        "ci95": [0.0210, 0.0914],
        "pValue": 0.0012,
        "significant": true
      },
      {
        "name": "conversion_rate",
        "controlRate": 0.1000,
        "treatmentRate": 0.1364,
        "diff": 0.0364,
        "ci95": [0.0112, 0.0616],
        "pValue": 0.0048,
        "significant": true
      },
      {
        "name": "return_rate",
        "controlRate": 0.2000,
        "treatmentRate": 0.1091,
        "diff": -0.0909,
        "ci95": [-0.1548, -0.0270],
        "pValue": 0.0062,
        "significant": true
      }
    ],
    "warning": null
  }
  ```
  - Metrics evaluated: `add_to_cart_rate`, `conversion_rate`, `return_rate`.
  - `warning`: `string | null` (e.g. `"Sample size too small to conclude significance"` if sample size < threshold).

### 4.8 GET /api/analytics/summary?from=&to=
Retrieves high-level store size and recommendation analytics for a specified date range.
Includes totalOrders, conversionRate, activeBrands, topCategories, and previous period metrics.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Query Parameters**:
  - `from` (string, ISO date, optional)
  - `to` (string, ISO date, optional)
- **Response Body** (`200 OK`):
  ```json
  {
    "recommendations": 1420,
    "avgConfidence": 0.84,
    "sizeDistribution": {
      "XS": 82,
      "S": 240,
      "M": 510,
      "L": 380,
      "XL": 160,
      "XXL": 48
    },
    "returnRate": 0.112,
    "lowConfidenceShare": 0.065,
    "totalOrders": 300,
    "conversionRate": 0.1250,
    "activeBrands": 4,
    "topCategories": [
      { "category": "tshirt", "share": 0.55 },
      { "category": "jeans", "share": 0.45 }
    ],
    "previous": {
      "recommendations": 1200,
      "avgConfidence": 0.82,
      "sizeDistribution": { "XS": 60, "S": 200, "M": 450, "L": 340, "XL": 120, "XXL": 30 },
      "returnRate": 0.128,
      "lowConfidenceShare": 0.075,
      "totalOrders": 260,
      "conversionRate": 0.1180,
      "activeBrands": 3,
      "topCategories": [
        { "category": "tshirt", "share": 0.52 },
        { "category": "jeans", "share": 0.48 }
      ]
    }
  }
  ```

### 4.9 GET /api/analytics/trend?from=&to=
Retrieves weekly fit performance trend comparing the FitWise widget experience against standard sizing.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Query Parameters**:
  - `from` (string, ISO date, optional)
  - `to` (string, ISO date, optional)
- **Response Body** (`200 OK`):
  ```json
  {
    "points": [
      {
        "date": "2026-08-01",
        "widget": 0.8920,
        "standard": 0.7810
      },
      {
        "date": "2026-08-08",
        "widget": null,
        "standard": 0.8100
      }
    ]
  }
  ```
  *(Note: `widget = 1 - size_related_return_rate` among treatment purchases; `standard = same for control`. Returns `null` when a bucket has fewer than 20 purchases).*

### 4.10 GET /api/recommendations?status=all|pending|kept|returned&page=1&limit=20
Lists recommendations with matched post-purchase fit outcomes.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Query Parameters**:
  - `status`: `"all" | "pending" | "kept" | "returned"` (default `"all"`)
  - `page`: integer (default `1`)
  - `limit`: integer (default `20`)
- **Response Body** (`200 OK`):
  ```json
  {
    "items": [
      {
        "id": "6708f12a3b04c81a2f9011ab",
        "sku": "SKU-TSHIRT-CLASSIC",
        "name": "Classic Crewneck Tee",
        "brand": "UrbanClassic",
        "category": "tshirt",
        "imageUrl": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
        "size": "M",
        "confidence": 0.89,
        "status": "kept",
        "createdAt": "2026-10-11T12:00:00.000Z"
      }
    ],
    "total": 142
  }
  ```

### 4.11 GET /api/suggestions
Retrieves prioritized rule-based sizing and chart improvement suggestions.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Response Body** (`200 OK`):
  ```json
  {
    "topInsight": "Review the size chart for EuroFit: 38% of size M orders were returned as too small.",
    "items": [
      {
        "id": "flag_SKU-TSHIRT-SLIM_M",
        "title": "Review the size chart for Slim Fit Stretch Tee",
        "detail": "38% of size M orders were returned as too small (50 orders evaluated).",
        "impact": "High",
        "target": {
          "route": "/chart-doctor",
          "sku": "SKU-TSHIRT-SLIM"
        }
      },
      {
        "id": "guide_kurta",
        "title": "Add a measurement guide for kurta",
        "detail": "35% of kurta recommendations have low confidence (< 0.50). Adding a measurement guide will improve customer sizing precision.",
        "impact": "Medium",
        "target": {
          "route": "/products"
        }
      },
      {
        "id": "brand_LondonDenim",
        "title": "Review inconsistent size labels for LondonDenim",
        "detail": "LondonDenim has 2 products flagged with size discrepancies. Consider reviewing sizing consistency across this brand.",
        "impact": "Medium",
        "target": {
          "route": "/chart-doctor"
        }
      }
    ]
  }
  ```

### 4.12 GET /api/chart-doctor/analysis?sku=
Evaluates size discrepancies for a flagged product and computes suggested range shifts.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Query Parameters**:
  - `sku` (string, required)
- **Response Body** (`200 OK`):
  ```json
  {
    "sku": "SKU-TSHIRT-SLIM",
    "category": "tshirt",
    "sizeChart": [
      { "size": "M", "chest": [90, 95], "waist": [76, 81] }
    ],
    "issues": [
      "38% of size M orders were returned as too small. Consider sizing the chart up or adding a note."
    ],
    "suggestedFix": {
      "summary": "Shift size M ranges down by 2 cm.",
      "changes": [
        { "size": "M", "field": "chest", "from": [90, 95], "to": [88, 93] },
        { "size": "M", "field": "waist", "from": [76, 81], "to": [74, 79] }
      ]
    }
  }
  ```

### 4.13 POST /api/chart-doctor/apply
Validates and applies adjusted size chart ranges, updating `Product.sizeChart` and removing resolved flags.

- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Request Body**:
  ```json
  {
    "sku": "SKU-TSHIRT-SLIM",
    "changes": [
      { "size": "M", "field": "chest", "to": [88, 93] },
      { "size": "M", "field": "waist", "to": [74, 79] }
    ]
  }
  ```
- **Response Body** (`200 OK`):
  ```json
  {
    "sku": "SKU-TSHIRT-SLIM",
    "sizeChart": [
      { "size": "M", "chest": [88, 93], "waist": [74, 79] }
    ]
  }
  ```

### 4.14 GET /api/chart-doctor/flags
Retrieves products flagged by Chart Doctor due to high size-related return rates.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Response Body** (`200 OK`):
  ```json
  {
    "flags": [
      {
        "sku": "SKU-1042",
        "size": "M",
        "direction": "runs_small",
        "sampleSize": 45,
        "returnShare": 0.32,
        "suggestedFix": "Increase M chest range min and max by 2 cm or shift recommendation bias to +1",
        "updatedAt": "2026-10-11T02:00:00.000Z"
      }
    ]
  }
  ```

### 4.15 POST /internal/chart-doctor/run
Triggers the Chart Doctor aggregation algorithm. Called by scheduled GitHub Actions cron.

- **Headers**:
  - `Content-Type: application/json`
  - `x-internal-key: <INTERNAL_KEY>`
- **Response Body** (`200 OK`):
  ```json
  {
    "flagged": 3
  }
  ```

### 4.16 GET /api/store
Fetches current store configuration and metadata.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Response Body** (`200 OK`):
  ```json
  {
    "name": "FitWise Flagship Store",
    "ownerName": "Demo Owner",
    "website": "https://demo.fitwise.store",
    "productCount": 8,
    "createdAt": "2026-10-01T00:00:00.000Z"
  }
  ```

### 4.17 PUT /api/store
Updates store configuration.

- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Request Body**:
  ```json
  {
    "name": "UrbanStyle Boutique",
    "ownerName": "Alex Morgan",
    "website": "https://urbanstyle.example.com"
  }
  ```
- **Response Body** (`200 OK`):
  ```json
  {
    "name": "UrbanStyle Boutique",
    "ownerName": "Alex Morgan",
    "website": "https://urbanstyle.example.com",
    "productCount": 8,
    "createdAt": "2026-10-01T00:00:00.000Z"
  }
  ```

### 4.18 GET /health
Health check endpoint.

- **Headers**: None required.
- **Response Body** (`200 OK`):
  ```json
  {
    "status": "ok"
  }
  ```

---

## 5. COMMUNITY & JOURNALS API (Store Owner Authored)

All community and journal endpoints require **Secret Key** authentication (`x-api-key: <secret_key>`). Content is authored by the store owner.

### 5.1 GET /api/community/groups?tab=discover|mine
Lists community groups filtered by membership status.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Query Parameters**:
  - `tab`: `"discover"` (unjoined groups) | `"mine"` (joined groups) (optional, returns all if omitted)
- **Response Body** (`200 OK`):
  ```json
  [
    {
      "_id": "6708f12a3b04c81a2f9011ab",
      "name": "Denim Enthusiasts & Fit Guide",
      "description": "Generic discussion group for denim cut comparisons, waist rise measurements, and shrink-to-fit sizing advice.",
      "category": "jeans",
      "memberCount": 142,
      "imageUrl": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800",
      "joined": false,
      "isDemo": true,
      "createdAt": "2026-10-11T12:00:00.000Z",
      "updatedAt": "2026-10-11T12:00:00.000Z"
    }
  ]
  ```

### 5.2 POST /api/community/groups
Creates a new community group authored by the store owner.

- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Request Body**:
  ```json
  {
    "name": "Curvy & Petite Tailoring",
    "description": "Community group discussing waist alterations and petite inseams.",
    "category": "general",
    "imageUrl": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800",
    "joined": true
  }
  ```
- **Response Body** (`201 Created`):
  ```json
  {
    "_id": "6708f12a3b04c81a2f9011cc",
    "name": "Curvy & Petite Tailoring",
    "description": "Community group discussing waist alterations and petite inseams.",
    "category": "general",
    "memberCount": 1,
    "imageUrl": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800",
    "joined": true,
    "isDemo": false,
    "createdAt": "2026-10-11T14:00:00.000Z"
  }
  ```

### 5.3 POST /api/community/groups/:id/join
Joins a community group, setting `joined = true` and incrementing `memberCount`.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Response Body** (`200 OK`):
  ```json
  {
    "_id": "6708f12a3b04c81a2f9011ab",
    "name": "Denim Enthusiasts & Fit Guide",
    "joined": true,
    "memberCount": 143
  }
  ```

### 5.4 POST /api/community/groups/:id/leave
Leaves a community group, setting `joined = false` and decrementing `memberCount`.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Response Body** (`200 OK`):
  ```json
  {
    "_id": "6708f12a3b04c81a2f9011ab",
    "name": "Denim Enthusiasts & Fit Guide",
    "joined": false,
    "memberCount": 142
  }
  ```

### 5.5 GET /api/journals?filter=all|mine&q=
Lists journal articles with author filtering and keyword search across title, body, excerpt, or tags.

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Query Parameters**:
  - `filter`: `"all"` | `"mine"` (default `"all"`)
  - `q`: search string (case-insensitive)
- **Response Body** (`200 OK`):
  ```json
  [
    {
      "_id": "6708f12a3b04c81a2f9012dd",
      "title": "5 Simple Adjustments That Reduced Our Return Rate by 12%",
      "body": "By analyzing return reason feedback from shoppers citing 'too small'...",
      "excerpt": "Generic notes from store operations on updating product descriptions...",
      "authorName": "Riya Jayaswal",
      "tags": ["returns", "chart-doctor", "case-study"],
      "likes": 48,
      "liked": true,
      "createdAt": "2026-10-06T12:00:00.000Z",
      "isDemo": true
    }
  ]
  ```

### 5.6 POST /api/journals
Creates a new journal article authored by the store owner.

- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Request Body**:
  ```json
  {
    "title": "Autumn Layering & Shoulder Sizing Notes",
    "body": "As temperatures cool, shoppers layer jackets over thick knits...",
    "excerpt": "Quick guide on why chest and shoulder tolerances shift in autumn.",
    "tags": ["layering", "outerwear", "sizing"]
  }
  ```
- **Response Body** (`201 Created`):
  ```json
  {
    "_id": "6708f12a3b04c81a2f9013ee",
    "title": "Autumn Layering & Shoulder Sizing Notes",
    "body": "As temperatures cool, shoppers layer jackets over thick knits...",
    "excerpt": "Quick guide on why chest and shoulder tolerances shift in autumn.",
    "authorName": "Riya Jayaswal",
    "tags": ["layering", "outerwear", "sizing"],
    "likes": 0,
    "liked": false,
    "createdAt": "2026-10-11T14:30:00.000Z",
    "isDemo": false
  }
  ```

### 5.7 POST /api/journals/:id/like
Toggles the `liked` state on a journal article (increments/decrements `likes` count).

- **Headers**:
  - `x-api-key: <secret_key>` (Dashboard key only)
- **Response Body** (`200 OK`):
  ```json
  {
    "_id": "6708f12a3b04c81a2f9013ee",
    "likes": 1,
    "liked": true
  }
  ```

