import { useState, useEffect } from 'react';
import { assign } from '../api/client';

const VISITOR_ID_STORAGE_KEY = 'fitwise_visitor_id';

/**
 * Checks for a forced variant override via query param ?fitwise_variant=control|treatment
 */
export function getForcedVariant() {
  if (typeof window !== 'undefined' && window.location?.search) {
    try {
      const params = new URLSearchParams(window.location.search);
      const forced = params.get('fitwise_variant');
      if (forced === 'control' || forced === 'treatment') {
        return forced;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Safely retrieves or generates an anonymous visitor ID from localStorage.
 */
export function getOrCreateVisitorId() {
  let id = null;
  try {
    id = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  } catch {
    // localStorage may be disabled or restricted in private browsing
  }

  if (!id) {
    id = `vis_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
    try {
      localStorage.setItem(VISITOR_ID_STORAGE_KEY, id);
    } catch {
      // localStorage write failure is safely ignored
    }
  }

  return id;
}

/**
 * useExperiment hook:
 * - Creates an anonymous visitorId (random, kept in localStorage inside try/catch)
 * - Supports ?fitwise_variant query param for forced testing
 * - Calls assign(visitorId)
 * - Returns { variant, loading }
 *
 * @param {Object} [options] - Optional overrides { apiUrl, apiKey, onSlow, forcedVariant }
 * @returns {{ variant: string, loading: boolean, visitorId: string }}
 */
export function useExperiment(options = {}) {
  const forced = getForcedVariant() || options.forcedVariant;
  const [visitorId] = useState(getOrCreateVisitorId);
  const [variant, setVariant] = useState(forced || 'control');
  const [loading, setLoading] = useState(!forced);

  useEffect(() => {
    if (forced) {
      setVariant(forced);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function runAssignment() {
      setLoading(true);
      try {
        const res = await assign(visitorId, options);
        if (isMounted) {
          setVariant(res?.variant || 'control');
        }
      } catch {
        if (isMounted) {
          setVariant('control');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    runAssignment();

    return () => {
      isMounted = false;
    };
  }, [visitorId, forced]);

  return { variant, loading, visitorId };
}

export default useExperiment;
