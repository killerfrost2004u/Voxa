import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Trash2, Edit } from 'lucide-react';
import { api } from '../../services/api';

export default function JobsManager() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const initialForm = {
    companyName: '', jobTitle: '', accountType: '', type: 'Full Time', location: '',
    salaryPackage: '', status: 'Active', workingHours: '', training: '',
    offerDetails: '', requiresSecondLanguage: 0, languageRequirement: 'English Only', targetLanguage: '', interviewType: 'Onsite Interview',
    minEnglishLevel: 'B2', minSecondLangLevel: '', maxAge: 35,
    nationalityReq: 'All Nationalities', graduationReq: 'Graduates Only', minExperience: '0'
  };
  const [formData, setFormData] = useState(initialForm);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getJobs();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleCreateOrUpdateJob = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // We use PUT /api/admin/jobs/:id
        const response = await fetch(`/api/admin/jobs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error('Failed to update job');
      } else {
        await api.admin.createJob(formData);
      }
      setIsModalOpen(false);
      setEditingId(null);
      loadJobs();
      setFormData(initialForm);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditClick = (job) => {
    setEditingId(job.JobID);
    setFormData({
      companyName: job.CompanyName || '',
      jobTitle: job.JobTitle || '',
      accountType: job.AccountType || '',
      type: job.type || 'Full Time',
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

  const handleDeleteJob = async (id) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await api.admin.deleteJob(id);
        loadJobs();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search jobs..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-voxa-cyan text-white"
          />
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData(initialForm);
            setIsModalOpen(true);
          }}
          className="btn-primary py-2 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Create Job
        </button>
      </div>

      {/* Jobs Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Job Title</th>
                <th className="px-6 py-4 font-medium">Company</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading jobs...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No jobs found.</td></tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.JobID} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{job.JobTitle}</td>
                    <td className="px-6 py-4 text-gray-300">{job.CompanyName}</td>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Company Name *</label>
                  <input type="text" required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
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
                  <label className="block text-xs text-gray-400 mb-1">Account Type</label>
                  <input type="text" value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value})} placeholder="e.g. Cold Calling, Customer Care" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
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
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Offer Details / Description</label>
                  <textarea rows="3" value={formData.offerDetails} onChange={e => setFormData({...formData, offerDetails: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Training Details</label>
                  <input type="text" value={formData.training} onChange={e => setFormData({...formData, training: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="btn-primary py-2 px-6 text-sm">{editingId ? 'Update Job' : 'Save Job'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
