import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-voxa-bg pt-16 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* Column 1: Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <span className="text-2xl font-bold tracking-tighter">
                V<span className="text-voxa-cyan">O</span>XA
              </span>
            </Link>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              The next-generation AI-powered Applicant Tracking System. Elevating the standard for BPO and tech recruitment worldwide.
            </p>
            <div className="flex flex-col gap-3 text-gray-400 text-sm">
              <a href="https://www.linkedin.com/in/voxa-ai-agency-84b9643a9/?isSelfProfile=true" target="_blank" rel="noopener noreferrer" className="hover:text-voxa-cyan flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg> Voxa (EG) AI Agency
              </a>
              <a href="https://www.facebook.com/profile.php?id=61587306782031" target="_blank" rel="noopener noreferrer" className="hover:text-voxa-cyan flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg> Voxa Eg
              </a>
              <a href="https://www.instagram.com/voxaeg/" target="_blank" rel="noopener noreferrer" className="hover:text-voxa-cyan flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg> voxaeg
              </a>
              <a href="https://www.tiktok.com/@voxaeg" target="_blank" rel="noopener noreferrer" className="hover:text-voxa-cyan flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
                </svg> voxaeg
              </a>
            </div>
          </div>

          {/* Column 2: Candidates */}
          <div>
            <h4 className="text-white font-bold mb-6">Candidates</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/jobs" className="hover:text-voxa-cyan transition-colors">Browse All Jobs</Link></li>
              <li><Link to="/companies" className="hover:text-voxa-cyan transition-colors">Top Companies</Link></li>
              <li><Link to="/salaries" className="hover:text-voxa-cyan transition-colors">Salary Insights</Link></li>
              <li><Link to="/login" className="hover:text-voxa-cyan transition-colors">Candidate Login</Link></li>
            </ul>
          </div>

          {/* Column 3: Corporate Partners */}
          <div>
            <h4 className="text-white font-bold mb-6">Corporate Partners</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/corporate-contact" className="hover:text-voxa-cyan transition-colors">Partner With Us</Link></li>
              <li><Link to="/corporate-contact" className="hover:text-voxa-cyan transition-colors">Request a Demo</Link></li>
              <li><Link to="/corporate-contact" className="hover:text-voxa-cyan transition-colors">B2B Pricing</Link></li>
            </ul>
          </div>

          {/* Column 4: Voxa */}
          <div>
            <h4 className="text-white font-bold mb-6">Voxa</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/about" className="hover:text-voxa-cyan transition-colors">About the Agency</Link></li>
              <li><Link to="/contact" className="hover:text-voxa-cyan transition-colors">Contact Support</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-voxa-cyan transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="hover:text-voxa-cyan transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 text-center md:text-left">
          <p className="text-sm text-gray-500">
            &copy; 2026 Voxa. All rights reserved. Powered by AI.
          </p>
        </div>
      </div>
    </footer>
  );
}
