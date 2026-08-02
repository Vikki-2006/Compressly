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
  Sliders,
  Zap,
  CheckCircle2,
  Gauge,
  Film,
  Sparkles,
  Folder,
  FileText
} from "lucide-react";
import { SizeComparisonChart } from "../components/Charts.jsx";
import { SmartPresetsGrid, SMART_PRESETS } from "../components/SmartPresetsGrid.jsx";
import { AdvancedOptionsPanel } from "../components/AdvancedOptionsPanel.jsx";
import { BatchControls } from "../components/BatchControls.jsx";
import { BeforeAfterPanel } from "../components/BeforeAfterPanel.jsx";
import { VideoPreviewModal } from "../components/VideoPreviewModal.jsx";
import { FFmpegLogModal } from "../components/FFmpegLogModal.jsx";

export const AppMain = () => {
  const backendUrl = localStorage.getItem("compressly_backend_url") || "http://localhost:8000";
  const defaultPreset = localStorage.getItem("compressly_default_preset") || "telegram";

  const [queue, setQueue] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [dragActive, setDragActive] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [viewingLogTaskId, setViewingLogTaskId] = useState(null);

  // References to handle HTTP uploads and polling
  const activeUploads = useRef({});
  const pollingIntervals = useRef({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadHistory();
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        fileInputRef.current?.click();
      } else if (e.key === "Escape") {
        setPreviewItem(null);
        setViewingLogTaskId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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

      const matchingPreset = SMART_PRESETS.find((p) => p.id === defaultPreset) || SMART_PRESETS[4]; // Default: Telegram
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
        fps: 0,
        options: {
          preset: matchingPreset.id,
          crf: matchingPreset.crf,
          width: matchingPreset.width,
          height: matchingPreset.height,
          fps: matchingPreset.fps,
          audio_bitrate: matchingPreset.audio_bitrate,
          task_type: "compression",
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
          triggerToast(`'${item.name}' uploaded successfully!`);
        } catch {
          updateItem(item.id, { status: "failed", error: "Failed to parse metadata response." });
          triggerToast(`Failed to parse metadata for '${item.name}'`, "error");
        }
      } else {
        let errDetail = "Server rejected upload";
        try {
          const parsed = JSON.parse(xhr.responseText);
          errDetail = parsed.detail || errDetail;
          if (typeof errDetail === "object" && errDetail !== null) {
            errDetail = errDetail.detail || errDetail.error || errDetail.details || JSON.stringify(errDetail);
          }
        } catch {}
        updateItem(item.id, { status: "failed", error: errDetail });
        triggerToast(`Upload failed: ${errDetail}`, "error");
      }
      delete activeUploads.current[item.id];
    };

    xhr.onerror = () => {
      updateItem(item.id, { status: "failed", error: "Network connection lost during upload." });
      triggerToast("Network connection lost during upload.", "error");
      delete activeUploads.current[item.id];
    };

    xhr.send(formData);
    activeUploads.current[item.id] = xhr;
  };

  const updateItem = (id, updates) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      })
    );
  };

  // Select Preset Card handler
  const selectPreset = (itemId, presetObj) => {
    const item = queue.find((q) => q.id === itemId);
    if (!item) return;

    updateItem(itemId, {
      options: {
        ...item.options,
        preset: presetObj.id,
        crf: presetObj.crf,
        video_codec: presetObj.video_codec || "h264",
        width: presetObj.width,
        height: presetObj.height,
        fps: presetObj.fps,
        audio_bitrate: presetObj.audio_bitrate,
        audio_codec: presetObj.audio_codec || "aac",
        container: presetObj.container || "mp4",
        task_type: presetObj.task_type || "compression"
      },
    });
  };

  // Start video compression processing
  const handleStartProcess = async (itemId, optionsOverride = null) => {
    const item = queue.find((i) => i.id === itemId);
    if (!item || !item.fileId || item.status === "processing") return;

    updateItem(itemId, { status: "processing", progress: 0, elapsed: 0, eta: 0, speed: "0.0x", fps: 0 });
    triggerToast(`Started compressing '${item.name}'...`);

    const finalOptions = optionsOverride || item.options;

    try {
      const res = await fetch(`${backendUrl}/api/compress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: item.fileId,
          preset: finalOptions.preset || "telegram",
          crf: finalOptions.crf,
          video_bitrate: finalOptions.video_bitrate,
          audio_bitrate: finalOptions.audio_bitrate,
          width: finalOptions.width,
          height: finalOptions.height,
          fps: finalOptions.fps,
          task_type: finalOptions.task_type || "compression",
          audio_codec: finalOptions.audio_codec || "aac",
          video_codec: finalOptions.video_codec || "h264",
          gpu_acceleration: finalOptions.gpu_acceleration || "auto",
          container: finalOptions.container || "mp4",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        updateItem(itemId, { taskId: data.task_id });
        startPolling(itemId, data.task_id);
      } else {
        const err = await res.json();
        let errDetail = err.detail || "Compression startup failed.";
        if (typeof errDetail === "object" && errDetail !== null) {
          errDetail = errDetail.detail || errDetail.error || errDetail.details || JSON.stringify(errDetail);
        }
        updateItem(itemId, { status: "failed", error: errDetail });
        triggerToast(`Compression failed: ${errDetail}`, "error");
      }
    } catch (e) {
      updateItem(itemId, { status: "failed", error: "Failed to connect to compression API." });
      triggerToast("Failed to connect to API server.", "error");
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
          triggerToast(`Successfully compressed '${queue.find((q) => q.id === itemId)?.name}'!`);
          loadHistory();

          // Auto download if enabled
          if (localStorage.getItem("compressly_auto_download") === "true") {
            const currentItem = queue.find((q) => q.id === itemId);
            downloadFile(taskId, currentItem?.name || "compressed_video.mp4");
          }
        } else if (data.status === "failed") {
          clearInterval(interval);
          delete pollingIntervals.current[itemId];
          updateItem(itemId, { status: "failed", error: data.error || "FFmpeg encoding failed." });
          triggerToast(`Encoding failed for task.`, "error");
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
            fps: data.fps || 0,
          });
        } else if (data.status === "processing") {
          updateItem(itemId, {
            status: "processing",
            progress: data.progress,
            elapsed: data.elapsed,
            eta: data.eta,
            speed: data.speed,
            fps: data.fps || 0,
          });
        }
      } catch {
        // Networking retry loop
      }
    }, 800);

    pollingIntervals.current[itemId] = interval;
  };

  const controlTask = async (itemId, action) => {
    const item = queue.find((q) => q.id === itemId);
    if (!item) return;

    if (item.status === "uploading" && action === "cancel") {
      if (activeUploads.current[itemId]) {
        activeUploads.current[itemId].abort();
        delete activeUploads.current[itemId];
      }
      setQueue((prev) => prev.filter((q) => q.id !== itemId));
      if (selectedItemId === itemId) setSelectedItemId(null);
      triggerToast("Upload cancelled.");
      return;
    }

    if (!item.taskId) {
      setQueue((prev) => prev.filter((q) => q.id !== itemId));
      if (selectedItemId === itemId) setSelectedItemId(null);
      return;
    }

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
          triggerToast("Compression task cancelled.");
        } else if (action === "pause") {
          updateItem(itemId, { status: "paused" });
          triggerToast("Compression paused.");
        } else if (action === "resume") {
          updateItem(itemId, { status: "processing" });
          triggerToast("Compression resumed.");
        }
      }
    } catch {
      triggerToast("Failed to send control command.", "error");
    }
  };

  const downloadFile = (taskId, originalName) => {
    const link = document.createElement("a");
    link.href = `${backendUrl}/api/download/${taskId}`;
    link.setAttribute("download", `compressed_${originalName}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`Downloading compressed '${originalName}'...`);
  };

  const downloadFromHistory = (taskId, filename) => {
    const link = document.createElement("a");
    link.href = `${backendUrl}/api/history/download/${taskId}`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`Downloading '${filename}' from history...`);
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
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // Selected item
  const selectedItem = queue.find((item) => item.id === selectedItemId);
  const activePresetObj = SMART_PRESETS.find((p) => p.id === selectedItem?.options?.preset) || SMART_PRESETS[4];

  // Calculate Output Estimation
  const calculateEstimate = (item, presetObj) => {
    if (!item || !item.size) return { estSize: 0, estReduction: 0, quality: "Balanced", speedEst: "Fast" };
    const origSize = item.size;
    const estReduction = presetObj?.estReduction || 45;
    const estSize = Math.max(512 * 1024, Math.round(origSize * (1 - estReduction / 100)));
    return {
      estSize,
      estReduction,
      quality: presetObj?.quality || "Balanced Quality",
      speedEst: presetObj?.speedEst || "Fast"
    };
  };

  const handleCompressAll = () => {
    const readyItems = queue.filter((i) => i.status === "ready");
    readyItems.forEach((item) => handleStartProcess(item.id));
    if (readyItems.length > 0) {
      triggerToast(`Batch compressing ${readyItems.length} videos...`);
    }
  };

  const handlePauseAll = () => {
    const processingItems = queue.filter((i) => i.status === "processing");
    processingItems.forEach((item) => controlTask(item.id, "pause"));
    if (processingItems.length > 0) {
      triggerToast(`Paused ${processingItems.length} active compressions.`);
    }
  };

  const handleResumeAll = () => {
    const pausedItems = queue.filter((i) => i.status === "paused");
    pausedItems.forEach((item) => controlTask(item.id, "resume"));
    if (pausedItems.length > 0) {
      triggerToast(`Resumed ${pausedItems.length} compressions.`);
    }
  };

  const handleCancelAll = () => {
    queue.forEach((item) => controlTask(item.id, "cancel"));
    setQueue([]);
    setSelectedItemId(null);
    triggerToast("Cleared compression queue.");
  };

  const handleMoveItemUp = (id) => {
    const idx = queue.findIndex((q) => q.id === id);
    if (idx <= 0) return;
    const newQ = [...queue];
    const temp = newQ[idx - 1];
    newQ[idx - 1] = newQ[idx];
    newQ[idx] = temp;
    setQueue(newQ);
  };

  const handleOpenFolder = async (taskId) => {
    try {
      const res = await fetch(`${backendUrl}/api/open-folder/${taskId}`, { method: "POST" });
      if (res.ok) {
        triggerToast("Opened file location in File Explorer.");
      } else {
        triggerToast("Output file not found on server disk.", "error");
      }
    } catch {
      triggerToast("Failed to open folder.", "error");
    }
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
            className={`fixed top-4 right-4 z-50 flex items-center space-x-2 rounded-xl px-4 py-3 shadow-xl border backdrop-blur-md ${
              toastMsg.type === "error"
                ? "bg-red-500/10 text-red-500 border-red-500/20"
                : "bg-foreground/10 text-foreground border-foreground/15 dark:bg-foreground/20"
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
                ? "border-foreground bg-foreground/[0.03] scale-[1.005]"
                : "border-border/65 hover:border-foreground/50 hover:bg-foreground/[0.005]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5 dark:bg-foreground/10 text-foreground mb-4 shadow-sm">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Drag & drop your videos here</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports MP4, MOV, AVI, and MKV formats
            </p>
          </div>

          {/* Queue Section */}
          {queue.length > 0 ? (
            <div className="space-y-3.5">
              <BatchControls
                queue={queue}
                selectedItemId={selectedItemId}
                onCompressSelected={(id) => handleStartProcess(id)}
                onCompressAll={handleCompressAll}
                onPauseAll={handlePauseAll}
                onResumeAll={handleResumeAll}
                onCancelAll={handleCancelAll}
                onMoveItemUp={handleMoveItemUp}
                onMoveItemDown={handleMoveItemDown}
              />

              <div className="space-y-3">
                {queue.map((item) => {
                  const isSelected = item.id === selectedItemId;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`relative flex flex-col md:flex-row items-start md:items-center justify-between rounded-xl border p-4 transition-all cursor-pointer ${
                        isSelected
                          ? "border-foreground bg-foreground/[0.02] shadow-sm"
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
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Uploading...
                          </span>
                        )}

                        {item.status === "ready" && (
                          <span className="text-xs font-semibold text-foreground/80 bg-foreground/5 dark:bg-foreground/10 px-2.5 py-0.5 rounded-full">
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
                              ETA: {item.eta.toFixed(0)}s &middot; {item.elapsed.toFixed(0)}s
                            </span>
                          </div>
                        )}

                        {item.status === "completed" && (
                          <div className="text-right">
                            <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Compressed
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
                                handleStartProcess(item.id);
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
                              title="Download Video"
                            >
                              <Download className="h-4 w-4 text-green-500" />
                            </button>
                          )}

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
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/40 p-8 glass text-center flex flex-col items-center justify-center py-12 space-y-3">
              <Film className="h-8 w-8 text-muted-foreground/50" />
              <h3 className="text-sm font-semibold text-foreground">No videos in queue</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Drop your video files above to start compressing with custom presets.
              </p>
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
                <p className="text-xs text-muted-foreground mt-0.5">Configure processing preset & options</p>
              </div>

              {/* Video Info Section */}
              {selectedItem.metadata && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">Source Specs</span>
                    <button
                      onClick={() => copyMetadata(selectedItem.metadata)}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all"
                    >
                      {copiedInfo ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy Specs
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs rounded-xl border border-border/20 p-3 bg-foreground/[0.01]">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Resolution</span>
                      <span className="font-medium text-foreground">
                        {selectedItem.metadata.width}x{selectedItem.metadata.height}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Codec</span>
                      <span className="font-medium text-foreground truncate block">
                        {selectedItem.metadata.video_codec}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Duration</span>
                      <span className="font-medium text-foreground">
                        {selectedItem.metadata.duration.toFixed(1)}s
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">FPS</span>
                      <span className="font-medium text-foreground">{selectedItem.metadata.fps}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Smart Presets Selection Grid */}
              {selectedItem.status === "ready" && (
                <div className="space-y-5">
                  <SmartPresetsGrid
                    selectedPresetId={selectedItem.options.preset}
                    onSelectPreset={(presetObj) => selectPreset(selectedItem.id, presetObj)}
                  />

                  {/* Pre-Compression Estimation Box */}
                  <div className="rounded-xl border border-border/25 p-3.5 bg-foreground/[0.015] space-y-2.5">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5" /> Output Estimation
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Est. Output Size</span>
                        <span className="font-bold text-foreground">
                          {formatBytes(currentEst.estSize)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Est. Space Saved</span>
                        <span className="font-bold text-green-500">
                          ~{currentEst.estReduction}% Reduction
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Target Quality</span>
                        <span className="font-medium text-foreground truncate block">
                          {currentEst.quality}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Encoding Speed</span>
                        <span className="font-medium text-foreground truncate block">
                          {currentEst.speedEst}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Options Toggle & Panel */}
                  <div className="border-t border-border/10 pt-3">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs font-semibold text-foreground hover:opacity-80 flex items-center gap-1.5 transition-all"
                    >
                      <Sliders className="h-4 w-4" />
                      {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
                    </button>

                    {showAdvanced && (
                      <AdvancedOptionsPanel
                        options={selectedItem.options}
                        onChangeOptions={(newOpts) => updateItem(selectedItem.id, { options: newOpts })}
                      />
                    )}
                  </div>

                  <button
                    onClick={() => handleStartProcess(selectedItem.id)}
                    disabled={selectedItem.status === "processing"}
                    className="w-full py-3 px-4 rounded-xl bg-foreground text-background dark:bg-foreground dark:text-background font-semibold hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-4.5 w-4.5" />
                    Compress Video
                  </button>
                </div>
              )}

              {/* Compression Live Progress Experience */}
              {(selectedItem.status === "processing" || selectedItem.status === "paused") && (
                <div className="space-y-4 rounded-xl border border-border/20 p-4 bg-foreground/[0.015]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <RefreshCw className={`h-3.5 w-3.5 ${selectedItem.status === "processing" ? "animate-spin" : ""}`} />
                      {selectedItem.status === "paused" ? "Encoding Paused" : "Encoding Video..."}
                    </h4>
                    <span className="text-xs font-bold text-foreground font-mono">
                      {selectedItem.progress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full bg-foreground transition-all duration-300"
                      style={{ width: `${selectedItem.progress}%` }}
                    />
                  </div>

                  {/* Live Progress Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Speed</span>
                      <span className="font-semibold text-foreground">{selectedItem.speed || "1.0x"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Current FPS</span>
                      <span className="font-semibold text-foreground">{selectedItem.fps || 0} FPS</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Elapsed Time</span>
                      <span className="font-semibold text-foreground">{selectedItem.elapsed.toFixed(0)}s</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">ETA</span>
                      <span className="font-semibold text-foreground">{selectedItem.eta.toFixed(0)}s</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Original Size</span>
                      <span className="font-semibold text-foreground">{formatBytes(selectedItem.size)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Est. Final Size</span>
                      <span className="font-semibold text-green-500">{formatBytes(currentEst.estSize)}</span>
                    </div>
                  </div>

                  {/* Task Controls: Pause, Resume, Cancel */}
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
                <BeforeAfterPanel
                  item={selectedItem}
                  backendUrl={backendUrl}
                  onDownload={downloadFile}
                  onOpenFolder={handleOpenFolder}
                  onPreviewVideo={(itemToPreview) => setPreviewItem(itemToPreview)}
                  onViewLogs={(taskIdToLog) => setViewingLogTaskId(taskIdToLog)}
                  onCompressAnother={() => {
                    setQueue((prev) => prev.filter((q) => q.id !== selectedItem.id));
                    setSelectedItemId(null);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/40 p-10 dark:bg-card/10 glass text-center flex flex-col items-center justify-center py-16 space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5 dark:bg-foreground/10 text-foreground mb-1">
                <Settings2 className="h-5 w-5 animate-pulse-slow" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Preset Options</h3>
              <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                Select a video from the queue to pick smart presets or customize CRF and resolution.
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
              SQLite Compression History
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stored securely in local SQLite database.
            </p>
          </div>
          <button
            onClick={() => loadHistory()}
            className="text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 text-xs"
            disabled={historyLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`} />
            Refresh History
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center space-x-2 flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search history..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-muted-foreground font-medium">Status Filter:</label>
            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
            >
              <option value="all">All Logs</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b border-border/20 text-muted-foreground font-semibold">
                  <th className="py-3 px-2">Original Filename</th>
                  <th className="py-3 px-2">Preset</th>
                  <th className="py-3 px-2">Codec / Res</th>
                  <th className="py-3 px-2">Duration</th>
                  <th className="py-3 px-2 text-right">Original Size</th>
                  <th className="py-3 px-2 text-right">Compressed</th>
                  <th className="py-3 px-2 text-right">Saved Space</th>
                  <th className="py-3 px-2 text-right">Date & Time</th>
                  <th className="py-3 px-2 text-right">Status</th>
                  <th className="py-3 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 text-foreground/90">
                {history
                  .filter((row) => {
                    const matchesSearch =
                      !historySearch ||
                      row.filename.toLowerCase().includes(historySearch.toLowerCase()) ||
                      (row.preset_used && row.preset_used.toLowerCase().includes(historySearch.toLowerCase())) ||
                      (row.video_codec && row.video_codec.toLowerCase().includes(historySearch.toLowerCase()));

                    const matchesStatus =
                      historyStatusFilter === "all" || row.status === historyStatusFilter;

                    return matchesSearch && matchesStatus;
                  })
                  .map((row) => {
                    const savedMB = row.original_size && row.compressed_size ? formatBytes(row.original_size - row.compressed_size) : "-";
                    return (
                      <tr key={row.id} className="hover:bg-foreground/[0.005] transition-colors">
                        <td className="py-3.5 px-2 font-medium truncate max-w-[150px] sm:max-w-[200px]" title={row.filename}>
                          {row.filename}
                        </td>
                        <td className="py-3.5 px-2 font-medium capitalize text-muted-foreground">
                          {row.preset_used || "balanced"}
                        </td>
                        <td className="py-3.5 px-2 text-muted-foreground">
                          {row.video_codec || "h264"} &middot; {row.resolution || "1080p"}
                        </td>
                        <td className="py-3.5 px-2 text-muted-foreground">{row.duration ? `${row.duration.toFixed(0)}s` : "-"}</td>
                        <td className="py-3.5 px-2 text-right text-muted-foreground">{formatBytes(row.original_size)}</td>
                        <td className="py-3.5 px-2 text-right font-medium">
                          {row.compressed_size ? formatBytes(row.compressed_size) : "-"}
                        </td>
                        <td className="py-3.5 px-2 text-right text-green-500 font-bold">
                          {row.saved_percentage ? `-${row.saved_percentage}% (${savedMB})` : "-"}
                        </td>
                        <td className="py-3.5 px-2 text-right text-muted-foreground">
                          {formatDate(row.created_at)}
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
                          <div className="flex items-center justify-center space-x-1">
                            {row.status === "completed" && row.file_exists && (
                              <>
                                <button
                                  onClick={() => downloadFromHistory(row.id, `compressed_${row.filename}`)}
                                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                                  title="Download Again"
                                >
                                  <Download className="h-3.5 w-3.5 text-green-500" />
                                </button>
                                <button
                                  onClick={() => handleOpenFolder(row.id)}
                                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                                  title="Open Folder"
                                >
                                  <Folder className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setViewingLogTaskId(row.id)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                              title="View FFmpeg Logs"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteHistoryRow(row.id)}
                              className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all"
                              title="Clear Entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Video Preview Modal */}
      {previewItem && (
        <VideoPreviewModal
          item={previewItem}
          backendUrl={backendUrl}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* FFmpeg Log Modal */}
      {viewingLogTaskId && (
        <FFmpegLogModal
          taskId={viewingLogTaskId}
          backendUrl={backendUrl}
          onClose={() => setViewingLogTaskId(null)}
        />
      )}
    </div>
  );
};
