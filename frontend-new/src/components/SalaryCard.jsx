import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp } from 'lucide-react';

export default function SalaryCard({ data }) {
  // Calculate width for the progress bar based on a max value of 100k for visual purposes
  const percentage = Math.min((data.avg / 100000) * 100, 100);

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="glass-panel p-6 rounded-2xl relative overflow-hidden group"
    >
      {/* Background Glow on Hover */}
      <div className="absolute -inset-2 bg-gradient-to-r from-voxa-cyan/0 via-voxa-cyan/5 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none" />

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{data.title}</h3>
          <div className="flex items-center text-gray-400 text-sm gap-2">
            <Users className="w-4 h-4" />
            <span>Based on {data.samples} verified offers</span>
          </div>
        </div>
        <div className="bg-white/5 p-2 rounded-lg border border-white/10 group-hover:border-voxa-cyan/30 transition-colors">
          <TrendingUp className="text-voxa-cyan w-5 h-5" />
        </div>
      </div>

      <div className="mb-2 flex justify-between items-end">
        <span className="text-sm text-gray-400">Average Salary</span>
        <span className="text-2xl font-extrabold text-white tracking-tight">
          {data.avg.toLocaleString('en-US')} <span className="text-voxa-cyan text-sm font-semibold">EGP</span>
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden mt-4">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="absolute top-0 left-0 h-full bg-voxa-cyan rounded-full shadow-[0_0_10px_#00e5ff]"
        />
      </div>
      
      {/* Min/Max indicators */}
      <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium tracking-wide">
        <span>15k</span>
        <span>100k+</span>
      </div>
    </motion.div>
  );
}
