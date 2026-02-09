/* ================= CONFIG ================= */
// Note: API_BASE Dashboard se match hona chahiye (http://localhost:5000/api)
const API_BASE = "http://localhost:5000/api"; 
const seller = JSON.parse(localStorage.getItem("lbSeller"));

if (!seller || !seller.id) {
    window.location.href = "seller-auth/seller-auth.html";
}

/* ================= CACHE DOM ================= */
const els = {
    activeList: document.getElementById("activeOrdersList"),
    historyList: document.getElementById("historyOrdersList"),
    activeEmpty: document.getElementById("activeEmpty"),
    historyEmpty: document.getElementById("historyEmpty"),
    countActive: document.getElementById("countActive"),
    countHistory: document.getElementById("countHistory"),
    themeToggle: document.getElementById("themeToggle"),
    sidebar: document.getElementById("sidebar"),
    menuBtn: document.getElementById("menuBtn"),
    overlay: document.getElementById("sidebarOverlay"),
    newOrderNotice: document.getElementById("newOrderNotice"),
    actionModal: document.getElementById("actionModal"),
    actionModalTitle: document.getElementById("actionModalTitle"),
    actionModalMessage: document.getElementById("actionModalMessage"),
    actionModalReason: document.getElementById("actionModalReason"),
    actionModalError: document.getElementById("actionModalError"),
    actionModalOk: document.getElementById("actionModalOk"),
    actionModalCancel: document.getElementById("actionModalCancel")
};

let allOrders = [];
let incomingOrderIds = new Set();
let incomingInitDone = false;
let noticeTimer = null;
function normalizeSellerStatus(status) {
    const s = String(status || "").toUpperCase().trim().replace(/\s+/g, "_");
    if (s === "CONFIRMED") return "ACCEPTED";
    if (s === "OUT-FOR-DELIVERY") return "OUT_FOR_DELIVERY";
    return s;
}

function getSellerStatusRank(status) {
    const order = ["ACCEPTED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];
    return order.indexOf(normalizeSellerStatus(status));
}

function showNewOrderNotice(count) {
    if (!els.newOrderNotice || !count) return;

    els.newOrderNotice.textContent =
        count === 1 ? "1 new order request" : `${count} new order requests`;
    els.newOrderNotice.classList.add("show");

    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
        els.newOrderNotice?.classList.remove("show");
    }, 6000);
}

function syncIncomingOrderNotification(orders) {
    const incoming = (Array.isArray(orders) ? orders : []).filter(o => {
        const s = String(o?.status || "").toUpperCase();
        return s === "PLACED" || s === "PENDING";
    });

    const nextIds = new Set(incoming.map(o => String(o.id)));

    if (!incomingInitDone) {
        incomingOrderIds = nextIds;
        incomingInitDone = true;
        return;
    }

    let freshCount = 0;
    nextIds.forEach(id => {
        if (!incomingOrderIds.has(id)) freshCount += 1;
    });

    if (freshCount > 0) showNewOrderNotice(freshCount);
    incomingOrderIds = nextIds;
}
function getOrderReason(order) {
    return String(
        order?.customer_reason ||
        order?.seller_reason ||
        order?.status_reason ||
        order?.reason ||
        order?.cancel_reason ||
        order?.rejection_reason ||
        order?.reject_reason ||
        order?.cancellation_reason ||
        order?.note ||
        ""
    ).trim();
}

function getOrderActionLabel(order) {
    const status = String(order?.status || "").toUpperCase();
    const actor = String(
        order?.cancelled_by ||
        order?.cancel_by ||
        order?.cancelledBy ||
        order?.cancel_actor ||
        order?.cancelActor ||
        order?.rejected_by ||
        order?.rejectedBy ||
        order?.rejected_by_role ||
        order?.rejectedByRole ||
        order?.status_updated_by ||
        order?.status_updated_by_role ||
        order?.statusUpdatedByRole ||
        ""
    ).toUpperCase().trim();

    if (status === "CANCELLED") {
        if (["CUSTOMER", "USER", "BUYER"].includes(actor)) return "CANCELLED BY CUSTOMER";
        if (["SELLER", "STORE", "VENDOR", "MERCHANT", "SHOP"].includes(actor)) return "CANCELLED BY SELLER";
        if (actor === "ADMIN") return "CANCELLED BY ADMIN";
    }

    if (status === "REJECTED") {
        if (["SELLER", "STORE", "VENDOR", "MERCHANT", "SHOP"].includes(actor)) return "REJECTED BY SELLER";
        if (actor === "ADMIN") return "REJECTED BY ADMIN";
        if (["CUSTOMER", "USER", "BUYER"].includes(actor)) return "CANCELLED BY CUSTOMER";
    }

    return status;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function showActionModal({ title, message, requireReason = false, confirmText = "Confirm" }) {
    return new Promise(resolve => {
        if (!els.actionModal || !els.actionModalOk || !els.actionModalCancel) {
            const ok = window.confirm(message || title || "Confirm?");
            if (!ok) {
                resolve({ confirmed: false, reason: "" });
                return;
            }
            if (!requireReason) {
                resolve({ confirmed: true, reason: "" });
                return;
            }
            const fallbackReason = String(window.prompt("Enter reason:") || "").trim();
            resolve({ confirmed: Boolean(fallbackReason), reason: fallbackReason });
            return;
        }

        const modal = els.actionModal;
        const titleEl = els.actionModalTitle;
        const msgEl = els.actionModalMessage;
        const reasonEl = els.actionModalReason;
        const errorEl = els.actionModalError;
        const okBtn = els.actionModalOk;
        const cancelBtn = els.actionModalCancel;

        if (titleEl) titleEl.textContent = title || "Confirm Action";
        if (msgEl) msgEl.textContent = message || "";
        if (okBtn) okBtn.textContent = confirmText;

        if (reasonEl) {
            reasonEl.value = "";
            reasonEl.style.display = requireReason ? "block" : "none";
        }
        if (errorEl) errorEl.classList.remove("show");

        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");

        const close = (result) => {
            modal.style.display = "none";
            modal.setAttribute("aria-hidden", "true");
            modal.removeEventListener("click", onBackdrop);
            document.removeEventListener("keydown", onKeydown);
            if (okBtn) okBtn.onclick = null;
            if (cancelBtn) cancelBtn.onclick = null;
            resolve(result);
        };

        const onBackdrop = (e) => {
            if (e.target === modal) close({ confirmed: false, reason: "" });
        };

        const onKeydown = (e) => {
            if (e.key === "Escape") close({ confirmed: false, reason: "" });
        };

        if (okBtn) {
            okBtn.onclick = () => {
                const reason = String(reasonEl?.value || "").trim();
                if (requireReason && !reason) {
                    if (errorEl) errorEl.classList.add("show");
                    reasonEl?.focus();
                    return;
                }
                close({ confirmed: true, reason });
            };
        }

        if (cancelBtn) {
            cancelBtn.onclick = () => close({ confirmed: false, reason: "" });
        }

        modal.addEventListener("click", onBackdrop);
        document.addEventListener("keydown", onKeydown);
        setTimeout(() => (requireReason ? reasonEl?.focus() : okBtn?.focus()), 0);
    });
}


/* ================= INITIALIZATION ================= */
document.addEventListener("DOMContentLoaded", () => {
    // Theme Init
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        if(els.themeToggle) els.themeToggle.checked = true;
    }
    
    // Sidebar Logic
    if(els.menuBtn) {
        els.menuBtn.onclick = () => {
            els.sidebar.classList.add("open");
            els.overlay.style.display = "block";
        };
    }

    if(els.overlay) {
        els.overlay.onclick = () => {
            els.sidebar.classList.remove("open");
            els.overlay.style.display = "none";
        };
    }

    // Fetch Initial Data
    fetchOrders();
    
    // Auto Refresh every 20 seconds
    setInterval(fetchOrders, 20000);
});

/* ================= FETCH & SORT ================= */
async function fetchOrders() {
    try {
        // Pull seller orders directly from seller route.
        const res = await fetch(`${API_BASE}/seller/orders/${seller.id}`);
        const data = await res.json();
        
        if (data.orders) {
            allOrders = Array.isArray(data.orders) ? data.orders : [];
            syncIncomingOrderNotification(allOrders);
            renderOrders();
        }
    } catch (err) {
        console.error("âŒ Fetch error:", err);
    }
}

function renderOrders() {
    if (!els.activeList || !els.historyList) return;

    // --- LOGIC: Dashboard se Accept hone ke baad status 'ACCEPTED' ho jata hai ---
    // Isliye hum yahan se 'PLACED' ya 'PENDING' ko hata rahe hain.
    const activeStatuses = ["PLACED", "PENDING", "ACCEPTED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY"];
    const historyStatuses = ["DELIVERED", "CANCELLED", "REJECTED"];

    // Filter Logic
    const activeOrders = allOrders.filter(o => 
        o.status && activeStatuses.includes(o.status.toUpperCase())
    );
    const historyOrders = allOrders.filter(o => 
        o.status && historyStatuses.includes(o.status.toUpperCase())
    );

    // 1. Update Counts (Main Fix)
    if(els.countActive) els.countActive.innerText = activeOrders.length;
    if(els.countHistory) els.countHistory.innerText = historyOrders.length;

    // 2. Render Active Table (Accepted Orders)
    if (activeOrders.length === 0) {
        els.activeList.innerHTML = "";
        els.activeEmpty.style.display = "block";
    } else {
        els.activeEmpty.style.display = "none";
        els.activeList.innerHTML = activeOrders.map(o => createActiveRow(o)).join("");
    }

    // 3. Render History Table (Delivered/Cancelled)
    if (historyOrders.length === 0) {
        els.historyList.innerHTML = "";
        els.historyEmpty.style.display = "block";
    } else {
        els.historyEmpty.style.display = "none";
        els.historyList.innerHTML = historyOrders.map(o => createHistoryRow(o)).join("");
    }
}

/* ================= HTML GENERATORS ================= */
function createActiveRow(order) {
    let cart = [];
    try {
        cart = typeof order.cart === 'string' ? JSON.parse(order.cart) : order.cart;
    } catch(e) { cart = []; }

    const itemText = cart.map(i => `${i.qty}x ${i.name}`).join(", ");
    const status = order.status ? normalizeSellerStatus(order.status) : "ACCEPTED";
    const currentRank = getSellerStatusRank(status);
    const isIncoming = status === "PLACED" || status === "PENDING";

    return `
    <tr>
        <td data-label="Order ID"><b>#${order.id}</b></td>
        <td data-label="Customer">
            ${order.customer_name}<br>
            <small style="color:var(--text-light)">${order.phone}</small>
        </td>
        <td data-label="Items">
            <div class="item-preview" title="${itemText}">
                ${itemText}
            </div>
            <button class="badge view-all-btn" onclick='showItems(${JSON.stringify(cart)})'>+ View All</button>
        </td>
        <td data-label="Amount"><b>Rs. ${order.total_amount}</b></td>
        <td data-label="Payment"><span class="badge">${order.payment_method}</span></td>
        <td data-label="Current Status">
            ${isIncoming
                ? `<span class="badge new-order-badge">New Order</span>`
                : `<select id="status-select-${order.id}" class="status-select" onchange="processUpdate(${order.id}, this.value, '${status}')">
                    <option value="ACCEPTED" ${(status==='ACCEPTED')?'selected':''} ${(currentRank > getSellerStatusRank('ACCEPTED'))?'disabled':''}>Accepted</option>
                    <option value="PACKED" ${(status==='PACKED')?'selected':''} ${(currentRank > getSellerStatusRank('PACKED'))?'disabled':''}>Packed</option>
                    <option value="OUT_FOR_DELIVERY" ${(status==='OUT_FOR_DELIVERY')?'selected':''} ${(currentRank > getSellerStatusRank('OUT_FOR_DELIVERY'))?'disabled':''}>Out for Delivery</option>
                    <option value="DELIVERED" ${(status==='DELIVERED')?'selected':''}>Mark Delivered</option>
                </select>`}
        </td>
        <td data-label="Action">
            <div class="action-wrap">
                ${isIncoming
                    ? `<button class="badge accept-btn" onclick="processUpdate(${order.id}, 'ACCEPTED', '${status}')">Accept</button>`
                    : ""}
                <button class="badge reject-btn" onclick="processUpdate(${order.id}, 'REJECTED', '${status}')">
                    Reject
                </button>
            </div>
        </td>
    </tr>`;
}

function createHistoryRow(order) {
    const date = new Date(order.created_at).toLocaleDateString();
    const status = order.status ? order.status.toUpperCase() : "";
    const statusLabel = getOrderActionLabel(order);
    const color = status === "DELIVERED" ? "#00b894" : "#ff7675";
    const reason = (status === "REJECTED" || status === "CANCELLED") ? getOrderReason(order) : "";

    return `
    <tr>
        <td data-label="Order ID">#${order.id}</td>
        <td data-label="Date">${date}</td>
        <td data-label="Customer">${order.customer_name}</td>
        <td data-label="Total"><b>Rs. ${order.total_amount}</b></td>
        <td data-label="Payment">${order.payment_method}</td>
        <td data-label="Final Status">
            <span style="color:${color}; font-weight:700;">${statusLabel}</span>
            ${reason ? `<div style="margin-top:6px; color:#b91c1c; font-size:12px;">Reason: ${escapeHtml(reason)}</div>` : ""}
        </td>
    </tr>`;
}

/* ================= ACTIONS ================= */
window.processUpdate = async (orderId, newStatus, currentStatus = "") => {
    const status = normalizeSellerStatus(newStatus);
    const normalizeFlowStatus = (s) => {
        const v = String(s || "").toUpperCase().trim().replace(/\s+/g, "_");
        if (v === "ACCEPTED") return "CONFIRMED";
        if (v === "OUT-FOR-DELIVERY") return "OUT_FOR_DELIVERY";
        return v;
    };

    const fallbackCurrent = normalizeSellerStatus(allOrders.find(o => Number(o.id) === Number(orderId))?.status || "");
    const effectiveCurrent = normalizeSellerStatus(currentStatus || fallbackCurrent);

    const nextRank = getSellerStatusRank(status);
    const currentRank = getSellerStatusRank(effectiveCurrent);

    if (nextRank !== -1 && currentRank !== -1 && nextRank < currentRank) {
        alert("Back status allowed nahi hai. Forward status hi select karein.");
        fetchOrders();
        return;
    }

    const previousStatus = normalizeFlowStatus(effectiveCurrent);

    let reason = "";

    if (status === "DELIVERED") {
        const result = await showActionModal({
            title: "Mark Delivered",
            message: "Confirm delivery? This will move the order to History.",
            requireReason: false,
            confirmText: "Yes, Deliver"
        });

        if (!result.confirmed) {
            fetchOrders();
            return;
        }
    }

    if (status === "REJECTED" || status === "CANCELLED") {
        const result = await showActionModal({
            title: status === "REJECTED" ? "Reject Order" : "Cancel Order",
            message: `Please provide reason for ${status.toLowerCase()}.`,
            requireReason: true,
            confirmText: status === "REJECTED" ? "Reject" : "Cancel"
        });

        if (!result.confirmed) {
            fetchOrders();
            return;
        }

        reason = result.reason;
    }

    try {
        const res = await fetch(`${API_BASE}/seller/orders/${orderId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status,
                status_updated_by: "SELLER",
                ...(status === "REJECTED" ? {
                    reason,
                    status_reason: reason,
                    seller_reason: reason,
                    reject_reason: reason,
                    rejection_reason: reason,
                    rejected_by: "SELLER",
                    rejected_by_role: "SELLER",
                    previous_status: previousStatus,
                    prev_status: previousStatus,
                    status_before: previousStatus,
                    from_status: previousStatus
                } : {}),
                ...(status === "CANCELLED" ? {
                    reason,
                    status_reason: reason,
                    seller_reason: reason,
                    cancel_reason: reason,
                    cancellation_reason: reason,
                    cancelled_by: "SELLER",
                    cancelled_by_role: "SELLER",
                    previous_status: previousStatus,
                    prev_status: previousStatus,
                    status_before: previousStatus,
                    from_status: previousStatus
                } : {})
            })
        });

        const data = await res.json();
        if (data.success) {
            fetchOrders();
        } else {
            alert("Update failed: " + data.message);
        }
    } catch (err) {
        console.error(err);
    }
};
/* ================= TABS LOGIC ================= */
window.switchTab = (tabName) => {
    document.querySelectorAll('.orders-view').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'active') btns[0].classList.add('active');
    else btns[1].classList.add('active');
};

/* ================= MODAL LOGIC ================= */
window.showItems = (items) => {
    const modal = document.getElementById("detailModal");
    const list = document.getElementById("modalItemsList");
    
    list.innerHTML = items.map(i => `
        <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color)">
            <span>${i.qty} x ${i.name}</span>
            <b>Rs. ${i.price * i.qty}</b>
        </div>
    `).join("");
    
    modal.style.display = "flex";
};

// Close modal logic
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("close-modal") || e.target.id === "detailModal") {
        document.getElementById("detailModal").style.display = "none";
    }
});

/* ================= THEME TOGGLE ================= */
if(els.themeToggle) {
    els.themeToggle.onchange = (e) => {
        document.body.classList.toggle("dark", e.target.checked);
        localStorage.setItem("theme", e.target.checked ? "dark" : "light");
    };
}

function logout() {
    if(confirm("Logout from Seller Panel?")) {
        localStorage.removeItem("lbSeller");
        window.location.href = "seller-auth/seller-auth.html";
    }
}
















