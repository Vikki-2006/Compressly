import React from "react";
import { Cpu, ShieldAlert, Award } from "lucide-react";

export const About = () => {
  return (
    <div className="desktop-container py-12 font-sans">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          About Compressly
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A fast, privacy-focused, offline-first media processing workspace.
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {/* Core Mission */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border/40 p-6 glass">
            <Cpu className="h-8 w-8 text-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground">Local Computing</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              We leverage your own CPU and memory architecture to compress videos. Your hardware does the encoding, keeping data local.
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 p-6 glass">
            <ShieldAlert className="h-8 w-8 text-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground">Zero Cloud APIs</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              No cloud storage bucket dependencies, no API keys, and no third-party network transmissions. Your files stay yours.
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 p-6 glass">
            <Award className="h-8 w-8 text-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground">FFmpeg Mastery</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Utilizing raw libx264 configurations to compress videos to maximum efficiency, preserving high fidelity metadata.
            </p>
          </div>
        </section>

        {/* Narrative */}
        <section className="rounded-2xl border border-border/40 p-8 dark:bg-card/30 glass">
          <h2 className="text-xl font-bold text-foreground">Why we built Compressly</h2>
          <div className="mt-4 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Many online video compressors require you to upload your files to their servers. This presents security hazards, especially when compressing internal product demos, family recordings, or confidential files.
            </p>
            <p>
              Compressly was built to solve this. It provides a gorgeous modern web application wrapper (React, Framer Motion) around the world's most powerful open-source media library, <strong>FFmpeg</strong>, running inside a python backend host.
            </p>
            <p>
              By containerizing this ecosystem (using Docker) or running the lightweight Python FastAPI app, anyone can easily compress massive video libraries on their own machines without command-line code.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
