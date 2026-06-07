import { render, screen } from '@testing-library/react';
import SalaryCard from './SalaryCard';
import { describe, it, expect } from 'vitest';

describe('SalaryCard Component', () => {
  const mockData = {
    title: 'Senior React Developer',
    avg: 50000,
    samples: 142
  };

  it('renders the job title and samples count correctly', () => {
    render(<SalaryCard data={mockData} />);
    
    // Validate that the correct business data is rendered
    expect(screen.getByText('Senior React Developer')).toBeInTheDocument();
    expect(screen.getByText(/142 verified offers/i)).toBeInTheDocument();
  });

  it('renders the formatted salary average correctly', () => {
    render(<SalaryCard data={mockData} />);
    
    // Validate number formatting (e.g. 50000 -> 50,000)
    expect(screen.getByText(/50,000/i)).toBeInTheDocument();
  });
});
