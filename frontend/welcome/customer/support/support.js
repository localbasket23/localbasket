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

  function joinUrl(base, path) {
    const b = String(base || "").replace(/\/+$/, "");
    const p = String(path || "").replace(/^\/+/, "");
    if (!b) return "/" + p;
    return b + "/" + p;
  }

  const form = document.getElementById("supportForm");
  const note = document.getElementById("supportNote");
  if (form) {
    form.addEventListener("submit", async function (e) {
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

      let user = null;
      try { user = JSON.parse(localStorage.getItem("lbUser") || "null"); } catch {}

      const payload = {
        name,
        email,
        type,
        message,
        phone: user?.phone || user?.mobile || "",
        customer_id: user?.id || user?.customer_id || null
      };

      let ticketId = "SUP-" + Date.now();
      try {
        const apiBase = window.API_BASE_URL || window.LB_API_BASE || "";
        const url = joinUrl(apiBase, "/api/system/support/request");
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.success) {
          ticketId = String(data.ticket || data.id || ticketId);
        } else {
          throw new Error(data?.message || "Request failed");
        }
      } catch (err) {
        const request = {
          id: ticketId,
          name,
          email,
          type,
          message,
          created_at: new Date().toISOString(),
          offline: true
        };
        const existing = JSON.parse(localStorage.getItem("lbSupportRequests") || "[]");
        existing.unshift(request);
        localStorage.setItem("lbSupportRequests", JSON.stringify(existing.slice(0, 25)));
      }

      form.reset();
      if (note) {
        note.textContent = "Request submitted. Ticket ID: " + ticketId;
        note.style.background = "#ecfdf5";
        note.style.borderColor = "#86efac";
        note.style.color = "#166534";
      }
      window.alert("Support request submitted successfully.");
    });
  }
})();
