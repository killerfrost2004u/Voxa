"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Square, RotateCcw, UploadCloud, Loader2 } from "lucide-react";

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        chunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setResult(null); // Reset previous results

      setTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  // Submit to Gemini AI
  const handleSubmit = async () => {
    if (!audioBlob) return;

    setIsAnalyzing(true);
    setResult(null); // Clear previous results immediately

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      // Safety Check: Did the server return an error?
      if (data.error) {
        alert("AI Error: " + data.error);
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to connect to the server.");
      setResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 w-full max-w-lg mx-auto">
      {/* Visualizer */}
      <div className="relative flex items-center justify-center w-48 h-48">
        {isRecording && (
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute w-full h-full bg-blue-500/20 rounded-full"
          />
        )}
        <div
          className={`z-10 flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 transition-all duration-300 ${isRecording ? "border-red-500 bg-red-500/10" : "border-blue-500 bg-blue-900/30"}`}>
          {isRecording ? (
            <span className="text-3xl font-mono text-red-400 animate-pulse">
              {formatTime(timer)}
            </span>
          ) : (
            <Mic className="w-12 h-12 text-blue-400" />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        {!isRecording && !audioUrl && (
          <button
            onClick={startRecording}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all">
            Start Recording
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-lg shadow-red-500/30 transition-all flex items-center gap-2">
            <Square size={18} fill="currentColor" /> Stop
          </button>
        )}

        {/* Playback & Submit */}
        {!isRecording && audioUrl && !isAnalyzing && !result && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <audio src={audioUrl} controls className="w-64" />
            <div className="flex gap-3">
              <button
                onClick={() => setAudioUrl(null)}
                className="flex items-center gap-2 px-4 py-2 border border-white/20 hover:bg-white/10 rounded-lg text-sm transition-all">
                <RotateCcw size={16} /> Retry
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold shadow-lg shadow-green-500/20 transition-all">
                <UploadCloud size={18} /> Submit Application
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-blue-400">
            <Loader2 className="animate-spin" /> Analyzing Voice...
          </div>
        )}
      </div>

      {/* 🏆 THE RESULT CARD (Shows after AI Analysis) */}
      {result && (
        <div className="mt-6 p-6 bg-white/10 border border-white/20 rounded-xl w-full text-left animate-in zoom-in-95 duration-300">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            🎙️ AI Analysis Complete
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-black/30 rounded-lg">
              <p className="text-xs text-gray-400 uppercase">Fluency Level</p>
              <p className="text-2xl font-bold text-blue-400">
                {result.language_level}
              </p>
            </div>
            <div className="p-3 bg-black/30 rounded-lg">
              <p className="text-xs text-gray-400 uppercase">Sentiment</p>
              <p className="text-xl font-bold text-purple-400">
                {result.sentiment}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase mb-1">
              Candidate Summary
            </p>
            <p className="text-sm text-gray-200">{result.summary}</p>
          </div>

          {/* SAFER RECOMMENDATION BOX */}
          {result.recommendation && (
            <div
              className={`p-3 rounded-lg text-center font-bold ${result.recommendation === "Hire" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
              Recommendation: {result.recommendation.toUpperCase()}
            </div>
          )}

          <button
            onClick={() => {
              setAudioUrl(null);
              setResult(null);
            }}
            className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-white border border-transparent hover:border-white/20 rounded-lg">
            Test Another Candidate
          </button>
        </div>
      )}
    </div>
  );
}
