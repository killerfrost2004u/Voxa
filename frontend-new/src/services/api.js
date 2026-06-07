import { authApi } from './auth.api';
import { fetchClient } from './httpClient';

export const api = {
  // --- Authentication ---
  ...authApi,

  // --- Profile Uploads ---
  uploadProfilePic: (formData) => 
    fetchClient('/api/profile/upload', { method: 'POST', body: formData }),

  uploadResume: (formData) => 
    fetchClient('/api/profile/upload-resume', { method: 'POST', body: formData }),

  uploadDefaultVN: (formData) => 
    fetchClient('/api/profile/upload-vn', { method: 'POST', body: formData }),

  getProfileData: (email) => 
    fetchClient(`/api/profile?email=${encodeURIComponent(email)}`),

  updateProfileData: (data) => 
    fetchClient('/api/profile/update', { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),

  // --- Candidate Specific ---
  getCandidateStats: (email) => 
    fetchClient(`/api/candidate/stats?email=${encodeURIComponent(email)}`),

  getCandidateApplications: (email) => 
    fetchClient(`/api/candidate/applications?email=${encodeURIComponent(email)}`),

  candidate: {
    toggleSavedJob: (jobId, email) => 
      fetchClient('/api/candidate/saved-jobs/toggle', { 
        method: 'POST', 
        body: JSON.stringify({ jobId, email }) 
      }),

    getSavedJobs: (email) => 
      fetchClient(`/api/candidate/saved-jobs?email=${encodeURIComponent(email)}`),

    toggleSavedCompany: (companyId, email) => 
      fetchClient('/api/candidate/saved-companies/toggle', { 
        method: 'POST', 
        body: JSON.stringify({ companyId, email }) 
      }),

    getSavedCompanies: (email) => 
      fetchClient(`/api/candidate/saved-companies?email=${encodeURIComponent(email)}`),

    quickApply: (formData) => 
      fetchClient('/api/candidate/quick-apply', { method: 'POST', body: formData })
  },

  // --- Jobs ---
  getJobs: (email = null) => {
    const url = email ? `/api/jobs?email=${encodeURIComponent(email)}` : '/api/jobs';
    return fetchClient(url);
  },
  
  getJobDetails: (id, email = null) => {
    const url = email ? `/api/jobs/${id}?email=${encodeURIComponent(email)}` : `/api/jobs/${id}`;
    return fetchClient(url);
  },

  applyForJob: (formData) => 
    fetchClient('/api/apply', { method: 'POST', body: formData }),

  // --- Companies & Salaries (Public) ---
  getPublicCompanies: () => fetchClient('/api/companies'),

  getPublicCompanyDetails: (id, email = null) => {
    const url = email ? `/api/companies/${id}?email=${encodeURIComponent(email)}` : `/api/companies/${id}`;
    return fetchClient(url);
  },

  getPublicSalaries: () => fetchClient('/api/salaries'),

  // --- Admin ---
  admin: {
    getStats: () => fetchClient('/api/admin/stats'),
    
    getJobs: (companyId = null) => {
      const url = companyId ? `/api/admin/jobs?companyId=${companyId}` : '/api/admin/jobs';
      return fetchClient(url);
    },
    
    createJob: (data) => 
      fetchClient('/api/admin/jobs', { method: 'POST', body: JSON.stringify(data) }),
      
    deleteJob: (id) => 
      fetchClient(`/api/admin/jobs/${id}`, { method: 'DELETE' }),

    getCandidateApplications: (email) => 
      fetchClient(`/api/candidate/applications?email=${encodeURIComponent(email)}`),

    // Notifications & Messages
    getNotifications: (email) => 
      fetchClient(`/api/notifications?email=${encodeURIComponent(email)}`),

    markNotificationsRead: (email) => 
      fetchClient(`/api/notifications/read`, { method: 'PUT', body: JSON.stringify({ email }) }),

    getMessages: (email) => 
      fetchClient(`/api/messages?email=${encodeURIComponent(email)}`),

    sendMessage: (sender, receiver, content) => 
      fetchClient(`/api/messages`, { method: 'POST', body: JSON.stringify({ sender, receiver, content }) }),

    getApplications: (email) => 
      fetchClient(`/api/admin/applications?email=${encodeURIComponent(email)}`),

    // Companies
    getCompanies: () => fetchClient('/api/admin/companies'),
    
    createCompany: (data) => 
      fetchClient('/api/admin/companies', { method: 'POST', body: JSON.stringify(data) }),
      
    updateCompany: (id, data) => 
      fetchClient(`/api/admin/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      
    deleteCompany: (id) => 
      fetchClient(`/api/admin/companies/${id}`, { method: 'DELETE' }),
      
    updateApplicationStatus: (id, status) => 
      fetchClient(`/api/admin/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
  }
};
