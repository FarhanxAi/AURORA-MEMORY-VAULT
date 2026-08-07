"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, CheckCircle2 } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";

interface AudioRecorderProps {
  onAudioRecorded: (file: File, audioUrl: string) => void;
  onClearAudio: () => void;
}

export function AudioRecorder({ onAudioRecorded, onClearAudio }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        const file = new File(
          [audioBlob],
          `voice-note-${Date.now()}.webm`,
          { type: "audio/webm" }
        );
        onAudioRecorded(file, url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access is required to record voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingTime(0);
    onClearAudio();
  };

  return (
    <div className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase font-bold tracking-wider text-aurora-emerald flex items-center gap-1.5">
          <Mic className="w-4 h-4" />
          <span>Voice Memory Recorder</span>
        </span>
        {isRecording && (
          <span className="flex items-center gap-2 text-xs text-rose-400 font-semibold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Recording Live ({formatTime(recordingTime)})</span>
          </span>
        )}
      </div>

      {!audioUrl && !isRecording && (
        <GlassButton
          type="button"
          variant="secondary"
          fullWidth
          size="md"
          onClick={startRecording}
          leftIcon={<Mic className="w-4 h-4 text-aurora-cyan" />}
        >
          Click to Start Recording Voice Note
        </GlassButton>
      )}

      {isRecording && (
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Animated Waveform Visualizer simulation */}
          <div className="flex items-center justify-center gap-1.5 h-12">
            {[40, 70, 30, 90, 50, 80, 40, 100, 60, 30, 75, 45].map((h, i) => (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-aurora-cyan to-aurora-violet rounded-full animate-pulse"
                style={{
                  height: `${Math.max(15, (h * Math.sin(Date.now() * 0.005 + i)) % 100)}%`,
                  animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                }}
              />
            ))}
          </div>

          <GlassButton
            type="button"
            variant="danger"
            size="md"
            onClick={stopRecording}
            leftIcon={<Square className="w-4 h-4" />}
          >
            Stop Recording ({formatTime(recordingTime)})
          </GlassButton>
        </div>
      )}

      {audioUrl && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/10">
            <button
              type="button"
              onClick={togglePlayback}
              className="p-2.5 rounded-full bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan hover:bg-aurora-cyan/30 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex-1">
              <p className="text-xs font-semibold text-white">Recorded Voice Memory</p>
              <p className="text-[10px] text-white/50">{formatTime(recordingTime)} Duration</p>
            </div>
            <button
              type="button"
              onClick={clearAudio}
              className="p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Voice note ready for vault saving</span>
          </div>
        </div>
      )}
    </div>
  );
}
