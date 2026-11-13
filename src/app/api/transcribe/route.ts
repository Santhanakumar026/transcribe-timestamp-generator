import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

export const maxDuration = 300; // 5 minutes max timeout for long audio

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  ".mp3", ".wav", ".m4a", ".aac", ".flac", ".mp4", ".ogg", ".webm", ".mkv"
]);

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;
  let tempDir: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const intervalStr = formData.get("interval") as string || "4.0";
    const intervalMode = (formData.get("intervalMode") as string) || "sentence";
    const language = (formData.get("language") as string) || "auto";
    const provider = (formData.get("provider") as string) || "auto";
    const model = (formData.get("model") as string) || "base";
    const groqApiKey = (formData.get("groqApiKey") as string) || process.env.GROQ_API_KEY || "";
    const openaiApiKey = (formData.get("openaiApiKey") as string) || process.env.OPENAI_API_KEY || "";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No audio or video file provided." },
        { status: 400 }
      );
    }

    const originalName = file.name || "audio.wav";
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported format '${ext}'. Please upload MP3, WAV, M4A, AAC, FLAC, or MP4 files.`,
        },
        { status: 400 }
      );
    }

    // Interval validation (3 to 60 seconds)
    const interval = Math.min(60, Math.max(1, parseFloat(intervalStr) || 4.0));

    // Create a unique temporary directory for this upload
    const uniqueId = `transcribe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    tempDir = path.join(os.tmpdir(), uniqueId);
    await fs.mkdir(tempDir, { recursive: true });

    tempFilePath = path.join(tempDir, `input_${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
    
    // Write uploaded file to temp path
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (fileBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "The uploaded file is empty (0 bytes)." },
        { status: 400 }
      );
    }
    await fs.writeFile(tempFilePath, fileBuffer);

    // Call python transcribe_engine.py
    const scriptPath = path.resolve(process.cwd(), "scripts", "transcribe_engine.py");
    const pyArgs = [
      scriptPath,
      "--file", tempFilePath,
      "--interval", interval.toString(),
      "--interval_mode", intervalMode,
      "--language", language,
      "--model", model,
      "--provider", provider,
    ];

    if (groqApiKey) {
      pyArgs.push("--groq_api_key", groqApiKey);
    }
    if (openaiApiKey) {
      pyArgs.push("--openai_api_key", openaiApiKey);
    }

    // Run python process
    const resultJson = await new Promise<string>((resolve, reject) => {
      const pyProcess = spawn("python", pyArgs, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
        },
      });

      let stdoutData = "";
      let stderrData = "";

      pyProcess.stdout.on("data", (data) => {
        stdoutData += data.toString("utf-8");
      });

      pyProcess.stderr.on("data", (data) => {
        stderrData += data.toString("utf-8");
      });

      pyProcess.on("close", (code) => {
        if (code === 0) {
          resolve(stdoutData);
        } else {
          reject(new Error(`Transcription process exited with code ${code}. ${stderrData}`));
        }
      });

      pyProcess.on("error", (err) => {
        reject(err);
      });
    });

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultJson);
    } catch {
      throw new Error(`Failed to parse engine output: ${resultJson.substring(0, 300)}`);
    }

    if (!parsedResult.success) {
      return NextResponse.json(
        { success: false, error: parsedResult.error || "Transcription failed." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedResult);

  } catch (error: any) {
    console.error("Transcription API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred during transcription." },
      { status: 500 }
    );
  } finally {
    // Retention policy: immediately clean up temporary files & directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn("Failed to delete temp dir:", cleanupErr);
      }
    }
  }
}
