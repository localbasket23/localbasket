(function () {
  window.initCart = window.initCart || function initCart() {
    var countEl = document.getElementById('cartCount');
    if (!countEl) return;
    var raw = localStorage.getItem('lbCart');
    var total = 0;
    try {
      var parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) {
        total = parsed.reduce(function (sum, item) {
          var qty = Number(item && item.qty != null ? item.qty : 1);
          return sum + (Number.isFinite(qty) ? qty : 0);
        }, 0);
      }
    } catch (e) {
      total = 0;
    }
    countEl.textContent = total + ' Items';
  };
})();