import React, { useRef, useState, useEffect } from 'react';
import { Camera, User, Lock, Save, Link as LinkIcon, FileText, Mic, Square, Play, Pause, CheckCircle2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import useAudioRecorder from '../../hooks/useAudioRecorder';

export default function CandidateProfile() {
  const { user, loginContext } = useAuth();
  const fileInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const vnInputRef = useRef(null);
  
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingVN, setUploadingVN] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const {
    isRecording, isPaused, recordingTime, audioBlob, error: audioError,
    startRecording, pauseRecording, resumeRecording, stopRecording, cancelRecording, setAudioBlob
  } = useAudioRecorder(60);

  const handleVNUploadChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => {
      if (audio.duration < 60) {
        alert('Uploaded audio must be at least 1 minute long.');
        e.target.value = ''; // reset input
      } else {
        setAudioBlob(file);
      }
    };
  };
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    nationalId: '',
    nationality: 'Egyptian',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    faculty: '',
    address: '',
    phone: '',
    whatsapp: '',
    gender: '',
    gradStatus: '',
    militaryStatus: '',
    english: 'B2',
    experience: '',
    experienceDetails: '',
    resumeUrl: '',
    linkedInUrl: '',
    defaultVoiceNote: ''
  });

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.email) return;
      try {
        const data = await api.getProfileData(user.email);
        
        let dDay = '', dMonth = '', dYear = '';
        if (data.DOB) {
          const parts = data.DOB.split('-');
          if (parts.length === 3) {
            dYear = parts[0];
            dMonth = parseInt(parts[1], 10).toString();
            dDay = parseInt(parts[2], 10).toString();
          }
        }
        
        setFormData(prev => ({
          ...prev,
          fullName: data.FullName || prev.fullName,
          nationalId: data.NationalID || '',
          nationality: data.Nationality || 'Egyptian',
          faculty: data.Faculty || '',
          address: data.Address || '',
          phone: data.Phone || '',
          whatsapp: data.WhatsApp || '',
          gender: data.Gender || '',
          gradStatus: data.GradStatus || '',
          militaryStatus: data.MilitaryStatus || '',
          english: data.EnglishLevel || 'B2',
          experience: data.Experience || '',
          experienceDetails: data.ExperienceDetails || '',
          resumeUrl: data.ResumeUrl || '',
          linkedInUrl: data.LinkedInUrl || '',
          dobDay: dDay,
          dobMonth: dMonth,
          dobYear: dYear
        }));
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fd = new FormData();
    fd.append('file', file);
    fd.append('email', user.email || user.Email);
    
    setUploadingPic(true);
    try {
      const data = await api.uploadProfilePic(fd);
      const updatedUser = { ...user, profilePic: data.url };
      loginContext(updatedUser);
    } catch (err) {
      alert(err.message || 'Failed to upload profile picture.');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleResumeChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fd = new FormData();
    fd.append('file', file);
    fd.append('email', user.email || user.Email);
    
    setUploadingResume(true);
    try {
      const data = await api.uploadResume(fd);
      setFormData(prev => ({ ...prev, resumeUrl: data.url }));
    } catch (err) {
      alert(err.message || 'Failed to upload resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleUploadVN = async () => {
    if (!audioBlob) return;
    try {
      setUploadingVN(true);
      const payload = new FormData();
      payload.append('email', user?.email);
      payload.append('voiceRecord', audioBlob, 'defaultVoiceNote.webm');
      
      const res = await api.candidate.uploadDefaultVN(payload);
      setFormData(prev => ({ ...prev, defaultVoiceNote: res.fn }));
      alert('Default Voice Note saved successfully! You can now use 1-Click Quick Apply.');
      cancelRecording();
    } catch (error) {
      console.error(error);
      alert('Failed to save Voice Note');
    } finally {
      setUploadingVN(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let dobStr = '';
      if (formData.dobYear && formData.dobMonth && formData.dobDay) {
        dobStr = `${formData.dobYear}-${formData.dobMonth.padStart(2, '0')}-${formData.dobDay.padStart(2, '0')}`;
      }
      
      const payload = {
        email: user.email,
        fullName: formData.fullName,
        nationalId: formData.nationalId,
        nationality: formData.nationality,
        dob: dobStr,
        faculty: formData.faculty,
        address: formData.address,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        gender: formData.gender,
        gradStatus: formData.gradStatus,
        militaryStatus: formData.militaryStatus,
        english: formData.english,
        experience: formData.experience,
        experienceDetails: formData.experienceDetails,
        linkedInUrl: formData.linkedInUrl
      };
      
      await api.updateProfileData(payload);
      
      // Update Context if name changed
      if (formData.fullName !== user.fullName) {
        loginContext({ ...user, fullName: formData.fullName });
      }
      
      alert("Profile updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 16 - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-voxa-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-400">Manage your personal information for Quick Apply.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || uploadingPic || uploadingResume}
          className="btn-primary flex items-center gap-2 px-6 py-2 shadow-lg disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-[#111115] border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl">
        
        {/* Avatar Section */}
        <div className="flex items-center gap-6 pb-8 border-b border-white/10">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-white/10 border-2 border-white/20 flex items-center justify-center">
              {user?.profilePic ? (
                <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-gray-400 uppercase">{user?.fullName?.[0] || user?.email?.[0] || 'C'}</span>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPic}
              className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity disabled:cursor-not-allowed"
            >
              {uploadingPic ? <div className="animate-spin rounded-full h-8 w-8 border-2 border-voxa-purple border-t-transparent"></div> : <Camera className="w-8 h-8 text-white" />}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfilePicChange} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{formData.fullName || 'Candidate'}</h3>
            <p className="text-gray-400 mb-3 text-sm">{user?.email}</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPic}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Change Picture
            </button>
          </div>
        </div>

        {/* Personal Details */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-white border-b border-white/10 pb-2">Personal Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Your Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Email Address</label>
              <input type="email" value={user?.email || ''} disabled className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-500 text-sm cursor-not-allowed outline-none" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">National ID</label>
              <input type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} placeholder="14-digit ID" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Nationality</label>
              <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} placeholder="Egyptian" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Date of Birth</label>
              <div className="flex gap-2">
                <select name="dobDay" value={formData.dobDay} onChange={handleChange} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                  <option value="" className="bg-[#0F0F12]">Day</option>
                  {days.map(d => <option key={d} value={d} className="bg-[#0F0F12]">{d}</option>)}
                </select>
                <select name="dobMonth" value={formData.dobMonth} onChange={handleChange} className="flex-[2] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                  <option value="" className="bg-[#0F0F12]">Month</option>
                  {months.map(m => <option key={m.value} value={m.value} className="bg-[#0F0F12]">{m.label}</option>)}
                </select>
                <select name="dobYear" value={formData.dobYear} onChange={handleChange} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                  <option value="" className="bg-[#0F0F12]">Year</option>
                  {years.map(y => <option key={y} value={y} className="bg-[#0F0F12]">{y}</option>)}
                </select>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Address (Egypt)</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Street, City, Governorate" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Phone (Calls)</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="01xxxxxxxxx" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">WhatsApp Number</label>
              <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="01xxxxxxxxx" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
            </div>
          </div>
        </div>

        {/* Education & Status */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-white border-b border-white/10 pb-2">Education & Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                <option value="" className="bg-[#0F0F12]">Select Gender</option>
                <option value="Male" className="bg-[#0F0F12]">Male</option>
                <option value="Female" className="bg-[#0F0F12]">Female</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Graduation Status</label>
              <select name="gradStatus" value={formData.gradStatus} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                <option value="" className="bg-[#0F0F12]">Select Status</option>
                <option value="Grad" className="bg-[#0F0F12]">Grad</option>
                <option value="UnderGrad" className="bg-[#0F0F12]">UnderGrad</option>
                <option value="DropOut" className="bg-[#0F0F12]">DropOut</option>
                <option value="Gap Year" className="bg-[#0F0F12]">Gap Year</option>
              </select>
            </div>

            {formData.gradStatus && formData.gradStatus !== 'Grad' && (
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Faculty & University</label>
                <input type="text" name="faculty" value={formData.faculty} onChange={handleChange} placeholder="e.g. Cairo University" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
              </div>
            )}

            {formData.gradStatus === 'Grad' && formData.gender === 'Male' && (
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Military Status</label>
                <select name="militaryStatus" value={formData.militaryStatus} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                  <option value="" className="bg-[#0F0F12]">Select Status</option>
                  <option value="Completed" className="bg-[#0F0F12]">Completed</option>
                  <option value="Exempted" className="bg-[#0F0F12]">Exempted</option>
                  <option value="Postponed" className="bg-[#0F0F12]">Postponed</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Experience */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-white border-b border-white/10 pb-2">Experience</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Years of Experience</label>
              <select name="experience" value={formData.experience} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                <option value="" className="bg-[#0F0F12]">Select Experience</option>
                <option value="0" className="bg-[#0F0F12]">No Experience</option>
                <option value="0-1 Years" className="bg-[#0F0F12]">0-1 Years</option>
                <option value="1-3 Years" className="bg-[#0F0F12]">1-3 Years</option>
                <option value="3-5 Years" className="bg-[#0F0F12]">3-5 Years</option>
                <option value="5+ Years" className="bg-[#0F0F12]">5+ Years</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">English Level</label>
              <select name="english" value={formData.english} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
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
            {formData.experience && formData.experience !== '0' && (
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Relevant Experience Details</label>
                <textarea name="experienceDetails" value={formData.experienceDetails} onChange={handleChange} placeholder="Briefly list companies or roles..." rows="3" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none resize-none" />
              </div>
            )}
          </div>
        </div>

        {/* Optional Attachments */}
        <div className="space-y-4">
          <div className="flex justify-between items-end border-b border-white/10 pb-2">
            <h3 className="font-bold text-lg text-white">Attachments (Optional)</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">LinkedIn Profile</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="w-4 h-4 text-gray-500" />
                </div>
                <input type="url" name="linkedInUrl" value={formData.linkedInUrl} onChange={handleChange} placeholder="https://linkedin.com/in/..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
              </div>
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Resume / CV</label>
              <div className="flex gap-2 items-center">
                <button 
                  onClick={() => resumeInputRef.current?.click()}
                  disabled={uploadingResume}
                  className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {uploadingResume ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-voxa-cyan border-t-transparent"></div>
                  ) : (
                    <FileText className="w-4 h-4 text-gray-400" />
                  )}
                  {uploadingResume ? 'Uploading...' : 'Upload PDF/Doc'}
                </button>
                <input type="file" ref={resumeInputRef} className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeChange} />
                {formData.resumeUrl && (
                  <a href={formData.resumeUrl} target="_blank" rel="noreferrer" className="text-voxa-cyan text-xs underline">View Current</a>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <h3 className="font-bold text-lg text-white mb-2 flex items-center gap-2">
              <Mic className="w-5 h-5 text-voxa-cyan" /> Default Voice Note
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Record a default 60-second voice note to unlock <strong>1-Click Quick Apply</strong>. When you have a default VN saved, you won't need to re-record it for every job!
            </p>
            
            {formData.defaultVoiceNote && !audioBlob && !isRecording && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                You have a Default Voice Note saved! 
              </div>
            )}

            <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center relative ${
                  isRecording ? 'bg-red-500/20 text-red-500' : 
                  audioBlob ? 'bg-voxa-cyan/20 text-voxa-cyan' : 'bg-white/5 text-gray-400'
                }`}>
                  {isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-20"></span>}
                  {isRecording ? <Mic className="w-6 h-6" /> : audioBlob ? <CheckCircle2 className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="text-xl font-mono text-white mb-1">{formatTime(recordingTime)}</div>
                  <div className="text-sm text-gray-400">
                    {isRecording ? 'Recording...' : audioBlob ? 'Ready to save' : formData.defaultVoiceNote ? 'Record a new one to replace' : 'Ready to record'}
                  </div>
                  {audioError && <p className="text-red-400 text-xs mt-1">{audioError}</p>}
                </div>

                {!audioBlob && (
                  <div className="flex gap-3 items-center">
                    {!isRecording && !isPaused ? (
                      <>
                        <button onClick={startRecording} className="w-12 h-12 rounded-full bg-voxa-cyan hover:bg-[#00cce6] flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(0,229,255,0.3)]" title="Record Voice Note">
                          <Mic className="w-5 h-5 text-black" />
                        </button>
                        <span className="text-gray-500 text-sm mx-1">OR</span>
                        <button onClick={() => vnInputRef.current?.click()} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="Upload Audio File">
                          <Upload className="w-5 h-5 text-white" />
                        </button>
                        <input type="file" ref={vnInputRef} accept="audio/*" className="hidden" onChange={handleVNUploadChange} />
                      </>
                    ) : (
                      <>
                        <button onClick={isPaused ? resumeRecording : pauseRecording} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white">
                          {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                        </button>
                        <button onClick={stopRecording} className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-500 flex items-center justify-center transition-colors">
                          <Square className="w-4 h-4 fill-current" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {audioBlob && (
                  <div className="flex gap-3">
                    <button onClick={cancelRecording} className="px-4 py-2 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors text-sm font-medium">
                      Discard
                    </button>
                    <button 
                      onClick={handleUploadVN} 
                      disabled={uploadingVN}
                      className="btn-primary py-2 px-4 text-sm disabled:opacity-50"
                    >
                      {uploadingVN ? 'Saving...' : 'Save Default VN'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
