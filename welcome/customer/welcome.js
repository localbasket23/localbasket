/******************************************************
 * LOCALBASKET â€” FULL ENGINE (V2 OPTIMIZED)
 ******************************************************/

const CONFIG = {
    API_BASE: "https://localbasket-backend.onrender.com/api",
    IMG_BASE: "https://localbasket-backend.onrender.com/uploads",
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
    categories: [],
    storeSearch: "",
    openNowOnly: false,
    storeSort: "relevance",
    viewMode: localStorage.getItem("lbStoreViewMode") || "comfortable",
    recentStores: safeParse(localStorage.getItem("lbRecentStores"), []),
    storeSearchTimer: null,
    storeProductsCache: {},
    topRatedStores: [],
    topProducts: [],
    topPicks: safeParse(localStorage.getItem("lbTopPicks"), [])
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
    storeSearchInput: () => getEl("storeSearchInput"),
    openNowOnlyToggle: () => getEl("openNowOnlyToggle"),
    storeSortSelect: () => getEl("storeSortSelect"),
    heroPinInput: () => getEl("pinInput"),
    locModal: () => getEl("locationModal"),
    modalPinInput: () => getEl("modalPinInput"),
    mapFrame: () => getEl("mapFrame"),
    locAccuracyText: () => getEl("locAccuracyText"),
    improveLocBtn: () => getEl("improveLocBtn"),
    recentStoresSection: () => getEl("recentStoresSection"),
    recentStoresGrid: () => getEl("recentStoresGrid"),
    clearRecentBtn: () => getEl("clearRecentBtn"),
    discoveryZone: () => getEl("discoveryZone"),
    topRatedSection: () => getEl("topRatedSection"),
    topRatedGrid: () => getEl("topRatedGrid"),
    topProductsSection: () => getEl("topProductsSection"),
    topProductsRow: () => getEl("topProductsRow"),
    heroAvgValue: () => getEl("heroAvgValue"),
    heroAvgLabel: () => getEl("heroAvgLabel"),
    heroAvgMeta: () => getEl("heroAvgMeta"),
    heroOnlineValue: () => getEl("heroOnlineValue"),
    heroOnlineLabel: () => getEl("heroOnlineLabel"),
    heroOnlineMeta: () => getEl("heroOnlineMeta"),
    heroStoreValue: () => getEl("heroStoreValue"),
    heroStoreLabel: () => getEl("heroStoreLabel"),
    heroStoreMeta: () => getEl("heroStoreMeta"),
    storeResultsCount: () => getEl("storeResultsCount"),
    storeResultsHint: () => getEl("storeResultsHint"),
    activeFilters: () => getEl("activeFilters"),
    viewToggle: () => getEl("viewToggle"),
    backToTopBtn: () => getEl("backToTopBtn")
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
    applyViewMode(state.viewMode);
    updateHeroInsights();
    updateStoreMeta(0, "Enter your pincode to start browsing");
    hydrateLocationStatus();
    renderRecentStores();
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
    const improveBtn = dom.improveLocBtn();
    if (improveBtn) {
        improveBtn.addEventListener("click", () => getLocation(true));
    }
    const storeSearchInput = dom.storeSearchInput();
    if (storeSearchInput) {
        // Prevent browser/account autofill (often injects saved phone numbers here).
        storeSearchInput.setAttribute("autocomplete", "off");
        storeSearchInput.setAttribute("autocorrect", "off");
        storeSearchInput.setAttribute("autocapitalize", "none");
        storeSearchInput.setAttribute("spellcheck", "false");
        storeSearchInput.setAttribute("readonly", "readonly");
        storeSearchInput.name = `store_query_${Date.now()}`;
        storeSearchInput.value = "";
        storeSearchInput.defaultValue = "";
        state.storeSearch = "";
        updateStoreMeta(0, "Use search and filters to quickly find your store");

        // Some browsers inject autofill after initial paint, clear again.
        setTimeout(() => {
            if (!storeSearchInput) return;
            storeSearchInput.value = "";
            state.storeSearch = "";
            renderActiveFilterChips();
        }, 120);

        storeSearchInput.addEventListener("focus", () => {
            storeSearchInput.removeAttribute("readonly");
            if (storeSearchInput.value) {
                storeSearchInput.value = "";
                state.storeSearch = "";
                applyCategoryFilter();
            }
        });

        storeSearchInput.addEventListener("input", () => {
            state.storeSearch = (storeSearchInput.value || "").trim().toLowerCase();
            if (state.storeSearchTimer) clearTimeout(state.storeSearchTimer);
            state.storeSearchTimer = setTimeout(() => applyCategoryFilter(), 150);
        });
    }
    window.addEventListener("pageshow", () => {
        const input = dom.storeSearchInput();
        if (!input) return;
        input.value = "";
        state.storeSearch = "";
        renderActiveFilterChips();
    });
    const openNowOnlyToggle = dom.openNowOnlyToggle();
    if (openNowOnlyToggle) {
        openNowOnlyToggle.addEventListener("change", () => {
            state.openNowOnly = !!openNowOnlyToggle.checked;
            applyCategoryFilter();
        });
    }
    const storeSortSelect = dom.storeSortSelect();
    if (storeSortSelect) {
        storeSortSelect.addEventListener("change", () => {
            state.storeSort = storeSortSelect.value || "relevance";
            applyCategoryFilter();
        });
    }
    const clearRecentBtn = dom.clearRecentBtn();
    if (clearRecentBtn) {
        clearRecentBtn.addEventListener("click", () => {
            state.recentStores = [];
            localStorage.setItem("lbRecentStores", JSON.stringify([]));
            renderRecentStores();
        });
    }
    const filtersWrap = dom.activeFilters();
    if (filtersWrap) {
        filtersWrap.addEventListener("click", (e) => {
            const chip = e.target.closest(".filter-chip");
            if (!chip) return;
            const kind = chip.getAttribute("data-filter");
            if (kind === "search") {
                state.storeSearch = "";
                const input = dom.storeSearchInput();
                if (input) input.value = "";
            } else if (kind === "open") {
                state.openNowOnly = false;
                const toggle = dom.openNowOnlyToggle();
                if (toggle) toggle.checked = false;
            } else if (kind === "category") {
                state.activeCategory = "all";
            } else if (kind === "sort") {
                state.storeSort = "relevance";
                const sel = dom.storeSortSelect();
                if (sel) sel.value = "relevance";
            } else if (kind === "clear-all") {
                state.storeSearch = "";
                state.openNowOnly = false;
                state.activeCategory = "all";
                state.storeSort = "relevance";
                const input = dom.storeSearchInput();
                const toggle = dom.openNowOnlyToggle();
                const sel = dom.storeSortSelect();
                if (input) input.value = "";
                if (toggle) toggle.checked = false;
                if (sel) sel.value = "relevance";
            }
            setActiveCategory(state.activeCategory);
        });
    }
    const viewToggle = dom.viewToggle();
    if (viewToggle) {
        viewToggle.addEventListener("click", (e) => {
            const btn = e.target.closest(".view-btn");
            if (!btn) return;
            applyViewMode(btn.getAttribute("data-view"));
        });
    }
    const backBtn = dom.backToTopBtn();
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
        const onScroll = () => {
            backBtn.classList.toggle("show", window.scrollY > 420);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

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

function setLocationStatus(message, tone = "info") {
    const el = dom.locAccuracyText();
    if (!el) return;
    el.innerText = message || "";
    el.setAttribute("data-tone", tone);
}

function hydrateLocationStatus() {
    const acc = Number(localStorage.getItem("lbLocAccM") || 0);
    const at = localStorage.getItem("lbLocUpdatedAt");
    if (!acc || !Number.isFinite(acc)) return;
    const timeText = at ? new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const suffix = timeText ? ` at ${timeText}` : "";
    const tone = acc <= 100 ? "success" : (acc <= 220 ? "warn" : "error");
    setLocationStatus(`Last accuracy: ~${Math.round(acc)}m${suffix}`, tone);
}

function getGeoPosition(options) {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
}

async function getBestGeoPosition(samples, options) {
    let best = null;
    const total = Math.max(1, Number(samples || 1));
    for (let i = 0; i < total; i += 1) {
        try {
            const pos = await getGeoPosition(options);
            const acc = Number(pos?.coords?.accuracy || Number.POSITIVE_INFINITY);
            const bestAcc = Number(best?.coords?.accuracy || Number.POSITIVE_INFINITY);
            if (!best || acc < bestAcc) best = pos;
        } catch {}
    }
    if (!best) throw new Error("No geolocation sample found");
    return best;
}

async function applyDetectedLocation(pos, { fallback = false } = {}) {
    const lat = Number(pos?.coords?.latitude || 0);
    const lon = Number(pos?.coords?.longitude || 0);
    const accuracy = Number(pos?.coords?.accuracy || 0);
    if (!lat || !lon) throw new Error("Invalid location coordinates");

    const map = dom.mapFrame();
    if (map) {
        const d = 0.02;
        const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
        map.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
    }

    const roundedAcc = Number.isFinite(accuracy) && accuracy > 0 ? Math.round(accuracy) : null;
    const accText = roundedAcc ? `~${roundedAcc}m` : "N/A";
    setLocationStatus(`Location locked (${accText} accuracy).`, fallback ? "warn" : "success");

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
            if (roundedAcc) localStorage.setItem("lbLocAccM", String(roundedAcc));
            localStorage.setItem("lbLocUpdatedAt", new Date().toISOString());
            updateLocationUI();
            if (dom.locModal()) dom.locModal().style.display = "none";
            loadStores(data.pincode, true);
            return;
        }
    } catch {}

    state.location.address = "Current Location";
    localStorage.setItem("lbAddr", "Current Location");
    if (roundedAcc) localStorage.setItem("lbLocAccM", String(roundedAcc));
    localStorage.setItem("lbLocUpdatedAt", new Date().toISOString());
    updateLocationUI();
    if (dom.locModal()) dom.locModal().style.display = "none";
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
    setLocationStatus(`Manual pin set: ${raw}`, "info");
    if (dom.locModal()) dom.locModal().style.display = 'none';
    loadStores(raw, true);
}

async function getLocation(forceHighAccuracy = false) {
    if (!navigator.geolocation) {
        alert("Geolocation not supported on this browser");
        setLocationStatus("Geolocation not supported on this browser.", "error");
        return;
    }
    try {
        setLocationStatus("Detecting location with high accuracy...", "info");
        let pos = await getBestGeoPosition(forceHighAccuracy ? 3 : 2, {
            enableHighAccuracy: true,
            timeout: forceHighAccuracy ? 18000 : 12000,
            maximumAge: 0
        });

        const acc = Number(pos?.coords?.accuracy || 0);
        if (!forceHighAccuracy && acc > 180) {
            setLocationStatus(`Weak GPS signal (~${Math.round(acc)}m). Retrying...`, "warn");
            try {
                pos = await getBestGeoPosition(2, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
            } catch {}
        }

        const finalAcc = Number(pos?.coords?.accuracy || 0);
        if (finalAcc > 350) {
            setLocationStatus(`Low accuracy (~${Math.round(finalAcc)}m). Move to open area or use pincode.`, "error");
            alert("GPS accuracy is low. Please try 'Improve Accuracy' or enter pincode.");
            return;
        }

        await applyDetectedLocation(pos);
    } catch {
        try {
            setLocationStatus("High accuracy failed. Trying fallback location...", "warn");
            const fallbackPos = await getGeoPosition({
                enableHighAccuracy: false,
                timeout: 9000,
                maximumAge: 0
            });
            const fallbackAcc = Number(fallbackPos?.coords?.accuracy || 0);
            if (fallbackAcc > 500) {
                setLocationStatus(`Fallback location too broad (~${Math.round(fallbackAcc)}m). Enter pincode manually.`, "error");
                alert("Couldn't get precise location. Please enter pincode.");
                return;
            }
            await applyDetectedLocation(fallbackPos, { fallback: true });
        } catch {
            setLocationStatus("Unable to detect location. Enter pincode manually.", "error");
            alert("Unable to access location");
        }
    }
}

async function loadStores(query, isPin = true) {
    const grid = dom.storeGrid();
    if (!grid) return;

    if (!isPin || !/^[0-9]{6}$/.test(String(query || ""))) {
        showPincodeRequired();
        return;
    }

    grid.innerHTML = `<div class="loader">Searching stores in ${query}...</div>`;
    updateStoreMeta(0, `Searching stores in ${query}...`);

    try {
        const url = isPin
            ? `${CONFIG.API_BASE}/stores?pincode=${encodeURIComponent(query)}`
            : `${CONFIG.API_BASE}/stores?area=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        const stores = Array.isArray(data.stores) ? data.stores : (Array.isArray(data) ? data : []);

        if (stores.length > 0) {
            state.stores = stores;
            updateHeroInsights();
            renderCategories();
            applyCategoryFilter();
            renderTopRatedStores();
            renderTopProductsLoading();
            refreshTopProducts().catch(() => renderTopProducts([]));
        } else {
            state.stores = [];
            updateHeroInsights();
            renderCategories();
            grid.innerHTML = `<div class="empty-state">No stores found in ${query}</div>`;
            updateStoreMeta(0, `No stores found in ${query}`);
            renderTopRatedStores([]);
            renderTopProducts([]);
        }
    } catch (err) {
        state.stores = [];
        updateHeroInsights();
        renderCategories();
        grid.innerHTML = `<div class="error">Server Connection Failed</div>`;
        updateStoreMeta(0, "Server connection failed. Please try again.");
        renderTopRatedStores([]);
        renderTopProducts([]);
    }
}

function showPincodeRequired() {
    const grid = dom.storeGrid();
    if (!grid) return;
    grid.innerHTML = `<div class="empty-state">Enter a valid 6-digit pincode to view stores.</div>`;
    updateHeroInsights();
    updateStoreMeta(0, "Enter a valid 6-digit pincode to view stores.");
}

function renderStores(stores) {
    const grid = dom.storeGrid();
    grid.innerHTML = stores.map(store => `
        <div class="store-card" onclick="openStore(${store.id})">
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

function getStoreRatingValue(store) {
    return Number(store?.avg_rating || store?.rating || 0);
}

function getStoreRatingCount(store) {
    return Number(store?.rating_count || store?.reviews_count || 0);
}

function getTopPickKey(item) {
    const fallback = `${Number(item?.store_id || 0)}-${String(item?.name || "product").toLowerCase()}`;
    const raw = item?.id ?? fallback;
    return String(raw).replace(/[^\w-]/g, "_");
}

function isTopPickSaved(key) {
    const needle = String(key || "");
    return Array.isArray(state.topPicks) && state.topPicks.includes(needle);
}

function saveTopPicks() {
    localStorage.setItem("lbTopPicks", JSON.stringify(state.topPicks || []));
}

function toggleTopPick(event, key) {
    if (event) event.stopPropagation();
    const id = String(key || "");
    if (!id) return;
    const picks = Array.isArray(state.topPicks) ? [...state.topPicks] : [];
    const idx = picks.indexOf(id);
    if (idx >= 0) {
        picks.splice(idx, 1);
    } else {
        picks.unshift(id);
    }
    state.topPicks = picks.slice(0, 30);
    saveTopPicks();

    document.querySelectorAll(`.tp-save[data-pick-key="${id}"]`).forEach((btn) => {
        const saved = state.topPicks.includes(id);
        btn.classList.toggle("saved", saved);
        btn.setAttribute("aria-pressed", saved ? "true" : "false");
        btn.innerHTML = saved ? "Saved" : "Save";
    });
}

function renderTopRatedStores(customList = null) {
    const section = dom.topRatedSection();
    const grid = dom.topRatedGrid();
    if (!section || !grid) return;

    const list = Array.isArray(customList) ? customList : [...(state.stores || [])]
        .sort((a, b) => {
            const dr = getStoreRatingValue(b) - getStoreRatingValue(a);
            if (dr) return dr;
            const dc = getStoreRatingCount(b) - getStoreRatingCount(a);
            if (dc) return dc;
            return Number(b.is_online || 0) - Number(a.is_online || 0);
        })
        .slice(0, 6);

    state.topRatedStores = list;
    if (!list.length) {
        section.style.display = "none";
        grid.innerHTML = "";
        updateDiscoveryZoneVisibility();
        return;
    }
    section.style.display = "";
    grid.innerHTML = list.map((s, idx) => {
        const rating = getStoreRatingValue(s);
        const count = getStoreRatingCount(s);
        const openNow = Number(s.is_online || 0) === 1;
        return `
          <div class="top-rated-item" onclick="openStore(${s.id})">
            <div class="r-rank">#${idx + 1}</div>
            <div class="r-head">
              <div class="r-name">${s.store_name || "Store"}</div>
              <span class="r-open ${openNow ? "open" : "closed"}">${openNow ? "Open" : "Closed"}</span>
            </div>
            <div class="r-score">&#9733; ${rating > 0 ? rating.toFixed(1) : "New"} ${count ? `(${count})` : ""}</div>
            <div class="r-meta">${s.business_type || s.category_name || s.category || "General Store"}</div>
            <div class="r-meta">Pin: ${s.pincode || "-"}</div>
            <button class="r-cta" type="button" onclick="event.stopPropagation();openStore(${s.id})">View Store</button>
          </div>
        `;
    }).join("");
    updateDiscoveryZoneVisibility();
}

function renderTopProductsLoading() {
    const section = dom.topProductsSection();
    const row = dom.topProductsRow();
    if (!section || !row) return;
    section.style.display = "";
    row.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Finding top products near you...</div>`;
    updateDiscoveryZoneVisibility();
}

function renderTopProducts(list = null) {
    const section = dom.topProductsSection();
    const row = dom.topProductsRow();
    if (!section || !row) return;
    const items = Array.isArray(list) ? list : (state.topProducts || []);
    if (!items.length) {
        section.style.display = "none";
        row.innerHTML = "";
        updateDiscoveryZoneVisibility();
        return;
    }
    section.style.display = "";
    row.innerHTML = items.map((item) => {
        const pickKey = getTopPickKey(item);
        const saved = isTopPickSaved(pickKey);
        return `
      <div class="tp-card" onclick="openStore(${item.store_id})">
        <button class="tp-save ${saved ? "saved" : ""}" type="button" data-pick-key="${pickKey}" aria-pressed="${saved ? "true" : "false"}" onclick="toggleTopPick(event, '${pickKey}')">${saved ? "Saved" : "Save"}</button>
        <div class="tp-img">
          <img src="${item.image ? `${CONFIG.IMG_BASE}/${item.image}` : CONFIG.DEFAULT_IMG}" onerror="this.src='${CONFIG.DEFAULT_IMG}'" alt="${item.name}">
        </div>
        <div class="tp-body">
          <div class="tp-name">${item.name || "Product"}</div>
          <div class="tp-store">${item.store_name || "Store"}</div>
          <div class="tp-row">
            <div class="tp-price">Rs. ${Number(item.price || 0)}</div>
            <span class="tp-chip">${item.avg_rating > 0 ? `&#9733; ${Number(item.avg_rating).toFixed(1)}` : "New"}</span>
          </div>
          <button class="tp-cta" type="button" onclick="event.stopPropagation();openStore(${item.store_id})">Visit Store</button>
        </div>
      </div>
    `;
    }).join("");
    updateDiscoveryZoneVisibility();
}

function updateDiscoveryZoneVisibility() {
    const zone = dom.discoveryZone();
    const rated = dom.topRatedSection();
    const products = dom.topProductsSection();
    if (!zone || !rated || !products) return;
    const anyVisible = rated.style.display !== "none" || products.style.display !== "none";
    zone.style.display = anyVisible ? "grid" : "none";
}

async function fetchProductsForStoreCached(storeId) {
    const sid = Number(storeId || 0);
    if (!sid) return [];
    if (Array.isArray(state.storeProductsCache[sid])) return state.storeProductsCache[sid];
    try {
        const res = await fetch(`${CONFIG.API_BASE}/products?storeId=${encodeURIComponent(sid)}`);
        const data = await res.json();
        const products = Array.isArray(data?.products) ? data.products : [];
        state.storeProductsCache[sid] = products;
        return products;
    } catch {
        state.storeProductsCache[sid] = [];
        return [];
    }
}

async function refreshTopProducts() {
    const stores = Array.isArray(state.stores) ? [...state.stores] : [];
    if (!stores.length) {
        state.topProducts = [];
        renderTopProducts([]);
        return;
    }

    const candidateStores = stores
        .sort((a, b) => {
            const r = getStoreRatingValue(b) - getStoreRatingValue(a);
            if (r) return r;
            return Number(b.is_online || 0) - Number(a.is_online || 0);
        })
        .slice(0, 8);

    const productLists = await Promise.all(candidateStores.map((s) => fetchProductsForStoreCached(s.id)));
    const flattened = [];
    candidateStores.forEach((store, idx) => {
        const list = Array.isArray(productLists[idx]) ? productLists[idx] : [];
        list.forEach((p) => {
            const price = Number(p.price || 0);
            const mrp = Number(p.mrp || 0);
            const avg = Number(p.avg_rating || 0);
            const count = Number(p.rating_count || 0);
            const stock = Number(p.stock || 0);
            const discount = mrp > price && mrp > 0 ? ((mrp - price) / mrp) * 100 : 0;
            const score = (count * 2.2) + (avg * 7) + (discount * 0.35) + (stock > 0 ? 4 : -8);
            flattened.push({
                ...p,
                store_id: store.id,
                store_name: store.store_name,
                score
            });
        });
    });

    const ranked = flattened
        .filter((p) => Number(p.stock || 0) > 0)
        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
        .slice(0, 10);

    state.topProducts = ranked;
    renderTopProducts(ranked);
}

function openStore(storeId) {
    const store = state.stores.find(s => Number(s.id) === Number(storeId));
    if (store) rememberRecentStore(store);
    window.location.href = `${welcomePath("customer/store/store.html")}?id=${storeId}`;
}

function rememberRecentStore(store) {
    const id = Number(store?.id || 0);
    if (!id) return;
    const snapshot = {
        id,
        store_name: store.store_name || "Store",
        store_photo: store.store_photo || "",
        business_type: store.business_type || store.category_name || store.category || "General Store",
        pincode: store.pincode || "",
        is_online: Number(store.is_online) ? 1 : 0,
        rating: Number(getStoreRating(store)?.value || 0),
        rating_count: Number(getStoreRating(store)?.count || 0)
    };
    const old = Array.isArray(state.recentStores) ? state.recentStores : [];
    const next = [snapshot, ...old.filter(s => Number(s?.id) !== id)].slice(0, 8);
    state.recentStores = next;
    localStorage.setItem("lbRecentStores", JSON.stringify(next));
    renderRecentStores();
}

function renderRecentStores() {
    const section = dom.recentStoresSection();
    const grid = dom.recentStoresGrid();
    if (!section || !grid) return;
    const list = Array.isArray(state.recentStores) ? state.recentStores : [];
    if (!list.length) {
        section.style.display = "none";
        grid.innerHTML = "";
        return;
    }
    section.style.display = "";
    grid.innerHTML = list.map(store => `
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
                <div class="store-cat">${store.business_type || "General Store"}</div>
                <div class="meta-row">
                    <span class="meta-pill">Pin: ${store.pincode || "-"}</span>
                    ${store.rating > 0 ? `<span class="meta-pill">Rating: ${store.rating.toFixed(1)}</span>` : `<span class="meta-pill">Rating: New</span>`}
                </div>
            </div>
        </div>
    `).join("");
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
    let stars = "â˜…â˜…â˜…â˜…â˜…".split("").map((s, i) => {
        if (i < full) return "â˜…";
        if (i === full && hasHalf) return "â˜…";
        return "â˜†";
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
    if (!state.stores.length) {
        renderActiveFilterChips();
        updateStoreMeta(0);
        return;
    }
    let filtered = [...state.stores];
    if (state.activeCategory !== "all") {
        filtered = filtered.filter(s => mapStoreCategory(s) === state.activeCategory);
    }
    if (state.openNowOnly) {
        filtered = filtered.filter(s => Number(s.is_online) === 1);
    }
    if (state.storeSearch) {
        filtered = filtered.filter(s => {
            const hay = `${s.store_name || ""} ${s.business_type || ""} ${s.category_name || ""} ${s.category || ""}`.toLowerCase();
            return hay.includes(state.storeSearch);
        });
    }
    if (state.storeSort === "name") {
        filtered.sort((a, b) => String(a.store_name || "").localeCompare(String(b.store_name || "")));
    } else if (state.storeSort === "rating") {
        filtered.sort((a, b) => Number(getStoreRating(b)?.value || 0) - Number(getStoreRating(a)?.value || 0));
    } else {
        filtered.sort((a, b) => Number(b.is_online || 0) - Number(a.is_online || 0));
    }
    if (filtered.length === 0) {
        dom.storeGrid().innerHTML = `<div class="empty-state">No stores found for selected filters.</div>`;
        updateStoreMeta(0, "No stores match current filters.");
        return;
    }
    renderStores(filtered);
    updateStoreMeta(filtered.length);
}

function applyViewMode(mode = "comfortable") {
    const next = mode === "compact" ? "compact" : "comfortable";
    state.viewMode = next;
    localStorage.setItem("lbStoreViewMode", next);
    const grid = dom.storeGrid();
    if (grid) {
        grid.classList.toggle("compact", next === "compact");
    }
    document.querySelectorAll("#viewToggle .view-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-view") === next);
    });
}

function renderActiveFilterChips() {
    const box = dom.activeFilters();
    if (!box) return;
    const clean = (v) => String(v || "").replace(/[&<>"']/g, "");
    const chips = [];
    if (state.storeSearch) {
        chips.push(`<button class="filter-chip" type="button" data-filter="search">Search: ${clean(state.storeSearch)}<span class="x">x</span></button>`);
    }
    if (state.activeCategory !== "all") {
        const activeBtn = document.querySelector(`#categoryBar .cat-btn[data-category="${state.activeCategory}"]`);
        const label = (activeBtn?.textContent || state.activeCategory || "Category").trim();
        chips.push(`<button class="filter-chip" type="button" data-filter="category">Category: ${label}<span class="x">x</span></button>`);
    }
    if (state.openNowOnly) {
        chips.push(`<button class="filter-chip" type="button" data-filter="open">Open now<span class="x">x</span></button>`);
    }
    if (state.storeSort && state.storeSort !== "relevance") {
        const label = state.storeSort === "rating" ? "Rating" : "Name A-Z";
        chips.push(`<button class="filter-chip" type="button" data-filter="sort">Sort: ${label}<span class="x">x</span></button>`);
    }
    if (chips.length > 1) {
        chips.push(`<button class="filter-chip clear-all" type="button" data-filter="clear-all">Clear all</button>`);
    }
    box.innerHTML = chips.join("");
}

function updateStoreMeta(filteredCount = 0, forcedHint = "") {
    const total = Array.isArray(state.stores) ? state.stores.length : 0;
    const countEl = dom.storeResultsCount();
    const hintEl = dom.storeResultsHint();
    if (countEl) {
        countEl.innerText = total > 0
            ? `${filteredCount} of ${total} stores`
            : `${filteredCount} stores`;
    }
    if (hintEl) {
        let hint = forcedHint;
        if (!hint) {
            if (!state.location.pincode) {
                hint = "Set your pincode to discover nearby stores";
            } else if (total === 0) {
                hint = "No stores available for this pincode yet";
            } else if (filteredCount === 0) {
                hint = "Try clearing a filter to see more stores";
            } else if (state.openNowOnly) {
                hint = "Showing stores currently open";
            } else {
                hint = "Use search and filters to quickly find your store";
            }
        }
        hintEl.innerText = hint;
    }
    renderActiveFilterChips();
}

function updateHeroInsights() {
    const stores = Array.isArray(state.stores) ? state.stores : [];
    const total = stores.length;
    const ratedValues = stores
        .map((s) => Number(getStoreRating(s)?.value || 0))
        .filter((v) => Number.isFinite(v) && v > 0);
    const ratedCount = ratedValues.length;
    const avgRating = ratedCount
        ? (ratedValues.reduce((sum, n) => sum + n, 0) / ratedCount)
        : 0;
    const onlineCount = stores.filter((s) => Number(s?.is_online) === 1).length;

    const avgValueEl = dom.heroAvgValue();
    const avgLabelEl = dom.heroAvgLabel();
    const avgMetaEl = dom.heroAvgMeta();
    if (avgValueEl) avgValueEl.innerText = ratedCount ? avgRating.toFixed(1) : "--";
    if (avgLabelEl) avgLabelEl.innerText = "Avg Rating";
    if (avgMetaEl) avgMetaEl.innerText = ratedCount ? `${ratedCount} rated` : "No ratings yet";

    const onlineValueEl = dom.heroOnlineValue();
    const onlineLabelEl = dom.heroOnlineLabel();
    const onlineMetaEl = dom.heroOnlineMeta();
    if (onlineValueEl) onlineValueEl.innerText = total ? String(onlineCount) : "--";
    if (onlineLabelEl) onlineLabelEl.innerText = "Sellers Online";
    if (onlineMetaEl) {
        onlineMetaEl.innerText = total
            ? `${Math.round((onlineCount / total) * 100)}% available now`
            : "Set pincode first";
    }

    const storeValueEl = dom.heroStoreValue();
    const storeLabelEl = dom.heroStoreLabel();
    const storeMetaEl = dom.heroStoreMeta();
    if (storeValueEl) storeValueEl.innerText = total ? String(total) : "--";
    if (storeLabelEl) storeLabelEl.innerText = "Stores Found";
    if (storeMetaEl) {
        storeMetaEl.innerText = state.location.pincode
            ? `Pin ${state.location.pincode}`
            : "Nearby";
    }
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
    searchByPincode, toggleCart, getLocation, openStore, toggleTopPick,
    openCategoryPage: () => window.location.href = welcomePath("customer/category.html"),
    viewProfile: () => window.location.href = welcomePath("customer/profile/profile.html"),
    viewOrders: () => window.location.href = welcomePath("customer/order/customer-orders.html")
});

