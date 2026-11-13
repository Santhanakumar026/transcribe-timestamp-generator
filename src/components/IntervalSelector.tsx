"use client";

import React from "react";
import { Clock, Info, Check, MessageSquareText, SlidersHorizontal, Sparkles } from "lucide-react";
import { IntervalMode } from "@/types/transcript";

interface IntervalSelectorProps {
  interval: number;
  onChangeInterval: (interval: number) => void;
  intervalMode: IntervalMode;
  onChangeIntervalMode: (mode: IntervalMode) => void;
  isProcessing: boolean;
  hasExistingTranscript?: boolean;
}

const PRESET_INTERVALS = [3, 4, 5];

export const IntervalSelector: React.FC<IntervalSelectorProps> = ({
  interval,
  onChangeInterval,
  intervalMode,
  onChangeIntervalMode,
  isProcessing,
  hasExistingTranscript,
}) => {
  const isPreset = PRESET_INTERVALS.includes(interval);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      onChangeInterval(Math.min(60, Math.max(3, val)));
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      onChangeInterval(Math.min(60, Math.max(3, val)));
    }
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-lg space-y-4">
      {/* Title & Help */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <MessageSquareText className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-slate-100">
            Transcription Segmentation Mode
          </span>
        </div>

        {hasExistingTranscript && (
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            Instant live re-grouping
          </span>
        )}
      </div>

      {/* 3 Segmentation Modes Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Mode 1: Sentence by Sentence */}
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => onChangeIntervalMode("sentence")}
          className={`p-3 rounded-xl text-left border transition-all relative ${
            intervalMode === "sentence"
              ? "bg-gradient-to-br from-primary-600/30 to-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50"
              : "bg-surface-elevated text-slate-300 border-surface-border hover:border-slate-600 hover:text-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sentence by Sentence</span>
            </div>
            {intervalMode === "sentence" && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">
            வாக்கிய வாரியாக: Complete sentence per segment. No words or sentences cut.
          </p>
        </button>

        {/* Mode 2: Smart Sentence Flow */}
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => onChangeIntervalMode("smart_flow")}
          className={`p-3 rounded-xl text-left border transition-all ${
            intervalMode === "smart_flow"
              ? "bg-primary-600/25 border-primary-500 text-white shadow-lg shadow-primary-500/10 ring-1 ring-primary-500/50"
              : "bg-surface-elevated text-slate-300 border-surface-border hover:border-slate-600 hover:text-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary-300">
              <Clock className="w-3.5 h-3.5" />
              <span>Smart Sentence Flow</span>
            </div>
            {intervalMode === "smart_flow" && (
              <span className="w-2 h-2 rounded-full bg-primary-400"></span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">
            Target duration without cutting sentences or words in the middle.
          </p>
        </button>

        {/* Mode 3: Clock Grid */}
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => onChangeIntervalMode("grid")}
          className={`p-3 rounded-xl text-left border transition-all ${
            intervalMode === "grid"
              ? "bg-primary-600/25 border-primary-500 text-white shadow-lg shadow-primary-500/10 ring-1 ring-primary-500/50"
              : "bg-surface-elevated text-slate-300 border-surface-border hover:border-slate-600 hover:text-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Clock Grid</span>
            </div>
            {intervalMode === "grid" && (
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">
            Fixed time steps ([00:00], [00:04], [00:08]).
          </p>
        </button>
      </div>

      {/* When Sentence Mode is Active */}
      {intervalMode === "sentence" ? (
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-cyan-300">
              Sentence-by-Sentence Mode Active
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Every segment corresponds to a complete grammatical sentence. Full sentences are kept intact, punctuation is preserved, and single words are never broken or split across lines.
            </p>
          </div>
        </div>
      ) : (
        /* Duration Controls for Smart Flow and Grid */
        <div className="space-y-3 pt-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Target Segment Interval:</span>
            <span className="text-cyan-300 font-mono font-semibold">{interval} seconds</span>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {PRESET_INTERVALS.map((sec) => {
              const isSelected = interval === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onChangeInterval(sec)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                    isSelected
                      ? "bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-500/20"
                      : "bg-surface-elevated text-slate-300 hover:text-white border-surface-border hover:border-slate-600"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>{sec}s</span>
                </button>
              );
            })}

            {/* Custom Pill Indicator */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                if (isPreset) onChangeInterval(8);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                !isPreset
                  ? "bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-500/20"
                  : "bg-surface-elevated text-slate-300 hover:text-white border-surface-border hover:border-slate-600"
              }`}
            >
              {!isPreset && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              <span>Custom</span>
            </button>
          </div>

          {/* Slider & Number Input */}
          <div className="bg-surface-elevated/70 p-3.5 rounded-xl border border-surface-border/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Duration Range (3s - 60s):</span>
              <div className="flex items-center gap-1.5 font-mono">
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={interval}
                  onChange={handleCustomInputChange}
                  disabled={isProcessing}
                  className="w-14 px-2 py-0.5 rounded-lg bg-surface border border-surface-border text-center text-cyan-300 font-bold focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-400">sec</span>
              </div>
            </div>

            <input
              type="range"
              min="3"
              max="60"
              step="1"
              value={interval}
              onChange={handleSliderChange}
              disabled={isProcessing}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>3s</span>
              <span>15s</span>
              <span>30s</span>
              <span>60s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
