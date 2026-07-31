import React from "react";
import { motion } from "framer-motion";
import { HardDrive } from "lucide-react";

interface SizeComparisonChartProps {
  originalSize: number;
  compressedSize: number;
}

export const SizeComparisonChart: React.FC<SizeComparisonChartProps> = ({
  originalSize,
  compressedSize,
}) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const ratio = originalSize > 0 ? (compressedSize / originalSize) * 100 : 0;
  const savedPercent = Math.max(0, 100 - ratio);

  return (
    <div className="rounded-2xl border border-border/40 p-5 dark:bg-card/20 glass space-y-5 font-sans">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <HardDrive className="h-4 w-4" />
          Size Comparison
        </h4>
        <span className="rounded-full bg-green-500/15 text-green-500 px-2 py-0.5 text-xs font-semibold">
          Saved {savedPercent.toFixed(1)}%
        </span>
      </div>

      <div className="space-y-4">
        {/* Original Size Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Original File</span>
            <span className="font-medium text-foreground">{formatBytes(originalSize)}</span>
          </div>
          <div className="relative h-6 w-full rounded-lg bg-foreground/5 dark:bg-foreground/10 overflow-hidden border border-border/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-muted-foreground/20 rounded-lg flex items-center px-3"
            />
            <span className="absolute inset-0 flex items-center px-3 text-[11px] font-semibold text-foreground/80">
              100% (Base Size)
            </span>
          </div>
        </div>

        {/* Compressed Size Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Compressed File</span>
            <span className="font-medium text-foreground">{formatBytes(compressedSize)}</span>
          </div>
          <div className="relative h-6 w-full rounded-lg bg-foreground/5 dark:bg-foreground/10 overflow-hidden border border-border/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(6, ratio)}%` }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
              className="h-full bg-foreground rounded-lg"
            />
            <span className="absolute inset-0 flex items-center px-3 text-[11px] font-semibold text-background dark:text-background mix-blend-difference">
              {ratio.toFixed(1)}% of original size
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/10">
        <span>Storage efficiency gains</span>
        <span className="font-semibold text-foreground">
          {formatBytes(originalSize - compressedSize)} cleared
        </span>
      </div>
    </div>
  );
};
