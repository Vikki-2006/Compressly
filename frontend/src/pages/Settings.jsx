import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Server, Database, Save, RotateCcw, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

const defaultBackendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const Settings = () => {
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem("compressly_backend_url") || defaultBackendUrl;
  });
  const [defaultPreset, setDefaultPreset] = useState(() => {
    return localStorage.getItem("compressly_default_preset") || "telegram";
  });
  const [defaultCodec, setDefaultCodec] = useState(() => {
    return localStorage.getItem("compressly_default_codec") || "h264";
  });
  const [defaultCrf, setDefaultCrf] = useState(() => {
    return parseInt(localStorage.getItem("compressly_default_crf") || "24", 10);
  });
  const [gpuMode, setGpuMode] = useState(() => {
    return localStorage.getItem("compressly_gpu_mode") || "auto";
  });
  const [outputFolder, setOutputFolder] = useState(() => {
    return localStorage.getItem("compressly_output_folder") || "";
  });
  const [maxConcurrency, setMaxConcurrency] = useState(() => {
    return localStorage.getItem("compressly_max_concurrency") || "2";
  });
  const [autoDownload, setAutoDownload] = useState(() => {
    return localStorage.getItem("compressly_auto_download") === "true";
  });
  const [autoOpenFolder, setAutoOpenFolder] = useState(() => {
    return localStorage.getItem("compressly_auto_open_folder") === "true";
  });
  const [autoDeleteUploads, setAutoDeleteUploads] = useState(() => {
    return localStorage.getItem("compressly_auto_delete_uploads") === "true";
  });

  const [systemHealth, setSystemHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [historyClearSuccess, setHistoryClearSuccess] = useState(false);

  const fetchHealth = async (silent = false) => {
    if (!silent) setHealthLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      } else {
        setSystemHealth(null);
      }
    } catch {
      setSystemHealth(null);
    } finally {
      if (!silent) setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [backendUrl]);

  const handleSave = () => {
    localStorage.setItem("compressly_backend_url", backendUrl);
    localStorage.setItem("compressly_default_preset", defaultPreset);
    localStorage.setItem("compressly_default_codec", defaultCodec);
    localStorage.setItem("compressly_default_crf", String(defaultCrf));
    localStorage.setItem("compressly_gpu_mode", gpuMode);
    localStorage.setItem("compressly_output_folder", outputFolder);
    localStorage.setItem("compressly_max_concurrency", maxConcurrency);
    localStorage.setItem("compressly_auto_download", String(autoDownload));
    localStorage.setItem("compressly_auto_open_folder", String(autoOpenFolder));
    localStorage.setItem("compressly_auto_delete_uploads", String(autoDeleteUploads));

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    fetchHealth(true);
  };

  const handleReset = () => {
    setBackendUrl(defaultBackendUrl);
    setDefaultPreset("telegram");
    setDefaultCodec("h264");
    setDefaultCrf(24);
    setGpuMode("auto");
    setOutputFolder("");
    setMaxConcurrency("2");
    setAutoDownload(false);
    setAutoOpenFolder(false);
    setAutoDeleteUploads(false);
  };

  const clearHistory = async () => {
    if (!confirm("Are you sure you want to permanently clear the database history? This cannot be undone.")) {
      return;
    }
    try {
      const listRes = await fetch(`${backendUrl}/api/history`);
      if (listRes.ok) {
        const items = await listRes.json();
        for (const item of items) {
          await fetch(`${backendUrl}/api/history/${item.id}`, { method: "DELETE" });
        }
        setHistoryClearSuccess(true);
        setTimeout(() => setHistoryClearSuccess(false), 2000);
      }
    } catch (e) {
      alert("Failed to connect to backend server to clear history.");
    }
  };

  return (
    <div className="desktop-container py-12 font-sans">
      <div className="flex items-center space-x-3 border-b border-border/20 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 dark:bg-foreground/10 text-foreground">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure global defaults, encoder hardware acceleration, and system health.</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border/40 p-6 glass space-y-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Preferences & Encoder Defaults
            </h2>

            {/* Backend URL */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Backend Host URL</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder={defaultBackendUrl}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
              />
              <p className="text-xs text-muted-foreground">The API endpoint for video uploading and FFmpeg encoding.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Default Preset */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Default Smart Preset</label>
                <select
                  value={defaultPreset}
                  onChange={(e) => setDefaultPreset(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all capitalize"
                >
                  <option value="whatsapp">WhatsApp (&lt; 16MB)</option>
                  <option value="instagram_feed">Instagram Feed (1:1)</option>
                  <option value="instagram_reel">Instagram Reel (9:16)</option>
                  <option value="tiktok">TikTok Video</option>
                  <option value="youtube">YouTube HD (1080p)</option>
                  <option value="youtube_shorts">YouTube Shorts</option>
                  <option value="facebook">Facebook Video</option>
                  <option value="telegram">Telegram (720p)</option>
                  <option value="discord">Discord (&lt; 25MB)</option>
                  <option value="email">Email Attachment (&lt; 25MB)</option>
                  <option value="archive">Archive (Visually Lossless)</option>
                  <option value="max_compression">Max Compression (Tiny)</option>
                  <option value="lossless">Lossless Preservation</option>
                  <option value="balanced">Balanced Default</option>
                  <option value="high_quality">High Quality</option>
                  <option value="audio_mp3">Audio Extraction (MP3)</option>
                </select>
              </div>

              {/* Default Video Codec */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Default Video Codec</label>
                <select
                  value={defaultCodec}
                  onChange={(e) => setDefaultCodec(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all uppercase"
                >
                  <option value="h264">H.264 (AVC) - Universal Compatibility</option>
                  <option value="hevc">H.265 (HEVC) - High Efficiency</option>
                  <option value="av1">AV1 (libsvtav1) - Next Gen</option>
                  <option value="vp9">VP9 (WebM)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Default GPU Acceleration */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">GPU Acceleration Mode</label>
                <select
                  value={gpuMode}
                  onChange={(e) => setGpuMode(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                >
                  <option value="auto">Auto Detect Best Hardware</option>
                  <option value="cpu">Software Encoding (CPU Only)</option>
                  <option value="nvenc">NVIDIA NVENC</option>
                  <option value="qsv">Intel QuickSync (QSV)</option>
                  <option value="amf">AMD AMF</option>
                </select>
              </div>

              {/* Max Concurrency */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Max Simultaneous Tasks</label>
                <select
                  value={maxConcurrency}
                  onChange={(e) => setMaxConcurrency(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                >
                  <option value="1">1 Active Task (Lowest CPU)</option>
                  <option value="2">2 Active Tasks (Recommended)</option>
                  <option value="4">4 Active Tasks (High Performance)</option>
                </select>
              </div>
            </div>

            {/* Default CRF Slider */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-sm">
                <label className="font-medium text-foreground">Default CRF (Constant Rate Factor)</label>
                <span className="font-bold text-foreground">{defaultCrf}</span>
              </div>
              <input
                type="range"
                min="14"
                max="35"
                value={defaultCrf}
                onChange={(e) => setDefaultCrf(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-foreground"
              />
            </div>

            {/* Custom Output Directory */}
            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-medium text-foreground">Custom Output Folder Path</label>
              <input
                type="text"
                value={outputFolder}
                onChange={(e) => setOutputFolder(e.target.value)}
                placeholder="Default: system downloads directory"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
              />
            </div>

            {/* Automation Toggles */}
            <div className="space-y-3 pt-3 border-t border-border/10">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="auto-download"
                  checked={autoDownload}
                  onChange={(e) => setAutoDownload(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-border bg-background text-foreground focus:ring-0"
                />
                <label htmlFor="auto-download" className="text-sm font-medium text-foreground cursor-pointer">
                  Automatically download video when compression completes
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="auto-open-folder"
                  checked={autoOpenFolder}
                  onChange={(e) => setAutoOpenFolder(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-border bg-background text-foreground focus:ring-0"
                />
                <label htmlFor="auto-open-folder" className="text-sm font-medium text-foreground cursor-pointer">
                  Automatically open output folder in File Explorer when finished
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="auto-delete-uploads"
                  checked={autoDeleteUploads}
                  onChange={(e) => setAutoDeleteUploads(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-border bg-background text-foreground focus:ring-0"
                />
                <label htmlFor="auto-delete-uploads" className="text-sm font-medium text-foreground cursor-pointer">
                  Automatically clean temporary upload cache on exit
                </label>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 pt-4 border-t border-border/10">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background dark:bg-foreground dark:text-background hover:opacity-90 active:scale-98 transition-all"
              >
                <Save className="h-4 w-4" />
                Save Preferences
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 active:scale-98 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Defaults
              </button>
              {saveSuccess && (
                <span className="text-xs font-semibold text-green-500 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Saved Successfully!
                </span>
              )}
            </div>
          </div>

          {/* SQLite Actions */}
          <div className="rounded-2xl border border-border/40 p-6 glass space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Operations
            </h2>
            <p className="text-sm text-muted-foreground">
              Clear the local SQLite log history file. Stored records of compressed file sizes and savings will be permanently deleted.
            </p>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-all"
            >
              Clear Log History
            </button>
            {historyClearSuccess && (
              <p className="text-xs text-green-500 font-medium">History successfully cleared from database.</p>
            )}
          </div>
        </div>

        {/* Server Health Monitor */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/40 p-6 glass space-y-5">
            <div className="flex items-center justify-between border-b border-border/10 pb-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Health
              </h2>
              <button
                onClick={() => fetchHealth()}
                className="text-muted-foreground hover:text-foreground transition-all"
                disabled={healthLoading}
              >
                <RefreshCw className={`h-4.5 w-4.5 ${healthLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {systemHealth ? (
              <div className="space-y-4 text-sm">
                {/* FFmpeg status */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">FFmpeg status</span>
                  {systemHealth.ffmpeg?.available ? (
                    <span className="rounded-full bg-green-500/15 text-green-500 px-2 py-0.5 text-xs font-semibold">
                      Installed
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-500/15 text-yellow-500 px-2 py-0.5 text-xs font-semibold">
                      Missing
                    </span>
                  )}
                </div>

                {/* FFprobe status */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">FFprobe status</span>
                  {systemHealth.ffprobe?.available ? (
                    <span className="rounded-full bg-green-500/15 text-green-500 px-2 py-0.5 text-xs font-semibold">
                      Installed
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-500/15 text-yellow-500 px-2 py-0.5 text-xs font-semibold">
                      Missing
                    </span>
                  )}
                </div>

                <div className="border-t border-border/10 pt-3 space-y-3">
                  {/* CPU Usage */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">CPU Usage</span>
                      <span className="font-semibold text-foreground">{systemHealth.system?.cpu_usage_percent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
                      <div
                        className="h-full bg-foreground"
                        style={{ width: `${systemHealth.system?.cpu_usage_percent}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Usage */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">RAM Usage</span>
                      <span className="font-semibold text-foreground">{systemHealth.system?.ram_usage_percent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
                      <div
                        className="h-full bg-foreground"
                        style={{ width: `${systemHealth.system?.ram_usage_percent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-right">
                      {systemHealth.system?.ram_free_gb} GB available
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <h3 className="text-sm font-semibold text-foreground">Backend Disconnected</h3>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Unable to poll system health statistics. Ensure the FastAPI backend server is running.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
