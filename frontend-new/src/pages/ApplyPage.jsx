import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Mic, Square, Play, Pause, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import useAudioRecorder from '../hooks/useAudioRecorder';
import { api } from '../services/api';
import DateOfBirthSelector from '../components/DateOfBirthSelector';
import { useApplicationForm } from '../hooks/useApplicationForm';

export default function ApplyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  
  // Audio Recorder Hook (60s minimum)
  const {
    isRecording, isPaused, recordingTime, audioBlob, error: audioError,
    startRecording, pauseRecording, resumeRecording, stopRecording, cancelRecording, setAudioBlob
  } = useAudioRecorder(60);

  // Form Custom Hook
  const { 
    formData, handleChange, handleSubmit, loading, error, setError, success, saveToProfile, setSaveToProfile 
  } = useApplicationForm(job, audioBlob);

  const vnInputRef = React.useRef(null);

  // Fetch Job details
  useEffect(() => {
    async function fetchJob() {
      try {
        const data = await api.getJobDetails(id);
        setJob(data);
      } catch (err) {
        setError('Failed to load job details. It may have been removed.');
      } finally {
        setLoadingJob(false);
      }
    }
    if (id) fetchJob();
  }, [id]);

  const handleVNUploadChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => {
      if (audio.duration < 60) {
        setError('Uploaded audio must be at least 1 minute long.');
        e.target.value = ''; // reset input
      } else {
        setError('');
        setAudioBlob(file);
      }
    };
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
    } catch (err) {
      // Handled by hook's internal error state
    }
  };

  if (loadingJob) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-voxa-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center border border-white/10 shadow-2xl">
          <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Application Sent!</h3>
          <p className="text-gray-400 text-sm">Your AI Voice Note is being analyzed.</p>
        </motion.div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Job Not Found</h2>
        <p className="text-gray-400 mb-6">{error || 'The job you are looking for does not exist.'}</p>
        <button onClick={() => navigate('/jobs')} className="btn-primary px-6 py-2">Back to Jobs</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex items-start justify-center">
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="w-full max-w-4xl flex flex-col gap-8"
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold text-white mb-2">Apply for {job.title || job.JobTitle}</h2>
          <p className="text-gray-400">{job.company || job.CompanyName}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Form Fields */}
          <div className="space-y-8">
            
            {/* Personal Details */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
              <h3 className="font-bold text-lg text-white border-b border-white/10 pb-2">Personal Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Your Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">Email Address *</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="email@example.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">National ID *</label>
                  <input type="text" name="nationalId" required value={formData.nationalId} onChange={handleChange} placeholder="14-digit ID" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">Nationality *</label>
                  <input type="text" name="nationality" required value={formData.nationality} onChange={handleChange} placeholder="Egyptian" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
                </div>

                <DateOfBirthSelector formData={formData} handleChange={handleChange} />
                
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Address (Egypt) *</label>
                  <input type="text" name="address" required value={formData.address} onChange={handleChange} placeholder="Street, City, Governorate" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">Phone (Calls) *</label>
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="01xxxxxxxxx" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">WhatsApp Number *</label>
                  <input type="tel" name="whatsapp" required value={formData.whatsapp} onChange={handleChange} placeholder="01xxxxxxxxx" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
                </div>
              </div>
            </div>

            {/* Education & Status */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
              <h3 className="font-bold text-lg text-white border-b border-white/10 pb-2">Education & Status</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">Gender *</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                    <option value="" className="bg-[#0F0F12]">Select Gender</option>
                    <option value="Male" className="bg-[#0F0F12]">Male</option>
                    <option value="Female" className="bg-[#0F0F12]">Female</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">Graduation Status *</label>
                  <select name="gradStatus" value={formData.gradStatus} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                    <option value="" className="bg-[#0F0F12]">Select Status</option>
                    <option value="Grad" className="bg-[#0F0F12]">Grad</option>
                    <option value="UnderGrad" className="bg-[#0F0F12]">UnderGrad</option>
                    <option value="DropOut" className="bg-[#0F0F12]">DropOut</option>
                    <option value="Gap Year" className="bg-[#0F0F12]">Gap Year</option>
                  </select>
                </div>

                {formData.gradStatus && formData.gradStatus !== 'Grad' && (
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Faculty & University *</label>
                    <input type="text" name="faculty" required value={formData.faculty} onChange={handleChange} placeholder="e.g. Cairo University" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none" />
                  </div>
                )}

                {formData.gradStatus === 'Grad' && formData.gender === 'Male' && (
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Military Status *</label>
                    <select name="militaryStatus" value={formData.militaryStatus} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
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
            <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
              <h3 className="font-bold text-lg text-white border-b border-white/10 pb-2">Experience</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">Years of Experience *</label>
                  <select name="experience" value={formData.experience} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                    <option value="" className="bg-[#0F0F12]">Select Experience</option>
                    <option value="0" className="bg-[#0F0F12]">No Experience</option>
                    <option value="0-1 Years" className="bg-[#0F0F12]">0-1 Years</option>
                    <option value="1-3 Years" className="bg-[#0F0F12]">1-3 Years</option>
                    <option value="3-5 Years" className="bg-[#0F0F12]">3-5 Years</option>
                    <option value="5+ Years" className="bg-[#0F0F12]">5+ Years</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">English Level *</label>
                  <select name="english" value={formData.english} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none">
                    <option value="B1" className="bg-[#0F0F12]">B1</option>
                    <option value="B2" className="bg-[#0F0F12]">B2</option>
                    <option value="C1" className="bg-[#0F0F12]">C1</option>
                    <option value="Fluent" className="bg-[#0F0F12]">Fluent</option>
                  </select>
                </div>
                {formData.experience && formData.experience !== '0' && (
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Relevant Experience Details *</label>
                    <textarea name="experienceDetails" required value={formData.experienceDetails} onChange={handleChange} placeholder="Briefly list companies or roles..." rows="3" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-voxa-cyan outline-none resize-none" />
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Voice Record & Submit */}
          <div className="space-y-8 flex flex-col">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl flex-1 flex flex-col">
              <h3 className="font-bold text-lg text-white border-b border-white/10 pb-2 mb-6">Voice Introduction (Min 1m.) *</h3>
              <p className="text-sm text-gray-400 text-center mb-6">
                {job?.languageRequirement === 'English + Second Language' 
                  ? `Please introduce yourself and your experience in English and ${job.targetLanguage || 'the required second language'}.`
                  : job?.languageRequirement === 'Other Language Only' 
                    ? `Please introduce yourself and your experience in ${job.targetLanguage || 'the required language'} (Not English).`
                    : 'Please introduce yourself and your experience in English.'
                }
              </p>
              
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden">
                {!isRecording && !audioBlob && (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-voxa-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-voxa-cyan/30 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                      <Mic className="w-10 h-10 text-voxa-cyan" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <button type="button" onClick={startRecording} className="btn-primary py-3 px-8 rounded-full text-lg shadow-[0_0_15px_rgba(0,229,255,0.2)] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)]">
                        Tap mic to start
                      </button>
                      <div className="flex items-center gap-4 py-2">
                        <div className="flex-1 border-t border-white/10"></div>
                        <span className="text-gray-500 text-sm">OR</span>
                        <div className="flex-1 border-t border-white/10"></div>
                      </div>
                      <button type="button" onClick={() => vnInputRef.current?.click()} className="py-3 px-8 rounded-full border border-white/10 text-white hover:bg-white/5 transition-all text-sm font-medium flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" /> Upload Audio File
                      </button>
                      <input type="file" ref={vnInputRef} accept="audio/*" className="hidden" onChange={handleVNUploadChange} />
                    </div>
                  </div>
                )}

                {isRecording && (
                  <div className="text-center w-full space-y-6">
                    <div className="text-5xl font-mono font-light text-voxa-cyan tracking-wider drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                      {formatTime(recordingTime)}
                    </div>
                    <p className="text-sm text-gray-400">Target: 01:00</p>
                    
                    {/* Progress Bar for Minimum 60s */}
                    <div className="w-full max-w-xs mx-auto bg-white/10 h-2 rounded-full overflow-hidden mt-4">
                      <div 
                        className={`h-full transition-all duration-1000 ${recordingTime >= 60 ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'bg-voxa-cyan shadow-[0_0_10px_rgba(0,229,255,0.8)]'}`} 
                        style={{ width: `${Math.min((recordingTime / 60) * 100, 100)}%` }} 
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {recordingTime < 60 ? `${60 - recordingTime}s left to reach minimum` : 'Minimum reached! You can stop anytime.'}
                    </p>

                    <div className="flex items-center justify-center gap-6 mt-8">
                      {isPaused ? (
                        <button type="button" onClick={resumeRecording} className="w-14 h-14 flex items-center justify-center bg-yellow-500 text-black hover:bg-yellow-400 rounded-full transition-colors shadow-lg"><Play className="w-6 h-6 ml-1" fill="currentColor" /></button>
                      ) : (
                        <button type="button" onClick={pauseRecording} className="w-14 h-14 flex items-center justify-center bg-yellow-500 text-black hover:bg-yellow-400 rounded-full transition-colors shadow-lg"><Pause className="w-6 h-6" fill="currentColor" /></button>
                      )}
                      
                      <button 
                        type="button"
                        onClick={handleStopRecording} 
                        className="w-16 h-16 flex items-center justify-center bg-red-500 text-white hover:bg-red-400 rounded-full transition-colors shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                      >
                        <Square className="w-6 h-6" fill="currentColor" />
                      </button>
                    </div>
                  </div>
                )}

                {audioBlob && !isRecording && (
                  <div className="text-center w-full space-y-4 z-10 relative">
                    <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-500/30">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-white">Ready to Submit</h4>
                    <p className="text-sm text-gray-400">Your voice note has been captured.</p>
                    
                    <audio src={URL.createObjectURL(audioBlob)} controls className="w-full mt-6 mb-4 h-12 rounded-full" />

                    <button type="button" onClick={cancelRecording} className="text-sm text-red-400 hover:text-red-300 underline font-medium">Delete and Record Again</button>
                  </div>
                )}
              </div>

              {audioError && (
                <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{audioError}</p>
                </div>
              )}
              {error && (
                <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* Submit Section */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2 px-2">
                <input type="checkbox" id="saveProfile" checked={saveToProfile} onChange={(e) => setSaveToProfile(e.target.checked)} className="accent-voxa-cyan w-4 h-4 rounded cursor-pointer" />
                <label htmlFor="saveProfile" className="text-sm text-gray-300 cursor-pointer">Save to profile for Quick Apply next time</label>
              </div>
              
              <div className="flex gap-4 mt-2">
                <button type="button" onClick={() => navigate(-1)} disabled={loading} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all font-medium">
                  Cancel
                </button>
                <button type="button" onClick={handleSubmit} disabled={loading || isRecording || !audioBlob} className="flex-[2] btn-primary py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 text-lg shadow-[0_0_15px_rgba(0,229,255,0.2)] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)]">
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
