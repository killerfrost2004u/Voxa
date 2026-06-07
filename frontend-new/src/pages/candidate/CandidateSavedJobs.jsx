import React, { useState, useEffect } from 'react';
import { Bookmark, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import JobCard from '../../components/JobCard';

export default function CandidateSavedJobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('jobs');
  const [savedJobs, setSavedJobs] = useState([]);
  const [savedCompanies, setSavedCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSavedItems() {
      if (!user?.email) return;
      try {
        const [jobs, companies] = await Promise.all([
          api.candidate.getSavedJobs(user.email),
          api.candidate.getSavedCompanies(user.email)
        ]);
        setSavedJobs(jobs);
        setSavedCompanies(companies);
      } catch (err) {
        console.error('Failed to fetch saved items:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSavedItems();
  }, [user]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading saved jobs...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Saved Jobs</h1>
        <p className="text-gray-400">Keep track of the opportunities you are interested in.</p>
      </div>

      <div className="flex items-center gap-4 border-b border-white/10 pb-4 mb-6">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-4 -mb-[17px] text-lg font-medium transition-colors border-b-2 ${activeTab === 'jobs' ? 'border-voxa-cyan text-voxa-cyan' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Saved Jobs <span className="ml-2 bg-white/10 px-2 py-0.5 rounded-full text-xs">{savedJobs.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('companies')}
          className={`pb-4 -mb-[17px] text-lg font-medium transition-colors border-b-2 ${activeTab === 'companies' ? 'border-voxa-cyan text-voxa-cyan' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Saved Companies <span className="ml-2 bg-white/10 px-2 py-0.5 rounded-full text-xs">{savedCompanies.length}</span>
        </button>
      </div>

      <div className="bg-[#111115] border border-white/5 rounded-2xl p-6">
        {activeTab === 'jobs' ? (
          savedJobs.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-xl border border-white/5 border-dashed">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bookmark className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-medium text-white mb-3">No saved jobs</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-8">You haven't bookmarked any jobs yet. Browse our active listings and save the ones you like to apply later!</p>
              <Link to="/jobs" className="inline-flex items-center gap-2 px-8 py-3 bg-voxa-cyan text-black hover:bg-[#00cce6] rounded-xl transition-all font-bold text-lg">
                Browse Jobs
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {savedJobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )
        ) : (
          savedCompanies.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-xl border border-white/5 border-dashed">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bookmark className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-medium text-white mb-3">No saved companies</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-8">You haven't saved any companies yet. Explore top companies and keep track of your favorites!</p>
              <Link to="/companies" className="inline-flex items-center gap-2 px-8 py-3 bg-voxa-cyan text-black hover:bg-[#00cce6] rounded-xl transition-all font-bold text-lg">
                Explore Companies
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedCompanies.map(company => (
                <div key={company.id} className="glass-panel p-6 rounded-2xl flex items-center gap-6 cursor-pointer hover:border-voxa-cyan/30 transition-colors" onClick={() => navigate(`/companies/${company.id}`)}>
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold text-voxa-cyan shrink-0">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      company.logo || company.name.substring(0,2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-voxa-cyan transition-colors">{company.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-1">{company.description || 'View company profile'}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
