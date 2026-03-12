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
      const customerId = user?.id || user?.customer_id || null;
      if (!customerId) {
        window.alert("Please login first to submit a support request.");
        try { sessionStorage.setItem("lbOpenAuthAfterRedirect", "1"); } catch {}
        window.location.href = "/welcome/customer/index.html";
        return;
      }

      const payload = {
        name,
        email,
        type,
        message,
        phone: user?.phone || user?.mobile || "",
        customer_id: customerId
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
          throw new Error(data?.message || ("Request failed (HTTP " + res.status + ")"));
        }
      } catch (err) {
        const msg = String(err?.message || "Support request failed. Please try again.");
        if (note) {
          note.textContent = msg;
          note.style.background = "#fff1f2";
          note.style.borderColor = "#fecdd3";
          note.style.color = "#9f1239";
        }
        window.alert(msg);
        return;
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
