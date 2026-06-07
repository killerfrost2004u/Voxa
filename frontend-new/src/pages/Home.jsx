import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Briefcase, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import JobCard from '../components/JobCard';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allJobs, setAllJobs] = useState([]);
  const [latestJobs, setLatestJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search States
  const [titleQuery, setTitleQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

  // Extract unique values
  const uniqueLocations = [...new Set(allJobs.map(j => j.location).filter(Boolean))];
  const uniqueTitlesAndCompanies = [...new Set([
    ...allJobs.map(j => j.title),
    ...allJobs.map(j => j.company)
  ].filter(Boolean))];

  const locationSuggestions = uniqueLocations.filter(loc => loc.toLowerCase().includes(locationQuery.toLowerCase()) && locationQuery.length > 0);
  const titleSuggestions = uniqueTitlesAndCompanies.filter(t => t.toLowerCase().includes(titleQuery.toLowerCase()) && titleQuery.length > 0);

  const handleSearch = (customTitle = titleQuery, customLocation = locationQuery) => {
    const params = new URLSearchParams();
    if (customTitle) params.append('q', customTitle);
    if (customLocation) params.append('loc', customLocation);
    navigate(`/jobs?${params.toString()}`);
  };

  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await api.getJobs(user?.email);
        setAllJobs(data);
        // Just take the first 4 jobs for the landing page
        setLatestJobs(data.slice(0, 4));
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [user]);
  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Abstract Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-voxa-cyan/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-voxa-cyan to-blue-500">Voice.</span><br />
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Career.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              The premier AI-powered recruitment platform. Get graded instantly, matched perfectly, and hired seamlessly based on your true spoken abilities.
            </p>

            {/* Search Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="glass-panel p-2 rounded-full flex flex-col md:flex-row items-center gap-2 max-w-3xl mx-auto relative z-20"
            >
              <div className="flex-1 flex items-center px-4 py-2 w-full relative">
                <Search className="text-gray-400 w-5 h-5 mr-3 flex-shrink-0" />
                <input 
                  type="text" 
                  value={titleQuery}
                  onChange={(e) => { setTitleQuery(e.target.value); setShowTitleSuggestions(true); }}
                  onFocus={() => setShowTitleSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Job title, keywords, or company" 
                  className="bg-transparent border-none outline-none text-white w-full placeholder-gray-500"
                />
                {showTitleSuggestions && titleSuggestions.length > 0 && (
                  <ul className="absolute top-full left-0 w-full mt-2 bg-[#111115] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {titleSuggestions.map(item => (
                      <li 
                        key={item} 
                        className="px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
                        onClick={() => { setTitleQuery(item); setShowTitleSuggestions(false); handleSearch(item, locationQuery); }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="hidden md:block w-px h-8 bg-white/10"></div>
              
              <div className="flex-1 flex items-center px-4 py-2 w-full border-t border-white/10 md:border-none mt-2 md:mt-0 relative">
                <MapPin className="text-gray-400 w-5 h-5 mr-3 flex-shrink-0" />
                <input 
                  type="text" 
                  value={locationQuery}
                  onChange={(e) => { setLocationQuery(e.target.value); setShowLocationSuggestions(true); }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="City, country, or remote" 
                  className="bg-transparent border-none outline-none text-white w-full placeholder-gray-500"
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <ul className="absolute top-full left-0 w-full mt-2 bg-[#111115] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {locationSuggestions.map(item => (
                      <li 
                        key={item} 
                        className="px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
                        onClick={() => { setLocationQuery(item); setShowLocationSuggestions(false); handleSearch(titleQuery, item); }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button onClick={() => handleSearch()} className="btn-primary w-full md:w-auto mt-2 md:mt-0 flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> Search
              </button>
            </motion.div>

            {/* Quick Tags */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm"
            >
              <span className="text-gray-400">Popular:</span>
              {['Remote', 'Customer Service', 'Tech Support', 'Bilingual'].map(tag => (
                <button 
                  key={tag} 
                  onClick={() => handleSearch(tag, '')}
                  className="px-3 py-1 rounded-full border border-white/10 hover:border-voxa-cyan hover:text-voxa-cyan transition-colors text-gray-300"
                >
                  {tag}
                </button>
              ))}
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* Latest Opportunities Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Latest Opportunities</h2>
            <p className="text-gray-400">Discover recently posted roles that match your skills.</p>
          </div>
          <button onClick={() => navigate('/jobs')} className="hidden md:flex items-center gap-2 text-voxa-cyan hover:text-white transition-colors font-medium">
            View All Jobs <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading latest opportunities...</div>
        ) : latestJobs.length > 0 ? (
          <div className="flex flex-col gap-4">
            {latestJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass-panel rounded-2xl border-white/10 text-gray-400">
            No opportunities available at the moment.
          </div>
        )}
        
        <button onClick={() => navigate('/jobs')} className="md:hidden mt-8 w-full btn-primary flex items-center justify-center gap-2">
          View All Jobs <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
