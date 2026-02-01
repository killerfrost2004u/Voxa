import Link from "next/link";
import VoiceRecorder from "@/app/components/VoiceRecorder"; // Using the clean @ alias

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a192f] text-white overflow-hidden relative">
      {/* Background Gradient Effect */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]" />
      </div>

      {/* Content */}
      <div className="z-10 flex flex-col items-center text-center space-y-8 px-4 w-full">
        <div className="p-8 bg-white/5 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md">
          <h1 className="text-7xl md:text-9xl font-extrabold tracking-tighter bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
            VOXA
          </h1>
        </div>

        <div className="space-y-2">
          <p className="text-2xl md:text-3xl font-light text-gray-200">
            Hire at the speed of sound.
          </p>
          <p className="text-sm text-gray-400 uppercase tracking-widest">
            The AI Recruitment Engine
          </p>
        </div>

        {/* 1. Recruiter Access (The Dashboard Link) */}
        <div className="mt-4">
          <Link href="/dashboard">
            <button className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-full font-bold text-sm transition-all flex items-center gap-2 backdrop-blur-md">
              View Recruiter Dashboard →
            </button>
          </Link>
        </div>

        {/* 2. Candidate Access (The Voice Recorder) */}
        <div className="mt-4 w-full max-w-md">
          <VoiceRecorder />
        </div>
      </div>
    </main>
  );
}
