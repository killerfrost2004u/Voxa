import React, { useState, useRef } from 'react';
import { Save, Lock, User, Bell, Eye, EyeOff, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function SettingsManager() {
  const { user, loginContext } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  const fileInputRef = useRef(null);
  const [uploadingPic, setUploadingPic] = useState(false);

  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', user.email || user.Email);
    
    setUploadingPic(true);
    try {
      const data = await api.uploadProfilePic(formData);
      // Update context directly
      const updatedUser = { ...user, profilePic: data.url };
      loginContext(updatedUser);
    } catch (err) {
      alert(err.message || 'Failed to upload profile picture.');
    } finally {
      setUploadingPic(false);
    }
  };

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPwdError('');

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }
    
    if (newPassword.length < 8) return setPwdError('New password must be at least 8 characters long.');
    if (!/[A-Z]/.test(newPassword)) return setPwdError('New password must contain at least one uppercase letter.');
    if (!/[a-z]/.test(newPassword)) return setPwdError('New password must contain at least one lowercase letter.');
    if (!/[0-9]/.test(newPassword)) return setPwdError('New password must contain at least one number.');
    if (!/[!@#$%^&*]/.test(newPassword)) return setPwdError('New password must contain at least one special character (!@#$%^&*).');

    alert('Password successfully updated!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 space-y-1">
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-white/10 text-white border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
            <User className="w-5 h-5" /> Profile
          </button>
          <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-white/10 text-white border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
            <Lock className="w-5 h-5" /> Security
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-white/10 text-white border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
            <Bell className="w-5 h-5" /> Notifications
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 glass-panel p-8 rounded-2xl border border-white/5 shadow-2xl">
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-white mb-4">Profile Information</h2>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 border-white/20 flex items-center justify-center">
                    {user?.profilePic ? (
                      <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl text-gray-400 uppercase">{user?.fullName?.[0] || user?.email?.[0] || 'U'}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPic}
                    className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity disabled:cursor-not-allowed"
                  >
                    {uploadingPic ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-voxa-cyan border-t-transparent"></div> : <Camera className="w-6 h-6 text-white" />}
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfilePicChange} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{user?.fullName || 'User'}</h3>
                  <p className="text-sm text-gray-400">Click the avatar to update your picture</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                  <input type="email" value={user?.Email || user?.email || 'admin@voxa.com'} disabled className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-gray-400 cursor-not-allowed" />
                  <p className="text-xs text-gray-500 mt-1">Your email address cannot be changed.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                  <input type="text" value={user?.Role || user?.role || 'Admin'} disabled className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-gray-400 cursor-not-allowed" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-white mb-4">Change Password</h2>
              {pwdError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {pwdError}
                </div>
              )}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
                  <div className="relative">
                    <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-voxa-cyan outline-none transition-colors pr-12" />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none">
                      {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                  <div className="relative">
                    <input type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-voxa-cyan outline-none transition-colors pr-12" />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none">
                      {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-voxa-cyan outline-none transition-colors pr-12" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none">
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" className="btn-primary py-2 px-6 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-white mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-voxa-cyan focus:ring-voxa-cyan/50 bg-black/20" />
                  <div>
                    <h4 className="font-medium text-white">Email Notifications</h4>
                    <p className="text-xs text-gray-400">Receive daily summaries of new applications.</p>
                  </div>
                </label>
                <label className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-voxa-cyan focus:ring-voxa-cyan/50 bg-black/20" />
                  <div>
                    <h4 className="font-medium text-white">System Alerts</h4>
                    <p className="text-xs text-gray-400">Get notified about critical system updates.</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
