import React from 'react';

export function SizeChartTable({ sizeChart = [], category = 'tshirt', recommendedSize }) {
  if (!sizeChart || sizeChart.length === 0) {
    return (
      <div className="fw-empty-chart">
        <p>No size chart available for this product.</p>
      </div>
    );
  }

  // Derive all measurement dimension keys from the first row
  const firstRow = sizeChart[0] || {};
  const dimensions = Object.keys(firstRow).filter((k) => k !== 'size');

  return (
    <div className="fw-chart-wrapper">
      <div className="fw-chart-scroll">
        <table className="fw-chart-table">
          <thead>
            <tr>
              <th className="fw-th-size">Size</th>
              {dimensions.map((dim) => (
                <th key={dim} className="fw-th-dim">
                  {dim.charAt(0).toUpperCase() + dim.slice(1)} (cm)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizeChart.map((row) => {
              const isMatch = recommendedSize && (row.size === recommendedSize);
              return (
                <tr key={row.size} className={isMatch ? 'fw-tr-highlight' : ''}>
                  <td className="fw-td-size">
                    <span className="fw-size-name">{row.size}</span>
                    {isMatch && <span className="fw-badge-rec">Recommended</span>}
                  </td>
                  {dimensions.map((dim) => {
                    const range = row[dim];
                    const text = Array.isArray(range)
                      ? `${range[0]} – ${range[1]}`
                      : `${range}`;
                    return (
                      <td key={dim} className="fw-td-dim">
                        {text}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="fw-chart-caption">
        All measurements are given in centimeters. For half measurements, multiply by two.
      </p>
    </div>
  );
}
