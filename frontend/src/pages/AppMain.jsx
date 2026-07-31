import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Video,
  FileVideo,
  Settings2,
  Play,
  Pause,
  X,
  Download,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Clock,
  RefreshCw,
  Sliders
} from "lucide-react";
import { SizeComparisonChart } from "../components/Charts.jsx";

export const AppMain = () => {
  const backendUrl = localStorage.getItem("compressly_backend_url") || "http://localhost:8000";
  const defaultPreset = localStorage.getItem("compressly_default_preset") || "balanced";

  const [queue, setQueue] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // References to handle HTTP uploads and polling
  const activeUploads = useRef({});
  const pollingIntervals = useRef({});

  useEffect(() => {
    loadHistory();
    // Cleanup polling on unmount
    return () => {
      Object.values(pollingIntervals.current).forEach((id) => clearInterval(id));
    };
  }, []);

  const triggerToast = (text, type = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      console.warn("Failed to fetch history logs from SQLite backend.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    const validExtensions = [".mp4", ".mov", ".avi", ".mkv"];
    const addedItems = [];

    files.forEach((file) => {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!validExtensions.includes(ext)) {
        triggerToast(`Unsupported format for '${file.name}'. Use MP4, MOV, AVI, or MKV.`, "error");
        return;
      }

      const id = Math.random().toString(36).substring(2, 9);
      const newItem = {
        id,
        file,
        name: file.name,
        size: file.size,
        uploadProgress: 0,
        status: "uploading",
        progress: 0,
        elapsed: 0,
        eta: 0,
        speed: "0.0x",
        options: {
          preset: defaultPreset,
          crf: defaultPreset === "high" ? 20 : defaultPreset === "max" ? 30 : 24,
        },
      };

      addedItems.push(newItem);
      uploadFile(newItem);
    });

    if (addedItems.length > 0) {
      setQueue((prev) => [...prev, ...addedItems]);
      if (!selectedItemId) {
        setSelectedItemId(addedItems[0].id);
      }
    }
  };

  // Upload file with XMLHttpRequest
  const uploadFile = (item) => {
    const formData = new FormData();
    formData.append("file", item.file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${backendUrl}/api/metadata`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        updateItem(item.id, { uploadProgress: pct });
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          updateItem(item.id, {
            status: "ready",
            fileId: res.file_id,
            metadata: res.metadata,
            thumbnailUrl: res.thumbnail_url,
          });
          triggerToast(`'${item.name}' upload complete.`);
        } catch {
          updateItem(item.id, { status: "failed", error: "Failed to parse upload metadata response." });
        }
      } else {
        let errDetail = "Server rejected upload";
        try {
          const parsed = JSON.parse(xhr.responseText);
          errDetail = parsed.detail || errDetail;
        } catch {}
        updateItem(item.id, { status: "failed", error: errDetail });
      }
      delete activeUploads.current[item.id];
    };

    xhr.onerror = () => {
      updateItem(item.id, { status: "failed", error: "Network connection lost during upload." });
      delete activeUploads.current[item.id];
    };

    xhr.send(formData);
    activeUploads.current[item.id] = xhr;
  };

  const updateItem = (id, updates) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // If option preset changes, dynamically update default CRF values:
          if (updates.options && updates.options.preset !== item.options.preset) {
            const p = updates.options.preset;
            updates.options.crf = p === "high" ? 20 : p === "max" ? 30 : 24;
          }
          return { ...item, ...updates };
        }
        return item;
      })
    );
  };

  const startCompress = async (itemId) => {
    const item = queue.find((q) => q.id === itemId);
    if (!item || item.status !== "ready" || !item.fileId) return;

    updateItem(itemId, { status: "processing", progress: 0, elapsed: 0, eta: 0 });

    try {
      const res = await fetch(`${backendUrl}/api/compress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: item.fileId,
          preset: item.options.preset,
          crf: item.options.crf,
          video_bitrate: item.options.videoBitrate || null,
          audio_bitrate: item.options.audioBitrate || null,
          width: item.options.width || null,
          height: item.options.height || null,
          fps: item.options.fps || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        updateItem(itemId, { taskId: data.task_id });
        startPolling(itemId, data.task_id);
      } else {
        const err = await res.json();
        updateItem(itemId, { status: "failed", error: err.detail || "Compression startup failed." });
      }
    } catch {
      updateItem(itemId, { status: "failed", error: "Failed to connect to API." });
    }
  };

  const startPolling = (itemId, taskId) => {
    if (pollingIntervals.current[itemId]) {
      clearInterval(pollingIntervals.current[itemId]);
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${backendUrl}/api/compress/status/${taskId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "completed") {
          clearInterval(interval);
          delete pollingIntervals.current[itemId];
          updateItem(itemId, {
            status: "completed",
            progress: 100,
            compressedSize: data.compressed_size,
            elapsed: data.elapsed,
          });
          triggerToast("Compression complete!");
          loadHistory();

          // Auto download if active
          if (localStorage.getItem("compressly_auto_download") === "true") {
            downloadFile(taskId, data.filename || "compressed_video.mp4");
          }
        } else if (data.status === "failed") {
          clearInterval(interval);
          delete pollingIntervals.current[itemId];
          updateItem(itemId, { status: "failed", error: data.error || "FFmpeg job failed." });
        } else if (data.status === "cancelled") {
          clearInterval(interval);
          delete pollingIntervals.current[itemId];
          updateItem(itemId, { status: "cancelled" });
        } else if (data.status === "paused") {
          updateItem(itemId, {
            status: "paused",
            progress: data.progress,
            elapsed: data.elapsed,
            eta: data.eta,
            speed: data.speed,
          });
        } else if (data.status === "processing") {
          updateItem(itemId, {
            status: "processing",
            progress: data.progress,
            elapsed: data.elapsed,
            eta: data.eta,
            speed: data.speed,
          });
        }
      } catch {
        // Carry on polling during temporary networking hiccups
      }
    }, 1000);

    pollingIntervals.current[itemId] = interval;
  };

  const controlTask = async (itemId, action) => {
    const item = queue.find((q) => q.id === itemId);
    if (!item) return;

    // Handle cancellation during uploading
    if (item.status === "uploading" && action === "cancel") {
      if (activeUploads.current[itemId]) {
        activeUploads.current[itemId].abort();
        delete activeUploads.current[itemId];
      }
      setQueue((prev) => prev.filter((q) => q.id !== itemId));
      if (selectedItemId === itemId) setSelectedItemId(null);
      return;
    }

    if (!item.taskId) return;

    try {
      const res = await fetch(`${backendUrl}/api/compress/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: item.taskId, action }),
      });

      if (res.ok) {
        if (action === "cancel") {
          if (pollingIntervals.current[itemId]) {
            clearInterval(pollingIntervals.current[itemId]);
            delete pollingIntervals.current[itemId];
          }
          setQueue((prev) => prev.filter((q) => q.id !== itemId));
          if (selectedItemId === itemId) setSelectedItemId(null);
          loadHistory();
          triggerToast("Compression cancelled.");
        } else if (action === "pause") {
          updateItem(itemId, { status: "paused" });
        } else if (action === "resume") {
          updateItem(itemId, { status: "processing" });
        }
      }
    } catch {
      triggerToast("Failed to transmit task command.", "error");
    }
  };

  const downloadFile = (taskId, originalName) => {
    const link = document.createElement("a");
    link.href = `${backendUrl}/api/download/${taskId}`;
    link.setAttribute("download", `compressed_${originalName}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFromHistory = (taskId, filename) => {
    const link = document.createElement("a");
    link.href = `${backendUrl}/api/history/download/${taskId}`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteHistoryRow = async (taskId) => {
    try {
      const res = await fetch(`${backendUrl}/api/history/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setHistory((prev) => prev.filter((h) => h.id !== taskId));
        triggerToast("History row deleted.");
      }
    } catch {
      triggerToast("Failed to delete history row.", "error");
    }
  };

  const copyMetadata = (meta) => {
    if (!meta) return;
    const text = `Filename: ${meta.filename}
Format: ${meta.format_name}
Resolution: ${meta.width}x${meta.height}
Duration: ${meta.duration.toFixed(1)}s
FPS: ${meta.fps}
Video Codec: ${meta.video_codec}
Audio Codec: ${meta.audio_codec}
Bitrate: ${(meta.bitrate / 1000).toFixed(0)}kbps
Original Size: ${(meta.size / (1024 * 1024)).toFixed(2)}MB`;

    navigator.clipboard.writeText(text);
    setCopiedInfo(true);
    setTimeout(() => setCopiedInfo(false), 2000);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Get active item
  const selectedItem = queue.find((item) => item.id === selectedItemId);

  // Empirical compression estimate percentage:
  const getSavingsEstimate = (preset) => {
    if (preset === "high") return "~15% - 30% reduction";
    if (preset === "max") return "~70% - 90% reduction";
    return "~40% - 60% reduction";
  };

  return (
    <div className="desktop-container py-8 font-sans space-y-10">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 flex items-center space-x-2 rounded-xl px-4 py-3 shadow-lg border backdrop-blur-md ${
              toastMsg.type === "error"
                ? "bg-red-500/10 text-red-500 border-red-500/20"
                : "bg-foreground/10 text-foreground border-foreground/10"
            }`}
          >
            <AlertCircle className="h-4.5 w-4.5" />
            <span className="text-xs font-semibold">{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Split Panel */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Side: Drag & Drop Zone and Video Queue List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Uploader Card */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all ${
              dragActive
                ? "border-foreground bg-foreground/[0.02]"
                : "border-border/65 hover:border-foreground/50 hover:bg-foreground/[0.005]"
            }`}
          >
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5 dark:bg-foreground/10 text-foreground mb-4">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Drag & drop your videos here</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports MP4, MOV, AVI, and MKV formats
            </p>
          </div>

          {/* Queue Section */}
          {queue.length > 0 && (
            <div className="space-y-3.5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Video className="h-4 w-4" />
                Compression Queue ({queue.length})
              </h2>

              <div className="space-y-3">
                {queue.map((item) => {
                  const isSelected = item.id === selectedItemId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`relative flex flex-col md:flex-row items-start md:items-center justify-between rounded-xl border p-4 transition-all cursor-pointer ${
                        isSelected
                          ? "border-foreground bg-foreground/[0.015]"
                          : "border-border/40 hover:border-border hover:bg-foreground/[0.005]"
                      }`}
                    >
                      {/* Left: Thumbnail & Info */}
                      <div className="flex items-center space-x-3.5 w-full md:w-auto">
                        <div className="relative h-12 w-16 bg-muted rounded-lg overflow-hidden shrink-0 border border-border/10 flex items-center justify-center">
                          {item.thumbnailUrl ? (
                            <img
                              src={`${backendUrl}${item.thumbnailUrl}`}
                              alt="Thumbnail"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileVideo className="h-5 w-5 text-muted-foreground" />
                          )}
                          {item.status === "uploading" && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-foreground">
                                {item.uploadProgress}%
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                            {item.name}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-0.5">
                            <span>{formatBytes(item.size)}</span>
                            {item.metadata && (
                              <>
                                <span>&middot;</span>
                                <span>{item.metadata.width}x{item.metadata.height}</span>
                                <span>&middot;</span>
                                <span>{item.metadata.duration.toFixed(0)}s</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions / Process details */}
                      <div className="flex items-center space-x-4 mt-3 md:mt-0 w-full md:w-auto justify-end">
                        {/* Status detail */}
                        {item.status === "uploading" && (
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Uploading...
                          </span>
                        )}

                        {item.status === "ready" && (
                          <span className="text-xs font-semibold text-foreground/80 bg-foreground/5 dark:bg-foreground/10 px-2 py-0.5 rounded-full">
                            Ready
                          </span>
                        )}

                        {(item.status === "processing" || item.status === "paused") && (
                          <div className="flex flex-col items-end space-y-1.5 w-32 md:w-44">
                            <div className="flex justify-between w-full text-[10px] text-muted-foreground">
                              <span>
                                {item.status === "paused" ? "Paused" : `Encoding (${item.speed})`}
                              </span>
                              <span className="font-semibold text-foreground">{item.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
                              <div
                                className="h-full bg-foreground transition-all duration-300"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-muted-foreground">
                              ETA: {item.eta.toFixed(0)}s &middot; {item.elapsed.toFixed(0)}s elapsed
                            </span>
                          </div>
                        )}

                        {item.status === "completed" && (
                          <div className="text-right">
                            <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2.5 py-0.5 rounded-full">
                              Compressed
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatBytes(item.compressedSize || 0)}
                            </p>
                          </div>
                        )}

                        {item.status === "failed" && (
                          <span className="text-xs font-medium text-red-500 truncate max-w-[150px]">
                            {item.error || "Failed"}
                          </span>
                        )}

                        {item.status === "cancelled" && (
                          <span className="text-xs font-medium text-muted-foreground">Cancelled</span>
                        )}

                        {/* Controls */}
                        <div className="flex items-center space-x-1.5 border-l border-border/20 pl-3">
                          {item.status === "ready" && (
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  startCompress(item.id);
                                }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                              title="Start Compression"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}

                          {item.status === "processing" && (
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  controlTask(item.id, "pause");
                                }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                              title="Pause"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          )}

                          {item.status === "paused" && (
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  controlTask(item.id, "resume");
                                }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                              title="Resume"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}

                          {item.status === "completed" && (
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  downloadFile(item.taskId || "", item.name);
                                }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}

                          {item.status !== "completed" && (
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  controlTask(item.id, "cancel");
                                }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all"
                              title="Cancel / Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Options and Information Panel */}
        <div className="space-y-6">
          {selectedItem ? (
            <div className="rounded-2xl border border-border/40 p-6 glass space-y-6">
              {/* Head */}
              <div className="border-b border-border/10 pb-4">
                <h3 className="text-base font-bold text-foreground truncate" title={selectedItem.name}>
                  {selectedItem.name}
                </h3>
                <p className="text-xs text-muted-foreground">Configure processing settings for this file.</p>
              </div>

              {/* Video Info Section */}
              {selectedItem.metadata && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">Source Video Info</span>
                    <button
                      onClick={() => copyMetadata(selectedItem.metadata)}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all"
                    >
                      {copiedInfo ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs rounded-xl border border-border/20 p-3.5 bg-foreground/[0.01]">
                    <div>
                      <span className="text-muted-foreground block">Resolution</span>
                      <span className="font-medium text-foreground">
                        {selectedItem.metadata.width}x{selectedItem.metadata.height}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Codec</span>
                      <span className="font-medium text-foreground truncate block">
                        {selectedItem.metadata.video_codec}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Duration</span>
                      <span className="font-medium text-foreground">
                        {selectedItem.metadata.duration.toFixed(1)}s
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">FPS</span>
                      <span className="font-medium text-foreground">{selectedItem.metadata.fps}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Compression Configuration */}
              {selectedItem.status === "ready" && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Quality Preset</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["high", "balanced", "max"].map((preset) => (
                        <button
                          key={preset}
                          onClick={() =>
                            updateItem(selectedItem.id, {
                              options: { ...selectedItem.options, preset },
                            })
                          }
                          className={`rounded-lg px-2.5 py-2 text-xs font-medium border text-center transition-all ${
                            selectedItem.options.preset === preset
                              ? "border-foreground bg-foreground/5 dark:bg-foreground/10 text-foreground font-semibold"
                              : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                          }`}
                        >
                          {preset === "high" ? "High" : preset === "max" ? "Max Size" : "Balanced"}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Est. savings: {getSavingsEstimate(selectedItem.options.preset)}
                    </p>
                  </div>

                  {/* Advanced Toggle */}
                  <div className="border-t border-border/10 pt-4">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs font-semibold text-foreground hover:opacity-80 flex items-center gap-1.5 transition-all"
                    >
                      <Sliders className="h-4 w-4" />
                      {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
                    </button>

                    {showAdvanced && (
                      <div className="mt-4 space-y-4 pt-2 border-t border-dashed border-border/20">
                        {/* CRF Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <label className="font-medium text-foreground">CRF (Constant Rate Factor)</label>
                            <span className="font-bold text-foreground">
                              {selectedItem.options.crf ?? 24}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="15"
                            max="35"
                            value={selectedItem.options.crf ?? 24}
                            onChange={(e) =>
                              updateItem(selectedItem.id, {
                                options: { ...selectedItem.options, crf: parseInt(e.target.value) },
                              })
                            }
                            className="w-full h-1 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-foreground"
                          />
                          <p className="text-[9px] text-muted-foreground">
                            15 (High size/high quality) to 35 (Tiny size/lower quality).
                          </p>
                        </div>

                        {/* Custom video bitrate */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground block">
                            Target Video Bitrate (Override Preset)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 1500k, 2M"
                            value={selectedItem.options.videoBitrate || ""}
                            onChange={(e) =>
                              updateItem(selectedItem.id, {
                                options: { ...selectedItem.options, videoBitrate: e.target.value },
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                          />
                        </div>

                        {/* Custom Resolution Scale */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Width</label>
                            <input
                              type="number"
                              placeholder="e.g. 1280"
                              value={selectedItem.options.width || ""}
                              onChange={(e) =>
                                updateItem(selectedItem.id, {
                                  options: {
                                    ...selectedItem.options,
                                    width: e.target.value ? parseInt(e.target.value) : undefined,
                                  },
                                })
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Height</label>
                            <input
                              type="number"
                              placeholder="e.g. 720"
                              value={selectedItem.options.height || ""}
                              onChange={(e) =>
                                updateItem(selectedItem.id, {
                                  options: {
                                    ...selectedItem.options,
                                    height: e.target.value ? parseInt(e.target.value) : undefined,
                                  },
                                })
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                            />
                          </div>
                        </div>

                        {/* Framerate selection */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground block">Frame Rate</label>
                          <select
                            value={selectedItem.options.fps || ""}
                            onChange={(e) =>
                              updateItem(selectedItem.id, {
                                options: {
                                  ...selectedItem.options,
                                  fps: e.target.value ? parseFloat(e.target.value) : undefined,
                                },
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                          >
                            <option value="">Keep Original</option>
                            <option value="24">24 FPS</option>
                            <option value="30">30 FPS</option>
                            <option value="60">60 FPS</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => startCompress(selectedItem.id)}
                    className="w-full py-3 px-4 rounded-xl bg-foreground text-background dark:bg-foreground dark:text-background font-semibold hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Play className="h-4.5 w-4.5" />
                    Compress Video
                  </button>
                </div>
              )}

              {/* Compression Progress Details */}
              {(selectedItem.status === "processing" || selectedItem.status === "paused") && (
                <div className="space-y-4 rounded-xl border border-border/20 p-4 bg-foreground/[0.01]">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Compressing File
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-semibold text-foreground capitalize">
                        {selectedItem.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Speed</span>
                      <span className="font-semibold text-foreground">{selectedItem.speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Elapsed Time</span>
                      <span className="font-semibold text-foreground">
                        {selectedItem.elapsed.toFixed(0)}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated Remaining</span>
                      <span className="font-semibold text-foreground">
                        {selectedItem.eta.toFixed(0)}s
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/10">
                    <button
                      onClick={() =>
                        controlTask(
                          selectedItem.id,
                          selectedItem.status === "paused" ? "resume" : "pause"
                        )
                      }
                      className="py-2 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-foreground/5 transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      {selectedItem.status === "paused" ? (
                        <>
                          <Play className="h-3.5 w-3.5" /> Resume
                        </>
                      ) : (
                        <>
                          <Pause className="h-3.5 w-3.5" /> Pause
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => controlTask(selectedItem.id, "cancel")}
                      className="py-2 px-3 rounded-lg border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Compression Results */}
              {selectedItem.status === "completed" && (
                <div className="space-y-5">
                  <SizeComparisonChart
                    originalSize={selectedItem.size}
                    compressedSize={selectedItem.compressedSize || 0}
                  />

                  <div className="space-y-2">
                    <button
                      onClick={() => downloadFile(selectedItem.taskId || "", selectedItem.name)}
                      className="w-full py-3 px-4 rounded-xl bg-foreground text-background dark:bg-foreground dark:text-background font-semibold hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Download className="h-4.5 w-4.5" />
                      Download Video
                    </button>
                    <button
                      onClick={() => {
                        setQueue((prev) => prev.filter((q) => q.id !== selectedItem.id));
                        setSelectedItemId(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl border border-border bg-background/50 hover:bg-foreground/5 text-xs font-semibold transition-all text-center"
                    >
                      Compress Another Video
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/40 p-10 dark:bg-card/10 glass text-center flex flex-col items-center justify-center py-16 space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5 dark:bg-foreground/10 text-foreground mb-1">
                <Settings2 className="h-5 w-5 animate-pulse-slow" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Configure Options</h3>
              <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                Upload a video to specify custom frame rates, codecs, sizes, or select compression options.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Database History Table (SQLite logs) */}
      <div className="rounded-2xl border border-border/40 p-6 glass space-y-5">
        <div className="flex items-center justify-between border-b border-border/10 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Local Compression Logs
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stored securely on the local SQLite server database.
            </p>
          </div>
          <button
            onClick={() => loadHistory()}
            className="text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 text-xs"
            disabled={historyLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b border-border/20 text-muted-foreground font-semibold">
                  <th className="py-3 px-2">Filename</th>
                  <th className="py-3 px-2">Duration</th>
                  <th className="py-3 px-2 text-right">Original Size</th>
                  <th className="py-3 px-2 text-right">Compressed</th>
                  <th className="py-3 px-2 text-right">Saved</th>
                  <th className="py-3 px-2 text-right">Status</th>
                  <th className="py-3 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 text-foreground/90">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-foreground/[0.005] transition-colors">
                    <td className="py-3.5 px-2 font-medium truncate max-w-[150px] sm:max-w-[200px]" title={row.filename}>
                      {row.filename}
                    </td>
                    <td className="py-3.5 px-2 text-muted-foreground">{row.duration.toFixed(0)}s</td>
                    <td className="py-3.5 px-2 text-right text-muted-foreground">{formatBytes(row.original_size)}</td>
                    <td className="py-3.5 px-2 text-right font-medium">
                      {row.compressed_size ? formatBytes(row.compressed_size) : "-"}
                    </td>
                    <td className="py-3.5 px-2 text-right text-green-500 font-bold">
                      {row.saved_percentage ? `-${row.saved_percentage}%` : "-"}
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          row.status === "completed"
                            ? "bg-green-500/10 text-green-500"
                            : row.status === "failed"
                            ? "bg-red-500/10 text-red-500"
                            : row.status === "cancelled"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-foreground/5 text-foreground/75"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {row.status === "completed" && row.file_exists && (
                          <button
                            onClick={() => downloadFromHistory(row.id, `compressed_${row.filename}`)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                            title="Download Again"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteHistoryRow(row.id)}
                          className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all"
                          title="Clear entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <HelpCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">No compression history logs found in the SQLite database.</p>
          </div>
        )}
      </div>
    </div>
  );
};
