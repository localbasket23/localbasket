(function () {
  function openAuthPopup() {
    var authOverlay = document.getElementById("authOverlay");
    if (authOverlay) {
      authOverlay.style.display = "flex";
      authOverlay.classList.add("active");
      return;
    }

    var authModal = document.getElementById("authModal");
    if (authModal) {
      authModal.classList.add("active");
      authModal.style.display = "flex";
    }
  }

  function bindLoginButtons() {
    var triggers = document.querySelectorAll("#loginBtn, [data-login]");
    triggers.forEach(function (btn) {
      if (!btn || btn.dataset.lbAuthBound) return;
      btn.addEventListener("click", function (e) {
        if (e) e.preventDefault();
        openAuthPopup();
      });
      btn.dataset.lbAuthBound = "1";
    });
  }

  function initAuth() {
    bindLoginButtons();
  }

  window.initAuth = initAuth;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }

  var headerHost = document.getElementById("header");
  if (headerHost && "MutationObserver" in window) {
    var observer = new MutationObserver(function () {
      bindLoginButtons();
    });
    observer.observe(headerHost, { childList: true, subtree: true });
  }
})();
