import React, { useState, useEffect } from 'react';
import { MapPin, DollarSign, Clock, Building, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import QuickApplyModal from './QuickApplyModal';

export default function JobCard({ job }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(job.isSaved || false);
  const [isQuickApplyOpen, setIsQuickApplyOpen] = useState(false);

  useEffect(() => {
    setIsSaved(job.isSaved || false);
  }, [job.isSaved]);

  const handleCardClick = () => {
    navigate(`/jobs/${job.id || job.JobID}`);
  };

  const handleApplyClick = (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/signup');
      return;
    }
    navigate(`/apply/${job.id || job.JobID}`);
  };

  const handleQuickApplyClick = (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    setIsQuickApplyOpen(true);
  };

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    const previousState = isSaved;
    setIsSaved(!isSaved);
    try {
      await api.candidate.toggleSavedJob(job.id || job.JobID, user.email);
    } catch (err) {
      console.error('Failed to toggle save:', err);
      setIsSaved(previousState);
    }
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      onClick={handleCardClick}
      className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row gap-6 relative overflow-hidden group cursor-pointer"
    >
      {/* Subtle hover glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-voxa-cyan/0 to-voxa-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Logo Area */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <Link to={`/companies/${job.companyId || job.company}`} className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-bold text-voxa-cyan shadow-lg overflow-hidden block">
          {job.logoUrl ? (
            <img src={job.logoUrl} alt={job.company} className="w-full h-full object-cover" />
          ) : (
            job.logo || job.company.substring(0, 2).toUpperCase()
          )}
        </Link>
      </div>

      {/* Main Info */}
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-voxa-cyan transition-colors">{job.title}</h3>
            <div className="flex items-center text-gray-400 gap-2 mb-4 hover:text-white transition-colors w-fit" onClick={(e) => e.stopPropagation()}>
              <Building className="w-4 h-4" />
              <Link to={`/companies/${job.companyId || job.company}`} className="hover:underline">
                {job.company}
              </Link>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs text-gray-500 mb-1">Match Score</span>
            <div className="flex items-center gap-1 text-voxa-cyan font-bold bg-voxa-cyan/10 px-3 py-1 rounded-full border border-voxa-cyan/20">
              <Zap className="w-4 h-4" />
              {job.matchScore || '85%'}
            </div>
          </div>
        </div>

        {/* Badges / Meta */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-300">
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <MapPin className="w-4 h-4 text-gray-400" />
            {job.location}
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <DollarSign className="w-4 h-4 text-green-400" />
            {job.salary}
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <Clock className="w-4 h-4 text-orange-400" />
            {job.type}
          </div>
        </div>
      </div>

      {/* Mobile Match & Apply */}
      <div className="md:hidden flex justify-between items-center mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-1 text-voxa-cyan font-bold">
          <Zap className="w-4 h-4" />
          {job.matchScore || '85%'} Match
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSaveToggle} className="p-2 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Star fill={isSaved ? "currentColor" : "none"} className={isSaved ? "w-5 h-5 text-yellow-400" : "w-5 h-5 text-gray-400"} />
          </button>
          <button onClick={handleQuickApplyClick} className="bg-voxa-cyan text-black font-bold py-1.5 px-3 rounded-lg text-sm hover:bg-[#00cce6] transition-colors flex items-center gap-1 shadow-[0_0_10px_rgba(0,229,255,0.3)]">
            <Zap className="w-4 h-4" /> Quick
          </button>
          <button onClick={handleApplyClick} className="btn-primary py-1.5 px-3 text-sm">Apply</button>
        </div>
      </div>

      {/* Desktop Apply */}
      <div className="hidden md:flex gap-2 items-center z-10">
        <button onClick={handleSaveToggle} className={`p-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors ${isSaved ? 'text-yellow-400 border-yellow-400/30' : 'text-gray-400 hover:text-white'}`}>
          <Star className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} />
        </button>
        <button 
          onClick={handleQuickApplyClick}
          className="bg-voxa-cyan text-black font-bold py-2 px-4 rounded-xl flex items-center gap-1 hover:bg-[#00cce6] transition-all duration-300 shadow-[0_0_15px_rgba(0,229,255,0.3)] opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
        >
          <Zap className="w-4 h-4" /> Quick Apply
        </button>
        <button 
          onClick={handleApplyClick}
          className="btn-primary py-2 px-6 shadow-[0_0_15px_rgba(0,229,255,0.2)] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0"
        >
          Apply
        </button>
      </div>

      <QuickApplyModal 
        isOpen={isQuickApplyOpen} 
        onClose={() => setIsQuickApplyOpen(false)} 
        jobId={job.id || job.JobID} 
        jobTitle={job.title || job.JobTitle} 
      />
    </motion.div>
  );
}
