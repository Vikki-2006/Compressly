// Centralized API configuration helper for Compressly Frontend

export const DEFAULT_BACKEND_URL = "https://compressly-backend-dasy.onrender.com";

/**
 * Resolves the backend base URL in priority order:
 * 1. User manual override in localStorage ("compressly_backend_url")
 * 2. VITE_API_URL environment variable
 * 3. VITE_BACKEND_URL environment variable
 * 4. Production backend URL default
 */
export const getBackendUrl = () => {
  const stored = localStorage.getItem("compressly_backend_url");
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, "");
  }

  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.trim()) {
    return envApiUrl.trim().replace(/\/+$/, "");
  }

  const envBackendUrl = import.meta.env.VITE_BACKEND_URL;
  if (envBackendUrl && envBackendUrl.trim()) {
    return envBackendUrl.trim().replace(/\/+$/, "");
  }

  return DEFAULT_BACKEND_URL;
};
