import React, { useEffect } from 'react';

export default function DateOfBirthSelector({ formData, handleChange }) {
  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 16 - i);

  const getDaysInMonth = (month, year) => {
    if (!month) return 31;
    if (month === 2) {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      return isLeap ? 29 : 28;
    }
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
  };

  const daysCount = getDaysInMonth(parseInt(formData.dobMonth), parseInt(formData.dobYear));
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);

  useEffect(() => {
    if (formData.dobDay && parseInt(formData.dobDay) > daysCount) {
      handleChange({ target: { name: 'dobDay', value: daysCount.toString() } });
    }
  }, [formData.dobMonth, formData.dobYear, daysCount, formData.dobDay, handleChange]);

  return (
    <div className="col-span-2">
      <label className="block text-xs text-gray-400 mb-1">Date of Birth *</label>
      <div className="flex gap-2">
        <select name="dobDay" value={formData.dobDay} onChange={handleChange} required className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
          <option value="" className="bg-[#0F0F12]">Day</option>
          {days.map(d => (
            <option key={d} value={d} className="bg-[#0F0F12]">{d}</option>
          ))}
        </select>
        <select name="dobMonth" value={formData.dobMonth} onChange={handleChange} required className="flex-[2] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
          <option value="" className="bg-[#0F0F12]">Month</option>
          {months.map(m => (
            <option key={m.value} value={m.value} className="bg-[#0F0F12]">{m.label}</option>
          ))}
        </select>
        <select name="dobYear" value={formData.dobYear} onChange={handleChange} required className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
          <option value="" className="bg-[#0F0F12]">Year</option>
          {years.map(y => (
            <option key={y} value={y} className="bg-[#0F0F12]">{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
