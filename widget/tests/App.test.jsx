import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { App } from '../src/App';
import * as client from '../src/api/client';

describe('App component (App.jsx)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('variant "control" renders nothing but sends widget_shown for visitor', async () => {
    const sendEventSpy = vi.spyOn(client, 'sendEvent').mockResolvedValue({ saved: true });
    vi.spyOn(client, 'assign').mockResolvedValue({
      experimentId: 'exp_01',
      variant: 'control',
    });

    const { container } = render(
      <App
        productId="SKU-TSHIRT-CLASSIC"
        apiUrl="http://localhost:5000"
        apiKey="fw_pub_demo_123"
        forcedVariant="control"
      />
    );

    // Variant "control" renders nothing
    expect(container.firstChild).toBeNull();

    // Sends widget_shown event for every visitor
    await waitFor(() => {
      expect(sendEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'widget_shown',
          variant: 'control',
          sku: 'SKU-TSHIRT-CLASSIC',
        }),
        expect.anything()
      );
    });
  });

  it('variant "treatment" shows "Find my size" button and sends widget_shown', async () => {
    const sendEventSpy = vi.spyOn(client, 'sendEvent').mockResolvedValue({ saved: true });
    vi.spyOn(client, 'getSizeChart').mockResolvedValue({
      sku: 'SKU-TSHIRT-CLASSIC',
      category: 'tshirt',
      region: 'US',
    });

    render(
      <App
        productId="SKU-TSHIRT-CLASSIC"
        apiUrl="http://localhost:5000"
        apiKey="fw_pub_demo_123"
        forcedVariant="treatment"
      />
    );

    // Treatment shows a "Find my size" button
    const button = screen.getByRole('button', { name: /find my size/i });
    expect(button).toBeTruthy();

    // Sends widget_shown event
    await waitFor(() => {
      expect(sendEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'widget_shown',
          variant: 'treatment',
          sku: 'SKU-TSHIRT-CLASSIC',
        }),
        expect.anything()
      );
    });
  });

  it('treatment flow: "Find my size" -> SizeForm -> Result with WhyThisSize, sending recommend_requested on submit', async () => {
    const sendEventSpy = vi.spyOn(client, 'sendEvent').mockResolvedValue({ saved: true });
    vi.spyOn(client, 'getSizeChart').mockResolvedValue({
      sku: 'SKU-TSHIRT-CLASSIC',
      brand: 'UrbanClassic',
      category: 'tshirt',
      region: 'US',
      sizeChart: [],
    });

    const mockRecommendation = {
      recommendedSize: 'M',
      regionSize: 'M',
      confidence: 0.9,
      alternatives: ['L'],
      explanation: {
        summary: 'Size M is recommended based on your chest and waist.',
        chartReason: 'Chest matches size M specifications.',
        topFactors: [
          { feature: 'chest', importance: 0.65, direction: 'neutral' },
          { feature: 'waist', importance: 0.35, direction: 'neutral' },
        ],
      },
      lowConfidence: false,
    };

    const recommendSpy = vi.spyOn(client, 'recommend').mockResolvedValue(mockRecommendation);

    render(
      <App
        productId="SKU-TSHIRT-CLASSIC"
        apiUrl="http://localhost:5000"
        apiKey="fw_pub_demo_123"
        forcedVariant="treatment"
      />
    );

    // 1. Initial view: "Find my size" button
    const findMySizeBtn = screen.getByRole('button', { name: /find my size/i });
    expect(findMySizeBtn).toBeTruthy();

    // Click "Find my size" -> opens SizeForm
    fireEvent.click(findMySizeBtn);

    // 2. SizeForm appears
    await waitFor(() => {
      expect(screen.getByText(/get my recommended size/i)).toBeTruthy();
    });

    // Check that measurement fields are present (e.g. Height, Weight, Chest, Waist for tshirt)
    expect(screen.getByLabelText(/chest circumference/i)).toBeTruthy();
    expect(screen.getByLabelText(/waist circumference/i)).toBeTruthy();

    // 3. Submit SizeForm
    const submitBtn = screen.getByRole('button', { name: /get my recommended size/i });
    fireEvent.click(submitBtn);

    // 4. Verifies recommend_requested is sent on submit
    await waitFor(() => {
      expect(sendEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'recommend_requested',
          variant: 'treatment',
          sku: 'SKU-TSHIRT-CLASSIC',
        }),
        expect.anything()
      );
    });

    expect(recommendSpy).toHaveBeenCalledTimes(1);

    // 5. Result with WhyThisSize appears
    await waitFor(() => {
      // Large recommended size M
      expect(screen.getByText('M')).toBeTruthy();
      // WhyThisSize component content
      expect(screen.getByText(/why this size/i)).toBeTruthy();
      expect(screen.getByText(/chest matches size m specifications/i)).toBeTruthy();
    });
  });

  it('while request is slow shows "Waking up the server, this can take up to a minute..."', async () => {
    vi.spyOn(client, 'sendEvent').mockResolvedValue({ saved: true });
    vi.spyOn(client, 'getSizeChart').mockResolvedValue({
      sku: 'SKU-TSHIRT-CLASSIC',
      brand: 'UrbanClassic',
      category: 'tshirt',
      region: 'US',
    });

    let triggerSlow;
    const recommendPromise = new Promise(() => {
      // Intentionally pending
    });

    vi.spyOn(client, 'recommend').mockImplementation((body, options) => {
      triggerSlow = () => {
        if (typeof options?.onSlow === 'function') {
          options.onSlow(true);
        }
      };
      return recommendPromise;
    });

    render(
      <App
        productId="SKU-TSHIRT-CLASSIC"
        apiUrl="http://localhost:5000"
        apiKey="fw_pub_demo_123"
        forcedVariant="treatment"
      />
    );

    // Open SizeForm
    fireEvent.click(screen.getByRole('button', { name: /find my size/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /get my recommended size/i })).toBeTruthy();
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /get my recommended size/i }));

    // Trigger slow status callback
    act(() => {
      if (triggerSlow) triggerSlow();
    });

    // Verify slow message is shown
    await waitFor(() => {
      expect(
        screen.getByText(/waking up the server, this can take up to a minute\.\.\./i)
      ).toBeTruthy();
    });
  });
});
