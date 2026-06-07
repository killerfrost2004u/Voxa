import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Square, Play, Pause, CheckCircle2, AlertCircle, Zap, Upload } from 'lucide-react';
import { createPortal } from 'react-dom';
import useAudioRecorder from '../hooks/useAudioRecorder';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function QuickApplyModal({ isOpen, onClose, jobId, jobTitle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const {
    isRecording, isPaused, recordingTime, audioBlob, error: audioError,
    startRecording, pauseRecording, resumeRecording, stopRecording, cancelRecording, setAudioBlob
  } = useAudioRecorder(60);

  const vnInputRef = React.useRef(null);
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasDefaultVN, setHasDefaultVN] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (isOpen && user?.email) {
      setCheckingProfile(true);
      api.getProfileData(user.email)
        .then(data => {
          setHasDefaultVN(!!data.DefaultVoiceNote);
        })
        .catch(err => console.error(err))
        .finally(() => setCheckingProfile(false));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
    } catch (err) {
      // Handled by hook
    }
  };

  const handleSubmit = async (useDefault = false) => {
    if (!useDefault && !audioBlob) {
      setError('Please record a Voice Note before applying.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('email', user?.email);
      payload.append('jobId', jobId);
      if (useDefault) {
        payload.append('useDefaultVN', 'true');
      } else {
        payload.append('voiceRecord', audioBlob, 'voiceNote.webm');
      }

      await api.candidate.quickApply(payload);
      
      setSuccess("Your Quick Application was submitted successfully!");
      setTimeout(() => {
        onClose();
        setSuccess('');
        cancelRecording();
      }, 2000);
    } catch (err) {
      if (err.message && err.message.includes('complete your profile details')) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to submit Quick Application.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    cancelRecording();
    setError('');
    setSuccess('');
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#111115] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-2xl"
        >
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Application Sent!</h3>
              <p className="text-gray-400 text-sm">Your AI Voice Note is being analyzed.</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5 text-voxa-cyan" /> Quick Apply
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Applying for <span className="text-white font-medium">{jobTitle}</span>. 
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-6 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                  {error.includes('complete your profile details') && (
                    <button 
                      onClick={() => navigate('/candidate/profile')}
                      className="text-white bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium w-fit transition-colors"
                    >
                      Update Profile Now
                    </button>
                  )}
                </div>
              )}

              {checkingProfile ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-voxa-cyan border-t-transparent"></div>
                </div>
              ) : hasDefaultVN && !audioBlob && !isRecording ? (
                <div className="space-y-6">
                  <div className="bg-voxa-cyan/10 border border-voxa-cyan/20 p-6 rounded-2xl text-center">
                    <div className="w-16 h-16 bg-voxa-cyan/20 text-voxa-cyan rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mic className="w-8 h-8" />
                    </div>
                    <h3 className="text-white font-bold mb-2">Default Voice Note Found!</h3>
                    <p className="text-gray-400 text-sm mb-6">
                      We'll attach the default voice note from your profile along with your Candidate Profile data.
                    </p>
                    <button 
                      onClick={() => handleSubmit(true)} 
                      disabled={loading}
                      className="w-full bg-voxa-cyan text-black font-bold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:bg-[#00cce6] transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Submitting...' : 'Apply Instantly ⚡'}
                    </button>
                  </div>
                  
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">OR</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <div className="text-center flex flex-col gap-2">
                    <button onClick={startRecording} className="text-sm text-gray-400 hover:text-white underline underline-offset-4">
                      Record a new custom Voice Note instead
                    </button>
                    <button onClick={() => vnInputRef.current?.click()} className="text-sm text-gray-400 hover:text-white underline underline-offset-4">
                      Upload an Audio File instead
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-6 mb-6">
                    <div className="flex flex-col items-center gap-6">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center relative ${
                        isRecording ? 'bg-red-500/20 text-red-500' : 
                        audioBlob ? 'bg-green-500/20 text-green-500' : 'bg-voxa-cyan/20 text-voxa-cyan'
                      }`}>
                        {isRecording && (
                          <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-20"></span>
                        )}
                        {isRecording ? <Mic className="w-10 h-10" /> : audioBlob ? <CheckCircle2 className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                      </div>

                      <div className="text-center">
                        <div className="text-3xl font-mono text-white mb-1">{formatTime(recordingTime)}</div>
                        <div className="text-sm text-gray-400">
                          {isRecording ? 'Recording...' : audioBlob ? 'Recording complete' : 'Ready to record'}
                        </div>
                      </div>

                      {!audioBlob && (
                        <div className="flex gap-4 items-center">
                          {!isRecording && !isPaused ? (
                            <>
                              <button onClick={startRecording} className="w-14 h-14 rounded-full bg-voxa-cyan hover:bg-[#00cce6] flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(0,229,255,0.3)]" title="Record Voice Note">
                                <Mic className="w-6 h-6 text-black" />
                              </button>
                              <span className="text-gray-500 text-sm mx-1">OR</span>
                              <button onClick={() => vnInputRef.current?.click()} className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="Upload Audio File">
                                <Upload className="w-6 h-6 text-white" />
                              </button>
                              <input type="file" ref={vnInputRef} accept="audio/*" className="hidden" onChange={handleVNUploadChange} />
                            </>
                          ) : (
                            <>
                              <button onClick={isPaused ? resumeRecording : pauseRecording} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white">
                                {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                              </button>
                              <button onClick={handleStopRecording} className="w-12 h-12 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-500 flex items-center justify-center transition-colors">
                                <Square className="w-5 h-5 fill-current" />
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {audioBlob && (
                        <div className="flex gap-3 w-full">
                          <button onClick={cancelRecording} className="flex-1 py-2 px-4 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors text-sm font-medium">
                            Discard
                          </button>
                        </div>
                      )}
                      {audioError && <p className="text-red-400 text-xs mt-2">{audioError}</p>}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button onClick={handleClose} className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium">
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleSubmit(false)} 
                      disabled={!audioBlob || loading}
                      className="flex-1 btn-primary py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}


