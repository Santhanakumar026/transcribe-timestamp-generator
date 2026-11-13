"use client";

import React from "react";
import { Mic2, Settings, Sparkles, CheckCircle2, ShieldCheck, Cpu } from "lucide-react";

interface NavbarProps {
  onOpenSettings: () => void;
  systemStatus: {
    ffmpeg: boolean;
    localWhisper: boolean;
    model: string;
  };
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings, systemStatus }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-cyan-400 text-white shadow-lg shadow-primary-500/20">
            <Mic2 className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">AudioSync</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                AI STT
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Verbatim Transcription & Word-Level Timestamp Generator
            </p>
          </div>
        </div>

        {/* System Engine Status & Settings */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Engine:</span>
            <span className="font-medium text-slate-200">
              {systemStatus.localWhisper ? "Local Whisper" : "Cloud Whisper"}
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface/50 border border-surface-border/50 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Private & Ephemeral</span>
          </div>

          <button
            onClick={onOpenSettings}
            type="button"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-surface-border text-slate-200 hover:text-white transition-all text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            title="Configure STT AI Engine and API Keys"
          >
            <Settings className="w-4 h-4 text-primary-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};

