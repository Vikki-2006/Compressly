import React from "react";
import { Play, Pause, X, Layers, ArrowUp, ArrowDown, CheckSquare } from "lucide-react";

export const BatchControls = ({
  queue,
  selectedItemId,
  onCompressSelected,
  onCompressAll,
  onPauseAll,
  onResumeAll,
  onCancelAll,
  onMoveItemUp,
  onMoveItemDown,
}) => {
  const readyCount = queue.filter((i) => i.status === "ready").length;
  const processingCount = queue.filter((i) => i.status === "processing").length;
  const pausedCount = queue.filter((i) => i.status === "paused").length;

  if (queue.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/30 bg-foreground/[0.015] font-sans">
      <div className="flex items-center space-x-2 text-xs font-semibold text-foreground">
        <Layers className="h-4 w-4 text-foreground/70" />
        <span>Batch Queue ({queue.length})</span>
        <span className="text-[10px] text-muted-foreground font-normal">
          ({readyCount} ready, {processingCount} encoding, {pausedCount} paused)
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {/* Move Item Order Controls */}
        {selectedItemId && (
          <div className="flex items-center space-x-1 border-r border-border/20 pr-2 mr-1">
            <button
              onClick={() => onMoveItemUp(selectedItemId)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
              title="Move Up in Queue"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onMoveItemDown(selectedItemId)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
              title="Move Down in Queue"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Compress Selected */}
        {selectedItemId && readyCount > 0 && (
          <button
            onClick={() => onCompressSelected(selectedItemId)}
            className="py-1.5 px-3 rounded-lg border border-border bg-background hover:bg-foreground/5 font-medium transition-all flex items-center gap-1"
          >
            <Play className="h-3.5 w-3.5 text-foreground" />
            Compress Selected
          </button>
        )}

        {/* Compress All */}
        {readyCount > 0 && (
          <button
            onClick={onCompressAll}
            className="py-1.5 px-3 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 transition-all flex items-center gap-1 shadow-sm"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Compress All ({readyCount})
          </button>
        )}

        {/* Pause All */}
        {processingCount > 0 && (
          <button
            onClick={onPauseAll}
            className="py-1.5 px-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10 font-medium transition-all flex items-center gap-1"
          >
            <Pause className="h-3.5 w-3.5" />
            Pause All
          </button>
        )}

        {/* Resume All */}
        {pausedCount > 0 && (
          <button
            onClick={onResumeAll}
            className="py-1.5 px-3 rounded-lg border border-foreground/20 bg-foreground/5 hover:bg-foreground/10 text-foreground font-medium transition-all flex items-center gap-1"
          >
            <Play className="h-3.5 w-3.5" />
            Resume All
          </button>
        )}

        {/* Cancel All */}
        <button
          onClick={onCancelAll}
          className="py-1.5 px-2.5 rounded-lg border border-red-500/25 bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-1"
          title="Cancel All Queue Items"
        >
          <X className="h-3.5 w-3.5" />
          Clear Queue
        </button>
      </div>
    </div>
  );
};
