(function () {
  const faqList = document.getElementById("faqList");
  if (faqList) {
    faqList.addEventListener("click", function (e) {
      const btn = e.target.closest(".faq-btn");
      if (!btn) return;
      const item = btn.closest(".faq-item");
      if (!item) return;
      item.classList.toggle("open");
    });
  }

  const form = document.getElementById("supportForm");
  const note = document.getElementById("supportNote");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = String(document.getElementById("supportName")?.value || "").trim();
      const email = String(document.getElementById("supportEmail")?.value || "").trim().toLowerCase();
      const type = String(document.getElementById("supportType")?.value || "").trim();
      const message = String(document.getElementById("supportMessage")?.value || "").trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

      if (!name || !emailOk || !type || !message) {
        window.alert("Please fill all fields correctly.");
        return;
      }

      const request = {
        id: "SUP-" + Date.now(),
        name,
        email,
        type,
        message,
        created_at: new Date().toISOString()
      };

      const existing = JSON.parse(localStorage.getItem("lbSupportRequests") || "[]");
      existing.unshift(request);
      localStorage.setItem("lbSupportRequests", JSON.stringify(existing.slice(0, 25)));

      form.reset();
      if (note) {
        note.textContent = "Request submitted. Ticket ID: " + request.id;
        note.style.background = "#ecfdf5";
        note.style.borderColor = "#86efac";
        note.style.color = "#166534";
      }
      window.alert("Support request submitted successfully.");
    });
  }
})();
