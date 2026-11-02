import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountWidget, initAll, track } from '../src/embed';
import * as client from '../src/api/client';

describe('embed.js & window.FitWise', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('mounts into #fitwise-widget, creates a Shadow DOM root, and injects inline CSS', () => {
    const container = document.createElement('div');
    container.id = 'fitwise-widget';
    container.setAttribute('data-product-id', 'SKU-JEANS-01');
    container.setAttribute('data-api-url', 'http://localhost:5000');
    container.setAttribute('data-api-key', 'fw_pub_demo_test');
    document.body.appendChild(container);

    const { root, shadow } = mountWidget(container);

    expect(shadow).toBeDefined();
    expect(container.shadowRoot).toBe(shadow);

    // Verifies inlined CSS style element is injected inside shadow root
    const styleEl = shadow.querySelector('style');
    expect(styleEl).not.toBeNull();
    expect(styleEl.tagName).toBe('STYLE');
    expect(container.shadowRoot.contains(styleEl)).toBe(true);

    // Verifies React root host element is created inside shadow root
    const hostEl = shadow.querySelector('.fitwise-widget-host');
    expect(hostEl).not.toBeNull();
    expect(container.shadowRoot.contains(hostEl)).toBe(true);
  });

  it('initAll automatically discovers #fitwise-widget and mounts', () => {
    const container = document.createElement('div');
    container.id = 'fitwise-widget';
    container.setAttribute('data-product-id', 'SKU-KURTA-01');
    container.setAttribute('data-api-key', 'fw_pub_demo_test');
    document.body.appendChild(container);

    initAll();

    expect(container.shadowRoot).not.toBeNull();
    expect(container._fitwise_mounted).toBe(true);
  });

  it('window.FitWise.track reports add_to_cart and purchase events', async () => {
    const sendEventSpy = vi.spyOn(client, 'sendEvent').mockResolvedValue({ saved: true });

    // Store custom visitorId and variant in localStorage
    localStorage.setItem('fitwise_visitor_id', 'vis_test_123');
    localStorage.setItem('fitwise_variant', 'treatment');

    // Mount a container to initialize active config
    const container = document.createElement('div');
    container.id = 'fitwise-widget';
    container.setAttribute('data-product-id', 'SKU-TSHIRT-CLASSIC');
    container.setAttribute('data-api-url', 'http://localhost:5000');
    container.setAttribute('data-api-key', 'fw_pub_demo_test');
    document.body.appendChild(container);
    mountWidget(container);

    // 1. Report add_to_cart
    await window.FitWise.track('add_to_cart');

    expect(sendEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'add_to_cart',
        visitorId: 'vis_test_123',
        variant: 'treatment',
        sku: 'SKU-TSHIRT-CLASSIC',
      }),
      expect.objectContaining({
        apiUrl: 'http://localhost:5000',
        apiKey: 'fw_pub_demo_test',
      })
    );

    // 2. Report purchase
    await window.FitWise.track('purchase');

    expect(sendEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'purchase',
        visitorId: 'vis_test_123',
        variant: 'treatment',
        sku: 'SKU-TSHIRT-CLASSIC',
      }),
      expect.objectContaining({
        apiUrl: 'http://localhost:5000',
        apiKey: 'fw_pub_demo_test',
      })
    );
  });
});
