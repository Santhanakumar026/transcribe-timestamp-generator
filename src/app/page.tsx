"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { AudioUploader } from "@/components/AudioUploader";
import { AudioPlayerWaveform } from "@/components/AudioPlayerWaveform";
import { IntervalSelector } from "@/components/IntervalSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TranscriptEditor } from "@/components/TranscriptEditor";
import { SettingsModal } from "@/components/SettingsModal";
import {
  TranscriptionResult,
  TranscribeOptions,
  SegmentItem,
  IntervalMode,
} from "@/types/transcript";
import { resegmentWords } from "@/utils/transcriptHelper";
import {
  Sparkles,
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Volume2,
  ShieldCheck,
  Cpu,
  Layers,
  HelpCircle,
} from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  // Transcription parameters
  const [interval, setInterval] = useState<number>(4);
  const [intervalMode, setIntervalMode] = useState<IntervalMode>("sentence");
  const [language, setLanguage] = useState<string>("auto");

  // Advanced settings
  const [options, setOptions] = useState<TranscribeOptions>({
    interval: 4,
    intervalMode: "sentence",
    language: "auto",
    provider: "auto",
    model: "base",
    groqApiKey: "",
    openaiApiKey: "",
  });

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Transcription output
  const [result, setResult] = useState<TranscriptionResult | null>(null);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // System health
  const [systemStatus, setSystemStatus] = useState<{
    ffmpeg: boolean;
    localWhisper: boolean;
    model: string;
  }>({
    ffmpeg: true,
    localWhisper: true,
    model: "base",
  });

  // Load saved API keys from localStorage on mount & check system health
  useEffect(() => {
    const savedGroq = localStorage.getItem("groq_api_key") || "";
    const savedOpenAI = localStorage.getItem("openai_api_key") || "";
    if (savedGroq || savedOpenAI) {
      setOptions((prev) => ({
        ...prev,
        groqApiKey: savedGroq,
        openaiApiKey: savedOpenAI,
      }));
    }

    // Health check
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setSystemStatus({
          ffmpeg: !!data.ffmpeg?.available,
          localWhisper: !!data.localWhisper?.available,
          model: data.localWhisper?.defaultModel || "base",
        });
      })
      .catch(() => {});
  }, []);

  // Update object URL when file changes
  useEffect(() => {
    if (!file) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Handle file select
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setErrorMessage(null);
  };

  // Clear file
  const handleClearFile = () => {
    setFile(null);
    setResult(null);
    setErrorMessage(null);
    setCurrentTime(0);
    setDuration(0);
  };

  // Load demo sample audio
  const handleLoadSample = async () => {
    try {
      setIsProcessing(true);
      setProgressStage("Fetching demo audio sample...");
      const res = await fetch("/api/sample");
      if (!res.ok) throw new Error("Could not load demo sample.");

      const blob = await res.blob();
      const sampleFile = new File([blob], "sample_speech.wav", { type: "audio/wav" });
      handleFileSelect(sampleFile);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load demo audio.");
    } finally {
      setIsProcessing(false);
      setProgressStage("");
    }
  };

  // Handle dynamic interval change: re-segment instantly if words are cached!
  const handleChangeInterval = (newInterval: number) => {
    setInterval(newInterval);
    if (result && result.words && result.words.length > 0) {
      const newSegments = resegmentWords(
        result.words,
        newInterval,
        result.duration,
        intervalMode
      );
      setResult((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          interval_seconds: newInterval,
          segments: newSegments,
          total_segments: newSegments.length,
        };
      });
    }
  };

  // Handle interval mode change (Sentence vs Smart Flow vs Grid)
  const handleChangeIntervalMode = (newMode: IntervalMode) => {
    setIntervalMode(newMode);
    if (result && result.words && result.words.length > 0) {
      const newSegments = resegmentWords(
        result.words,
        interval,
        result.duration,
        newMode
      );
      setResult((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          interval_mode: newMode,
          segments: newSegments,
          total_segments: newSegments.length,
        };
      });
    }
  };

  // Run Speech-to-Text AI Transcription
  const handleGenerateTranscript = async () => {
    if (!file) {
      setErrorMessage("Please upload an audio or video file first.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressPercent(10);
    setProgressStage("Uploading media file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("interval", interval.toString());
      formData.append("intervalMode", intervalMode);
      formData.append("language", language);
      formData.append("provider", options.provider);
      formData.append("model", options.model);

      if (options.groqApiKey) formData.append("groqApiKey", options.groqApiKey);
      if (options.openaiApiKey) formData.append("openaiApiKey", options.openaiApiKey);

      // Simulate progress stages
      const p1 = setTimeout(() => {
        setProgressPercent(30);
        setProgressStage("Extracting & normalizing audio with FFmpeg...");
      }, 800);

      const p2 = setTimeout(() => {
        setProgressPercent(55);
        setProgressStage("Running AI Speech-to-Text with word-level timestamps...");
      }, 2500);

      const p3 = setTimeout(() => {
        setProgressPercent(80);
        setProgressStage("Aligning exact word timings and building interval segments...");
      }, 6000);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate transcript.");
      }

      setProgressPercent(100);
      setProgressStage("Complete!");
      setResult(data);

      if (data.duration && data.duration > 0) {
        setDuration(data.duration);
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setErrorMessage(err.message || "An error occurred during transcription.");
    } finally {
      setIsProcessing(false);
      setProgressPercent(0);
      setProgressStage("");
    }
  };

  // Seek audio player to a given second timestamp
  const handleSeek = (secs: number) => {
    setSeekTime(secs);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      {/* Top Navigation */}
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        systemStatus={systemStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="text-center space-y-3 max-w-3xl mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Verbatim Transcription & Audio Alignment Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            AI Audio Transcription & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Timestamp Generator
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Upload MP3, WAV, M4A, AAC, FLAC, or MP4 video files. Generate verbatim, non-summarized transcripts with exact word-level timestamps grouped into customizable intervals.
          </p>
        </div>

        {/* Upload & Configuration Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Upload & Player (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Audio Uploader */}
            <AudioUploader
              onFileSelect={handleFileSelect}
              onLoadSample={handleLoadSample}
              selectedFile={file}
              onClearFile={handleClearFile}
              audioDuration={duration > 0 ? duration : null}
              isProcessing={isProcessing}
            />

            {/* Audio Player & Waveform Visualizer */}
            {audioUrl && (
              <AudioPlayerWaveform
                file={file}
                audioUrl={audioUrl}
                currentTime={currentTime}
                duration={duration}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
                seekTime={seekTime}
                onSeekComplete={() => setSeekTime(null)}
              />
            )}
          </div>

          {/* Right Column: Controls & Options (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Interval Selector */}
            <IntervalSelector
              interval={interval}
              onChangeInterval={handleChangeInterval}
              intervalMode={intervalMode}
              onChangeIntervalMode={handleChangeIntervalMode}
              isProcessing={isProcessing}
              hasExistingTranscript={!!result}
            />

            {/* Language Selector */}
            <LanguageSelector
              selectedLanguage={language}
              onSelectLanguage={setLanguage}
              detectedLanguage={result?.language}
              detectedConfidence={result?.language_confidence}
              isProcessing={isProcessing}
            />

            {/* Generate Button Card */}
            <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-lg space-y-3">
              <button
                type="button"
                onClick={handleGenerateTranscript}
                disabled={!file || isProcessing}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                  !file || isProcessing
                    ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
                    : "bg-gradient-to-r from-primary-600 via-primary-500 to-cyan-500 hover:from-primary-500 hover:to-cyan-400 text-white shadow-primary-500/25 hover:shadow-primary-500/40 transform hover:-translate-y-0.5"
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{progressStage || "Processing..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>Generate Transcript & Timestamps</span>
                  </>
                )}
              </button>

              {/* Progress bar when processing */}
              {isProcessing && (
                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{progressStage}</span>
                    <span>{progressPercent}%</span>
                  </div>
                </div>
              )}

              {/* Error banner */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center">
                Word-level alignment follows actual audio timing without inventing speech or skipping words.
              </p>
            </div>
          </div>
        </div>

        {/* Transcript Results Section */}
        {result && (
          <div className="space-y-4 pt-4">
            <TranscriptEditor
              result={result}
              currentTime={currentTime}
              onSeek={handleSeek}
              onUpdateSegments={(updated) => {
                setResult((prev) => (prev ? { ...prev, segments: updated } : null));
              }}
              onRegenerate={handleGenerateTranscript}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {/* Informational Feature Highlights */}
        <div className="pt-8 border-t border-surface-border/50 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl border border-surface-border/60 bg-surface/50 space-y-2">
            <div className="p-2 w-fit rounded-xl bg-primary-500/10 text-primary-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Exact Audio Timing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Timestamps strictly reflect actual audio playback time rather than arbitrary word counts. Segments group words by your exact interval window.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-surface-border/60 bg-surface/50 space-y-2">
            <div className="p-2 w-fit rounded-xl bg-cyan-500/10 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Verbatim Integrity</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No summarizing, paraphrasing, or skipped speech. Inaudible sections are cleanly marked as [Unclear] and silence is never fabricated.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-surface-border/60 bg-surface/50 space-y-2">
            <div className="p-2 w-fit rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Private & UTF-8 Native</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full UTF-8 support for Tamil, English, and 30+ languages. Uploaded audio files are automatically purged immediately after processing.
            </p>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        onChangeOptions={(updated) => setOptions((prev) => ({ ...prev, ...updated }))}
        systemStatus={systemStatus}
      />

      {/* Footer */}
      <footer className="mt-12 border-t border-surface-border/40 py-6 bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span className="font-semibold text-slate-300">AudioSync AI</span> — Word-Level Speech Transcription & Timestamps
          </div>
          <div className="flex items-center gap-4">
            <span>Ephemeral Processing</span>
            <span>•</span>
            <span>UTF-8 Certified</span>
            <span>•</span>
            <span>Multi-Language STT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

