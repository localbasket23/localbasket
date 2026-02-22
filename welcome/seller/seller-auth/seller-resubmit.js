const API_BASE = "https://localbasket-backend.onrender.com/api";

const form = document.getElementById("resubmitForm");
const submitBtn = document.getElementById("submitBtn");
const lockNote = document.getElementById("lockNote");

const fields = {
  storeName: document.getElementById("storeName"),
  ownerName: document.getElementById("ownerName"),
  category: document.getElementById("category"),
  pincode: document.getElementById("pincode"),
  phone: document.getElementById("phone"),
  address: document.getElementById("shopAddress"),
  ownerId: document.getElementById("ownerId"),
  license: document.getElementById("license"),
  storePhoto: document.getElementById("storePhoto"),
  bankHolder: document.getElementById("bankHolder"),
  bankAccount: document.getElementById("bankAccount"),
  bankIfsc: document.getElementById("bankIfsc"),
  bankName: document.getElementById("bankName"),
  bankBranch: document.getElementById("bankBranch"),
  bankPassbook: document.getElementById("bankPassbook")
};

function ensurePopup() {
  if (document.getElementById("lbPopupStyle")) return;

  const style = document.createElement("style");
  style.id = "lbPopupStyle";
  style.textContent = `
    .lb-popup-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
    }
    .lb-popup-overlay.open { display: flex; }
    .lb-popup {
      width: min(420px, 100%);
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 20px 40px rgba(2, 6, 23, 0.2);
      overflow: hidden;
      animation: lbPopupIn 0.2s ease-out;
    }
    .lb-popup-head {
      padding: 14px 16px;
      font-weight: 700;
      font-size: 15px;
      border-bottom: 1px solid #f1f5f9;
      color: #111827;
      background: #f8fafc;
    }
    .lb-popup-body {
      padding: 16px;
      font-size: 14px;
      color: #374151;
      line-height: 1.45;
    }
    .lb-popup-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 0 16px 16px;
    }
    .lb-popup-btn {
      border: 0;
      border-radius: 10px;
      padding: 10px 16px;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      background: linear-gradient(135deg, #ff8a1a 0%, #e56a00 100%);
    }
    .lb-popup.success .lb-popup-head { color: #065f46; background: #ecfdf5; }
    .lb-popup.error .lb-popup-head { color: #991b1b; background: #fef2f2; }
    @keyframes lbPopupIn {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

function showPopup(message, opts = {}) {
  ensurePopup();
  const title = opts.title || "Notice";
  const type = opts.type === "error" ? "error" : "success";
  const okText = opts.okText || "OK";

  let overlay = document.getElementById("lbPopupOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "lbPopupOverlay";
    overlay.className = "lb-popup-overlay";
    overlay.innerHTML = `
      <div class="lb-popup" id="lbPopupBox" role="dialog" aria-modal="true">
        <div class="lb-popup-head" id="lbPopupTitle"></div>
        <div class="lb-popup-body" id="lbPopupMsg"></div>
        <div class="lb-popup-actions">
          <button type="button" class="lb-popup-btn" id="lbPopupOk">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const box = document.getElementById("lbPopupBox");
  const titleEl = document.getElementById("lbPopupTitle");
  const msgEl = document.getElementById("lbPopupMsg");
  const okBtn = document.getElementById("lbPopupOk");

  box.classList.remove("success", "error");
  box.classList.add(type);
  titleEl.textContent = title;
  msgEl.textContent = String(message || "");
  okBtn.textContent = okText;
  overlay.classList.add("open");

  return new Promise((resolve) => {
    const close = () => {
      overlay.classList.remove("open");
      okBtn.removeEventListener("click", onClick);
      resolve();
    };
    const onClick = () => close();
    okBtn.addEventListener("click", onClick);
  });
}

const seller = JSON.parse(localStorage.getItem("lbRejectedSeller") || "null");
if (!seller || !seller.id) {
  showPopup("No rejected seller data found. Please login again.", { title: "Session Missing", type: "error" })
    .then(() => {
      window.location.href = "/welcome/seller/seller-auth/seller-auth.html";
    });
}

function wireFileLabel(inputEl) {
  if (!inputEl) return;
  const label = inputEl.closest("label");
  const span = label ? label.querySelector("span") : null;
  inputEl.addEventListener("change", () => {
    if (!span) return;
    const name = inputEl.files?.[0]?.name;
    if (name) span.textContent = name;
  });
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadCategories() {
  const placeholder = '<option value="" disabled>Select Category</option>';
  const res = await fetch(`${API_BASE}/admin/categories`);
  const data = await res.json();
  const list = Array.isArray(data.categories) ? data.categories : [];
  fields.category.innerHTML = placeholder + list
    .filter(c => c.is_active === undefined || c.is_active === 1 || c.is_active === true)
    .map(c => `<option value="${c.id}">${c.name}</option>`)
    .join("");
}

function prefill() {
  fields.storeName.value = seller.store_name || "";
  fields.ownerName.value = seller.owner_name || "";
  fields.address.value = seller.address || "";
  fields.pincode.value = seller.pincode || "";
  fields.phone.value = seller.phone || "";
  fields.bankHolder.value = seller.bank_holder || "";
  fields.bankAccount.value = seller.bank_account || "";
  fields.bankIfsc.value = seller.bank_ifsc || "";
  fields.bankName.value = seller.bank_name || "";
  fields.bankBranch.value = seller.bank_branch || "";
}

function parseRejectKeys() {
  try {
    const obj = JSON.parse(seller.reject_reason || "{}");
    return Object.keys(obj || {});
  } catch {
    const txt = String(seller.reject_reason || "").toLowerCase();
    const keys = [];
    if (txt.includes("store") && txt.includes("photo")) keys.push("store_photo");
    if (txt.includes("owner") && txt.includes("id")) keys.push("owner_id_doc");
    if (txt.includes("license")) keys.push("license_doc");
    if (txt.includes("address")) keys.push("address");
    if (txt.includes("pincode")) keys.push("pincode");
    if (txt.includes("category")) keys.push("category_id");
    if (txt.includes("owner name")) keys.push("owner_name");
    if (txt.includes("store name")) keys.push("store_name");
    if (txt.includes("bank holder")) keys.push("bank_holder");
    if (txt.includes("account")) keys.push("bank_account");
    if (txt.includes("ifsc")) keys.push("bank_ifsc");
    if (txt.includes("bank name")) keys.push("bank_name");
    if (txt.includes("branch")) keys.push("bank_branch");
    if (txt.includes("passbook") || txt.includes("cheque")) keys.push("bank_passbook");
    return keys;
  }
}

function lockAllExcept(keys) {
  const allow = new Set(keys);
  const rejected = new Set(keys);

  const getWrapper = (el) => {
    if (!el) return null;
    return el.closest(".input-wrapper") || el.closest("label.file-upload-box");
  };

  const setFieldState = (el, key) => {
    if (!el) return;
    const editable = allow.size === 0 ? true : allow.has(key);
    const wrap = getWrapper(el);
    if (wrap) {
      wrap.classList.toggle("field-rejected", rejected.has(key));
      wrap.classList.toggle("field-locked", !editable);
    }
    el.disabled = !editable;
  };

  setFieldState(fields.storeName, "store_name");
  setFieldState(fields.ownerName, "owner_name");
  setFieldState(fields.category, "category_id");
  setFieldState(fields.address, "address");
  setFieldState(fields.pincode, "pincode");
  setFieldState(fields.ownerId, "owner_id_doc");
  setFieldState(fields.license, "license_doc");
  setFieldState(fields.storePhoto, "store_photo");
  setFieldState(fields.bankHolder, "bank_holder");
  setFieldState(fields.bankAccount, "bank_account");
  setFieldState(fields.bankIfsc, "bank_ifsc");
  setFieldState(fields.bankName, "bank_name");
  setFieldState(fields.bankBranch, "bank_branch");
  setFieldState(fields.bankPassbook, "bank_passbook");

  lockNote.textContent = allow.size ? "Only rejected or required fields are editable." : "";
}

function validate() {
  const accountRegex = /^[0-9]{9,18}$/;
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

  if (!fields.phone.value || fields.phone.value.length < 10) return "Phone missing";
  if (!fields.storeName.disabled && !fields.storeName.value.trim()) return "Store name required";
  if (!fields.ownerName.disabled && !fields.ownerName.value.trim()) return "Owner name required";
  if (!fields.category.disabled && !fields.category.value) return "Select category";
  if (!fields.pincode.disabled) {
    if (!fields.pincode.value.trim()) return "Pincode required";
    if (!/^[0-9]{6}$/.test(fields.pincode.value.trim())) return "Enter valid 6-digit pincode";
  }
  if (!fields.address.disabled && !fields.address.value.trim()) return "Address required";
  if (!fields.ownerId.disabled && !fields.ownerId.files?.[0]) return "Owner ID required";
  if (!fields.license.disabled && !fields.license.files?.[0]) return "License required";
  if (!fields.storePhoto.disabled && !fields.storePhoto.files?.[0]) return "Store photo required";
  if (!fields.bankHolder.disabled && !fields.bankHolder.value.trim()) return "Account holder name required";
  if (!fields.bankAccount.disabled) {
    const account = fields.bankAccount.value.trim();
    if (!account) return "Account number required";
    if (!accountRegex.test(account)) return "Enter valid account number (9-18 digits)";
  }
  if (!fields.bankIfsc.disabled) {
    const ifsc = fields.bankIfsc.value.trim().toUpperCase();
    if (!ifsc) return "IFSC code required";
    if (!ifscRegex.test(ifsc)) return "Enter valid IFSC (e.g., HDFC0ABC123)";
  }
  if (!fields.bankName.disabled && !fields.bankName.value.trim()) return "Bank name required";
  if (!fields.bankPassbook.disabled && !fields.bankPassbook.files?.[0]) return "Bank passbook/cheque required";
  return null;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!seller || !seller.id) return;
  const err = validate();
  if (err) {
    await showPopup(err, { title: "Validation Error", type: "error" });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const fd = new FormData();
  fd.append("store_name", fields.storeName.value.trim());
  fd.append("owner_name", fields.ownerName.value.trim());
  fd.append("category_id", fields.category.value);
  fd.append("address", fields.address.value.trim());
  fd.append("pincode", fields.pincode.value.trim());
  fd.append("bank_holder", fields.bankHolder.value.trim());
  fd.append("bank_account", fields.bankAccount.value.trim());
  fd.append("bank_ifsc", fields.bankIfsc.value.trim().toUpperCase());
  fd.append("bank_name", fields.bankName.value.trim());
  fd.append("bank_branch", fields.bankBranch.value.trim());

  if (!fields.ownerId.disabled && fields.ownerId?.files?.[0]) fd.append("owner_id_doc", fields.ownerId.files[0]);
  if (!fields.license.disabled && fields.license?.files?.[0]) fd.append("license_doc", fields.license.files[0]);
  if (!fields.storePhoto.disabled && fields.storePhoto?.files?.[0]) fd.append("store_photo", fields.storePhoto.files[0]);
  if (!fields.bankPassbook.disabled && fields.bankPassbook?.files?.[0]) fd.append("bank_passbook", fields.bankPassbook.files[0]);

  try {
    const res = await fetch(`${API_BASE}/seller/resubmit/${seller.id}`, {
      method: "PUT",
      body: fd
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Resubmit failed");

    localStorage.removeItem("lbRejectedSeller");
    await showPopup("Resubmitted successfully. Please wait for verification.", { title: "Success", type: "success" });
    window.location.href = "/welcome/seller/seller-auth/seller-auth.html";
  } catch (err2) {
    await showPopup(err2.message || "Server error", { title: "Submission Failed", type: "error" });
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Resubmit for Approval";
  }
});

(async function init() {
  if (!seller || !seller.id) return;
  await loadCategories();
  prefill();

  wireFileLabel(fields.ownerId);
  wireFileLabel(fields.license);
  wireFileLabel(fields.storePhoto);
  wireFileLabel(fields.bankPassbook);

  // select category from seller.category text
  if (seller.category) {
    const opts = Array.from(fields.category.options);
    const match = opts.find(o => slugify(o.textContent) === slugify(seller.category));
    if (match) fields.category.value = match.value;
  }

  const requiredKeys = [];
  if (!String(seller.bank_holder || "").trim()) requiredKeys.push("bank_holder");
  if (!String(seller.bank_account || "").trim()) requiredKeys.push("bank_account");
  if (!String(seller.bank_ifsc || "").trim()) requiredKeys.push("bank_ifsc");
  if (!String(seller.bank_name || "").trim()) requiredKeys.push("bank_name");
  if (!String(seller.bank_passbook || "").trim()) requiredKeys.push("bank_passbook");

  const rejectedKeys = Array.from(new Set([...parseRejectKeys(), ...requiredKeys]));
  lockAllExcept(rejectedKeys);
})();
