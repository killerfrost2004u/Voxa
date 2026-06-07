import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Building2, MapPin, DollarSign, Clock, Star } from 'lucide-react';

export default function CompanyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCompany() {
      try {
        const data = await api.getPublicCompanyDetails(id, user?.email);
        setCompany(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCompany();
  }, [id, user?.email]);

  const handleSaveCompany = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setSaving(true);
      const res = await api.candidate.toggleSavedCompany(company.id, user.email);
      setCompany(prev => ({ ...prev, isSaved: res.saved }));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-28 pb-20 flex items-center justify-center">
      <div className="text-gray-400">Loading company profile...</div>
    </div>
  );

  if (error || !company) return (
    <div className="min-h-screen pt-28 pb-20 flex items-center justify-center">
      <div className="text-red-400">{error || 'Company not found'}</div>
    </div>
  );

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      {/* Company Header */}
      <div className="glass-panel p-8 rounded-3xl mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-voxa-cyan/5 to-transparent pointer-events-none" />
        
        <div className="w-32 h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_30px_rgba(0,229,255,0.1)]">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-gray-400">{company.logo}</span>
          )}
        </div>
        
        <div className="text-center md:text-left z-10 flex-1">
          <h1 className="text-4xl font-extrabold text-white mb-3">{company.name}</h1>
          <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mb-6">
            {company.description || 'This company has not added a description yet.'}
          </p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start items-center">
            <div className="bg-white/5 px-4 py-2 rounded-xl text-sm font-medium border border-white/10 text-voxa-cyan">
              {company.jobs?.length || 0} Open Positions
            </div>
            {user?.role === 'Candidate' && (
              <button
                onClick={handleSaveCompany}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  company.isSaved 
                    ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' 
                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                <Star className={`w-4 h-4 ${company.isSaved ? 'fill-yellow-400' : ''}`} />
                {company.isSaved ? 'Saved Company' : 'Save Company'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Open Jobs */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Open Roles at {company.name}</h2>
        {company.jobs && company.jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {company.jobs.map(job => (
              <div key={job.id} className="glass-panel p-6 rounded-2xl flex flex-col hover:border-voxa-cyan/30 transition-colors cursor-pointer" onClick={() => { if(!user) { navigate('/signup'); return; } navigate(`/apply/${job.id}`); }}>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-voxa-cyan transition-colors">{job.title}</h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-300 mb-6">
                  <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/5"><MapPin className="w-3 h-3" /> {job.location || 'Remote'}</span>
                  <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/5"><DollarSign className="w-3 h-3 text-green-400" /> {job.salary || 'Competitive'}</span>
                  <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/5"><Clock className="w-3 h-3 text-orange-400" /> {job.accountType || 'Full Time'}</span>
                </div>
                <button className="mt-auto py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium border border-white/10 transition-colors">
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-10 text-center rounded-2xl">
            <Building2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No open positions at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
