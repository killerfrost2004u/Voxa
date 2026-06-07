import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logoutContext } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutContext();
    navigate('/');
  };

  return (
    <nav className="fixed w-full z-50 top-0 transition-all duration-300 glass-panel border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/voxa-v-logo.png" alt="V" className="h-10 w-auto object-contain" />
            <span className="text-white text-2xl font-bold tracking-tight">oxa</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-300 hover:text-voxa-cyan transition-colors font-medium">Home</Link>
            <Link to="/about" className="text-gray-300 hover:text-voxa-cyan transition-colors font-medium">About Us</Link>
            <Link to="/jobs" className="text-gray-300 hover:text-voxa-cyan transition-colors font-medium">Find Jobs</Link>
            <Link to="/companies" className="text-gray-300 hover:text-voxa-cyan transition-colors font-medium">Companies</Link>
            <Link to="/salaries" className="text-gray-300 hover:text-voxa-cyan transition-colors font-medium">Salaries</Link>
            <Link to="/contact" className="text-gray-300 hover:text-voxa-cyan transition-colors font-medium">Contact Us</Link>
            {user ? (
              <div className="flex items-center gap-4">
                <Link to={user.isAdmin ? "/admin" : "/candidate"} className="text-white font-medium hover:text-voxa-cyan transition-colors flex items-center gap-2">
                  {user?.profilePic ? (
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 shadow-sm">
                      <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <User className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors font-medium">Log Out</button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-white font-medium hover:text-gray-300 transition-colors">Log In</Link>
                <Link to="/signup" className="btn-primary">Sign Up</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              {isOpen ? <X className="h-7 w-7 text-voxa-cyan" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden glass-panel border-t border-white/10"
          >
            <div className="px-4 pt-2 pb-6 space-y-4 flex flex-col items-center">
              <Link to="/" className="block text-gray-300 hover:text-voxa-cyan text-lg py-2">Home</Link>
              <Link to="/about" className="block text-gray-300 hover:text-voxa-cyan text-lg py-2">About Us</Link>
              <Link to="/jobs" className="block text-gray-300 hover:text-voxa-cyan text-lg py-2">Find Jobs</Link>
              <Link to="/companies" className="block text-gray-300 hover:text-voxa-cyan text-lg py-2">Companies</Link>
              <Link to="/salaries" className="block text-gray-300 hover:text-voxa-cyan text-lg py-2">Salaries</Link>
              <Link to="/contact" className="block text-gray-300 hover:text-voxa-cyan text-lg py-2">Contact Us</Link>
              <div className="w-full h-px bg-white/10 my-2"></div>
              {user ? (
                <>
                  <Link to={user.isAdmin ? "/admin" : "/candidate"} onClick={() => setIsOpen(false)} className="block text-white text-lg py-2 flex items-center justify-center gap-2">
                    {user?.profilePic ? (
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20 shadow-sm">
                        <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <User className="w-5 h-5" />
                    )} 
                    Dashboard
                  </Link>
                  <button onClick={() => { setIsOpen(false); handleLogout(); }} className="block text-red-400 text-lg py-2">Log Out</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsOpen(false)} className="block text-white text-lg py-2">Log In</Link>
                  <Link to="/signup" onClick={() => setIsOpen(false)} className="btn-primary w-full text-center mt-2">Sign Up</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
