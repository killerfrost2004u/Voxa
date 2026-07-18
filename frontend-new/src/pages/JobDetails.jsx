import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, Clock, Building, Zap, Star, ArrowLeft, Briefcase, Globe, GraduationCap, Calendar, Languages } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import QuickApplyModal from '../components/QuickApplyModal';

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isQuickApplyOpen, setIsQuickApplyOpen] = useState(false);

  useEffect(() => {
    async function loadJob() {
      try {
        const data = await api.getJobDetails(id, user?.email);
        setJob(data);
        setIsSaved(data.isSaved || false);
      } catch (err) {
        console.error(err);
        setError('Failed to load job details. It may no longer exist.');
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [id, user]);

  const handleApply = () => {
    if (!user) {
      navigate('/signup');
      return;
    }
    navigate(`/apply/${job.id}`);
  };

  const handleQuickApplyClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsQuickApplyOpen(true);
  };

  const handleSaveToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const previousState = isSaved;
    setIsSaved(!isSaved);
    try {
      await api.candidate.toggleSavedJob(job.id, user.email);
    } catch (err) {
      console.error('Failed to toggle save:', err);
      setIsSaved(previousState);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-20 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-voxa-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen pt-28 pb-20 flex items-center justify-center flex-col gap-4">
        <p className="text-red-400 bg-red-500/10 px-6 py-3 rounded-xl border border-red-500/20">{error || 'Job not found'}</p>
        <button onClick={() => navigate('/jobs')} className="btn-secondary">Back to Jobs</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-32 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group w-fit">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Results
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-voxa-cyan/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="flex items-start gap-6 mb-6">
              <Link to={`/companies/${job.companyId || job.company}`} className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-bold text-voxa-cyan shadow-lg overflow-hidden shrink-0 hover:border-voxa-cyan/50 transition-colors">
                {(job.logoUrl || (job.logo && job.logo.startsWith('http'))) ? (
                  <img src={job.logoUrl || job.logo} alt={job.company} className="w-full h-full object-cover" />
                ) : (
                  job.company ? job.company.substring(0, 2).toUpperCase() : 'VO'
                )}
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-extrabold text-white mb-2">{job.title}</h1>
                <div className="flex flex-wrap items-center text-gray-400 gap-x-6 gap-y-2">
                  <Link to={`/companies/${job.companyId || job.company}`} className="flex items-center gap-2 hover:text-white hover:underline transition-colors">
                    <Building className="w-4 h-4" /> {job.company}
                  </Link>
                  <span className="flex items-center gap-2 text-voxa-cyan font-semibold bg-voxa-cyan/10 px-3 py-0.5 rounded-full border border-voxa-cyan/20">
                    <Zap className="w-4 h-4" /> 85% Match
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-gray-300">
                <MapPin className="w-4 h-4 text-gray-400" /> {job.location}
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-gray-300">
                <DollarSign className="w-4 h-4 text-green-400" /> {job.salary}
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-gray-300">
                <Clock className="w-4 h-4 text-orange-400" /> {job.accountType || 'Full Time'}
              </div>
            </div>
          </motion.div>

          {/* Description */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Offer Details</h2>
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap glass-panel p-6 rounded-2xl border-white/5">
              {job.description || "No detailed description provided by the company."}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel p-6 rounded-3xl sticky top-28 border-voxa-cyan/20 shadow-[0_0_30px_rgba(0,229,255,0.05)]">
            <button onClick={handleQuickApplyClick} className="w-full bg-voxa-cyan text-black font-bold py-4 text-lg shadow-[0_0_20px_rgba(0,229,255,0.3)] mb-3 rounded-2xl hover:bg-[#00cce6] transition-colors flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" /> Quick Apply 
            </button>
            <button onClick={handleApply} className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 text-lg rounded-2xl hover:bg-white/10 transition-colors mb-4">
              Regular Apply
            </button>
            <button onClick={handleSaveToggle} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border ${isSaved ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
              <Star className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} />
              {isSaved ? "Saved Job" : "Save for Later"}
            </button>

            <div className="h-px bg-white/10 my-6" />

            <h3 className="font-bold text-white mb-4">Requirements</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Languages className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-400">Language Requirement</p>
                  <p className="text-gray-200 font-medium">
                    {job.languageRequirement === 'English + Second Language' 
                      ? `English (${job.minEnglishLevel || 'Not specified'}) & ${job.targetLanguage}`
                      : job.languageRequirement === 'Other Language Only' 
                        ? `${job.targetLanguage} Only`
                        : `English Only (${job.minEnglishLevel || 'Not specified'})`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-400">Education</p>
                  <p className="text-gray-200 font-medium">{job.graduationReq || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-400">Experience</p>
                  <p className="text-gray-200 font-medium">{job.minExperience ? `${job.minExperience} Years` : 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-400">Nationality</p>
                  <p className="text-gray-200 font-medium">{job.nationalityReq || 'All Nationalities'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-400">Max Age</p>
                  <p className="text-gray-200 font-medium">{job.maxAge || 'None'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {job && (
        <QuickApplyModal 
          isOpen={isQuickApplyOpen} 
          onClose={() => setIsQuickApplyOpen(false)} 
          jobId={job.id || job.JobID} 
          jobTitle={job.title || job.JobTitle} 
        />
      )}
    </div>
  );
}
