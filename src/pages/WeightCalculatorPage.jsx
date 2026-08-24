import React from 'react';
import WeightCategoryCalculator from '../components/WeightCategoryCalculator';
import './Regulations.css';

export default function WeightCalculatorPage() {
  return (
    <div className="public-page" style={{ minHeight: '80vh', padding: '100px 20px 60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '760px' }}>
        <WeightCategoryCalculator />
      </div>
    </div>
  );
}
