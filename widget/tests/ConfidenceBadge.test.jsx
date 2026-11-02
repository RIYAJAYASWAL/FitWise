import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConfidenceBadge, getConfidenceTier } from '../src/components/ConfidenceBadge';

describe('ConfidenceBadge component (components/ConfidenceBadge.jsx)', () => {
  describe('High Confidence (>= 0.75)', () => {
    it('renders High Confidence text, green colour, and high data-level for 0.75', () => {
      const { container } = render(<ConfidenceBadge confidence={0.75} />);
      const badge = container.querySelector('.fw-confidence-badge');

      expect(badge).toBeDefined();
      expect(badge.getAttribute('data-level')).toBe('high');
      expect(badge.style.color).toBe('rgb(16, 185, 129)'); // #10b981
      expect(screen.getByText(/high confidence/i)).toBeDefined();
      expect(screen.getByText(/\(75%\)/i)).toBeDefined();
    });

    it('renders High Confidence for 0.92', () => {
      render(<ConfidenceBadge confidence={0.92} />);
      expect(screen.getByText(/high confidence/i)).toBeDefined();
      expect(screen.getByText(/\(92%\)/i)).toBeDefined();
    });
  });

  describe('Medium Confidence (0.50 - 0.74)', () => {
    it('renders Medium Confidence text, amber colour, and medium data-level for 0.50', () => {
      const { container } = render(<ConfidenceBadge confidence={0.50} />);
      const badge = container.querySelector('.fw-confidence-badge');

      expect(badge).toBeDefined();
      expect(badge.getAttribute('data-level')).toBe('medium');
      expect(badge.style.color).toBe('rgb(217, 119, 6)'); // #d97706
      expect(screen.getByText(/medium confidence/i)).toBeDefined();
      expect(screen.getByText(/\(50%\)/i)).toBeDefined();
    });

    it('renders Medium Confidence for 0.74', () => {
      const { container } = render(<ConfidenceBadge confidence={0.74} />);
      const badge = container.querySelector('.fw-confidence-badge');

      expect(badge.getAttribute('data-level')).toBe('medium');
      expect(screen.getByText(/medium confidence/i)).toBeDefined();
      expect(screen.getByText(/\(74%\)/i)).toBeDefined();
    });
  });

  describe('Low Confidence (< 0.50)', () => {
    it('renders Low Confidence text, red colour, and low data-level for 0.49', () => {
      const { container } = render(<ConfidenceBadge confidence={0.49} />);
      const badge = container.querySelector('.fw-confidence-badge');

      expect(badge).toBeDefined();
      expect(badge.getAttribute('data-level')).toBe('low');
      expect(badge.style.color).toBe('rgb(239, 68, 68)'); // #ef4444
      expect(screen.getByText(/low confidence/i)).toBeDefined();
      expect(screen.getByText(/\(49%\)/i)).toBeDefined();
    });

    it('renders Low Confidence for 0.35', () => {
      render(<ConfidenceBadge confidence={0.35} />);
      expect(screen.getByText(/low confidence/i)).toBeDefined();
      expect(screen.getByText(/\(35%\)/i)).toBeDefined();
    });
  });

  describe('Display Options', () => {
    it('omits score percentage when showScore is false', () => {
      render(<ConfidenceBadge confidence={0.88} showScore={false} />);
      expect(screen.getByText(/high confidence/i)).toBeDefined();
      expect(screen.queryByText(/\(88%\)/i)).toBeNull();
    });

    it('getConfidenceTier helper categorizes accurately', () => {
      expect(getConfidenceTier(0.85).tier).toBe('High');
      expect(getConfidenceTier(0.65).tier).toBe('Medium');
      expect(getConfidenceTier(0.40).tier).toBe('Low');
    });
  });
});
