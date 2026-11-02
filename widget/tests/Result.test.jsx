import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Result } from '../src/components/Result';

describe('Result component (components/Result.jsx)', () => {
  const highConfidenceRec = {
    recommendedSize: 'M',
    regionSize: 'M',
    confidence: 0.92,
    alternatives: ['L'],
    explanation: {
      summary: 'Size M fits your measurements closely.',
      chartReason: 'Chest is 97 cm; covers 94-99 cm.',
      topFactors: [{ feature: 'chest_cm', impact: 0.85 }],
    },
    lowConfidence: false,
  };

  const lowConfidenceRec = {
    recommendedSize: 'M',
    regionSize: 'M',
    confidence: 0.42,
    alternatives: ['L'],
    explanation: {
      summary: 'Measurements fall between M and L.',
      chartReason: 'Chest falls on boundary between sizes.',
      topFactors: [{ feature: 'chest_cm', impact: 0.55 }],
    },
    lowConfidence: true,
  };

  describe('Standard / Confident State (lowConfidence: false)', () => {
    it('renders large regionSize and confident headline', () => {
      render(<Result recommendation={highConfidenceRec} region="US" />);

      // Confident headline
      expect(screen.getByText(/recommended size/i)).toBeDefined();

      // Large size display
      expect(screen.getByText('M')).toBeDefined();

      // Alternative size
      expect(screen.getByText(/size l/i)).toBeDefined();

      // Confidence badge text
      expect(screen.getByText(/high confidence/i)).toBeDefined();

      // Between sizes warning should NOT appear
      expect(screen.queryByText(/between sizes/i)).toBeNull();
      expect(screen.queryByText(/check the size chart/i)).toBeNull();

      // Single select size button
      expect(screen.getByRole('button', { name: /select size m/i })).toBeDefined();
    });

    it('renders regional conversion label if regionSize differs from standardSize', () => {
      const convertedRec = {
        ...highConfidenceRec,
        recommendedSize: 'M',
        regionSize: '38',
      };

      render(<Result recommendation={convertedRec} region="IN" />);

      expect(screen.getByText('38')).toBeDefined();
      expect(screen.getByText(/\(M Standard\)/i)).toBeDefined();
    });
  });

  describe('Low Confidence State (lowConfidence: true)', () => {
    it('shows top two sizes and "check the size chart" hint instead of sounding certain', () => {
      const handleViewSizeChart = vi.fn();

      render(
        <Result
          recommendation={lowConfidenceRec}
          region="US"
          onViewSizeChart={handleViewSizeChart}
        />
      );

      // Cautious headline instead of certain recommendation
      expect(screen.getByText(/^Between Sizes$/i)).toBeDefined();
      expect(screen.queryByText(/^recommended size$/i)).toBeNull();

      // Top two sizes displayed
      expect(screen.getByText(/^Size M$/i)).toBeDefined();
      expect(screen.getByText(/^Size L$/i)).toBeDefined();

      // Check the size chart hint
      expect(
        screen.getByText(/your body profile falls right on the boundary/i)
      ).toBeDefined();

      const sizeChartLink = screen.getByRole('button', { name: /check the size chart/i });
      expect(sizeChartLink).toBeDefined();

      // Clicking size chart hint invokes onViewSizeChart callback
      fireEvent.click(sizeChartLink);
      expect(handleViewSizeChart).toHaveBeenCalledTimes(1);

      // Dual buttons for fitted vs relaxed choices
      expect(screen.getByRole('button', { name: /choose size m \(fitted\)/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /choose size l \(relaxed\)/i })).toBeDefined();
    });
  });

  describe('User Interactions and Custom Events', () => {
    it('calls onSelectSize and dispatches fitwise:size-selected custom DOM event on apply', () => {
      const handleSelectSize = vi.fn();
      const eventSpy = vi.fn();

      window.addEventListener('fitwise:size-selected', eventSpy);

      render(
        <Result
          recommendation={highConfidenceRec}
          region="US"
          onSelectSize={handleSelectSize}
        />
      );

      const applyBtn = screen.getByRole('button', { name: /select size m/i });
      fireEvent.click(applyBtn);

      expect(handleSelectSize).toHaveBeenCalledWith('M', 'M');
      expect(eventSpy).toHaveBeenCalledTimes(1);
      const customEvent = eventSpy.mock.calls[0][0];
      expect(customEvent.detail.size).toBe('M');
      expect(customEvent.detail.regionSize).toBe('M');
      expect(customEvent.detail.region).toBe('US');

      window.removeEventListener('fitwise:size-selected', eventSpy);
    });

    it('invokes onRecalculate when adjust button is clicked', () => {
      const handleRecalculate = vi.fn();

      render(
        <Result
          recommendation={highConfidenceRec}
          region="US"
          onRecalculate={handleRecalculate}
        />
      );

      const adjustBtn = screen.getByRole('button', { name: /adjust measurements/i });
      fireEvent.click(adjustBtn);

      expect(handleRecalculate).toHaveBeenCalledTimes(1);
    });
  });
});
