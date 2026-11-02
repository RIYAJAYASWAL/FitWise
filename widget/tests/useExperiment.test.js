import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExperiment, getOrCreateVisitorId } from '../src/hooks/useExperiment';
import * as client from '../src/api/client';

describe('useExperiment hook (hooks/useExperiment.js)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates an anonymous visitorId and saves it in localStorage', () => {
    expect(localStorage.getItem('fitwise_visitor_id')).toBeNull();

    const id = getOrCreateVisitorId();

    expect(id).toMatch(/^vis_[a-z0-9]+_[a-z0-9]+$/);
    expect(localStorage.getItem('fitwise_visitor_id')).toBe(id);

    // Calling again returns the exact same visitorId
    const secondCall = getOrCreateVisitorId();
    expect(secondCall).toBe(id);
  });

  it('handles localStorage throwing exceptions safely without crashing', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });

    const id = getOrCreateVisitorId();
    expect(id).toMatch(/^vis_/);

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('calls assign(visitorId) and returns { variant, loading }', async () => {
    const assignSpy = vi.spyOn(client, 'assign').mockResolvedValue({
      experimentId: 'exp_01',
      variant: 'treatment',
    });

    const { result } = renderHook(() => useExperiment());

    // Initially loading is true
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(assignSpy).toHaveBeenCalledTimes(1);
    expect(result.current.variant).toBe('treatment');
    expect(result.current.visitorId).toMatch(/^vis_/);
  });

  it('falls back to control variant if assign API call fails', async () => {
    vi.spyOn(client, 'assign').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useExperiment());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.variant).toBe('control');
  });
});
