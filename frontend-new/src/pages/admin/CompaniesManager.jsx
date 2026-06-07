import React, { useState, useEffect } from 'react';
import { Plus, Search, Building2, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export default function CompaniesManager() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState(null);

  const [formData, setFormData] = useState({
    name: '', logoUrl: '', description: '', status: 'Active'
  });

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCompanies(); }, []);

  const handleCreateOrUpdateCompany = async (e) => {
    e.preventDefault();
    try {
      if (editingCompanyId) {
        await api.admin.updateCompany(editingCompanyId, formData);
      } else {
        await api.admin.createCompany(formData);
      }
      setIsModalOpen(false);
      setEditingCompanyId(null);
      setFormData({ name: '', logoUrl: '', description: '', status: 'Active' });
      loadCompanies();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditClick = (comp) => {
    setEditingCompanyId(comp.CompanyID);
    setFormData({
      name: comp.Name || '',
      logoUrl: comp.LogoUrl || '',
      description: comp.Description || '',
      status: comp.Status || 'Active'
    });
    setIsModalOpen(true);
  };

  const toggleStatus = async (company) => {
    try {
      const newStatus = company.Status === 'Active' ? 'On Hold' : 'Active';
      await api.admin.updateCompany(company.CompanyID, { ...company, name: company.Name, logoUrl: company.LogoUrl, description: company.Description, status: newStatus });
      loadCompanies();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input type="text" placeholder="Search companies..." className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-voxa-cyan text-white" />
        </div>
        <button 
          onClick={() => {
            setEditingCompanyId(null);
            setFormData({ name: '', logoUrl: '', description: '', status: 'Active' });
            setIsModalOpen(true);
          }} 
          className="btn-primary py-2 flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" /> Add Company
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
           <div className="col-span-full text-center text-gray-400 py-10">Loading companies...</div>
        ) : companies.length === 0 ? (
           <div className="col-span-full text-center text-gray-400 py-10">No companies found.</div>
        ) : (
          companies.map(comp => (
            <div key={comp.CompanyID} className="glass-panel p-6 rounded-2xl flex flex-col relative group">
               <button onClick={() => toggleStatus(comp)} className={`absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full border ${comp.Status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}>
                 {comp.Status}
               </button>
               
               <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 overflow-hidden">
                 {comp.LogoUrl ? (
                   <img src={comp.LogoUrl} alt={comp.Name} className="w-full h-full object-cover" />
                 ) : (
                   <Building2 className="w-8 h-8 text-gray-500" />
                 )}
               </div>
               
               <div className="flex justify-between items-start mb-1">
                 <h3 className="text-xl font-bold text-white">{comp.Name}</h3>
                 <button onClick={() => handleEditClick(comp)} className="text-gray-400 hover:text-voxa-cyan transition-colors">
                   <Edit className="w-4 h-4" />
                 </button>
               </div>
               <p className="text-sm text-gray-400 mb-6">{comp.activeJobs} Active Jobs</p>
               
               <Link to={`/admin/companies/${comp.CompanyID}`} className="mt-auto w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center text-sm font-medium transition-colors text-white block">
                 Manage Jobs
               </Link>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">{editingCompanyId ? 'Edit Company' : 'Add New Company'}</h3>
            <form onSubmit={handleCreateOrUpdateCompany} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Company Name *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Logo URL</label>
                <input type="text" value={formData.logoUrl} onChange={e => setFormData({...formData, logoUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none" placeholder="https://example.com/logo.png" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-voxa-cyan outline-none resize-none" />
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="btn-primary w-full sm:w-auto py-2 px-6 text-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
