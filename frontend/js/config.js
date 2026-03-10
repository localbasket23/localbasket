(() => {
  const stored = (typeof localStorage !== "undefined" && localStorage.getItem("lbApiBase")) || "";
  const byWindow = window.API_BASE_URL || window.LB_API_BASE || stored;
  const host = String(window.location && window.location.hostname || "").trim();
  const isLocal =
    window.location && (window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1");

  const byOrigin = isLocal
    ? "http://localhost:5000"
    : (window.location && window.location.origin) || "";

  const candidate = byWindow || byOrigin;
  const fallback = String(candidate || byOrigin)
    .trim()
    .replace(/\/+$/, "");

  window.API_BASE_URL = fallback;
})();
