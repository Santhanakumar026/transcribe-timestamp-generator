# AudioSync AI - Audio Transcription & Timestamp Generator

A professional web application for extracting audio, performing verbatim speech-to-text transcription with word-level accuracy, and generating interval-grouped timestamp segments for audio and video files.

---

## 🌟 Key Features

1. **Multi-Format Ingestion**:
   - Audio formats: **MP3, WAV, M4A, AAC, FLAC**.
   - Video formats: **MP4** (automatic audio track extraction via FFmpeg).
   - Drag-and-drop file upload with visual preview and file validation up to 500MB.

2. **Verbatim Speech-to-Text**:
   - Zero summarizing, rewriting, or paraphrasing.
   - Preserves sentences, word order, and punctuation in original language.
   - Low-confidence or inaudible speech is cleanly tagged as `[Unclear]` instead of guessing.
   - Complete silence produces no fabricated speech.

3. **True Audio-Aligned Timestamps**:
   - Segments follow **actual audio playback time**, never arbitrary word counts.
   - Word-level timestamps group words strictly according to selected time windows.
   - Format: `[MM:SS]` (or `[HH:MM:SS]` for audio longer than 1 hour).
   - Example Output:
     ```text
     [00:00] Welcome to the AI audio transcription and timestamp generator website.
     [00:04] We provide word-level timestamps, interval segmentation,
     [00:08] and multiple export options.
     ```

4. **Customizable Interval Segmentation**:
   - Presets: **3 seconds, 4 seconds, 5 seconds**.
   - Custom: **3 to 60 seconds** slider and numerical input.
   - Dual alignment modes:
     - **Clock Interval Grid**: Aligns segments to fixed time windows (`[00:00]`, `[00:04]`, `[00:08]`).
     - **Speech Boundary**: Segments start at the exact moment speech begins and span up to target interval.
   - **Instant Live Re-grouping**: Changing interval re-segments cached words on the frontend without waiting for another API call!

5. **Multi-Language Detection & UTF-8 Native**:
   - Automatic language detection with confidence score.
   - Manual language selector supporting 30+ languages, including **Tamil (தமிழ்), English, Hindi (हिन्दी), Spanish, French, German, Japanese, Chinese, Arabic**, etc.
   - Strict UTF-8 preservation for all Indic and international characters.

6. **Interactive Waveform & Audio Player**:
   - Real-time audio peak waveform generated with Web Audio API.
   - Play/pause, 5s seek back/forward, playback speed (0.75x, 1x, 1.25x, 1.5x), volume.
   - **Bidirectional sync**: Clicking any timestamp seeks the player directly to that time.
   - Active segment and word highlight dynamically as audio plays.
   - Video view toggle for MP4 files.

7. **Editable Transcript & Flexible Exports**:
   - Inline text and timestamp editing.
   - Add, delete, split, and merge segments.
   - Export options:
     - Plain text with timestamps (`.txt`)
     - Plain text without timestamps (`.txt`)
     - SubRip Subtitles (`.srt`) for Premiere Pro, DaVinci Resolve, Final Cut
     - WebVTT Subtitles (`.vtt`)
     - Structured JSON (`.json`) with word-level timestamps and probabilities
     - One-click copy with toast feedback.

8. **Dual Engine Architecture**:
   - **Built-in Local Faster-Whisper**: Runs 100% offline and privately on your machine using CTranslate2 and FFmpeg. No API keys required!
   - **Cloud STT APIs (Optional)**: Support for Groq Whisper (`whisper-large-v3`) and OpenAI Whisper (`whisper-1`).

9. **Data Privacy & Ephemeral Retention**:
   - All uploaded audio and extracted temporary files are isolated in ephemeral directories and deleted immediately after processing.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Python**: 3.10+ (with `faster-whisper`, `soundfile`, `scipy`)
- **FFmpeg**: Installed and available in system PATH

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠 Project Structure

```text
├── scripts/
│   └── transcribe_engine.py      # Core Python STT engine (faster-whisper & cloud APIs)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── transcribe/       # POST route handling file uploads & transcription
│   │   │   ├── health/           # GET route checking FFmpeg & Whisper status
│   │   │   └── sample/           # GET route serving demo speech audio
│   │   ├── globals.css           # Modern dark Tailwind styles & custom scrollbars
│   │   ├── layout.tsx            # HTML root layout & metadata
│   │   └── page.tsx              # Main dashboard application
│   ├── components/
│   │   ├── Navbar.tsx            # Header with status badges and settings trigger
│   │   ├── AudioUploader.tsx     # Drag & drop upload zone with format validation
│   │   ├── AudioPlayerWaveform.tsx # Canvas waveform player with synchronized playback
│   │   ├── IntervalSelector.tsx  # 3s, 4s, 5s & custom 3-60s interval controls
│   │   ├── LanguageSelector.tsx  # Auto-detect + 30+ language selector dropdown
│   │   ├── TranscriptEditor.tsx  # Editable segment list, seeking, and exports
│   │   └── SettingsModal.tsx     # Engine selection, model size, and API keys
│   ├── types/
│   │   └── transcript.ts         # TypeScript interfaces
│   └── utils/
│       ├── languages.ts          # Supported languages list
│       └── transcriptHelper.ts   # Resegmentation, timestamp formatting, exports
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

