import React from "react";
import { Download, Folder, Play, FileText, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { SizeComparisonChart } from "./Charts.jsx";

export const BeforeAfterPanel = ({
  item,
  backendUrl,
  onDownload,
  onOpenFolder,
  onPreviewVideo,
  onViewLogs,
  onCompressAnother,
}) => {
  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const origSize = item.size || 0;
  const compSize = item.compressedSize || 0;
  const savedBytes = Math.max(0, origSize - compSize);
  const savedPct = origSize > 0 ? ((savedBytes / origSize) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-5 rounded-2xl border border-border/40 p-5 glass font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/10 pb-3">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <h3 className="text-sm font-bold text-foreground">Compression Complete!</h3>
        </div>
        <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2.5 py-0.5 rounded-full">
          -{savedPct}% Saved
        </span>
      </div>

      {/* Visual Chart */}
      <SizeComparisonChart originalSize={origSize} compressedSize={compSize} />

      {/* Side by Side Comparison Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Original Specs */}
        <div className="rounded-xl border border-border/20 p-3 bg-foreground/[0.01] space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block border-b border-border/10 pb-1">
            Original Video
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-foreground truncate" title={item.name}>
              {item.name}
            </p>
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>Size</span>
              <span className="font-medium text-foreground">{formatBytes(origSize)}</span>
            </div>
            {item.metadata && (
              <>
                <div className="flex justify-between text-muted-foreground text-[10px]">
                  <span>Resolution</span>
                  <span className="font-medium text-foreground">
                    {item.metadata.width}x{item.metadata.height}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[10px]">
                  <span>Codec</span>
                  <span className="font-medium text-foreground uppercase">{item.metadata.video_codec}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[10px]">
                  <span>Duration</span>
                  <span className="font-medium text-foreground">{item.metadata.duration.toFixed(1)}s</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Compressed Specs */}
        <div className="rounded-xl border border-green-500/30 p-3 bg-green-500/[0.02] space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-500 block border-b border-green-500/10 pb-1">
            Compressed Video
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-foreground truncate" title={`compressed_${item.name}`}>
              compressed_{item.name}
            </p>
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>Compressed Size</span>
              <span className="font-bold text-green-500">{formatBytes(compSize)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>Preset Used</span>
              <span className="font-medium text-foreground capitalize">
                {item.options?.preset || "Balanced"}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>Saved Space</span>
              <span className="font-bold text-green-500">
                {formatBytes(savedBytes)} ({savedPct}%)
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>Encode Time</span>
              <span className="font-medium text-foreground">{item.elapsed ? `${item.elapsed.toFixed(1)}s` : "-"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => onDownload(item.taskId || "", item.name)}
          className="w-full py-2.5 px-4 rounded-xl bg-foreground text-background dark:bg-foreground dark:text-background font-semibold hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-md text-xs"
        >
          <Download className="h-4 w-4" />
          Download Compressed File
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onOpenFolder(item.taskId || "")}
            className="py-2 px-2.5 rounded-lg border border-border bg-background hover:bg-foreground/5 text-xs font-semibold transition-all flex items-center justify-center gap-1 text-foreground"
            title="Open File Location in Windows Explorer"
          >
            <Folder className="h-3.5 w-3.5" />
            Open Folder
          </button>
          <button
            onClick={() => onPreviewVideo(item)}
            className="py-2 px-2.5 rounded-lg border border-border bg-background hover:bg-foreground/5 text-xs font-semibold transition-all flex items-center justify-center gap-1 text-foreground"
            title="Side-by-side Video Preview"
          >
            <Play className="h-3.5 w-3.5" />
            Preview
          </button>
          <button
            onClick={() => onViewLogs(item.taskId || "")}
            className="py-2 px-2.5 rounded-lg border border-border bg-background hover:bg-foreground/5 text-xs font-semibold transition-all flex items-center justify-center gap-1 text-foreground"
            title="View Full FFmpeg Log"
          >
            <FileText className="h-3.5 w-3.5" />
            Logs
          </button>
        </div>

        <button
          onClick={onCompressAnother}
          className="w-full py-2 px-4 rounded-xl border border-border/40 bg-background/50 hover:bg-foreground/5 text-xs font-medium transition-all text-center"
        >
          Compress Another Video
        </button>
      </div>
    </div>
  );
};
