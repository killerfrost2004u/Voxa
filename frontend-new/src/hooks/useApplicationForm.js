import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useApplicationForm(job, audioBlob) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saveToProfile, setSaveToProfile] = useState(true);

  const [formData, setFormData] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
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
    experienceDetails: ''
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate('/signup');
  }, [user, navigate]);

  // Load from local profile if available
  useEffect(() => {
    const savedProfile = localStorage.getItem('voxa_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch(e){}
    }
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioBlob) {
      setError('Please record a Voice Note before applying.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      if (saveToProfile) {
        localStorage.setItem('voxa_profile', JSON.stringify(formData));
      }

      const payload = new FormData();
      payload.append('title', job.title || job.JobTitle);
      payload.append('company', job.company || job.CompanyName);
      
      const submissionData = { ...formData };
      submissionData.dob = `${submissionData.dobYear}-${submissionData.dobMonth.padStart(2, '0')}-${submissionData.dobDay.padStart(2, '0')}`;
      delete submissionData.dobYear;
      delete submissionData.dobMonth;
      delete submissionData.dobDay;

      Object.entries(submissionData).forEach(([key, value]) => {
        payload.append(key, value);
      });
      payload.append('voiceRecord', audioBlob, 'voiceNote.webm');

      await api.applyForJob(payload);
      setSuccess("Your application was submitted successfully!");
      setTimeout(() => navigate('/jobs'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  return { formData, handleChange, handleSubmit, loading, error, setError, success, saveToProfile, setSaveToProfile };
}
