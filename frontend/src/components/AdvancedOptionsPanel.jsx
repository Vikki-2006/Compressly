import React from "react";
import { Sliders, Cpu, HardDrive, Film, Volume2 } from "lucide-react";

export const AdvancedOptionsPanel = ({ options, onChangeOptions }) => {
  const updateOption = (key, value) => {
    onChangeOptions({ ...options, [key]: value });
  };

  return (
    <div className="space-y-4 pt-2 border-t border-dashed border-border/20 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <Sliders className="h-4 w-4 text-foreground/80" />
        <span>Advanced Video & Encoder Settings</span>
      </div>

      {/* Video Codec & GPU Acceleration */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <Film className="h-3 w-3" /> Video Codec
          </label>
          <select
            value={options.video_codec || "h264"}
            onChange={(e) => updateOption("video_codec", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          >
            <option value="h264">H.264 (AVC - Standard)</option>
            <option value="hevc">H.265 (HEVC - High Efficiency)</option>
            <option value="av1">AV1 (SVT-AV1 - Next Gen)</option>
            <option value="vp9">VP9 (WebM Standard)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <Cpu className="h-3 w-3" /> GPU Acceleration
          </label>
          <select
            value={options.gpu_acceleration || "auto"}
            onChange={(e) => updateOption("gpu_acceleration", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          >
            <option value="auto">Auto (Default)</option>
            <option value="cpu">CPU Software Encoder</option>
            <option value="nvenc">NVIDIA NVENC</option>
            <option value="qsv">Intel QuickSync (QSV)</option>
            <option value="amf">AMD AMF</option>
          </select>
        </div>
      </div>

      {/* Preset Speed & Container */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Encoder Speed Preset</label>
          <select
            value={options.preset || "medium"}
            onChange={(e) => updateOption("preset", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          >
            <option value="ultrafast">Ultra Fast</option>
            <option value="fast">Fast</option>
            <option value="medium">Medium (Balanced)</option>
            <option value="slow">Slow (Better Quality)</option>
            <option value="veryslow">Very Slow (Best Quality)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <HardDrive className="h-3 w-3" /> Container Format
          </label>
          <select
            value={options.container || "mp4"}
            onChange={(e) => updateOption("container", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          >
            <option value="mp4">MP4 (.mp4)</option>
            <option value="mkv">Matroska (.mkv)</option>
            <option value="mov">QuickTime (.mov)</option>
            <option value="webm">WebM (.webm)</option>
          </select>
        </div>
      </div>

      {/* CRF Slider */}
      <div className="space-y-1 rounded-lg border border-border/20 p-2.5 bg-foreground/[0.01]">
        <div className="flex justify-between">
          <label className="font-medium text-foreground">CRF Quality Factor</label>
          <span className="font-bold text-foreground">{options.crf ?? 24}</span>
        </div>
        <input
          type="range"
          min="14"
          max="35"
          value={options.crf ?? 24}
          onChange={(e) => updateOption("crf", parseInt(e.target.value))}
          className="w-full h-1 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-foreground"
        />
        <p className="text-[9px] text-muted-foreground">
          14 (Visually Lossless) &rarr; 23 (Standard) &rarr; 35 (Tiny size / low quality)
        </p>
      </div>

      {/* Video Bitrate Override */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground block">
          Target Video Bitrate (Override)
        </label>
        <input
          type="text"
          placeholder="e.g. 1500k, 2.5M"
          value={options.video_bitrate || ""}
          onChange={(e) => updateOption("video_bitrate", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
        />
      </div>

      {/* Width, Height, FPS */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Width (px)</label>
          <input
            type="number"
            placeholder="Auto"
            value={options.width || ""}
            onChange={(e) => updateOption("width", e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Height (px)</label>
          <input
            type="number"
            placeholder="Auto"
            value={options.height || ""}
            onChange={(e) => updateOption("height", e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Frame Rate</label>
          <select
            value={options.fps || ""}
            onChange={(e) => updateOption("fps", e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          >
            <option value="">Original</option>
            <option value="24">24 FPS</option>
            <option value="30">30 FPS</option>
            <option value="60">60 FPS</option>
          </select>
        </div>
      </div>

      {/* Audio Codec & Audio Bitrate */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <Volume2 className="h-3 w-3" /> Audio Codec
          </label>
          <select
            value={options.audio_codec || "aac"}
            onChange={(e) => updateOption("audio_codec", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          >
            <option value="aac">AAC (Standard)</option>
            <option value="mp3">MP3 (Universal)</option>
            <option value="opus">Opus (High Efficiency)</option>
            <option value="copy">Copy Original Audio</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Audio Bitrate</label>
          <select
            value={options.audio_bitrate || "128k"}
            onChange={(e) => updateOption("audio_bitrate", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          >
            <option value="64k">64 kbps (Mono/Voice)</option>
            <option value="96k">96 kbps (Compact)</option>
            <option value="128k">128 kbps (Standard)</option>
            <option value="192k">192 kbps (High Quality)</option>
            <option value="320k">320 kbps (Maximum)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
