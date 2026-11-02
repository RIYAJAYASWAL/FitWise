import React, { useState, useEffect, useRef } from 'react';
import { useExperiment } from './hooks/useExperiment';
import { useRecommend } from './hooks/useRecommend';
import { useSizeChart } from './hooks/useSizeChart';
import { sendEvent } from './api/client';
import { FitButton } from './components/FitButton';
import { FitModal } from './components/FitModal';
import { SizeForm } from './components/SizeForm';
import { Result } from './components/Result';
import { AlertCircleIcon } from './components/Icons';

/**
 * FitWise Widget Main App Component
 *
 * Requirements:
 * - App.jsx: use useExperiment; send widget_shown for every visitor;
 * - "control" renders nothing;
 * - "treatment" shows a "Find my size" button -> SizeForm -> Result with WhyThisSize;
 * - send recommend_requested on submit.
 * - While a request is slow show "Waking up the server, this can take up to a minute...".
 */
export function App({
  productId,
  apiUrl = 'http://localhost:5000',
  apiKey = '',
  forcedVariant = null,
  inline = false,
  defaultOpen = false,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(defaultOpen);

  // Hook 1: A/B test experiment assignment & anonymous visitor tracking
  const { visitorId, variant, loading: experimentLoading } = useExperiment({
    apiUrl,
    apiKey,
    forcedVariant,
  });

  // Hook 2: Product size chart metadata
  const { product, category, region } = useSizeChart(apiUrl, apiKey, productId);

  // Hook 3: ML size recommendation & slow state management
  const {
    loading: calcLoading,
    error: calcError,
    result: recommendation,
    slow: isSlow,
    recommend,
    reset: resetRecommendation,
  } = useRecommend({ apiUrl, apiKey });

  // Expose current context to window.FitWise for window.FitWise.track()
  useEffect(() => {
    if (typeof window !== 'undefined' && window.FitWise) {
      if (visitorId) window.FitWise._currentVisitorId = visitorId;
      if (variant) {
        window.FitWise._currentVariant = variant;
        try {
          localStorage.setItem('fitwise_variant', variant);
        } catch {
          // ignore
        }
      }
      if (productId) window.FitWise._currentSku = productId;
    }
  }, [visitorId, variant, productId]);

  // Send widget_shown for every visitor once variant is determined
  const lastShownSkuRef = useRef(null);
  useEffect(() => {
    if (!experimentLoading && variant && visitorId && productId && apiUrl && apiKey) {
      if (lastShownSkuRef.current !== productId) {
        lastShownSkuRef.current = productId;
        sendEvent(
          {
            visitorId,
            variant,
            type: 'widget_shown',
            sku: productId,
            timestamp: new Date().toISOString(),
          },
          { apiUrl, apiKey }
        ).catch(() => {});
      }
    }
  }, [experimentLoading, variant, visitorId, productId, apiUrl, apiKey]);

  // While resolving assignment or if visitor is in "control" variant, render nothing
  if (experimentLoading || variant === 'control') {
    return null;
  }

  // Treatment variant:
  // "treatment" shows a "Find my size" button -> SizeForm -> Result with WhyThisSize
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setInlineOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCalculate = async (measurements, targetRegion) => {
    // Send recommend_requested on submit
    sendEvent(
      {
        visitorId,
        variant,
        type: 'recommend_requested',
        sku: productId,
        timestamp: new Date().toISOString(),
      },
      { apiUrl, apiKey }
    ).catch(() => {});

    return recommend({
      productId,
      measurements,
      visitorId,
      region: targetRegion || region,
    });
  };

  // Inline mode rendering (if requested via prop)
  if (inline) {
    if (!inlineOpen && !recommendation) {
      return (
        <div className="fitwise-widget-root fitwise-inline">
          <FitButton
            onClick={handleOpenModal}
            recommendation={recommendation}
            variant={variant}
          />
        </div>
      );
    }

    return (
      <div className="fitwise-widget-root fitwise-inline">
        {isSlow && (
          <div className="fw-alert fw-alert-warning" role="status" style={{ marginBottom: 12 }}>
            <AlertCircleIcon className="fw-alert-icon" />
            <span>Waking up the server, this can take up to a minute...</span>
          </div>
        )}

        {recommendation ? (
          <Result
            recommendation={recommendation}
            region={region}
            onRecalculate={() => {
              resetRecommendation();
              setInlineOpen(true);
            }}
          />
        ) : (
          <SizeForm
            productId={productId}
            product={product}
            category={category}
            region={region}
            onSubmit={handleCalculate}
            loading={calcLoading}
            error={calcError ? (calcError.message || String(calcError)) : null}
            isSlow={isSlow}
          />
        )}
      </div>
    );
  }

  // Standard modal mode rendering:
  // Shows "Find my size" button -> opens modal with SizeForm -> Result with WhyThisSize
  return (
    <div className="fitwise-widget-root">
      {/* Embedded Trigger CTA: "Find my size" */}
      <FitButton
        onClick={handleOpenModal}
        recommendation={recommendation}
        variant={variant}
      />

      {/* Floating Interactive Modal */}
      <FitModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={product}
        category={category}
        region={region}
        apiUrl={apiUrl}
        apiKey={apiKey}
        productId={productId}
        recommendation={recommendation}
        onCalculate={handleCalculate}
        onResetRecommendation={resetRecommendation}
        calcLoading={calcLoading}
        calcError={calcError ? (calcError.message || String(calcError)) : null}
        variant={variant}
        isSlow={isSlow}
      />
    </div>
  );
}

export default App;
