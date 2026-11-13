import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const samplePath = path.resolve(process.cwd(), "sample_speech.wav");
    const fileBuffer = await fs.readFile(samplePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": 'attachment; filename="sample_speech.wav"',
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Sample file not found: " + err.message },
      { status: 404 }
    );
  }
}

