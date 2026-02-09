const API_BASE = "http://localhost:5000/api";

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
  storePhoto: document.getElementById("storePhoto")
};

const seller = JSON.parse(localStorage.getItem("lbRejectedSeller") || "null");
if (!seller || !seller.id) {
  alert("No rejected seller data found. Please login again.");
  window.location.href = "/welcome/seller/seller-auth/seller-auth.html";
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

  lockNote.textContent = allow.size ? "Only rejected fields are editable." : "";
}

function validate() {
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
  return null;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = validate();
  if (err) return alert(err);

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const fd = new FormData();
  fd.append("store_name", fields.storeName.value.trim());
  fd.append("owner_name", fields.ownerName.value.trim());
  fd.append("category_id", fields.category.value);
  fd.append("address", fields.address.value.trim());
  fd.append("pincode", fields.pincode.value.trim());

  if (!fields.ownerId.disabled && fields.ownerId?.files?.[0]) fd.append("owner_id_doc", fields.ownerId.files[0]);
  if (!fields.license.disabled && fields.license?.files?.[0]) fd.append("license_doc", fields.license.files[0]);
  if (!fields.storePhoto.disabled && fields.storePhoto?.files?.[0]) fd.append("store_photo", fields.storePhoto.files[0]);

  try {
    const res = await fetch(`${API_BASE}/seller/resubmit/${seller.id}`, {
      method: "PUT",
      body: fd
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Resubmit failed");

    localStorage.removeItem("lbRejectedSeller");
    alert("Resubmitted successfully. Please wait for verification.");
    window.location.href = "/welcome/seller/seller-auth/seller-auth.html";
  } catch (err2) {
    alert(err2.message || "Server error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Resubmit for Approval";
  }
});

(async function init() {
  await loadCategories();
  prefill();

  wireFileLabel(fields.ownerId);
  wireFileLabel(fields.license);
  wireFileLabel(fields.storePhoto);

  // select category from seller.category text
  if (seller.category) {
    const opts = Array.from(fields.category.options);
    const match = opts.find(o => slugify(o.textContent) === slugify(seller.category));
    if (match) fields.category.value = match.value;
  }

  const rejectedKeys = parseRejectKeys();
  lockAllExcept(rejectedKeys);
})();
