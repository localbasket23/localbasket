document.addEventListener("DOMContentLoaded", async () => {
  function ensureSharedStyles() {
    if (document.querySelector('link[data-lb-shared-style="header-footer"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/header-footer.css";
    link.setAttribute("data-lb-shared-style", "header-footer");
    document.head.appendChild(link);
  }

  ensureSharedStyles();

  function applySharedAssetBindings(scope) {
    if (!scope) return;
    scope.querySelectorAll("[data-lb-href]").forEach((el) => {
      const target = (el.getAttribute("data-lb-href") || "").trim();
      if (!target) return;
      el.setAttribute("href", `/welcome/${target.replace(/^\/+/, "")}`);
    });
    scope.querySelectorAll("[data-lb-src]").forEach((el) => {
      const target = (el.getAttribute("data-lb-src") || "").trim();
      if (!target) return;
      el.setAttribute("src", `/welcome/${target.replace(/^\/+/, "")}`);
    });
  }

  async function load(id, path) {
    const el = document.getElementById(id);
    if (!el) return;

    const res = await fetch(path);

    el.innerHTML = await res.text();
    applySharedAssetBindings(el);
  }

  await load("header", "/components/header.html");
  await load("footer", "/components/footer.html");

});

document.addEventListener("DOMContentLoaded", () => {
  if(window.initAuth) initAuth();
  if(window.initTheme) initTheme();
});
