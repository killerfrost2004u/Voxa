import React from 'react';
import { motion } from 'framer-motion';
import { Star, Briefcase } from 'lucide-react';

export default function CompanyCard({ company }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.03 }}
      className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center relative overflow-hidden group cursor-pointer"
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-voxa-cyan/0 to-voxa-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Logo */}
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-extrabold text-voxa-cyan shadow-[0_0_15px_rgba(0,229,255,0.1)] mb-6 group-hover:shadow-[0_0_25px_rgba(0,229,255,0.3)] transition-shadow">
        {company.logo || company.name.substring(0, 2).toUpperCase()}
      </div>

      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-voxa-cyan transition-colors">{company.name}</h3>
      
      {/* 5-Star Rating Mock */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-voxa-cyan text-voxa-cyan" />
        ))}
      </div>

      {/* Active Positions Tag */}
      <div className="flex items-center gap-2 bg-voxa-cyan/10 text-voxa-cyan px-4 py-1.5 rounded-full text-sm font-semibold border border-voxa-cyan/20 mb-8">
        <Briefcase className="w-4 h-4" />
        {company.openJobs} Active Positions
      </div>

      {/* Action Button */}
      <button className="btn-primary w-full shadow-none group-hover:shadow-[0_0_15px_#00e5ff] transition-shadow">
        View Profile
      </button>
    </motion.div>
  );
}
