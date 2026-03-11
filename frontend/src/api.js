import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

/** Resolve relative upload paths to the backend origin so images load in production. */
export function resolvePhotoUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (!url.startsWith("/")) return url;
  const origin =
    baseURL.startsWith("http://") || baseURL.startsWith("https://")
      ? new URL(baseURL).origin
      : typeof window !== "undefined"
        ? window.location.origin
        : "";
  return origin ? origin + url : url;
}

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers["Content-Type"];
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-logout"));
    }
    return Promise.reject(err);
  }
);

export function setAuthToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem("user", JSON.stringify(user));
  else localStorage.removeItem("user");
}
