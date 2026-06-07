import React, { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, PlayCircle, XCircle, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ApplicationsManager() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState(null); // { url, name }
  const [expandedId, setExpandedId] = useState(null);

  const loadApplications = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const data = await api.admin.getApplications(user.email);
      setApplications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadApplications();
    }
  }, [user]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.admin.updateApplicationStatus(id, status);
      // Optimistic UI update
      setApplications(apps => apps.map(app => app.ApplicationID === id ? { ...app, FinalStatus: status } : app));
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepted': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'Rejected': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'Shortlisted': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  const copyPanel = (app) => {
    const text = `Name: ${app.FullName || 'N/A'}
Email: ${app.Email || 'N/A'}
Phone: ${app.Phone || 'N/A'}
WhatsApp: ${app.WhatsApp || 'N/A'}
Age: ${app.DateOfBirth ? new Date().getFullYear() - new Date(app.DateOfBirth).getFullYear() : 'N/A'}
Experience: ${app.Experience || 'N/A'}
English Level: ${app.EnglishLevel || 'N/A'}
Status: ${app.Status || 'N/A'}`;
    navigator.clipboard.writeText(text);
    alert('Candidate panel copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search candidates by name or email..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-voxa-cyan text-white"
          />
        </div>
      </div>

      {/* Applications Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Candidate</th>
                <th className="px-6 py-4 font-medium">Applied For</th>
                <th className="px-6 py-4 font-medium">AI Score</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading applications...</td></tr>
              ) : applications.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No applications found.</td></tr>
              ) : (
                applications.map(app => (
                  <React.Fragment key={app.ApplicationID}>
                  <tr className={`hover:bg-white/5 transition-colors cursor-pointer ${expandedId === app.ApplicationID ? 'bg-white/5' : ''}`} onClick={() => setExpandedId(expandedId === app.ApplicationID ? null : app.ApplicationID)}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{app.FullName}</div>
                      <div className="text-gray-400 text-xs">{app.Email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300">{app.JobTitle}</div>
                      <div className="text-gray-500 text-xs">{app.Company}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-voxa-cyan">
                        {app.EnglishScore ? `${app.EnglishScore}%` : 'Pending AI'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(app.FinalStatus)}`}>
                        {app.FinalStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {app.VoiceRecordPath && (
                          <button 
                            onClick={() => setPlayingAudio({ url: `/uploads/${app.VoiceRecordPath}`, name: app.FullName })}
                            title="Play Recording" 
                            className="p-1.5 rounded-lg bg-voxa-cyan/10 text-voxa-cyan hover:bg-voxa-cyan/20 transition-colors"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button title="Approve" onClick={() => handleUpdateStatus(app.ApplicationID, 'Accepted')} className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button title="Reject" onClick={() => handleUpdateStatus(app.ApplicationID, 'Rejected')} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          <UserX className="w-4 h-4" />
                        </button>
                        <div className="ml-2 text-gray-500">
                          {expandedId === app.ApplicationID ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row */}
                  <AnimatePresence>
                    {expandedId === app.ApplicationID && (
                      <tr>
                        <td colSpan="5" className="px-0 py-0 border-b border-white/5">
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-black/20 overflow-hidden"
                          >
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              <div>
                                <h4 className="text-xs text-gray-500 uppercase font-semibold mb-2">Contact Info</h4>
                                <p className="text-sm text-gray-300"><strong>Phone:</strong> {app.Phone || 'N/A'}</p>
                                <p className="text-sm text-gray-300"><strong>WhatsApp:</strong> {app.WhatsApp || 'N/A'}</p>
                                <p className="text-sm text-gray-300"><strong>Email:</strong> {app.Email || 'N/A'}</p>
                              </div>
                              <div>
                                <h4 className="text-xs text-gray-500 uppercase font-semibold mb-2">Details</h4>
                                <p className="text-sm text-gray-300"><strong>Age:</strong> {app.DateOfBirth ? new Date().getFullYear() - new Date(app.DateOfBirth).getFullYear() : 'N/A'}</p>
                                <p className="text-sm text-gray-300"><strong>Experience:</strong> {app.Experience || 'N/A'}</p>
                                <p className="text-sm text-gray-300"><strong>English Level:</strong> {app.EnglishLevel || 'N/A'}</p>
                              </div>
                              <div className="flex items-center justify-start lg:justify-end">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); copyPanel(app); }}
                                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                  <Copy className="w-4 h-4" />
                                  Copy Panel Data
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Audio Player */}
      <AnimatePresence>
        {playingAudio && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 glass-panel p-4 rounded-2xl border border-voxa-cyan/30 shadow-[0_0_20px_rgba(0,229,255,0.15)] flex flex-col gap-2 z-50 w-80"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-white">
                Listening to: <span className="text-voxa-cyan">{playingAudio.name}</span>
              </span>
              <button onClick={() => setPlayingAudio(null)} className="text-gray-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <audio src={playingAudio.url} autoPlay controls className="w-full h-10 mt-2" />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
