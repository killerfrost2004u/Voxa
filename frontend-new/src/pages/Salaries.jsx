import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import SalaryCard from '../components/SalaryCard';
import { api } from '../services/api';

export default function Salaries() {
  const [searchTerm, setSearchTerm] = useState('');
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPublicSalaries();
        setSalaries(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredSalaries = salaries.filter(stat => 
    stat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Market Salaries</h1>
          <p className="text-gray-400">Real-time compensation data based on verified job offers.</p>
        </div>

        {/* Search Bar */}
        <div className="glass-panel p-1.5 rounded-full flex items-center w-full md:w-96 relative z-10">
          <div className="bg-white/5 p-2 rounded-full">
            <Search className="text-voxa-cyan w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="Search roles (e.g. React Developer)..." 
            className="bg-transparent border-none outline-none text-white w-full px-3 placeholder-gray-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading salary data...</div>
      ) : filteredSalaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSalaries.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <SalaryCard data={stat} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No numerical salary data found matching your search.</p>
        </div>
      )}

    </div>
  );
}
