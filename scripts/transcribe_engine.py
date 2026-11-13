#!/usr/bin/env python3
"""
AI Audio Transcription & Timestamp Generator Engine
Supports:
- Sentence-by-Sentence verbatim segmentation (Zero sentence truncation, Zero word cuts)
- Smart Sentence & Clause Flow with user-selected target intervals (3s, 4s, 5s, custom)
- Clock Grid Interval segmentation
- Local faster-whisper (CTranslate2) with real word-level timestamps
- Cloud Groq Whisper API (whisper-large-v3) with word-level timestamps
- Cloud OpenAI Whisper API (whisper-1) with word-level timestamps
- Automatic audio extraction from MP4, M4A, AAC, FLAC, WAV, MP3 via ffmpeg
- Sub-word / hyphenated token consolidation to prevent partial word cuts
- Silence detection without inventing speech
- [Unclear] marker for low-confidence or garbled speech
- Automatic language detection (English, Tamil, Spanish, German, Hindi, etc.)
"""

import sys
import os
import json
import argparse
import subprocess
import tempfile
import math
import time
import re
from typing import List, Dict, Any, Optional

def format_timestamp(seconds: float, force_hours: bool = False) -> str:
    """Format seconds into [MM:SS] or [HH:MM:SS]."""
    total_seconds = max(0.0, float(seconds))
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    secs = int(total_seconds % 60)
    
    if force_hours or hours > 0:
        return f"[{hours:02d}:{minutes:02d}:{secs:02d}]"
    else:
        return f"[{minutes:02d}:{secs:02d}]"

def get_audio_duration(file_path: str) -> float:
    """Get audio duration in seconds using ffprobe or ffmpeg."""
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        val = result.stdout.strip()
        if val and val != "N/A":
            return float(val)
    except Exception:
        pass

    try:
        cmd = ["ffmpeg", "-i", file_path]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        for line in result.stderr.splitlines():
            if "Duration:" in line:
                parts = line.split("Duration:")[1].split(",")[0].strip()
                h, m, s = parts.split(":")
                return float(h) * 3600 + float(m) * 60 + float(s)
    except Exception:
        pass
    return 0.0

def convert_to_wav(input_path: str, output_path: str) -> None:
    """Extract and normalize audio to 16kHz mono WAV for Whisper."""
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_path
    ]
    process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if process.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed: {process.stderr[-300:]}")

def load_audio_array(wav_path: str):
    """Load audio file as a float32 16kHz numpy array using soundfile."""
    import soundfile as sf
    import numpy as np

    data, sr = sf.read(wav_path)
    if data.ndim > 1:
        data = np.mean(data, axis=1)

    if sr != 16000:
        import scipy.signal
        num_samples = int(len(data) * 16000 / sr)
        data = scipy.signal.resample(data, num_samples)

    return data.astype(np.float32)

def clean_and_merge_subwords(raw_words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Consolidate sub-word tokens, hyphenated fragments, and apostrophes
    so that words are NEVER cut or split in half across intervals.
    """
    if not raw_words:
        return []

    merged: List[Dict[str, Any]] = []
    for w in raw_words:
        text = str(w.get("word", "")).strip()
        if not text:
            continue

        prev = merged[-1] if merged else None

        is_hyphen = text.startswith("-")
        is_prev_hyphen = prev and str(prev["word"]).endswith("-")
        is_contraction = text.startswith("'") or text.lower() == "n't"
        is_punct_only = bool(re.match(r"^[,.!?:;।॥]+$", text))

        if prev and (is_hyphen or is_prev_hyphen or is_contraction or is_punct_only):
            # Merge with previous word without breaking
            prev["word"] = f"{prev['word']}{text}".replace(" -", "-").replace("  ", " ")
            prev["original"] = f"{prev.get('original', '')}{w.get('original', '')}"
            prev["end"] = max(float(prev["end"]), float(w["end"]))
            prev["probability"] = min(float(prev.get("probability", 1.0)), float(w.get("probability", 1.0)))
        else:
            merged.append({
                "word": text,
                "original": w.get("original", text),
                "start": round(float(w["start"]), 3),
                "end": round(float(w["end"]), 3),
                "probability": round(float(w.get("probability", 1.0)), 3)
            })

    return merged

def join_words_text(words: List[Dict[str, Any]]) -> str:
    """Format words into natural sentence text with proper spacing."""
    if not words:
        return ""
    result = []
    for i, w in enumerate(words):
        t = str(w["word"])
        if i == 0:
            result.append(t)
        else:
            if re.match(r"^[,.!?:;।॥)\]}]", t):
                result[-1] = result[-1] + t
            elif re.match(r"^[(-]", t) or result[-1].endswith("-") or result[-1].endswith("("):
                result[-1] = result[-1] + t
            else:
                result.append(t)
    return " ".join(result).strip()

def transcribe_local_whisper(
    wav_path: str,
    language: Optional[str] = None,
    model_size: str = "base"
) -> Dict[str, Any]:
    """Transcribe using faster-whisper with word-level timestamps."""
    from faster_whisper import WhisperModel

    lang_param = None if (not language or language == "auto") else language

    device = "cpu"
    compute_type = "int8"
    try:
        import torch
        if torch.cuda.is_available():
            device = "cuda"
            compute_type = "float16"
    except Exception:
        pass

    sys.stderr.write(f"Loading faster-whisper model '{model_size}' on {device} ({compute_type})...\n")
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    audio_array = load_audio_array(wav_path)

    sys.stderr.write(f"Transcribing audio ({len(audio_array)/16000:.2f}s) with word timestamps (language={lang_param})...\n")
    segments_generator, info = model.transcribe(
        audio_array,
        language=lang_param,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400),
        beam_size=5,
        temperature=0.0
    )

    detected_language = info.language
    language_probability = float(info.language_probability)
    audio_duration = float(info.duration)

    raw_words: List[Dict[str, Any]] = []
    raw_segments: List[Dict[str, Any]] = []
    full_text_list: List[str] = []

    for seg in segments_generator:
        seg_text = seg.text.strip()
        full_text_list.append(seg_text)
        
        seg_words = []
        if seg.words:
            for w in seg.words:
                cleaned_word = w.word.strip()
                prob = getattr(w, 'probability', 1.0)
                display_word = cleaned_word
                if prob < 0.15 and len(cleaned_word) > 1 and not cleaned_word.isdigit():
                    display_word = "[Unclear]"

                word_obj = {
                    "word": display_word,
                    "original": cleaned_word,
                    "start": round(float(w.start), 3),
                    "end": round(float(w.end), 3),
                    "probability": round(float(prob), 3)
                }
                raw_words.append(word_obj)
                seg_words.append(word_obj)
        else:
            seg_words.append({
                "word": seg_text,
                "original": seg_text,
                "start": round(float(seg.start), 3),
                "end": round(float(seg.end), 3),
                "probability": 0.8
            })
            raw_words.append(seg_words[-1])

        raw_segments.append({
            "id": seg.id,
            "start": round(float(seg.start), 3),
            "end": round(float(seg.end), 3),
            "text": seg_text,
            "words": seg_words
        })

    # Clean and merge sub-words to prevent splitting words in half
    all_words = clean_and_merge_subwords(raw_words)

    return {
        "text": " ".join(full_text_list),
        "language": detected_language,
        "language_probability": language_probability,
        "duration": audio_duration,
        "words": all_words,
        "raw_segments": raw_segments
    }

def transcribe_cloud_api(
    wav_path: str,
    provider: str,
    api_key: str,
    language: Optional[str] = None
) -> Dict[str, Any]:
    """Transcribe using Groq or OpenAI Whisper API with verbose_json word timestamps."""
    import requests

    if provider == "groq":
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        model = "whisper-large-v3"
    else:
        url = "https://api.openai.com/v1/audio/transcriptions"
        model = "whisper-1"

    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    data = {
        "model": model,
        "response_format": "verbose_json",
        "timestamp_granularities[]": "word"
    }

    if language and language != "auto":
        data["language"] = language

    with open(wav_path, "rb") as f:
        files = {
            "file": (os.path.basename(wav_path), f, "audio/wav")
        }
        sys.stderr.write(f"Calling {provider.upper()} speech-to-text API ({model})...\n")
        response = requests.post(url, headers=headers, data=data, files=files, timeout=300)

    if response.status_code != 200:
        raise RuntimeError(f"{provider.upper()} API error ({response.status_code}): {response.text}")

    resp_json = response.json()
    full_text = resp_json.get("text", "")
    detected_language = resp_json.get("language", language or "en")
    duration = float(resp_json.get("duration", 0.0))

    raw_words = resp_json.get("words", [])
    formatted_words = []
    for w in raw_words:
        w_text = w.get("word", "").strip()
        start = float(w.get("start", 0.0))
        end = float(w.get("end", 0.0))
        formatted_words.append({
            "word": w_text,
            "original": w_text,
            "start": round(start, 3),
            "end": round(end, 3),
            "probability": 0.95
        })

    all_words = clean_and_merge_subwords(formatted_words)

    return {
        "text": full_text,
        "language": detected_language,
        "language_probability": 0.99,
        "duration": duration,
        "words": all_words,
        "raw_segments": resp_json.get("segments", [])
    }

def group_words_into_intervals(
    raw_words: List[Dict[str, Any]],
    interval_seconds: float,
    total_duration: float,
    mode: str = "sentence"
) -> List[Dict[str, Any]]:
    """
    Group verbatim words into segments according to mode:
    1. 'sentence': Sentence-by-sentence (Never cuts a sentence or a word)
    2. 'smart_flow': Interval-guided sentence & clause flow
    3. 'grid': Fixed clock time windows with subword protection
    """
    if not raw_words:
        return []

    words = clean_and_merge_subwords(raw_words)
    force_hours = total_duration >= 3600
    interval = max(2.0, float(interval_seconds))

    # ==========================================
    # 1. SENTENCE-BY-SENTENCE (User Requested)
    # ==========================================
    if mode == "sentence":
        segments = []
        current_words: List[Dict[str, Any]] = []

        for i, w in enumerate(words):
            current_words.append(w)
            w_text = str(w["word"])

            # Check for sentence terminators
            is_sentence_end = bool(re.search(r'[.!?।॥]$', w_text))

            # Long silence pause between sentences (>= 0.65s)
            is_long_pause = False
            if i < len(words) - 1:
                gap = words[i+1]["start"] - w["end"]
                if gap >= 0.65:
                    is_long_pause = True

            is_last = (i == len(words) - 1)

            if is_sentence_end or is_long_pause or is_last:
                seg_start = current_words[0]["start"]
                seg_end = current_words[-1]["end"]
                seg_text = join_words_text(current_words)

                segments.append({
                    "id": f"seg_sent_{len(segments)}",
                    "index": len(segments) + 1,
                    "timestamp": format_timestamp(seg_start, force_hours=force_hours),
                    "actual_timestamp": format_timestamp(seg_start, force_hours=force_hours),
                    "start": round(seg_start, 2),
                    "end": round(seg_end, 2),
                    "actual_start": round(seg_start, 2),
                    "actual_end": round(seg_end, 2),
                    "text": seg_text,
                    "words": current_words
                })
                current_words = []

        return segments

    # ==========================================
    # 2. SMART SENTENCE & CLAUSE FLOW
    # ==========================================
    elif mode == "smart_flow":
        segments = []
        current_words: List[Dict[str, Any]] = []
        seg_start_time: Optional[float] = None

        for i, w in enumerate(words):
            if seg_start_time is None:
                seg_start_time = w["start"]
            current_words.append(w)

            cur_dur = w["end"] - seg_start_time
            w_text = str(w["word"])
            is_sentence_end = bool(re.search(r'[.!?।॥]$', w_text))
            is_clause_end = bool(re.search(r'[,;:\-—]$', w_text))

            is_pause = False
            if i < len(words) - 1:
                gap = words[i+1]["start"] - w["end"]
                if gap >= 0.35:
                    is_pause = True

            is_last = (i == len(words) - 1)

            should_close = (
                is_last or
                (is_sentence_end and (cur_dur >= interval * 0.75 or cur_dur >= 3.0)) or
                (cur_dur >= interval and (is_clause_end or is_pause)) or
                cur_dur >= interval * 1.4
            )

            if should_close and current_words:
                seg_start = seg_start_time
                seg_end = current_words[-1]["end"]
                seg_text = join_words_text(current_words)

                segments.append({
                    "id": f"seg_flow_{len(segments)}",
                    "index": len(segments) + 1,
                    "timestamp": format_timestamp(seg_start, force_hours=force_hours),
                    "actual_timestamp": format_timestamp(seg_start, force_hours=force_hours),
                    "start": round(seg_start, 2),
                    "end": round(seg_end, 2),
                    "actual_start": round(seg_start, 2),
                    "actual_end": round(seg_end, 2),
                    "text": seg_text,
                    "words": current_words
                })
                current_words = []
                seg_start_time = None

        return segments

    # ==========================================
    # 3. FIXED CLOCK GRID
    # ==========================================
    else:
        windows: Dict[int, List[Dict[str, Any]]] = {}
        for w in words:
            win_idx = int(w["start"] // interval)
            if win_idx not in windows:
                windows[win_idx] = []
            windows[win_idx].append(w)

        segments = []
        for win_idx in sorted(windows.keys()):
            win_words = windows[win_idx]
            if not win_words:
                continue

            window_start_sec = win_idx * interval
            window_end_sec = window_start_sec + interval
            first_word_time = win_words[0]["start"]
            last_word_time = win_words[-1]["end"]
            words_text = join_words_text(win_words)

            segments.append({
                "id": f"seg_{win_idx}",
                "index": len(segments) + 1,
                "timestamp": format_timestamp(window_start_sec, force_hours=force_hours),
                "actual_timestamp": format_timestamp(first_word_time, force_hours=force_hours),
                "start": round(window_start_sec, 2),
                "end": round(window_end_sec, 2),
                "actual_start": round(first_word_time, 2),
                "actual_end": round(last_word_time, 2),
                "text": words_text,
                "words": win_words
            })

        return segments

def main():
    parser = argparse.ArgumentParser(description="AI Audio Transcription & Timestamp Generator")
    parser.add_argument("--file", required=True, help="Input audio or video file")
    parser.add_argument("--language", default="auto", help="Language code (e.g. en, ta, hi, auto)")
    parser.add_argument("--interval", type=float, default=4.0, help="Interval seconds (3-60)")
    parser.add_argument("--interval_mode", default="sentence", choices=["sentence", "smart_flow", "grid"], help="Segmentation mode")
    parser.add_argument("--model", default="base", help="Whisper model (tiny, base, small, medium, large-v3)")
    parser.add_argument("--provider", default="auto", choices=["auto", "local", "groq", "openai"])
    parser.add_argument("--groq_api_key", default=None, help="Groq API key")
    parser.add_argument("--openai_api_key", default=None, help="OpenAI API key")
    parser.add_argument("--output_json", default=None, help="Optional output JSON file")

    args = parser.parse_args()

    input_file = os.path.abspath(args.file)
    if not os.path.exists(input_file):
        sys.stderr.write(f"Error: File not found: {input_file}\n")
        sys.exit(1)

    temp_wav = None
    try:
        duration = get_audio_duration(input_file)
        sys.stderr.write(f"Audio duration probed: {duration:.2f}s\n")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
            temp_wav = tf.name

        sys.stderr.write(f"Extracting and normalizing audio via FFmpeg to {temp_wav}...\n")
        convert_to_wav(input_file, temp_wav)

        if duration == 0:
            duration = get_audio_duration(temp_wav)

        provider = args.provider
        if provider == "auto":
            if args.groq_api_key:
                provider = "groq"
            elif args.openai_api_key:
                provider = "openai"
            else:
                provider = "local"

        t0 = time.time()
        if provider == "groq":
            res = transcribe_cloud_api(temp_wav, "groq", args.groq_api_key, language=args.language)
        elif provider == "openai":
            res = transcribe_cloud_api(temp_wav, "openai", args.openai_api_key, language=args.language)
        else:
            res = transcribe_local_whisper(temp_wav, language=args.language, model_size=args.model)

        elapsed = round(time.time() - t0, 2)
        sys.stderr.write(f"Transcription finished in {elapsed}s. Language: {res['language']} (confidence: {res.get('language_probability', 1.0):.2f})\n")

        if res.get("duration") and res["duration"] > 0:
            duration = res["duration"]

        words = res.get("words", [])
        
        # Pre-compute segments for all modes
        sentence_segments = group_words_into_intervals(words, args.interval, duration, mode="sentence")
        smart_segments = group_words_into_intervals(words, args.interval, duration, mode="smart_flow")
        grid_segments = group_words_into_intervals(words, args.interval, duration, mode="grid")

        if args.interval_mode == "sentence":
            active_segments = sentence_segments
        elif args.interval_mode == "smart_flow":
            active_segments = smart_segments
        else:
            active_segments = grid_segments

        formatted_lines = [f"{seg['timestamp']} {seg['text']}" for seg in active_segments]
        plain_timestamped_transcript = "\n".join(formatted_lines)
        plain_transcript_clean = "\n".join(seg["text"] for seg in active_segments)

        output_data = {
            "success": True,
            "filename": os.path.basename(input_file),
            "duration": round(duration, 2),
            "language": res.get("language", "auto"),
            "language_confidence": round(res.get("language_probability", 1.0), 3),
            "provider": provider,
            "processing_time": elapsed,
            "interval_seconds": args.interval,
            "interval_mode": args.interval_mode,
            "total_words": len(words),
            "total_segments": len(active_segments),
            "verbatim_text": res.get("text", ""),
            "timestamped_text": plain_timestamped_transcript,
            "clean_text": plain_transcript_clean,
            "segments": active_segments,
            "sentence_segments": sentence_segments,
            "smart_segments": smart_segments,
            "grid_segments": grid_segments,
            "words": words
        }

        output_json_str = json.dumps(output_data, ensure_ascii=False, indent=2)

        if args.output_json:
            with open(args.output_json, "w", encoding="utf-8") as f:
                f.write(output_json_str)

        print(output_json_str)

    except Exception as e:
        import traceback
        sys.stderr.write(f"Transcription error: {str(e)}\n{traceback.format_exc()}\n")
        err_data = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(err_data))
        sys.exit(1)

    finally:
        if temp_wav and os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except Exception:
                pass

if __name__ == "__main__":
    main()
