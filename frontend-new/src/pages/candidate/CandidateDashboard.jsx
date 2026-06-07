import React, { useState, useEffect } from 'react';
import { Briefcase, CalendarCheck, Eye, Loader2, ArrowRight, FileText, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.email) return;
      try {
        const [statsData, appsData] = await Promise.all([
          api.getCandidateStats(user.email),
          api.getCandidateApplications(user.email)
        ]);
        setStats(statsData);
        setApplications(appsData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#06B6D4] animate-spin" />
      </div>
    );
  }

  // Helper to map status to neon badge colors
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Under Review':
        return 'text-[#EAB308] border-[#EAB308] shadow-[0_0_10px_rgba(234,179,8,0.2)]';
      case 'Interviewing':
      case 'Reviewed':
        return 'text-[#06B6D4] border-[#06B6D4] shadow-[0_0_10px_rgba(6,182,212,0.2)]';
      case 'Offer Received':
      case 'Accepted':
        return 'text-[#22C55E] border-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.2)]';
      case 'Applied':
      default:
        return 'text-gray-400 border-gray-600 shadow-[0_0_10px_rgba(156,163,175,0.1)]';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Welcome Message */}
      <div>
        <h1 className="text-3xl md:text-[34px] font-bold text-white tracking-tight flex items-center gap-3">
          Welcome back, {user?.fullName?.split(' ')[0] || 'Candidate'}! <span className="text-3xl">👋</span>
        </h1>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Applications */}
        <div className="bg-[#1a1b23]/60 backdrop-blur-md border border-white/5 rounded-[20px] p-6 relative overflow-hidden group hover:border-[#06B6D4]/30 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-[13px] text-gray-400 font-medium mb-1 tracking-wide">Applications Sent</h3>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-4xl font-bold text-white tracking-tight">{stats?.applicationsSent || 0}</span>
              </div>
              <p className="text-[13px] text-[#22C55E] font-medium mt-1">+12%</p>
            </div>
            <div className="w-10 h-10 rounded-xl border border-[#06B6D4]/40 bg-[#06B6D4]/5 flex items-center justify-center text-[#06B6D4]">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          {/* Glowing Dash */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#06B6D4] rounded-t-full shadow-[0_0_15px_#06B6D4] opacity-80" />
        </div>

        {/* Card 2: Interviews */}
        <div className="bg-[#1a1b23]/60 backdrop-blur-md border border-white/5 rounded-[20px] p-6 relative overflow-hidden group hover:border-[#06B6D4]/30 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-[13px] text-gray-400 font-medium mb-1 tracking-wide">Interviews Scheduled</h3>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-4xl font-bold text-white tracking-tight">{stats?.interviewsScheduled || 0}</span>
              </div>
              <p className="text-[13px] text-gray-500 font-medium mt-1">3 new this week</p>
            </div>
            <div className="w-10 h-10 rounded-xl border border-[#06B6D4]/40 bg-[#06B6D4]/5 flex items-center justify-center text-[#06B6D4]">
              <User className="w-5 h-5" />
            </div>
          </div>
          {/* Glowing Dash */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#06B6D4] rounded-t-full shadow-[0_0_15px_#06B6D4] opacity-80" />
        </div>

        {/* Card 3: Profile Views */}
        <div className="bg-[#1a1b23]/60 backdrop-blur-md border border-white/5 rounded-[20px] p-6 relative overflow-hidden group hover:border-[#06B6D4]/30 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-[13px] text-gray-400 font-medium mb-1 tracking-wide">Profile Views</h3>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-4xl font-bold text-white tracking-tight">
                  {stats?.profileViews > 1000 ? (stats.profileViews/1000).toFixed(1) + 'K' : (stats?.profileViews || 0)}
                </span>
              </div>
              <p className="text-[13px] text-gray-500 font-medium mt-1">0 today</p>
            </div>
            <div className="w-10 h-10 rounded-xl border border-[#06B6D4]/40 bg-[#06B6D4]/5 flex items-center justify-center text-[#06B6D4]">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          {/* Glowing Dash */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#06B6D4] rounded-t-full shadow-[0_0_15px_#06B6D4] opacity-80" />
        </div>

      </div>

      {/* Recent Applications Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white mb-2">Recent Applications</h2>
        
        <div className="bg-[#1a1b23]/80 backdrop-blur-md border border-white/10 rounded-[20px] overflow-hidden">
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No recent applications found.</p>
              <Link to="/jobs" className="text-[#06B6D4] hover:underline font-medium">Browse Jobs</Link>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[13px] text-gray-500">
                  <th className="py-4 px-6 font-medium w-[35%]">Job Title</th>
                  <th className="py-4 px-6 font-medium">Company</th>
                  <th className="py-4 px-6 font-medium">Date</th>
                  <th className="py-4 px-6 font-medium text-right pr-12">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {applications.slice(0, 5).map((app, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 shrink-0">
                          {idx % 2 === 0 ? <User className="w-4 h-4 text-yellow-500/80" /> : <Briefcase className="w-4 h-4 text-blue-400/80" />}
                        </div>
                        <span className="font-medium text-gray-200">{app.role}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {/* Fake logos using first letter if no image exists in app */}
                        <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {app.company?.[0] || 'C'}
                        </div>
                        <span className="text-gray-300 text-sm">{app.company}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-400">
                      {new Date(app.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-4 px-6 text-right pr-8">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[13px] font-medium border bg-transparent ${getStatusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
