(function () {
  window.initAuth = window.initAuth || function initAuth() {
    var loginBtn = document.getElementById('loginBtn');
    var authModal = document.getElementById('authModal');
    if (loginBtn && authModal && !loginBtn.dataset.lbAuthBound) {
      loginBtn.addEventListener('click', function () {
        authModal.classList.add('active');
      });
      loginBtn.dataset.lbAuthBound = '1';
    }
  };
})();