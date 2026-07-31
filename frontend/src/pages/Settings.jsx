import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Server, Database, Save, RotateCcw, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

export const Settings = () => {
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem("compressly_backend_url") || "http://localhost:8000";
  });
  const [defaultPreset, setDefaultPreset] = useState(() => {
    return localStorage.getItem("compressly_default_preset") || "balanced";
  });
  const [autoDownload, setAutoDownload] = useState(() => {
    return localStorage.getItem("compressly_auto_download") === "true";
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
    localStorage.setItem("compressly_auto_download", String(autoDownload));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    // Reload health
    fetchHealth(true);
  };

  const handleReset = () => {
    setBackendUrl("http://localhost:8000");
    setDefaultPreset("balanced");
    setAutoDownload(false);
  };

  const clearHistory = async () => {
    if (!confirm("Are you sure you want to permanently clear the database history? This cannot be undone.")) {
      return;
    }
    try {
      // First fetch history items
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
          <p className="text-sm text-muted-foreground">Configure application preferences and monitor server status.</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border/40 p-6 glass space-y-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Preferences
            </h2>

            {/* Backend URL */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Backend Host URL</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
              />
              <p className="text-xs text-muted-foreground">The API endpoint for video uploading and FFmpeg encoding.</p>
            </div>

            {/* Quality Preset */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Default Quality Preset</label>
              <select
                value={defaultPreset}
                onChange={(e) => setDefaultPreset(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
              >
                <option value="high">High Quality (CRF 20)</option>
                <option value="balanced">Balanced (CRF 24)</option>
                <option value="max">Maximum Compression (CRF 30)</option>
              </select>
            </div>

            {/* Auto download */}
            <div className="flex items-center space-x-3 pt-2">
              <input
                type="checkbox"
                id="auto-download"
                checked={autoDownload}
                onChange={(e) => setAutoDownload(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-border bg-background text-foreground focus:ring-0"
              />
              <label htmlFor="auto-download" className="text-sm font-medium text-foreground cursor-pointer">
                Automatically download video when completed
              </label>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 pt-4 border-t border-border/10">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background dark:bg-foreground dark:text-background hover:opacity-90 active:scale-98 transition-all"
              >
                <Save className="h-4 w-4" />
                Save Changes
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
                  Saved!
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
