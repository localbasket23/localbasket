/* =====================================================
   LOCALBASKET - CUSTOMER PROFILE LOGIC
===================================================== */

const API_URL = `${window.API_BASE_URL}/api`;
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  try {
    currentUser = JSON.parse(localStorage.getItem("lbUser"));
  } catch {
    currentUser = null;
  }

  if (!currentUser || !currentUser.id) {
    window.location.href = "/welcome/customer/index.html";
    return;
  }

  initProfile();
});

function initProfile() {
  loadUserData();
  wireEnhancedInputs();
  wireProfileShortcuts();

  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate);
  }
}

function loadUserData() {
  if (!currentUser) return;

  const userInitial = document.getElementById("userInitial");
  const summaryName = document.getElementById("summaryName");
  const summaryEmail = document.getElementById("summaryEmail");

  if (userInitial) {
    userInitial.textContent = currentUser.name
      ? currentUser.name.charAt(0).toUpperCase()
      : "U";
  }

  if (summaryName) summaryName.textContent = currentUser.name || "User";
  if (summaryEmail) summaryEmail.textContent = maskEmail(currentUser.email || "");

  const nameInput = document.getElementById("profName");
  const emailInput = document.getElementById("profEmail");
  const phoneInput = document.getElementById("profPhone");
  const addressInput = document.getElementById("profAddress");
  const areaInput = document.getElementById("profArea");
  const pincodeInput = document.getElementById("profPincode");
  const prefWhatsapp = document.getElementById("prefWhatsapp");
  const prefPromoMail = document.getElementById("prefPromoMail");

  if (nameInput) nameInput.value = currentUser.name || "";
  if (emailInput) emailInput.value = currentUser.email || "";
  if (phoneInput) phoneInput.value = currentUser.phone || "";

  if (addressInput) addressInput.value = localStorage.getItem("lb_address") || "";
  if (areaInput) areaInput.value = localStorage.getItem("lb_area") || "";
  if (pincodeInput) pincodeInput.value = localStorage.getItem("lb_pincode") || "";
  if (prefWhatsapp) prefWhatsapp.checked = localStorage.getItem("lb_pref_whatsapp") !== "0";
  if (prefPromoMail) prefPromoMail.checked = localStorage.getItem("lb_pref_promomail") === "1";
}

function wireEnhancedInputs() {
  const passInput = document.getElementById("profPass");
  const passStrength = document.getElementById("passStrength");
  const togglePassBtn = document.getElementById("togglePassBtn");

  if (passInput && passStrength) {
    passInput.addEventListener("input", () => {
      const p = passInput.value || "";
      let strength = "-";
      if (!p) strength = "-";
      else if (p.length <= 4) strength = "Weak";
      else if (p.length <= 7) strength = "Medium";
      else strength = "Strong";
      passStrength.textContent = `Password strength: ${strength}`;
    });
  }

  if (passInput && togglePassBtn) {
    togglePassBtn.addEventListener("click", () => {
      const isPassword = passInput.type === "password";
      passInput.type = isPassword ? "text" : "password";
      togglePassBtn.textContent = isPassword ? "Hide" : "Show";
    });
  }
}

function wireProfileShortcuts() {
  document.querySelectorAll("[data-scroll-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-scroll-target");
      const target = id ? document.getElementById(id) : null;
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const securityCard = document.getElementById("securityCard");
  const securityToggle = document.getElementById("securityToggle");
  const quickSecurity = document.querySelector("[data-toggle-security]");

  const setSecurityOpen = (open) => {
    if (!securityCard || !securityToggle) return;
    securityCard.classList.toggle("open", open);
    securityToggle.setAttribute("aria-expanded", open ? "true" : "false");
  };

  if (securityToggle) {
    securityToggle.addEventListener("click", () => {
      const open = !securityCard?.classList.contains("open");
      setSecurityOpen(open);
    });
  }

  if (quickSecurity) {
    quickSecurity.addEventListener("click", () => {
      setSecurityOpen(true);
      securityCard?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function maskEmail(email) {
  const value = String(email || "").trim();
  if (!value || !value.includes("@")) return value || "No email added";
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;
  const visible = name.slice(0, Math.min(5, name.length));
  return `${visible}${name.length > 5 ? "..." : ""}@${domain}`;
}

async function handleProfileUpdate(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector("button[type='submit']");
  const originalText = submitBtn ? submitBtn.innerText : "Update Profile";

  const name = document.getElementById("profName")?.value.trim();
  const email = document.getElementById("profEmail")?.value.trim();
  const phone = document.getElementById("profPhone")?.value.trim();
  const password = document.getElementById("profPass")?.value.trim();
  const address = document.getElementById("profAddress")?.value.trim();
  const area = document.getElementById("profArea")?.value.trim();
  const pincode = document.getElementById("profPincode")?.value.trim();
  const prefWhatsapp = document.getElementById("prefWhatsapp")?.checked ? "1" : "0";
  const prefPromoMail = document.getElementById("prefPromoMail")?.checked ? "1" : "0";

  if (!name || !email) {
    alert("Name and Email are required");
    return;
  }
  if (pincode && !/^\d{6}$/.test(pincode)) {
    alert("Pincode must be 6 digits");
    return;
  }

  const payload = {
    id: currentUser.id,
    name,
    email,
    phone
  };

  if (password) payload.password = password;

  try {
    if (submitBtn) {
      submitBtn.innerText = "Saving...";
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.7";
    }

    const res = await fetch(`${API_URL}/customer/update-profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Update failed");
      return;
    }

    currentUser.name = name;
    currentUser.email = email;
    currentUser.phone = phone;
    localStorage.setItem("lbUser", JSON.stringify(currentUser));

    localStorage.setItem("lb_address", address || "");
    localStorage.setItem("lb_area", area || "");
    localStorage.setItem("lb_pincode", pincode || "");
    localStorage.setItem("lb_pref_whatsapp", prefWhatsapp);
    localStorage.setItem("lb_pref_promomail", prefPromoMail);

    loadUserData();
    alert("Profile updated successfully");

    const passInput = document.getElementById("profPass");
    if (passInput) passInput.value = "";
    const passStrength = document.getElementById("passStrength");
    if (passStrength) passStrength.textContent = "Password strength: -";
  } catch (err) {
    console.error("Profile Update Error:", err);
    alert("Server error. Try again later.");
  } finally {
    if (submitBtn) {
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
    }
  }
}

function handleLogout() {
  window.lbConfirm("Are you sure you want to logout?").then((ok) => {
    if (!ok) return;
    const cartKey = currentUser && currentUser.id ? `lbCart_${currentUser.id}` : null;
    localStorage.removeItem("lbUser");
    if (cartKey) localStorage.removeItem(cartKey);
    localStorage.removeItem("lbCart");
    window.location.href = "/welcome/customer/index.html";
  });
}

