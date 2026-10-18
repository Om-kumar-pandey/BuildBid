/* =========================================================
   BUILDBID - CUSTOMER MY ORDERS JAVASCRIPT (my-orders.js)
   Customer / Buyer Role
   Strict User-Wise Ownership & Seller-Controlled Order Tracking
   ========================================================= */

const API_BASE_URL = (typeof window !== "undefined" && window.location && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
  ? "http://localhost:8080"
  : "https://buildbid-ap3j.onrender.com";

function getCleanToken() {
  let token = localStorage.getItem("token") || 
              localStorage.getItem("authToken") || 
              localStorage.getItem("marketplaceToken") || 
              sessionStorage.getItem("token") || "";
  if (!token) return "";
  token = String(token).trim();
  let changed = true;
  while (changed) {
    changed = false;
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      token = token.slice(1, -1).trim();
      changed = true;
    }
    if (token.startsWith("Bearer ")) {
      token = token.substring(7).trim();
      changed = true;
    }
  }
  return token;
}

let currentOrders = [];

/* =========================================================
   INITIALIZATION & DATA LOADING
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  setupUserDisplay();
  setupFilterListeners();
  await loadCustomerOrders();
});

function setupUserDisplay() {
  const userString = localStorage.getItem("currentUser") || 
                     localStorage.getItem("customerUser") || 
                     localStorage.getItem("user") || 
                     sessionStorage.getItem("user");
  let user = {};
  try {
    user = JSON.parse(userString) || {};
  } catch (e) {
    user = {};
  }

  const navUserName = document.getElementById("navUserName");
  const navUserRole = document.getElementById("navUserRole");
  const navAvatar = document.getElementById("navAvatar");

  const displayName = (user.name || user.fullName || user.username || "Customer").toString().trim();
  if (navUserName) {
    const firstName = displayName.split(" ")[0];
    navUserName.textContent = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }

  const role = (user.role || (user.roles && user.roles[0]) || "").toUpperCase();
  const isContractor = role === "CONTRACTOR" || localStorage.getItem("contractorUser") || (window.location.search.includes("role=contractor"));

  if (navUserRole) {
    navUserRole.textContent = isContractor ? "Contractor" : "Customer";
  }

  if (isContractor) {
    const userPill = document.querySelector(".user-pill");
    if (userPill) userPill.setAttribute("onclick", "window.location.href='contractor-dashboard.html'");
    const brandLogo = document.querySelector(".brand-logo");
    if (brandLogo) brandLogo.href = "contractor-dashboard.html";
    const profileLink = document.querySelector(".side-menu a[href='customer dashboard.html']");
    if (profileLink) {
      profileLink.href = "contractor-dashboard.html";
      profileLink.innerHTML = '<i class="fa-solid fa-table-cells-large"></i> Dashboard';
    }
  }

  if (navAvatar && navAvatar.tagName === "IMG") {
    const photo = user.profilePhoto || user.avatarUrl || user.profilePhotoUrl;
    navAvatar.src = photo || `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(displayName)}`;
  }
}

function setupFilterListeners() {
  const searchInput = document.getElementById("orderSearchInput");
  const typeFilter = document.getElementById("orderTypeFilter");
  const statusFilter = document.getElementById("orderStatusFilter");
  const resetBtn = document.getElementById("btnResetFilters");

  if (searchInput) {
    searchInput.addEventListener("input", () => renderOrders());
  }
  if (typeFilter) {
    typeFilter.addEventListener("change", () => renderOrders());
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", () => renderOrders());
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (typeFilter) typeFilter.value = "ALL";
      if (statusFilter) statusFilter.value = "ALL";
      renderOrders();
    });
  }
}

/* =========================================================
   LOAD ACCEPTED ORDERS (AUTHENTICATED CUSTOMER OWNERSHIP)
   ========================================================= */
async function loadCustomerOrders() {
  const token = getCleanToken();
  const container = document.getElementById("ordersContainer");

  if (!token) {
    if (container) {
      container.innerHTML = `
        <div style="background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 14px; padding: 48px; text-align: center;">
          <i class="fa-solid fa-lock" style="font-size: 42px; color: #94a3b8; margin-bottom: 14px;"></i>
          <h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Authentication Required / प्रमाणीकरण आवश्यक</h4>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">Please log in with your verified customer account to view your orders.</p>
          <a href="index.html" class="btn-view-details" style="display: inline-flex;">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Login to BuildBid
          </a>
        </div>
      `;
    }
    updateMetricCards(0, 0, 0);
    return;
  }

  try {
    // 1. Fetch from secure dedicated endpoint: /api/material-orders/customer
    let res = await fetch(`${API_BASE_URL}/api/material-orders/customer`, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    // Fallback to /api/material-orders/buyer if customer-specific endpoint is in transition
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/api/material-orders/buyer`, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      });
    }

    if (!res.ok) {
      if (res.status === 401) {
        showToast("Session expired. Please log in again.", "warning");
      } else if (res.status === 403) {
        showToast("Access denied. Authorized account required.", "danger");
      }
      currentOrders = [];
      updateMetricCards(0, 0, 0);
      renderOrders();
      return;
    }

    const data = await res.json();
    currentOrders = [];

    if (Array.isArray(data)) {
      data.forEach(item => {
        const rawStatus = extractOrderStatus(item);
        
        // Strict Business Rule: Filter out any unaccepted/waiting orders
        if (!isAcceptedStatus(rawStatus)) {
          return;
        }

        const isDirectBuy = (item.type === "DIRECT_BUY") || (item.orderId && String(item.orderId).startsWith("DMR-"));
        const orderCode = item.orderCode || item.orderId || `ORD-${item.id}`;

        currentOrders.push({
          id: item.id,
          orderId: orderCode,
          orderCode: orderCode,
          backendId: item.backendId || item.id,
          type: isDirectBuy ? "DIRECT_BUY" : "MULTI_SELLER",
          typeLabel: isDirectBuy ? "Direct Buy Order / सीधा खरीद" : "Multi-Seller Allocation / मल्टी-विक्रेता",
          masterReqId: item.businessRequestId || (item.materialRequestId ? `MR-${item.materialRequestId}` : null),
          materialTitle: item.materialTitle || (item.items && item.items.length > 0 ? item.items.map(i => i.materialName).join(", ") : "Building Materials"),
          sellerId: item.sellerId,
          sellerName: item.sellerBusinessName || item.sellerName || "Verified Supplier",
          sellerPhone: item.sellerPhone || "",
          sellerEmail: item.sellerEmail || "",
          sellerLocation: item.sellerLocation || item.sellerAddress || "Regional Warehouse",
          deliverySite: item.deliveryAddress || item.deliverySite || "Project Site",
          status: rawStatus,
          orderedDate: item.submittedDate || (item.submittedTimestamp ? formatTimestampIST(item.submittedTimestamp) : (item.createdAt ? formatTimestampIST(item.createdAt) : "Recently")),
          expectedDeliveryDate: item.expectedDeliveryDate || "Pending confirmation",
          verificationCode: item.verificationCode || "",
          notes: item.specialNotes || item.notes || item.description || "",
          items: item.items || [],
          subtotal: Number(item.materialAmount || item.subtotal || 0),
          freight: Number(item.transportationAmount || item.deliveryCharges || item.freight || 0),
          tax: Number(item.taxGst || item.taxAmount || item.tax || 0),
          totalAmount: Number(item.totalAmount || 0)
        });
      });
    }

    renderMetrics();
    renderOrders();

  } catch (err) {
    console.error("Failed to load customer orders:", err);
    currentOrders = [];
    updateMetricCards(0, 0, 0);
    renderOrders();
  }
}

/* =========================================================
   STATUS MAPPING & 5-STAGE PIPELINE HELPERS
   ========================================================= */

function extractOrderStatus(item) {
  if (!item) return "CONFIRMED";
  const candidates = [item.deliveryStatus, item.orderStatus, item.rawStatus, item.status];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) {
      return c.trim().toUpperCase();
    }
  }
  return "CONFIRMED";
}

function isAcceptedStatus(status) {
  if (!status) return false;
  const s = String(status).trim().toUpperCase();
  if (!s || s === "WAITING_FOR_ACCEPTANCE" || s === "NEW" || s === "CANCELLED" || 
      s === "DECLINED" || s === "REJECTED" || s === "EXPIRED" || s === "DRAFT" || s === "UNACCEPTED") {
    return false;
  }
  return true;
}

/**
 * Exactly 4 Customer Progress Stages:
 * 1 = Processing
 * 2 = Order Dispatched
 * 3 = Out for Delivery
 * 4 = Delivered
 */
function getStageIndex(status) {
  const s = (typeof status === "string" ? status.trim() : "").toUpperCase();
  if (s.includes("DELIVERED") || (s.includes("COMPLETED") && !s.includes("PROCESSING")) || s.includes("डिलीवर")) return 4;
  if (s.includes("OUT_FOR_DELIVERY") || s.includes("OUT FOR DELIVERY") || s.includes("रवाना") || s.includes("निकल चुका")) return 3;
  if (s.includes("IN_TRANSIT") || s.includes("TRANSIT") || s.includes("DISPATCHED") || s.includes("DISPATCH") || s.includes("READY_TO_DISPATCH") || s.includes("READY_FOR_DISPATCH") || s.includes("DELAYED") || s.includes("RETURNED") || s.includes("भेजा") || s.includes("रास्ते")) return 2;
  // PROCESSING, PROCESSED, ACCEPTED, ORDER_ACCEPTED, CONFIRMED
  return 1;
}

function getStatusDetails(status) {
  const step = getStageIndex(status);
  const s = (typeof status === "string" ? status.trim() : "").toUpperCase();

  if (step === 4) {
    return {
      step: 4,
      titleEn: "Delivered",
      titleHi: "डिलीवर हो गया",
      badgeClass: "status-delivered",
      icon: "fa-solid fa-circle-check",
      stateTag: "— COMPLETED",
      substatus: "DELIVERED"
    };
  }

  if (step === 3) {
    if (s.includes("FAILED")) {
      return {
        step: 3,
        titleEn: "Delivery Failed",
        titleHi: "डिलीवरी असफल",
        badgeClass: "status-delayed",
        icon: "fa-solid fa-circle-xmark",
        stateTag: "— FAILED",
        substatus: "DELIVERY_FAILED"
      };
    }
    return {
      step: 3,
      titleEn: "Out for Delivery",
      titleHi: "डिलीवरी के लिए निकल चुका है",
      badgeClass: "status-transit",
      icon: "fa-solid fa-truck-fast",
      stateTag: "— CURRENT",
      substatus: "OUT_FOR_DELIVERY"
    };
  }

  if (step === 2) {
    if (s.includes("IN_TRANSIT") || s.includes("TRANSIT") || s.includes("रास्ते")) {
      return {
        step: 2,
        titleEn: "In Transit",
        titleHi: "रास्ते में",
        badgeClass: "status-transit",
        icon: "fa-solid fa-truck-moving",
        stateTag: "— CURRENT",
        substatus: "IN_TRANSIT"
      };
    }
    if (s.includes("READY_TO_DISPATCH") || s.includes("READY_FOR_DISPATCH") || s.includes("READY")) {
      return {
        step: 2,
        titleEn: "Ready for Dispatch",
        titleHi: "भेजने के लिए तैयार",
        badgeClass: "status-dispatch",
        icon: "fa-solid fa-box",
        stateTag: "— CURRENT",
        substatus: "READY_TO_DISPATCH"
      };
    }
    if (s.includes("DELAYED") || s.includes("विलंबित") || s.includes("देरी")) {
      return {
        step: 2,
        titleEn: "Delayed",
        titleHi: "विलंबित / देरी",
        badgeClass: "status-delayed",
        icon: "fa-solid fa-triangle-exclamation",
        stateTag: "— DELAYED",
        substatus: "DELAYED"
      };
    }
    if (s.includes("RETURNED")) {
      return {
        step: 2,
        titleEn: "Returned",
        titleHi: "वापस लौटा दिया गया",
        badgeClass: "status-dispatch",
        icon: "fa-solid fa-arrow-rotate-left",
        stateTag: "— RETURNED",
        substatus: "RETURNED"
      };
    }
    return {
      step: 2,
      titleEn: "Order Dispatched",
      titleHi: "ऑर्डर भेजा गया",
      badgeClass: "status-dispatch",
      icon: "fa-solid fa-box-open",
      stateTag: "— CURRENT",
      substatus: "DISPATCHED"
    };
  }

  // step === 1
  return {
    step: 1,
    titleEn: "Processing",
    titleHi: "प्रक्रिया में",
    badgeClass: "status-processing",
    icon: "fa-solid fa-gear",
    stateTag: "— CURRENT",
    substatus: "PROCESSING"
  };
}

function formatTimestampIST(val) {
  if (!val) return "Recently";
  if (typeof val === "string" && /^[0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4}/.test(val)) {
    return val;
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch (e) {
    return String(val);
  }
}

/* =========================================================
   3 SUMMARY METRIC CARDS ONLY
   ========================================================= */
function renderMetrics() {
  const total = currentOrders.length;
  // In Fulfillment: active orders between Processing and Out for Delivery (steps 1 through 3)
  const inFulfill = currentOrders.filter(o => {
    const step = getStageIndex(o.status);
    return step >= 1 && step <= 3;
  }).length;
  // Delivered: orders at step 4
  const delivered = currentOrders.filter(o => getStageIndex(o.status) === 4).length;

  updateMetricCards(total, inFulfill, delivered);
}

function updateMetricCards(total, inFulfill, delivered) {
  const totalElem = document.getElementById("statTotalOrders");
  const inFulfillElem = document.getElementById("statInFulfillment");
  const deliveredElem = document.getElementById("statDelivered");

  if (totalElem) totalElem.textContent = total;
  if (inFulfillElem) inFulfillElem.textContent = inFulfill;
  if (deliveredElem) deliveredElem.textContent = delivered;
}

/* =========================================================
   ORDERS FEED RENDERING
   ========================================================= */
function renderOrders() {
  const container = document.getElementById("ordersContainer");
  if (!container) return;

  const searchVal = (document.getElementById("orderSearchInput")?.value || "").toLowerCase().trim();
  const typeFilter = document.getElementById("orderTypeFilter")?.value || "ALL";
  const statusFilter = document.getElementById("orderStatusFilter")?.value || "ALL";

  const filtered = currentOrders.filter(o => {
    if (searchVal) {
      const matchId = (o.orderId || "").toLowerCase().includes(searchVal);
      const matchSeller = (o.sellerName || "").toLowerCase().includes(searchVal);
      const matchMat = (o.materialTitle || "").toLowerCase().includes(searchVal);
      if (!matchId && !matchSeller && !matchMat) return false;
    }

    if (typeFilter !== "ALL" && o.type !== typeFilter) return false;

    if (statusFilter !== "ALL") {
      const step = getStageIndex(o.status);
      const rawStatus = (o.status || "").toUpperCase();
      if (statusFilter === "PROCESSING" || statusFilter === "ACCEPTED") {
        if (step !== 1 && !rawStatus.includes("ACCEPT") && !rawStatus.includes("CONFIRM") && !rawStatus.includes("PROCESS")) return false;
      } else if (statusFilter === "DISPATCHED" || statusFilter === "READY_FOR_DISPATCH" || statusFilter === "IN_TRANSIT") {
        if (step !== 2 && !rawStatus.includes("DISPATCH") && !rawStatus.includes("READY") && !rawStatus.includes("TRANSIT")) return false;
      } else if (statusFilter === "OUT_FOR_DELIVERY") {
        if (step !== 3 && !rawStatus.includes("OUT_FOR_DELIVERY") && !rawStatus.includes("OUT FOR DELIVERY")) return false;
      } else if (statusFilter === "DELIVERED" || statusFilter === "COMPLETED") {
        if (step !== 4 && !rawStatus.includes("DELIVER") && !rawStatus.includes("COMPLET")) return false;
      }
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 14px; padding: 48px 24px; text-align: center;">
        <i class="fa-solid fa-boxes-packing" style="font-size: 44px; color: #94a3b8; margin-bottom: 14px;"></i>
        <h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">No Orders Found / कोई ऑर्डर नहीं मिला</h4>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px; max-width: 500px; margin-left: auto; margin-right: auto;">
          ${currentOrders.length === 0 
            ? "You have no accepted orders in fulfillment yet. Orders will appear here once accepted by verified suppliers." 
            : "No accepted orders match your active filter criteria. Try resetting your search filters."}
        </p>
        <a href="buy-material-select.html" class="btn-banner-action primary" style="display: inline-flex;">
          <i class="fa-solid fa-cart-shopping"></i> Buy Materials Now
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => createOrderCardHTML(order)).join("");
}

function createOrderCardHTML(order) {
  const currentStep = getStageIndex(order.status);
  const statusInfo = getStatusDetails(order.status);
  const formattedTotal = Number(order.totalAmount).toLocaleString("en-IN");

  const itemsRows = (order.items && order.items.length > 0)
    ? order.items.map(it => `
        <tr>
          <td><strong>${escapeHtml(it.materialName || "Material Item")}</strong></td>
          <td style="color: #64748b;">${it.quantity} ${escapeHtml(it.unit || "")}</td>
          <td style="color: #0284c7; font-weight: 600;">₹${Number(it.unitPrice || 0).toLocaleString("en-IN")} / ${escapeHtml(it.unit || "unit")}</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">₹${Number(it.subtotal || it.totalPrice || (it.quantity * it.unitPrice) || 0).toLocaleString("en-IN")}</td>
        </tr>
      `).join("")
    : `
        <tr>
          <td colspan="4" style="color: #64748b;">${escapeHtml(order.materialTitle || "Procurement Material Order")}</td>
        </tr>
      `;

  const isDeliveredLifecycle = (currentStep === 4);

  // Exactly 4 Visible Progress Stages
  const stages = [
    { step: 1, titleEn: "Processing", titleHi: "प्रक्रिया में" },
    {
      step: 2,
      titleEn: (currentStep === 2 && statusInfo.substatus === "IN_TRANSIT") ? "In Transit" :
               (currentStep === 2 && statusInfo.substatus === "READY_TO_DISPATCH") ? "Ready for Dispatch" :
               (currentStep === 2 && statusInfo.substatus === "DELAYED") ? "Delayed" : "Order Dispatched",
      titleHi: (currentStep === 2 && statusInfo.substatus === "IN_TRANSIT") ? "रास्ते में" :
               (currentStep === 2 && statusInfo.substatus === "READY_TO_DISPATCH") ? "भेजने के लिए तैयार" :
               (currentStep === 2 && statusInfo.substatus === "DELAYED") ? "विलंबित" : "ऑर्डर भेजा गया"
    },
    { step: 3, titleEn: "Out for Delivery", titleHi: "डिलीवरी के लिए निकल चुका है" },
    { step: 4, titleEn: "Delivered", titleHi: "डिलीवर हो गया" }
  ];

  const timelineStepsHTML = stages.map((st, idx) => {
    let stateClass = "upcoming";
    let circleContent = `${st.step}`;
    let tagHTML = "";

    if (isDeliveredLifecycle) {
      // Delivered lifecycle: all 4 steps completed with checkmark
      stateClass = "completed";
      circleContent = '<i class="fa-solid fa-check"></i>';
      tagHTML = '<span class="step-status-tag step-tag-completed"><i class="fa-solid fa-check"></i> Completed</span>';
    } else if (st.step < currentStep) {
      // Completed preceding steps
      stateClass = "completed";
      circleContent = '<i class="fa-solid fa-check"></i>';
      tagHTML = '<span class="step-status-tag step-tag-completed"><i class="fa-solid fa-check"></i> Completed</span>';
    } else if (st.step === currentStep) {
      // Current active incomplete step with rotating loader ring
      stateClass = "current";
      circleContent = `${st.step}`;
      tagHTML = '<span class="step-status-tag step-tag-current"><span class="step-tag-pulse-dot"></span> CURRENT</span>';
    } else {
      // Future steps
      stateClass = "upcoming";
      circleContent = `${st.step}`;
      tagHTML = '';
    }

    const isLast = (idx === stages.length - 1);
    let lineClass = "";
    if (!isLast) {
      if (isDeliveredLifecycle || st.step < currentStep) {
        lineClass = "line-completed";
      } else {
        lineClass = "line-upcoming";
      }
    }

    return `
      <div class="progress-step-4 ${stateClass}">
        ${!isLast ? `<div class="step-connector-line ${lineClass}"></div>` : ""}
        <div class="step-circle-wrapper">
          <div class="step-circle">${circleContent}</div>
        </div>
        <div>
          <div class="step-title">${st.titleEn}</div>
          <div class="step-subtitle">${st.titleHi}</div>
          ${tagHTML ? `<div class="step-tag-wrapper">${tagHTML}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="order-card" id="card-${escapeHtml(order.orderId)}">
      <!-- Order Header Bar -->
      <div class="order-header-bar">
        <div>
          <div class="order-header-left">
            <span class="type-badge ${order.type === 'DIRECT_BUY' ? 'direct-buy' : 'material-requirement'}">
              <i class="fa-solid ${order.type === 'DIRECT_BUY' ? 'fa-cart-shopping' : 'fa-layer-group'}"></i> ${order.typeLabel}
            </span>
            <span class="order-id-badge">${escapeHtml(order.orderId)}</span>
            ${order.masterReqId ? `<span class="order-parent-link">Parent: <strong>${escapeHtml(order.masterReqId)}</strong></span>` : ""}
          </div>
          <div class="order-date-text">
            <i class="fa-regular fa-clock" style="margin-right: 4px;"></i> Ordered: ${order.orderedDate}
          </div>
        </div>

        <div class="order-header-right">
          <span class="order-status-pill ${statusInfo.badgeClass}">
            <i class="${statusInfo.icon}"></i> ${statusInfo.titleEn} / ${statusInfo.titleHi} ${statusInfo.stateTag}
          </span>
          <div class="order-total-amount">
            ₹${formattedTotal}
          </div>
        </div>
      </div>

      <!-- Order Body -->
      <div class="order-body">
        <div class="order-info-grid">
          <div class="seller-profile-box">
            <h4>
              <i class="fa-solid fa-store" style="color: #0284c7;"></i> ${escapeHtml(order.sellerName)}
              <span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-weight: 700;">Verified Seller</span>
            </h4>
            <div class="seller-details-meta">
              <div><i class="fa-solid fa-location-dot" style="color: #64748b; margin-right: 6px;"></i> ${escapeHtml(order.sellerLocation)}</div>
              <div style="margin-top: 3px;"><i class="fa-solid fa-truck-ramp-box" style="color: #64748b; margin-right: 6px;"></i> Delivery Site: <strong>${escapeHtml(order.deliverySite)}</strong></div>
            </div>
          </div>

          <div class="delivery-date-card">
            <div class="delivery-date-label">
              <i class="fa-regular fa-calendar-check" style="color: #0284c7; margin-right: 4px;"></i> Expected Delivery
            </div>
            <div class="delivery-date-value">
              ${escapeHtml(order.expectedDeliveryDate)}
            </div>
          </div>
        </div>

        ${order.verificationCode ? `
          <div style="background: #f0fdf4; border: 1px dashed #86efac; border-radius: 8px; padding: 8px 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
            <span style="color: #166534; font-weight: 700;">
              <i class="fa-solid fa-shield-halved" style="color: #16a34a; margin-right: 6px;"></i> Delivery Verification Code:
            </span>
            <span style="font-family: monospace; font-size: 14px; font-weight: 800; color: #14532d; letter-spacing: 1px;">
              ${escapeHtml(order.verificationCode)}
            </span>
          </div>
        ` : ""}
        ${order.notes ? `
          <p style="font-size: 13px; color: #475569; margin: 0 0 12px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <strong>Notes:</strong> ${escapeHtml(order.notes)}
          </p>
        ` : ""}

        <!-- Material Item Table -->
        <table class="order-items-table">
          <thead>
            <tr>
              <th>Material / Item Description</th>
              <th>Quantity</th>
              <th>Rate / Unit Price</th>
              <th style="text-align: right;">Total (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Order Progress Tracker -->
        <div class="order-progress-section">
          <div class="order-progress-header">
            <span class="order-progress-title">
              <i class="fa-solid fa-route"></i> Order Progress / पूर्ति की प्रगति
            </span>
          </div>

          <div class="progress-timeline-4">
            ${timelineStepsHTML}
          </div>
        </div>
      </div>

      <!-- Order Card Footer -->
      <div class="order-card-footer">
        <div class="seller-contact-note">
          <i class="fa-solid fa-shield-halved" style="color: #16a34a; margin-right: 4px;"></i>
          ${order.sellerPhone 
            ? `<span>Seller Contact: <strong>${escapeHtml(order.sellerPhone)}</strong></span>` 
            : `<span>Seller contact details shared securely for order dispatch.</span>`}
        </div>

        <button type="button" class="btn-view-details" onclick="openOrderDetailsModal('${escapeHtml(order.orderId)}')">
          <i class="fa-solid fa-receipt"></i> View Order Details
        </button>
      </div>
    </div>
  `;
}

/* =========================================================
   ORDER DETAILS MODAL
   ========================================================= */
function openOrderDetailsModal(orderId) {
  const order = currentOrders.find(o => o.orderId === orderId);
  if (!order) return;

  const modal = document.getElementById("orderDetailsModal");
  const title = document.getElementById("modalOrderIdTitle");
  const subtitle = document.getElementById("modalOrderSubtitle");
  const badge = document.getElementById("modalOrderTypeBadge");
  const content = document.getElementById("modalOrderContent");

  if (title) title.textContent = `Order #${order.orderId}`;
  if (subtitle) subtitle.textContent = `Fulfilling Seller: ${order.sellerName} (${order.sellerLocation})`;
  if (badge) {
    badge.innerHTML = `<i class="fa-solid ${order.type === 'DIRECT_BUY' ? 'fa-cart-shopping' : 'fa-layer-group'}"></i> ${order.typeLabel}`;
  }

  const itemsRows = (order.items && order.items.length > 0)
    ? order.items.map(it => `
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
          <div>
            <strong>${escapeHtml(it.materialName)}</strong>
            <div style="font-size: 11px; color: #64748b;">${it.quantity} ${escapeHtml(it.unit || '')} @ ₹${Number(it.unitPrice || 0).toLocaleString('en-IN')}</div>
          </div>
          <div style="font-weight: 700; color: #0f172a;">
            ₹${Number(it.subtotal || (it.quantity * it.unitPrice) || 0).toLocaleString('en-IN')}
          </div>
        </div>
      `).join("")
    : `
        <div style="padding: 10px 0; font-size: 13px; color: #64748b;">
          ${escapeHtml(order.materialTitle || "Standard Material Order")}
        </div>
      `;

  const statusInfo = getStatusDetails(order.status);

  if (content) {
    content.innerHTML = `
      <div style="padding: 20px;">
        <!-- Status summary banner -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Current Milestone</div>
            <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">
              ${statusInfo.titleEn} / ${statusInfo.titleHi}
            </div>
          </div>
          <span class="order-status-pill ${statusInfo.badgeClass}">
            <i class="${statusInfo.icon}"></i> ${statusInfo.stateTag}
          </span>
        </div>

        <!-- Items Breakdown -->
        <h5 style="font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Order Line Items</h5>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 16px; margin-bottom: 20px;">
          ${itemsRows}
        </div>

        <!-- Financial Summary -->
        <h5 style="font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Financial Snapshot</h5>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748b;">Material Subtotal:</span>
            <span style="font-weight: 600;">₹${Number(order.subtotal).toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748b;">Transportation / Freight:</span>
            <span style="font-weight: 600;">₹${Number(order.freight).toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">
            <span style="color: #64748b;">Applicable GST / Taxes:</span>
            <span style="font-weight: 600;">₹${Number(order.tax).toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #0f172a;">
            <span>Total Commercial Value:</span>
            <span>₹${Number(order.totalAmount).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <!-- Fulfillment & Delivery Details -->
        <h5 style="font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Delivery & Logistics</h5>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; font-size: 13px; line-height: 1.6;">
          <div><strong style="color: #475569;">Delivery Site:</strong> ${escapeHtml(order.deliverySite)}</div>
          <div><strong style="color: #475569;">Expected Delivery Date:</strong> ${escapeHtml(order.expectedDeliveryDate)}</div>
          <div><strong style="color: #475569;">Supplier Business:</strong> ${escapeHtml(order.sellerName)}</div>
          <div><strong style="color: #475569;">Supplier Depot:</strong> ${escapeHtml(order.sellerLocation)}</div>
          ${order.sellerPhone ? `<div><strong style="color: #475569;">Contact Number:</strong> ${escapeHtml(order.sellerPhone)}</div>` : ''}
          ${order.sellerEmail ? `<div><strong style="color: #475569;">Email:</strong> ${escapeHtml(order.sellerEmail)}</div>` : ''}
        </div>
      </div>
    `;
  }

  if (modal) {
    modal.classList.add("active");
  }
}

function closeOrderDetailsModal() {
  const modal = document.getElementById("orderDetailsModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

window.addEventListener("click", (e) => {
  const modal = document.getElementById("orderDetailsModal");
  if (modal && e.target === modal) {
    closeOrderDetailsModal();
  }
});

/* =========================================================
   UTILITIES
   ========================================================= */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'danger' ? 'fa-circle-xmark' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info')}"></i>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
