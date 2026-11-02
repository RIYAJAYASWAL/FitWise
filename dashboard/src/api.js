/**
 * FitWise Dashboard API Client
 * Reads VITE_API_URL and attaches the secret key from sessionStorage.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getSecretKey = () => {
  return sessionStorage.getItem("fitwise_secret_key") || "";
};

export const setSecretKey = (key) => {
  if (key) {
    sessionStorage.setItem("fitwise_secret_key", key);
  } else {
    sessionStorage.removeItem("fitwise_secret_key");
  }
};

export const clearSecretKey = () => {
  sessionStorage.removeItem("fitwise_secret_key");
};

async function request(endpoint, options = {}, overrideKey = null) {
  const key = overrideKey !== null ? overrideKey : getSecretKey();
  const headers = {
    "Content-Type": "application/json",
    ...(key ? { "x-api-key": key } : {}),
    ...(options.headers || {}),
  };

  const url = `${API_BASE.replace(/\/$/, "")}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorObj = data.error || {
        code: res.status === 401 ? "UNAUTHORIZED" : "ERROR",
        message: data.message || `Request failed with status ${res.status}`,
      };
      const error = new Error(errorObj.message);
      error.status = res.status;
      error.code = errorObj.code;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      const netError = new Error("Unable to connect to FitWise server. Please check your backend.");
      netError.status = 503;
      netError.code = "NETWORK_ERROR";
      throw netError;
    }
    throw err;
  }
}

export const api = {
  // Store & Auth
  getStore: (key = null) => request("/api/store", { method: "GET" }, key),
  updateStore: (body) => request("/api/store", { method: "PUT", body: JSON.stringify(body) }),

  // Analytics
  getAnalyticsSummary: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/analytics/summary${qs}`);
  },

  getAnalyticsTrend: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/analytics/trend${qs}`);
  },

  // Recommendations
  getRecommendations: ({ status = "all", page = 1, limit = 20, days = 0 } = {}) => {
    const params = new URLSearchParams({ status, page: String(page), limit: String(limit) });
    if (days > 0) params.set("days", String(days));
    return request(`/api/recommendations?${params.toString()}`);
  },
  updateRecommendationStatus: (id, status) =>
    request(`/api/recommendations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Suggestions
  getSuggestions: () => request("/api/suggestions"),

  // Products
  getProducts: () => request("/api/products"),
  getProductSizeChart: (sku) => request(`/api/products/${encodeURIComponent(sku)}/sizechart`),

  // Chart Doctor
  getChartFlags: (sku) => {
    const qs = sku ? `?sku=${encodeURIComponent(sku)}` : "";
    return request(`/api/chart-doctor/flags${qs}`);
  },
  getChartAnalysis: (sku) => request(`/api/chart-doctor/analysis?sku=${encodeURIComponent(sku)}`),
  applyChartFix: (body) => request("/api/chart-doctor/apply", { method: "POST", body: JSON.stringify(body) }),

  // Experiments
  getExperiments: ({ status, q } = {}) => {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (q) params.set("q", q);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/experiments${qs}`);
  },
  createExperiment: (body) =>
    request("/api/experiments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateExperimentStatus: (id, status) =>
    request(`/api/experiments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getExperimentResults: (id) => request(`/api/experiments/${encodeURIComponent(id)}/results`),

  // Community Groups
  getCommunityGroups: (tab = null) => {
    const qs = tab ? `?tab=${encodeURIComponent(tab)}` : "";
    return request(`/api/community/groups${qs}`);
  },
  createCommunityGroup: (body) =>
    request("/api/community/groups", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  joinCommunityGroup: (id) =>
    request(`/api/community/groups/${encodeURIComponent(id)}/join`, {
      method: "POST",
    }),
  leaveCommunityGroup: (id) =>
    request(`/api/community/groups/${encodeURIComponent(id)}/leave`, {
      method: "POST",
    }),

  // Journals
  getJournals: ({ filter = "all", q = "" } = {}) => {
    const params = new URLSearchParams();
    if (filter) params.append("filter", filter);
    if (q) params.append("q", q);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/journals${qs}`);
  },
  createJournal: (body) =>
    request("/api/journals", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  likeJournal: (id) =>
    request(`/api/journals/${encodeURIComponent(id)}/like`, {
      method: "POST",
    }),
};

export default api;
