(function () {
  window.initTheme = window.initTheme || function initTheme() {
    var root = document.documentElement;
    var key = 'lbTheme';
    var saved = localStorage.getItem(key);
    var isDark = saved === 'dark';
    var toggleIds = ['themeToggleBtn', 'lbThemeToggleBtnMobile'];

    var syncToggles = function () {
      toggleIds.forEach(function (id) {
        var toggle = document.getElementById(id);
        if (toggle) toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      });
    };

    if (isDark) {
      root.classList.add('lb-theme-dark');
    } else {
      root.classList.remove('lb-theme-dark');
    }

    var bindToggle = function (id) {
      var btn = document.getElementById(id);
      if (!btn || btn.dataset.lbThemeBound) return;
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.addEventListener('click', function () {
        isDark = !root.classList.contains('lb-theme-dark');
        root.classList.toggle('lb-theme-dark', isDark);
        localStorage.setItem(key, isDark ? 'dark' : 'light');
        syncToggles();
      });
      btn.dataset.lbThemeBound = '1';
    };

    toggleIds.forEach(bindToggle);
    syncToggles();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.initTheme);
  } else {
    window.initTheme();
  }
})();
