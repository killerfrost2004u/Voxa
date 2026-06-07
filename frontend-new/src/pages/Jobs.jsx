import React, { useState, useEffect } from 'react';
import FilterSidebar from '../components/FilterSidebar';
import JobCard from '../components/JobCard';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Jobs() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [locationTerm, setLocationTerm] = useState(searchParams.get('loc') || '');
  
  // Filter sidebar state
  const [jobTypes, setJobTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [minSalary, setMinSalary] = useState(0);
  
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadJobs() {
      try {
        const data = await api.getJobs(user?.email);
        // Map backend data to frontend component format
        const formattedJobs = data.map(job => {
          let derivedType = job.type || 'Full Time';
          const combinedText = `${job.title} ${job.workingHours} ${job.description} ${job.accountType}`.toLowerCase();
          
          if (combinedText.includes('part time') || combinedText.includes('part-time')) {
            derivedType = 'Part Time';
          } else if (combinedText.includes('freelance') || combinedText.includes('freelancer')) {
            derivedType = 'Freelance';
          }

          return {
            ...job,
            type: derivedType,
            matchScore: Math.floor(Math.random() * (99 - 75 + 1)) + 75 + '%' // Mock AI Match Score for now
          };
        });
        setJobs(formattedJobs);
      } catch (err) {
        setError(err.message || 'Failed to load jobs from backend.');
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, [user]);

  // Apply filters
  const filteredJobs = jobs.filter(job => {
    const searchLower = searchTerm?.toLowerCase() || '';
    const locLower = locationTerm?.toLowerCase() || '';
    
    let titleMatch = !searchTerm || 
      job.title?.toLowerCase().includes(searchLower) || 
      job.company?.toLowerCase().includes(searchLower) ||
      job.description?.toLowerCase().includes(searchLower) ||
      (job.requirements && typeof job.requirements === 'string' && job.requirements.toLowerCase().includes(searchLower));
      
    // Handle 'bilingual' specially
    if (searchLower === 'bilingual' && (job.bilingual === true || job.bilingual === 'true')) {
      titleMatch = true;
    }
      
    // Handle 'remote' or 'wfh' in main search bar
    if (searchLower === 'remote' || searchLower === 'wfh') {
      titleMatch = titleMatch || job.location?.toLowerCase().includes('remote') || job.location?.toLowerCase().includes('wfh');
    }

    let locMatch = !locationTerm || job.location?.toLowerCase().includes(locLower);
    
    // Handle 'remote' or 'wfh' in location search bar
    if (locLower === 'remote' || locLower === 'wfh') {
      locMatch = job.location?.toLowerCase().includes('remote') || job.location?.toLowerCase().includes('wfh');
    }

    // Sidebar Filters
    let typeMatch = jobTypes.length === 0 || jobTypes.some(type => 
      (job.type || '').toLowerCase().includes(type.toLowerCase())
    );

    let sidebarLocMatch = locations.length === 0;
    if (locations.length > 0) {
      const jobLoc = (job.location || '').toLowerCase();
      const isRemote = jobLoc.includes('remote') || jobLoc.includes('wfh');
      const isHybrid = jobLoc.includes('hybrid');
      const isOnSite = !isRemote && !isHybrid;
      
      if (locations.includes('Remote') && isRemote) sidebarLocMatch = true;
      if (locations.includes('Hybrid') && isHybrid) sidebarLocMatch = true;
      if (locations.includes('On-Site') && isOnSite) sidebarLocMatch = true;
    }

    let salaryMatch = true;
    if (minSalary > 0 && job.salary) {
      const salaryStr = job.salary.toString();
      let parsed = 0;
      if (salaryStr.toLowerCase().includes('k')) {
        parsed = parseInt(salaryStr) * 1000;
      } else {
        parsed = parseInt(salaryStr.replace(/\D/g, ''));
      }
      if (!isNaN(parsed) && parsed > 0) {
        if (parsed > 1000) parsed = parsed / 1000;
        if (parsed < minSalary) salaryMatch = false;
      }
    }

    return titleMatch && locMatch && typeMatch && sidebarLocMatch && salaryMatch;
  });

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Find Your Next Role</h1>
        <p className="text-gray-400">Discover opportunities that perfectly match your skills and voice.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar */}
        <div className="w-full lg:w-1/4">
          <FilterSidebar 
            jobTypes={jobTypes} setJobTypes={setJobTypes}
            locations={locations} setLocations={setLocations}
            minSalary={minSalary} setMinSalary={setMinSalary}
            onReset={() => {
              setJobTypes([]);
              setLocations([]);
              setMinSalary(0);
              setSearchTerm('');
              setLocationTerm('');
            }}
          />
        </div>

        {/* Main Feed */}
        <div className="w-full lg:w-3/4 space-y-6">
          
          {/* Mobile Filter Chips */}
          <div className="flex lg:hidden overflow-x-auto gap-3 pb-2 scrollbar-hide">
             {['Remote', 'Full Time', 'High Match', 'Customer Service', 'Tech'].map(chip => (
               <button key={chip} className="whitespace-nowrap px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-voxa-cyan hover:border-voxa-cyan transition-colors">
                 {chip}
               </button>
             ))}
          </div>

          {loading ? (
             <div className="text-center py-20">
               <div className="inline-block w-8 h-8 border-4 border-voxa-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-gray-400">Fetching live jobs from database...</p>
             </div>
          ) : error ? (
             <div className="text-center py-20 text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">{error}</div>
          ) : (
            <>
              {/* Results Header */}
              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>Showing <strong className="text-white">{filteredJobs.length}</strong> active jobs {(searchTerm || locationTerm) && 'matching search'}</span>
                <select className="bg-transparent border-none outline-none text-voxa-cyan cursor-pointer">
                  <option className="bg-voxa-bg">Sort by: Best Match</option>
                  <option className="bg-voxa-bg">Sort by: Newest</option>
                  <option className="bg-voxa-bg">Sort by: Highest Salary</option>
                </select>
              </div>

              {/* Job List */}
              <div className="space-y-4">
                {filteredJobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <JobCard job={job} />
                  </motion.div>
                ))}
              </div>
              
              {filteredJobs.length === 0 && (
                <div className="text-center py-20 glass-panel rounded-2xl border-white/5">
                  <p className="text-gray-400 text-lg">No open positions found matching your search.</p>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
