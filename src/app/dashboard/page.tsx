"use client";

import { motion } from "framer-motion";
import { Play, Pause, Search, User, Trash2, Briefcase, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

// Mock Data (Simulating Database)
const INITIAL_CANDIDATES = [
  {
    id: 1,
    name: "Alice Freeman",
    role: "Customer Support",
    score: 92,
    status: "Hire",
    summary: "Strong empathy, clear enunciation.",
  },
  {
    id: 2,
    name: "Marcus Chen",
    role: "Sales Rep",
    score: 88,
    status: "Interview",
    summary: "High energy, good closing statement.",
  },
  {
    id: 3,
    name: "Sarah Jones",
    role: "Tech Support",
    score: 45,
    status: "Reject",
    summary: "Long pauses, unsure of technical terms.",
  },
  {
    id: 4,
    name: "David Wolf",
    role: "Team Lead",
    score: 78,
    status: "Review",
    summary: "Good leadership skills, needs technical refresher.",
  },
];

export default function Dashboard() {
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [playing, setPlaying] = useState<number | null>(null);

  // Load any local candidates + mock ones
  useEffect(() => {
    const saved = localStorage.getItem("dw_candidates");
    if (saved) {
      setCandidates([...JSON.parse(saved), ...INITIAL_CANDIDATES]);
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("dw_candidates");
    setCandidates(INITIAL_CANDIDATES);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10 font-sans selection:bg-[#ff6600] selection:text-white">
      
      {/* --- Header --- */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-12 max-w-7xl mx-auto border-b border-[#333] pb-6">
        <Link
          href="/"
          className="text-3xl font-extrabold tracking-tighter uppercase group cursor-pointer">
          Dark <span className="text-[#ff6600] group-hover:text-white transition-colors duration-300">Wolves</span>
          <span className="block text-[10px] font-normal tracking-[0.3em] text-gray-500 mt-1 group-hover:text-[#ff6600] transition-colors">
            Recruitment Dashboard
          </span>
        </Link>
        
        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <button
            onClick={clearHistory}
            className="text-xs font-semibold text-gray-600 hover:text-red-500 flex items-center gap-2 transition-colors">
            <Trash2 size={14} /> RESET DATA
          </button>
          
          <div className="flex items-center gap-3 pl-6 border-l border-[#333]">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-white">Admin User</p>
              <p className="text-xs text-[#ff6600]">Hiring Manager</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#333] flex items-center justify-center text-[#ff6600] hover:border-[#ff6600] transition-all cursor-pointer">
              <User size={20} />
            </div>
          </div>
        </div>
      </header>

      {/* --- Stats Row --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto mb-12">
        {[
          {
            label: "Total Applicants",
            value: candidates.length,
            icon: Users,
            color: "text-blue-500",
          },
          {
            label: "Interviews Set",
            value: candidates.filter((c) => c.status === "Interview" || c.status === "Hire").length,
            icon: Briefcase,
            color: "text-[#ff6600]", // Orange
          },
          {
            label: "Avg Score",
            value: Math.round(candidates.reduce((acc, c) => acc + c.score, 0) / candidates.length) + "%",
            icon: TrendingUp,
            color: "text-green-500",
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-[#141414] border border-[#333] rounded-xl hover:border-[#ff6600] transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <stat.icon size={60} className={stat.color} />
            </div>
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">
              {stat.label}
            </h3>
            <p className={`text-4xl font-black ${stat.color} mt-1`}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* --- Candidates List --- */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="w-1.5 h-8 bg-[#ff6600] rounded-sm" />
            Active Pipeline
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Search candidate..." 
              className="bg-[#141414] border border-[#333] rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#ff6600] w-64 text-gray-300 placeholder-gray-600"
            />
          </div>
        </div>

        <div className="space-y-3">
          {candidates.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group flex flex-col md:flex-row items-center justify-between p-5 bg-[#141414] hover:bg-[#1a1a1a] border border-[#333] hover:border-[#ff6600] rounded-lg transition-all cursor-pointer">
              
              {/* Avatar & Info */}
              <div className="flex items-center gap-5 w-full md:w-1/3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold bg-[#222] text-gray-400 group-hover:bg-[#ff6600] group-hover:text-black transition-colors`}>
                  {c.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-white group-hover:text-[#ff6600] transition-colors">
                    {c.name}
                  </h4>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{c.role}</p>
                </div>
              </div>

              {/* Score Bar */}
              <div className="w-full md:w-1/4 my-4 md:my-0 px-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">AI Score</span>
                  <span className={`font-bold ${c.score >= 80 ? 'text-[#ff6600]' : 'text-gray-400'}`}>{c.score}%</span>
                </div>
                <div className="w-full bg-[#222] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${c.score >= 80 ? 'bg-[#ff6600]' : c.score >= 50 ? 'bg-yellow-600' : 'bg-red-900'}`} 
                    style={{ width: `${c.score}%` }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="w-full md:w-1/3 px-4 text-sm text-gray-400 italic opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity truncate">
                "{c.summary}"
              </div>

              {/* Actions & Status */}
              <div className="flex items-center gap-4 w-full md:w-auto justify-end mt-4 md:mt-0">
                <button
                  onClick={() => setPlaying(playing === c.id ? null : c.id)}
                  className={`p-2.5 rounded-full border transition-all ${
                    playing === c.id 
                      ? "bg-[#ff6600] border-[#ff6600] text-black" 
                      : "bg-transparent border-[#333] text-gray-500 hover:border-[#ff6600] hover:text-[#ff6600]"
                  }`}>
                  {playing === c.id ? <Pause size={16} fill="black" /> : <Play size={16} fill="currentColor" />}
                </button>

                <div className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider border ${
                  c.status === "Hire"
                    ? "bg-[#ff6600]/10 border-[#ff6600] text-[#ff6600]"
                    : c.status === "Reject"
                      ? "bg-red-900/10 border-red-900 text-red-700"
                      : "bg-gray-800 border-gray-600 text-gray-400"
                }`}>
                  {c.status}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}