import React, { useState, useEffect } from "react";
import { X, Copy, Check, Terminal, RefreshCw } from "lucide-react";

export const FFmpegLogModal = ({ taskId, backendUrl, onClose }) => {
  const [logData, setLogData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${backendUrl}/api/compress/logs/${taskId}`);
        if (res.ok) {
          const data = await res.json();
          setLogData(data);
        } else {
          setLogData({ log: "No log trace available for task." });
        }
      } catch {
        setLogData({ log: "Failed to connect to backend server." });
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [taskId, backendUrl]);

  const handleCopy = () => {
    const textToCopy = logData ? (logData.log || JSON.stringify(logData, null, 2)) : "";
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 font-sans">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border/40 bg-background/95 p-6 glass shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/10 pb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-foreground" />
            <h3 className="text-base font-bold text-foreground">FFmpeg Execution Log</h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              disabled={loading || !logData}
              className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-foreground/5 text-xs font-semibold flex items-center gap-1.5 text-foreground transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied Logs" : "Copy Logs"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-border/40 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Log Viewer Content */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-border/30 bg-black/90 p-4 font-mono text-xs text-green-400 leading-relaxed whitespace-pre-wrap">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Fetching FFmpeg log trace...</span>
            </div>
          ) : (
            logData?.log || "No log content available."
          )}
        </div>
      </div>
    </div>
  );
};
