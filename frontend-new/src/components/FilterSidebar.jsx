import React from 'react';
import { SlidersHorizontal, MapPin, Briefcase } from 'lucide-react';

export default function FilterSidebar({ jobTypes, setJobTypes, locations, setLocations, minSalary, setMinSalary, onReset }) {
  const handleTypeToggle = (type) => {
    if (jobTypes.includes(type)) setJobTypes(jobTypes.filter(t => t !== type));
    else setJobTypes([...jobTypes, type]);
  };

  const handleLocToggle = (loc) => {
    if (locations.includes(loc)) setLocations(locations.filter(l => l !== loc));
    else setLocations([...locations, loc]);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl md:sticky md:top-28">
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="text-voxa-cyan w-5 h-5" />
          <h2 className="text-lg font-bold text-white">Filters</h2>
        </div>
        <button onClick={onReset} className="text-sm text-gray-400 hover:text-white transition-colors">
          Reset
        </button>
      </div>

      <div className="space-y-6">
        {/* Job Type */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Job Type</h3>
          <div className="space-y-3">
            {['Full Time', 'Part Time', 'Freelance'].map(type => (
              <label key={type} className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5 rounded border border-gray-500 group-hover:border-voxa-cyan transition-colors">
                  <input 
                    type="checkbox" 
                    checked={jobTypes.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                    className="peer absolute w-full h-full opacity-0 cursor-pointer" 
                  />
                  <div className="w-3 h-3 bg-voxa-cyan rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-gray-300 group-hover:text-white transition-colors">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Location</h3>
          <div className="space-y-3">
            {['Remote', 'On-Site', 'Hybrid'].map(loc => (
              <label key={loc} className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5 rounded border border-gray-500 group-hover:border-voxa-cyan transition-colors">
                  <input 
                    type="checkbox" 
                    checked={locations.includes(loc)}
                    onChange={() => handleLocToggle(loc)}
                    className="peer absolute w-full h-full opacity-0 cursor-pointer" 
                  />
                  <div className="w-3 h-3 bg-voxa-cyan rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-gray-300 group-hover:text-white transition-colors">{loc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Minimum Salary Slider */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider flex justify-between">
            Min Salary 
            <span className="text-voxa-cyan">{minSalary > 0 ? `${minSalary}K EGP` : 'Any'}</span>
          </h3>
          <input 
            type="range" 
            min="0" max="50" step="5"
            value={minSalary}
            onChange={(e) => setMinSalary(parseInt(e.target.value))}
            className="w-full accent-voxa-cyan h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
