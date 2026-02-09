/******************************************************
 * LOCALBASKET — FULL ENGINE (V2 OPTIMIZED)
 ******************************************************/

const CONFIG = {
    API_BASE: "http://localhost:5000/api",
    IMG_BASE: "http://localhost:5000/uploads",
    DEFAULT_IMG: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
};

const WELCOME_BASE = (() => {
    const path = String(window.location.pathname || "").replace(/\\/g, "/");
    return path.includes("/frontend/") ? "/frontend" : "";
})();

const welcomePath = (suffix) => `${WELCOME_BASE}/welcome/${String(suffix || "").replace(/^\/+/, "")}`;

/* ============ SAFE STORAGE PARSE ============ */
const safeParse = (value, fallback = null) => {
    if (value == null || value === "undefined") return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

/* ============ CART KEY (PER USER) ============ */
const getCartKey = () => {
    const u = safeParse(localStorage.getItem("lbUser"), null);
    const id = u && u.id ? u.id : "guest";
    return `lbCart_${id}`;
};

const loadCart = () => {
    const key = getCartKey();
    let cart = safeParse(localStorage.getItem(key), []);
    if (!cart.length) {
        const legacy = safeParse(localStorage.getItem("lbCart"), []);
        if (legacy.length) {
            localStorage.setItem(key, JSON.stringify(legacy));
            localStorage.removeItem("lbCart");
            cart = legacy;
        }
    }
    return cart;
};

const saveCart = (cart) => {
    localStorage.setItem(getCartKey(), JSON.stringify(cart));
};

/* ============ 1. STATE MANAGEMENT ============ */
const state = {
    user: safeParse(localStorage.getItem("lbUser"), null),
    cart: loadCart(),
    location: {
        address: localStorage.getItem("lbAddr") || "Select Location",
        pincode: localStorage.getItem("lbPin") || null
    },
    authMode: "login",
    token: localStorage.getItem("lbToken") || null,
    stores: [],
    activeCategory: "all",
    categories: []
};

/* ============ 2. DOM SELECTORS ============ */
const getEl = (id) => document.getElementById(id);

// Centralized DOM access to prevent "null" errors
const dom = {
    locText: () => getEl("locText"),
    cartCount: () => getEl("cartCount"),
    loginBtn: () => getEl("loginBtn"),
    userAccount: () => getEl("userAccount"),
    userInitials: () => getEl("userInitials"),
    userFullName: () => getEl("userFullName"),
    userMenu: () => getEl("userMenu"),
    accountBtn: () => getEl("accountBtn"),
    authOverlay: () => getEl("authOverlay"),
    registerFields: () => getEl("registerFields"),
    authPhone: () => getEl("authPhone"),
    authPassword: () => getEl("authPassword"),
    cartDrawer: () => getEl("cartDrawer"),
    cartOverlay: () => getEl("cartOverlay"),
    cartItems: () => getEl("cartItems"),
    storeGrid: () => getEl("storeGrid"),
    heroPinInput: () => getEl("pinInput"),
    locModal: () => getEl("locationModal"),
    modalPinInput: () => getEl("modalPinInput"),
    mapFrame: () => getEl("mapFrame")
};

/* ============ 3. INITIALIZATION ============ */
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    updateAuthUI();
    updateCartUI();
    updateLocationUI();
    loadCategories();

    if (dom.storeGrid()) {
        if (state.location.pincode) {
            loadStores(state.location.pincode, true);
        } else {
            showPincodeRequired();
        }
    }
}

function setupEventListeners() {
    // 1. User Menu Toggle
    const accBtn = dom.accountBtn();
    if (accBtn) {
        accBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const menu = dom.userMenu();
            if (state.user && menu) {
                const isVisible = menu.style.display === "flex";
                menu.style.display = isVisible ? "none" : "flex";
            } else {
                openAuth();
            }
        });
    }

    // 2. Global Click (Close Menus)
    window.addEventListener("click", (e) => {
        const menu = dom.userMenu();
        if (menu && !e.target.closest("#accountBtn") && !e.target.closest("#userMenu")) {
            menu.style.display = "none";
        }
        if (e.target === dom.cartOverlay()) toggleCart(false);
    });

    // 3. Pincode Input Logic
    [dom.heroPinInput(), dom.modalPinInput()].forEach(input => {
        input?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") searchByPincode();
        });
    });

    // 4. Category Filter Buttons (delegated)
    const bar = document.getElementById("categoryBar");
    if (bar) {
        bar.addEventListener("click", (e) => {
            const btn = e.target.closest(".cat-btn");
            if (!btn) return;
            if (btn.classList.contains("disabled")) return;
            const category = btn.getAttribute("data-category") || "all";
            setActiveCategory(category);
        });
    }
}

/* ============ CATEGORIES (FROM DB) ============ */
async function loadCategories() {
    const bar = document.getElementById("categoryBar");
    if (!bar) return;
    bar.innerHTML = `<button class="cat-btn" data-category="all">All</button>`;
    try {
        const res = await fetch(`${CONFIG.API_BASE}/admin/categories`);
        const data = await res.json();
        const cats = Array.isArray(data.categories) ? data.categories : [];
        state.categories = cats.filter(c => c && (c.is_active === 1 || c.is_active === true));
        renderCategories();
    } catch (e) {
        console.error("Category load failed", e);
    }
}

function renderCategories() {
    const bar = document.getElementById("categoryBar");
    if (!bar) return;
    const buttons = [
        `<button class="cat-btn" data-category="all">All</button>`
    ];
    state.categories.forEach(c => {
        const slug = c.slug || slugify(c.name || "category");
        const name = c.name || slug;
        const hasStores = state.stores.some(s => mapStoreCategory(s) === slug);
        buttons.push(
            `<button class="cat-btn ${hasStores ? "" : "disabled"}" data-category="${slug}" ${hasStores ? "" : "disabled"}>${name}</button>`
        );
    });
    bar.innerHTML = buttons.join("");
    if (state.activeCategory !== "all" && !state.stores.some(s => mapStoreCategory(s) === state.activeCategory)) {
        state.activeCategory = "all";
    }
    setActiveCategory(state.activeCategory || "all");
}

function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/* ============ 4. AUTH UI & LOGIC ============ */

function updateAuthUI() {
    const isLoggedIn = !!state.user;
    const loginBtn = dom.loginBtn();
    const accountDiv = dom.userAccount();

    if (loginBtn) loginBtn.style.display = isLoggedIn ? "none" : "flex";
    if (accountDiv) accountDiv.style.display = isLoggedIn ? "flex" : "none";

    if (isLoggedIn && state.user.name) {
        const names = state.user.name.trim().split(" ");
        const initials = names.length > 1 
            ? (names[0][0] + names[names.length - 1][0]).toUpperCase() 
            : names[0][0].toUpperCase();

        if (dom.userInitials()) dom.userInitials().innerText = initials;
        if (dom.userFullName()) dom.userFullName().innerText = `Hi, ${names[0]}`;
    }
}

function switchTab(mode) {
    state.authMode = mode;
    const tabs = document.querySelectorAll(".auth-tab-btn");
    const regFields = dom.registerFields();

    tabs.forEach(t => t.classList.remove("active"));
    
    if (mode === 'register') {
        tabs[1]?.classList.add("active");
        if (regFields) regFields.style.display = "block";
    } else {
        tabs[0]?.classList.add("active");
        if (regFields) regFields.style.display = "none";
    }
}

function openAuth() {
    const overlay = dom.authOverlay();
    if (!overlay) return;
    switchTab("login");
    overlay.style.display = "flex";
}

async function submitAuth() {
    const phone = dom.authPhone()?.value.trim();
    const password = dom.authPassword()?.value.trim();

    if (!phone || !password) return alert("Enter credentials");

    const endpoint = state.authMode === "login" ? "/customer/login" : "/customer/register";
    
    const payload = state.authMode === "login" 
        ? { identifier: phone, password } 
        : { 
            name: getEl("regName")?.value.trim(),
            phone,
            email: getEl("regEmail")?.value.trim(),
            password 
          };

    try {
        const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || "Auth failed");
        }

        // Success
        state.user = data.user;
        state.token = data.token || null;
        localStorage.setItem("lbUser", JSON.stringify(data.user));
        if (state.token) localStorage.setItem("lbToken", state.token);

        state.cart = loadCart();
        
        if (dom.authOverlay()) dom.authOverlay().style.display = "none";
        updateAuthUI();
        updateCartUI();
        
        // Refresh local view
        if (state.location.pincode) loadStores(state.location.pincode);
        alert(`Welcome, ${data.user.name}!`);

    } catch (err) {
        console.error("Auth Error:", err);
        alert(`Error: ${err.message}`);
    }
}

function logoutUser() {
    localStorage.removeItem("lbUser");
    localStorage.removeItem("lbToken");
    state.user = null;
    state.cart = loadCart();
    state.token = null;
    
    updateAuthUI();
    updateCartUI();
    if (dom.userMenu()) dom.userMenu().style.display = "none";
    alert("Logged out successfully");
    window.location.reload(); // Hard reset to clear memory
}

/* ============ 5. LOCATION & STORE ENGINE ============ */

function updateLocationUI() {
    const locEl = dom.locText();
    if (locEl) locEl.innerText = state.location.address;
    const locMobile = document.getElementById("locTextMobile");
    if (locMobile) locMobile.innerText = state.location.address;
}

function searchByPincode() {
    const raw = (dom.modalPinInput()?.value || dom.heroPinInput()?.value || "").trim();
    if (!/^[0-9]{6}$/.test(raw)) {
        alert("Enter valid 6-digit pincode");
        return;
    }

    state.location.pincode = raw;
    state.location.address = `Pincode: ${raw}`;
    localStorage.setItem("lbPin", raw);
    localStorage.setItem("lbAddr", state.location.address);

    updateLocationUI();
    if (dom.locModal()) dom.locModal().style.display = 'none';
    loadStores(raw, true);
}

function getLocation() {
    if (!navigator.geolocation) {
        alert("Geolocation not supported on this browser");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            // Update map iframe
            const map = dom.mapFrame();
            if (map) {
                const d = 0.02;
                const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
                map.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
            }

            // Reverse geocode via backend (avoids CORS)
            try {
                const res = await fetch(`${CONFIG.API_BASE}/location/nearby-stores`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ latitude: lat, longitude: lon })
                });
                const data = await res.json();
                if (data.success && data.pincode) {
                    state.location.pincode = data.pincode;
                    state.location.address = data.area ? `Area: ${data.area}` : `Pincode: ${data.pincode}`;
                    localStorage.setItem("lbPin", data.pincode);
                    localStorage.setItem("lbAddr", state.location.address);
                    updateLocationUI();
                    if (dom.locModal()) dom.locModal().style.display = "none";
                    loadStores(data.pincode, true);
                    return;
                }
            } catch {}

            state.location.address = "Current Location";
            localStorage.setItem("lbAddr", "Current Location");
            updateLocationUI();
            if (dom.locModal()) dom.locModal().style.display = "none";
        },
        () => {
            alert("Unable to access location");
        }
    );
}

async function loadStores(query, isPin = true) {
    const grid = dom.storeGrid();
    if (!grid) return;

    if (!isPin || !/^[0-9]{6}$/.test(String(query || ""))) {
        showPincodeRequired();
        return;
    }

    grid.innerHTML = `<div class="loader">Searching stores in ${query}...</div>`;

    try {
        const url = isPin
            ? `${CONFIG.API_BASE}/stores?pincode=${encodeURIComponent(query)}`
            : `${CONFIG.API_BASE}/stores?area=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        const stores = Array.isArray(data.stores) ? data.stores : (Array.isArray(data) ? data : []);

        if (stores.length > 0) {
            state.stores = stores;
            renderCategories();
            applyCategoryFilter();
        } else {
            grid.innerHTML = `<div class="empty-state">No stores found in ${query}</div>`;
        }
    } catch (err) {
        grid.innerHTML = `<div class="error">Server Connection Failed</div>`;
    }
}

function showPincodeRequired() {
    const grid = dom.storeGrid();
    if (!grid) return;
    grid.innerHTML = `<div class="empty-state">Enter a valid 6-digit pincode to view stores.</div>`;
}

function renderStores(stores) {
    const grid = dom.storeGrid();
    grid.innerHTML = stores.map(store => `
        <div class="store-card" onclick="window.location.href='${welcomePath("customer/store/store.html")}?id=${store.id}'">
            <div class="store-img-wrap">
                <img class="store-img" src="${store.store_photo ? CONFIG.IMG_BASE+'/'+store.store_photo : CONFIG.DEFAULT_IMG}" 
                     alt="${store.store_name}" 
                     onerror="this.src='${CONFIG.DEFAULT_IMG}'">
                <span class="status-badge ${store.is_online ? 'online' : 'offline'}">
                    ${store.is_online ? 'OPEN' : 'CLOSED'}
                </span>
            </div>
            <div class="store-body">
                <h3>${store.store_name}</h3>
                <div class="store-cat">${store.business_type || store.category_name || store.category || 'General Store'}</div>
                <div class="meta-row">
                    <span class="meta-pill">Pin: ${store.pincode}</span>
                    ${renderRatingChip(store)}
                </div>
            </div>
        </div>
    `).join('');
}

function renderRatingChip(store) {
    const rating = getStoreRating(store);
    if (!rating || rating.label === "New") {
        return `<span class="meta-pill">Rating: New</span>`;
    }
    return `
        <span class="rating-chip" title="Based on customer reviews">
            <span class="rating-stars">${renderStars(rating.value)}</span>
            <span>${rating.value.toFixed(1)}</span>
            ${rating.count > 0 ? `<span class="rating-count">(${rating.count})</span>` : ""}
        </span>
    `;
}

function getStoreRating(store) {
    const candidates = [
        store?.rating,
        store?.avg_rating,
        store?.average_rating,
        store?.store_rating,
        store?.storeRating,
        store?.avgRating,
        store?.rating_avg,
        store?.ratingAverage
    ];
    const countCandidates = [
        store?.rating_count,
        store?.ratingCount,
        store?.reviews_count,
        store?.reviewCount
    ];

    let value = null;
    let count = Number(countCandidates.find(v => v !== null && v !== undefined && v !== "") || 0);

    for (const v of candidates) {
        if (v === null || v === undefined || v === "") continue;
        const n = Number(v);
        if (Number.isFinite(n)) {
            value = n;
            break;
        }
    }

    if (value === null) {
        const reviewList = Array.isArray(store?.reviews) ? store.reviews : (Array.isArray(store?.ratings) ? store.ratings : []);
        if (reviewList.length) {
            const nums = reviewList.map(r => Number(r?.rating ?? r?.stars ?? r?.score)).filter(n => Number.isFinite(n));
            if (nums.length) {
                const sum = nums.reduce((a, b) => a + b, 0);
                value = sum / nums.length;
                count = Math.max(count, nums.length);
            }
        }
    }

    if (value === null || !Number.isFinite(value) || value <= 0) {
        return { label: "New", value: 0, count: 0 };
    }

    const clamped = Math.max(0, Math.min(5, value));
    return { label: "Rated", value: clamped, count };
}

function renderStars(value) {
    const full = Math.floor(value);
    const hasHalf = value - full >= 0.5;
    let stars = "★★★★★".split("").map((s, i) => {
        if (i < full) return "★";
        if (i === full && hasHalf) return "★";
        return "☆";
    });
    return stars.join("");
}
/* ============ CATEGORY FILTERS ============ */
function setActiveCategory(category) {
    state.activeCategory = category || "all";
    document.querySelectorAll("#categoryBar .cat-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-category") === state.activeCategory);
    });
    applyCategoryFilter();
}

function applyCategoryFilter() {
    if (!state.stores.length) return;
    if (state.activeCategory === "all") {
        renderStores(state.stores);
        return;
    }
    const filtered = state.stores.filter(s => mapStoreCategory(s) === state.activeCategory);
    if (filtered.length === 0) {
        dom.storeGrid().innerHTML = `<div class="empty-state">No stores in this category</div>`;
        return;
    }
    renderStores(filtered);
}

function mapStoreCategory(store) {
    const raw = String(store.category_slug || store.category_name || store.category || store.business_type || "").toLowerCase();
    return slugify(raw || "grocery");
}

/* ============ 6. CART UI ============ */

function updateCartUI() {
    state.cart = loadCart();
    const countEl = dom.cartCount();
    const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
    if (countEl) countEl.innerText = `${count} Items`;
}

function toggleCart(show) {
    const drawer = dom.cartDrawer();
    const overlay = dom.cartOverlay();
    if (!drawer || !overlay) return;

    drawer.classList.toggle("active", show);
    overlay.style.display = show ? "block" : "none";
    if (show) {
        state.cart = loadCart();
        renderCartItems();
    }
}

function renderCartItems() {
    const box = dom.cartItems();
    if (!box) return;
    if (!state.cart.length) {
        box.innerHTML = `<div style="text-align:center;color:#64748b;">Your basket is empty.</div>`;
        return;
    }
    box.innerHTML = state.cart.map(i => `
        <div class="cart-row">
            <div>
                <strong>${i.name}</strong><br>
                <small>Rs. ${i.price}</small>
            </div>
            <div class="cart-qty">
                <button onclick="updateQty(${i.id}, -1)">-</button>
                <strong>${i.qty}</strong>
                <button onclick="updateQty(${i.id}, 1)">+</button>
            </div>
        </div>
    `).join("");
}

function updateQty(id, change) {
    let cart = loadCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += change;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart(cart);
    state.cart = cart;
    updateCartUI();
    renderCartItems();
}

/* ============ 7. GLOBAL EXPORTS ============ */
Object.assign(window, {
    switchTab, submitAuth, openAuth, logoutUser, 
    searchByPincode, toggleCart, getLocation,
    openCategoryPage: () => window.location.href = welcomePath("customer/category.html"),
    viewProfile: () => window.location.href = welcomePath("customer/profile/profile.html"),
    viewOrders: () => window.location.href = welcomePath("customer/order/customer-orders.html")
});

