"use client";

import React, { useRef, useState, useCallback } from "react";
import {
  UploadCloud,
  FileAudio,
  FileVideo,
  X,
  Play,
  Sparkles,
  AlertCircle,
  FileCheck2,
} from "lucide-react";

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  onLoadSample: () => void;
  selectedFile: File | null;
  onClearFile: () => void;
  audioDuration: number | null;
  isProcessing: boolean;
}

const SUPPORTED_FORMATS = [
  { ext: "MP3", mime: "audio/mpeg" },
  { ext: "WAV", mime: "audio/wav" },
  { ext: "M4A", mime: "audio/mp4" },
  { ext: "AAC", mime: "audio/aac" },
  { ext: "FLAC", mime: "audio/flac" },
  { ext: "MP4", mime: "video/mp4", video: true },
];

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelect,
  onLoadSample,
  selectedFile,
  onClearFile,
  audioDuration,
  isProcessing,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const validateAndHandle = useCallback(
    (file: File) => {
      setErrorMsg(null);
      const ext = file.name.split(".").pop()?.toLowerCase();
      const validExtensions = ["mp3", "wav", "m4a", "aac", "flac", "mp4", "ogg", "webm"];

      if (!ext || !validExtensions.includes(ext)) {
        setErrorMsg(
          `Invalid file format (.${ext}). Please upload an audio or video file: MP3, WAV, M4A, AAC, FLAC, or MP4.`
        );
        return;
      }

      // Check max size (e.g. 500MB)
      if (file.size > 500 * 1024 * 1024) {
        setErrorMsg("File size exceeds the 500MB limit.");
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandle(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandle(e.target.files[0]);
    }
  };

  const isVideo = selectedFile && selectedFile.type.includes("video") || selectedFile?.name.endsWith(".mp4");

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/mp4,.mp3,.wav,.m4a,.aac,.flac,.mp4,.ogg,.webm"
        className="hidden"
        onChange={handleInputChange}
        disabled={isProcessing}
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 transition-all duration-300 text-center ${
            isDragOver
              ? "border-primary-400 bg-primary-500/10 scale-[1.008] shadow-2xl shadow-primary-500/10"
              : "border-surface-border hover:border-primary-500/50 bg-surface/50 hover:bg-surface/80"
          }`}
        >
          {/* Subtle Background Glow */}
          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <div className="flex flex-col items-center justify-center gap-4">
            <div
              className={`p-4 rounded-2xl transition-transform duration-300 group-hover:scale-110 ${
                isDragOver ? "bg-primary-500 text-white" : "bg-surface-elevated text-primary-400 border border-surface-border"
              }`}
            >
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div>
              <p className="text-base sm:text-lg font-semibold text-slate-100">
                Drag and drop your audio or video file here
              </p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                or <span className="text-primary-400 font-medium underline underline-offset-4">browse files</span> from your computer
              </p>
            </div>

            {/* Formats badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 max-w-md">
              {SUPPORTED_FORMATS.map((item) => (
                <span
                  key={item.ext}
                  className={`text-xs px-2.5 py-1 rounded-md font-mono border ${
                    item.video
                      ? "bg-purple-900/30 text-purple-300 border-purple-700/50"
                      : "bg-surface text-slate-300 border-surface-border"
                  }`}
                >
                  {item.ext}
                  {item.video && " (Video)"}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Supports verbatim audio extraction from MP4 videos, speech-to-text with exact word timestamps up to 500MB.
            </p>

            {/* Quick Demo Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadSample();
                }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 text-xs font-medium transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Try Demo Audio File</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="rounded-2xl border border-surface-border bg-surface/90 p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400">
                {isVideo ? (
                  <FileVideo className="w-7 h-7 text-purple-400" />
                ) : (
                  <FileAudio className="w-7 h-7 text-primary-400" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-100 max-w-md truncate">
                    {selectedFile.name}
                  </h3>
                  {isVideo && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      MP4 Video
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span>{selectedFile.name.split(".").pop()?.toUpperCase()}</span>
                  {audioDuration !== null && audioDuration > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-cyan-300 font-mono">
                        Duration: {formatDuration(audioDuration)}
                      </span>
                    </>
                  )}
                  {isVideo && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400">Auto audio extraction enabled</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="hidden sm:inline-flex text-xs px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-slate-700 text-slate-300 transition-colors border border-surface-border"
              >
                Change File
              </button>

              <button
                type="button"
                onClick={onClearFile}
                disabled={isProcessing}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

