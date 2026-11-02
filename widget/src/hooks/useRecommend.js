import { useState, useCallback } from 'react';
import { recommend as recommendApi } from '../api/client';

/**
 * useRecommend hook:
 * Manages loading, error, result, and slow states and calls recommend(body).
 *
 * @param {Object} [options] - Optional default options { apiUrl, apiKey, onSlow }
 * @returns {{
 *   loading: boolean,
 *   error: { code: string, message: string } | null,
 *   result: Object | null,
 *   slow: boolean,
 *   recommend: (body: Object, requestOptions?: Object) => Promise<Object>,
 *   reset: () => void,
 *   recommendation: Object | null
 * }}
 */
export function useRecommend(options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [slow, setSlow] = useState(false);

  const recommend = useCallback(
    async (body, requestOptions = {}) => {
      setLoading(true);
      setError(null);
      setSlow(false);

      try {
        const response = await recommendApi(body, {
          ...options,
          ...requestOptions,
          onSlow: (isSlow) => {
            setSlow(isSlow !== false);
            if (typeof options?.onSlow === 'function') {
              options.onSlow(isSlow);
            }
            if (typeof requestOptions?.onSlow === 'function') {
              requestOptions.onSlow(isSlow);
            }
          },
        });

        setResult(response);
        setSlow(false);
        return response;
      } catch (err) {
        const normalized = err.error
          ? err.error
          : { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Request failed' };
        setError(normalized);
        setResult(null);
        setSlow(false);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
    setSlow(false);
  }, []);

  return {
    loading,
    error,
    result,
    slow,
    recommend,
    reset,
    recommendation: result, // Convenience alias for components
  };
}

export default useRecommend;
