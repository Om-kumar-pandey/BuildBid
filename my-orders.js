/* =========================================================
   BUILDBID - MY ORDERS JAVASCRIPT (my-orders.js)
   Buyer Role (Customer / Contractor / Professional)
   Order Tracking for Direct Buy & Multi-Seller Allocations
   ========================================================= */

const API_BASE_URL = (typeof window !== "undefined" && window.location && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
  ? "http://localhost:8080"
  : "https://buildbid-ap3j.onrender.com";

function getCleanToken() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) return null;
  return token.replace(/^"(.*)"$/, "$1").trim();
}

/* =========================================================
   1. MOCK ORDERS DATASET (DEMO / OFFLINE FALLBACK)
   ========================================================= */
const INITIAL_ORDERS_DATA = [
  {
    orderId: "BB-ORD-DB-001",
    type: "DIRECT_BUY",
    typeLabel: "Direct Buy Order / सीधा खरीद ऑर्डर",
    masterReqId: null,
    materialTitle: "OPC 53 Grade Cement (UltraTech)",
    sellerId: 101,
    sellerName: "ABC Building Materials",
    sellerPhone: "+91 98112 34567",
    sellerLocation: "Sector 63, Noida",
    deliverySite: "Plot 42, Block B, Industrial Corridor, Sector 62, Noida",
    status: "WAITING_FOR_ACCEPTANCE",
    statusEn: "Waiting for Acceptance",
    statusHi: "विक्रेता की स्वीकृति की प्रतीक्षा",
    orderedDate: "Today, 10:30 AM",
    expectedDeliveryDate: "Tomorrow by 4:00 PM",
    items: [
      { materialName: "OPC 53 Grade Cement (50kg bag)", quantity: 100, unit: "Bags", unitPrice: 380, totalPrice: 38000 }
    ],
    subtotal: 38000,
    freight: 1000,
    tax: 0,
    totalAmount: 39000
  },
  {
    orderId: "BB-ORD-MS-101",
    type: "MULTI_SELLER",
    typeLabel: "Multi-Seller Allocation / मल्टी-विक्रेता ऑर्डर",
    masterReqId: "BB-REQ-002",
    masterReqTitle: "Fe-550D TMT Steel Rebars (2.5 MT)",
    materialTitle: "Fe-550D TMT Steel 12mm & 16mm",
    sellerId: 201,
    sellerName: "Apex Steel & Infrastructure Corp",
    sellerPhone: "+91 98234 11223",
    sellerLocation: "Ecotech 3, Greater Noida",
    deliverySite: "Gaur City 2, Tower 7 Construction Zone, Greater Noida West",
    status: "PROCESSING",
    statusEn: "Processing",
    statusHi: "प्रक्रिया में",
    orderedDate: "Yesterday, 03:15 PM",
    expectedDeliveryDate: "5 Oct 2026",
    items: [
      { materialName: "Tata Tiscon Fe-550D 12mm Rebars", quantity: 1000, unit: "kg", unitPrice: 58.0, totalPrice: 58000 },
      { materialName: "Tata Tiscon Fe-550D 16mm Rebars", quantity: 1000, unit: "kg", unitPrice: 56.0, totalPrice: 56000 }
    ],
    subtotal: 114000,
    freight: 3500,
    tax: 5875,
    totalAmount: 123375
  },
  {
    orderId: "BB-ORD-MS-102",
    type: "MULTI_SELLER",
    typeLabel: "Multi-Seller Allocation / मल्टी-विक्रेता ऑर्डर",
    masterReqId: "BB-REQ-002",
    masterReqTitle: "Fe-550D TMT Steel Rebars (2.5 MT)",
    materialTitle: "Fe-550D TMT Steel 12mm",
    sellerId: 202,
    sellerName: "Kisan Iron & Steel Mart",
    sellerPhone: "+91 97180 99887",
    sellerLocation: "Dadri Road, Greater Noida",
    deliverySite: "Gaur City 2, Tower 7 Construction Zone, Greater Noida West",
    status: "ACCEPTED",
    statusEn: "Order Accepted",
    statusHi: "ऑर्डर स्वीकार किया गया",
    orderedDate: "Yesterday, 03:15 PM",
    expectedDeliveryDate: "6 Oct 2026",
    items: [
      { materialName: "Tata Tiscon Fe-550D 12mm Rebars", quantity: 500, unit: "kg", unitPrice: 59.0, totalPrice: 29500 }
    ],
    subtotal: 29500,
    freight: 1500,
    tax: 1550,
    totalAmount: 32550
  }
];

let currentOrders = [];

/* =========================================================
   2. INITIALIZATION & LIVE DATA FETCHING
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  setupNavbarAndUser();
  setupToolbarListeners();
  await loadBuyerOrders();
});

function setupNavbarAndUser() {
  const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
  const userNameElem = document.getElementById("navUserName");
  const userRoleElem = document.getElementById("navUserRole");
  const initialsElem = document.getElementById("navUserInitials");
  const sideNameElem = document.getElementById("sidebarUserName");

  if (user && user.name) {
    if (userNameElem) userNameElem.textContent = user.name;
    if (sideNameElem) sideNameElem.textContent = user.name;
    if (userRoleElem) userRoleElem.textContent = user.role || "Buyer";
    if (initialsElem) {
      const parts = user.name.trim().split(" ");
      initialsElem.textContent = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
    }
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.dataset.bound = "true";
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("customerUser");
      localStorage.removeItem("marketplaceToken");
      localStorage.removeItem("marketplaceUser");
      localStorage.removeItem("authToken");
      localStorage.removeItem("buildbid_user");
      localStorage.removeItem("buildbid_current_user");
      sessionStorage.removeItem("pendingRedirect");
      sessionStorage.removeItem("userData");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("currentUser");
      sessionStorage.clear();
      showLogoutToast(() => {
        window.location.href = "index.html";
      });
    });
  }
}

async function loadBuyerOrders() {
  const token = getCleanToken();
  if (token) {
    currentOrders = [];
    try {
      // 1. Fetch material orders
      const ordersRes = await fetch(`${API_BASE_URL}/api/material-orders/buyer`, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      });

      if (ordersRes.ok) {
        const orderData = await ordersRes.json();
        if (Array.isArray(orderData)) {
          orderData.forEach(o => {
            currentOrders.push({
              orderId: `ORD-${o.id}`,
              backendId: o.id,
              type: "MULTI_SELLER",
              typeLabel: "Multi-Seller Allocation / मल्टी-विक्रेता ऑर्डर",
              masterReqId: o.materialRequestId ? `MR-${o.materialRequestId}` : null,
              masterReqTitle: o.requirementTitle || "Material Requirement Procurement",
              materialTitle: o.items && o.items.length > 0 ? o.items.map(it => it.materialName).join(", ") : "Material Order",
              sellerId: o.sellerId,
              sellerName: o.sellerName || "Verified Supplier",
              sellerBusinessName: o.sellerBusinessName || o.sellerName,
              sellerPhone: o.sellerPhone,
              sellerEmail: o.sellerEmail,
              sellerLocation: o.sellerLocation || "Regional Supplier Depot",
              sellerAddress: o.sellerAddress || o.sellerLocation,
              deliverySite: o.deliveryAddress || "Site Location",
              status: (o.orderStatus || "PROCESSING").toUpperCase(),
              statusEn: getStatusLabelEn(o.orderStatus),
              statusHi: getStatusLabelHi(o.orderStatus),
              orderedDate: o.submittedDate || (o.submittedTimestamp ? formatTimestampIST(o.submittedTimestamp) : (o.createdAt ? formatTimestampIST(o.createdAt) : "Recently")),
              expectedDeliveryDate: o.expectedDeliveryDate || "Not specified",
              items: o.items || [],
              subtotal: o.subtotal || 0,
              freight: o.deliveryCharges || 0,
              tax: o.taxAmount || 0,
              totalAmount: o.totalAmount || 0
            });
          });
        }
      }

      // 2. Fetch Direct Buy requests from /api/customer/my-requests
      const reqRes = await fetch(`${API_BASE_URL}/api/customer/my-requests`, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      });

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        if (Array.isArray(reqData)) {
          reqData.filter(r => r.type === "DIRECT_BUY" || r.isDirectBuy).forEach(db => {
            currentOrders.push({
              orderId: db.id,
              backendId: db.backendId || db.id,
              type: "DIRECT_BUY",
              typeLabel: "Direct Buy Order / सीधा खरीद ऑर्डर",
              masterReqId: null,
              materialTitle: db.material || db.title,
              sellerId: db.sellerId,
              sellerName: db.sellerName || db.targetProvider || "Verified Seller",
              sellerBusinessName: db.sellerBusinessName || db.sellerName || db.targetProvider,
              sellerPhone: db.sellerPhone,
              sellerEmail: db.sellerEmail,
              sellerLocation: db.sellerLocation || "Regional Depot",
              sellerAddress: db.sellerAddress || db.sellerLocation,
              deliverySite: db.deliverySite || db.location || "Site Address",
              status: (db.rawStatus || db.status || "WAITING_FOR_ACCEPTANCE").toUpperCase(),
              statusEn: db.statusEn || getStatusLabelEn(db.status),
              statusHi: db.statusHi || getStatusLabelHi(db.status),
              orderedDate: db.submittedDate || (db.submittedTimestamp ? formatTimestampIST(db.submittedTimestamp) : "Recently"),
              expectedDeliveryDate: db.expectedDeliveryDate || "Pending confirmation",
              items: [
                { materialName: db.material || db.title, quantity: parseFloat(db.quantity) || 1, unit: "Lot", unitPrice: db.materialPrice || db.materialAmount || 0, totalPrice: db.materialAmount || db.estimatedTotal || 0 }
              ],
              subtotal: db.materialAmount || 0,
              freight: db.transportationCost || 0,
              tax: 0,
              totalAmount: db.estimatedTotal || db.materialAmount || 0
            });
          });
        }
      }
    } catch (e) {
      console.warn("Failed to fetch live buyer orders, fallback to initial data:", e);
      currentOrders = [...INITIAL_ORDERS_DATA];
    }
  } else {
    currentOrders = [...INITIAL_ORDERS_DATA];
  }

  renderMetrics();
  renderOrders();
}

function formatTimestampIST(val) {
  if (!val) return "Recently";
  if (typeof val === 'string' && /^[0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4}/.test(val)) {
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

function getStatusLabelEn(s) {
  const str = (s || "").toUpperCase();
  if (str.includes("DELIVERED") || str.includes("डिलीवर")) return "Delivered";
  if (str.includes("OUT_FOR_DELIVERY") || str.includes("रवाना") || str.includes("OUT FOR DELIVERY")) return "Out for Delivery";
  if (str.includes("READY_FOR_DISPATCH") || str.includes("तैयार") || str.includes("READY FOR DISPATCH")) return "Ready for Dispatch";
  if (str.includes("PROCESSING") || str.includes("प्रक्रिया")) return "Processing";
  if (str.includes("ACCEPTED") || str.includes("स्वीकार") || str.includes("ORDER ACCEPTED")) return "Order Accepted";
  return "Waiting for Acceptance";
}

function getStatusLabelHi(s) {
  const str = (s || "").toUpperCase();
  if (str.includes("DELIVERED") || str.includes("डिलीवर")) return "डिलीवर हो गया";
  if (str.includes("OUT_FOR_DELIVERY") || str.includes("रवाना") || str.includes("OUT FOR DELIVERY")) return "डिलीवरी के लिए रवाना";
  if (str.includes("READY_FOR_DISPATCH") || str.includes("तैयार") || str.includes("READY FOR DISPATCH")) return "भेजने के लिए तैयार";
  if (str.includes("PROCESSING") || str.includes("प्रक्रिया")) return "प्रक्रिया में";
  if (str.includes("ACCEPTED") || str.includes("स्वीकार") || str.includes("ORDER ACCEPTED")) return "ऑर्डर स्वीकार किया गया";
  return "विक्रेता की स्वीकृति की प्रतीक्षा";
}

function getStepIndex(status) {
  const s = (status || "").toUpperCase();
  if (s.includes("DELIVERED") || s.includes("डिलीवर")) return 6;
  if (s.includes("OUT_FOR_DELIVERY") || s.includes("रवाना") || s.includes("OUT FOR DELIVERY")) return 5;
  if (s.includes("READY_FOR_DISPATCH") || s.includes("तैयार") || s.includes("READY FOR DISPATCH")) return 4;
  if (s.includes("PROCESSING") || s.includes("प्रक्रिया")) return 3;
  if (s.includes("ACCEPTED") || s.includes("स्वीकार") || s.includes("ORDER ACCEPTED")) return 2;
  return 1;
}

/* =========================================================
   3. RENDERING METRICS & ORDERS
   ========================================================= */
function renderMetrics() {
  document.getElementById("statTotalOrders").textContent = currentOrders.length;
  
  const waiting = currentOrders.filter(o => getStepIndex(o.status) === 1).length;
  const inFulfill = currentOrders.filter(o => {
    const step = getStepIndex(o.status);
    return step >= 2 && step <= 5;
  }).length;
  const delivered = currentOrders.filter(o => getStepIndex(o.status) === 6).length;

  document.getElementById("statWaitingAcceptance").textContent = waiting;
  document.getElementById("statInFulfillment").textContent = inFulfill;
  document.getElementById("statDelivered").textContent = delivered;
}

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
      const step = getStepIndex(o.status);
      if (statusFilter === "WAITING_FOR_ACCEPTANCE" && step !== 1) return false;
      if (statusFilter === "ACCEPTED" && step !== 2) return false;
      if (statusFilter === "PROCESSING" && step !== 3) return false;
      if (statusFilter === "READY_FOR_DISPATCH" && step !== 4) return false;
      if (statusFilter === "OUT_FOR_DELIVERY" && step !== 5) return false;
      if (statusFilter === "DELIVERED" && step !== 6) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 48px; text-align: center;">
        <i class="fa-solid fa-boxes-packing" style="font-size: 42px; color: #94a3b8; margin-bottom: 12px;"></i>
        <h4 style="font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">No Orders Found</h4>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 18px;">No confirmed orders match your filter criteria.</p>
        <a href="buy-material-select.html" class="btn-banner-action primary" style="display: inline-block;">
          <i class="fa-solid fa-cart-shopping mr-1"></i> Buy Materials Now
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => createOrderCardHTML(order)).join("");
}

function createOrderCardHTML(order) {
  const step = getStepIndex(order.status);
  const statusEn = getStatusLabelEn(order.status);
  const statusHi = getStatusLabelHi(order.status);
  const formattedTotal = Number(order.totalAmount).toLocaleString("en-IN");

  const itemsRows = (order.items || []).map(it => `
    <tr>
      <td><strong>${it.materialName}</strong></td>
      <td style="color: #64748b;">${it.quantity} ${it.unit || ''}</td>
      <td style="color: #0284c7; font-weight: 600;">₹${Number(it.unitPrice || 0).toLocaleString('en-IN')} / ${it.unit || 'unit'}</td>
      <td style="text-align: right; font-weight: 700; color: #0f172a;">₹${Number(it.totalPrice || (it.quantity * it.unitPrice) || 0).toLocaleString('en-IN')}</td>
    </tr>
  `).join("");

  return `
    <div class="order-card" id="card-${order.orderId}">
      <!-- Order Header Bar -->
      <div class="order-header-bar">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="type-badge ${order.type === 'DIRECT_BUY' ? 'direct-buy' : 'material-requirement'}">
              <i class="fa-solid fa-tag"></i> ${order.typeLabel}
            </span>
            <span class="request-id-badge" style="font-size: 13px; font-weight: 800;">${order.orderId}</span>
            ${order.masterReqId ? `<span style="font-size: 12px; color: #64748b;">Parent: <strong>${order.masterReqId}</strong></span>` : ''}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            <i class="fa-regular fa-clock mr-1"></i> Ordered: ${order.orderedDate}
          </div>
        </div>

        <div style="text-align: right;">
          <span class="status-badge ${step === 1 ? 'pending' : (step === 2 ? 'accepted' : (step === 6 ? 'accepted' : 'active'))}">
            <i class="fa-solid fa-circle-dot"></i> ${statusEn} / ${statusHi}
          </span>
          <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px;">
            ₹${formattedTotal}
          </div>
        </div>
      </div>

      <!-- Order Body -->
      <div class="order-body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
          <div>
            <h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px;">
              <i class="fa-solid fa-store" style="color: #64748b; margin-right: 6px;"></i> ${order.sellerName}
            </h4>
            <span style="font-size: 13px; color: #64748b;">
              <i class="fa-solid fa-location-dot mr-1"></i> ${order.sellerLocation} • Delivery Site: ${order.deliverySite}
            </span>
          </div>
          ${order.expectedDeliveryDate ? `
            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 700; color: #0f172a;">
              <i class="fa-regular fa-calendar-check text-blue-600 mr-1"></i> Expected Delivery: ${order.expectedDeliveryDate}
            </div>
          ` : ''}
        </div>

        <!-- 6-Stage Timeline Tracker -->
        <div class="direct-buy-timeline-tracker" style="margin: 16px 0;">
          <div class="direct-buy-step ${step >= 1 ? (step === 1 ? 'current' : 'completed') : ''}">
            <div class="direct-buy-dot">${step > 1 ? '<i class="fa-solid fa-check"></i>' : '1'}</div>
            <div class="direct-buy-label">Waiting for Acceptance<br><small>स्वीकृति की प्रतीक्षा</small></div>
          </div>
          <div class="direct-buy-step ${step >= 2 ? (step === 2 ? 'current' : 'completed') : ''}">
            <div class="direct-buy-dot">${step > 2 ? '<i class="fa-solid fa-check"></i>' : '2'}</div>
            <div class="direct-buy-label">Order Accepted<br><small>ऑर्डर स्वीकार किया गया</small></div>
          </div>
          <div class="direct-buy-step ${step >= 3 ? (step === 3 ? 'current' : 'completed') : ''}">
            <div class="direct-buy-dot">${step > 3 ? '<i class="fa-solid fa-check"></i>' : '3'}</div>
            <div class="direct-buy-label">Processing<br><small>प्रक्रिया में</small></div>
          </div>
          <div class="direct-buy-step ${step >= 4 ? (step === 4 ? 'current' : 'completed') : ''}">
            <div class="direct-buy-dot">${step > 4 ? '<i class="fa-solid fa-check"></i>' : '4'}</div>
            <div class="direct-buy-label">Ready for Dispatch<br><small>भेजने के लिए तैयार</small></div>
          </div>
          <div class="direct-buy-step ${step >= 5 ? (step === 5 ? 'current' : 'completed') : ''}">
            <div class="direct-buy-dot">${step > 5 ? '<i class="fa-solid fa-check"></i>' : '5'}</div>
            <div class="direct-buy-label">Out for Delivery<br><small>डिलीवरी के लिए रवाना</small></div>
          </div>
          <div class="direct-buy-step ${step >= 6 ? 'completed' : ''}">
            <div class="direct-buy-dot">${step >= 6 ? '<i class="fa-solid fa-check"></i>' : '6'}</div>
            <div class="direct-buy-label">Delivered<br><small>डिलीवर हो गया</small></div>
          </div>
        </div>

        <!-- Selected Items Table -->
        <table class="order-items-table">
          <thead>
            <tr>
              <th>Material Description / विवरण</th>
              <th>Allocated Quantity / मात्रा</th>
              <th>Agreed Rate / दर</th>
              <th style="text-align: right;">Amount / राशि</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Scoped Authorized Contact Info -->
        ${step >= 2 && order.sellerPhone ? `
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #1e40af; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <i class="fa-solid fa-phone mr-1"></i>
              <strong>Authorized Seller Contact:</strong> ${order.sellerName} (${order.sellerPhone})
            </div>
            <a href="tel:${order.sellerPhone}" class="btn-card-action" style="font-size: 11px; padding: 4px 10px; background: #2563eb; color: white; border: none; text-decoration: none; border-radius: 4px;">
              <i class="fa-solid fa-phone mr-1"></i> Call Seller
            </a>
          </div>
        ` : (step === 1 ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #64748b;">
            <i class="fa-solid fa-shield-halved mr-1"></i>
            Seller contact details will be authorized and shared once the seller accepts your order.
          </div>
        ` : '')}
      </div>

      <!-- Order Footer Actions -->
      <div class="order-footer">
        <div style="font-size: 12px; color: #64748b;">
          <i class="fa-solid fa-shield-check text-green-600 mr-1"></i> BuildBid Secure Procurement Guaranteed
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-card-action primary-subtle" onclick="openOrderDetailsModal('${order.orderId}')">
            <i class="fa-solid fa-circle-info mr-1"></i> Order Details / विवरण
          </button>
          ${order.sellerPhone && step >= 2 ? `
            <button class="btn-card-action" onclick="alert('Calling seller ${order.sellerName} at ${order.sellerPhone}')">
              <i class="fa-solid fa-phone mr-1"></i> Contact Seller
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function openOrderDetailsModal(orderId) {
  const order = currentOrders.find(o => o.orderId === orderId);
  if (!order) return;

  const modal = document.getElementById("orderDetailsModal");
  document.getElementById("modalOrderIdTitle").textContent = order.orderId;
  document.getElementById("modalOrderSubtitle").textContent = `Seller: ${order.sellerName} • Status: ${getStatusLabelEn(order.status)} / ${getStatusLabelHi(order.status)}`;

  const content = document.getElementById("modalOrderContent");
  if (content) {
    const itemsHTML = (order.items || []).map(it => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${it.materialName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.quantity} ${it.unit || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${Number(it.unitPrice || 0).toLocaleString('en-IN')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">₹${Number(it.totalPrice || (it.quantity * it.unitPrice) || 0).toLocaleString('en-IN')}</td>
      </tr>
    `).join("");

    content.innerHTML = `
      <div style="padding: 10px 0;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <h5 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Supplier & Delivery Information:</h5>
          <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.6;">
            <strong>${order.sellerBusinessName || order.sellerName}</strong>${order.sellerId ? ` <span style="color: #64748b; font-size: 11px;">(#${order.sellerId})</span>` : ''}<br>
            <span><i class="fa-solid fa-location-dot" style="color: #ef4444; width: 14px;"></i> Location: ${order.sellerAddress || order.sellerLocation}</span><br>
            <span><i class="fa-solid fa-phone" style="color: #10b981; width: 14px;"></i> ${order.sellerPhone ? `Authorized Contact: ${order.sellerPhone}` : 'Phone: Available upon acceptance'}</span><br>
            ${order.sellerEmail ? `<span><i class="fa-solid fa-envelope" style="color: #0284c7; width: 14px;"></i> Email: ${order.sellerEmail}</span><br>` : ''}
            <span><i class="fa-solid fa-truck" style="color: #0284c7; width: 14px;"></i> Delivery Site: ${order.deliverySite}</span><br>
            <span><i class="fa-regular fa-clock" style="color: #6366f1; width: 14px;"></i> Expected Delivery: <strong style="color: #0284c7;">${order.expectedDeliveryDate || 'Pending confirmation'}</strong></span>
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left; font-weight: 700;">
              <th style="padding: 8px;">Material</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Rate</th>
              <th style="padding: 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 8px; text-align: right; font-weight: 600;">Subtotal:</td>
              <td style="padding: 8px; text-align: right; font-weight: 700;">₹${Number(order.subtotal || 0).toLocaleString('en-IN')}</td>
            </tr>
            ${order.freight > 0 ? `
              <tr>
                <td colspan="3" style="padding: 8px; text-align: right; color: #64748b;">Delivery Freight:</td>
                <td style="padding: 8px; text-align: right; font-weight: 600;">₹${Number(order.freight).toLocaleString('en-IN')}</td>
              </tr>
            ` : ''}
            ${order.tax > 0 ? `
              <tr>
                <td colspan="3" style="padding: 8px; text-align: right; color: #64748b;">Taxes (GST):</td>
                <td style="padding: 8px; text-align: right; font-weight: 600;">₹${Number(order.tax).toLocaleString('en-IN')}</td>
              </tr>
            ` : ''}
            <tr style="font-size: 15px; border-top: 2px solid #cbd5e1;">
              <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: 800; color: #0f172a;">Grand Total:</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: 800; color: #0284c7;">₹${Number(order.totalAmount || 0).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn-card-action" onclick="closeOrderDetailsModal()">Close</button>
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
  if (modal) modal.classList.remove("active");
}

function setupToolbarListeners() {
  const searchInput = document.getElementById("orderSearchInput");
  const typeFilter = document.getElementById("orderTypeFilter");
  const statusFilter = document.getElementById("orderStatusFilter");
  const resetBtn = document.getElementById("btnResetFilters");

  if (searchInput) searchInput.addEventListener("input", renderOrders);
  if (typeFilter) typeFilter.addEventListener("change", renderOrders);
  if (statusFilter) statusFilter.addEventListener("change", renderOrders);

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (typeFilter) typeFilter.value = "ALL";
      if (statusFilter) statusFilter.value = "ALL";
      renderOrders();
    });
  }
}



function showLogoutToast(callback, customTitle, customMessage) {
  let toast = document.getElementById("custom-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "custom-toast";
    toast.className = "toast-card";
    toast.innerHTML = `
      <div class="toast-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      </div>
      <div class="toast-body">
        <h4 id="toast-title" class="toast-title">Logout Successful</h4>
        <p id="toast-message" class="toast-message">You have logged out successfully. — सफलतापूर्वक लॉगआउट किया गया।</p>
      </div>
      <button class="toast-close" type="button" aria-label="Close notification">&times;</button>
    `;
    toast.style.cssText = "position:fixed;top:25px;right:25px;z-index:999999;min-width:280px;max-width:380px;display:flex;align-items:center;gap:12px;padding:12px 16px;background:#ffffff;border:1px solid #e2e8f0;border-radius:13px;box-shadow:0 18px 40px rgba(15,23,42,0.13),0 3px 9px rgba(15,23,42,0.05);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);opacity:0;transform:translateY(-20px);pointer-events:none;font-family:'Inter',system-ui,sans-serif;";
    const iconEl = toast.querySelector(".toast-icon");
    if (iconEl) iconEl.style.cssText = "width:38px;height:38px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#ecfdf5;color:#10b981;border-radius:8px;";
    const titleEl = toast.querySelector(".toast-title");
    if (titleEl) titleEl.style.cssText = "margin:0;color:#1e293b;font-size:14px;font-weight:700;";
    const msgEl = toast.querySelector(".toast-message");
    if (msgEl) msgEl.style.cssText = "margin:2px 0 0 0;color:#64748b;font-size:12px;";
    const closeEl = toast.querySelector(".toast-close");
    if (closeEl) closeEl.style.cssText = "background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer;";
    document.body.appendChild(toast);
  }

  const titleEl = document.getElementById("toast-title");
  if (titleEl) titleEl.innerText = customTitle || "Logout Successful";
  const msgEl = document.getElementById("toast-message");
  if (msgEl) msgEl.innerText = customMessage || "You have logged out successfully. — सफलतापूर्वक लॉगआउट किया गया।";

  void toast.offsetHeight;
  toast.classList.add("show");
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";
  toast.style.pointerEvents = "auto";

  let navigated = false;
  const navigateOnce = () => {
    if (navigated) return;
    navigated = true;
    toast.classList.remove("show");
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    toast.style.pointerEvents = "none";
    if (typeof callback === "function") callback();
    else window.location.href = "index.html";
  };

  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      navigateOnce();
    };
  }

  setTimeout(navigateOnce, 1200);
}
