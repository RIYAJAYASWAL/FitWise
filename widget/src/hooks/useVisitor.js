import { useState, useEffect, useRef } from 'react';
import { fetchVariant, trackEvent } from '../api/client';

const VISITOR_STORAGE_KEY = 'fitwise_visitor_id';

/**
 * Hook to manage persistent visitor ID and A/B test variant assignment.
 */
export function useVisitor(apiUrl, apiKey, productId) {
  const [visitorId] = useState(() => {
    try {
      let id = localStorage.getItem(VISITOR_STORAGE_KEY);
      if (!id) {
        id = `vis_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(VISITOR_STORAGE_KEY, id);
      }
      return id;
    } catch {
      return `vis_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    }
  });

  const [variant, setVariant] = useState('treatment'); // default to treatment
  const [experimentId, setExperimentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const widgetShownLogged = useRef(false);

  useEffect(() => {
    let isMounted = true;
    async function initVisitor() {
      if (!apiUrl || !apiKey) return;
      try {
        const res = await fetchVariant(apiUrl, apiKey, visitorId);
        if (isMounted && res) {
          setVariant(res.variant || 'treatment');
          setExperimentId(res.experimentId || null);
        }
      } catch (err) {
        // Fallback to treatment if no active experiment
        if (isMounted) setVariant('treatment');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    initVisitor();
    return () => { isMounted = false; };
  }, [apiUrl, apiKey, visitorId]);

  // Log widget_shown event once variant is resolved
  useEffect(() => {
    if (!loading && apiUrl && apiKey && productId && !widgetShownLogged.current) {
      widgetShownLogged.current = true;
      trackEvent(apiUrl, apiKey, {
        visitorId,
        variant,
        type: 'widget_shown',
        sku: productId,
        timestamp: new Date().toISOString(),
      }).catch((err) => {
        console.debug('FitWise: widget_shown event tracking failed', err);
      });
    }
  }, [loading, apiUrl, apiKey, productId, visitorId, variant]);

  return { visitorId, variant, experimentId, loading };
}
