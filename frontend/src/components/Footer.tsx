import React from "react";
import { Shield, HelpCircle, Heart } from "lucide-react";

interface FooterProps {
  setRoute: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setRoute }) => {
  const navigateTo = (route: string) => {
    setRoute(route);
    window.location.hash = route;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="border-t border-border/40 bg-background/50 dark:bg-background/20 font-sans mt-auto">
      <div className="desktop-container py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} Compressly. All rights reserved.</span>
            <span className="hidden sm:inline">&middot;</span>
            <span className="flex items-center gap-1">
              Privacy-focused local compression.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <button
              onClick={() => navigateTo("#/about")}
              className="text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
            >
              <HelpCircle className="h-4.5 w-4.5" />
              About
            </button>
            <button
              onClick={() => navigateTo("#/privacy")}
              className="text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
            >
              <Shield className="h-4.5 w-4.5" />
              Privacy Policy
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-border/10 pt-4 flex justify-center text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-500 fill-current animate-pulse" /> on React, FastAPI, & FFmpeg.
          </span>
        </div>
      </div>
    </footer>
  );
};
