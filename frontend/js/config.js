(() => {
  const stored = (typeof localStorage !== "undefined" && localStorage.getItem("lbApiBase")) || "";
  const byWindow = window.API_BASE_URL || window.LB_API_BASE || stored;
  const byOrigin =
    window.location && window.location.protocol === "file:"
      ? "http://localhost:5000"
      : (window.location && window.location.origin) || "";
  const fallback = String(byWindow || byOrigin || "https://localbasket-egpn.onrender.com")
    .trim()
    .replace(/\/+$/, "");
  window.API_BASE_URL = window.API_BASE_URL || fallback;
})();
