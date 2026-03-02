const host = String(window.location.hostname || "").trim();
const isPrivateLanHost = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
const isLocalHost = ["localhost", "127.0.0.1"].includes(host) || isPrivateLanHost || window.location.protocol === "file:";
const isVercelHost = host.endsWith(".vercel.app");
const localOrigin = window.location.protocol === "file:" ? "http://localhost:5000" : `${window.location.protocol}//${host}:5000`;
const hostedOrigin = window.location.origin;

const CONFIG = {
  API_BASE: isLocalHost
    ? `${window.API_BASE_URL}`
    : `${window.API_BASE_URL}`,
  IMG_BASE: isLocalHost
    ? `${localOrigin}/uploads`
    : `${hostedOrigin}/uploads`,
  DEFAULT_IMG: "https://placehold.co/200?text=No+Image"
};

