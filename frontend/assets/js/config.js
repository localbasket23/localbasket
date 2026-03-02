const host = String(window.location.hostname || "").trim();
const isPrivateLanHost = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
const isLocalHost = ["localhost", "127.0.0.1"].includes(host) || isPrivateLanHost || window.location.protocol === "file:";
const isVercelHost = host.endsWith(".vercel.app");
const localOrigin = window.location.protocol === "file:" ? "http://localhost:5000" : `${window.location.protocol}//${host}:5000`;
const hostedOrigin = window.location.origin;
const API_BASE_URL = (() => {
  const stored = (typeof localStorage !== "undefined" && localStorage.getItem("lbApiBase")) || "";
  const byWindow = window.API_BASE_URL || window.LB_API_BASE || stored;
  const byOrigin = window.location.protocol === "file:" ? localOrigin : window.location.origin;
  const clean = String(byWindow || byOrigin || "").trim().replace(/\/+$/, "");
  if (clean) window.API_BASE_URL = window.API_BASE_URL || clean;
  return clean;
})();

const CONFIG = {
  API_BASE: isLocalHost
    ? `${API_BASE_URL}/api`
    : `${API_BASE_URL}/api`,
  IMG_BASE: isLocalHost
    ? `${localOrigin}/uploads`
    : `${API_BASE_URL}/uploads`,
  DEFAULT_IMG: "https://placehold.co/200?text=No+Image"
};

