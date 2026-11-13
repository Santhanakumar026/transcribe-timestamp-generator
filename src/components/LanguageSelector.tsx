"use client";

import React, { useState } from "react";
import { Globe, Check, ChevronDown, Search } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/utils/languages";

interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelectLanguage: (code: string) => void;
  detectedLanguage?: string | null;
  detectedConfidence?: number | null;
  isProcessing: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  detectedLanguage,
  detectedConfidence,
  isProcessing,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentOption = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-lg space-y-3 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Globe className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-slate-100">Spoken Language</span>
        </div>

        {detectedLanguage && (
          <div className="flex items-center gap-1.5 text-[11px] bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-500/20">
            <span>Detected:</span>
            <span className="font-semibold uppercase">{detectedLanguage}</span>
            {detectedConfidence !== undefined && detectedConfidence !== null && (
              <span className="text-slate-400">({Math.round(detectedConfidence * 100)}%)</span>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        AI will detect speech automatically or you can specify the exact language (e.g. Tamil, English).
      </p>

      {/* Dropdown Button */}
      <div className="relative">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-elevated hover:bg-slate-700/80 border border-surface-border text-slate-100 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">{currentOption.flag || "🌐"}</span>
            <span className="font-semibold text-slate-100">{currentOption.name}</span>
            <span className="text-slate-400 font-normal">({currentOption.nativeName})</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown Menu Modal */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl bg-surface-elevated border border-surface-border shadow-2xl p-2 max-h-72 flex flex-col">
              {/* Search filter */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search languages (Tamil, English...)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary-500"
                  autoFocus
                />
              </div>

              {/* Language list */}
              <div className="overflow-y-auto space-y-1 pr-1 custom-scrollbar flex-1">
                {filteredLanguages.map((lang) => {
                  const isSelected = selectedLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        onSelectLanguage(lang.code);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                        isSelected
                          ? "bg-primary-600/25 text-primary-300 font-medium border border-primary-500/30"
                          : "text-slate-300 hover:bg-surface hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{lang.flag || "🌐"}</span>
                        <span className="font-medium text-slate-200">{lang.name}</span>
                        <span className="text-slate-400 font-normal">({lang.nativeName})</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary-400" />}
                    </button>
                  );
                })}
                {filteredLanguages.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">No languages match your search</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

