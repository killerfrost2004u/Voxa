import React, { useState, useEffect } from 'react';
import { Briefcase, Loader2, Search, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export default function CandidateApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      if (!user?.email) return;
      try {
        const appsData = await api.getCandidateApplications(user.email);
        setApplications(appsData);
      } catch (err) {
        console.error("Failed to fetch applications:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-voxa-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">My Applications</h1>
        <p className="text-gray-400">Track and manage all your job applications in one place.</p>
      </div>

      <div className="bg-[#111115] border border-white/5 rounded-2xl p-6">
        {applications.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-xl border border-white/5 border-dashed">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-3">No applications yet</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-8">Start browsing our active jobs and apply to the roles that best fit your skills. Your journey starts here!</p>
            <Link to="/jobs" className="inline-flex items-center gap-2 px-8 py-3 bg-voxa-purple hover:bg-voxa-purple/90 text-white rounded-xl transition-all font-medium text-lg">
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-sm text-gray-400">
                  <th className="pb-4 font-medium pl-4">Job Role</th>
                  <th className="pb-4 font-medium">Applied Date</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">AI Feedback</th>
                  <th className="pb-4 font-medium">Human Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {applications.map((app, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors group">
                    <td className="py-5 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white font-bold shrink-0 group-hover:bg-voxa-purple/20 transition-colors">
                          {app.company?.[0] || 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-white">{app.role}</div>
                          <div className="text-sm text-gray-400">{app.company}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 text-gray-300">
                      {new Date(app.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-block
                        ${app.status === 'Under Review' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                          app.status === 'Reviewed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                          app.status === 'Accepted' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          'bg-red-500/10 text-red-400 border-red-500/20'}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="py-5">
                       <span className="text-sm text-gray-300">{app.AI_Rating || 'Pending'}</span>
                    </td>
                    <td className="py-5 pr-4">
                      <span className="text-sm text-gray-400 truncate block max-w-[200px]">
                        {app.ValidatorFeedback || 'No feedback yet'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
