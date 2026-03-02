document.addEventListener("DOMContentLoaded", async () => {
  function ensureSharedStyles() {
    if (document.querySelector('link[data-lb-shared-style="header-footer"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/header-footer.css";
    link.setAttribute("data-lb-shared-style", "header-footer");
    document.head.appendChild(link);
  }

  const isSplashPage = /\/(?:index(?:\.html)?)?$/i.test(window.location.pathname || "");
  if (isSplashPage) return;

  ensureSharedStyles();

  async function load(id, file) {
    const el = document.getElementById(id);
    if (!el) return;

    const res = await fetch(
      window.location.origin + "/components/" + file
    );

    el.innerHTML = await res.text();
  }

  load("header","header.html");
  load("footer","footer.html");

});
