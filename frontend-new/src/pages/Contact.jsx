import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, MapPin } from 'lucide-react';

export default function Contact() {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Contact Us</h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Have a question or want to partner with Voxa? We'd love to hear from you.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="glass-panel p-6 rounded-2xl text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-voxa-cyan/10 text-voxa-cyan rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white mb-2">Email Us</h3>
          <p className="text-sm text-gray-400">support@voxa-eg.com</p>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl text-center flex flex-col items-center border-voxa-cyan/30">
          <div className="w-12 h-12 bg-voxa-cyan/10 text-voxa-cyan rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white mb-2">Live Support</h3>
          <p className="text-sm text-gray-400">Available 9am-5pm EST</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-voxa-cyan/10 text-voxa-cyan rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white mb-2">HQ</h3>
          <p className="text-sm text-gray-400">Cairo, Egypt</p>
        </div>
      </div>

      <motion.form 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-8 rounded-3xl"
        onSubmit={(e) => { e.preventDefault(); alert("Message sent!"); }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-voxa-cyan transition-colors" placeholder="John Doe" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-voxa-cyan transition-colors" placeholder="john@example.com" required />
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
          <textarea rows="4" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-voxa-cyan transition-colors" placeholder="How can we help you?" required></textarea>
        </div>
        <button type="submit" className="btn-primary w-full py-3">Send Message</button>
      </motion.form>
    </div>
  );
}
