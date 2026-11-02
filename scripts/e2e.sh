#!/usr/bin/env bash
# ==============================================================================
# FitWise End-to-End API Verification Script
# Executes the complete customer and merchant journey using curl.
# ==============================================================================

set -eo pipefail

# Configuration with environment variable overrides
API_URL="${API_URL:-http://localhost:5000}"
PUBLISHABLE_KEY="${PUBLISHABLE_KEY:-fw_pub_demo_984f1a23c7e0}"
SECRET_KEY="${SECRET_KEY:-fw_sec_demo_a41b89c372ef}"
INTERNAL_KEY="${INTERNAL_KEY:-dev-internal-key-secret-123}"
PRODUCT_ID="${PRODUCT_ID:-SKU-TSHIRT-CLASSIC}"
EXPERIMENT_ID="${EXPERIMENT_ID:-exp_fitwise_ab_01}"
VISITOR_ID="visitor_e2e_$(date +%s)_$RANDOM"

# ANSI Color formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_step() {
  echo -e "\n${BLUE}======================================================================${NC}"
  echo -e "${CYAN}▶ STEP $1: $2${NC}"
  echo -e "${BLUE}======================================================================${NC}"
}

print_json() {
  if command -v jq >/dev/null 2>&1; then
    echo "$1" | jq .
  elif command -v python3 >/dev/null 2>&1; then
    echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
  elif command -v python >/dev/null 2>&1; then
    echo "$1" | python -m json.tool 2>/dev/null || echo "$1"
  else
    echo "$1"
  fi
}

echo -e "${GREEN}🚀 Starting FitWise E2E Verification Workflow...${NC}"
echo -e "   API Base URL    : ${YELLOW}${API_URL}${NC}"
echo -e "   Visitor ID      : ${YELLOW}${VISITOR_ID}${NC}"
echo -e "   Product SKU     : ${YELLOW}${PRODUCT_ID}${NC}"
echo -e "   Publishable Key : ${YELLOW}${PUBLISHABLE_KEY:0:15}...${NC}"
echo -e "   Secret Key      : ${YELLOW}${SECRET_KEY:0:15}...${NC}"

# ------------------------------------------------------------------------------
# STEP 1: Assign Visitor to A/B Experiment Variant
# ------------------------------------------------------------------------------
print_step "1" "Assign Visitor to A/B Experiment (GET /api/experiments/assign)"
ASSIGN_RESPONSE=$(curl -s -f -X GET "${API_URL}/api/experiments/assign?visitorId=${VISITOR_ID}" \
  -H "x-api-key: ${PUBLISHABLE_KEY}")

print_json "${ASSIGN_RESPONSE}"

# Extract variant (default to treatment if parse fails)
VARIANT=$(echo "${ASSIGN_RESPONSE}" | grep -o '"variant":"[^"]*"' | cut -d'"' -f4 || echo "treatment")
[ -z "$VARIANT" ] && VARIANT="treatment"
echo -e "${GREEN}✔ Assigned Variant: ${YELLOW}${VARIANT}${NC}"

# ------------------------------------------------------------------------------
# STEP 2: Fetch Product Size Chart
# ------------------------------------------------------------------------------
print_step "2" "Fetch Product Size Chart (GET /api/products/${PRODUCT_ID}/sizechart)"
CHART_RESPONSE=$(curl -s -f -X GET "${API_URL}/api/products/${PRODUCT_ID}/sizechart" \
  -H "x-api-key: ${PUBLISHABLE_KEY}")

print_json "${CHART_RESPONSE}"
echo -e "${GREEN}✔ Size chart retrieved successfully.${NC}"

# ------------------------------------------------------------------------------
# STEP 3: Request Size Recommendation (Invokes ML Microservice)
# ------------------------------------------------------------------------------
print_step "3" "Request Size Recommendation (POST /api/recommend)"
RECOMMEND_PAYLOAD=$(cat <<EOF
{
  "productId": "${PRODUCT_ID}",
  "visitorId": "${VISITOR_ID}",
  "region": "US",
  "measurements": {
    "height_cm": 178,
    "weight_kg": 74,
    "chest_cm": 97,
    "waist_cm": 83
  }
}
EOF
)

REC_RESPONSE=$(curl -s -f -X POST "${API_URL}/api/recommend" \
  -H "x-api-key: ${PUBLISHABLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "${RECOMMEND_PAYLOAD}")

print_json "${REC_RESPONSE}"
echo -e "${GREEN}✔ Size recommendation generated.${NC}"

# ------------------------------------------------------------------------------
# STEP 4: Post Customer Interaction Events
# ------------------------------------------------------------------------------
print_step "4" "Post Customer Interaction Events (POST /api/events)"

echo -e "${YELLOW}Logging event: widget_shown...${NC}"
curl -s -f -X POST "${API_URL}/api/events" \
  -H "x-api-key: ${PUBLISHABLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "visitorId": "'"${VISITOR_ID}"'", "variant": "'"${VARIANT}"'", "type": "widget_shown", "sku": "'"${PRODUCT_ID}"'" }' \
  | print_json

echo -e "${YELLOW}Logging event: add_to_cart...${NC}"
curl -s -f -X POST "${API_URL}/api/events" \
  -H "x-api-key: ${PUBLISHABLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "visitorId": "'"${VISITOR_ID}"'", "variant": "'"${VARIANT}"'", "type": "add_to_cart", "sku": "'"${PRODUCT_ID}"'" }' \
  | print_json

echo -e "${YELLOW}Logging event: purchase...${NC}"
curl -s -f -X POST "${API_URL}/api/events" \
  -H "x-api-key: ${PUBLISHABLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "visitorId": "'"${VISITOR_ID}"'", "variant": "'"${VARIANT}"'", "type": "purchase", "sku": "'"${PRODUCT_ID}"'" }' \
  | print_json

echo -e "${GREEN}✔ Customer interaction events recorded.${NC}"

# ------------------------------------------------------------------------------
# STEP 5: Post Purchase Feedback with Return Reasons
# ------------------------------------------------------------------------------
print_step "5" "Post Purchase Feedback (POST /api/feedback)"
FEEDBACK_PAYLOAD=$(cat <<EOF
{
  "productId": "${PRODUCT_ID}",
  "sizeBought": "M",
  "kept": false,
  "returnReason": "too_small"
}
EOF
)

FEEDBACK_RESPONSE=$(curl -s -f -X POST "${API_URL}/api/feedback" \
  -H "x-api-key: ${PUBLISHABLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "${FEEDBACK_PAYLOAD}")

print_json "${FEEDBACK_RESPONSE}"
echo -e "${GREEN}✔ Purchase return feedback recorded.${NC}"

# ------------------------------------------------------------------------------
# STEP 6: Run Chart Doctor Diagnostic Aggregation (Internal Key Protected)
# ------------------------------------------------------------------------------
print_step "6" "Run Chart Doctor Diagnostic (POST /internal/chart-doctor/run)"
CD_RESPONSE=$(curl -s -f -X POST "${API_URL}/internal/chart-doctor/run" \
  -H "x-internal-key: ${INTERNAL_KEY}" \
  -H "Content-Type: application/json")

print_json "${CD_RESPONSE}"
echo -e "${GREEN}✔ Chart Doctor aggregation run completed.${NC}"

# ------------------------------------------------------------------------------
# STEP 7: Fetch Chart Doctor Diagnostic Flags (Secret Key Protected)
# ------------------------------------------------------------------------------
print_step "7" "Retrieve Chart Doctor Flags (GET /api/chart-doctor/flags)"
FLAGS_RESPONSE=$(curl -s -f -X GET "${API_URL}/api/chart-doctor/flags" \
  -H "x-api-key: ${SECRET_KEY}")

print_json "${FLAGS_RESPONSE}"
echo -e "${GREEN}✔ Chart Doctor flags retrieved.${NC}"

# ------------------------------------------------------------------------------
# STEP 8: Fetch Analytics Summary (Secret Key Protected)
# ------------------------------------------------------------------------------
print_step "8" "Retrieve Analytics Summary (GET /api/analytics/summary)"
ANALYTICS_RESPONSE=$(curl -s -f -X GET "${API_URL}/api/analytics/summary" \
  -H "x-api-key: ${SECRET_KEY}")

print_json "${ANALYTICS_RESPONSE}"
echo -e "${GREEN}✔ Store analytics summary retrieved.${NC}"

# ------------------------------------------------------------------------------
# STEP 9: Fetch A/B Experiment Statistical Results (Secret Key Protected)
# ------------------------------------------------------------------------------
print_step "9" "Retrieve Experiment Results (GET /api/experiments/${EXPERIMENT_ID}/results)"
RESULTS_RESPONSE=$(curl -s -f -X GET "${API_URL}/api/experiments/${EXPERIMENT_ID}/results" \
  -H "x-api-key: ${SECRET_KEY}")

print_json "${RESULTS_RESPONSE}"
echo -e "${GREEN}✔ A/B experiment evaluation results retrieved.${NC}"

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}✨ FitWise E2E Verification Completed Successfully!${NC}"
echo -e "${GREEN}======================================================================${NC}"
