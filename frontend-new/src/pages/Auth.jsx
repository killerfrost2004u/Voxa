import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginContext } = useAuth();
  
  const isSignupInit = location.pathname.includes('signup');
  const [isLogin, setIsLogin] = useState(!isSignupInit);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // API State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        setTimeout(() => setSuccess('If the email exists, a reset link was sent.'), 1000);
      } else if (isLogin) {
        const data = await api.login(email, password);
        loginContext(data.user);
        
        // Redirect admins to admin portal, others to jobs feed
        if (data.user?.isAdmin) {
          navigate('/admin');
        } else {
          navigate('/jobs');
        }
      } else {
        if (!agreedToTerms) throw new Error('You must agree to the Terms of Service and Privacy Policy to continue.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters long.');
        if (!/[A-Z]/.test(password)) throw new Error('Password must contain at least one uppercase letter.');
        if (!/[a-z]/.test(password)) throw new Error('Password must contain at least one lowercase letter.');
        if (!/[0-9]/.test(password)) throw new Error('Password must contain at least one number.');
        if (!/[!@#$%^&*]/.test(password)) throw new Error('Password must contain at least one special character (!@#$%^&*).');

        const data = await api.signup(fullName, email, password);
        setSuccess(data.message || 'Check your email for the verification code.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
      alert(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false); // ALWAYS reset loading state
    }
  };

  const handleOAuth = async (provider) => {
    setLoading(true);
    setError('');
    try {
      // Simulating OAuth payload extraction
      const data = await api.oauthLogin(`Test ${provider} User`, `user@${provider.toLowerCase()}.com`);
      loginContext(data.user);
      navigate('/jobs');
    } catch (err) {
      setError(`Failed to authenticate with ${provider}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 flex items-center justify-center relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-voxa-cyan/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md p-8 sm:p-10 rounded-3xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="text-voxa-cyan text-4xl font-extrabold tracking-tighter drop-shadow-[0_0_10px_rgba(0,229,255,0.8)] mb-4">
            V
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create an Account')}
          </h2>
          <p className="text-gray-400 text-sm">
            {isForgotPassword 
              ? 'Enter your email and we will send you a reset link.' 
              : (isLogin ? 'Enter your credentials to access your dashboard.' : 'Start your journey to a better career today.')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
            {success}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.form 
            key={isForgotPassword ? 'forgot' : (isLogin ? 'login' : 'signup')}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-5" 
            onSubmit={handleSubmit}
          >
            
            {!isLogin && !isForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-voxa-cyan focus:ring-1 focus:ring-voxa-cyan transition-colors"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-voxa-cyan focus:ring-1 focus:ring-voxa-cyan transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-400">Password</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => setIsForgotPassword(true)} 
                      className="text-sm text-voxa-cyan hover:underline focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"}
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-voxa-cyan focus:ring-1 focus:ring-voxa-cyan transition-colors"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div className="flex items-start mt-2">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    required
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 border border-gray-600 rounded bg-white/5 focus:ring-3 focus:ring-voxa-cyan accent-voxa-cyan cursor-pointer"
                  />
                </div>
                <label htmlFor="terms" className="ml-2 text-sm text-gray-400">
                  I have read and agree to the{' '}
                  <Link to="/terms-of-service" className="text-voxa-cyan hover:underline" target="_blank">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy-policy" className="text-voxa-cyan hover:underline" target="_blank">
                    Privacy Policy
                  </Link>.
                </label>
              </div>
            )}

            <button 
              disabled={loading}
              className="btn-primary w-full mt-6 py-3 flex items-center justify-center gap-2 text-lg disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Sign Up'))}
              {!loading && (isForgotPassword ? <Mail className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />)}
            </button>
          </motion.form>
        </AnimatePresence>

        {!isForgotPassword && (
          <div className="mt-8">
            <div className="relative flex items-center py-5">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">Or continue with</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => handleOAuth('Google')} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors disabled:opacity-50">
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-gray-300 font-medium">Google</span>
              </button>
              
              <button onClick={() => handleOAuth('Facebook')} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-[#1877F2]/20 border border-white/10 hover:border-[#1877F2]/50 rounded-xl transition-colors group disabled:opacity-50">
                <svg className="w-5 h-5 text-gray-400 group-hover:text-[#1877F2] transition-colors fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-gray-300 font-medium">Facebook</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          {isForgotPassword ? (
            <button 
              onClick={() => setIsForgotPassword(false)}
              className="text-gray-300 hover:text-white flex items-center justify-center gap-2 mx-auto focus:outline-none"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Log In
            </button>
          ) : (
            <>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={toggleAuthMode}
                className="text-voxa-cyan font-semibold hover:underline focus:outline-none"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
