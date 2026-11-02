import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhyThisSize } from '../src/components/WhyThisSize';

describe('WhyThisSize component (components/WhyThisSize.jsx)', () => {
  const sampleExplanation = {
    summary: 'Size M is recommended based on your chest and waist measurements.',
    chartReason: 'Your chest is 97 cm; this brand covers 94-99 cm.',
    topFactors: [
      { feature: 'chest_cm', impact: 0.83 },
      { feature: 'waist_cm', impact: 0.17 },
    ],
  };

  it('renders summary, chartReason, and labeled topFactors progress bars', () => {
    const { container } = render(<WhyThisSize explanation={sampleExplanation} />);

    // Summary and chart reason
    expect(screen.getByText(sampleExplanation.summary)).toBeDefined();
    expect(screen.getByText(sampleExplanation.chartReason)).toBeDefined();

    // Factors list
    expect(screen.getByText('Chest')).toBeDefined();
    expect(screen.getByText(/83%/)).toBeDefined();
    expect(screen.getByText('Waist')).toBeDefined();
    expect(screen.getByText(/17%/)).toBeDefined();

    // Progress bar elements
    const progressBars = container.querySelectorAll('.fw-bar-fill');
    expect(progressBars.length).toBe(2);
    expect(progressBars[0].style.width).toBe('83%');
    expect(progressBars[1].style.width).toBe('17%');
  });

  it('collapses and expands on header button click', () => {
    render(<WhyThisSize explanation={sampleExplanation} defaultExpanded={true} />);

    const toggleBtn = screen.getByRole('button', { name: /why this size\?/i });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(sampleExplanation.summary)).toBeDefined();

    // Click to collapse
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(sampleExplanation.summary)).toBeNull();

    // Click to expand again
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(sampleExplanation.summary)).toBeDefined();
  });

  it('returns null when no explanation data is present', () => {
    const { container } = render(<WhyThisSize explanation={{}} />);
    expect(container.firstChild).toBeNull();
  });
});
