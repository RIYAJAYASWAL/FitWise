import React, { useEffect, useState } from 'react';
import { CloseIcon, SparklesIcon, RulerIcon } from './Icons';
import { SizeForm } from './SizeForm';
import { Result } from './Result';
import { SizeChartTable } from './SizeChartTable';
import { FeedbackCard } from './FeedbackCard';

export function FitModal({
  isOpen,
  onClose,
  product,
  category = 'tshirt',
  region = 'US',
  apiUrl,
  apiKey,
  productId,
  recommendation,
  onCalculate,
  onResetRecommendation,
  calcLoading,
  calcError,
  variant = 'treatment',
  isSlow = false,
}) {
  const [activeTab, setActiveTab] = useState(
    variant === 'control' ? 'chart' : 'recommender'
  );
  const [viewState, setViewState] = useState('form'); // 'form', 'result', 'feedback'

  // Sync view state when recommendation arrives
  useEffect(() => {
    if (recommendation) {
      setViewState('result');
      setActiveTab('recommender');
    }
  }, [recommendation]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isControl = variant === 'control';
  const brandName = product?.brand || 'FitWise Partner';
  const sizeChart = product?.sizeChart || [];

  return (
    <div className="fw-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="fw-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="fw-modal-header">
          <div className="fw-header-info">
            <div className="fw-header-title-row">
              <span className="fw-header-badge">
                <SparklesIcon className="fw-badge-icon" /> FitWise
              </span>
              <h3 className="fw-header-title">
                {isControl ? 'Brand Size Guide' : 'Smart Size Recommender'}
              </h3>
            </div>
            <p className="fw-header-subtitle">
              {brandName} • {category.toUpperCase()} • Region: {region}
            </p>
          </div>

          <button
            type="button"
            className="fw-close-btn"
            onClick={onClose}
            aria-label="Close fit modal"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="fw-tabs" role="tablist">
          {!isControl && (
            <button
              type="button"
              className={`fw-tab ${activeTab === 'recommender' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommender')}
              role="tab"
              aria-selected={activeTab === 'recommender'}
            >
              <SparklesIcon className="fw-tab-icon" />
              <span>AI Size Match</span>
            </button>
          )}

          <button
            type="button"
            className={`fw-tab ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveTab('chart')}
            role="tab"
            aria-selected={activeTab === 'chart'}
          >
            <RulerIcon className="fw-tab-icon" />
            <span>Size Chart</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="fw-modal-body">
          {activeTab === 'recommender' && (
            <>
              {viewState === 'feedback' ? (
                <FeedbackCard
                  apiUrl={apiUrl}
                  apiKey={apiKey}
                  productId={productId}
                  initialSize={recommendation?.recommendedSize || 'M'}
                  onBack={() => setViewState(recommendation ? 'result' : 'form')}
                />
              ) : viewState === 'result' && recommendation ? (
                <Result
                  recommendation={recommendation}
                  region={region}
                  onRecalculate={() => {
                    onResetRecommendation();
                    setViewState('form');
                  }}
                  onViewSizeChart={() => setActiveTab('chart')}
                  onOpenFeedback={() => setViewState('feedback')}
                />
              ) : (
                <SizeForm
                  productId={productId}
                  product={product}
                  category={category}
                  region={region}
                  onSubmit={(measurements, targetRegion) => {
                    onCalculate(measurements, targetRegion);
                  }}
                  loading={calcLoading}
                  error={calcError}
                  isSlow={isSlow}
                />
              )}
            </>
          )}

          {activeTab === 'chart' && (
            <SizeChartTable
              sizeChart={sizeChart}
              category={category}
              recommendedSize={recommendation?.recommendedSize}
            />
          )}
        </div>

        {/* Modal Footer Brand Tag */}
        <div className="fw-modal-footer">
          <div className="fw-footer-branding">
            <span>Powered by <strong>FitWise AI</strong></span>
            <span className="fw-footer-dot">•</span>
            <span>Zero Guesswork Sizing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
