import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Target } from 'lucide-react';

export default function CorporateContact() {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Partner With Voxa</h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Scale your recruitment with our AI-powered voice assessment platform. Let's build the future of hiring together.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="glass-panel p-6 rounded-2xl text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-voxa-cyan/10 text-voxa-cyan rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white mb-2">B2B Solutions</h3>
          <p className="text-sm text-gray-400">Custom enterprise plans</p>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl text-center flex flex-col items-center border-voxa-cyan/30">
          <div className="w-12 h-12 bg-voxa-cyan/10 text-voxa-cyan rounded-full flex items-center justify-center mb-4">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white mb-2">Demo Request</h3>
          <p className="text-sm text-gray-400">See the platform in action</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-voxa-cyan/10 text-voxa-cyan rounded-full flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white mb-2">High Volume</h3>
          <p className="text-sm text-gray-400">For 100+ hires per month</p>
        </div>
      </div>

      <motion.form 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-8 rounded-3xl"
        onSubmit={(e) => { e.preventDefault(); alert("Partnership request sent! We will contact you shortly."); }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-voxa-cyan transition-colors" placeholder="Acme Corp" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Work Email</label>
            <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-voxa-cyan transition-colors" placeholder="you@company.com" required />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Your Name & Title</label>
            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-voxa-cyan transition-colors" placeholder="Jane Doe, HR Director" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Hiring Volume</label>
            <select className="w-full bg-[#111115] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-voxa-cyan transition-colors" required>
              <option value="">Select volume...</option>
              <option value="1-10">1-10 hires/month</option>
              <option value="11-50">11-50 hires/month</option>
              <option value="51-200">51-200 hires/month</option>
              <option value="200+">200+ hires/month</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">How can we help you scale?</label>
          <textarea rows="4" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-voxa-cyan transition-colors" placeholder="Tell us about your recruitment challenges..." required></textarea>
        </div>
        <button type="submit" className="btn-primary w-full py-3">Request Partnership Details</button>
      </motion.form>
    </div>
  );
}
