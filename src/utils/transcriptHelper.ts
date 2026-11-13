import { WordItem, SegmentItem, IntervalMode, TranscriptionResult } from "@/types/transcript";

/**
 * Format seconds into [MM:SS] or [HH:MM:SS]
 */
export function formatTimestamp(seconds: number, forceHours: boolean = false): string {
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (forceHours || hrs > 0) {
    return `[${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}]`;
  }
  return `[${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}]`;
}

/**
 * Format seconds for SRT: 00:00:04,000
 */
export function formatSrtTimestamp(seconds: number): string {
  const total = Math.max(0, seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);
  const millis = Math.floor((total - Math.floor(total)) * 1000);

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

/**
 * Format seconds for VTT: 00:00:04.000
 */
export function formatVttTimestamp(seconds: number): string {
  return formatSrtTimestamp(seconds).replace(",", ".");
}

/**
 * Parse [MM:SS] or [HH:MM:SS] into seconds
 */
export function parseTimestampToSeconds(ts: string): number {
  const cleaned = ts.replace(/[[\]]/g, "").trim();
  const parts = cleaned.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }
  return 0;
}

/**
 * Merges split sub-words, hyphenated tokens, contractions, and punctuation
 * so a single word is NEVER chopped in half.
 */
export function cleanAndMergeSubwords(rawWords: WordItem[]): WordItem[] {
  if (!rawWords || rawWords.length === 0) return [];

  const merged: WordItem[] = [];

  for (const w of rawWords) {
    const text = (w.word || "").trim();
    if (!text) continue;

    const prev = merged[merged.length - 1];

    // Check if this token is a suffix/sub-word continuation
    const isHyphenContinuation = text.startsWith("-");
    const isPrevHyphen = prev && prev.word.endsWith("-");
    const isApostropheContraction = text.startsWith("'") || text.toLowerCase() === "n't";
    const isPunctuationOnly = /^[,.!?:;।॥]+$/.test(text);

    if (prev && (isHyphenContinuation || isPrevHyphen || isApostropheContraction || isPunctuationOnly)) {
      // Merge with previous word without breaking
      let combined = "";
      if (isHyphenContinuation || isPrevHyphen || isApostropheContraction || isPunctuationOnly) {
        combined = `${prev.word}${text}`.replace(/\s+/g, "");
      } else {
        combined = `${prev.word} ${text}`;
      }

      prev.word = combined;
      prev.original = `${prev.original}${w.original}`;
      prev.end = Math.max(prev.end, w.end);
      prev.probability = Math.min(prev.probability, w.probability);
    } else {
      merged.push({
        ...w,
        word: text,
        original: w.original || text,
      });
    }
  }

  return merged;
}

/**
 * Join words into natural readable text with correct spacing around punctuation
 */
export function joinWordsText(words: WordItem[]): string {
  if (!words || words.length === 0) return "";
  let result = "";

  for (let i = 0; i < words.length; i++) {
    const w = words[i].word;
    if (i === 0) {
      result += w;
    } else {
      // If current token is punctuation, don't prepend space
      if (/^[,.!?:;।॥)\]}]/.test(w)) {
        result += w;
      } else if (/^[(-]/.test(w) || result.endsWith("-") || result.endsWith("(")) {
        result += w;
      } else {
        result += " " + w;
      }
    }
  }

  return result.trim();
}

/**
 * Re-group words into segments according to mode:
 * 1. "sentence": Strictly sentence-by-sentence (Never cuts sentences or words)
 * 2. "smart_flow": Respects interval target but completes sentences and phrases gracefully without cutting words
 * 3. "grid": Fixed clock grid buckets with subword protection
 */
export function resegmentWords(
  rawWords: WordItem[],
  interval: number,
  duration: number,
  mode: IntervalMode = "sentence"
): SegmentItem[] {
  if (!rawWords || rawWords.length === 0) return [];

  // Step 1: Ensure no subwords or hyphenated tokens are split in half
  const words = cleanAndMergeSubwords(rawWords);
  const forceHours = duration >= 3600;
  const targetInterval = Math.max(2.0, interval);

  // ==========================================
  // MODE 1: SENTENCE-BY-SENTENCE (User Request)
  // ==========================================
  if (mode === "sentence") {
    const segments: SegmentItem[] = [];
    let currentWords: WordItem[] = [];

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      currentWords.push(w);

      const wordText = w.word;
      // Sentence terminators: period, exclamation, question mark, Indic danda
      const isSentenceEnd = /[.!?।॥]$/.test(wordText);

      // Also detect natural long pauses between sentences (gap >= 0.65s)
      let isLongPause = false;
      if (i < words.length - 1) {
        const gap = words[i + 1].start - w.end;
        if (gap >= 0.65) {
          isLongPause = true;
        }
      }

      const isLastWord = i === words.length - 1;

      if (isSentenceEnd || isLongPause || isLastWord) {
        const segStart = currentWords[0].start;
        const segEnd = currentWords[currentWords.length - 1].end;
        const text = joinWordsText(currentWords);

        segments.push({
          id: `seg_sent_${segments.length}`,
          index: segments.length + 1,
          timestamp: formatTimestamp(segStart, forceHours),
          actual_timestamp: formatTimestamp(segStart, forceHours),
          start: Number(segStart.toFixed(2)),
          end: Number(segEnd.toFixed(2)),
          actual_start: Number(segStart.toFixed(2)),
          actual_end: Number(segEnd.toFixed(2)),
          text,
          words: [...currentWords],
        });

        currentWords = [];
      }
    }

    return segments;
  }

  // ========================================================
  // MODE 2: SMART SENTENCE FLOW (Interval guided, zero cuts)
  // ========================================================
  if (mode === "smart_flow") {
    const segments: SegmentItem[] = [];
    let currentWords: WordItem[] = [];
    let segStartTime: number | null = null;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (segStartTime === null) {
        segStartTime = w.start;
      }
      currentWords.push(w);

      const currentDuration = w.end - segStartTime;
      const wordText = w.word;
      const isSentenceEnd = /[.!?।॥]$/.test(wordText);
      const isClauseEnd = /[,;:\-—]$/.test(wordText);

      let isAudioPause = false;
      if (i < words.length - 1) {
        const gap = words[i + 1].start - w.end;
        if (gap >= 0.35) {
          isAudioPause = true;
        }
      }

      const isLastWord = i === words.length - 1;

      // Close segment condition:
      // A) A sentence ended and we have at least 2.0s of speech
      // B) Current duration reached or exceeded targetInterval and at a natural phrase pause or sentence end
      // C) Current duration significantly exceeded targetInterval (max limit exceeded)
      const shouldClose =
        isLastWord ||
        (isSentenceEnd && (currentDuration >= targetInterval * 0.75 || currentDuration >= 3.0)) ||
        (currentDuration >= targetInterval && (isClauseEnd || isAudioPause)) ||
        currentDuration >= targetInterval * 1.4;

      if (shouldClose && currentWords.length > 0) {
        const segStart = segStartTime;
        const segEnd = currentWords[currentWords.length - 1].end;
        const text = joinWordsText(currentWords);

        segments.push({
          id: `seg_flow_${segments.length}`,
          index: segments.length + 1,
          timestamp: formatTimestamp(segStart, forceHours),
          actual_timestamp: formatTimestamp(segStart, forceHours),
          start: Number(segStart.toFixed(2)),
          end: Number(segEnd.toFixed(2)),
          actual_start: Number(segStart.toFixed(2)),
          actual_end: Number(segEnd.toFixed(2)),
          text,
          words: [...currentWords],
        });

        currentWords = [];
        segStartTime = null;
      }
    }

    return segments;
  }

  // ==========================================
  // MODE 3: CLOCK GRID (Fixed time window)
  // ==========================================
  const windows = new Map<number, WordItem[]>();

  for (const w of words) {
    const winIdx = Math.floor(w.start / targetInterval);
    if (!windows.has(winIdx)) {
      windows.set(winIdx, []);
    }
    windows.get(winIdx)!.push(w);
  }

  const segments: SegmentItem[] = [];
  const sortedKeys = Array.from(windows.keys()).sort((a, b) => a - b);

  for (const winIdx of sortedKeys) {
    const winWords = windows.get(winIdx)!;
    if (winWords.length === 0) continue;

    const windowStart = winIdx * targetInterval;
    const windowEnd = windowStart + targetInterval;
    const firstWordTime = winWords[0].start;
    const lastWordTime = winWords[winWords.length - 1].end;

    const text = joinWordsText(winWords);

    segments.push({
      id: `seg_${winIdx}`,
      index: segments.length + 1,
      timestamp: formatTimestamp(windowStart, forceHours),
      actual_timestamp: formatTimestamp(firstWordTime, forceHours),
      start: Number(windowStart.toFixed(2)),
      end: Number(windowEnd.toFixed(2)),
      actual_start: Number(firstWordTime.toFixed(2)),
      actual_end: Number(lastWordTime.toFixed(2)),
      text,
      words: winWords,
    });
  }

  return segments;
}

/**
 * Format plain text output with or without timestamps
 */
export function exportToTxt(segments: SegmentItem[], withTimestamps: boolean = true): string {
  if (withTimestamps) {
    return segments.map((s) => `${s.timestamp} ${s.text}`).join("\n");
  } else {
    return segments.map((s) => s.text).join("\n");
  }
}

/**
 * Format as SubRip (.srt) subtitle
 */
export function exportToSrt(segments: SegmentItem[]): string {
  return segments
    .map((s, idx) => {
      const start = formatSrtTimestamp(s.actual_start ?? s.start);
      const end = formatSrtTimestamp(s.actual_end ?? s.end);
      return `${idx + 1}\n${start} --> ${end}\n${s.text}\n`;
    })
    .join("\n");
}

/**
 * Format as WebVTT (.vtt)
 */
export function exportToVtt(segments: SegmentItem[]): string {
  const entries = segments
    .map((s, idx) => {
      const start = formatVttTimestamp(s.actual_start ?? s.start);
      const end = formatVttTimestamp(s.actual_end ?? s.end);
      return `${idx + 1}\n${start} --> ${end}\n${s.text}\n`;
    })
    .join("\n");

  return `WEBVTT\n\n${entries}`;
}

/**
 * Trigger browser file download with UTF-8 BOM for maximum compatibility (Tamil, etc.)
 */
export function downloadFile(content: string, filename: string, mimeType: string = "text/plain;charset=utf-8"): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Clipboard API failed:", err);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
