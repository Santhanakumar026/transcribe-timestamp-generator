import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AudioSync AI - Professional Audio Transcription & Timestamp Generator",
  description:
    "Extract audio, transcribe verbatim speech with word-level accuracy, and generate time-windowed timestamp segments for audio and video files.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 antialiased selection:bg-primary-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

