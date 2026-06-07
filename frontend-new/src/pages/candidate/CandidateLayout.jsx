import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Bookmark, User, LogOut, Menu, X, Settings, Search, Bell, MessageSquare, ChevronDown, Send, Check, Sparkles, Building2, FileSearch } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function CandidateLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutContext } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);
  const overlayRef = useRef(null);
  const textareaRef = useRef(null);

  // Smart Chat State
  const [myApplications, setMyApplications] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [pendingMentions, setPendingMentions] = useState([]);

  const quickActions = [
    "What's the status of my application?",
    "Can we reschedule my interview?",
    "What is the salary range?"
  ];

  // Fetch Data
  useEffect(() => {
    if (!user?.email) return;
    const fetchData = async () => {
      try {
        const notifs = await api.admin.getNotifications(user.email);
        setNotifications(notifs);
        const msgs = await api.admin.getMessages(user.email);
        setMessages(msgs);
        const apps = await api.admin.getCandidateApplications(user.email);
        setMyApplications(apps);
        
        // Fetch jobs and companies for mentions
        const jobsRes = await fetch('/api/jobs');
        if (jobsRes.ok) setAllJobs(await jobsRes.json());
        
        const compRes = await fetch('/api/companies');
        if (compRes.ok) setAllCompanies(await compRes.json());
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [user]);

  // Scroll chat to bottom
  useEffect(() => {
    if (messagesOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messagesOpen]);

  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const unreadMsgs = messages.filter(m => !m.is_read && m.receiver === user?.email).length;

  const handleOpenNotifications = async () => {
    setNotificationsOpen(!notificationsOpen);
    setProfileDropdownOpen(false);
    if (!notificationsOpen && unreadNotifs > 0) {
      try {
        await api.markNotificationsRead(user.email);
        setNotifications(notifications.map(n => ({...n, is_read: true})));
      } catch (err) { console.error(err); }
    }
  };

  const handleSendMessage = async (e, overrideMessage = null) => {
    if (e) e.preventDefault();
    const msgToSend = overrideMessage || newMessage;
    if (!msgToSend.trim()) return;

    // Process pending mentions into markdown
    let finalMessage = msgToSend;
    pendingMentions.forEach(mention => {
      finalMessage = finalMessage.split(`@${mention.label}`).join(`@[${mention.label}](${mention.rawId})`);
    });

    try {
      await api.admin.sendMessage(user.email, 'admin@voxa.com', finalMessage);
      setMessages([...messages, { sender: user.email, content: finalMessage, date: new Date().toISOString() }]);
      if (!overrideMessage) {
        setNewMessage('');
        setPendingMentions([]);
      }
    } catch (err) { console.error(err); }
  };

  // Smart Mentions Handlers
  const handleMessageChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);
    const cursor = e.target.selectionStart;
    setCursorPos(cursor);
    
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const queryStr = textBeforeCursor.slice(lastAtIndex + 1);
      
      // Check if this query is actually part of an already completed mention
      const isCompletedMention = pendingMentions.some(mention => {
         return queryStr === mention.label || queryStr.startsWith(mention.label + ' ') || queryStr.startsWith(mention.label + '\n');
      });

      if (!isCompletedMention && queryStr.length < 50 && /^[a-zA-Z0-9\s-]*$/.test(queryStr)) {
        setShowMentionMenu(true);
        setMentionQuery(queryStr.toLowerCase());
        return;
      }
    }
    
    setShowMentionMenu(false);
  };

  const handleMentionSelect = (item, type) => {
    const textBeforeCursor = newMessage.slice(0, cursorPos);
    const textAfterCursor = newMessage.slice(cursorPos);
    const textBeforeMention = textBeforeCursor.replace(/@[a-zA-Z0-9\s-]*$/, '');
    
    let label = '';
    let id = '';
    
    if (type === 'app') {
      label = item.role;
      id = `app:${item.id}`;
    } else if (type === 'job') {
      label = `${item.title} - ${item.company || 'Voxa Partner'}`;
      id = `job:${item.id}`;
    } else if (type === 'company') {
      label = item.name;
      id = `company:${item.id}`;
    }
    
    const mentionString = `@${label} `;
    setNewMessage(textBeforeMention + mentionString + textAfterCursor);
    
    // Store metadata in the background so the user doesn't see markdown
    setPendingMentions(prev => [...prev, { label, rawId: id }]);
    setShowMentionMenu(false);

    // Update cursor position to be right after the inserted mention
    const newCursorPos = textBeforeMention.length + mentionString.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const filteredApps = myApplications.filter(app => 
    `${app.role} ${app.company}`.toLowerCase().includes(mentionQuery)
  );
  const filteredJobs = allJobs.filter(job => 
    `${job.title} ${job.company}`.toLowerCase().includes(mentionQuery)
  );
  const filteredCompanies = allCompanies.filter(comp => 
    `${comp.name}`.toLowerCase().includes(mentionQuery)
  );

  const mentionResultsTotal = filteredApps.length + filteredJobs.length + filteredCompanies.length;

  // Highlight Overlay Renderer
  const renderHighlightedInput = () => {
    if (!newMessage) return null;
    let parts = [newMessage];
    pendingMentions.forEach(mention => {
      const newParts = [];
      parts.forEach(part => {
        if (typeof part === 'string') {
          const split = part.split(`@${mention.label}`);
          for (let i = 0; i < split.length; i++) {
            newParts.push(split[i]);
            if (i < split.length - 1) {
              newParts.push(
                <span key={`${mention.label}-${i}`} className="text-[#06B6D4] relative inline-block">
                  <span className="absolute inset-0 bg-[#06B6D4]/15 border border-[#06B6D4]/30 rounded -mx-1 -my-0.5 shadow-[0_0_8px_rgba(6,182,212,0.15)] pointer-events-none" aria-hidden="true"></span>
                  <span className="relative z-10">@{mention.label}</span>
                </span>
              );
            }
          }
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });
    return parts;
  };

  // Rich Message Renderer
  const renderMessageContent = (content) => {
    const regex = /@\[(.*?)\]\((.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const label = match[1];
      const rawId = match[2];
      
      let type = 'app';
      let id = rawId;
      if (rawId.includes(':')) {
        [type, id] = rawId.split(':');
      }

      let Icon = Briefcase;
      let linkTo = '/candidate/applications';
      let actionText = 'View Application &rarr;';
      let colorClass = 'text-[#06B6D4]';
      let bgClass = 'from-[#7C3AED] to-[#06B6D4]';
      let imageUrl = null;

      if (type === 'job') {
        Icon = FileSearch;
        linkTo = `/jobs`; // Assuming a jobs page exists
        actionText = 'View Job Description &rarr;';
        colorClass = 'text-[#EAB308]';
        bgClass = 'from-[#EAB308] to-[#F59E0B]';
        const foundJob = allJobs.find(j => j.id == id);
        if (foundJob && (foundJob.logoUrl || foundJob.logo)) imageUrl = foundJob.logoUrl || (foundJob.logo.startsWith('http') ? foundJob.logo : null);
      } else if (type === 'company') {
        Icon = Building2;
        linkTo = `/companies`;
        actionText = 'View Company Profile &rarr;';
        colorClass = 'text-[#22C55E]';
        bgClass = 'from-[#22C55E] to-[#10B981]';
        const foundComp = allCompanies.find(c => c.id == id);
        if (foundComp && (foundComp.logoUrl || foundComp.logo)) imageUrl = foundComp.logoUrl || (foundComp.logo.startsWith('http') ? foundComp.logo : null);
      }

      parts.push(
        <div key={match.index} className="block my-2 w-full max-w-[280px]">
          <Link to={linkTo} className={`flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group shadow-sm`}>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${bgClass} flex items-center justify-center p-[1px] shrink-0`}>
              <div className="w-full h-full bg-[#14151b] rounded-[7px] overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <Icon className={`w-4 h-4 ${colorClass}`} />
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className={`text-xs font-semibold ${colorClass} group-hover:text-white transition-colors truncate`}>{label}</p>
              <p className="text-[10px] text-gray-400">{actionText}</p>
            </div>
          </Link>
        </div>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    return parts.length > 0 ? parts : content;
  };

  const navigation = [
    { name: 'Overview', href: '/candidate', icon: LayoutDashboard },
    { name: 'My Applications', href: '/candidate/applications', icon: Briefcase },
    { name: 'Saved Jobs', href: '/candidate/saved', icon: Bookmark },
    { name: 'Profile', href: '/candidate/profile', icon: User },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/jobs');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f1015]">
      
      {/* Desktop Sidebar */}
      <div className="w-[280px] border-r border-white/5 bg-[#14151b] hidden md:flex flex-col relative z-20">
        <div className="h-24 flex items-center px-8 border-b border-white/5">
          <Link to="/" className="flex items-center">
            <img src="/voxa-v-logo.png" alt="V" className="h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
            <span className="text-white font-bold text-2xl tracking-tight">oxa</span>
          </Link>
        </div>

        <nav className="flex-1 px-6 py-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group ${
                  isActive 
                    ? 'text-white bg-[#06B6D4]/5 border border-[#06B6D4]/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#06B6D4] shadow-[0_0_10px_#06B6D4]" />
                )}
                
                <div className="flex items-center gap-3 relative z-10">
                  <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#06B6D4]' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  <span className={isActive ? 'font-semibold' : ''}>{item.name}</span>
                </div>
                
                {isActive && item.name === 'Overview' && (
                  <span className="text-[10px] font-bold text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-1 rounded-md uppercase tracking-wider relative z-10">
                    Active
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 space-y-2">
          <Link 
            to="/candidate/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all border border-transparent group"
          >
            <Settings className="w-[18px] h-[18px] text-gray-500 group-hover:text-gray-300" />
            Settings
          </Link>
          <button 
            onClick={logoutContext}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all group border border-transparent"
          >
            <LogOut className="w-[18px] h-[18px] text-gray-500 group-hover:text-red-400" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Subtle Background Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#06B6D4]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#7C3AED]/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Top Header */}
        <header className="h-24 border-b border-white/5 bg-transparent flex items-center px-8 justify-between z-20 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:flex relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-[18px] h-[18px] text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search jobs, companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1b23] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#06B6D4]/50 focus:bg-[#1a1b23]/80 transition-all shadow-inner"
              />
            </form>
          </div>
          
          <div className="flex items-center gap-6">
             
             {/* Notifications */}
             <div className="relative flex items-center justify-center">
               <button 
                 onClick={handleOpenNotifications}
                 className="text-gray-400 hover:text-white transition-colors relative focus:outline-none flex items-center justify-center"
               >
                 <Bell className="w-5 h-5" />
                 {unreadNotifs > 0 && (
                   <span className="absolute -top-1 -right-1 w-[10px] h-[10px] bg-[#7C3AED] rounded-full border-2 border-[#0f1015]" />
                 )}
               </button>
               
               {notificationsOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
                   <div className="absolute right-0 mt-3 w-80 bg-[#1a1b23] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                     <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                       <h3 className="text-sm font-semibold text-white">Notifications</h3>
                       {unreadNotifs === 0 && <span className="text-xs text-gray-500 flex items-center gap-1"><Check className="w-3 h-3"/> All read</span>}
                     </div>
                     <div className="max-h-80 overflow-y-auto">
                       {notifications.length === 0 ? (
                         <div className="p-4 text-center text-sm text-gray-500">No new notifications</div>
                       ) : (
                         notifications.map(notif => (
                           <div key={notif.id} className={`p-4 border-b border-white/5 last:border-0 ${notif.is_read ? 'opacity-70' : 'bg-white/[0.02]'}`}>
                             <p className="text-sm text-gray-200 mb-1">{notif.content}</p>
                             <p className="text-xs text-gray-500">{new Date(notif.date).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                           </div>
                         ))
                       )}
                     </div>
                   </div>
                 </>
               )}
             </div>

             {/* Messages */}
             <button 
               onClick={() => { setMessagesOpen(true); setProfileDropdownOpen(false); setNotificationsOpen(false); }}
               className="text-gray-400 hover:text-white transition-colors relative flex items-center justify-center"
             >
               <MessageSquare className="w-5 h-5" />
               {unreadMsgs > 0 && (
                 <span className="absolute -top-1 -right-1 w-[10px] h-[10px] bg-[#06B6D4] rounded-full border-2 border-[#0f1015]" />
               )}
             </button>
             
             <div className="w-px h-6 bg-white/10 mx-2" />

             <div className="relative">
               <button 
                 onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                 className="flex items-center gap-3 group cursor-pointer focus:outline-none"
               >
                 <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#06B6D4] p-[2px]">
                   <div className="w-full h-full rounded-full overflow-hidden bg-[#14151b] flex items-center justify-center">
                     {user?.profilePic ? (
                       <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                     ) : (
                       <span className="text-white text-xs font-bold uppercase">{user?.fullName?.[0] || user?.email?.[0] || 'C'}</span>
                     )}
                   </div>
                 </div>
                 <div className="hidden md:flex items-center gap-2">
                   <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                     {user?.fullName?.split(' ')[0] || 'User'}
                   </span>
                   <ChevronDown className={`w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                 </div>
               </button>

               {/* Dropdown Menu */}
               {profileDropdownOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)}></div>
                   <div className="absolute right-0 mt-3 w-48 bg-[#1a1b23] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                     <div className="px-4 py-3 border-b border-white/5">
                       <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
                       <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                     </div>
                     <div className="p-2">
                       <Link 
                         to="/candidate/profile" 
                         onClick={() => setProfileDropdownOpen(false)}
                         className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                       >
                         <User className="w-4 h-4" />
                         My Profile
                       </Link>
                       <Link 
                         to="/candidate/profile" 
                         onClick={() => setProfileDropdownOpen(false)}
                         className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                       >
                         <Settings className="w-4 h-4" />
                         Settings
                       </Link>
                     </div>
                     <div className="p-2 border-t border-white/5">
                       <button 
                         onClick={() => { setProfileDropdownOpen(false); logoutContext(); }}
                         className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                       >
                         <LogOut className="w-4 h-4" />
                         Sign Out
                       </button>
                     </div>
                   </div>
                 </>
               )}
             </div>
          </div>
        </header>

        {/* Mobile Navigation Menu Overlay */}
        {mobileMenuOpen && (
          <div className="absolute inset-0 top-24 bg-[#14151b] z-30 md:hidden flex flex-col border-t border-white/5">
             <div className="p-4 border-b border-white/5">
               <form onSubmit={handleSearch} className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="w-[18px] h-[18px] text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#06B6D4]/50"
                />
              </form>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium transition-all duration-200 ${
                      isActive 
                        ? 'text-white bg-[#06B6D4]/5 border border-[#06B6D4]/30' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-[#06B6D4]' : 'text-gray-500'}`} />
                    {item.name}
                  </Link>
                );
              })}
              <div className="h-px bg-white/5 my-4" />
              <Link 
                to="/candidate/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Settings className="w-5 h-5 text-gray-500" />
                Settings
              </Link>
              <button 
                onClick={() => { setMobileMenuOpen(false); logoutContext(); }}
                className="flex w-full items-center gap-3 px-4 py-4 rounded-xl text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10">
          <Outlet />
        </main>

        {/* Messaging Slide-over Drawer */}
        {messagesOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => setMessagesOpen(false)} />
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#14151b] border-l border-white/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#1a1b23]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] p-[1px]">
                    <div className="w-full h-full bg-[#14151b] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">V</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Voxa Recruiting</h3>
                    <p className="text-xs text-green-400">Online</p>
                  </div>
                </div>
                <button onClick={() => setMessagesOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <MessageSquare className="w-12 h-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">No messages yet.</p>
                    <p className="text-sm text-gray-500 mt-2 max-w-[250px]">Send a message to our recruiters and we'll get back to you shortly.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.sender === user?.email;
                    return (
                      <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                          isMine 
                            ? 'bg-[#06B6D4]/20 text-white rounded-br-sm border border-[#06B6D4]/30' 
                            : 'bg-white/5 text-gray-200 rounded-bl-sm border border-white/10'
                        }`}>
                          <div className="text-sm break-words leading-relaxed">{renderMessageContent(msg.content)}</div>
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1">
                          {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Actions & Input Area */}
              <div className="p-4 bg-[#1a1b23] border-t border-white/5 relative">
                
                {/* Mention Menu */}
                {showMentionMenu && (
                  <div className="absolute bottom-[calc(100%+10px)] left-4 right-4 bg-[#14151b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-bottom-2">
                    <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md">
                      <Sparkles className="w-3 h-3 text-[#06B6D4]" />
                      <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">Mention something...</span>
                    </div>
                    {mentionResultsTotal === 0 ? (
                      <div className="p-3 text-xs text-gray-500 text-center py-6">No matching applications, jobs, or companies found.</div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        
                        {/* Applications */}
                        {filteredApps.length > 0 && (
                          <div className="py-1">
                            <p className="px-4 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">My Applications</p>
                            {filteredApps.map(app => (
                              <button key={`app-${app.id}`} onClick={() => handleMentionSelect(app, 'app')} className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center gap-3 transition-colors">
                                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[10px] text-[#06B6D4] shrink-0 border border-white/5"><Briefcase className="w-3 h-3" /></div>
                                <div className="truncate">
                                  <p className="text-sm text-gray-200 font-medium truncate">{app.role}</p>
                                  <p className="text-[10px] text-gray-500 truncate">{app.company}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Jobs */}
                        {filteredJobs.length > 0 && (
                          <div className="py-1">
                            <p className="px-4 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Job Offers</p>
                            {filteredJobs.slice(0, 5).map(job => {
                              const jobImg = job.logoUrl || (job.logo?.startsWith('http') ? job.logo : null);
                              return (
                                <button key={`job-${job.id}`} onClick={() => handleMentionSelect(job, 'job')} className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center gap-3 transition-colors">
                                  <div className="w-6 h-6 rounded overflow-hidden bg-white/5 flex items-center justify-center text-[10px] text-[#EAB308] shrink-0 border border-white/5">
                                    {jobImg ? <img src={jobImg} className="w-full h-full object-cover" /> : <FileSearch className="w-3 h-3" />}
                                  </div>
                                  <div className="truncate">
                                    <p className="text-sm text-gray-200 font-medium truncate">{job.title}</p>
                                    <p className="text-[10px] text-gray-500 truncate">{job.company || 'Voxa Partner'}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Companies */}
                        {filteredCompanies.length > 0 && (
                          <div className="py-1">
                            <p className="px-4 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Companies</p>
                            {filteredCompanies.slice(0, 5).map(comp => {
                              const compImg = comp.logoUrl || (comp.logo?.startsWith('http') ? comp.logo : null);
                              return (
                                <button key={`comp-${comp.id}`} onClick={() => handleMentionSelect(comp, 'company')} className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center gap-3 transition-colors">
                                  <div className="w-6 h-6 rounded overflow-hidden bg-white/5 flex items-center justify-center text-[10px] text-[#22C55E] shrink-0 border border-white/5">
                                    {compImg ? <img src={compImg} className="w-full h-full object-cover" /> : <Building2 className="w-3 h-3" />}
                                  </div>
                                  <div className="truncate">
                                    <p className="text-sm text-gray-200 font-medium truncate">{comp.name}</p>
                                    <p className="text-[10px] text-gray-500 truncate">View Profile</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}

                {/* Quick Action Chips */}
                {messages.length < 5 && (
                  <div className="flex overflow-x-auto gap-2 pb-3 mb-1 scrollbar-hide">
                    {quickActions.map((action, i) => (
                      <button 
                        key={i}
                        onClick={(e) => handleSendMessage(e, action)}
                        className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 transition-colors flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-[#06B6D4]" />
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={(e) => handleSendMessage(e)} className="flex items-end gap-2">
                  <div className="flex-1 relative rounded-xl bg-white/5 border border-white/10 shadow-inner focus-within:border-[#06B6D4]/50 transition-colors overflow-hidden">
                    {/* Highlight Overlay */}
                    <div 
                      ref={overlayRef}
                      className="absolute inset-0 px-4 py-3 text-sm text-white whitespace-pre-wrap break-words pointer-events-none overflow-y-auto scrollbar-hide" 
                      aria-hidden="true"
                    >
                      {!newMessage && <span className="text-gray-500">Type a message or use @ to mention...</span>}
                      {newMessage && renderHighlightedInput()}
                    </div>
                    
                    {/* Actual Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={handleMessageChange}
                      onSelect={(e) => setCursorPos(e.target.selectionStart)}
                      onScroll={(e) => {
                        if (overlayRef.current) overlayRef.current.scrollTop = e.target.scrollTop;
                      }}
                      className="w-full relative z-10 bg-transparent border-none px-4 py-3 text-sm text-transparent caret-white focus:outline-none focus:ring-0 resize-none max-h-32 m-0 overflow-y-auto scrollbar-hide"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="h-[46px] w-[46px] flex items-center justify-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}
