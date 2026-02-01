"use client";

import { motion } from "framer-motion";
import { Play, Pause, Check, X, Search, User, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

// Default Mock Data
const INITIAL_CANDIDATES = [
  {
    id: 1,
    name: "Alice Freeman",
    role: "Customer Support",
    score: "92%",
    status: "Hire",
    sentiment: "Positive",
    summary: "Strong empathy, clear enunciation.",
  },
  {
    id: 2,
    name: "Marcus Chen",
    role: "Sales Rep",
    score: "88%",
    status: "Interview",
    sentiment: "Confident",
    summary: "High energy, good closing statement.",
  },
  {
    id: 3,
    name: "Sarah Jones",
    role: "Tech Support",
    score: "45%",
    status: "Reject",
    sentiment: "Nervous",
    summary: "Long pauses, unsure of technical terms.",
  },
];

export default function Dashboard() {
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [playing, setPlaying] = useState<number | null>(null);

  // Load "Real" Candidates from Local Storage
  useEffect(() => {
    const saved = localStorage.getItem("voxa_candidates");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Combine saved candidates with the mock ones
      setCandidates([...parsed, ...INITIAL_CANDIDATES]);
    }
  }, []);

  // Clear History Function (Optional, for testing)
  const clearHistory = () => {
    localStorage.removeItem("voxa_candidates");
    setCandidates(INITIAL_CANDIDATES);
  };

  return (
    <main className="min-h-screen bg-[#0a192f] text-white p-8 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-12 max-w-6xl mx-auto">
        <Link
          href="/"
          className="text-3xl font-extrabold tracking-tighter bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
          VOXA{" "}
          <span className="text-white/30 text-sm font-light tracking-widest ml-2">
            DASHBOARD
          </span>
        </Link>
        <div className="flex gap-4">
          <button
            onClick={clearHistory}
            className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1">
            <Trash2 size={12} /> Reset Demo
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <User size={20} />
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
        {[
          {
            label: "Total Applicants",
            value: candidates.length.toString(),
            color: "text-blue-400",
          },
          {
            label: "AI Recommended",
            value: candidates
              .filter((c) => c.status === "Hire")
              .length.toString(),
            color: "text-green-400",
          },
          {
            label: "Interviews Set",
            value: candidates
              .filter((c) => c.status === "Interview")
              .length.toString(),
            color: "text-purple-400",
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider">
              {stat.label}
            </h3>
            <p className={`text-4xl font-bold mt-2 ${stat.color}`}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Candidates List */}
      <div className="max-w-6xl mx-auto space-y-4">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />{" "}
          Recent Applications
        </h2>

        {candidates.map((c: any, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="group flex flex-col md:flex-row items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer">
            {/* Name & Role */}
            <div className="flex items-center gap-4 w-full md:w-1/3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${c.name.includes("You") ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : "bg-gradient-to-br from-gray-700 to-gray-900"}`}>
                {c.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-lg group-hover:text-blue-400 transition-colors">
                  {c.name}
                </h4>
                <p className="text-xs text-gray-400 uppercase">{c.role}</p>
              </div>
            </div>

            {/* AI Score */}
            <div className="flex flex-col items-center w-full md:w-1/6 my-4 md:my-0">
              <span className="text-xs text-gray-500 uppercase mb-1">
                Match Score
              </span>
              <span
                className={`text-xl font-mono font-bold ${parseInt(c.score) > 80 ? "text-green-400" : parseInt(c.score) > 50 ? "text-yellow-400" : "text-red-400"}`}>
                {c.score}
              </span>
            </div>

            {/* AI Summary */}
            <div className="w-full md:w-1/3 px-4 text-sm text-gray-300 italic opacity-80">
              "{c.summary}"
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end mt-4 md:mt-0">
              <button
                onClick={() => setPlaying(playing === c.id ? null : c.id)}
                className="p-3 rounded-full bg-white/5 hover:bg-blue-600 hover:text-white transition-all">
                {playing === c.id ? <Pause size={18} /> : <Play size={18} />}
              </button>

              {/* Status Badge */}
              <div
                className={`px-4 py-1 rounded-full text-xs font-bold border ${
                  c.status === "Hire"
                    ? "bg-green-500/20 border-green-500 text-green-400"
                    : c.status === "Reject"
                      ? "bg-red-500/20 border-red-500 text-red-400"
                      : "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                }`}>
                {c.status.toUpperCase()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
