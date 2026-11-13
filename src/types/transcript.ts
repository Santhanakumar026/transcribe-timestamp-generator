export interface WordItem {
  word: string;
  original: string;
  start: number;
  end: number;
  probability: number;
}

export interface SegmentItem {
  id: string;
  index: number;
  timestamp: string;          // Formatted e.g. [00:00], [00:04]
  actual_timestamp?: string;   // Timestamp of first spoken word
  start: number;               // Interval window start in seconds
  end: number;                 // Interval window end in seconds
  actual_start?: number;       // Exact time first word starts
  actual_end?: number;         // Exact time last word ends
  text: string;
  words: WordItem[];
}

export type IntervalMode = "sentence" | "smart_flow" | "grid";

export interface TranscriptionResult {
  success: boolean;
  filename: string;
  duration: number;
  language: string;
  language_confidence: number;
  provider: string;
  processing_time: number;
  interval_seconds: number;
  interval_mode: IntervalMode;
  total_words: number;
  total_segments: number;
  verbatim_text: string;
  timestamped_text: string;
  clean_text: string;
  segments: SegmentItem[];
  sentence_segments?: SegmentItem[];
  smart_segments?: SegmentItem[];
  grid_segments?: SegmentItem[];
  words: WordItem[];
  error?: string;
}

export interface TranscribeOptions {
  interval: number;
  intervalMode: IntervalMode;
  language: string;
  provider: "auto" | "local" | "groq" | "openai";
  model: "tiny" | "base" | "small" | "medium";
  groqApiKey?: string;
  openaiApiKey?: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}
