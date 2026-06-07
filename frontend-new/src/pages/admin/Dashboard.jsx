import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, FileAudio, Activity } from 'lucide-react';
import { api } from '../../services/api';

const StatCard = ({ title, value, icon: Icon, color, bg }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-panel p-6 rounded-2xl flex items-start justify-between"
  >
    <div>
      <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${bg}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgencies: 0,
    totalJobs: 0,
    totalApps: 0,
    agencyStats: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.admin.getStats();
        setStats({
          totalUsers: data.total_users || 0,
          totalAgencies: data.total_agencies || 0,
          totalJobs: data.total_jobs || 0,
          totalApps: data.total_apps || 0,
          agencyStats: data.agency_breakdown || []
        });
      } catch (err) {
        console.error("Failed to fetch admin stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Candidates" value={loading ? '...' : stats.totalUsers} icon={Users} color="text-voxa-cyan" bg="bg-voxa-cyan/10" />
        <StatCard title="Active Jobs" value={loading ? '...' : stats.totalJobs} icon={Briefcase} color="text-purple-400" bg="bg-purple-500/10" />
        <StatCard title="AI Voice Apps" value={loading ? '...' : stats.totalApps} icon={FileAudio} color="text-green-400" bg="bg-green-500/10" />
        <StatCard title="Agencies" value={loading ? '...' : stats.totalAgencies} icon={Activity} color="text-orange-400" bg="bg-orange-500/10" />
      </div>

      {/* Chart/Table Placeholder Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Agency Breakdown */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-white mb-4">Top Agencies</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {loading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : stats.agencyStats.length === 0 ? (
              <p className="text-gray-400 text-sm">No agency data available.</p>
            ) : (
              stats.agencyStats.map((agency, index) => (
                <div key={index} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="font-medium text-gray-300">{agency.agency}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-voxa-cyan font-bold">{agency.count} Apps</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
