import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SizeForm } from '../src/components/SizeForm';
import * as client from '../src/api/client';

describe('SizeForm component (components/SizeForm.jsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Field Rendering Per Category', () => {
    it('renders only tshirt fields: height, weight, chest, waist', () => {
      render(<SizeForm category="tshirt" region="US" />);

      // tshirt required fields must be present
      expect(screen.getByLabelText(/^height/i)).toBeDefined();
      expect(screen.getByLabelText(/^weight/i)).toBeDefined();
      expect(screen.getByLabelText(/^chest/i)).toBeDefined();
      expect(screen.getByLabelText(/^waist/i)).toBeDefined();

      // fields from other categories must NOT be present
      expect(screen.queryByLabelText(/^hip/i)).toBeNull();
      expect(screen.queryByLabelText(/^shoulder/i)).toBeNull();
      expect(screen.queryByLabelText(/^bust/i)).toBeNull();
      expect(screen.queryByLabelText(/^garment length/i)).toBeNull();
    });

    it('renders only jeans fields: height, weight, waist, hip', () => {
      render(<SizeForm category="jeans" region="US" />);

      // jeans required fields must be present
      expect(screen.getByLabelText(/^height/i)).toBeDefined();
      expect(screen.getByLabelText(/^weight/i)).toBeDefined();
      expect(screen.getByLabelText(/^waist/i)).toBeDefined();
      expect(screen.getByLabelText(/^hip/i)).toBeDefined();

      // fields from other categories must NOT be present
      expect(screen.queryByLabelText(/^chest/i)).toBeNull();
      expect(screen.queryByLabelText(/^shoulder/i)).toBeNull();
      expect(screen.queryByLabelText(/^bust/i)).toBeNull();
      expect(screen.queryByLabelText(/^garment length/i)).toBeNull();
    });

    it('renders only kurta fields: height, shoulder, bust, length', () => {
      render(<SizeForm category="kurta" region="IN" />);

      // kurta required fields must be present
      expect(screen.getByLabelText(/^height/i)).toBeDefined();
      expect(screen.getByLabelText(/^shoulder/i)).toBeDefined();
      expect(screen.getByLabelText(/^bust/i)).toBeDefined();
      expect(screen.getByLabelText(/^garment length/i)).toBeDefined();

      // fields from other categories must NOT be present
      expect(screen.queryByLabelText(/^weight/i)).toBeNull();
      expect(screen.queryByLabelText(/^waist/i)).toBeNull();
      expect(screen.queryByLabelText(/^hip/i)).toBeNull();
    });

    it('renders only blouse fields: bust, waist, shoulder', () => {
      render(<SizeForm category="blouse" region="IN" />);

      // blouse required fields must be present
      expect(screen.getByLabelText(/^bust circumference/i)).toBeDefined();
      expect(screen.getByLabelText(/^waist/i)).toBeDefined();
      expect(screen.getByLabelText(/^shoulder/i)).toBeDefined();

      // fields from other categories must NOT be present
      expect(screen.queryByLabelText(/^height/i)).toBeNull();
      expect(screen.queryByLabelText(/^weight/i)).toBeNull();
      expect(screen.queryByLabelText(/^hip/i)).toBeNull();
      expect(screen.queryByLabelText(/^garment length/i)).toBeNull();
    });
  });

  describe('Product Size Chart Fetching', () => {
    it('fetches size chart for productId and automatically configures category and region', async () => {
      vi.spyOn(client, 'getSizeChart').mockResolvedValue({
        sku: 'SKU-KURTA-SILK',
        category: 'kurta',
        region: 'IN',
        sizeChart: [{ size: 'M', shoulder: [42, 46], bust: [94, 98] }],
      });

      render(<SizeForm productId="SKU-KURTA-SILK" />);

      // Loading state shows initially
      expect(screen.getByText(/loading garment specifications/i)).toBeDefined();

      // Waits for size chart fetch to resolve
      await waitFor(() => {
        expect(screen.getByLabelText(/^shoulder/i)).toBeDefined();
      });

      // Verifies kurta fields were rendered based on fetched category
      expect(screen.getByLabelText(/^bust/i)).toBeDefined();
      expect(screen.getByLabelText(/^garment length/i)).toBeDefined();
      expect(screen.queryByLabelText(/^weight/i)).toBeNull();

      // Verifies region defaulted to the product's fetched region 'IN'
      const regionSelect = screen.getByLabelText(/sizing region/i);
      expect(regionSelect.value).toBe('IN');
    });
  });

  describe('Units, Helper Text, and Accessible Labels', () => {
    it('displays unit badges and short helper text for tshirt fields', () => {
      render(<SizeForm category="tshirt" region="US" />);

      // Check helper text explanations
      expect(screen.getByText(/standing straight without shoes/i)).toBeDefined();
      expect(screen.getByText(/current typical body weight/i)).toBeDefined();
      expect(screen.getByText(/around fullest part under armpits/i)).toBeDefined();
      expect(screen.getByText(/around natural waistline above navel/i)).toBeDefined();

      // Check units and range hints
      expect(screen.getByText(/120–220 cm/i)).toBeDefined();
      expect(screen.getByText(/30–200 kg/i)).toBeDefined();
    });
  });

  describe('Region Selector', () => {
    it('defaults to the given region and allows selecting another region', () => {
      render(<SizeForm category="tshirt" region="UK" />);

      const regionSelect = screen.getByLabelText(/sizing region/i);
      expect(regionSelect.value).toBe('UK');

      // Change region to EU
      fireEvent.change(regionSelect, { target: { value: 'EU' } });
      expect(regionSelect.value).toBe('EU');
    });

    it('contains all 4 supported regions: US, UK, EU, IN', () => {
      render(<SizeForm category="tshirt" region="US" />);

      const regionSelect = screen.getByLabelText(/sizing region/i);
      const options = Array.from(regionSelect.querySelectorAll('option')).map((o) => o.value);
      expect(options).toEqual(['US', 'UK', 'EU', 'IN']);
    });
  });

  describe('Range Validation and Form Submission', () => {
    it('validates ranges and displays error message if measurement is below minimum', async () => {
      const handleSubmit = vi.fn();
      render(<SizeForm category="tshirt" region="US" onSubmit={handleSubmit} />);

      const heightInput = screen.getByLabelText(/^height/i);

      // Enter height below min range (120 cm)
      fireEvent.change(heightInput, { target: { value: '110' } });

      const submitBtn = screen.getByRole('button', { name: /get my recommended size/i });
      fireEvent.click(submitBtn);

      const errorMsg = await screen.findByText(/height must be between 120 and 220 cm/i);
      expect(errorMsg).toBeDefined();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('validates ranges and displays error message if measurement is above maximum', async () => {
      const handleSubmit = vi.fn();
      render(<SizeForm category="tshirt" region="US" onSubmit={handleSubmit} />);

      const weightInput = screen.getByLabelText(/^weight/i);

      // Enter weight above max range (200 kg)
      fireEvent.change(weightInput, { target: { value: '250' } });

      const submitBtn = screen.getByRole('button', { name: /get my recommended size/i });
      fireEvent.click(submitBtn);

      const errorMsg = await screen.findByText(/weight must be between 30 and 200 kg/i);
      expect(errorMsg).toBeDefined();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('submits valid measurements and selected region to onSubmit handler', async () => {
      const handleSubmit = vi.fn();
      render(<SizeForm category="tshirt" region="IN" onSubmit={handleSubmit} />);

      const heightInput = screen.getByLabelText(/^height/i);
      const weightInput = screen.getByLabelText(/^weight/i);
      const chestInput = screen.getByLabelText(/^chest/i);
      const waistInput = screen.getByLabelText(/^waist/i);

      fireEvent.change(heightInput, { target: { value: '178' } });
      fireEvent.change(weightInput, { target: { value: '74' } });
      fireEvent.change(chestInput, { target: { value: '98' } });
      fireEvent.change(waistInput, { target: { value: '84' } });

      const submitBtn = screen.getByRole('button', { name: /get my recommended size/i });
      fireEvent.click(submitBtn);

      expect(handleSubmit).toHaveBeenCalledTimes(1);
      const [submittedMeasurements, submittedRegion] = handleSubmit.mock.calls[0];

      expect(submittedRegion).toBe('IN');
      expect(submittedMeasurements.height_cm).toBe(178);
      expect(submittedMeasurements.weight_kg).toBe(74);
      expect(submittedMeasurements.chest_cm).toBe(98);
      expect(submittedMeasurements.waist_cm).toBe(84);
    });
  });
});
