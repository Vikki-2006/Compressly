import React, { useState, useRef } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize, Columns } from "lucide-react";

export const VideoPreviewModal = ({ item, backendUrl, onClose }) => {
  const [activeTab, setActiveTab] = useState("sideBySide"); // "sideBySide", "original", "compressed"
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const origRef = useRef(null);
  const compRef = useRef(null);

  const origSrc = `${backendUrl}/api/static/${item.fileId}.mp4`;
  const compSrc = `${backendUrl}/api/download/${item.taskId}`;

  const togglePlay = () => {
    if (isPlaying) {
      if (origRef.current) origRef.current.pause();
      if (compRef.current) compRef.current.pause();
      setIsPlaying(false);
    } else {
      if (origRef.current) origRef.current.play();
      if (compRef.current) compRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const muted = !isMuted;
    setIsMuted(muted);
    if (origRef.current) origRef.current.muted = muted;
    if (compRef.current) compRef.current.muted = muted;
  };

  const handleTimeUpdate = (e) => {
    const video = e.target;
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      setProgress(pct);
    }
  };

  const handleSeek = (e) => {
    const seekPct = parseFloat(e.target.value);
    setProgress(seekPct);
    if (origRef.current && origRef.current.duration) {
      origRef.current.currentTime = (seekPct / 100) * origRef.current.duration;
    }
    if (compRef.current && compRef.current.duration) {
      compRef.current.currentTime = (seekPct / 100) * compRef.current.duration;
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById("video-preview-container");
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 font-sans">
      <div
        id="video-preview-container"
        className="relative w-full max-w-4xl rounded-2xl border border-border/40 bg-background/95 p-6 glass shadow-2xl space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/10 pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground truncate max-w-md">
              Video Comparison & Preview
            </h3>
            <p className="text-xs text-muted-foreground">{item.name}</p>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border/40 p-0.5 bg-foreground/5 text-xs">
              <button
                onClick={() => setActiveTab("sideBySide")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  activeTab === "sideBySide"
                    ? "bg-foreground text-background font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setActiveTab("original")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  activeTab === "original"
                    ? "bg-foreground text-background font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setActiveTab("compressed")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  activeTab === "compressed"
                    ? "bg-foreground text-background font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Compressed
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-border/40 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video Viewport Area */}
        <div className="relative aspect-video w-full rounded-xl bg-black overflow-hidden flex items-center justify-center border border-border/20">
          {activeTab === "sideBySide" ? (
            <div className="grid grid-cols-2 w-full h-full divide-x divide-white/20">
              <div className="relative w-full h-full bg-black flex items-center justify-center">
                <video
                  ref={origRef}
                  src={origSrc}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-contain"
                />
                <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">
                  Original
                </span>
              </div>
              <div className="relative w-full h-full bg-black flex items-center justify-center">
                <video
                  ref={compRef}
                  src={compSrc}
                  className="w-full h-full object-contain"
                />
                <span className="absolute top-3 left-3 bg-green-500/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">
                  Compressed
                </span>
              </div>
            </div>
          ) : activeTab === "original" ? (
            <div className="relative w-full h-full">
              <video
                ref={origRef}
                src={origSrc}
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain"
              />
              <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Original
              </span>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <video
                ref={compRef}
                src={compSrc}
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain"
              />
              <span className="absolute top-3 left-3 bg-green-500/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Compressed
              </span>
            </div>
          )}
        </div>

        {/* Video Control Bar */}
        <div className="space-y-2 rounded-xl border border-border/20 p-3 bg-foreground/[0.015]">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="w-full h-1 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-foreground"
          />

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePlay}
                className="p-2 rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>

              <button
                onClick={toggleMute}
                className="p-2 rounded-lg border border-border hover:bg-foreground/5 transition-all text-foreground"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg border border-border hover:bg-foreground/5 transition-all text-foreground"
              title="Fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
