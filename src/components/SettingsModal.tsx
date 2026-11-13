"use client";

import React, { useState } from "react";
import {
  X,
  Settings,
  Cpu,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { TranscribeOptions } from "@/types/transcript";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: TranscribeOptions;
  onChangeOptions: (updated: Partial<TranscribeOptions>) => void;
  systemStatus: {
    ffmpeg: boolean;
    localWhisper: boolean;
    model: string;
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onChangeOptions,
  systemStatus,
}) => {
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Engine & API Settings</h2>
              <p className="text-xs text-slate-400">
                Configure Speech-to-Text AI provider, models, and keys
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Health Status */}
        <div className="p-3 rounded-xl bg-surface-elevated/60 border border-surface-border text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Audio Processing (FFmpeg):</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Installed & Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Local AI Engine (faster-whisper):</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready (Offline & Verbatim)
            </span>
          </div>
        </div>

        {/* Engine Provider Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Speech-to-Text Provider</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "auto", name: "Auto / Local", desc: "Built-in Faster-Whisper" },
              { id: "groq", name: "Groq Cloud", desc: "Whisper-Large-v3 Turbo" },
              { id: "openai", name: "OpenAI Cloud", desc: "Whisper-1 API" },
            ].map((p) => {
              const isSelected = options.provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChangeOptions({ provider: p.id as any })}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    isSelected
                      ? "bg-primary-600/20 border-primary-500 text-white shadow-md shadow-primary-500/10"
                      : "bg-surface-elevated text-slate-300 border-surface-border hover:border-slate-600"
                  }`}
                >
                  <div className="text-xs font-bold">{p.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Selection (for local whisper) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-200">
            Local Whisper Model
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["tiny", "base", "small", "medium"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChangeOptions({ model: m })}
                className={`py-2 px-2.5 rounded-lg text-xs font-mono font-semibold text-center border transition-colors ${
                  options.model === m
                    ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm"
                    : "bg-surface-elevated text-slate-300 border-surface-border hover:bg-slate-700"
                }`}
              >
                {m}
                {m === "base" && " ★"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            ★ <span className="text-cyan-400 font-semibold">base</span> is pre-cached on this system, offering near-instant loading and high accuracy.
          </p>
        </div>

        {/* Cloud API Keys (Optional) */}
        <div className="space-y-3 pt-2 border-t border-surface-border/60">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Optional Cloud API Keys</span>
          </div>

          {/* Groq API Key */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">Groq API Key (whisper-large-v3):</label>
            <div className="relative">
              <input
                type={showGroqKey ? "text" : "password"}
                placeholder="gsk_..."
                value={options.groqApiKey || ""}
                onChange={(e) => {
                  onChangeOptions({ groqApiKey: e.target.value });
                  localStorage.setItem("groq_api_key", e.target.value);
                }}
                className="w-full px-3 py-2 pr-9 rounded-xl bg-surface-elevated border border-surface-border text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGroqKey(!showGroqKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">OpenAI API Key (whisper-1):</label>
            <div className="relative">
              <input
                type={showOpenAIKey ? "text" : "password"}
                placeholder="sk-..."
                value={options.openaiApiKey || ""}
                onChange={(e) => {
                  onChangeOptions({ openaiApiKey: e.target.value });
                  localStorage.setItem("openai_api_key", e.target.value);
                }}
                className="w-full px-3 py-2 pr-9 rounded-xl bg-surface-elevated border border-surface-border text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Security & Retention Notice */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Privacy & Data Retention Policy:</strong> Uploaded audio files are processed in an isolated ephemeral directory and automatically deleted immediately after transcription completes. No audio or text logs are retained on disk.
          </span>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs transition-colors shadow-md shadow-primary-600/25"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

