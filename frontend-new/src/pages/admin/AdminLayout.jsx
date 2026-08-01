import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, LogOut, Settings, Building2, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const { user, logoutContext } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Companies', href: '/admin/companies', icon: Building2 },
    { name: 'Applications', href: '/admin/applications', icon: Users },
  ];

  return (
    <div className="min-h-screen flex bg-[#0A0A0B]">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/5 bg-[#0F0F12] transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Admin Branding */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
          <Link to="/" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
            <img src="/voxa-v-logo.png" alt="V" className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(0,229,255,0.2)]" />
            <span className="text-white font-bold text-lg tracking-tight -ml-0.5">oxa</span>
            <span className="text-white font-medium text-lg tracking-tight ml-2">Admin Portal</span>
          </Link>
          <button 
            className="md:hidden text-gray-400 hover:text-white p-1"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-voxa-cyan/10 text-voxa-cyan border border-voxa-cyan/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-voxa-cyan' : 'text-gray-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/5 space-y-1 shrink-0">
          <Link 
            to="/admin/settings" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${location.pathname === '/admin/settings' ? 'bg-voxa-cyan/10 text-voxa-cyan' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Settings className={`w-5 h-5 ${location.pathname === '/admin/settings' ? 'text-voxa-cyan' : 'text-gray-500'}`} />
            Settings
          </Link>
          <button 
            onClick={() => {
              setIsMobileMenuOpen(false);
              logoutContext();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        
        {/* Top Header (Mobile specific or global actions) */}
        <header className="h-20 border-b border-white/5 bg-[#0F0F12] flex items-center px-4 md:px-8 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-gray-400 hover:text-white p-1"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-white truncate">
              {navigation.find(n => n.href === location.pathname)?.name || 'Admin'}
            </h2>
          </div>
          <div className="flex items-center gap-4 shrink-0">
             <div className="h-8 w-8 rounded-full bg-voxa-cyan/20 border border-voxa-cyan/50 flex items-center justify-center overflow-hidden">
               {user?.profilePic ? (
                 <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-voxa-cyan text-sm font-bold uppercase">{user?.fullName?.[0] || user?.email?.[0] || 'A'}</span>
               )}
             </div>
          </div>
        </header>

        {/* Dynamic Nested Route Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
