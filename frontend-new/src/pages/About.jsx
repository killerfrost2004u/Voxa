import React from 'react';
import { motion } from 'framer-motion';

export default function About() {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">About Voxa</h1>
        <p className="text-lg text-gray-400 max-w-3xl mx-auto">
          We are redefining the recruitment landscape through AI-driven insights and fair, skill-based evaluations.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="glass-panel p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              Voxa is an AI-powered applicant tracking system (ATS) built to bridge the gap between talented individuals and world-class companies. 
              Our focus is on removing biases and highlighting true capabilities through intelligent voice and communication assessments.
            </p>
            <p className="text-gray-400 leading-relaxed">
              We empower candidates by giving them immediate, actionable feedback while providing companies with top-tier, pre-vetted talent, significantly reducing time-to-hire.
            </p>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <div className="w-full aspect-square max-w-md bg-gradient-to-br from-voxa-cyan/20 to-blue-600/20 rounded-full blur-2xl absolute" />
          <div className="glass-panel w-full aspect-square max-w-sm rounded-3xl relative z-10 flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(0,229,255,0.1)]">
             <img src="/voxa-logo.png" alt="Voxa Logo" className="w-64 object-contain drop-shadow-[0_0_15px_rgba(0,229,255,0.2)]" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
