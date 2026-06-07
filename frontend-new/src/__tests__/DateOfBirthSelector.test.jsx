import { render, screen } from '@testing-library/react';
import DateOfBirthSelector from '../components/DateOfBirthSelector';
import React from 'react';

describe('DateOfBirthSelector Leap Year Logic', () => {
  it('allows 29 days in February during a leap year (2024)', () => {
    const mockChange = jest.fn();
    const formData = { dobDay: '1', dobMonth: '2', dobYear: '2024' };
    
    render(<DateOfBirthSelector formData={formData} handleChange={mockChange} />);
    
    // Day 29 should exist
    expect(screen.getByRole('option', { name: '29' })).toBeInTheDocument();
    // Day 30 should NOT exist
    expect(screen.queryByRole('option', { name: '30' })).not.toBeInTheDocument();
  });

  it('restricts February to 28 days in a non-leap year (2023)', () => {
    const mockChange = jest.fn();
    const formData = { dobDay: '1', dobMonth: '2', dobYear: '2023' };
    
    render(<DateOfBirthSelector formData={formData} handleChange={mockChange} />);
    
    expect(screen.getByRole('option', { name: '28' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '29' })).not.toBeInTheDocument();
  });
});
