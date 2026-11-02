/**
 * FitWise Widget API Client
 *
 * Handles HTTP requests to the FitWise API:
 * - getSizeChart(productId)
 * - assign(visitorId)
 * - recommend(body)
 * - sendEvent(event)
 *
 * Config is passed at mount (via configureClient / setConfig).
 * Errors are strictly normalized to the contract format: { error: { code, message } }.
 * If a request takes longer than 5 seconds, an onSlow callback is triggered.
 */

// Global client configuration set at widget mount
let globalConfig = {
  apiUrl: 'http://localhost:5000',
  apiKey: '',
  onSlow: null,
};

/**
 * Configure API client with mount options.
 * @param {Object} config - { apiUrl, apiKey, onSlow }
 */
export function configureClient(config = {}) {
  globalConfig = {
    ...globalConfig,
    ...config,
  };
  return { ...globalConfig };
}

export function setConfig(config = {}) {
  return configureClient(config);
}

export function getConfig() {
  return { ...globalConfig };
}

/**
 * Normalizes any error object, status, or response body into the contract format:
 * { error: { code: string, message: string } }
 */
export function normalizeError(err, status = 500) {
  if (err?.error?.code && err?.error?.message) {
    return {
      error: {
        code: String(err.error.code),
        message: String(err.error.message),
      },
    };
  }

  // Derive standard contract error code from HTTP status if missing
  let code = err?.code;
  if (!code) {
    switch (status) {
      case 400:
        code = 'BAD_REQUEST';
        break;
      case 401:
        code = 'UNAUTHORIZED';
        break;
      case 403:
        code = 'FORBIDDEN';
        break;
      case 404:
        code = 'NOT_FOUND';
        break;
      case 503:
      case 502:
      case 504:
        code = 'SERVICE_UNAVAILABLE';
        break;
      default:
        code = 'INTERNAL_ERROR';
    }
  }

  const message = err?.message || err?.error || 'An unexpected error occurred';
  return {
    error: {
      code: String(code),
      message: String(message),
    },
  };
}

/**
 * Core HTTP request handler.
 * Handles:
 * - apiUrl and apiKey resolution
 * - x-api-key header
 * - 5-second onSlow timeout
 * - Contract error normalization
 */
async function apiRequest(path, fetchOptions = {}, requestOptions = {}) {
  const apiUrl = (requestOptions.apiUrl || globalConfig.apiUrl || 'http://localhost:5000').replace(/\/+$/, '');
  const apiKey = requestOptions.apiKey !== undefined ? requestOptions.apiKey : globalConfig.apiKey;
  const onSlow = requestOptions.onSlow !== undefined ? requestOptions.onSlow : globalConfig.onSlow;

  if (apiKey && typeof apiKey === 'string' && apiKey.startsWith('fw_sec_')) {
    console.error('FitWise Security Violation: Secret keys must NEVER be exposed in the frontend widget. Use fw_pub_...');
  }

  const url = `${apiUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = {
    Accept: 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
    ...(fetchOptions.headers || {}),
  };

  let timer = null;
  let isSlow = false;

  if (typeof onSlow === 'function') {
    timer = setTimeout(() => {
      isSlow = true;
      try {
        onSlow(true);
      } catch (e) {
        console.warn('FitWise: error in onSlow callback', e);
      }
    }, 5000);
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const contentType = response.headers?.get?.('content-type') || '';
    let data = {};
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = {};
      }
    } else {
      const text = await response.text().catch(() => '');
      if (text) data = { message: text };
    }

    if (!response.ok) {
      const contractError = normalizeError(data, response.status);
      const errorObj = new Error(contractError.error.message);
      errorObj.code = contractError.error.code;
      errorObj.error = contractError.error;
      errorObj.status = response.status;
      errorObj.data = data;
      throw errorObj;
    }

    return data;
  } catch (err) {
    if (err.error?.code && err.error?.message) {
      throw err;
    }
    // Network / fetch thrown error (e.g. server down, offline, abort)
    const contractError = normalizeError(err, 503);
    const errorObj = new Error(contractError.error.message);
    errorObj.code = contractError.error.code;
    errorObj.error = contractError.error;
    errorObj.status = 503;
    throw errorObj;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    if (isSlow && typeof onSlow === 'function') {
      try {
        onSlow(false);
      } catch (e) {
        // ignore
      }
    }
  }
}

/**
 * Fetches the size chart for a given product SKU.
 * GET /api/products/:id/sizechart
 *
 * @param {string} productId - Product SKU
 * @param {Object} [options] - Optional overrides { apiUrl, apiKey, onSlow }
 */
export async function getSizeChart(productId, options = {}) {
  if (!productId) {
    const contractError = normalizeError({ code: 'BAD_REQUEST', message: 'productId is required' }, 400);
    const err = new Error(contractError.error.message);
    err.code = contractError.error.code;
    err.error = contractError.error;
    throw err;
  }
  return apiRequest(`/api/products/${encodeURIComponent(productId)}/sizechart`, { method: 'GET' }, options);
}

/**
 * Assigns an anonymous visitor to an A/B experiment variant.
 * GET /api/experiments/assign?visitorId=...
 *
 * @param {string} visitorId - Anonymous visitor ID
 * @param {Object} [options] - Optional overrides { apiUrl, apiKey, onSlow }
 */
export async function assign(visitorId, options = {}) {
  if (!visitorId) {
    const contractError = normalizeError({ code: 'BAD_REQUEST', message: 'visitorId is required' }, 400);
    const err = new Error(contractError.error.message);
    err.code = contractError.error.code;
    err.error = contractError.error;
    throw err;
  }
  return apiRequest(`/api/experiments/assign?visitorId=${encodeURIComponent(visitorId)}`, { method: 'GET' }, options);
}

/**
 * Submits shopper measurements to receive an AI size recommendation.
 * POST /api/recommend
 *
 * @param {Object} body - Request payload { productId, measurements, visitorId, region, userId }
 * @param {Object} [options] - Optional overrides { apiUrl, apiKey, onSlow }
 */
export async function recommend(body = {}, options = {}) {
  return apiRequest(
    '/api/recommend',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    options
  );
}

/**
 * Sends a customer interaction event for A/B testing and analytics.
 * POST /api/events
 *
 * @param {Object} event - Event payload { visitorId, variant, type, sku, timestamp }
 * @param {Object} [options] - Optional overrides { apiUrl, apiKey, onSlow }
 */
export async function sendEvent(event = {}, options = {}) {
  return apiRequest(
    '/api/events',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    },
    options
  );
}

/**
 * Submits post-purchase fit outcome feedback.
 * POST /api/feedback
 *
 * @param {Object} feedbackData - { productId, sizeBought, kept, returnReason, userId }
 * @param {Object} [options] - Optional overrides { apiUrl, apiKey, onSlow }
 */
export async function submitFeedback(feedbackData = {}, options = {}) {
  // Support both submitFeedback(payload, { apiUrl, apiKey }) and submitFeedback(apiUrl, apiKey, payload)
  if (typeof feedbackData === 'string' && typeof options === 'string' && arguments[2]) {
    return apiRequest(
      '/api/feedback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arguments[2]),
      },
      { apiUrl: feedbackData, apiKey: options }
    );
  }

  return apiRequest(
    '/api/feedback',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData),
    },
    options
  );
}

// Aliases for compatibility
export const fetchSizeChart = getSizeChart;
export const fetchVariant = assign;
export const getRecommendation = recommend;
export const trackEvent = sendEvent;
