import React from "react";
import { Lock, EyeOff, FileKey } from "lucide-react";

export const Privacy = () => {
  return (
    <div className="desktop-container py-12 font-sans">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Your media is your own. Here is how we guarantee it.
        </p>
      </div>

      <div className="mt-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border/40 p-6 glass flex gap-4">
            <EyeOff className="h-6 w-6 text-foreground shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-foreground">Offline Processing</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Compressly executes on a local host server. Your videos are not uploaded to our servers, nor do we run remote tracking scripts.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 p-6 glass flex gap-4">
            <FileKey className="h-6 w-6 text-foreground shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-foreground">Automatic Purging</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                All temporary video chunks and compressed files are immediately purged upon download completion, or within 30 minutes by a daemon clean timer.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-border/40 p-8 dark:bg-card/30 glass space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">1. Local Storage & Cookies</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              We do not use cookie networks or marketing trackers. Your preferences (e.g. dark/light theme, custom quality targets) are saved on your browser's local storage database and do not sync with external domains.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground">2. SQLite Database Logs</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              A local SQLite file (`history.db`) records metrics (file names, sizes, savings, durations). You can clear this history anytime in the history settings.
            </p>
          </div>

          <div className="border-t border-border/20 pt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>Last revised: August 1, 2026</span>
            <span className="flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-foreground" />
              Compressly Privacy Guarantee
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
