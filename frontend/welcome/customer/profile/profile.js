/* =====================================================
   LOCALBASKET — PROFILE LOGIC
   FINAL • CLEAN • STABLE
===================================================== */

const API_URL = "http://localhost:5000/api";
let currentUser = null;

/* =====================================================
   AUTH CHECK
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  try {
    currentUser = JSON.parse(localStorage.getItem("lbUser"));
  } catch (err) {
    currentUser = null;
  }

  if (!currentUser || !currentUser.id) {
    window.location.href = "/welcome/customer/index.html";
    return;
  }

  initProfile();
});

/* =====================================================
   INIT
===================================================== */
function initProfile() {
  loadUserData();

  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate);
  }
}

/* =====================================================
   LOAD USER DATA
===================================================== */
function loadUserData() {
  if (!currentUser) return;

  // Sidebar
  const userInitial = document.getElementById("userInitial");
  const sidebarName = document.getElementById("sidebarName");
  const sidebarEmail = document.getElementById("sidebarEmail");

  if (userInitial) {
    userInitial.textContent = currentUser.name
      ? currentUser.name.charAt(0).toUpperCase()
      : "U";
  }

  if (sidebarName) sidebarName.textContent = currentUser.name || "";
  if (sidebarEmail) sidebarEmail.textContent = currentUser.email || "";

  // Form
  const nameInput = document.getElementById("profName");
  const emailInput = document.getElementById("profEmail");
  const phoneInput = document.getElementById("profPhone");

  if (nameInput) nameInput.value = currentUser.name || "";
  if (emailInput) emailInput.value = currentUser.email || "";
  if (phoneInput) phoneInput.value = currentUser.phone || "";
}

/* =====================================================
   UPDATE PROFILE
===================================================== */
async function handleProfileUpdate(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector("button[type='submit']");
  const originalText = submitBtn ? submitBtn.innerText : "Update Profile";

  const name = document.getElementById("profName")?.value.trim();
  const email = document.getElementById("profEmail")?.value.trim();
  const phone = document.getElementById("profPhone")?.value.trim();
  const password = document.getElementById("profPass")?.value.trim();

  if (!name || !email) {
    alert("❌ Name and Email are required");
    return;
  }

  const payload = {
    id: currentUser.id,
    name,
    email,
    phone
  };

  // Send password only if provided
  if (password) {
    payload.password = password;
  }

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
      alert("❌ " + (data.message || "Update failed"));
      return;
    }

    // Update localStorage
    currentUser.name = name;
    currentUser.email = email;
    currentUser.phone = phone;

    localStorage.setItem("lbUser", JSON.stringify(currentUser));

    loadUserData();
    alert("✅ Profile updated successfully");

    // Clear password
    const passInput = document.getElementById("profPass");
    if (passInput) passInput.value = "";

  } catch (err) {
    console.error("❌ Profile Update Error:", err);
    alert("🔌 Server error. Try again later.");
  } finally {
    if (submitBtn) {
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
    }
  }
}

/* =====================================================
   LOGOUT
===================================================== */
function handleLogout() {
  if (!confirm("Are you sure you want to logout?")) return;

  const cartKey = currentUser && currentUser.id ? `lbCart_${currentUser.id}` : null;
  localStorage.removeItem("lbUser");
  if (cartKey) localStorage.removeItem(cartKey);
  localStorage.removeItem("lbCart");

  window.location.href = "/welcome/customer/index.html";
}
