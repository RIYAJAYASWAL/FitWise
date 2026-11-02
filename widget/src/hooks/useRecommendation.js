import { useState, useCallback } from 'react';
import { getRecommendation, trackEvent } from '../api/client';

/**
 * Hook to manage size recommendation requests and response state.
 */
export function useRecommendation(apiUrl, apiKey, productId, visitorId, variant) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestFit = useCallback(async (measurements, region) => {
    if (!apiUrl || !apiKey || !productId) return;
    setLoading(true);
    setError(null);

    // Track recommendation requested event
    trackEvent(apiUrl, apiKey, {
      visitorId,
      variant,
      type: 'recommend_requested',
      sku: productId,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    try {
      const res = await getRecommendation(apiUrl, apiKey, {
        productId,
        measurements,
        visitorId,
        region,
      });
      setRecommendation(res);
      return res;
    } catch (err) {
      setError(err.message || 'Unable to calculate recommendation.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiUrl, apiKey, productId, visitorId, variant]);

  const reset = useCallback(() => {
    setRecommendation(null);
    setError(null);
  }, []);

  return {
    recommendation,
    loading,
    error,
    requestFit,
    reset,
  };
}
