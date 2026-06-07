import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Trash2, Edit, ChevronLeft } from 'lucide-react';
import { api } from '../../services/api';
import { useParams, Link } from 'react-router-dom';

export default function CompanyProfile() {
  const { id } = useParams();
  const [jobs, setJobs] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [unassignedJobs, setUnassignedJobs] = useState([]);
  const [selectedJobIds, setSelectedJobIds] = useState([]);

  // Form State
  const initialForm = {
    companyId: id, companyName: '', jobTitle: '', accountType: '', type: 'Full Time', location: '',
    salaryPackage: '', status: 'Active', workingHours: '', training: '',
    offerDetails: '', requiresSecondLanguage: 0, languageRequirement: 'English Only', targetLanguage: '', interviewType: 'Onsite Interview',
    minEnglishLevel: 'B2', minSecondLangLevel: '', maxAge: 35,
    nationalityReq: 'All Nationalities', graduationReq: 'Graduates Only', minExperience: '0'
  };
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, companiesData] = await Promise.all([
        api.admin.getJobs(id),
        api.admin.getCompanies()
      ]);
      setJobs(jobsData);
      const comp = companiesData.find(c => c.CompanyID.toString() === id);
      setCompany(comp);
      if (comp) {
        setFormData(prev => ({ ...prev, companyName: comp.Name }));
        initialForm.companyName = comp.Name;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCreateOrUpdateJob = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const response = await fetch(`/api/admin/jobs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error('Failed to update job');
      } else {
        await api.admin.createJob({ ...formData, companyId: id });
      }
      setIsModalOpen(false);
      setEditingId(null);
      loadData();
      setFormData(initialForm);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditClick = (job) => {
    setEditingId(job.JobID);
    setFormData({
      companyId: job.CompanyID || id,
      companyName: job.CompanyName || company?.Name || '',
      jobTitle: job.JobTitle || '',
      type: job.type || 'Full Time',
      accountType: job.AccountType || '',
      location: job.Location || '',
      salaryPackage: job.SalaryPackage || '',
      status: job.Status || 'Active',
      workingHours: job.WorkingHours || '',
      training: job.Training || '',
      offerDetails: job.OfferDetails || '',
      requiresSecondLanguage: job.RequiresSecondLanguage ? 1 : 0,
      languageRequirement: job.LanguageRequirement || 'English Only',
      targetLanguage: job.TargetLanguage || '',
      interviewType: job.InterviewType || 'Onsite Interview',
      minEnglishLevel: job.MinEnglishLevel || 'B2',
      minSecondLangLevel: job.MinSecondLangLevel || '',
      maxAge: job.MaxAge || 35,
      nationalityReq: job.NationalityReq || 'All Nationalities',
      graduationReq: job.GraduationReq || 'Graduates Only',
      minExperience: job.MinExperience || '0'
    });
    setIsModalOpen(true);
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await api.admin.deleteJob(jobId);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleOpenLinkModal = async () => {
    try {
      const allJobs = await fetch('/api/admin/jobs').then(res => res.json());
      const otherJobs = allJobs.filter(j => !j.CompanyID); // strictly unassigned
      setUnassignedJobs(otherJobs);
      setSelectedJobIds([]);
      setIsLinkModalOpen(true);
    } catch (err) {
      alert("Failed to load jobs");
    }
  };

  const handleLinkSelectedJobs = async () => {
    if (selectedJobIds.length === 0) return;
    
    const jobsToUpdate = unassignedJobs.filter(j => selectedJobIds.includes(j.JobID));
    
    try {
      await Promise.all(jobsToUpdate.map(job => 
        fetch(`/api/admin/jobs/${job.JobID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            companyId: id, 
            companyName: company?.Name || job.CompanyName, 
            jobTitle: job.JobTitle, 
            accountType: job.AccountType || 'Full Time', 
            workingHours: job.WorkingHours || '',
            salaryPackage: job.SalaryPackage || '', 
            location: job.Location || '',
            training: job.Training || '',
            offerDetails: job.OfferDetails || '',
            requiresSecondLanguage: job.RequiresSecondLanguage || 0,
            interviewType: job.InterviewType || 'Onsite Interview',
            minEnglishLevel: job.MinEnglishLevel || 'B2',
            minSecondLangLevel: job.MinSecondLangLevel || '',
            maxAge: job.MaxAge || 35,
            nationalityReq: job.NationalityReq || 'All Nationalities',
            graduationReq: job.GraduationReq || 'Graduates Only',
            minExperience: job.MinExperience || '0'
          })
        })
      ));
      
      setIsLinkModalOpen(false);
      setSelectedJobIds([]);
      loadData();
    } catch (err) {
      alert("Failed to link some jobs");
    }
  };

  const toggleJobSelection = (jobId) => {
    setSelectedJobIds(prev => 
      prev.includes(jobId) ? prev.filter(item => item !== jobId) : [...prev, jobId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2 text-gray-400 text-sm">
        <Link to="/admin/companies" className="hover:text-white transition-colors flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to Companies
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {company ? company.Name : 'Company Profile'}
            {company && (
              <span className={`text-xs px-2 py-1 rounded-full border ${company.Status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                 {company.Status}
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage jobs for this company</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button onClick={handleOpenLinkModal} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors w-full sm:w-auto flex items-center justify-center gap-2">
            Link Existing Job
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData(initialForm);
              setIsModalOpen(true);
            }}
            className="btn-primary py-2 flex items-center gap-2 w-full sm:w-auto justify-center px-4"
          >
            <Plus className="w-5 h-5" /> Add Job
          </button>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="glass-panel rounded-2xl overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium min-w-[200px]">Job Title</th>
                <th className="px-6 py-4 font-medium min-w-[150px]">Location</th>
                <th className="px-6 py-4 font-medium min-w-[120px]">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading jobs...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No jobs found for this company.</td></tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.JobID} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{job.JobTitle}</td>
                    <td className="px-6 py-4 text-gray-300">{job.Location}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.Status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {job.Status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleEditClick(job)} className="text-gray-400 hover:text-voxa-cyan transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteJob(job.JobID)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Job' : 'Create New Job'}</h3>
            <form onSubmit={handleCreateOrUpdateJob} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 hidden">
                  <input type="text" value={formData.companyName} readOnly />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Job Title *</label>
                  <input type="text" required value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Location *</label>
                  <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Salary Package *</label>
                  <input type="text" required value={formData.salaryPackage} onChange={e => setFormData({...formData, salaryPackage: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Working Hours</label>
                  <input type="text" value={formData.workingHours} onChange={e => setFormData({...formData, workingHours: e.target.value})} placeholder="e.g. 9 AM - 5 PM" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Job Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none">
                    <option value="Full Time" className="bg-[#0F0F12]">Full Time</option>
                    <option value="Part Time" className="bg-[#0F0F12]">Part Time</option>
                    <option value="Freelance" className="bg-[#0F0F12]">Freelance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Account Type</label>
                  <input type="text" value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value})} placeholder="e.g. Lead Generation" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none">
                    <option value="Active" className="bg-[#0F0F12]">Active</option>
                    <option value="Inactive" className="bg-[#0F0F12]">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Language Requirement</label>
                  <select value={formData.languageRequirement} onChange={e => setFormData({...formData, languageRequirement: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none">
                    <option value="English Only" className="bg-[#0F0F12]">English Only</option>
                    <option value="English + Second Language" className="bg-[#0F0F12]">English + Second Language</option>
                    <option value="Other Language Only" className="bg-[#0F0F12]">Other Language Only</option>
                  </select>
                </div>
                {formData.languageRequirement !== 'English Only' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Target Language(s)</label>
                    <input type="text" value={formData.targetLanguage} onChange={e => setFormData({...formData, targetLanguage: e.target.value})} placeholder="e.g. German, Spanish" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Min. English Level</label>
                  <select value={formData.minEnglishLevel} onChange={e => setFormData({...formData, minEnglishLevel: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none">
                    <option value="A1" className="bg-[#0F0F12]">A1</option>
                    <option value="A2" className="bg-[#0F0F12]">A2</option>
                    <option value="B1" className="bg-[#0F0F12]">B1</option>
                    <option value="B1+" className="bg-[#0F0F12]">B1+</option>
                    <option value="B2" className="bg-[#0F0F12]">B2</option>
                    <option value="B2+" className="bg-[#0F0F12]">B2+</option>
                    <option value="C1" className="bg-[#0F0F12]">C1</option>
                    <option value="C1+" className="bg-[#0F0F12]">C1+</option>
                    <option value="C2" className="bg-[#0F0F12]">C2</option>
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Offer Details / Description</label>
                  <textarea rows="3" value={formData.offerDetails} onChange={e => setFormData({...formData, offerDetails: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none resize-none" />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Training Details</label>
                  <input type="text" value={formData.training} onChange={e => setFormData({...formData, training: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="btn-primary w-full sm:w-auto py-2 px-6 text-sm">{editingId ? 'Update Job' : 'Save Job'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Existing Job Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4">Link Unassigned Jobs</h3>
            <p className="text-sm text-gray-400 mb-4">Select multiple unassigned jobs to move them to this company.</p>
            <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-2">
              {unassignedJobs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No unassigned jobs found.</p>
              ) : (
                unassignedJobs.map(job => (
                  <label key={job.JobID} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-white/20 text-voxa-cyan focus:ring-voxa-cyan/50 bg-black/20"
                        checked={selectedJobIds.includes(job.JobID)}
                        onChange={() => toggleJobSelection(job.JobID)}
                      />
                      <div>
                        <h4 className="font-medium text-white">{job.JobTitle}</h4>
                        <p className="text-xs text-gray-400">
                          {job.CompanyName && `${job.CompanyName} • `}{job.Location}
                        </p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-white/10 gap-3">
              <button onClick={() => setIsLinkModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button 
                onClick={handleLinkSelectedJobs} 
                disabled={selectedJobIds.length === 0}
                className="btn-primary py-2 px-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Link Selected ({selectedJobIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
