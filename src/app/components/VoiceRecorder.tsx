"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Play, RotateCcw, UploadCloud } from "lucide-react";

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

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
        chunksRef.current = []; // Reset chunks
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Start Timer
      setTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied. Please allow microphone permissions.");
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      // Stop all audio tracks to turn off the red dot in browser tab
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  // Format Timer (00:00)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 w-full max-w-md mx-auto">
      {/* The Visualizer / Timer */}
      <div className="relative flex items-center justify-center w-48 h-48">
        {/* Pulsing Rings (Only when recording) */}
        {isRecording && (
          <>
            <motion.div
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute w-full h-full bg-blue-500/20 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2], opacity: [0.8, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
              className="absolute w-32 h-32 bg-purple-500/20 rounded-full"
            />
          </>
        )}

        {/* The Main Circle */}
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

        {/* Playback & Reset (After Recording) */}
        {!isRecording && audioUrl && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <audio src={audioUrl} controls className="w-64" />

            <div className="flex gap-3">
              <button
                onClick={() => setAudioUrl(null)}
                className="flex items-center gap-2 px-4 py-2 border border-white/20 hover:bg-white/10 rounded-lg text-sm transition-all">
                <RotateCcw size={16} /> Retry
              </button>
              <button className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold shadow-lg shadow-green-500/20 transition-all">
                <UploadCloud size={18} /> Submit Application
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
