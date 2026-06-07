import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Companies() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPublicCompanies();
        setCompanies(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Top Companies</h1>
          <p className="text-gray-400">Discover top tech and BPO companies actively hiring on Voxa.</p>
        </div>

        {/* Search */}
        <div className="glass-panel p-1.5 rounded-full flex items-center w-full md:w-96 relative z-10">
          <div className="bg-white/5 p-2 rounded-full">
            <Search className="text-voxa-cyan w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="Search by company name..." 
            className="bg-transparent border-none outline-none text-white w-full px-3 placeholder-gray-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading companies...</div>
      ) : filteredCompanies.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCompanies.map((company, index) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel p-6 rounded-2xl flex flex-col relative group hover:border-voxa-cyan/30 transition-colors"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 overflow-hidden">
                 {company.logoUrl || (company.logo && company.logo.length > 2) ? (
                   <img src={company.logoUrl || company.logo} alt={company.name} className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-xl font-bold text-gray-400">{company.logo || company.name.substring(0,2).toUpperCase()}</span>
                 )}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-1">{company.name}</h3>
              <p className="text-sm text-gray-400 mb-6">{company.openJobs} Active Positions</p>
              
              <button onClick={() => navigate(`/companies/${company.id}`)} className="mt-auto w-full py-2 bg-voxa-cyan text-black font-bold rounded-xl text-center text-sm transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                View Profile
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No companies found matching your search.</p>
        </div>
      )}

    </div>
  );
}
