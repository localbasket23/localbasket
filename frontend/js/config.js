(() => {
  const stored = (typeof localStorage !== "undefined" && localStorage.getItem("lbApiBase")) || "";
  const byWindow = window.API_BASE_URL || window.LB_API_BASE || stored;
  const host = String(window.location && window.location.hostname || "").trim();
  const isLocal =
    window.location && (window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1");
  const isProdHost = host === "localbasket.co.in" || host.endsWith(".localbasket.co.in");
  const isVercelHost = host.endsWith(".vercel.app");
  const hostedBackend = "https://localbasket-egpn.onrender.com";

  const byOrigin = isLocal
    ? "http://localhost:5000"
    : (window.location && window.location.origin) || "";

  const preferred = (isProdHost || isVercelHost) ? hostedBackend : byOrigin;
  const shouldBypassStored = isProdHost || isVercelHost;
  const candidate = shouldBypassStored ? preferred : (byWindow || preferred);
  const fallback = String(candidate || hostedBackend)
    .trim()
    .replace(/\/+$/, "");

  window.API_BASE_URL = fallback;
})();
