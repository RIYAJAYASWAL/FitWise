import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecommend } from '../src/hooks/useRecommend';
import * as client from '../src/api/client';

describe('useRecommend hook (hooks/useRecommend.js)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with loading: false, error: null, result: null, slow: false', () => {
    const { result } = renderHook(() => useRecommend());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.slow).toBe(false);
  });

  it('manages loading and result state on successful recommendation', async () => {
    const mockResponse = {
      recommendedSize: 'M',
      confidence: 0.94,
      alternatives: ['L'],
    };

    const recommendSpy = vi.spyOn(client, 'recommend').mockImplementation(async () => {
      return mockResponse;
    });

    const { result } = renderHook(() => useRecommend());

    let promise;
    await act(async () => {
      promise = result.current.recommend({
        productId: 'SKU-TSHIRT-CLASSIC',
        measurements: { height_cm: 175, weight_kg: 72, chest_cm: 96, waist_cm: 82 },
      });
      await promise;
    });

    expect(recommendSpy).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toEqual(mockResponse);
    expect(result.current.slow).toBe(false);
  });

  it('manages error state on failed recommendation', async () => {
    const contractError = {
      code: 'BAD_REQUEST',
      message: 'Chest measurement out of range',
    };
    const err = new Error(contractError.message);
    err.code = contractError.code;
    err.error = contractError;

    vi.spyOn(client, 'recommend').mockRejectedValue(err);

    const { result } = renderHook(() => useRecommend());

    await act(async () => {
      try {
        await result.current.recommend({});
      } catch {
        // Expected throw
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toEqual(contractError);
    expect(result.current.slow).toBe(false);
  });

  it('updates slow state when recommendation is slow', async () => {
    let capturedOptions;
    let resolveRecommend;

    vi.spyOn(client, 'recommend').mockImplementation((body, options) => {
      capturedOptions = options;
      return new Promise((resolve) => {
        resolveRecommend = resolve;
      });
    });

    const { result } = renderHook(() => useRecommend());

    let recommendPromise;
    act(() => {
      recommendPromise = result.current.recommend({ productId: 'SKU-TSHIRT-CLASSIC' });
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.slow).toBe(false);

    // Simulate the onSlow callback being triggered by client (> 5 seconds)
    act(() => {
      capturedOptions.onSlow(true);
    });

    expect(result.current.slow).toBe(true);
    expect(result.current.loading).toBe(true);

    // Resolve request
    await act(async () => {
      resolveRecommend({ recommendedSize: 'M' });
      await recommendPromise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.slow).toBe(false);
    expect(result.current.result).toEqual({ recommendedSize: 'M' });
  });

  it('resets state when reset() is called', async () => {
    vi.spyOn(client, 'recommend').mockResolvedValue({ recommendedSize: 'L' });

    const { result } = renderHook(() => useRecommend());

    await act(async () => {
      await result.current.recommend({});
    });

    expect(result.current.result).toEqual({ recommendedSize: 'L' });

    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.slow).toBe(false);
  });
});
