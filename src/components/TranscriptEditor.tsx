"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SegmentItem,
  WordItem,
  TranscriptionResult,
} from "@/types/transcript";
import {
  Play,
  Copy,
  Check,
  Download,
  Search,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Split,
  Combine,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  copyToClipboard,
  downloadFile,
  exportToTxt,
  exportToSrt,
  exportToVtt,
  formatTimestamp,
  parseTimestampToSeconds,
} from "@/utils/transcriptHelper";

interface TranscriptEditorProps {
  result: TranscriptionResult;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onUpdateSegments: (segments: SegmentItem[]) => void;
  onRegenerate: () => void;
  isProcessing: boolean;
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  result,
  currentTime,
  onSeek,
  onUpdateSegments,
  onRegenerate,
  isProcessing,
}) => {
  const [segments, setSegments] = useState<SegmentItem[]>(result.segments);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync state if result.segments changes externally (e.g. interval slider adjusted)
  useEffect(() => {
    setSegments(result.segments);
  }, [result.segments]);

  // Determine active segment based on currentTime
  const activeSegmentIndex = segments.findIndex((seg) => {
    const s = seg.actual_start !== undefined ? seg.actual_start : seg.start;
    const e = seg.actual_end !== undefined ? seg.actual_end : seg.end;
    return currentTime >= s && currentTime < e;
  });

  // Auto-scroll to active segment
  useEffect(() => {
    if (autoScroll && activeSegmentRef.current && containerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  // Handle text edit
  const handleTextChange = (id: string, newText: string) => {
    const updated = segments.map((seg) => {
      if (seg.id === id) {
        return { ...seg, text: newText };
      }
      return seg;
    });
    setSegments(updated);
    onUpdateSegments(updated);
  };

  // Handle timestamp edit
  const handleTimestampChange = (id: string, newTs: string) => {
    const updated = segments.map((seg) => {
      if (seg.id === id) {
        const secs = parseTimestampToSeconds(newTs);
        return {
          ...seg,
          timestamp: newTs.startsWith("[") ? newTs : `[${newTs}]`,
          start: secs,
        };
      }
      return seg;
    });
    setSegments(updated);
    onUpdateSegments(updated);
  };

  // Delete segment
  const handleDeleteSegment = (id: string) => {
    const updated = segments.filter((seg) => seg.id !== id);
    setSegments(updated);
    onUpdateSegments(updated);
  };

  // Add a new segment below
  const handleAddSegmentBelow = (index: number) => {
    const prevSeg = segments[index];
    const newStart = prevSeg ? prevSeg.end : 0;
    const newEnd = newStart + 4.0;
    const newSeg: SegmentItem = {
      id: `seg_custom_${Date.now()}`,
      index: index + 2,
      timestamp: formatTimestamp(newStart, result.duration >= 3600),
      start: newStart,
      end: newEnd,
      text: "",
      words: [],
    };
    const updated = [...segments];
    updated.splice(index + 1, 0, newSeg);
    setSegments(updated);
    onUpdateSegments(updated);
    setEditingSegmentId(newSeg.id);
  };

  // Merge with next segment
  const handleMergeNext = (index: number) => {
    if (index >= segments.length - 1) return;
    const curr = segments[index];
    const next = segments[index + 1];

    const merged: SegmentItem = {
      ...curr,
      end: next.end,
      actual_end: next.actual_end ?? next.end,
      text: `${curr.text} ${next.text}`.trim(),
      words: [...curr.words, ...next.words],
    };

    const updated = segments.filter((_, idx) => idx !== index + 1).map((s, idx) => {
      return idx === index ? merged : s;
    });

    setSegments(updated);
    onUpdateSegments(updated);
  };

  // Copy plain timestamped transcript
  const handleCopyAll = async () => {
    const text = exportToTxt(segments, true);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter segments by search query
  const filteredSegments = segments.filter((seg) =>
    seg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    seg.timestamp.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-surface-border bg-surface shadow-2xl flex flex-col overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-surface-border/60 bg-surface-elevated/40 flex flex-wrap items-center justify-between gap-3">
        {/* Info stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm sm:text-base text-slate-100">
              Verbatim Transcript
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30 font-medium">
              {segments.length} Segments
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300 font-mono">
              {result.total_words} Words
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Lang: {result.language.toUpperCase()}
            </span>
            <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
              {result.interval_mode === "sentence"
                ? "Sentence-by-Sentence"
                : result.interval_mode === "smart_flow"
                ? `Smart Flow (${result.interval_seconds}s)`
                : `Grid (${result.interval_seconds}s)`}
            </span>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-slate-700 text-slate-200 hover:text-white border border-surface-border text-xs font-medium transition-all shadow-sm"
            title="Copy timestamped transcript to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy All</span>
              </>
            )}
          </button>

          {/* Regenerate Button */}
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-slate-700 text-slate-200 hover:text-white border border-surface-border text-xs font-medium transition-all shadow-sm"
            title="Re-run speech-to-text AI model"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isProcessing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Regenerate</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Auto-scroll Toggle */}
      <div className="px-4 py-2.5 bg-background/50 border-b border-surface-border/40 flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transcript words or [MM:SS]..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-surface-border/70 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200 select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded border-slate-700 bg-surface text-primary-500 focus:ring-0 cursor-pointer"
          />
          <span>Auto-scroll to active speech</span>
        </label>
      </div>

      {/* Segments List */}
      <div
        ref={containerRef}
        className="divide-y divide-surface-border/40 max-h-[580px] overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-1"
      >
        {filteredSegments.map((segment, idx) => {
          const isActive = idx === activeSegmentIndex;
          const isEditing = editingSegmentId === segment.id;

          return (
            <div
              key={segment.id}
              ref={isActive ? activeSegmentRef : null}
              className={`group relative rounded-xl p-3 sm:p-3.5 transition-all duration-200 ${
                isActive
                  ? "bg-primary-950/40 border border-primary-500/50 shadow-lg shadow-primary-500/10"
                  : "hover:bg-surface-elevated/50 border border-transparent"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Timestamp Button - Clicking seeks player! */}
                <button
                  type="button"
                  onClick={() => onSeek(segment.actual_start ?? segment.start)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all ${
                    isActive
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 scale-105"
                      : "bg-surface-elevated text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 border border-cyan-500/30"
                  }`}
                  title="Click to jump audio player to this timestamp"
                >
                  <Play className={`w-3 h-3 ${isActive ? "fill-current" : ""}`} />
                  <span>{segment.timestamp}</span>
                </button>

                {/* Segment Text & Word Tokens */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Timestamp:</span>
                        <input
                          type="text"
                          value={segment.timestamp}
                          onChange={(e) => handleTimestampChange(segment.id, e.target.value)}
                          className="px-2 py-0.5 rounded bg-surface border border-surface-border text-cyan-300 font-mono text-xs w-24"
                        />
                      </div>
                      <textarea
                        value={segment.text}
                        onChange={(e) => handleTextChange(segment.id, e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-surface border border-primary-500/50 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 custom-scrollbar resize-y min-h-[60px]"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSegmentId(null)}
                          className="px-3 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingSegmentId(segment.id)}
                      className="cursor-text text-sm sm:text-base leading-relaxed text-slate-200 hover:text-white transition-colors"
                      title="Click to edit transcript text"
                    >
                      {/* Render words with interactive tooltip and [Unclear] highlighting */}
                      {segment.words && segment.words.length > 0 ? (
                        <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                          {segment.words.map((w, wIdx) => {
                            const isUnclear = w.word.includes("[Unclear]");
                            const isWordActive =
                              currentTime >= w.start && currentTime < w.end;

                            return (
                              <span
                                key={wIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSeek(w.start);
                                }}
                                title={`Word: "${w.original}" | Time: ${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s | Confidence: ${Math.round(w.probability * 100)}%`}
                                className={`inline-block px-1 rounded transition-colors cursor-pointer select-text ${
                                  isWordActive
                                    ? "bg-cyan-400 text-slate-950 font-semibold shadow-sm"
                                    : isUnclear
                                    ? "bg-amber-500/20 text-amber-300 font-semibold underline decoration-amber-400"
                                    : "hover:bg-slate-700/70"
                                }`}
                              >
                                {w.word}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span>{segment.text}</span>
                      )}
                    </div>
                  )}

                  {/* Window timing metadata */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-1">
                    <span>
                      Window: {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
                    </span>
                    {segment.actual_start !== undefined && (
                      <span>
                        • Spoken: {formatTimestamp(segment.actual_start)} - {formatTimestamp(segment.actual_end ?? segment.end)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit / Split / Merge / Delete Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingSegmentId(isEditing ? null : segment.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-elevated transition-colors"
                    title="Edit segment"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {idx < segments.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMergeNext(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-surface-elevated transition-colors"
                      title="Merge with next segment"
                    >
                      <Combine className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAddSegmentBelow(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-surface-elevated transition-colors"
                    title="Add segment below"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSegment(segment.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete segment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredSegments.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs">
            No transcript segments match &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      {/* Bottom Download & Export Bar */}
      <div className="p-4 bg-surface-elevated/60 border-t border-surface-border/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click any timestamp to seek audio • Click text to edit</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Timestamped TXT */}
          <button
            type="button"
            onClick={() => {
              const text = exportToTxt(segments, true);
              const filename = `${result.filename.replace(/\.[^/.]+$/, "")}_timestamps.txt`;
              downloadFile(text, filename);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-md shadow-primary-600/20 transition-all"
            title="Download plain .txt file with [MM:SS] timestamps"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .txt (With Timestamps)</span>
          </button>

          {/* Download Clean TXT */}
          <button
            type="button"
            onClick={() => {
              const text = exportToTxt(segments, false);
              const filename = `${result.filename.replace(/\.[^/.]+$/, "")}_clean.txt`;
              downloadFile(text, filename);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-slate-700 text-slate-200 hover:text-white border border-surface-border text-xs font-medium transition-all"
            title="Download plain .txt file without timestamps"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Without Timestamps</span>
          </button>

          {/* Download Subtitles SRT */}
          <button
            type="button"
            onClick={() => {
              const srt = exportToSrt(segments);
              const filename = `${result.filename.replace(/\.[^/.]+$/, "")}.srt`;
              downloadFile(srt, filename, "application/x-subrip;charset=utf-8");
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-slate-700 text-slate-200 hover:text-white border border-surface-border text-xs font-medium transition-all font-mono"
            title="Download SRT Subtitle file for video editing"
          >
            <span>.SRT</span>
          </button>

          {/* Download JSON */}
          <button
            type="button"
            onClick={() => {
              const jsonStr = JSON.stringify(result, null, 2);
              const filename = `${result.filename.replace(/\.[^/.]+$/, "")}_transcript.json`;
              downloadFile(jsonStr, filename, "application/json;charset=utf-8");
            }}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-slate-700 text-slate-200 hover:text-white border border-surface-border text-xs font-medium transition-all font-mono"
            title="Download full JSON structure with word-level timestamps"
          >
            <span>.JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};

