import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  let ffmpegOk = false;
  let ffmpegVersion = "";
  let localWhisperOk = false;

  try {
    const { stdout } = await execAsync("ffmpeg -version");
    ffmpegOk = true;
    ffmpegVersion = stdout.split("\n")[0] || "FFmpeg available";
  } catch {
    ffmpegOk = false;
  }

  try {
    const { stdout } = await execAsync('python -c "import faster_whisper; print(faster_whisper.__version__)"');
    localWhisperOk = stdout.trim().length > 0;
  } catch {
    localWhisperOk = false;
  }

  return NextResponse.json({
    status: "healthy",
    ffmpeg: {
      available: ffmpegOk,
      version: ffmpegVersion,
    },
    localWhisper: {
      available: localWhisperOk,
      engine: "faster-whisper (CTranslate2)",
      defaultModel: "base",
    },
    cloudEngines: {
      groqConfigured: !!process.env.GROQ_API_KEY,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
    },
    supportedFormats: ["MP3", "WAV", "M4A", "AAC", "FLAC", "MP4"],
    timestamp: new Date().toISOString(),
  });
}

