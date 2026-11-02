import { useState, useEffect, useCallback } from 'react';
import { getSizeChart } from '../api/client';

/**
 * Hook to fetch and cache product size chart details.
 */
export function useSizeChart(apiUrl, apiKey, productId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadChart = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getSizeChart(productId, { apiUrl, apiKey });
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load size chart.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, apiKey, productId]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  return {
    product: data,
    category: data?.category || 'tshirt',
    region: data?.region || 'US',
    brand: data?.brand || '',
    sizeChart: data?.sizeChart || [],
    loading,
    error,
    refetch: loadChart,
  };
}
