/* =====================================================
   LOCALBASKET â€” CUSTOMER ORDERS SCRIPT
   CLEAN â€¢ SAFE â€¢ STABLE â€¢ BACKEND-ALIGNED
===================================================== */

console.log("âœ… customer-orders.js loaded");

/* =====================================================
   GLOBAL STATE
===================================================== */
let CANCEL_ORDER_ID = null;
let ALL_ORDERS = [];
let CURRENT_FILTER = "ALL";
const STORE_CACHE = new Map();
let FEEDBACK_ORDER_ID = null;
let FEEDBACK_RATING = 0;
let FEEDBACK_SAVING = false;

/* =====================================================
   CONFIG
===================================================== */
const API_URL = "http://localhost:5000/api";
const STATUS_FLOW = ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];

/* =====================================================
   DOM READY + AUTH CHECK
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("ordersWrapper");

  if (!wrapper) {
    console.error("âŒ ordersWrapper not found");
    return;
  }

  const user = getCurrentUser();
  if (!user) {
    console.warn("âš  User not logged in");
    function goHome() {
  window.location.href = "/welcome/customer/index.html";
}

    return;
  }

  initFeedbackStars();
  loadOrders(wrapper, user.id);
});

/* =====================================================
   USER & UTIL HELPERS
===================================================== */
function getCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem("lbUser"));

    if (!user) return null;

    // ðŸ”¥ HARD CHECK
    if (!user.id) {
      console.error("User ID missing in lbUser:", user);
      return null;
    }

    return user;
  } catch (e) {
    console.error("User parse error", e);
    return null;
  }
}

function getCartKey() {
  const user = getCurrentUser();
  const id = user && user.id ? user.id : "guest";
  return `lbCart_${id}`;
}

function getCustomerCancelKey() {
  const user = getCurrentUser();
  const id = user && user.id ? user.id : "guest";
  return `lbCancelledOrders_${id}`;
}

function getCustomerCancelReasonKey() {
  const user = getCurrentUser();
  const id = user && user.id ? user.id : "guest";
  return `lbCancelReasons_${id}`;
}

function getFeedbackKey() {
  const user = getCurrentUser();
  const id = user && user.id ? user.id : "guest";
  return `lbOrderFeedback_${id}`;
}

function getFeedbackMap() {
  try {
    const raw = localStorage.getItem(getFeedbackKey()) || "{}";
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getFeedback(orderId) {
  const ids = getOrderIdCandidates(orderId);
  if (!ids.length) return null;
  const map = getFeedbackMap();
  for (const id of ids) {
    if (map[id]) return map[id];
  }
  return null;
}

function setFeedback(orderId, payload) {
  const id = normalizeOrderIdKey(orderId);
  if (!id) return;
  const map = getFeedbackMap();
  map[id] = payload;
  localStorage.setItem(getFeedbackKey(), JSON.stringify(map));
}

function getOrderById(orderId) {
  const id = normalizeOrderIdKey(orderId);
  if (!id) return null;
  return ALL_ORDERS.find(o => normalizeOrderIdKey(o?.id) === id) || null;
}

function getOrderFeedback(order) {
  if (!order || typeof order !== "object") return null;
  const ratingCandidates = [
    order?.rating,
    order?.order_rating,
    order?.customer_rating,
    order?.feedback_rating,
    order?.review_rating,
    order?.rating_value,
    order?.ratingValue
  ];
  const commentCandidates = [
    order?.comment,
    order?.feedback,
    order?.feedback_text,
    order?.review,
    order?.review_text,
    order?.note
  ];
  const createdCandidates = [
    order?.feedback_at,
    order?.feedback_on,
    order?.feedback_date,
    order?.reviewed_at,
    order?.reviewed_on,
    order?.created_at
  ];

  let rating = null;
  for (const v of ratingCandidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) {
      rating = Math.max(1, Math.min(5, n));
      break;
    }
  }

  if (!rating) return null;

  const comment = pickFirstNonEmpty(...commentCandidates);
  const created_at = pickFirstNonEmpty(...createdCandidates);

  return { rating, comment, created_at };
}

function normalizeOrderIdKey(orderId) {
  if (orderId === null || orderId === undefined) return "";
  return String(orderId).trim();
}

function getOrderIdCandidates(orderId) {
  const primary = normalizeOrderIdKey(orderId);
  if (!primary) return [];
  const numeric = Number(primary);
  if (Number.isFinite(numeric) && numeric > 0) {
    const normalizedNumeric = String(numeric);
    return primary === normalizedNumeric ? [primary] : [primary, normalizedNumeric];
  }
  return [primary];
}

function getLocallyCancelledOrderIds() {
  try {
    const raw = localStorage.getItem(getCustomerCancelKey()) || "[]";
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return new Set();
    return new Set(
      list
        .map(v => normalizeOrderIdKey(v))
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

function markCancelledByCustomer(orderId) {
  const id = normalizeOrderIdKey(orderId);
  if (!id) return;

  const set = getLocallyCancelledOrderIds();
  set.add(id);
  localStorage.setItem(getCustomerCancelKey(), JSON.stringify(Array.from(set)));
}

function getLocalCancelReasonMap() {
  try {
    const raw = localStorage.getItem(getCustomerCancelReasonKey()) || "{}";
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function setLocalCancelReason(orderId, reason) {
  const id = normalizeOrderIdKey(orderId);
  if (!id) return;
  const text = String(reason || "").trim();
  if (!text) return;

  const map = getLocalCancelReasonMap();
  map[id] = text;
  localStorage.setItem(getCustomerCancelReasonKey(), JSON.stringify(map));
}

function getLocalCancelReason(orderId) {
  const ids = getOrderIdCandidates(orderId);
  if (!ids.length) return "";
  const map = getLocalCancelReasonMap();
  for (const id of ids) {
    const reason = String(map[id] || "").trim();
    if (reason) return reason;
  }
  return "";
}

function isLocallyCancelledByCustomer(orderId) {
  const ids = getOrderIdCandidates(orderId);
  if (!ids.length) return false;
  const set = getLocallyCancelledOrderIds();
  return ids.some(id => set.has(id));
}


function safeParseCart(cart) {
  try {
    if (Array.isArray(cart)) return cart;
    if (typeof cart === "string") return JSON.parse(cart);
  } catch {}
  return [];
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function canCancel(status) {
  return ["PLACED", "CONFIRMED"].includes(status);
}

function normalizeStatusToken(status) {
  const s = String(status || "").toUpperCase().trim().replace(/\s+/g, "_");
  if (s === "CANCELED") return "CANCELLED";
  if (s === "ACCEPTED") return "CONFIRMED";
  if (s === "OUT-FOR-DELIVERY") return "OUT_FOR_DELIVERY";
  if (s === "OUT_FOR_DELIVERY" || s === "OUT_FOR_DELIVER") return "OUT_FOR_DELIVERY";
  return s;
}

function getCancelActor(order) {
  const actor =
    order?.cancelled_by ||
    order?.cancel_by ||
    order?.cancelledBy ||
    order?.cancelled_by_role ||
    order?.cancelledByRole ||
    order?.cancelled_by_type ||
    order?.cancelledByType ||
    order?.cancelled_by_user ||
    order?.cancelledByUser ||
    order?.cancel_actor ||
    order?.cancelActor ||
    order?.rejected_by ||
    order?.rejectedBy ||
    order?.rejected_by_role ||
    order?.rejectedByRole ||
    order?.rejected_by_user ||
    order?.rejectedByUser ||
    order?.action_by ||
    order?.action_by_role ||
    order?.actionByRole ||
    order?.status_updated_by ||
    order?.status_updated_by_role ||
    order?.statusUpdatedByRole ||
    order?.updated_by ||
    order?.updatedBy ||
    order?.last_updated_by ||
    order?.lastUpdatedBy ||
    "";

  return String(actor).toUpperCase().trim();
}

function getCustomerCancelActor(order) {
  const actor =
    order?.cancelled_by ||
    order?.cancel_by ||
    order?.cancelledBy ||
    order?.cancelled_by_role ||
    order?.cancelledByRole ||
    order?.cancelled_by_type ||
    order?.cancelledByType ||
    order?.cancelled_by_user ||
    order?.cancelledByUser ||
    order?.cancel_actor ||
    order?.cancelActor ||
    "";

  return String(actor).toUpperCase().trim();
}

function getSellerRejectActor(order) {
  const actor =
    order?.rejected_by ||
    order?.rejectedBy ||
    order?.rejected_by_role ||
    order?.rejectedByRole ||
    order?.rejected_by_user ||
    order?.rejectedByUser ||
    "";

  return String(actor).toUpperCase().trim();
}

function getOrderReason(order) {
  return pickReasonValue(
    order?.customer_reason,
    order?.seller_reason,
    order?.reason,
    order?.cancel_reason,
    order?.rejection_reason,
    order?.reject_reason,
    order?.cancellation_reason,
    order?.status_reason,
    order?.message,
    order?.remarks,
    order?.comment,
    order?.note,
    getLatestHistoryReason(order)
  );
}

function pickReasonValue(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJson(value) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getOrderEvents(order) {
  const rawSources = [
    order?.status_history,
    order?.statusHistory,
    order?.history,
    order?.events,
    order?.timeline,
    order?.logs
  ];

  for (const src of rawSources) {
    const parsed = safeJson(src);
    if (Array.isArray(parsed)) return parsed;
  }

  return [];
}

function getEventActor(event) {
  return String(
    event?.actor ||
    event?.acted_by ||
    event?.action_by ||
    event?.updated_by ||
    event?.status_updated_by ||
    event?.cancelled_by ||
    event?.rejected_by ||
    event?.role ||
    event?.user_type ||
    ""
  ).toUpperCase().trim();
}

function getEventReason(event) {
  return pickReasonValue(
    event?.reason,
    event?.cancel_reason,
    event?.cancellation_reason,
    event?.reject_reason,
    event?.rejection_reason,
    event?.status_reason,
    event?.note,
    event?.comment,
    event?.message,
    event?.remarks
  );
}

function getLatestHistoryReason(order) {
  const events = getOrderEvents(order);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const reason = getEventReason(events[i]);
    if (reason) return reason;
  }
  return "";
}

function getCustomerCancelReason(order) {
  const direct = pickReasonValue(
    order?.customer_reason,
    order?.customer_cancel_reason,
    order?.cancel_reason,
    order?.cancellation_reason,
    order?.status_reason,
    order?.reason,
    order?.cancel_note
  );
  if (direct) return direct;

  const events = getOrderEvents(order);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const actor = getEventActor(events[i]);
    const reason = getEventReason(events[i]);
    if (!reason) continue;
    if (["CUSTOMER", "USER", "BUYER"].includes(actor)) return reason;
  }

  return getLocalCancelReason(order?.id);
}

function getSellerRejectReason(order) {
  const direct = pickReasonValue(
    order?.seller_reason,
    order?.seller_reject_reason,
    order?.reject_reason,
    order?.rejection_reason,
    order?.status_reason,
    order?.reason,
    order?.cancel_reason,
    order?.reject_note
  );
  if (direct) return direct;

  const events = getOrderEvents(order);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const actor = getEventActor(events[i]);
    const reason = getEventReason(events[i]);
    if (!reason) continue;
    if (["SELLER", "STORE", "VENDOR", "MERCHANT", "SHOP", "ADMIN"].includes(actor)) return reason;
  }

  return "";
}

function getEventStatusToken(event) {
  const raw = String(
    event?.status ||
    event?.new_status ||
    event?.to_status ||
    event?.next_status ||
    event?.event_type ||
    event?.type ||
    event?.action ||
    ""
  ).toUpperCase().trim();
  if (!raw) return "";
  if (raw.includes("REJECT")) return "REJECTED";
  if (raw.includes("CANCEL")) return "CANCELLED";
  return normalizeStatusToken(raw);
}

function getLatestEventForStatus(order, targetStatus) {
  const target = normalizeStatusToken(targetStatus);
  const events = getOrderEvents(order);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (getEventStatusToken(events[i]) === target) return events[i];
  }
  return null;
}

function normalizeActorName(actor, fallback = "UNKNOWN") {
  const a = String(actor || "").toUpperCase().trim();
  if (!a) return fallback;
  if (["CUSTOMER", "USER", "BUYER"].includes(a)) return "CUSTOMER";
  if (["SELLER", "STORE", "VENDOR", "MERCHANT", "SHOP"].includes(a)) return "SELLER";
  if (a === "ADMIN") return "ADMIN";
  return a;
}

function getOrderActionInsight(order) {
  const status = getDisplayStatus(order);
  const statusReason = String(order?.status_reason || "").trim();
  const genericReason = String(order?.reason || "").trim();

  if (status === "CANCELLED") {
    const evt = getLatestEventForStatus(order, "CANCELLED");
    const actor = normalizeActorName(
      getEventActor(evt) || getCustomerCancelActor(order) || getCancelActor(order) || (isLocallyCancelledByCustomer(order?.id) ? "CUSTOMER" : ""),
      "CUSTOMER"
    );
    const reason = pickReasonValue(
      getCustomerCancelReason(order),
      getEventReason(evt),
      statusReason.toLowerCase().includes("cancel") ? statusReason : "",
      genericReason
    );
    return { status, actor, reason };
  }

  if (status === "REJECTED") {
    const evt = getLatestEventForStatus(order, "REJECTED");
    const actor = normalizeActorName(
      getEventActor(evt) || getSellerRejectActor(order) || getCancelActor(order),
      "SELLER"
    );
    const reason = pickReasonValue(
      getSellerRejectReason(order),
      getEventReason(evt),
      statusReason.toLowerCase().includes("reject") ? statusReason : "",
      genericReason
    );
    return { status, actor, reason };
  }

  return { status, actor: "", reason: "" };
}

function getOrderActionInsightById(orderId) {
  const id = normalizeOrderIdKey(orderId);
  const order = ALL_ORDERS.find(o => normalizeOrderIdKey(o?.id) === id);
  if (!order) return null;
  return { order, ...getOrderActionInsight(order) };
}

function hasCustomerCancelField(order) {
  return Boolean(
    String(order?.cancel_reason || "").trim() ||
    String(order?.cancellation_reason || "").trim()
  );
}

function hasSellerRejectField(order) {
  return Boolean(
    String(order?.reject_reason || "").trim() ||
    String(order?.rejection_reason || "").trim()
  );
}

function hasExplicitCustomerCancelSignal(order) {
  const actor = getCustomerCancelActor(order);
  const statusReason = String(order?.status_reason || "").toLowerCase();
  const eventType = String(order?.event_type || order?.eventType || "").toLowerCase();

  return Boolean(
    hasCustomerCancelField(order) ||
    isCustomerActor(actor, order) ||
    String(order?.cancelled_at || "").trim() ||
    String(order?.cancelled_on || "").trim() ||
    String(order?.cancellation_at || "").trim() ||
    String(order?.cancel_at || "").trim() ||
    Number(order?.is_cancelled || 0) === 1 ||
    Number(order?.cancelled || 0) === 1 ||
    statusReason.includes("cancelled by customer") ||
    statusReason.includes("customer cancelled") ||
    statusReason.includes("customer cancel") ||
    eventType.includes("customer_cancel") ||
    eventType.includes("cancel_by_customer") ||
    eventType.includes("customer_cancelled")
  );
}

function hasExplicitSellerRejectSignal(order) {
  const actor = getSellerRejectActor(order);
  const statusReason = String(order?.status_reason || "").toLowerCase();
  const eventType = String(order?.event_type || order?.eventType || "").toLowerCase();
  const rejectedByRole = String(order?.rejected_by_role || order?.rejectedByRole || "").toUpperCase();

  return Boolean(
    hasSellerRejectField(order) ||
    isSellerRejectActor(actor) ||
    isSellerRejectActor(rejectedByRole) ||
    statusReason.includes("seller") ||
    eventType.includes("seller_reject")
  );
}

function isCustomerCancelReason(reason) {
  const r = String(reason || "").toLowerCase();
  const knownCustomerReasons = [
    "ordered by mistake",
    "found cheaper elsewhere",
    "delivery taking too long",
    "changed my mind",
    "other"
  ];
  const looseCustomerHints = ["mistake", "cheaper", "too long", "changed my mind", "change my mind"];

  return (
    knownCustomerReasons.some(k => r === k || r.startsWith(`${k} -`) || r.includes(k)) ||
    looseCustomerHints.some(k => r.includes(k))
  );
}

function isSellerRejectActor(actor) {
  const a = String(actor || "").toUpperCase();
  return ["SELLER", "STORE", "ADMIN", "SHOP", "VENDOR", "MERCHANT"].includes(a);
}

function getNumericId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getOrderStoreId(order) {
  return getNumericId(
    order?.store_id ||
    order?.storeId ||
    order?.seller_id ||
    order?.sellerId ||
    order?.store?.id ||
    order?.seller?.id
  );
}

function hasStoreContactInfo(order) {
  return Boolean(
    String(
      order?.store?.name ||
      order?.store?.store_name ||
      order?.store_name ||
      order?.seller?.store_name ||
      order?.seller_name ||
      order?.shop_name ||
      ""
    ).trim() ||
    String(
      order?.store?.phone ||
      order?.store?.store_phone ||
      order?.store_phone ||
      order?.seller?.phone ||
      order?.seller_phone ||
      order?.shop_phone ||
      ""
    ).trim() ||
    String(
      order?.store?.address ||
      order?.store?.store_address ||
      order?.store_address ||
      order?.seller?.address ||
      order?.seller_address ||
      order?.shop_address ||
      ""
    ).trim()
  );
}

async function fetchStoreById(storeId) {
  if (!storeId) return null;
  if (STORE_CACHE.has(storeId)) return STORE_CACHE.get(storeId);

  try {
    const res = await fetch(`${API_URL}/stores/${storeId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || !data?.store) {
      STORE_CACHE.set(storeId, null);
      return null;
    }

    STORE_CACHE.set(storeId, data.store);
    return data.store;
  } catch {
    STORE_CACHE.set(storeId, null);
    return null;
  }
}

function mergeStoreInfo(order, store) {
  if (!order || !store) return order;

  const existingStore = order.store && typeof order.store === "object" ? order.store : {};
  return {
    ...order,
    store: { ...store, ...existingStore },
    store_name: order.store_name || store.store_name || store.name || "",
    store_phone: order.store_phone || store.phone || store.store_phone || "",
    store_address: order.store_address || store.address || store.store_address || "",
    seller_name: order.seller_name || store.store_name || store.name || "",
    seller_phone: order.seller_phone || store.phone || store.store_phone || "",
    seller_address: order.seller_address || store.address || store.store_address || ""
  };
}

async function hydrateOrdersWithStoreInfo(orders) {
  if (!Array.isArray(orders) || !orders.length) return orders;

  const storeIds = [
    ...new Set(
      orders
        .filter(order => !hasStoreContactInfo(order))
        .map(order => getOrderStoreId(order))
        .filter(Boolean)
    )
  ];

  if (!storeIds.length) return orders;

  const entries = await Promise.all(
    storeIds.map(async (id) => [id, await fetchStoreById(id)])
  );
  const storeMap = new Map(entries);

  return orders.map(order => {
    if (hasStoreContactInfo(order)) return order;
    const storeId = getOrderStoreId(order);
    if (!storeId) return order;
    return mergeStoreInfo(order, storeMap.get(storeId));
  });
}

function isCustomerActor(actor, order) {
  const a = String(actor || "").toUpperCase();
  if (["CUSTOMER", "USER", "BUYER"].includes(a)) return true;

  // Some backends store actor as numeric user id instead of role string.
  const actorId = getNumericId(actor);
  if (!actorId) return false;

  const loggedUserId = getNumericId(getCurrentUser()?.id);
  const orderCustomerId = getNumericId(
    order?.customer_id || order?.customerId || order?.user_id || order?.userId
  );

  return actorId === loggedUserId || actorId === orderCustomerId;
}

function hasCancelSignal(order) {
  return Boolean(
    String(order?.cancel_reason || "").trim() ||
    String(order?.cancellation_reason || "").trim() ||
    String(order?.cancelled_by || "").trim() ||
    String(order?.cancel_by || "").trim() ||
    String(order?.cancelledBy || "").trim() ||
    String(order?.cancelled_at || "").trim() ||
    String(order?.cancelled_on || "").trim() ||
    String(order?.cancellation_at || "").trim() ||
    String(order?.cancel_at || "").trim() ||
    Number(order?.is_cancelled || 0) === 1 ||
    Number(order?.cancelled || 0) === 1
  );
}

function hasRejectSignal(order) {
  return Boolean(
    String(order?.reject_reason || "").trim() ||
    String(order?.rejection_reason || "").trim() ||
    String(order?.rejected_at || "").trim() ||
    String(order?.rejected_on || "").trim() ||
    String(order?.rejection_at || "").trim() ||
    Number(order?.is_rejected || 0) === 1 ||
    Number(order?.rejected || 0) === 1
  );
}

function getDisplayStatus(order) {
  const raw = normalizeStatusToken(order?.status);
  const genericActor = getCancelActor(order);
  const reason = getOrderReason(order);
  const customerActor = getCustomerCancelActor(order);
  const sellerActor = getSellerRejectActor(order);
  const customerSideCancel =
    isCustomerActor(customerActor, order) ||
    isCustomerActor(sellerActor, order) ||
    isCustomerActor(genericActor, order) ||
    isCustomerCancelReason(reason);
  const sellerSideAction = hasRejectSignal(order) || hasExplicitSellerRejectSignal(order);
  const customerSideAction =
    hasCancelSignal(order) ||
    hasExplicitCustomerCancelSignal(order) ||
    isCustomerActor(sellerActor, order);

  // Client-side safety: customer-cancelled orders should never appear as rejected.
  if ((raw === "REJECTED" || raw === "CANCELLED") && isLocallyCancelledByCustomer(order?.id)) {
    return "CANCELLED";
  }

  // Keep customer-originated cancellations in CANCELLED bucket.
  if (raw === "REJECTED") {
    if (isCustomerActor(genericActor, order)) return "CANCELLED";
    if (isCustomerActor(sellerActor, order)) return "CANCELLED";
    if (isCustomerActor(customerActor, order)) return "CANCELLED";
    if (isSellerRejectActor(sellerActor)) return "REJECTED";
    if (sellerSideAction && !customerSideAction) return "REJECTED";
    if (customerSideCancel || customerSideAction) return "CANCELLED";
    return "REJECTED";
  }

  // CANCELLED stays cancelled unless explicitly marked as seller/admin action.
  if (raw === "CANCELLED") {
    if (customerSideCancel || customerSideAction) return "CANCELLED";
    if (sellerSideAction) return "REJECTED";
    return "CANCELLED";
  }

  return raw || "PLACED";
}

function getStatusLabel(order) {
  const status = getDisplayStatus(order);
  const actor = getCancelActor(order);
  const actorIsCustomer = isCustomerActor(actor, order);
  const actorIsSeller = isSellerRejectActor(actor);
  const actorIsAdmin = String(actor || "").toUpperCase() === "ADMIN";

  if (status === "REJECTED") {
    if (actorIsAdmin) return "REJECTED BY ADMIN";
    if (actorIsSeller) return "REJECTED BY SELLER";
    if (actorIsCustomer) return "CANCELLED BY CUSTOMER";
    return "REJECTED";
  }

  if (status === "CANCELLED") {
    if (actorIsCustomer) return "CANCELLED BY CUSTOMER";
    if (actorIsSeller) return "CANCELLED BY SELLER";
    if (actorIsAdmin) return "CANCELLED BY ADMIN";
    return "CANCELLED";
  }

  return status;
}

function getFlowLabel(step) {
  return step === "OUT_FOR_DELIVERY" ? "OUT FOR DELIVERY" : step;
}

function getTerminalStopIndex(order, terminalStatus) {
  const target = normalizeStatusToken(terminalStatus);

  // Prefer explicit status provided by backend/payload at reject/cancel time.
  const explicitStatus = pickFirstNonEmpty(
    order?.previous_status,
    order?.previousStatus,
    order?.prev_status,
    order?.prevStatus,
    order?.status_before,
    order?.statusBefore,
    order?.from_status,
    order?.fromStatus,
    order?.old_status,
    order?.oldStatus,
    order?.last_status,
    order?.lastStatus,
    order?.last_known_status,
    order?.lastKnownStatus
  );
  const explicitIndex = STATUS_FLOW.indexOf(normalizeStatusToken(explicitStatus));
  if (explicitIndex !== -1) return explicitIndex;

  const events = getOrderEvents(order);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (getEventStatusToken(events[i]) !== target) continue;

    for (let j = i - 1; j >= 0; j -= 1) {
      const idx = STATUS_FLOW.indexOf(getEventStatusToken(events[j]));
      if (idx !== -1) return idx;
    }
    break;
  }

  const currentRawIndex = STATUS_FLOW.indexOf(normalizeStatusToken(order?.status));
  if (currentRawIndex !== -1) return currentRawIndex;

  return target === "CANCELLED" ? 1 : 0;
}

function getTimelineSteps(order, displayStatus, flow = STATUS_FLOW) {
  const normalizedFlow = flow.map(step => normalizeStatusToken(step));
  const normalizedStatus = normalizeStatusToken(displayStatus);
  const isTerminal = normalizedStatus === "CANCELLED" || normalizedStatus === "REJECTED";

  let activeIndex = normalizedFlow.indexOf(normalizedStatus);
  let stopIndex = -1;

  if (isTerminal) {
    const stopInMainFlow = getTerminalStopIndex(order, normalizedStatus);
    const stopToken = STATUS_FLOW[Math.max(0, Math.min(stopInMainFlow, STATUS_FLOW.length - 1))] || STATUS_FLOW[0];
    stopIndex = normalizedFlow.indexOf(stopToken);
    if (stopIndex === -1) stopIndex = 0;
  } else if (activeIndex === -1) {
    activeIndex = 0;
  }

  return flow.map((step, i) => {
    let state = "";
    if (isTerminal) {
      if (i < stopIndex) state = "active";
      else if (i === stopIndex) state = "active";
      else state = "crossed";
    } else {
      if (i <= activeIndex) state = "active";
    }

    let label = getFlowLabel(step);
    if (state === "crossed") label = `✕ ${label}`;

    return { step, state, label };
  });
}

function statusTimeline(order, currentStatus) {
  return getTimelineSteps(order, currentStatus, STATUS_FLOW)
    .map(({ state, label }) => `<span class="${state}">${label}</span>`)
    .join("");
}

/* =====================================================
   FETCH ORDERS
===================================================== */
async function loadOrders(wrapper, userId) {
  try {
    wrapper.innerHTML =
      `<p style="text-align:center;color:#64748b">Loading orders...</p>`;

    const res = await fetch(`${API_URL}/orders/customer/${userId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }

if (!data.success) {
  throw new Error(data.message || "Order fetch failed");
}

ALL_ORDERS = Array.isArray(data.orders) ? data.orders : [];
ALL_ORDERS = await hydrateOrdersWithStoreInfo(ALL_ORDERS);

    if (ALL_ORDERS.length === 0) {
      wrapper.innerHTML = `
        <div class="empty">
          <h2>No orders yet ðŸ“¦</h2>
          <p>Start shopping to see your orders here</p>
        </div>`;
      return;
    }

    renderFilteredOrders();
  } catch (err) {
    console.error("Order load error:", err);
    const msg = String(err?.message || "Unable to load orders");
    wrapper.innerHTML =
      `<p class="error">Unable to load orders: ${msg}</p>`;
  }
}

/* =====================================================
   FILTER HANDLING
===================================================== */
function filterOrders(type, btn) {
  CURRENT_FILTER = type;

  document
    .querySelectorAll(".order-tabs .tab")
    .forEach(b => b.classList.remove("active"));

  if (btn) btn.classList.add("active");

  renderFilteredOrders();
}

function renderFilteredOrders() {
  const wrapper = document.getElementById("ordersWrapper");
  let filtered = [];

  switch (CURRENT_FILTER) {
    case "ACTIVE":
      filtered = ALL_ORDERS.filter(
        o => !["DELIVERED", "REJECTED", "CANCELLED"].includes(getDisplayStatus(o))
      );
      break;

    case "COMPLETED":
      filtered = ALL_ORDERS.filter(o => getDisplayStatus(o) === "DELIVERED");
      break;

    case "REJECTED":
      filtered = ALL_ORDERS.filter(o => getDisplayStatus(o) === "REJECTED");
      break;

    case "CANCELLED":
      filtered = ALL_ORDERS.filter(o => getDisplayStatus(o) === "CANCELLED");
      break;

    default:
      filtered = ALL_ORDERS;
  }

  if (filtered.length === 0) {
    wrapper.innerHTML =
      `<p class="empty-text">No orders found</p>`;
    return;
  }

  wrapper.innerHTML = filtered.map(renderOrderCard).join("");
}

/* =====================================================
   ORDER CARD TEMPLATE
===================================================== */
function renderOrderCard(order) {
  const orderId = normalizeOrderIdKey(order?.id);
  const safeOrderIdLiteral = JSON.stringify(orderId);
  const safeOrderIdForUrl = encodeURIComponent(orderId);
  const displayStatus = getDisplayStatus(order);
  const displayLabel = getStatusLabel(order);
  const cart = safeParseCart(order.cart);

  const isDelivered = displayStatus === "DELIVERED";
  const feedback = getOrderFeedback(order) || getFeedback(orderId);
  const isPrepaid =
    order.payment_method !== "COD" ||
    order.payment_status === "PAID";

  const storeName = pickFirstNonEmpty(
    order.store?.name,
    order.store?.store_name,
    order.store_name,
    order.seller?.store_name,
    order.seller_name,
    order.shop_name,
    "Local Store"
  );
  const storePhone = pickFirstNonEmpty(
    order.store?.phone,
    order.store?.store_phone,
    order.store_phone,
    order.seller?.phone,
    order.seller_phone,
    order.shop_phone,
    "N/A"
  );
  const storeAddress = pickFirstNonEmpty(
    order.store?.address,
    order.store?.store_address,
    order.store_address,
    order.seller?.address,
    order.seller_address,
    order.shop_address,
    "Address not available"
  );
  const statusClass = (displayStatus || "").toLowerCase();
  const isCancelled = displayStatus === "CANCELLED";
  const isRejected = displayStatus === "REJECTED";
  const actionInsight = getOrderActionInsight(order);
  const actionReason = actionInsight.reason;
  const actionActor = actionInsight.actor;

  return `
    <div class="order-card ${isCancelled ? "cancelled" : ""} ${isRejected ? "rejected" : ""}">

      <div class="card-top">
        <div>
          <div class="order-id">#LB-${order.id}</div>
          <div class="order-date">${formatDate(order.created_at)}</div>
        </div>
        <span class="status ${statusClass}">${displayLabel}</span>
      </div>

      <div class="store-info">
        <div class="store-name">🏪 ${storeName}</div>
        <div class="store-meta">
          📞 ${storePhone}<br>
          📍 ${storeAddress}
        </div>
      </div>

      <div class="timeline">
        ${statusTimeline(order, displayStatus)}
      </div>

      <div class="items">
        ${
          cart.length
            ? cart.map(i => `
              <div class="item">
                <span>${i.qty} × ${i.name}</span>
                <strong>Rs. ${i.qty * i.price}</strong>
              </div>
            `).join("")
            : `<div class="item"><span>No items</span></div>`
        }
      </div>

      <div class="footer">
        <div>
          <div class="payment">
            ${order.payment_method} • ${order.payment_status}
          </div>
          ${
            actionReason
              ? `<div class="payment" style="color:#b91c1c; font-weight:700; margin-top:4px;">${actionActor ? `By: ${actionActor} • ` : ""}Reason: ${actionReason}</div>`
              : ""
          }
          <div class="amount">Rs. ${order.total_amount}</div>
        </div>

        <div class="actions">
          <button class="btn track"
            onclick='trackOrder(${safeOrderIdLiteral})'>
            📍 Track
          </button>

          ${
            canCancel(displayStatus)
              ? `<button class="btn cancel"
                   onclick='openCancelModal(${safeOrderIdLiteral})'>
                   ❌ Cancel
                 </button>`
              : ""
          }

          ${
            isDelivered || isPrepaid
              ? `<a class="btn invoice"
                   href="${API_URL}/orders/${safeOrderIdForUrl}/invoice"
                   target="_blank">
                   📄 Invoice
                 </a>`
              : ""
          }

          ${
            isDelivered
              ? `<button class="btn feedback"
                   onclick='openFeedbackModal(${safeOrderIdLiteral})'>
                   ${feedback ? "⭐ Edit Feedback" : "⭐ Give Feedback"}
                 </button>`
              : ""
          }

          <button class="btn reorder"
            onclick='reorder(${JSON.stringify(cart)})'>
            🔁 Re-order
          </button>
        </div>
        ${
          feedback
            ? `
              <div class="feedback-tag">Thanks! You rated ${feedback.rating}/5</div>
              ${feedback.comment ? `<div class="feedback-comment">"${escapeHtml(feedback.comment)}"</div>` : ""}
            `
            : ""
        }
      </div>
    </div>
  `;
}

/* =====================================================
   CANCEL MODAL LOGIC
===================================================== */
function openCancelModal(orderId) {
  CANCEL_ORDER_ID = normalizeOrderIdKey(orderId);
  document.getElementById("cancelModal")
    .classList.remove("hidden");
}

function closeCancelModal() {
  CANCEL_ORDER_ID = null;
  document.getElementById("cancelModal")
    .classList.add("hidden");
}

/* =====================================================
   FEEDBACK MODAL LOGIC
===================================================== */
function initFeedbackStars() {
  const stars = document.querySelectorAll("#ratingStars .star-btn");
  stars.forEach(btn => {
    btn.addEventListener("click", () => {
      FEEDBACK_RATING = Number(btn.dataset.value || 0);
      stars.forEach(s => s.classList.toggle("active", Number(s.dataset.value) <= FEEDBACK_RATING));
    });
  });
}

function openFeedbackModal(orderId) {
  FEEDBACK_ORDER_ID = normalizeOrderIdKey(orderId);
  const modal = document.getElementById("feedbackModal");
  const note = document.getElementById("feedbackText");
  const stars = document.querySelectorAll("#ratingStars .star-btn");
  const existing = getOrderFeedback(getOrderById(FEEDBACK_ORDER_ID)) || getFeedback(FEEDBACK_ORDER_ID);

  FEEDBACK_RATING = existing?.rating || 0;
  stars.forEach(s => s.classList.toggle("active", Number(s.dataset.value) <= FEEDBACK_RATING));
  if (note) note.value = existing?.comment || "";

  if (modal) modal.classList.remove("hidden");
}

function closeFeedbackModal() {
  const modal = document.getElementById("feedbackModal");
  if (modal) modal.classList.add("hidden");
  FEEDBACK_ORDER_ID = null;
  FEEDBACK_RATING = 0;
}

async function submitFeedback() {
  const note = document.getElementById("feedbackText");
  const submitBtn = document.querySelector("#feedbackModal .btn-feedback.submit");
  if (!FEEDBACK_ORDER_ID) return;

  if (!FEEDBACK_RATING) {
    alert("Please select a rating");
    return;
  }

  if (FEEDBACK_SAVING) return;
  FEEDBACK_SAVING = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";
  }

  const payload = {
    order_id: FEEDBACK_ORDER_ID,
    customer_id: getCurrentUser()?.id || null,
    rating: FEEDBACK_RATING,
    comment: String(note?.value || "").trim()
  };

  try {
    const res = await fetch(`${API_URL}/orders/${encodeURIComponent(FEEDBACK_ORDER_ID)}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || "Failed to save feedback");
    }

    setFeedback(FEEDBACK_ORDER_ID, {
      rating: payload.rating,
      comment: payload.comment,
      created_at: new Date().toISOString()
    });

    closeFeedbackModal();

    const user = getCurrentUser();
    if (user) {
      await loadOrders(document.getElementById("ordersWrapper"), user.id);
    } else {
      renderFilteredOrders();
    }
  } catch (err) {
    console.error("Feedback save failed:", err);
    alert("Unable to save feedback. Please try again.");
  } finally {
    FEEDBACK_SAVING = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  }
}

async function confirmCancel() {
  const reason = document.getElementById("cancelReason").value;
  const note = document.getElementById("cancelNote").value;
  const orderIdForUrl = encodeURIComponent(normalizeOrderIdKey(CANCEL_ORDER_ID));

  if (!reason) {
    alert("Please select a reason");
    return;
  }

  try {
    let res = await fetch(
      `${API_URL}/orders/${orderIdForUrl}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: CANCEL_ORDER_ID,
          status: "CANCELLED",
          cancelled_by: "CUSTOMER",
          cancelled_by_role: "CUSTOMER",
          cancel_actor: "CUSTOMER",
          status_updated_by: "CUSTOMER",
          status_reason: note ? `${reason} - ${note}` : reason,
          customer_reason: note ? `${reason} - ${note}` : reason,
          cancel_reason: reason,
          cancellation_reason: reason,
          reason: note ? `${reason} - ${note}` : reason
        })
      }
    );

    if (!res.ok) {
      res = await fetch(
        `${API_URL}/orders/${orderIdForUrl}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: CANCEL_ORDER_ID,
            status: "REJECTED",
            cancelled_by: "CUSTOMER",
            cancelled_by_role: "CUSTOMER",
            cancel_actor: "CUSTOMER",
            rejected_by: "CUSTOMER",
            rejected_by_role: "CUSTOMER",
            status_updated_by: "CUSTOMER",
            status_reason: note ? `${reason} - ${note}` : reason,
            customer_reason: note ? `${reason} - ${note}` : reason,
            cancel_reason: reason,
            cancellation_reason: reason,
            reason: note ? `${reason} - ${note}` : reason
          })
        }
      );
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Cancel failed");

    markCancelledByCustomer(CANCEL_ORDER_ID);
    setLocalCancelReason(CANCEL_ORDER_ID, note ? `${reason} - ${note}` : reason);
    closeCancelModal();

    const user = getCurrentUser();
    if (user) {
      loadOrders(
        document.getElementById("ordersWrapper"),
        user.id
      );
    }
  } catch (err) {
    console.error("❌ Cancel error:", err);
    alert("Unable to cancel order");
  }
}

function reorder(cart) {
  reorderWithCurrentPrice(cart);
}

async function reorderWithCurrentPrice(oldCart) {
  const parsed = safeParseCart(oldCart);
  if (!parsed.length) {
    alert("No items found to reorder");
    return;
  }

  const first = parsed[0] || {};
  const storeId =
    first.storeId || first.store_id || first.seller_id || first.sellerId;

  if (!storeId) {
    alert("Unable to identify store for reorder");
    return;
  }

  let latestProducts = [];
  try {
    const res = await fetch(`${API_URL}/products?storeId=${storeId}`);
    const data = await res.json();
    latestProducts = Array.isArray(data?.products) ? data.products : [];
  } catch (err) {
    console.error("Reorder price fetch failed:", err);
  }

  const productMap = new Map(
    latestProducts.map(p => [String(p.id), p])
  );

  const nextCart = [];
  let unavailableCount = 0;

  parsed.forEach((item) => {
    const id = Number(item.id || item.product_id || item.productId);
    const qty = Math.max(1, Number(item.qty || item.quantity || 1));
    const latest = productMap.get(String(id));

    if (latest) {
      const stock = Number(latest.stock);
      if (!Number.isNaN(stock) && stock <= 0) {
        unavailableCount += 1;
        return;
      }

      const safeQty = Number.isNaN(stock) ? qty : Math.min(qty, Math.max(stock, 1));
      nextCart.push({
        id: Number(latest.id),
        name: latest.name || item.name || item.product_name || "Product",
        price: Number(latest.price || 0),
        qty: safeQty,
        storeId: latest.store_id || storeId,
        seller_id: latest.seller_id || item.seller_id || null
      });
      return;
    }

    nextCart.push({
      id,
      name: item.name || item.product_name || item.productName || "Product",
      price: Number(item.price || 0),
      qty,
      storeId,
      seller_id: item.seller_id || null
    });
  });

  if (!nextCart.length) {
    alert("All products in this order are unavailable now");
    return;
  }

  const cartKey = getCartKey();
  localStorage.setItem(cartKey, JSON.stringify(nextCart));
  localStorage.setItem("lbCart", JSON.stringify(nextCart));

  if (unavailableCount > 0) {
    alert(`${unavailableCount} item(s) are out of stock and were skipped`);
  }

  window.location.href = "/welcome/customer/checkout/checkout.html";
}

/* =====================================================
   TRACK ORDER POPUP
===================================================== */
const TRACK_FLOW = ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];

function trackOrder(orderId) {
  const info = getOrderActionInsightById(orderId);
  if (!info?.order) {
    alert("Order not found");
    return;
  }

  const order = info.order;
  const stepsBox = document.getElementById("trackSteps");
  if (!stepsBox) {
    alert("Track UI missing");
    return;
  }

  const displayStatus = getDisplayStatus(order);
  const displayLabel = getStatusLabel(order);
  const normalizedStatus = normalizeStatusToken(displayStatus);
  const isTerminal = normalizedStatus === "CANCELLED" || normalizedStatus === "REJECTED";
  const currentIndexRaw = TRACK_FLOW.indexOf(normalizeStatusToken(displayStatus));
  const currentIndex = currentIndexRaw === -1 ? 0 : currentIndexRaw;
  const stopIndex = isTerminal
    ? Math.max(0, Math.min(getTerminalStopIndex(order, normalizedStatus), TRACK_FLOW.length - 1))
    : -1;

  const timelineHtml = getTimelineSteps(order, displayStatus, TRACK_FLOW)
    .map(({ state, label }, i) => {
      let cls = "";
      if (state === "crossed") {
        cls = "crossed";
      } else if (isTerminal) {
        cls = i < stopIndex ? "done" : "active";
      } else if (i < currentIndex) {
        cls = "done";
      } else if (i === currentIndex) {
        cls = "active";
      }

      return `<div class="track-step ${cls}">${label}</div>`;
    })
    .join("");

  if (isTerminal) {
    const actorText = info.actor || (normalizedStatus === "CANCELLED" ? "CUSTOMER" : "SELLER");
    const reasonText = info.reason;
    stepsBox.innerHTML = `
      ${timelineHtml}
      <div class="track-step active">${displayLabel}</div>
      <div class="track-step done">Action By: ${actorText}</div>
      ${reasonText ? `<div class="track-step done">Reason: ${reasonText}</div>` : ""}
    `;
  } else {
    stepsBox.innerHTML = timelineHtml;
  }

  document.getElementById("trackModal")
    .classList.remove("hidden");
}

function closeTrackModal() {
  document.getElementById("trackModal")
    .classList.add("hidden");
}

