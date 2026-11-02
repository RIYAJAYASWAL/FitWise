import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSizeChart,
  assign,
  recommend,
  sendEvent,
  configureClient,
  normalizeError,
} from '../src/api/client';

describe('Widget API Client (api/client.js)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    configureClient({
      apiUrl: 'http://localhost:5000',
      apiKey: 'fw_pub_demo_984f1a23c7e0',
      onSlow: null,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('getSizeChart(productId)', () => {
    it('calls GET /api/products/:id/sizechart with x-api-key and returns parsed json', async () => {
      const mockData = {
        sku: 'SKU-TSHIRT-CLASSIC',
        category: 'tshirt',
        sizeChart: [{ size: 'M', chest: [94, 99], waist: [80, 85] }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => mockData,
      });

      const result = await getSizeChart('SKU-TSHIRT-CLASSIC');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('http://localhost:5000/api/products/SKU-TSHIRT-CLASSIC/sizechart');
      expect(options.method).toBe('GET');
      expect(options.headers['x-api-key']).toBe('fw_pub_demo_984f1a23c7e0');
      expect(options.headers['Accept']).toBe('application/json');
      expect(result).toEqual(mockData);
    });

    it('rejects if productId is missing', async () => {
      await expect(getSizeChart('')).rejects.toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: 'productId is required',
        },
      });
    });
  });

  describe('assign(visitorId)', () => {
    it('calls GET /api/experiments/assign?visitorId=... with x-api-key', async () => {
      const mockAssignment = {
        experimentId: 'exp_01',
        variant: 'treatment',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => mockAssignment,
      });

      const result = await assign('vis_123');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('http://localhost:5000/api/experiments/assign?visitorId=vis_123');
      expect(options.method).toBe('GET');
      expect(options.headers['x-api-key']).toBe('fw_pub_demo_984f1a23c7e0');
      expect(result).toEqual(mockAssignment);
    });

    it('rejects if visitorId is missing', async () => {
      await expect(assign('')).rejects.toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: 'visitorId is required',
        },
      });
    });
  });

  describe('recommend(body)', () => {
    it('calls POST /api/recommend with JSON body and x-api-key', async () => {
      const mockRec = {
        recommendedSize: 'M',
        regionSize: 'M',
        confidence: 0.92,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => mockRec,
      });

      const payload = {
        productId: 'SKU-TSHIRT-CLASSIC',
        measurements: { height_cm: 175, weight_kg: 72, chest_cm: 96, waist_cm: 82 },
        visitorId: 'vis_123',
      };

      const result = await recommend(payload);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('http://localhost:5000/api/recommend');
      expect(options.method).toBe('POST');
      expect(options.headers['x-api-key']).toBe('fw_pub_demo_984f1a23c7e0');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(options.body)).toEqual(payload);
      expect(result).toEqual(mockRec);
    });
  });

  describe('sendEvent(event)', () => {
    it('calls POST /api/events with JSON body and x-api-key', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ saved: true }),
      });

      const eventPayload = {
        visitorId: 'vis_123',
        variant: 'treatment',
        type: 'widget_shown',
        sku: 'SKU-TSHIRT-CLASSIC',
      };

      const result = await sendEvent(eventPayload);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('http://localhost:5000/api/events');
      expect(options.method).toBe('POST');
      expect(options.headers['x-api-key']).toBe('fw_pub_demo_984f1a23c7e0');
      expect(JSON.parse(options.body)).toEqual(eventPayload);
      expect(result).toEqual({ saved: true });
    });
  });

  describe('Error Normalization to Contract Format', () => {
    it('preserves existing contract error format { error: { code, message } }', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => 'application/json' },
        json: async () => ({
          error: {
            code: 'NOT_FOUND',
            message: 'Product SKU-UNKNOWN not found',
          },
        }),
      });

      await expect(getSizeChart('SKU-UNKNOWN')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Product SKU-UNKNOWN not found',
        error: {
          code: 'NOT_FOUND',
          message: 'Product SKU-UNKNOWN not found',
        },
      });
    });

    it('normalizes non-standard 400 error body into contract format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: { get: () => 'application/json' },
        json: async () => ({
          message: 'Invalid measurements provided',
        }),
      });

      await expect(recommend({})).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Invalid measurements provided',
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid measurements provided',
        },
      });
    });

    it('normalizes 503 or HTML server error into contract format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: { get: () => 'text/html' },
        text: async () => 'Service Temporarily Unavailable',
      });

      await expect(recommend({})).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        error: {
          code: 'SERVICE_UNAVAILABLE',
        },
      });
    });

    it('normalizes network throw (Failed to fetch) into contract format', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(recommend({})).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Failed to fetch',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Failed to fetch',
        },
      });
    });
  });

  describe('5-second onSlow Callback', () => {
    it('triggers onSlow(true) if request takes longer than 5 seconds', async () => {
      const onSlowSpy = vi.fn();

      // Create a fetch promise that does not resolve immediately
      let resolveFetch;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(fetchPromise);

      const requestPromise = recommend({}, { onSlow: onSlowSpy });

      // After 3 seconds, onSlow should NOT be called
      vi.advanceTimersByTime(3000);
      expect(onSlowSpy).not.toHaveBeenCalled();

      // After passing 5 seconds (advance another 2001ms), onSlow(true) should be called
      vi.advanceTimersByTime(2001);
      expect(onSlowSpy).toHaveBeenCalledWith(true);

      // Now resolve the fetch
      resolveFetch({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ recommendedSize: 'M' }),
      });

      const result = await requestPromise;
      expect(result).toEqual({ recommendedSize: 'M' });

      // On completion, onSlow(false) should be called to reset slow state
      expect(onSlowSpy).toHaveBeenCalledWith(false);
    });

    it('does NOT trigger onSlow if request finishes within 5 seconds', async () => {
      const onSlowSpy = vi.fn();

      global.fetch = vi.fn().mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({ recommendedSize: 'M' }),
        };
      });

      const result = await recommend({}, { onSlow: onSlowSpy });

      vi.advanceTimersByTime(1000);

      expect(result).toEqual({ recommendedSize: 'M' });
      expect(onSlowSpy).not.toHaveBeenCalled();
    });
  });
});
