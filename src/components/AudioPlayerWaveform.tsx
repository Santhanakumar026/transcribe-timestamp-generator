"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Sliders,
  Video as VideoIcon,
  AudioWaveform,
} from "lucide-react";
import { formatTimestamp } from "@/utils/transcriptHelper";

interface AudioPlayerWaveformProps {
  file: File | null;
  audioUrl: string | null;
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  seekTime: number | null;
  onSeekComplete: () => void;
  activeSegmentStart?: number;
  activeSegmentEnd?: number;
}

export const AudioPlayerWaveform: React.FC<AudioPlayerWaveformProps> = ({
  file,
  audioUrl,
  currentTime,
  duration,
  onTimeUpdate,
  onDurationChange,
  seekTime,
  onSeekComplete,
}) => {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [isVideoView, setIsVideoView] = useState(false);

  const isVideo = file && (file.type.includes("video") || file.name.endsWith(".mp4"));

  // Generate real audio waveform peaks using Web Audio API
  useEffect(() => {
    if (!file) {
      setWaveformPeaks([]);
      return;
    }

    let isCancelled = false;
    const generatePeaks = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

        if (isCancelled) return;

        const channelData = decodedBuffer.getChannelData(0);
        const samples = 120; // 120 bars for smooth responsive visual
        const blockSize = Math.floor(channelData.length / samples);
        const peaks: number[] = [];

        for (let i = 0; i < samples; i++) {
          let max = 0;
          for (let j = 0; j < blockSize; j++) {
            const val = Math.abs(channelData[i * blockSize + j] || 0);
            if (val > max) max = val;
          }
          peaks.push(Math.max(0.08, Math.min(1.0, max)));
        }

        setWaveformPeaks(peaks);
        if (decodedBuffer.duration && decodedBuffer.duration > 0) {
          onDurationChange(decodedBuffer.duration);
        }
        await audioCtx.close();
      } catch (err) {
        // Fallback to randomized aesthetic peaks if decodeAudioData fails (e.g. some video codecs)
        const pseudoPeaks: number[] = [];
        for (let i = 0; i < 120; i++) {
          pseudoPeaks.push(0.15 + Math.sin(i * 0.25) * 0.35 + Math.random() * 0.3);
        }
        setWaveformPeaks(pseudoPeaks);
      }
    };

    generatePeaks();
    return () => {
      isCancelled = true;
    };
  }, [file, onDurationChange]);

  // Handle external seek request (e.g. user clicked timestamp in transcript)
  useEffect(() => {
    if (seekTime !== null && mediaRef.current) {
      mediaRef.current.currentTime = seekTime;
      onTimeUpdate(seekTime);
      onSeekComplete();
    }
  }, [seekTime, onSeekComplete, onTimeUpdate]);

  // Draw interactive waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformPeaks.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const numBars = waveformPeaks.length;
    const barWidth = width / numBars;
    const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

    ctx.clearRect(0, 0, width, height);

    waveformPeaks.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(4, peak * (height - 8));
      const y = (height - barHeight) / 2;
      const isPlayed = index / numBars <= progressRatio;

      if (isPlayed) {
        // Glowing played gradient
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, "#818cf8"); // primary-400
        grad.addColorStop(1, "#06b6d4"); // cyan-500
        ctx.fillStyle = grad;
      } else {
        // Unplayed background bars
        ctx.fillStyle = "rgba(71, 85, 105, 0.45)"; // slate-600 with opacity
      }

      // Rounded bar
      const radius = 2;
      ctx.beginPath();
      ctx.roundRect(x + 1, y, Math.max(1, barWidth - 2), barHeight, radius);
      ctx.fill();
    });

    // Draw playhead cursor line
    if (duration > 0) {
      const playheadX = progressRatio * width;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(playheadX - 1, 0, 2, height);

      // Playhead top marker
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(playheadX, 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [waveformPeaks, currentTime, duration]);

  const togglePlay = () => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      mediaRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSkip = (seconds: number) => {
    if (!mediaRef.current) return;
    const newTime = Math.max(0, Math.min(duration, mediaRef.current.currentTime + seconds));
    mediaRef.current.currentTime = newTime;
    onTimeUpdate(newTime);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !mediaRef.current || duration <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * duration;
    mediaRef.current.currentTime = targetTime;
    onTimeUpdate(targetTime);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = speed;
    }
  };

  const toggleMute = () => {
    if (!mediaRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    mediaRef.current.muted = newMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (mediaRef.current) {
      mediaRef.current.volume = val;
      mediaRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  if (!audioUrl) return null;

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-xl">
      {/* Hidden Audio / Visible Video Element */}
      {isVideo && isVideoView ? (
        <div className="mb-4 rounded-xl overflow-hidden bg-black flex justify-center max-h-72">
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={audioUrl}
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
            onEnded={() => setIsPlaying(false)}
            className="w-full max-h-72 object-contain"
          />
        </div>
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={audioUrl}
          onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Waveform Canvas */}
      <div className="relative w-full mb-3 select-none">
        <canvas
          ref={canvasRef}
          width={800}
          height={68}
          onClick={handleWaveformClick}
          className="w-full h-16 rounded-xl bg-background/60 border border-surface-border/50 cursor-pointer hover:border-primary-500/40 transition-colors"
          title="Click to seek playback"
        />
        {/* Timestamp overlay */}
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mt-1 px-1">
          <span className="text-cyan-400 font-semibold">{formatTimestamp(currentTime)}</span>
          <span className="text-slate-400">Total: {formatTimestamp(duration)}</span>
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-surface-border/40">
        {/* Playback Transport */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSkip(-5)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-surface-elevated transition-colors"
            title="Rewind 5 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white shadow-lg shadow-primary-500/25 transition-all transform hover:scale-105"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(5)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-surface-elevated transition-colors"
            title="Forward 5 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-surface-elevated/80 p-1 rounded-xl border border-surface-border">
          {[0.75, 1.0, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => handleSpeedChange(speed)}
              className={`px-2 py-0.5 text-xs font-mono rounded-lg transition-colors ${
                playbackRate === speed
                  ? "bg-primary-500 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Volume & View Controls */}
        <div className="flex items-center gap-3">
          {/* Video Toggle if MP4 */}
          {isVideo && (
            <button
              type="button"
              onClick={() => setIsVideoView(!isVideoView)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isVideoView
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                  : "bg-surface-elevated text-slate-400 border-surface-border hover:text-slate-200"
              }`}
              title="Toggle Video Player"
            >
              {isVideoView ? <AudioWaveform className="w-3.5 h-3.5" /> : <VideoIcon className="w-3.5 h-3.5" />}
              <span>{isVideoView ? "Audio Wave" : "Video View"}</span>
            </button>
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 accent-primary-500 h-1 bg-surface-border rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

