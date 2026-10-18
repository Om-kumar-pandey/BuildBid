/* ==========================================================================
   BuildBid — Material Seller Dashboard Interactions (seller-dashboard.js)
   DYNAMIC AUTHENTICATION, PROFILE & REAL PROJECT REQUIREMENTS INTEGRATION
   ========================================================================== */

// Tailwind CSS Theme Extension Configuration
if (typeof tailwind !== 'undefined') {
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    buildblue: {
                        50: '#eff6ff',
                        100: '#dbeafe',
                        500: '#3b82f6',
                        600: '#2563eb',
                        700: '#1d4ed8',
                        800: '#1e40af',
                        900: '#1e3a8a',
                    },
                    buildslate: {
                        850: '#151f32',
                        900: '#0f172a'
                    }
                },
                fontFamily: {
                    sans: ['Inter', 'sans-serif'],
                }
            }
        }
    };
}

/* ==========================================================================
   CORE UTILITIES & AUTHENTICATION STORAGE
   ========================================================================== */

function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.location) {
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            return "http://localhost:8080";
        }
    }
    return "https://buildbid-ap3j.onrender.com";
}

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

function getAuthenticatedSellerRole(currentUser, marketplaceUser) {
    let role = "";
    if (currentUser && currentUser.role) {
        role = String(currentUser.role).replace("ROLE_", "").toUpperCase();
    } else if (currentUser && Array.isArray(currentUser.roles) && currentUser.roles.length > 0) {
        const primary = currentUser.roles[0];
        role = String(typeof primary === "string" ? primary : primary.name || primary.authority || "")
            .replace("ROLE_", "")
            .toUpperCase();
    } else if (marketplaceUser && Array.isArray(marketplaceUser.roles) && marketplaceUser.roles.length > 0) {
        const primary = marketplaceUser.roles[0];
        role = String(typeof primary === "string" ? primary : primary.name || primary.authority || "")
            .replace("ROLE_", "")
            .toUpperCase();
    } else if (marketplaceUser && marketplaceUser.role) {
        role = String(marketplaceUser.role).replace("ROLE_", "").toUpperCase();
    }
    return role;
}

function isSellerRole(role) {
    return role === "MATERIAL_SELLER" || role === "SELLER";
}

function logoutSeller() {
    localStorage.removeItem("marketplaceToken");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("marketplaceUser");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("customerUser");
    localStorage.removeItem("buildbid_user");
    localStorage.removeItem("buildbid_current_user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("pendingRedirect");
    sessionStorage.removeItem("userData");
    sessionStorage.clear();
    showLogoutToast(() => {
        window.location.href = "index.html";
    });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJs(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return "Recently posted";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "Recently posted";
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 60) return diffMins <= 5 ? "Just now" : `Posted ${diffMins} mins ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `Posted ${diffHrs} hrs ago`;
        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays === 1) return "Posted 1 day ago";
        return `Posted ${diffDays} days ago`;
    } catch (e) {
        return "Recently posted";
    }
}

/* ==========================================================================
   CONCURRENCY SEQUENCE TRACKERS & STANDARD UI STATE HELPERS
   ========================================================================== */

let _inventoryReqSeq = 0;
let _ordersReqSeq = 0;
let _requestsReqSeq = 0;
let _quotationsReqSeq = 0;

/**
 * Standard rotating circular loading spinner for tables (valid <tbody> row)
 */
function renderSellerTableLoading(tbody, colspan = 7) {
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}" class="p-8 text-center text-slate-500" role="status" aria-live="polite">
                <div class="flex flex-col items-center justify-center space-y-2 py-4">
                    <i class="fa-solid fa-circle-notch fa-spin seller-spinner-icon text-blue-600 text-3xl" aria-hidden="true"></i>
                    <div class="space-y-0.5 text-center">
                        <p class="font-semibold text-slate-700 text-sm">Please wait…</p>
                        <p class="text-xs text-slate-400">Data loading…</p>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Standard rotating circular loading spinner for card or list containers
 */
function renderSellerCardLoading(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-100" role="status" aria-live="polite">
            <div class="flex flex-col items-center justify-center space-y-2 py-2">
                <i class="fa-solid fa-circle-notch fa-spin seller-spinner-icon text-blue-600 text-3xl" aria-hidden="true"></i>
                <div class="space-y-0.5 text-center">
                    <p class="font-semibold text-slate-700 text-sm">Please wait…</p>
                    <p class="text-xs text-slate-400">Data loading…</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Standard error state for tables with Retry action
 */
function renderSellerTableError(tbody, colspan = 7, retryFnCall = "") {
    if (!tbody) return;
    const retryBtnHtml = retryFnCall
        ? `<button type="button" onclick="${retryFnCall}" class="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all inline-flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Retry loading data">
             <i class="fa-solid fa-rotate-right text-xs" aria-hidden="true"></i>
             <span>Retry</span>
           </button>`
        : "";

    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}" class="p-8 text-center text-xs" role="alert">
                <div class="flex flex-col items-center justify-center space-y-1.5 py-2 max-w-md mx-auto">
                    <i class="fa-solid fa-triangle-exclamation text-amber-500 text-2xl mb-1" aria-hidden="true"></i>
                    <p class="font-bold text-slate-700 text-sm">Unable to load data</p>
                    <p class="text-xs text-slate-500">The server may be starting or temporarily unavailable.</p>
                    ${retryBtnHtml}
                </div>
            </td>
        </tr>
    `;
}

/**
 * Standard error state for card or list containers with Retry action
 */
function renderSellerCardError(container, retryFnCall = "") {
    if (!container) return;
    const retryBtnHtml = retryFnCall
        ? `<button type="button" onclick="${retryFnCall}" class="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all inline-flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Retry loading data">
             <i class="fa-solid fa-rotate-right text-xs" aria-hidden="true"></i>
             <span>Retry</span>
           </button>`
        : "";

    container.innerHTML = `
        <div class="p-6 text-center text-xs bg-slate-50 border border-slate-200 rounded-xl" role="alert">
            <div class="flex flex-col items-center justify-center space-y-1.5 py-2 max-w-md mx-auto">
                <i class="fa-solid fa-triangle-exclamation text-amber-500 text-2xl mb-1" aria-hidden="true"></i>
                <p class="font-bold text-slate-700 text-sm">Unable to load data</p>
                <p class="text-xs text-slate-500">The server may be starting or temporarily unavailable.</p>
                ${retryBtnHtml}
            </div>
        </div>
    `;
}

/* ==========================================================================
   DYNAMIC DATA BINDING: SELLER IDENTITY & PROFILE
   ========================================================================== */

function bindSellerProfile(profile) {
    if (!profile) return;

    const displayName = profile.name || profile.fullName || profile.username || "";
    const ownerName = profile.fullName || profile.name || "";
    const location = profile.location || profile.city || "";
    const email = profile.email || "";
    const phone = profile.phone || profile.phoneNumber || "";

    // Calculate avatar initials
    let initials = "";
    if (displayName) {
        const parts = displayName.trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            initials = (parts[0][0] + parts[1][0]).toUpperCase();
        } else if (parts.length === 1 && parts[0].length >= 2) {
            initials = parts[0].substring(0, 2).toUpperCase();
        } else if (parts.length === 1) {
            initials = parts[0][0].toUpperCase();
        }
    }

    // Top Header
    const navAvatar = document.getElementById("seller-nav-avatar");
    if (navAvatar) {
        if (initials) {
            navAvatar.innerText = initials;
        } else {
            navAvatar.innerHTML = '<i class="fa-solid fa-user text-sm" aria-hidden="true"></i>';
        }
    }

    const navName = document.getElementById("seller-nav-name");
    if (navName) {
        navName.innerText = displayName || "Seller";
    }

    const navLocation = document.getElementById("seller-nav-location");
    if (navLocation) {
        navLocation.innerText = location ? `${location} • Material Seller` : "Material Seller";
    }

    // Dashboard Banner Greeting
    const bannerGreeting = document.getElementById("seller-banner-greeting");
    if (bannerGreeting) {
        if (displayName) {
            const hour = new Date().getHours();
            const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
            bannerGreeting.innerText = `${timeGreeting}, ${displayName}`;
        } else {
            bannerGreeting.innerText = "Welcome to BuildBid";
        }
    }

    const bannerRegion = document.getElementById("seller-banner-region");
    if (bannerRegion) {
        bannerRegion.innerText = location ? `Verified Supplier Portal • ${location} Region` : "Verified Supplier Portal";
    }

    // Profile & Business Tab
    const profileAvatar = document.getElementById("seller-profile-avatar");
    if (profileAvatar) {
        if (initials) {
            profileAvatar.innerText = initials;
        } else {
            profileAvatar.innerHTML = '<i class="fa-solid fa-user text-xl" aria-hidden="true"></i>';
        }
    }

    const profileName = document.getElementById("seller-profile-name");
    if (profileName) {
        profileName.innerText = displayName || "Seller Account";
    }

    const ownerElem = document.getElementById("seller-owner-name");
    if (ownerElem) {
        ownerElem.innerText = ownerName || displayName || "—";
    }

    const addressElem = document.getElementById("seller-office-address");
    if (addressElem) {
        addressElem.innerText = location || "—";
    }

    const phoneElem = document.getElementById("seller-phone");
    if (phoneElem) {
        phoneElem.innerText = phone || "—";
    }

    const emailElem = document.getElementById("seller-email");
    if (emailElem) {
        emailElem.innerText = email || "—";
    }
}

/* ==========================================================================
   DYNAMIC DATA BINDING: CUSTOMER PROJECT REQUIREMENTS & BUY MATERIAL REQUESTS
   ========================================================================== */

window.cachedMaterialRequests = window.cachedMaterialRequests || {};

function isQuotationSubmittedForRequest(mr) {
    if (!mr) return false;
    if (mr.quotationSubmitted === true || mr.hasSubmittedQuotation === true) return true;
    const reqDbId = mr.id;
    const businessId = mr.requestId || ('MR-' + mr.id);
    if (Array.isArray(sellerQuotationsCache) && sellerQuotationsCache.length > 0) {
        return sellerQuotationsCache.some(q => {
            const matchesId = (reqDbId && q.materialRequestId == reqDbId) ||
                              (businessId && (q.businessRequestId === businessId || q.requestId === businessId));
            if (!matchesId) return false;
            const s = (q.status || '').toUpperCase();
            return ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED'].includes(s);
        });
    }
    return false;
}

function getExistingQuoteIdForRequest(mr) {
    if (!mr) return null;
    if (mr.existingQuotationId) return mr.existingQuotationId;
    const reqDbId = mr.id;
    const businessId = mr.requestId || ('MR-' + mr.id);
    if (Array.isArray(sellerQuotationsCache)) {
        const found = sellerQuotationsCache.find(q => {
            const matchesId = (reqDbId && q.materialRequestId == reqDbId) ||
                              (businessId && (q.businessRequestId === businessId || q.requestId === businessId));
            if (!matchesId) return false;
            const s = (q.status || '').toUpperCase();
            return ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED'].includes(s);
        });
        if (found) return found.quotationId || found.id;
    }
    return null;
}

function viewExistingQuotation(quoteId) {
    switchTab('quotations');
    if (quoteId) {
        setTimeout(() => {
            openQuotationDetailModal(quoteId);
        }, 150);
    }
}

function renderIncomingRequirements(projects = [], materialRequests = []) {
    if (typeof _activeCountdownMap !== 'undefined') {
        _activeCountdownMap.clear();
    }
    // Rebuild or clear cachedMaterialRequests to prevent stale entries
    const newCache = {};
    if (Array.isArray(materialRequests)) {
        materialRequests.forEach(mr => {
            const key = mr.requestId || ("MR-" + mr.id);
            newCache[key] = mr;
            if (mr.id) {
                newCache[mr.id] = mr;
                newCache[String(mr.id)] = mr;
            }
        });
    }
    window.cachedMaterialRequests = newCache;

    const listContainer = document.getElementById("incoming-requirements-list");
    const tbody = document.getElementById("material-requests-tbody");
    const countLabel = document.getElementById("requirements-count-label");
    const bannerReqCount = document.getElementById("seller-banner-req-count");
    const navReqBadge = document.getElementById("nav-requests-badge");

    const totalCount = (Array.isArray(projects) ? projects.length : 0) + (Array.isArray(materialRequests) ? materialRequests.length : 0);
    if (countLabel) countLabel.innerText = totalCount;
    if (bannerReqCount) bannerReqCount.innerText = `${totalCount} active customer material requirements`;
    if (navReqBadge) navReqBadge.innerText = totalCount;
    const kpiActiveReq = document.getElementById("kpi-active-requests");
    if (kpiActiveReq) kpiActiveReq.innerText = totalCount;
    const bannerViewCount = document.getElementById("seller-banner-view-req-count");
    if (bannerViewCount) bannerViewCount.innerText = `View ${totalCount} Requests`;

    // Render Dashboard Home incoming requirements (limit to 5 in summary)
    if (listContainer) {
        listContainer.innerHTML = "";
        let displayedCount = 0;
        if (Array.isArray(materialRequests)) {
            materialRequests.slice(0, 5).forEach(mr => {
                listContainer.appendChild(createMaterialRequestCard(mr));
                displayedCount++;
            });
        }
        if (Array.isArray(projects) && displayedCount < 5) {
            projects.slice(0, 5 - displayedCount).forEach(p => {
                listContainer.appendChild(createRequirementCard(p));
                displayedCount++;
            });
        }
        if (displayedCount === 0) {
            listContainer.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No active customer material requirements at this time.</div>`;
        }
    }

    // Render Material Requests Tab Table (full list)
    if (tbody) {
        tbody.innerHTML = "";
        let rowCount = 0;
        // Render Buy Material requests first (direct buyer orders)
        if (Array.isArray(materialRequests)) {
            materialRequests.forEach(mr => {
                tbody.appendChild(createMaterialRequestRow(mr));
                rowCount++;
            });
        }
        // Then render project material requirements
        if (Array.isArray(projects)) {
            projects.forEach(p => {
                tbody.appendChild(createRequirementRow(p));
                rowCount++;
            });
        }
        if (rowCount === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 text-xs">No incoming material requirements or direct orders at this time.</td></tr>`;
        }
    }
}

/* ==========================================================================
   24-HOUR DECLINE EXPIRY & COUNTDOWN TIMER MANAGER (Phase 4 & 5)
   ========================================================================== */

let _sellerCountdownInterval = null;
const _activeCountdownMap = new Map(); // key -> { expiryMs, onExpire }

function formatRemainingDuration(totalSeconds) {
    if (totalSeconds <= 0) return '0s';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (hours > 0) parts.push(hours + 'h');
    parts.push((hours > 0 ? String(minutes).padStart(2, '0') : minutes) + 'm');
    parts.push(String(seconds).padStart(2, '0') + 's');
    return parts.join(' ');
}

function registerCountdown(key, expiryTimestamp, onExpireCallback) {
    if (!key) return;
    const expiryMs = typeof expiryTimestamp === 'number'
        ? expiryTimestamp
        : (Date.parse(expiryTimestamp) || (Date.now() + 86400000));
    _activeCountdownMap.set(key, { expiryMs, onExpire: onExpireCallback });
    startCountdownTicker();
}

function startCountdownTicker() {
    if (_sellerCountdownInterval) return;
    _sellerCountdownInterval = setInterval(() => {
        const now = Date.now();
        if (_activeCountdownMap.size === 0) {
            clearInterval(_sellerCountdownInterval);
            _sellerCountdownInterval = null;
            return;
        }
        for (const [key, item] of _activeCountdownMap.entries()) {
            const diffSec = Math.floor((item.expiryMs - now) / 1000);
            const el = document.getElementById(key);
            if (!el) {
                // If element was unmounted or replaced
                continue;
            }
            if (diffSec <= 0) {
                el.innerText = 'Removed from your dashboard in 0s';
                _activeCountdownMap.delete(key);
                if (typeof item.onExpire === 'function') {
                    item.onExpire();
                }
            } else {
                el.innerText = 'Removed from your dashboard in ' + formatRemainingDuration(diffSec);
            }
        }
    }, 1000);
}

/* ==========================================================================
   DECLINE CONFIRMATION MODAL & ACTION HANDLER (Phase 4 & 5)
   ========================================================================== */

let pendingDeclineContext = null; // { id, requestId, btn }

function openDeclineConfirmModal(id, requestId, btnEl) {
    pendingDeclineContext = { id, requestId, btn: btnEl };
    const modal = document.getElementById('declineConfirmModal');
    const errBox = document.getElementById('declineModalError');
    const okBtn = document.getElementById('declineModalOkBtn');
    const cancelBtn = document.getElementById('declineModalCancelBtn');
    const okText = document.getElementById('declineModalOkText');

    if (errBox) errBox.classList.add('hidden');
    if (okBtn) okBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    if (okText) okText.innerText = 'OK';

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeDeclineConfirmModal() {
    pendingDeclineContext = null;
    const modal = document.getElementById('declineConfirmModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

async function submitDeclineAction() {
    if (!pendingDeclineContext) return;
    const { id, requestId, btn } = pendingDeclineContext;
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();
    const okBtn = document.getElementById('declineModalOkBtn');
    const cancelBtn = document.getElementById('declineModalCancelBtn');
    const okText = document.getElementById('declineModalOkText');
    const errBox = document.getElementById('declineModalError');
    const errText = document.getElementById('declineModalErrorText');

    if (okBtn) okBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (okText) okText.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> Processing...';
    if (errBox) errBox.classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE_URL}/api/material-requests/${id}/decline`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            closeDeclineConfirmModal();
            closeModal('materialRequestDetailModal');
            showToast('Material request declined. It will be removed in 24 hours.');
            if (typeof refreshSellerRequests === 'function') {
                await refreshSellerRequests();
            }
        } else {
            const msg = data.message || data.error || ('Decline failed with status ' + res.status);
            if (errBox && errText) {
                errText.innerText = msg;
                errBox.classList.remove('hidden');
            } else {
                showToast(msg);
            }
            if (okBtn) okBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
            if (okText) okText.innerText = 'OK';
        }
    } catch (err) {
        console.error('Decline error:', err);
        const netMsg = 'Network error while declining request. Please retry.';
        if (errBox && errText) {
            errText.innerText = netMsg;
            errBox.classList.remove('hidden');
        } else {
            showToast(netMsg);
        }
        if (okBtn) okBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (okText) okText.innerText = 'OK';
    }
}

/* ==========================================================================
   ACCEPT REQUEST ACTION HANDLER (Phase 2 & Phase 3)
   ========================================================================== */

async function handleAcceptRequest(id, requestId, btnEl) {
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    let originalHtml = '';
    if (btnEl) {
        originalHtml = btnEl.innerHTML;
        btnEl.disabled = true;
        btnEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> Accepting...';
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/material-requests/${id}/accept`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            showToast('Request accepted! Order created in your Orders tab.');
            closeModal('materialRequestDetailModal');
            if (btnEl) {
                btnEl.className = "px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold opacity-75 cursor-not-allowed inline-flex items-center gap-1.5";
                btnEl.innerHTML = '<i class="fa-solid fa-check text-xs"></i><span>Request Accepted</span>';
                btnEl.disabled = true;
                btnEl.onclick = null;
            }
            if (typeof loadSellerOrders === 'function') {
                loadSellerOrders();
            }
            if (typeof refreshSellerRequests === 'function') {
                await refreshSellerRequests();
            }
        } else if (res.status === 409) {
            showToast('This material requirement has already been accepted and is being fulfilled in your Orders tab.');
            closeModal('materialRequestDetailModal');
            if (btnEl) {
                btnEl.className = "px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold opacity-75 cursor-not-allowed inline-flex items-center gap-1.5";
                btnEl.innerHTML = '<i class="fa-solid fa-check text-xs"></i><span>Request Accepted</span>';
                btnEl.disabled = true;
                btnEl.onclick = null;
            }
            if (typeof loadSellerOrders === 'function') {
                loadSellerOrders();
            }
            if (typeof refreshSellerRequests === 'function') {
                await refreshSellerRequests();
            }
        } else {
            const errorMsg = data.message || data.error || ('Failed to accept request (HTTP ' + res.status + ')');
            showToast(errorMsg);
            if (btnEl) {
                btnEl.disabled = false;
                btnEl.innerHTML = '<span class="text-rose-600 font-bold inline-flex items-center gap-1"><i class="fa-solid fa-rotate-right text-xs"></i> Retry</span>';
                btnEl.onclick = (e) => {
                    e.stopPropagation();
                    handleAcceptRequest(id, requestId, btnEl);
                };
            }
        }
    } catch (err) {
        console.error('Accept error:', err);
        showToast('Network error while accepting request. Please retry.');
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerHTML = '<span class="text-rose-600 font-bold inline-flex items-center gap-1"><i class="fa-solid fa-rotate-right text-xs"></i> Retry</span>';
            btnEl.onclick = (e) => {
                e.stopPropagation();
                handleAcceptRequest(id, requestId, btnEl);
            };
        }
    }
}

function createMaterialRequestCard(mr) {
    const div = document.createElement("div");
    div.className = "bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4";

    const rId = mr.requestId || ("MR-" + mr.id);
    const buyerRole = (mr.buyerRole || "BUYER").toUpperCase();
    const items = mr.items || [];
    const firstItem = items[0] || {};
    const title = mr.materialSummary || firstItem.materialName || "Material Requirement";
    const locStr = [mr.city, mr.state].filter(Boolean).join(", ") || mr.state || "Regional Site";
    const timeAgo = formatTimeAgo(mr.createdAt);
    const status = mr.status || "NEW";
    const statusClass = (status === "NEW" || status === "Open" || status === "PENDING")
        ? "bg-emerald-100 text-emerald-700"
        : (status === "ACCEPTED" ? "bg-teal-100 text-teal-800" : "bg-blue-100 text-blue-700");

    const isDirectBuy = (mr.requestType === "DIRECT_MATERIAL");

    let reqTypeBadge = "";
    if (isDirectBuy) {
        reqTypeBadge = `<span class="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1"><i class="fa-solid fa-bolt text-[9px]"></i>Direct Material Request / सीधे सामग्री अनुरोध</span>`;
    } else {
        reqTypeBadge = `<span class="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Posted Requirement / मटेरियल आवश्यकता</span>`;
    }

    const scope = (mr.requestScope || "STATE").toUpperCase();
    let scopeBadge = "";
    if (isDirectBuy) {
        scopeBadge = `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">Direct Order</span>`;
    } else if (scope === "ALL_INDIA") {
        scopeBadge = `<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">All India</span>`;
    } else if (scope === "LOCAL") {
        scopeBadge = `<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">Local (${mr.localRadius || 25} km)</span>`;
    } else {
        scopeBadge = `<span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">State: ${escapeHtml(mr.state || '')}</span>`;
    }

    const sellerStatus = (mr.sellerStatus || "").toUpperCase();
    const generalStatus = (mr.status || "NEW").toUpperCase();
    const isAccepted = sellerStatus === "ACCEPTED" || ["ORDER_ACCEPTED", "PROCESSING", "READY_FOR_DISPATCH", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(generalStatus);
    const isDeclined = sellerStatus === "DECLINED" || (isDirectBuy && ["DECLINED", "REJECTED"].includes(generalStatus));

    let actionButtons = "";
    if (isDirectBuy) {
        if (isAccepted) {
            actionButtons = `
                <button disabled class="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold opacity-75 cursor-not-allowed inline-flex items-center gap-1.5 shadow-sm">
                    <i class="fa-solid fa-check text-xs"></i>
                    <span>Request Accepted</span>
                </button>
                <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all">View Details</button>
            `;
        } else if (isDeclined) {
            div.classList.add("opacity-60", "border-dashed", "bg-rose-50/20");
            const cdKey = "cd-card-" + (mr.id || rId);
            const expiryTimestamp = mr.expiryAt || (Date.now() + 86400000);
            let remSec = mr.remainingSeconds != null ? mr.remainingSeconds : Math.max(0, Math.floor((Date.parse(expiryTimestamp) - Date.now()) / 1000));
            actionButtons = `
                <div class="flex flex-col items-end gap-1">
                    <span class="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-black tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                        <i class="fa-solid fa-ban text-rose-600"></i>
                        <span>REJECTED</span>
                    </span>
                    <span id="${cdKey}" class="text-[11px] font-semibold text-rose-600 bg-rose-50/80 px-2 py-0.5 rounded border border-rose-200/60">Removed from your dashboard in ${formatRemainingDuration(remSec)}</span>
                </div>
                <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all opacity-75">View Details</button>
            `;
            registerCountdown(cdKey, expiryTimestamp, () => {
                div.remove();
                if (typeof refreshSellerRequests === 'function') refreshSellerRequests();
            });
        } else {
            // Direct Buy Pending: Accept Request, Decline Request, View Details
            actionButtons = `
                <button onclick="handleAcceptRequest(${mr.id}, '${escapeJs(rId)}', this)" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center space-x-1.5">
                    <i class="fa-solid fa-check text-xs"></i>
                    <span>Accept Request</span>
                </button>
                <button onclick="openDeclineConfirmModal(${mr.id}, '${escapeJs(rId)}', this)" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-all">
                    Decline Request
                </button>
                <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all">
                    View Details
                </button>
            `;
        }
    } else {
        // STEP 2: POSTED MATERIAL REQUIREMENTS: STRICTLY TWO CARD ACTIONS (View & Send Quote / Quotation Already Sent)
        if (isDeclined) {
            div.classList.add("opacity-60", "border-dashed");
            const cdKey = "cd-card-" + (mr.id || rId);
            const expiryTimestamp = mr.expiryAt || (Date.now() + 86400000);
            let remSec = mr.remainingSeconds != null ? mr.remainingSeconds : Math.max(0, Math.floor((Date.parse(expiryTimestamp) - Date.now()) / 1000));
            actionButtons = `
                <div class="flex flex-col items-end gap-1">
                    <span class="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm opacity-80">
                        <i class="fa-solid fa-circle-xmark text-rose-600"></i>
                        <span>Dismissed</span>
                    </span>
                    <span id="${cdKey}" class="text-[11px] font-semibold text-rose-600 bg-rose-50/80 px-2 py-0.5 rounded border border-rose-200/60">Removed in ${formatRemainingDuration(remSec)}</span>
                </div>
                <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all opacity-75">View Details</button>
            `;
            registerCountdown(cdKey, expiryTimestamp, () => {
                div.remove();
                if (typeof refreshSellerRequests === 'function') refreshSellerRequests();
            });
        } else {
            const isSubmitted = isQuotationSubmittedForRequest(mr);
            let quoteAction = "";
            if (isSubmitted) {
                quoteAction = `
                    <span class="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-default" title="You have already submitted a quotation for this requirement">
                        <i class="fa-solid fa-circle-check text-emerald-600"></i>
                        <span>Quotation Already Sent</span>
                    </span>
                `;
            } else {
                quoteAction = `
                    <button onclick="openQuotationModal('${escapeJs(rId)}', '${escapeJs(firstItem.materialName || title)}', ${firstItem.quantity || 1}, '${escapeJs(firstItem.unit || 'Units')}', ${mr.id})" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center space-x-1.5">
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                        <span>Send Quote</span>
                    </button>
                `;
            }

            actionButtons = `
                <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all">
                    View
                </button>
                ${quoteAction}
            `;
        }
    }

    let financialSnippet = "";
    if (isDirectBuy && mr.estimatedTotal) {
        financialSnippet = `<span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Total: ₹${Number(mr.estimatedTotal).toLocaleString('en-IN')}</span>`;
    }

    div.innerHTML = `
        <div class="space-y-1.5">
            <div class="flex flex-wrap items-center gap-1.5">
                <span class="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-md font-bold">${escapeHtml(rId)}</span>
                ${reqTypeBadge}
                <span class="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold">${escapeHtml(buyerRole)}</span>
                <span class="${statusClass} text-[10px] px-2 py-0.5 rounded-full font-semibold">${escapeHtml(status)}</span>
                ${scopeBadge}
                <span class="text-xs text-slate-500">• ${escapeHtml(timeAgo)}</span>
            </div>
            <h3 class="font-bold text-slate-800 text-base">${escapeHtml(title)}</h3>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span><i class="fa-solid fa-boxes-stacked mr-1 text-blue-500"></i><strong>${items.length} ${items.length === 1 ? 'Material' : 'Materials'}</strong></span>
                <span><i class="fa-solid fa-location-dot mr-1 text-red-500"></i>${escapeHtml(locStr)} (PIN: ${escapeHtml(mr.pinCode || '')})</span>
                ${financialSnippet}
            </div>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
            ${actionButtons}
        </div>
    `;
    return div;
}

function createMaterialRequestRow(mr) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition-all";

    const rId = mr.requestId || ("MR-" + mr.id);
    const buyerRole = (mr.buyerRole || "BUYER").toUpperCase();
    const items = mr.items || [];
    const firstItem = items[0] || {};
    
    const isDirectBuy = (mr.requestType === "DIRECT_MATERIAL");

    // Materials summary
    let matSummary = mr.materialSummary || firstItem.materialName || "Material";
    let specText = "";
    if (isDirectBuy) {
        specText = `Direct Inventory Purchase • ₹${Number(mr.materialPrice || 0).toLocaleString('en-IN')}/${firstItem.unit || 'unit'}`;
    } else if (items.length === 1) {
        const parts = [];
        if (firstItem.brand) parts.push("Brand: " + firstItem.brand);
        if (firstItem.specification) parts.push(firstItem.specification);
        specText = parts.join(" • ") || firstItem.category || "";
    } else {
        specText = `${items.length} materials requested in single order`;
    }

    let qtyStr = "";
    if (items.length === 1) {
        qtyStr = `${firstItem.quantity} ${firstItem.unit || ''}`;
    } else {
        qtyStr = `${items.length} Items`;
    }

    const locStr = [mr.city, mr.state].filter(Boolean).join(", ") || mr.state || "Regional Site";
    const status = mr.status || "NEW";
    const statusClass = (status === "NEW" || status === "Open" || status === "PENDING")
        ? "bg-emerald-100 text-emerald-700"
        : (status === "ACCEPTED" ? "bg-teal-100 text-teal-800" : "bg-blue-100 text-blue-700");

    let scopeBadge = "";
    const scope = (mr.requestScope || "STATE").toUpperCase();
    if (isDirectBuy) {
        scopeBadge = `<span class="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">Direct Order</span>`;
    } else if (scope === "ALL_INDIA") {
        scopeBadge = `<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">All India</span>`;
    } else if (scope === "LOCAL") {
        scopeBadge = `<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">Local (${mr.localRadius || 25} km)</span>`;
    } else {
        scopeBadge = `<span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">State: ${escapeHtml(mr.state || '')}</span>`;
    }

    let typeTag = isDirectBuy
        ? `<span class="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase block w-fit mb-1">Direct Buy</span>`
        : `<span class="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold uppercase block w-fit mb-1">Posted Req</span>`;

    const sellerStatus = (mr.sellerStatus || "").toUpperCase();
    const generalStatus = (mr.status || "NEW").toUpperCase();
    const isAccepted = sellerStatus === "ACCEPTED" || ["ORDER_ACCEPTED", "PROCESSING", "READY_FOR_DISPATCH", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(generalStatus);
    const isDeclined = sellerStatus === "DECLINED" || (isDirectBuy && ["DECLINED", "REJECTED"].includes(generalStatus));

    let actionButtons = "";
    if (isDirectBuy) {
        if (isAccepted) {
            actionButtons = `
                <button disabled class="px-2.5 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold opacity-75 cursor-not-allowed inline-flex items-center gap-1.5 shadow-sm">
                    <i class="fa-solid fa-check text-xs"></i>
                    <span>Request Accepted</span>
                </button>
                <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">View Details</button>
            `;
        } else if (isDeclined) {
            tr.classList.add("opacity-60", "bg-rose-50/20");
            const cdKey = "cd-row-" + (mr.id || rId);
            const expiryTimestamp = mr.expiryAt || (Date.now() + 86400000);
            let remSec = mr.remainingSeconds != null ? mr.remainingSeconds : Math.max(0, Math.floor((Date.parse(expiryTimestamp) - Date.now()) / 1000));
            actionButtons = `
                <div class="inline-flex flex-col items-end gap-1">
                    <span class="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-black tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                        <i class="fa-solid fa-ban text-rose-600"></i>
                        <span>REJECTED</span>
                    </span>
                    <span id="${cdKey}" class="text-[10px] font-semibold text-rose-600 bg-rose-50/80 px-2 py-0.5 rounded border border-rose-200/60">Removed in ${formatRemainingDuration(remSec)}</span>
                </div>
                <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all opacity-75">View Details</button>
            `;
            registerCountdown(cdKey, expiryTimestamp, () => {
                tr.remove();
                if (typeof refreshSellerRequests === 'function') refreshSellerRequests();
            });
        } else {
            // Direct Buy Pending: Accept Request, Decline Request, View
            actionButtons = `
                <button onclick="handleAcceptRequest(${mr.id}, '${escapeJs(rId)}', this)" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all">
                    Accept Request
                </button>
                <button onclick="openDeclineConfirmModal(${mr.id}, '${escapeJs(rId)}', this)" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold transition-all">
                    Decline Request
                </button>
                <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">
                    View
                </button>
            `;
        }
    } else {
        // STEP 2: POSTED MATERIAL REQUIREMENTS: STRICTLY TWO CARD ACTIONS (View & Send Quote / Quotation Already Sent)
        if (isDeclined) {
            tr.classList.add("opacity-60", "bg-slate-50");
            const cdKey = "cd-row-" + (mr.id || rId);
            const expiryTimestamp = mr.expiryAt || (Date.now() + 86400000);
            let remSec = mr.remainingSeconds != null ? mr.remainingSeconds : Math.max(0, Math.floor((Date.parse(expiryTimestamp) - Date.now()) / 1000));
            actionButtons = `
                <div class="inline-flex flex-col items-end gap-1">
                    <span class="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm opacity-80">
                        <i class="fa-solid fa-circle-xmark text-rose-600"></i>
                        <span>Dismissed</span>
                    </span>
                    <span id="${cdKey}" class="text-[10px] font-semibold text-rose-600 bg-rose-50/80 px-2 py-0.5 rounded border border-rose-200/60">Removed in ${formatRemainingDuration(remSec)}</span>
                </div>
                <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all opacity-75">View Details</button>
            `;
            registerCountdown(cdKey, expiryTimestamp, () => {
                tr.remove();
                if (typeof refreshSellerRequests === 'function') refreshSellerRequests();
            });
        } else {
            const isSubmitted = isQuotationSubmittedForRequest(mr);
            let quoteAction = "";
            if (isSubmitted) {
                quoteAction = `
                    <span class="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-default" title="You have already submitted a quotation for this requirement">
                        <i class="fa-solid fa-circle-check text-emerald-600"></i>
                        <span>Quotation Already Sent</span>
                    </span>
                `;
            } else {
                quoteAction = `
                    <button onclick="openQuotationModal('${escapeJs(rId)}', '${escapeJs(firstItem.materialName || matSummary)}', ${firstItem.quantity || 1}, '${escapeJs(firstItem.unit || 'Units')}', ${mr.id})" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">Send Quote</button>
                `;
            }

            actionButtons = `
                <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">
                    View
                </button>
                ${quoteAction}
            `;
        }
    }

    tr.innerHTML = `
        <td class="p-4 font-medium">
            <span class="text-blue-600 font-bold block">${escapeHtml(rId)}</span>
            ${typeTag}
            <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">${escapeHtml(buyerRole)}</span>
        </td>
        <td class="p-4">
            <span class="font-bold text-slate-800">${escapeHtml(matSummary)}</span>
            <span class="block text-slate-500 text-[11px]">${escapeHtml(specText)}</span>
            ${isDirectBuy && mr.estimatedTotal ? `<span class="block text-emerald-700 font-bold text-[11px]">Total: ₹${Number(mr.estimatedTotal).toLocaleString('en-IN')}</span>` : ''}
        </td>
        <td class="p-4 font-bold text-slate-800">${escapeHtml(qtyStr)}</td>
        <td class="p-4">
            <i class="fa-solid fa-location-dot text-red-500 mr-1"></i>${escapeHtml(locStr)}
            <span class="block text-slate-400 text-[10px]">PIN: ${escapeHtml(mr.pinCode || '')}</span>
        </td>
        <td class="p-4">${scopeBadge}</td>
        <td class="p-4"><span class="${statusClass} px-2.5 py-1 rounded-full text-[10px] font-bold">${escapeHtml(status)}</span></td>
        <td class="p-4 text-right space-x-2">
            ${actionButtons}
        </td>
    `;
    return tr;
}

function openMaterialRequestModal(requestId) {
    const mr = window.cachedMaterialRequests[requestId];
    if (!mr) {
        showToast('Request details not found for ' + requestId);
        return;
    }

    const rId = mr.requestId || ("MR-" + mr.id);
    const isDirectBuy = (mr.requestType === 'DIRECT_MATERIAL');

    const titleEl = document.getElementById('detailModalTitle');
    const statusEl = document.getElementById('detailModalStatus');
    const subEl = document.getElementById('detailModalSubtitle');
    const roleEl = document.getElementById('detailModalBuyerRole');
    const scopeEl = document.getElementById('detailModalScope');
    const stateEl = document.getElementById('detailModalState');
    const pinEl = document.getElementById('detailModalPin');
    const addrEl = document.getElementById('detailModalAddress');

    if (titleEl) titleEl.innerText = (isDirectBuy ? 'Direct Purchase #' : 'Material Request #') + (mr.requestId || mr.id);
    if (statusEl) statusEl.innerText = mr.status || 'NEW';
    
    if (subEl) {
        subEl.innerText = isDirectBuy 
            ? 'DIRECT MATERIAL REQUEST — सीधे सामग्री खरीदने का अनुरोध'
            : 'POSTED MATERIAL REQUIREMENT — मटेरियल आवश्यकता';
    }

    const buyerContactStr = (mr.contactPhone || mr.buyerPhone) ? ` • Phone: ${mr.contactPhone || mr.buyerPhone}` : '';
    const buyerNameStr = mr.buyerName ? `${mr.buyerName} (${mr.buyerRole || 'BUYER'})${buyerContactStr}` : (mr.buyerRole || 'CUSTOMER');
    if (roleEl) roleEl.innerText = buyerNameStr;

    if (scopeEl) {
        if (isDirectBuy) {
            scopeEl.innerText = 'DIRECT (लक्षित विक्रेता)';
        } else {
            let scopeLabel = mr.requestScope || 'STATE';
            if (scopeLabel === 'LOCAL' && mr.localRadius) {
                scopeLabel += ` (${mr.localRadius} km)`;
            }
            scopeEl.innerText = scopeLabel;
        }
    }
    if (stateEl) stateEl.innerText = mr.state || '-';
    if (pinEl) pinEl.innerText = mr.pinCode || '-';
    if (addrEl) {
        const fullAddr = [mr.deliveryAddress, mr.city, mr.state, mr.pinCode ? 'PIN: ' + mr.pinCode : ''].filter(Boolean).join(', ');
        addrEl.innerText = fullAddr || 'Delivery Address Not Specified';
    }

    const items = mr.items || [];
    const firstItem = items[0] || {};
    const itemsContainer = document.getElementById('detailModalItemsList');
    if (itemsContainer) {
        itemsContainer.innerHTML = '';
        const countEl = document.getElementById('detailModalItemCount');
        if (countEl) countEl.innerText = `${items.length} ${items.length === 1 ? 'Material' : 'Materials'}`;

        items.forEach((it, idx) => {
            const itemCard = document.createElement('div');
            itemCard.className = 'p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1';
            
            const matName = it.materialName || it.customMaterial || 'Material';
            const brandStr = it.brand || it.customBrand ? `Brand: ${it.brand || it.customBrand}` : '';
            const specStr = it.specification || it.customSpecification ? `Spec: ${it.specification || it.customSpecification}` : '';
            const notesStr = it.notes ? `Note: ${it.notes}` : '';
            const detailsArr = [brandStr, specStr, notesStr].filter(Boolean);

            itemCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-800 text-sm">${idx + 1}. ${escapeHtml(matName)}</span>
                    <span class="font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                        ${escapeHtml(String(it.quantity))} ${escapeHtml(it.unit || '')}
                    </span>
                </div>
                <div class="text-[11px] text-slate-500">
                    <span class="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded mr-2 text-[10px] font-semibold">${escapeHtml(it.category || 'General')}</span>
                    ${detailsArr.length > 0 ? detailsArr.map(escapeHtml).join(' • ') : ''}
                </div>
            `;
            itemsContainer.appendChild(itemCard);
        });
    }

    const notesContainer = document.getElementById('detailModalNotesContainer');
    const notesElem = document.getElementById('detailModalNotes');
    if (notesContainer && notesElem) {
        if (mr.specialNotes && mr.specialNotes.trim()) {
            notesElem.innerText = mr.specialNotes;
            notesContainer.classList.remove('hidden');
        } else {
            notesContainer.classList.add('hidden');
        }
    }

    // Direct Buy financial snapshot elements
    const snapshotContainer = document.getElementById('detailModalDirectSnapshot');
    const unitPriceEl = document.getElementById('detailModalUnitPrice');
    const matAmountEl = document.getElementById('detailModalMatAmount');
    const transportEl = document.getElementById('detailModalTransport');
    const estTotalEl = document.getElementById('detailModalEstTotal');
    const verCodeEl = document.getElementById('detailModalVerCode');

    if (isDirectBuy) {
        if (snapshotContainer) {
            snapshotContainer.classList.remove('hidden');
            if (unitPriceEl) unitPriceEl.innerText = mr.materialPrice ? '₹' + Number(mr.materialPrice).toLocaleString('en-IN') + ' / ' + (firstItem.unit || 'unit') : '₹0';
            if (matAmountEl) matAmountEl.innerText = mr.materialAmount ? '₹' + Number(mr.materialAmount).toLocaleString('en-IN') : '₹0';
            if (transportEl) transportEl.innerText = mr.transportationCost ? '₹' + Number(mr.transportationCost).toLocaleString('en-IN') : '₹0';
            if (estTotalEl) estTotalEl.innerText = mr.estimatedTotal ? '₹' + Number(mr.estimatedTotal).toLocaleString('en-IN') : '₹0';
            if (verCodeEl) {
                if (mr.verificationCode) {
                    verCodeEl.innerText = 'Code: ' + mr.verificationCode;
                    verCodeEl.classList.remove('hidden');
                } else if (mr.status === 'ACCEPTED' || mr.status === 'ORDER_ACCEPTED') {
                    verCodeEl.innerText = 'Order Accepted';
                    verCodeEl.classList.remove('hidden');
                } else {
                    verCodeEl.innerText = 'Verification Code on Accept';
                    verCodeEl.classList.remove('hidden');
                }
            }
        }
    } else {
        if (snapshotContainer) snapshotContainer.classList.add('hidden');
    }

    const acceptBtn = document.getElementById('detailModalAcceptBtn');
    const declineBtn = document.getElementById('detailModalDeclineBtn');
    const quoteBtn = document.getElementById('detailModalQuoteBtn');

    const sellerStatus = (mr.sellerStatus || "").toUpperCase();
    const generalStatus = (mr.status || "NEW").toUpperCase();
    const isAccepted = sellerStatus === "ACCEPTED" || ["ORDER_ACCEPTED", "PROCESSING", "READY_FOR_DISPATCH", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(generalStatus);
    const isDeclined = sellerStatus === "DECLINED" || (isDirectBuy && ["DECLINED", "REJECTED"].includes(generalStatus));

    if (isAccepted) {
        if (acceptBtn) {
            acceptBtn.className = "px-4 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-semibold opacity-75 cursor-not-allowed inline-flex items-center space-x-1.5 shadow-sm";
            acceptBtn.innerHTML = '<i class="fa-solid fa-check text-xs"></i><span>Request Accepted</span>';
            acceptBtn.disabled = true;
            acceptBtn.onclick = null;
            acceptBtn.classList.remove('hidden');
        }
        if (declineBtn) declineBtn.classList.add('hidden');
        if (quoteBtn) quoteBtn.classList.add('hidden');
    } else if (isDeclined) {
        if (declineBtn) {
            const expiryTimestamp = mr.expiryAt || (Date.now() + 86400000);
            let remSec = mr.remainingSeconds != null ? mr.remainingSeconds : Math.max(0, Math.floor((Date.parse(expiryTimestamp) - Date.now()) / 1000));
            declineBtn.className = "px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-semibold opacity-75 cursor-not-allowed inline-flex items-center space-x-1.5 shadow-sm";
            declineBtn.innerHTML = `<i class="fa-solid fa-circle-xmark text-xs"></i><span>Request Declined (${formatRemainingDuration(remSec)})</span>`;
            declineBtn.disabled = true;
            declineBtn.onclick = null;
            declineBtn.classList.remove('hidden');
        }
        if (acceptBtn) acceptBtn.classList.add('hidden');
        if (quoteBtn) quoteBtn.classList.add('hidden');
    } else {
        // Pending
        if (isDirectBuy) {
            if (acceptBtn) {
                acceptBtn.className = "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition-all flex items-center space-x-1.5";
                acceptBtn.innerHTML = '<i class="fa-solid fa-check text-xs"></i><span>Accept Request</span>';
                acceptBtn.disabled = false;
                acceptBtn.onclick = () => handleAcceptRequest(mr.id, rId, acceptBtn);
                acceptBtn.classList.remove('hidden');
            }
            if (declineBtn) {
                declineBtn.className = "px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold transition-all";
                declineBtn.innerHTML = 'Decline Request';
                declineBtn.disabled = false;
                declineBtn.onclick = () => openDeclineConfirmModal(mr.id, rId, declineBtn);
                declineBtn.classList.remove('hidden');
            }
            if (quoteBtn) quoteBtn.classList.add('hidden');
        } else {
            // STEP 2: Posted Material Requirement: NEVER show Accept Request in View modal
            if (acceptBtn) acceptBtn.classList.add('hidden');
            if (declineBtn) {
                declineBtn.className = "px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold transition-all";
                declineBtn.innerHTML = 'Decline Request';
                declineBtn.disabled = false;
                declineBtn.onclick = () => openDeclineConfirmModal(mr.id, rId, declineBtn);
                declineBtn.classList.remove('hidden');
            }
            if (quoteBtn) {
                quoteBtn.classList.remove('hidden');
                const isSubmitted = isQuotationSubmittedForRequest(mr);
                const existingQuoteId = getExistingQuoteIdForRequest(mr);
                if (isSubmitted) {
                    quoteBtn.className = "px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold transition-all flex items-center space-x-1.5 cursor-default";
                    quoteBtn.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600"></i><span>Quotation Already Sent</span>`;
                    quoteBtn.onclick = null;
                } else {
                    quoteBtn.className = "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-all flex items-center space-x-1.5";
                    quoteBtn.innerHTML = `<i class="fa-solid fa-paper-plane text-xs"></i><span>Send Quotation</span>`;
                    quoteBtn.onclick = function() {
                        closeModal('materialRequestDetailModal');
                        const items = mr.items || [];
                        const firstItem = items[0] || {};
                        openQuotationModal(
                            mr.requestId || ('MR-' + mr.id),
                            firstItem.materialName || mr.materialSummary || 'Requested Material',
                            firstItem.quantity || 1,
                            firstItem.unit || 'Units',
                            mr.id
                        );
                    };
                }
            }
        }
    }

    openModal('materialRequestDetailModal');
}

async function acceptDirectBuyRequest(id, rId) {
    const acceptBtn = document.getElementById('detailModalAcceptBtn');
    await handleAcceptRequest(id, rId, acceptBtn);
}

function declineDirectBuyRequest(id, rId) {
    const declineBtn = document.getElementById('detailModalDeclineBtn');
    openDeclineConfirmModal(id, rId, declineBtn);
}

function createRequirementCard(p) {
    const div = document.createElement("div");
    div.className = "bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4";

    const pId = p.projectId || ("PRJ-" + (p.id || "1000"));
    const title = p.projectTitle || p.title || "Customer Material Requirement";
    const type = p.projectType || p.type || "General Construction";
    
    const locParts = [p.city, p.state].filter(Boolean);
    const locStr = locParts.length > 0 ? locParts.join(", ") : (p.location || "Regional Site");

    const targetDate = p.targetStartDate || p.timeline || "Required Soon";
    const status = p.status || "OPEN";
    const statusClass = (status === "OPEN" || status === "New")
        ? "bg-emerald-100 text-emerald-700"
        : "bg-blue-100 text-blue-700";

    const timeAgo = formatTimeAgo(p.createdAt);

    div.innerHTML = `
        <div class="space-y-1.5">
            <div class="flex items-center space-x-2">
                <span class="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-md font-bold">${escapeHtml(pId)}</span>
                <span class="${statusClass} text-[10px] px-2 py-0.5 rounded-full font-semibold">${escapeHtml(status)}</span>
                <span class="text-xs text-slate-500">• ${escapeHtml(timeAgo)}</span>
            </div>
            <h3 class="font-bold text-slate-800 text-base">${escapeHtml(title)}</h3>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span><i class="fa-solid fa-layer-group mr-1 text-blue-500"></i><strong>${escapeHtml(type)}</strong></span>
                <span><i class="fa-solid fa-location-dot mr-1 text-red-500"></i>${escapeHtml(locStr)}</span>
                <span><i class="fa-solid fa-calendar mr-1 text-amber-500"></i>Required by: ${escapeHtml(targetDate)}</span>
            </div>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
            <button onclick="viewRequirementDetail('${escapeJs(pId)}')" class="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all">View</button>
            <button onclick="openQuotationModal('${escapeJs(pId)}', '${escapeJs(title)}', 1, 'Lot')" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all">Send Quote</button>
        </div>
    `;
    return div;
}

function createRequirementRow(p) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition-all";

    const pId = p.projectId || ("PRJ-" + (p.id || "1000"));
    const title = p.projectTitle || p.title || "Customer Project";
    const type = p.projectType || p.type || "General Construction";
    const scope = p.scopeOfWork || p.description || type;
    
    const locParts = [p.city, p.state].filter(Boolean);
    const locStr = locParts.length > 0 ? locParts.join(", ") : (p.location || "NCR");

    const targetDate = p.targetStartDate || p.timeline || "Required Soon";
    const status = p.status || "OPEN";
    const statusClass = (status === "OPEN" || status === "New")
        ? "bg-emerald-100 text-emerald-700"
        : "bg-blue-100 text-blue-700";

    const truncatedScope = scope.length > 48 ? scope.substring(0, 48) + "..." : scope;

    tr.innerHTML = `
        <td class="p-4 font-medium">
            <span class="text-blue-600 font-bold block">${escapeHtml(pId)}</span>
            <span class="text-[11px] text-slate-400">${escapeHtml(title)}</span>
        </td>
        <td class="p-4">
            <span class="font-bold text-slate-800">${escapeHtml(type)}</span>
            <span class="block text-slate-500 text-[11px]">${escapeHtml(truncatedScope)}</span>
        </td>
        <td class="p-4 font-bold text-slate-800">1 Site Lot</td>
        <td class="p-4"><i class="fa-solid fa-location-dot text-red-500 mr-1"></i>${escapeHtml(locStr)}</td>
        <td class="p-4 text-amber-600 font-semibold">${escapeHtml(targetDate)}</td>
        <td class="p-4"><span class="${statusClass} px-2.5 py-1 rounded-full text-[10px] font-bold">${escapeHtml(status)}</span></td>
        <td class="p-4 text-right space-x-2">
            <button onclick="viewRequirementDetail('${escapeJs(pId)}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">View</button>
            <button onclick="openQuotationModal('${escapeJs(pId)}', '${escapeJs(title)}', 1, 'Lot')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">Send Quote</button>
        </td>
    `;
    return tr;
}

/* ==========================================================================
   DASHBOARD INITIALIZATION & AUTH GUARD (PHASE 2 & 3 & 4 & 5)
   ========================================================================== */

async function initSellerDashboard() {
    const token = getCleanToken();

    // 1. Initial token existence guard
    if (!token) {
        console.warn("Seller Dashboard: No authentication token found. Redirecting to login...");
        if (document.body) document.body.style.display = "none";
        window.location.replace("index.html");
        return;
    }

    // 2. Initial client-side role guard
    let currentUser = {};
    let marketplaceUser = {};
    try {
        currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        marketplaceUser = JSON.parse(localStorage.getItem("marketplaceUser") || "{}");
    } catch (e) {}

    const localRole = getAuthenticatedSellerRole(currentUser, marketplaceUser);
    if (localRole && !isSellerRole(localRole)) {
        console.warn(`Seller Dashboard: Role '${localRole}' is not authorized. Redirecting to index.html...`);
        if (document.body) document.body.style.display = "none";
        window.location.replace("index.html");
        return;
    }

    // Pre-populate with cached user details while API loads
    if (currentUser.name || currentUser.username) {
        bindSellerProfile(currentUser);
    } else if (marketplaceUser.name || marketplaceUser.username) {
        bindSellerProfile(marketplaceUser);
    }

    // 3. Authoritative verification with GET /api/me
    const API_BASE_URL = getApiBaseUrl();
    try {
        const meResponse = await fetch(API_BASE_URL + "/api/me", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (meResponse.status === 401 || meResponse.status === 403) {
            console.warn("Seller Dashboard: /api/me unauthorized or expired. Redirecting...");
            logoutSeller();
            return;
        }

        if (meResponse.ok) {
            const profile = await meResponse.json();

            // Verify backend roles from profile
            if (profile.roles) {
                let rolesList = Array.isArray(profile.roles) ? profile.roles : Object.keys(profile.roles);
                const hasValidSellerRole = rolesList.some(r => {
                    const rStr = String(typeof r === "string" ? r : r.name || r.authority || "")
                        .replace("ROLE_", "")
                        .toUpperCase();
                    return isSellerRole(rStr);
                });

                if (!hasValidSellerRole) {
                    console.warn("Seller Dashboard: User does not hold MATERIAL_SELLER or SELLER role.");
                    logoutSeller();
                    return;
                }
            }

            // Bind real seller profile data
            bindSellerProfile(profile);
        }
    } catch (err) {
        console.error("Seller Dashboard: Network error contacting /api/me:", err);
    }

    // 4. Fetch dynamic customer project requirements and Buy Material requests
    try {
        await refreshSellerRequests();
    } catch (err) {
        console.warn("Seller Dashboard: Error in refreshSellerRequests:", err);
    }

    // 5. Fetch dynamic seller inventory
    try {
        await loadSellerInventory();
    } catch (err) {
        console.warn("Seller Dashboard: Error in loadSellerInventory:", err);
    }

    // 5b. Fetch dynamic seller orders & sync active orders sidebar badge
    try {
        await loadSellerOrders();
    } catch (err) {
        console.warn("Seller Dashboard: Error in loadSellerOrders:", err);
    }

    // 5c. Fetch dynamic seller quotations
    if (typeof loadSellerQuotations === 'function') {
        try {
            await loadSellerQuotations();
        } catch (err) {
            console.warn("Seller Dashboard: Error in loadSellerQuotations:", err);
        }
    }

    // 5d. Fetch dynamic seller deliveries & sync active deliveries badge
    if (typeof loadSellerDeliveries === 'function') {
        try {
            await loadSellerDeliveries();
        } catch (err) {
            console.warn("Seller Dashboard: Error in loadSellerDeliveries:", err);
        }
    }

    if (typeof setupTransportModalSyncListeners === 'function') {
        setupTransportModalSyncListeners();
    }

    // 6. Check URL hash or query params (e.g. #invoices, ?from=invoice)
    const urlParams = new URLSearchParams(window.location.search);
    const shouldOpenInvoice = urlParams.get("openInvoice") === "true" || window.location.hash === "#invoices";
    const lastAdded = sessionStorage.getItem("lastAddedMaterial");

    if (shouldOpenInvoice) {
        switchTab("invoices");
        openModal("createInvoiceModal");
        await loadInvoiceMaterials(lastAdded);
        if (lastAdded) {
            sessionStorage.removeItem("lastAddedMaterial");
            showToast("Newly added material ready for invoice: " + lastAdded);
        }
    } else {
        if (window.location.hash) {
            const hashTab = window.location.hash.replace("#", "").trim();
            if (hashTab) switchTab(hashTab);
        }
        // Pre-fetch invoice materials
        loadInvoiceMaterials();
    }

    // Setup Hired Professionals event listeners
    if (typeof initSellerHiredProfessionalsListeners === "function") {
        initSellerHiredProfessionalsListeners();
    }
}

// Global hash change listener for seamless URL-based tab routing
window.addEventListener("hashchange", () => {
    if (window.location.hash) {
        const hashTab = window.location.hash.replace("#", "").trim();
        if (hashTab) switchTab(hashTab);
    }
});

// Execute dashboard initialization as soon as DOM is ready or immediately
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSellerDashboard);
} else {
    initSellerDashboard();
}

/* ==========================================================================
   DYNAMIC DATA BINDING: SELLER MATERIAL INVENTORY
   ========================================================================== */

async function loadSellerInventory() {
    const seq = ++_inventoryReqSeq;
    const tbody = document.getElementById("inventory-table-body");
    const alertsContainer = document.getElementById("low-stock-alerts-container");
    const alertsBadge = document.getElementById("low-stock-alerts-badge");
    const navBadge = document.getElementById("nav-inventory-badge");

    if (tbody) renderSellerTableLoading(tbody, 7);
    if (alertsContainer) renderSellerCardLoading(alertsContainer);

    const token = getCleanToken();
    if (!token) {
        if (seq !== _inventoryReqSeq) return;
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">Please log in to view material catalog.</td></tr>`;
        }
        if (alertsContainer) {
            alertsContainer.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">Please log in to view low stock alerts.</div>`;
        }
        return;
    }

    const API_BASE_URL = getApiBaseUrl();
    try {
        const response = await fetch(API_BASE_URL + "/api/seller/materials", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (seq !== _inventoryReqSeq) return;

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        const materials = await response.json();
        if (Array.isArray(materials)) {
            window.cachedSellerMaterials = materials;
            _sellerCatalogCache = materials;
            renderSellerMaterials(materials);
            updateInventoryLowStockBadge(materials);
            renderLowStockAlerts(materials);
        } else {
            throw new Error("Invalid response format");
        }
    } catch (err) {
        if (seq !== _inventoryReqSeq) return;
        console.warn("Seller Dashboard: Could not load dynamic materials from /api/seller/materials:", err);
        if (tbody) {
            renderSellerTableError(tbody, 7, "loadSellerInventory()");
        }
        if (alertsContainer) {
            renderSellerCardError(alertsContainer, "loadSellerInventory()");
        }
        if (alertsBadge) alertsBadge.textContent = "—";
        if (navBadge) navBadge.textContent = "—";
    }
}

function updateInventoryLowStockBadge(materials) {
    const badge = document.getElementById("nav-inventory-badge") ||
                  document.querySelector('#nav-inventory span.bg-red-500\\/20');
    if (!badge) return;

    if (Array.isArray(materials)) {
        // Count ONLY materials where stockStatus is strictly "LOW_STOCK"
        const lowCount = materials.filter(m => m && m.stockStatus === "LOW_STOCK").length;
        badge.textContent = `${lowCount} Low`;
    } else {
        badge.textContent = "—";
    }
}

function renderLowStockAlerts(materials) {
    const container = document.getElementById("low-stock-alerts-container");
    const badge = document.getElementById("low-stock-alerts-badge");
    if (!container) return;

    if (!Array.isArray(materials)) {
        container.innerHTML = `
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-xs">
                <p class="font-medium text-slate-700">Stock Alerts Unavailable</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Please refresh inventory to update alerts</p>
                <button type="button" onclick="loadSellerInventory()" class="mt-2 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold text-[11px] shadow-sm">Retry</button>
            </div>
        `;
        if (badge) badge.textContent = "—";
        return;
    }

    const lowStockMaterials = materials.filter(m => m && m.stockStatus === "LOW_STOCK");

    if (badge) {
        badge.textContent = `${lowStockMaterials.length} item${lowStockMaterials.length === 1 ? '' : 's'}`;
    }

    container.innerHTML = "";

    if (lowStockMaterials.length === 0) {
        container.innerHTML = `
            <div class="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center text-slate-400">
                <p class="font-medium text-slate-500">No Low Stock Items</p>
                <p class="text-[11px] text-slate-400 mt-0.5">कोई लो स्टॉक आइटम नहीं</p>
            </div>
        `;
        return;
    }

    lowStockMaterials.forEach(mat => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "p-3 bg-white border border-red-100 rounded-lg flex items-center justify-between";

        const materialName = mat.materialName || "Material";
        let stockText = "";
        if (typeof mat.availableStock === "string") {
            stockText = mat.availableStock;
        } else {
            const currentNum = mat.currentStock != null ? Number(mat.currentStock) : 0;
            const reservedNum = mat.reservedStock != null ? Number(mat.reservedStock) : 0;
            const availNum = mat.availableStock != null ? Number(mat.availableStock) : (currentNum - reservedNum);
            let unitDisplay = mat.unit || "";
            if (unitDisplay.includes("—")) {
                unitDisplay = unitDisplay.split("—")[0].trim();
            }
            stockText = `${availNum.toLocaleString("en-IN")} ${unitDisplay}`.trim();
        }

        itemDiv.innerHTML = `
            <div>
                <p class="font-bold text-slate-800">${escapeHtml(materialName)}</p>
                <p class="text-red-600 text-[11px]">Stock: ${escapeHtml(stockText)}</p>
            </div>
            <button onclick="openEditMaterialModal('${escapeJs(String(mat.id))}')" class="px-2.5 py-1.5 bg-red-600 text-white rounded-md text-[11px] font-semibold hover:bg-red-700 transition-all">Restock</button>
        `;
        container.appendChild(itemDiv);
    });
}

function renderSellerMaterials(materials) {
    const tbody = document.getElementById("inventory-table-body");
    if (!tbody || !Array.isArray(materials)) return;

    tbody.innerHTML = "";

    if (materials.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">No materials in catalog yet — कोई सामग्री नहीं मिली</td></tr>`;
        return;
    }

    materials.forEach(mat => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 transition-all";

        const materialName = mat.materialName || "Construction Material";
        const category = mat.category || "General";
        const brand = mat.brand ? ` • ${mat.brand}` : "";
        const specs = mat.specifications ? ` (${mat.specifications})` : "";
        const currentNum = mat.currentStock != null ? Number(mat.currentStock) : 0;
        const reservedNum = mat.reservedStock != null ? Number(mat.reservedStock) : 0;
        const availNum = mat.availableStock != null ? Number(mat.availableStock) : (currentNum - reservedNum);

        const currentStock = currentNum.toLocaleString("en-IN");
        const reservedStock = reservedNum.toLocaleString("en-IN");
        const availableStock = availNum.toLocaleString("en-IN");
        
        let unitDisplay = mat.unit || "";
        if (unitDisplay.includes("—")) {
            unitDisplay = unitDisplay.split("—")[0].trim();
        }
        
        const price = mat.unitPrice != null ? "₹" + Number(mat.unitPrice).toLocaleString("en-IN") : "₹0";
        
        const status = mat.stockStatus || "IN_STOCK";
        let statusBadge = '<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold">In Stock — स्टॉक उपलब्ध</span>';
        if (status === "LOW_STOCK") {
            statusBadge = '<span class="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse">Low Stock — लो स्टॉक</span>';
        } else if (status === "OUT_OF_STOCK") {
            statusBadge = '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Out of Stock — आउट ऑफ स्टॉक</span>';
        }

        let transportPill = '';
        if (mat.transportationPolicyEnabled) {
            const radText = (mat.deliveryRadiusKm != null ? mat.deliveryRadiusKm : 20) + " KM";
            if (mat.transportationChargeBasis === "Free Delivery") {
                transportPill = `<div class="mt-1 flex items-center text-[10px] font-semibold text-emerald-600"><i class="fa-solid fa-truck-fast mr-1 text-[9px]"></i>Free Delivery • ${escapeHtml(radText)}</div>`;
            } else if (mat.transportationChargeBasis === "As Applicable") {
                transportPill = `<div class="mt-1 flex items-center text-[10px] font-semibold text-slate-500"><i class="fa-solid fa-truck mr-1 text-[9px]"></i>As Applicable • ${escapeHtml(radText)}</div>`;
            } else {
                const rateFormatted = mat.transportationRate != null ? "₹" + Number(mat.transportationRate).toLocaleString("en-IN") : "₹0";
                const basisFormatted = mat.transportationChargeBasis ? mat.transportationChargeBasis.replace("Per ", "/") : "";
                transportPill = `<div class="mt-1 flex items-center text-[10px] font-semibold text-blue-700"><i class="fa-solid fa-truck mr-1 text-[9px]"></i>${rateFormatted} ${escapeHtml(basisFormatted)} • ${escapeHtml(radText)}</div>`;
            }
        } else {
            transportPill = `<div class="mt-1 flex items-center text-[10px] text-slate-400"><i class="fa-solid fa-truck mr-1 text-[9px] text-slate-300"></i>Transportation details not specified</div>`;
        }

        tr.innerHTML = `
            <td class="p-4">
                <span class="font-bold text-slate-800 block">${escapeHtml(materialName)}${escapeHtml(specs)}</span>
                <span class="text-[11px] text-slate-400">Category: ${escapeHtml(category)}${escapeHtml(brand)}</span>
                ${transportPill}
            </td>
            <td class="p-4 font-bold text-slate-900">${escapeHtml(currentStock)} ${escapeHtml(unitDisplay)}</td>
            <td class="p-4 text-amber-600 font-semibold">${escapeHtml(reservedStock)} ${escapeHtml(unitDisplay)}</td>
            <td class="p-4 font-bold text-emerald-600">${escapeHtml(availableStock)} ${escapeHtml(unitDisplay)}</td>
            <td class="p-4 font-bold">${escapeHtml(price)} / ${escapeHtml(unitDisplay)}</td>
            <td class="p-4">${statusBadge}</td>
            <td class="p-4 text-right space-x-1.5">
                <button onclick="openEditMaterialModal('${escapeJs(String(mat.id))}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm">Update</button>
                <button onclick="openDeleteMaterialModal('${escapeJs(String(mat.id))}', '${escapeJs(String(materialName))}')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-lg font-semibold transition-all shadow-sm" title="Delete Material — सामग्री हटाएं"><i class="fa-solid fa-trash text-xs"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}




/* ==========================================================================
   EDIT MATERIAL MODAL & INVENTORY UPDATE SYSTEM
   ========================================================================== */

async function openEditMaterialModal(materialId) {
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    try {
        let mat = null;
        if (token) {
            try {
                // Fetch authoritative record from backend
                const response = await fetch(API_BASE_URL + "/api/seller/materials/" + encodeURIComponent(materialId), {
                    method: "GET",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    mat = await response.json();
                } else if (response.status === 403) {
                    showToast("Forbidden: You are not authorized to edit this material.", "error");
                    return;
                }
            } catch (fetchErr) {
                console.warn("Seller Dashboard: Network error fetching material details:", fetchErr);
            }
        }

        // Check against in-memory cached materials if available
        if (!mat && Array.isArray(window.cachedSellerMaterials)) {
            mat = window.cachedSellerMaterials.find(m => String(m.id) === String(materialId));
        }

        if (!mat) {
            showToast("Unable to load material details. Please check connection and try again.", "error");
            return;
        }

        // Populate Form Fields
        const idElem = document.getElementById("editMaterialId");
        const nameElem = document.getElementById("editMaterialName");
        const catElem = document.getElementById("editCategory");
        const curStockElem = document.getElementById("editCurrentStock");
        const resStockElem = document.getElementById("editReservedStock");
        const unitElem = document.getElementById("editUnit");
        const priceElem = document.getElementById("editUnitPrice");
        const brandElem = document.getElementById("editBrand");
        const specsElem = document.getElementById("editSpecifications");
        const descElem = document.getElementById("editDescription");

        if (idElem) idElem.value = mat.id || materialId;
        if (nameElem) nameElem.value = mat.materialName || "";
        if (catElem) catElem.value = mat.category || "";
        if (curStockElem) curStockElem.value = mat.currentStock != null ? mat.currentStock : 0;
        if (resStockElem) resStockElem.value = mat.reservedStock != null ? mat.reservedStock : 0;
        if (unitElem) unitElem.value = mat.unit || "";
        if (priceElem) priceElem.value = mat.unitPrice != null ? mat.unitPrice : 0;
        if (brandElem) brandElem.value = mat.brand || "";
        if (specsElem) specsElem.value = mat.specifications || "";
        if (descElem) descElem.value = mat.description || "";

        // Populate Transportation Policy in Edit Modal
        const locElem = document.getElementById("editDeliveryLocation");
        const radElem = document.getElementById("editDeliveryRadius");
        const basisElem = document.getElementById("editTransportBasis");
        const rateElem = document.getElementById("editTransportRate");
        const beyondElem = document.getElementById("editBeyondRadiusPolicy");

        if (locElem) locElem.value = mat.deliveryLocation || "";
        if (radElem) radElem.value = mat.deliveryRadiusKm != null ? mat.deliveryRadiusKm : 20;
        if (basisElem) basisElem.value = mat.transportationChargeBasis || "";
        if (rateElem) rateElem.value = mat.transportationRate != null ? mat.transportationRate : "";
        if (beyondElem) beyondElem.value = mat.beyondRadiusPolicy || "Fair transportation amount will be charged.";

        updateEditTransportBasisUI();
        calculateEditAvailableStock();
        openModal("editMaterialModal");
    } catch (err) {
        console.error("Seller Dashboard: Error loading material for edit:", err);
        showToast("Network error loading material details", "error");
    }
}

function updateEditTransportBasisUI() {
    const basisElem = document.getElementById("editTransportBasis");
    const rateElem = document.getElementById("editTransportRate");
    const labelElem = document.getElementById("editTransportRateLabel");
    if (!basisElem) return;

    const basis = basisElem.value;
    if (basis === "Free Delivery") {
        if (labelElem) labelElem.innerHTML = 'Transportation Rate: <span class="text-emerald-600 font-bold">₹0 (Free Delivery)</span>';
        if (rateElem) {
            rateElem.value = "0";
            rateElem.disabled = true;
        }
    } else if (basis === "As Applicable") {
        if (labelElem) labelElem.innerHTML = 'Transportation Policy: <span class="text-blue-700 font-bold">As Applicable</span>';
        if (rateElem) {
            rateElem.value = "";
            rateElem.disabled = true;
            rateElem.placeholder = "Fair transportation policy";
        }
    } else {
        if (rateElem) rateElem.disabled = false;
        let unitName = basis ? basis.replace("Per ", "") : "Unit";
        if (labelElem) {
            labelElem.innerHTML = `Transportation Amount: ₹ / ${escapeHtml(unitName)} <span class="text-red-500">*</span>`;
        }
    }
}

function calculateEditAvailableStock() {
    const curElem = document.getElementById("editCurrentStock");
    const resElem = document.getElementById("editReservedStock");
    const availElem = document.getElementById("editAvailableStock");
    const unitElem = document.getElementById("editUnit");
    const warnElem = document.getElementById("editStockWarning");
    const saveBtn = document.getElementById("saveEditBtn");

    const current = parseFloat(curElem ? curElem.value : 0) || 0;
    const reserved = parseFloat(resElem ? resElem.value : 0) || 0;
    const available = current - reserved;
    const cleanUnit = (unitElem && unitElem.value) ? unitElem.value.split("—")[0].trim() : "";

    if (reserved > current) {
        if (warnElem) warnElem.classList.remove("hidden");
        if (availElem) {
            availElem.value = available.toLocaleString("en-IN") + " " + cleanUnit + " (Invalid)";
            availElem.classList.remove("text-emerald-600");
            availElem.classList.add("text-red-600");
        }
        if (saveBtn) saveBtn.disabled = true;
    } else {
        if (warnElem) warnElem.classList.add("hidden");
        if (availElem) {
            availElem.value = Math.max(0, available).toLocaleString("en-IN") + (cleanUnit ? " " + cleanUnit : "");
            availElem.classList.remove("text-red-600");
            availElem.classList.add("text-emerald-600");
        }
        if (saveBtn) saveBtn.disabled = false;
    }
}

async function saveMaterialEdit(event) {
    if (event) event.preventDefault();

    const idElem = document.getElementById("editMaterialId");
    const curStockElem = document.getElementById("editCurrentStock");
    const resStockElem = document.getElementById("editReservedStock");
    const priceElem = document.getElementById("editUnitPrice");
    const brandElem = document.getElementById("editBrand");
    const specsElem = document.getElementById("editSpecifications");
    const descElem = document.getElementById("editDescription");
    const locElem = document.getElementById("editDeliveryLocation");
    const radElem = document.getElementById("editDeliveryRadius");
    const basisElem = document.getElementById("editTransportBasis");
    const rateElem = document.getElementById("editTransportRate");
    const beyondElem = document.getElementById("editBeyondRadiusPolicy");
    const saveBtn = document.getElementById("saveEditBtn");

    const id = idElem ? idElem.value : "";
    const currentStock = parseFloat(curStockElem ? curStockElem.value : 0);
    const reservedStock = parseFloat(resStockElem ? resStockElem.value : 0);
    const unitPrice = parseFloat(priceElem ? priceElem.value : 0);

    if (isNaN(currentStock) || currentStock < 0) {
        showToast("Please enter a valid Current Stock (>= 0)", "error");
        return;
    }
    if (isNaN(reservedStock) || reservedStock < 0) {
        showToast("Please enter a valid Reserved Stock (>= 0)", "error");
        return;
    }
    if (reservedStock > currentStock) {
        showToast("Reserved Stock cannot be greater than Current Stock. आरक्षित स्टॉक वर्तमान स्टॉक से अधिक नहीं हो सकता।", "error");
        return;
    }
    if (isNaN(unitPrice) || unitPrice <= 0) {
        showToast("Please enter a valid selling price (> 0)", "error");
        return;
    }

    const deliveryRadiusKm = radElem && radElem.value !== "" ? parseFloat(radElem.value) : 20;
    if (isNaN(deliveryRadiusKm) || deliveryRadiusKm < 0) {
        showToast("Please enter a valid Standard Delivery Radius (>= 0 KM)", "error");
        return;
    }

    const transportBasis = basisElem ? basisElem.value : "";
    let transportRate = 0;
    if (transportBasis && transportBasis !== "Free Delivery" && transportBasis !== "As Applicable") {
        transportRate = parseFloat(rateElem ? rateElem.value : 0);
        if (isNaN(transportRate) || transportRate < 0) {
            showToast("Please enter a valid non-negative Transportation Rate", "error");
            return;
        }
    }

    const payload = {
        currentStock: currentStock,
        reservedStock: reservedStock,
        unitPrice: unitPrice,
        brand: brandElem ? brandElem.value.trim() : "",
        specifications: specsElem ? specsElem.value.trim() : "",
        description: descElem ? descElem.value.trim() : "",
        deliveryLocation: locElem ? locElem.value.trim() : "",
        deliveryRadiusKm: deliveryRadiusKm,
        transportationChargeBasis: transportBasis,
        transportationRate: transportRate,
        beyondRadiusPolicy: beyondElem ? beyondElem.value.trim() : "Fair transportation amount will be charged.",
        transportationPolicyEnabled: Boolean(transportBasis || deliveryRadiusKm)
    };

    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Saving...</span>';
    }

    try {
        const response = await fetch(API_BASE_URL + "/api/seller/materials/" + encodeURIComponent(id), {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            closeModal("editMaterialModal");
            showToast("Material updated successfully — सामग्री सफलतापूर्वक अपडेट की गई");
            // Refresh Inventory Catalog table immediately
            await loadSellerInventory();
            // Refresh Invoice Entry materials dropdown
            loadInvoiceMaterials();
        } else {
            showToast(data.error || data.message || "Failed to update material", "error");
        }
    } catch (err) {
        console.error("Seller Dashboard: Error saving material edit:", err);
        showToast("Network error updating material. Please try again.", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i><span>Save Changes — सुरक्षित करें</span>';
        }
    }
}

async function markCurrentMaterialOutOfStock() {
    const idElem = document.getElementById("editMaterialId");
    const id = idElem ? idElem.value : "";
    if (!id) {
        showToast("Material ID not found", "error");
        return;
    }

    const btn = document.getElementById("markOutOfStockBtn");
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Updating...</span>';
    }

    try {
        let updated = false;
        if (token) {
            const response = await fetch(API_BASE_URL + "/api/seller/materials/" + encodeURIComponent(id) + "/out-of-stock", {
                method: "PATCH",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                updated = true;
            } else if (response.status === 403) {
                showToast("Forbidden: You cannot modify another seller's material.", "error");
                return;
            } else {
                const data = await response.json().catch(() => ({}));
                showToast(data.error || data.message || "Failed to mark item as out of stock", "error");
                return;
            }
        } else {
            // Local fallback for offline/preview mode
            updated = true;
            const row = document.querySelector(`button[onclick*="openEditMaterialModal('${id}')"]`)?.closest("tr");
            if (row && row.children[5]) {
                row.children[5].innerHTML = '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Out of Stock — आउट ऑफ स्टॉक</span>';
            }
            updateInventoryLowStockBadge();
            renderLowStockAlerts();
        }

        if (updated) {
            closeModal("editMaterialModal");
            showToast("Item Out of Stock — आइटम आउट ऑफ स्टॉक");
            // Refresh inventory catalog dynamically without manual browser refresh
            await loadSellerInventory();
            if (typeof loadInvoiceMaterials === "function") {
                loadInvoiceMaterials();
            }
        }
    } catch (err) {
        console.error("Seller Dashboard: Error marking material out of stock:", err);
        showToast("Network error updating stock status. Please try again.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-ban mr-2"></i><span>Item Out of Stock — आइटम आउट ऑफ स्टॉक</span>';
        }
    }
}

/* ==========================================================================
   DELETE MATERIAL SYSTEM
   ========================================================================== */

function openDeleteMaterialModal(materialId, materialName) {
    const idElem = document.getElementById("deleteTargetMaterialId");
    const nameElem = document.getElementById("deleteTargetMaterialName");
    if (idElem) idElem.value = materialId || "";
    if (nameElem) nameElem.textContent = materialName || "Selected Material";
    openModal("deleteMaterialModal");
}

async function confirmDeleteMaterial() {
    const idElem = document.getElementById("deleteTargetMaterialId");
    const materialId = idElem ? idElem.value : "";
    if (!materialId) {
        closeModal("deleteMaterialModal");
        return;
    }

    const deleteBtn = document.getElementById("confirmDeleteMaterialBtn");
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i><span>Deleting...</span>';
    }

    try {
        if (token) {
            const response = await fetch(API_BASE_URL + "/api/seller/materials/" + encodeURIComponent(materialId), {
                method: "DELETE",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                closeModal("deleteMaterialModal");
                showToast("Material deleted successfully. सामग्री सफलतापूर्वक हटाई गई।");
                await loadSellerInventory();
                if (typeof loadInvoiceMaterials === "function") {
                    loadInvoiceMaterials();
                }
            } else if (response.status === 403) {
                closeModal("deleteMaterialModal");
                showToast("Forbidden: You are not authorized to delete another seller's material.", "error");
            } else if (response.status === 404) {
                closeModal("deleteMaterialModal");
                showToast("Material not found with ID: " + materialId, "error");
                await loadSellerInventory();
            } else {
                const data = await response.json().catch(() => ({}));
                closeModal("deleteMaterialModal");
                showToast(data.error || data.message || "Failed to delete material", "error");
            }
        } else {
            // Local preview fallback if session token missing
            closeModal("deleteMaterialModal");
            showToast("Material deleted successfully. सामग्री सफलतापूर्वक हटाई गई।");
            const row = document.querySelector(`button[onclick*="openDeleteMaterialModal('${materialId}'"]`)?.closest("tr");
            if (row) {
                row.remove();
                updateInventoryLowStockBadge();
                renderLowStockAlerts();
            }
        }
    } catch (err) {
        console.error("Seller Dashboard: Error deleting material:", err);
        closeModal("deleteMaterialModal");
        showToast("Network error deleting material. Please try again.", "error");
    } finally {
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash mr-1.5"></i><span>Delete — हटाएं</span>';
        }
    }
}

/* ==========================================================================
   DYNAMIC DATA BINDING: INVOICE ENTRY MATERIAL SELECTION
   ========================================================================== */

async function loadInvoiceMaterials(preselectName) {
    const select = document.getElementById("invoiceMaterialSelect");
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Please wait… Data loading…</option>';

    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    let materials = null;
    let fetchFailed = false;

    if (token) {
        try {
            const res = await fetch(API_BASE_URL + "/api/seller/materials", {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            });
            if (res.ok) {
                materials = await res.json();
            } else {
                fetchFailed = true;
            }
        } catch (err) {
            console.warn("Seller Dashboard: Could not load dynamic materials for invoice:", err);
            fetchFailed = true;
        }
    } else {
        fetchFailed = true;
    }

    if (!materials && Array.isArray(window.cachedSellerMaterials) && window.cachedSellerMaterials.length > 0) {
        materials = window.cachedSellerMaterials;
        fetchFailed = false;
    }

    if (fetchFailed || !Array.isArray(materials)) {
        select.innerHTML = '<option value="" disabled selected>Catalog unavailable — retry</option>';
        return;
    }

    if (materials.length === 0) {
        select.innerHTML = '<option value="" disabled selected>No materials available</option>';
        return;
    }

    select.innerHTML = '<option value="">-- Select Material from Inventory Catalog --</option>';

    materials.forEach(mat => {
        const opt = document.createElement("option");
        opt.value = mat.materialName || "";
        opt.textContent = `${mat.materialName || "Material"} (${mat.category || "General"}) — ₹${Number(mat.unitPrice || 0).toLocaleString("en-IN")} / ${mat.unit || "unit"}`;
        opt.dataset.unit = mat.unit || "";
        opt.dataset.price = mat.unitPrice != null ? mat.unitPrice : "0";
        opt.dataset.brand = mat.brand || "";
        opt.dataset.category = mat.category || "";
        opt.dataset.stock = mat.availableStock != null ? mat.availableStock : mat.currentStock;
        opt.dataset.transportBasis = mat.transportationChargeBasis || "";
        opt.dataset.transportRate = mat.transportationRate != null ? mat.transportationRate : "0";
        opt.dataset.transportEnabled = mat.transportationPolicyEnabled ? "true" : "false";
        select.appendChild(opt);
    });

    if (preselectName) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === preselectName || select.options[i].text.includes(preselectName)) {
                select.selectedIndex = i;
                onInvoiceMaterialChange(select);
                break;
            }
        }
    }
}

function onInvoiceMaterialChange(select) {
    if (!select) return;
    const selectedOption = select.options[select.selectedIndex];
    const unitInput = document.getElementById("invoiceUnit");
    const unitPriceInput = document.getElementById("invoiceUnitPrice");
    const transportInput = document.getElementById("invoiceTransportAmount");
    const transportBasisInput = document.getElementById("invoiceTransportBasis");
    const qtyInput = document.getElementById("invoiceQty");

    if (!selectedOption || !selectedOption.value) {
        if (unitInput) unitInput.value = "";
        if (unitPriceInput) unitPriceInput.value = "";
        if (transportInput) transportInput.value = "0";
        if (transportBasisInput) transportBasisInput.value = "";
        calculateInvoiceTotal();
        return;
    }

    const unit = selectedOption.dataset.unit || "";
    const cleanUnit = unit.includes("—") ? unit.split("—")[0].trim() : unit;
    const price = selectedOption.dataset.price || "0";
    const transportBasis = selectedOption.dataset.transportBasis || "";
    const transportRate = parseFloat(selectedOption.dataset.transportRate || 0) || 0;
    const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;

    if (unitInput) unitInput.value = cleanUnit;
    if (unitPriceInput) unitPriceInput.value = price;

    if (transportBasisInput) {
        if (transportBasis === "Free Delivery") {
            transportBasisInput.value = "Free Delivery (₹0)";
            if (transportInput) transportInput.value = "0";
        } else if (transportBasis === "As Applicable") {
            transportBasisInput.value = "As Applicable";
            if (transportInput) transportInput.value = "0";
        } else if (transportBasis) {
            transportBasisInput.value = `₹${transportRate} / ${transportBasis.replace("Per ", "")}`;
            let autoTransport = 0;
            if (transportBasis === "Per Order") {
                autoTransport = transportRate;
            } else if (transportBasis === "Per 100 Pieces") {
                autoTransport = Math.round((qty / 100.0) * transportRate);
            } else if (transportBasis === "Per 500 Pieces") {
                autoTransport = Math.round((qty / 500.0) * transportRate);
            } else if (transportBasis === "Per 1000 Pieces") {
                autoTransport = Math.round((qty / 1000.0) * transportRate);
            } else {
                autoTransport = Math.round(qty * transportRate);
            }
            if (transportInput) transportInput.value = autoTransport;
        } else {
            transportBasisInput.value = "Not Specified";
            if (transportInput) transportInput.value = "0";
        }
    }

    calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
    const qtyInput = document.getElementById("invoiceQty");
    const priceInput = document.getElementById("invoiceUnitPrice");
    const transportInput = document.getElementById("invoiceTransportAmount");
    const matSubtotalElem = document.getElementById("invoiceMaterialSubtotal");
    const transportDisplayElem = document.getElementById("invoiceTransportDisplay");
    const gstDisplayElem = document.getElementById("invoiceGstDisplay");
    const totalElem = document.getElementById("invoiceCalculatedTotal");

    const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
    const price = parseFloat(priceInput ? priceInput.value : 0) || 0;
    const transport = parseFloat(transportInput ? transportInput.value : 0) || 0;

    const subtotal = Math.round(qty * price);
    const gst = Math.round((subtotal + transport) * 0.18);
    const grandTotal = subtotal + transport + gst;

    if (matSubtotalElem) matSubtotalElem.innerText = "₹" + subtotal.toLocaleString("en-IN");
    if (transportDisplayElem) transportDisplayElem.innerText = "₹" + transport.toLocaleString("en-IN");
    if (gstDisplayElem) gstDisplayElem.innerText = "₹" + gst.toLocaleString("en-IN");
    if (totalElem) {
        totalElem.innerText = "₹" + grandTotal.toLocaleString("en-IN");
    }
}

/* ==========================================================================
   ORIGINAL STATIC DASHBOARD INTERACTION METHODS (PRESERVED 100%)
   ========================================================================== */

/**
 * Switch active dashboard tabs and sync sidebar navigation states
 * @param {string} tabId - Identifier of the tab to activate
 */
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    // Remove active style from all nav links
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
        el.classList.add('text-slate-300', 'hover:bg-slate-800', 'hover:text-white');
    });
    
    // Show selected tab
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }

    // Activate nav link
    const targetNav = document.getElementById('nav-' + tabId);
    if (targetNav) {
        targetNav.classList.remove('text-slate-300', 'hover:bg-slate-800', 'hover:text-white');
        targetNav.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
    }

    if (typeof updateSellerOrdersBadge === 'function' && Array.isArray(sellerOrdersCache) && sellerOrdersCache.length > 0) {
        updateSellerOrdersBadge(sellerOrdersCache);
    }

    if (tabId === 'requests' && typeof refreshSellerRequests === 'function') {
        refreshSellerRequests();
    }
    if ((tabId === 'orders' || tabId === 'dashboard') && typeof loadSellerOrders === 'function') {
        loadSellerOrders();
    }
    if (tabId === 'quotations' && typeof loadSellerQuotations === 'function') {
        loadSellerQuotations();
    }
    if (tabId === 'inventory' && typeof loadSellerInventory === 'function') {
        loadSellerInventory();
    }
    if (tabId === 'hired-professionals' && typeof loadSellerHiredProfessionals === 'function') {
        loadSellerHiredProfessionals();
    }
    if ((tabId === 'deliveries' || tabId === 'dashboard') && typeof loadSellerDeliveries === 'function') {
        loadSellerDeliveries();
    }
}

/**
 * Fetch and refresh both Buy Material requests and Customer Project requirements
 */
async function refreshSellerRequests() {
    const seq = ++_requestsReqSeq;
    const listContainer = document.getElementById("incoming-requirements-list");
    const tbody = document.getElementById("material-requests-tbody");
    const countLabel = document.getElementById("requirements-count-label");
    const bannerReqCount = document.getElementById("seller-banner-req-count");
    const kpiActiveRequests = document.getElementById("kpi-active-requests");

    if (listContainer) renderSellerCardLoading(listContainer);
    if (tbody) renderSellerTableLoading(tbody, 7);

    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();
    if (!token) {
        if (seq !== _requestsReqSeq) return;
        if (listContainer) listContainer.innerHTML = '<div class="p-6 text-center text-slate-400 text-xs">Please login to view customer material requirements.</div>';
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-400 text-xs">Please login to view material requests.</td></tr>';
        return;
    }

    let fetchedProjects = null;
    let fetchedMaterialRequests = null;
    let mrError = false;
    let projError = false;

    try {
        const mrResponse = await fetch(API_BASE_URL + "/api/material-requests/seller", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });
        if (mrResponse.ok) {
            fetchedMaterialRequests = await mrResponse.json();
        } else {
            mrError = true;
        }
    } catch (err) {
        console.warn("Seller Dashboard: Could not reload /api/material-requests/seller:", err);
        mrError = true;
    }

    try {
        const projResponse = await fetch(API_BASE_URL + "/api/projects", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });
        if (projResponse.ok) {
            fetchedProjects = await projResponse.json();
        } else {
            projError = true;
        }
    } catch (err) {
        console.warn("Seller Dashboard: Could not reload /api/projects:", err);
        projError = true;
    }

    if (seq !== _requestsReqSeq) return;

    if (mrError && projError) {
        if (listContainer) renderSellerCardError(listContainer, "refreshSellerRequests()");
        if (tbody) renderSellerTableError(tbody, 7, "refreshSellerRequests()");
        if (countLabel) countLabel.innerText = "—";
        if (bannerReqCount) bannerReqCount.innerText = "Requirements unavailable";
        if (kpiActiveRequests) kpiActiveRequests.innerText = "—";
        return;
    }

    const validMR = Array.isArray(fetchedMaterialRequests) ? fetchedMaterialRequests : [];
    const validProj = Array.isArray(fetchedProjects) ? fetchedProjects : [];

    if (mrError && validProj.length === 0) {
        if (listContainer) renderSellerCardError(listContainer, "refreshSellerRequests()");
        if (tbody) renderSellerTableError(tbody, 7, "refreshSellerRequests()");
        if (countLabel) countLabel.innerText = "—";
        if (bannerReqCount) bannerReqCount.innerText = "Requirements unavailable";
        if (kpiActiveRequests) kpiActiveRequests.innerText = "—";
        return;
    }

    renderIncomingRequirements(validProj, validMR);
}

/**
 * Helper to escape HTML characters in notification templates
 */
function escapeSellerHTML(str) {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

function formatSellerNotifTime(dateStr) {
    if (!dateStr) return "Just now";
    try {
        const diffMs = Date.now() - new Date(dateStr).getTime();
        if (isNaN(diffMs) || diffMs < 0) return "Just now";
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return "Yesterday";
        return `${days}d ago`;
    } catch (e) {
        return "Recently";
    }
}

/**
 * Toggle visibility of top header notifications dropdown
 */
function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) {
        const isOpening = dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden');
        if (isOpening) {
            loadSellerNotifications();
        }
    }
}

/**
 * Fetch and render live seller notifications from backend
 */
async function loadSellerNotifications() {
    const token = getCleanToken();
    const notifsContainer = document.getElementById('sellerNotificationsList');
    const badge = document.getElementById('sellerNotifBadge');
    const headerTitle = document.getElementById('sellerNotifHeaderTitle');

    if (!token) {
        if (notifsContainer) {
            notifsContainer.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">Please login to view notifications</div>';
        }
        if (badge) badge.classList.add('hidden');
        return;
    }

    if (notifsContainer) {
        notifsContainer.innerHTML = `
            <div class="p-6 text-center text-slate-500" role="status" aria-live="polite">
                <div class="flex flex-col items-center justify-center space-y-2 py-2">
                    <i class="fa-solid fa-circle-notch fa-spin seller-spinner-icon text-blue-600 text-2xl" aria-hidden="true"></i>
                    <p class="font-semibold text-slate-700 text-xs">Please wait…</p>
                    <p class="text-[11px] text-slate-400">Data loading…</p>
                </div>
            </div>
        `;
    }

    try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/notifications`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            if (notifsContainer) {
                notifsContainer.innerHTML = `
                    <div class="p-6 text-center text-xs">
                        <p class="text-slate-500 mb-2">Unable to load notifications. The server may be starting or temporarily unavailable.</p>
                        <button type="button" onclick="loadSellerNotifications()" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">Retry</button>
                    </div>
                `;
            }
            return;
        }

        const data = await res.json();
        const notifs = data.notifications || [];
        const unreadCount = data.unreadCount || 0;

        // Update badge
        if (badge) {
            if (unreadCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // Update header
        if (headerTitle) {
            headerTitle.textContent = `Notifications / सूचनाएं ${unreadCount > 0 ? '(' + unreadCount + ' New)' : ''}`;
        }

        // Render notifications list
        if (!notifsContainer) return;

        if (notifs.length === 0) {
            notifsContainer.innerHTML = `
                <div class="p-6 text-center text-slate-400 text-xs">
                    <i class="fa-regular fa-bell-slash text-2xl mb-2 text-slate-300 block"></i>
                    No notifications yet / अभी कोई सूचना नहीं है
                </div>
            `;
            return;
        }

        notifsContainer.innerHTML = notifs.map(n => {
            const isUnread = !n.isRead;
            const type = (n.type || "").toUpperCase();
            let iconClass = "fa-solid fa-bell text-blue-500";
            if (type.includes("ORDER") || type.includes("DIRECT_BUY")) iconClass = "fa-solid fa-boxes-stacked text-emerald-500";
            else if (type.includes("QUOTATION") || type.includes("REQUIREMENT")) iconClass = "fa-solid fa-file-invoice-dollar text-blue-500";
            else if (type.includes("DELIVERY") || type.includes("DISPATCH")) iconClass = "fa-solid fa-truck-fast text-purple-500";

            return `
                <div class="p-3 hover:bg-slate-50 cursor-pointer transition-all ${isUnread ? 'bg-blue-50/40' : ''}" 
                     onclick="handleSellerNotificationClick(${n.id}, '${escapeSellerHTML(n.type || '')}', '${escapeSellerHTML(n.referenceId || '')}', ${isUnread})">
                    <div class="flex items-start space-x-2.5">
                        <div class="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 flex-shrink-0">
                            <i class="${iconClass} text-xs"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between">
                                <p class="font-semibold text-slate-800 truncate">${escapeSellerHTML(n.title || '')}</p>
                                ${isUnread ? '<span class="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 ml-1"></span>' : ''}
                            </div>
                            ${n.titleHi ? `<p class="text-[11px] font-medium text-slate-600 truncate">${escapeSellerHTML(n.titleHi)}</p>` : ''}
                            <p class="text-slate-500 text-[11px] mt-0.5 line-clamp-2">${escapeSellerHTML(n.message || '')}</p>
                            ${n.messageHi ? `<p class="text-slate-400 text-[10px] mt-0.5 line-clamp-2">${escapeSellerHTML(n.messageHi)}</p>` : ''}
                            <span class="text-[10px] text-slate-400 mt-1 block">${formatSellerNotifTime(n.createdAt)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Seller notifications load error:", err);
        if (notifsContainer) {
            notifsContainer.innerHTML = `
                <div class="p-6 text-center text-xs">
                    <p class="text-slate-500 mb-2">Unable to load notifications. The server may be starting or temporarily unavailable.</p>
                    <button type="button" onclick="loadSellerNotifications()" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">Retry</button>
                </div>
            `;
        }
    }
}

/**
 * Handle notification click: mark as read and route seller appropriately
 */
async function handleSellerNotificationClick(notifId, type, refId, isUnread) {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    if (isUnread && notifId) {
        try {
            const baseUrl = getApiBaseUrl();
            const token = getCleanToken();
            await fetch(`${baseUrl}/api/notifications/${notifId}/read`, {
                method: "PUT",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            });
            loadSellerNotifications();
        } catch (e) {
            console.warn("Could not mark notif read:", e);
        }
    }

    const t = (type || "").toUpperCase();
    if (t.includes("QUOTATION_REJECTED")) {
        switchTab('quotations');
    } else if (t.includes("ORDER") || t.includes("DIRECT_BUY")) {
        switchTab('orders');
    } else if (t.includes("QUOTATION") || t.includes("REQUIREMENT") || t.includes("LEAD")) {
        switchTab('requests');
    } else {
        switchTab('dashboard');
    }
}

/**
 * Mark all seller notifications as read
 */
async function markAllSellerNotificationsRead() {
    const token = getCleanToken();
    if (!token) return;

    try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/notifications/mark-all-read`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });
        showToast("All notifications marked as read / सभी सूचनाएं पढ़ी गईं");
        loadSellerNotifications();
    } catch (e) {
        console.error("Mark all read failed:", e);
        showToast("Error marking notifications as read");
    }
}

/**
 * Open specified modal by modal element ID
 * @param {string} modalId 
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (modalId === 'createInvoiceModal' && typeof loadInvoiceMaterials === 'function') {
            loadInvoiceMaterials();
        }
    }
}

/**
 * Close specified modal by modal element ID
 * @param {string} modalId 
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

/**
 * Populate and launch quotation modal with requirement context (Phase 4C Multi-Material)
 * @param {string} reqId 
 * @param {string} material 
 * @param {number} qty 
 * @param {string} unit 
 * @param {number} [materialReqDbId]
 */
let currentQuotationTarget = { reqId: null, dbId: null, material: "", qty: 1, unit: "Units", items: [] };
let _sellerCatalogCache = null;

async function getSellerCatalogMaterials() {
    if (_sellerCatalogCache && Array.isArray(_sellerCatalogCache) && _sellerCatalogCache.length > 0) {
        return _sellerCatalogCache;
    }
    if (window.cachedSellerMaterials && Array.isArray(window.cachedSellerMaterials) && window.cachedSellerMaterials.length > 0) {
        _sellerCatalogCache = window.cachedSellerMaterials;
        return _sellerCatalogCache;
    }
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();
    if (token) {
        try {
            const res = await fetch(API_BASE_URL + "/api/seller/materials", {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            });
            if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list)) {
                    _sellerCatalogCache = list;
                    window.cachedSellerMaterials = list;
                    return list;
                }
            }
        } catch (e) {
            console.warn("Could not fetch seller catalog materials:", e);
        }
    }
    return [];
}

function onQuotationSkuChanged(selectElem) {
    const selectedOpt = selectElem.options[selectElem.selectedIndex];
    const tr = selectElem.closest('tr');
    if (!tr) return;

    if (selectedOpt && selectedOpt.value) {
        const price = parseFloat(selectedOpt.dataset.price) || 0;
        const unit = selectedOpt.dataset.unit || '';
        const priceInput = tr.querySelector('.q-item-price');
        const unitInput = tr.querySelector('.q-item-unit');
        if (priceInput && price > 0) priceInput.value = price;
        if (unitInput && unit) unitInput.value = unit;
    }
    calculateQuote();
}

async function openQuotationModal(reqId, material, qty, unit, materialReqDbId) {
    // Resolve material request object if available
    let mr = null;
    if (window.cachedMaterialRequests) {
        mr = window.cachedMaterialRequests[reqId] || 
             window.cachedMaterialRequests[materialReqDbId] || 
             window.cachedMaterialRequests[String(materialReqDbId)] || 
             null;
    }

    if (mr && isQuotationSubmittedForRequest(mr)) {
        showToast(`An active quotation already exists for this material request from your account. Resubmission is not permitted while an active quotation is pending.`);
        return;
    }

    editingQuotationTarget = null;
    const modalTitle = document.querySelector('#quotationModal h3');
    if (modalTitle) modalTitle.innerText = "Create B2B Multi-Material Quotation";

    const sendBtn = document.getElementById('sendQuotationBtn');
    if (sendBtn) {
        sendBtn.className = "px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-all flex items-center space-x-2";
        sendBtn.innerHTML = `<i class="fa-solid fa-paper-plane mr-1.5"></i><span>Send Quotation Now</span>`;
        sendBtn.onclick = submitSellerQuotation;
    }

    const reqIdElem = document.getElementById('quoteModalReqId');
    const tbody = document.getElementById('qItemsTbody');

    const dbId = materialReqDbId || (mr && mr.id) || (typeof reqId === 'number' ? reqId : (parseInt(String(reqId).replace(/[^0-9]/g, '')) || null));

    currentQuotationTarget = {
        reqId: reqId,
        dbId: dbId,
        material: material,
        qty: qty,
        unit: unit,
        items: (mr && Array.isArray(mr.items) && mr.items.length > 0) ? mr.items : [
            { id: null, materialName: material, quantity: qty, unit: unit }
        ]
    };

    if (reqIdElem) {
        reqIdElem.innerText = `Responding to ${reqId} — ${currentQuotationTarget.items.length} ${currentQuotationTarget.items.length === 1 ? 'Material' : 'Materials'}`;
    }

    // Set legacy fallback inputs
    const matElem = document.getElementById('qMaterialName');
    const qtyElem = document.getElementById('qQty');
    const unitElem = document.getElementById('qUnit');
    if (matElem) matElem.value = material;
    if (qtyElem) qtyElem.value = qty;
    if (unitElem) unitElem.value = unit;

    // Fetch seller catalog materials from /api/seller/materials
    const catalog = await getSellerCatalogMaterials();

    // Render line items in tbody
    if (tbody) {
        tbody.innerHTML = "";
        currentQuotationTarget.items.forEach((reqItem, idx) => {
            const reqItemName = reqItem.materialName || 'Requested Material';
            const reqQty = reqItem.quantity != null ? reqItem.quantity : 1;
            const reqUnit = reqItem.unit || 'Units';
            const reqItemId = reqItem.id || '';

            // Find best matching catalog SKU by name similarity if possible
            let matchingMat = catalog.find(m => m.materialName && reqItemName && (
                m.materialName.toLowerCase().includes(reqItemName.toLowerCase()) ||
                reqItemName.toLowerCase().includes(m.materialName.toLowerCase())
            ));

            const defaultPrice = matchingMat ? (matchingMat.unitPrice || 0) : 0;
            const defaultUnit = matchingMat ? (matchingMat.unit || reqUnit) : reqUnit;

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-all';
            tr.dataset.reqItemId = reqItemId;
            tr.dataset.itemIndex = idx;

            // Generate catalog options
            let optionsHtml = '<option value="">-- Select Your Catalog SKU --</option>';
            catalog.forEach(catMat => {
                const isSelected = matchingMat && matchingMat.id === catMat.id ? 'selected' : '';
                const brand = catMat.brand ? ` (${catMat.brand})` : '';
                optionsHtml += `<option value="${catMat.id}" data-price="${catMat.unitPrice || 0}" data-unit="${escapeHtml(catMat.unit || '')}" ${isSelected}>${escapeHtml(catMat.materialName)}${brand} - ₹${catMat.unitPrice || 0}/${catMat.unit || 'unit'}</option>`;
            });

            tr.innerHTML = `
                <td class="p-3">
                    <label class="flex items-center space-x-2 cursor-pointer mb-1">
                        <input type="checkbox" class="q-item-include w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" checked onchange="toggleQuoteRow(this)">
                        <span class="font-bold text-slate-800 text-xs">${escapeHtml(reqItemName)}</span>
                    </label>
                    <span class="text-[10px] text-slate-500 font-medium ml-6 block">Req: ${escapeHtml(String(reqQty))} ${escapeHtml(reqUnit)}</span>
                </td>
                <td class="p-3">
                    <select class="q-sku-select w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white" onchange="onQuotationSkuChanged(this)">
                        ${optionsHtml}
                    </select>
                </td>
                <td class="p-3">
                    <input type="number" min="0.01" step="any" class="q-item-qty w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs" value="${reqQty}" oninput="calculateQuote()">
                </td>
                <td class="p-3">
                    <input type="text" class="q-item-unit w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs" value="${escapeHtml(defaultUnit)}">
                </td>
                <td class="p-3">
                    <input type="number" min="0" step="any" class="q-item-price w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs" value="${defaultPrice}" oninput="calculateQuote()">
                </td>
                <td class="p-3 text-right">
                    <span class="q-item-total font-bold text-slate-800">₹0</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    calculateQuote();
    openModal('quotationModal');
}

function toggleQuoteRow(chk) {
    const tr = chk.closest('tr');
    if (!tr) return;
    const isChecked = chk.checked;
    const inputs = tr.querySelectorAll('.q-sku-select, .q-item-qty, .q-item-unit, .q-item-price');
    inputs.forEach(inp => inp.disabled = !isChecked);
    if (!isChecked) {
        tr.classList.add('opacity-40');
        const totalSpan = tr.querySelector('.q-item-total');
        if (totalSpan) totalSpan.innerText = '—';
    } else {
        tr.classList.remove('opacity-40');
    }
    calculateQuote();
}

/**
 * Submit persistent structured quotation to backend API (POST /api/quotations)
 */
async function submitSellerQuotation() {
    const submitBtn = document.getElementById('sendQuotationBtn');
    const transportInput = document.getElementById('qTransport');
    const timelineInput = document.getElementById('qTimeline');
    const paymentTermsInput = document.getElementById('qPaymentTerms');
    const validityInput = document.getElementById('qValidity');
    const warrantyInput = document.getElementById('qWarranty');

    const transport = parseFloat(transportInput ? transportInput.value : 0) || 0;
    const timeline = timelineInput ? timelineInput.value.trim() : "2-3 Days";
    const paymentTerms = paymentTermsInput ? paymentTermsInput.value.trim() : "100% on Site Delivery";
    const validity = validityInput ? validityInput.value.trim() : "7 Days";
    const warranty = warrantyInput ? warrantyInput.value.trim() : "Standard Manufacturer / BIS Batch Certified";

    const rows = document.querySelectorAll('#qItemsTbody tr');
    const items = [];
    const seenReqItemIds = new Set();
    let subtotal = 0;
    const itemSummaries = [];

    for (const tr of rows) {
        const isIncluded = tr.querySelector('.q-item-include')?.checked;
        if (!isIncluded) continue; // Partial quote: seller skips unavailable items

        const skuSelect = tr.querySelector('.q-sku-select');
        const materialId = parseInt(skuSelect?.value) || null;
        const reqItemId = tr.dataset.reqItemId ? parseInt(tr.dataset.reqItemId) : null;
        const qty = parseFloat(tr.querySelector('.q-item-qty')?.value || 0) || 0;
        const unit = tr.querySelector('.q-item-unit')?.value?.trim() || 'Units';
        const unitPrice = parseFloat(tr.querySelector('.q-item-price')?.value || 0) || 0;

        if (!materialId) {
            showToast('Please select a catalog SKU for all included items. — कृपया सभी शामिल वस्तुओं के लिए सामग्री SKU चुनें।');
            return;
        }
        if (qty <= 0) {
            showToast('Quoted quantity must be greater than zero. — मात्रा शून्य से अधिक होनी चाहिए।');
            return;
        }
        if (unitPrice < 0) {
            showToast('Unit price cannot be negative. — दर शून्य से कम नहीं हो सकती।');
            return;
        }
        if (reqItemId) {
            if (seenReqItemIds.has(reqItemId)) {
                showToast('Duplicate mapping for requested item rejected. — दोहरा मैपिंग अमान्य है।');
                return;
            }
            seenReqItemIds.add(reqItemId);
        }

        const lineTotal = Math.round(qty * unitPrice * 100) / 100;
        subtotal += lineTotal;

        const selectedOpt = skuSelect.options[skuSelect.selectedIndex];
        const matName = selectedOpt ? selectedOpt.text.split(' - ')[0] : 'Catalog SKU';
        itemSummaries.push(`${matName} (${qty} ${unit})`);

        items.push({
            materialRequestItemId: reqItemId,
            materialId: materialId,
            quantity: qty,
            unit: unit,
            unitPrice: unitPrice
        });
    }

    if (items.length === 0) {
        showToast('Please include at least one material to quote. — कम से कम एक सामग्री का चयन करें।');
        return;
    }

    const gst = Math.round(subtotal * 0.18);
    const total = subtotal + gst + transport;

    if (!currentQuotationTarget || (!currentQuotationTarget.dbId && !currentQuotationTarget.reqId)) {
        showToast('Error: Target material requirement could not be identified.');
        return;
    }

    const token = getCleanToken();
    if (!token) {
        showToast('Authentication required. Please log in as a Material Seller.');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Sending...';
    }

    const payload = {
        requestType: "MATERIAL_REQUIREMENT",
        materialRequestId: currentQuotationTarget.dbId || null,
        requestId: currentQuotationTarget.reqId || null,
        quotedAmount: total,
        materialCost: subtotal,
        labourCost: 0,
        transportationCost: transport,
        taxGst: gst,
        timeline: timeline,
        validity: validity,
        warranty: warranty,
        paymentTerms: paymentTerms,
        includedItems: itemSummaries.join(', ') + " with direct site delivery",
        excludedItems: "Unloading to upper floors",
        message: `Quotation submitted with ${items.length} structured catalog items. Total: ₹${total.toLocaleString('en-IN')}.`,
        items: items
    };

    const API_BASE_URL = getApiBaseUrl();

    try {
        const res = await fetch(`${API_BASE_URL}/api/quotations`, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 201) {
            showToast(`Quotation ${data.quotationId || ''} submitted successfully! — कोटेशन सफलतापूर्वक भेज दिया गया!`);
            closeModal('quotationModal');
            if (currentQuotationTarget) {
                const targetId = currentQuotationTarget.dbId || currentQuotationTarget.reqId;
                if (targetId && window.cachedMaterialRequests) {
                    const cached = window.cachedMaterialRequests[targetId] ||
                                   window.cachedMaterialRequests[currentQuotationTarget.reqId] ||
                                   window.cachedMaterialRequests[currentQuotationTarget.dbId];
                    if (cached) {
                        cached.quotationSubmitted = true;
                        cached.hasSubmittedQuotation = true;
                        cached.existingQuotationId = data.quotationId;
                    }
                }
            }
            if (typeof loadSellerQuotations === 'function') {
                await loadSellerQuotations();
            }
            if (typeof refreshSellerRequests === 'function') {
                await refreshSellerRequests();
            }
        } else if (res.status === 409) {
            showToast(data.error || 'An active quotation already exists for this request from your account.');
        } else if (res.status === 403) {
            showToast(data.error || 'Unauthorized: You can only quote your own catalog materials.');
        } else if (res.status === 401) {
            showToast('Session expired. Please log in again.');
        } else if (res.status === 400) {
            showToast(data.error || 'Invalid quotation data.');
        } else {
            showToast(data.error || 'Failed to submit quotation. Server error.');
        }
    } catch (err) {
        console.error('Quotation submission network error:', err);
        showToast('Network error. Unable to reach server. Please check your connection.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.originalText || 'Send Quotation Now';
        }
    }
}

/**
 * Recalculate quotation line totals, GST, transport, and final total
 */
function calculateQuote() {
    let subtotal = 0;
    const rows = document.querySelectorAll('#qItemsTbody tr');
    rows.forEach(tr => {
        const isIncluded = tr.querySelector('.q-item-include')?.checked;
        if (!isIncluded) {
            const totalSpan = tr.querySelector('.q-item-total');
            if (totalSpan) totalSpan.innerText = '—';
            return;
        }
        const qty = parseFloat(tr.querySelector('.q-item-qty')?.value || 0) || 0;
        const price = parseFloat(tr.querySelector('.q-item-price')?.value || 0) || 0;
        const lineTotal = Math.round(qty * price * 100) / 100;
        const totalSpan = tr.querySelector('.q-item-total');
        if (totalSpan) totalSpan.innerText = '₹' + lineTotal.toLocaleString('en-IN');
        subtotal += lineTotal;
    });

    const subtotalElem = document.getElementById('qMaterialSubtotal');
    if (subtotalElem) subtotalElem.value = '₹' + subtotal.toLocaleString('en-IN');

    const transportInput = document.getElementById('qTransport');
    const transport = parseFloat(transportInput ? transportInput.value : 0) || 0;

    const gst = Math.round(subtotal * 0.18);
    const gstInput = document.getElementById('qGst');
    if (gstInput) gstInput.value = '₹' + gst.toLocaleString('en-IN');

    const total = subtotal + gst + transport;
    const totalElem = document.getElementById('qFinalTotal');
    if (totalElem) totalElem.innerText = '₹' + total.toLocaleString('en-IN');
}

/* ==========================================================================
   DYNAMIC SELLER QUOTATIONS MANAGEMENT (Phase 2)
   ========================================================================== */

let sellerQuotationsCache = [];
let currentQuotationFilter = 'ALL';
let _isQuotationsLoading = false;

function createNewQuotationRedirect() {
    switchTab('requests');
    showToast('Please select an active material requirement below to create and send a quotation.');
}

function formatQuotationDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return String(dateStr);
    }
}

function formatQuotationValidity(validityStr, createdAtStr) {
    if (!validityStr && !createdAtStr) return '—';
    if (!validityStr) return formatQuotationDate(createdAtStr);
    if (/\d{4}-\d{2}-\d{2}/.test(validityStr)) {
        return formatQuotationDate(validityStr);
    }
    if (/^\d+\s*day/i.test(String(validityStr).trim()) && createdAtStr) {
        try {
            const days = parseInt(validityStr) || 7;
            const cd = new Date(createdAtStr);
            if (!isNaN(cd.getTime())) {
                const target = new Date(cd.getTime() + days * 86400000);
                return formatQuotationDate(target);
            }
        } catch (e) {}
    }
    return escapeHtml(String(validityStr));
}

function getQuotationStatusBadge(status) {
    const s = (status || 'SUBMITTED').toUpperCase();
    if (s === 'ACCEPTED') {
        return '<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Accepted</span>';
    } else if (s === 'UNDER_REVIEW') {
        return '<span class="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Under Review</span>';
    } else if (s === 'SUBMITTED') {
        return '<span class="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Submitted</span>';
    } else if (s === 'REJECTED') {
        return '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Rejected</span>';
    } else if (s === 'EXPIRED') {
        return '<span class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Expired</span>';
    } else if (s === 'WITHDRAWN') {
        return '<span class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Withdrawn</span>';
    }
    return `<span class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-bold">${escapeHtml(s)}</span>`;
}

function updateQuotationTabBadges() {
    const allCount = sellerQuotationsCache.length;
    const draftCount = 0; // Draft persistence is not supported by backend
    const pendingCount = sellerQuotationsCache.filter(q => {
        const s = (q.status || '').toUpperCase();
        return s === 'SUBMITTED' || s === 'UNDER_REVIEW';
    }).length;
    const acceptedCount = sellerQuotationsCache.filter(q => (q.status || '').toUpperCase() === 'ACCEPTED').length;
    const rejectedCount = sellerQuotationsCache.filter(q => {
        const s = (q.status || '').toUpperCase();
        return s === 'REJECTED' || s === 'EXPIRED' || s === 'WITHDRAWN';
    }).length;

    const btnAll = document.getElementById('quote-tab-all');
    const btnDraft = document.getElementById('quote-tab-draft');
    const btnPending = document.getElementById('quote-tab-pending');
    const btnAccepted = document.getElementById('quote-tab-accepted');
    const btnRejected = document.getElementById('quote-tab-rejected');

    if (btnAll) btnAll.innerText = `All (${allCount})`;
    if (btnDraft) btnDraft.innerText = `Draft (${draftCount})`;
    if (btnPending) btnPending.innerText = `Sent & Pending (${pendingCount})`;
    if (btnAccepted) btnAccepted.innerText = `Accepted (${acceptedCount})`;
    if (btnRejected) btnRejected.innerText = `Rejected (${rejectedCount})`;

    // Sidebar badge
    const navQuoteBadge = document.getElementById('nav-quotations-badge');
    if (navQuoteBadge) {
        navQuoteBadge.innerText = `${pendingCount} Pending`;
    }

    // Dashboard KPI
    const kpiQuotationsSent = document.getElementById('kpi-quotations-sent');
    if (kpiQuotationsSent) {
        kpiQuotationsSent.innerText = allCount;
    }
}

function filterQuotationsTab(filterName) {
    currentQuotationFilter = filterName || 'ALL';

    const tabMap = {
        'ALL': 'quote-tab-all',
        'DRAFT': 'quote-tab-draft',
        'PENDING': 'quote-tab-pending',
        'ACCEPTED': 'quote-tab-accepted',
        'REJECTED': 'quote-tab-rejected'
    };

    Object.entries(tabMap).forEach(([f, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (f === currentQuotationFilter) {
            btn.className = 'px-3 py-1.5 bg-blue-600 text-white rounded-lg shadow-sm';
        } else {
            btn.className = 'px-3 py-1.5 bg-white text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200';
        }
    });

    renderSellerQuotationsTable(currentQuotationFilter);
}

function renderSellerQuotationsTable(filter = 'ALL') {
    const tbody = document.getElementById('quotations-tbody');
    const emptyState = document.getElementById('quotations-empty-state');
    const emptyTitle = document.getElementById('quotations-empty-title');
    const emptyDesc = document.getElementById('quotations-empty-desc');
    const emptyAction = document.getElementById('quotations-empty-action');

    if (!tbody) return;

    let filtered = [];
    if (filter === 'ALL') {
        filtered = sellerQuotationsCache;
    } else if (filter === 'DRAFT') {
        filtered = []; // Persistence of drafts is unsupported
    } else if (filter === 'PENDING') {
        filtered = sellerQuotationsCache.filter(q => {
            const s = (q.status || '').toUpperCase();
            return s === 'SUBMITTED' || s === 'UNDER_REVIEW';
        });
    } else if (filter === 'ACCEPTED') {
        filtered = sellerQuotationsCache.filter(q => (q.status || '').toUpperCase() === 'ACCEPTED');
    } else if (filter === 'REJECTED') {
        filtered = sellerQuotationsCache.filter(q => {
            const s = (q.status || '').toUpperCase();
            return s === 'REJECTED' || s === 'EXPIRED' || s === 'WITHDRAWN';
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            if (filter === 'DRAFT') {
                if (emptyTitle) emptyTitle.innerText = 'Draft Quotations (0)';
                if (emptyDesc) emptyDesc.innerText = 'Draft saving is not currently supported. All quotations created through BuildBid are submitted directly to buyers for live review.';
                if (emptyAction) emptyAction.classList.add('hidden');
            } else if (filter === 'PENDING') {
                if (emptyTitle) emptyTitle.innerText = 'No Pending Quotations';
                if (emptyDesc) emptyDesc.innerText = 'You currently have no quotations awaiting customer review.';
                if (emptyAction) emptyAction.classList.remove('hidden');
            } else if (filter === 'ACCEPTED') {
                if (emptyTitle) emptyTitle.innerText = 'No Accepted Quotations';
                if (emptyDesc) emptyDesc.innerText = 'None of your quotations have been accepted yet.';
                if (emptyAction) emptyAction.classList.remove('hidden');
            } else if (filter === 'REJECTED') {
                if (emptyTitle) emptyTitle.innerText = 'No Rejected Quotations';
                if (emptyDesc) emptyDesc.innerText = 'You have no rejected, expired, or withdrawn quotations.';
                if (emptyAction) emptyAction.classList.add('hidden');
            } else {
                if (emptyTitle) emptyTitle.innerText = 'No Quotations Found';
                if (emptyDesc) emptyDesc.innerText = 'You have not submitted any quotations yet. Browse active customer requirements to submit your first quotation.';
                if (emptyAction) emptyAction.classList.remove('hidden');
            }
        }
        return;
    }

    if (emptyState) {
        emptyState.classList.add('hidden');
    }

    tbody.innerHTML = '';

    filtered.forEach(q => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-all';

        const quoteRef = escapeHtml(q.quotationId || q.id || 'QT-NEW');
        const reqRef = escapeHtml(q.businessRequestId || (q.materialRequestId ? 'REQ-' + q.materialRequestId : 'REQ'));
        const projectTitle = escapeHtml(q.projectName || 'Material Requirement');
        const customerName = escapeHtml(q.customerName || '');
        const location = escapeHtml(q.customerLocation || '');

        let projectHtml = `<div class="font-medium text-slate-800">${reqRef} — ${projectTitle}</div>`;
        if (customerName || location) {
            const sub = [customerName, location].filter(Boolean).join(' · ');
            projectHtml += `<div class="text-[11px] text-slate-400">${sub}</div>`;
        }

        // Materials summary
        let materialsText = 'Materials';
        if (Array.isArray(q.items) && q.items.length > 0) {
            const first = q.items[0];
            const name = escapeHtml(first.materialName || 'Material');
            const qty = escapeHtml(String(first.quotedQuantity != null ? first.quotedQuantity : (first.quantity != null ? first.quantity : '')));
            const unit = escapeHtml(first.quotedUnit || first.unit || 'Units');
            materialsText = `${name} (${qty} ${unit})`;
            if (q.items.length > 1) {
                materialsText += ` + ${q.items.length - 1} more`;
            }
        } else if (q.includedItems) {
            materialsText = escapeHtml(q.includedItems);
        }

        const totalAmount = Number(q.totalAmount != null ? q.totalAmount : (q.quotedAmount != null ? q.quotedAmount : 0)).toLocaleString('en-IN');
        const validUntil = formatQuotationValidity(q.validity, q.createdAt);
        const statusBadge = getQuotationStatusBadge(q.status);

        // Actions
        const rawStatus = (q.status || '').toUpperCase();
        let actionButtons = '';

        if (rawStatus === 'ACCEPTED') {
            const linkedOrder = (sellerOrdersCache || []).find(o =>
                (o.quotationId && o.quotationId === q.backendId) ||
                (o.quotationCode && (o.quotationCode === q.quotationId || o.quotationCode === q.id))
            );

            actionButtons += `<button onclick="downloadQuotationPdf('${escapeJs(q.quotationId || String(q.id))}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">Download</button> `;
            if (linkedOrder) {
                actionButtons += `<button onclick="viewQuotationOrder('${escapeJs(q.quotationId || String(q.id))}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">View Order</button> `;
            }
            actionButtons += `<button onclick="openQuotationDetailModal('${escapeJs(q.quotationId || String(q.id))}')" class="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold transition-all">View</button>`;
        } else if (rawStatus === 'SUBMITTED' || rawStatus === 'UNDER_REVIEW') {
            actionButtons += `<button onclick="openUpdateQuotationModal('${escapeJs(q.quotationId || String(q.id))}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold shadow-sm transition-all">Update</button> `;
            actionButtons += `<button onclick="duplicateQuotation('${escapeJs(q.quotationId || String(q.id))}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">Duplicate</button> `;
            actionButtons += `<button onclick="openQuotationDetailModal('${escapeJs(q.quotationId || String(q.id))}')" class="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold transition-all">View</button>`;
        } else {
            actionButtons += `<button onclick="duplicateQuotation('${escapeJs(q.quotationId || String(q.id))}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">Duplicate</button> `;
            actionButtons += `<button onclick="openQuotationDetailModal('${escapeJs(q.quotationId || String(q.id))}')" class="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold transition-all">View</button>`;
        }

        tr.innerHTML = `
            <td class="p-4 font-bold text-blue-600">${quoteRef}</td>
            <td class="p-4">${projectHtml}</td>
            <td class="p-4">${materialsText}</td>
            <td class="p-4 font-bold text-slate-900">₹${totalAmount}</td>
            <td class="p-4 text-slate-500">${validUntil}</td>
            <td class="p-4">${statusBadge}</td>
            <td class="p-4 text-right space-x-2">${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadSellerQuotations() {
    const seq = ++_quotationsReqSeq;
    if (_isQuotationsLoading) return;
    _isQuotationsLoading = true;

    const tbody = document.getElementById('quotations-tbody');
    const emptyState = document.getElementById('quotations-empty-state');
    const kpiQuotationsSent = document.getElementById('kpi-quotations-sent');
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    if (!token) {
        _isQuotationsLoading = false;
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 text-xs">Please log in as a Material Seller to view quotations.</td></tr>`;
        }
        return;
    }

    if (tbody) {
        renderSellerTableLoading(tbody, 7);
        if (emptyState) emptyState.classList.add('hidden');
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/provider/quotations`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (seq !== _quotationsReqSeq) return;

        if (res.status === 401 || res.status === 403) {
            console.warn('loadSellerQuotations: session unauthorized or expired.');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-500 text-xs">Session expired. Please log in again.</td></tr>`;
            }
            if (kpiQuotationsSent) kpiQuotationsSent.innerText = "—";
            return;
        }

        if (!res.ok) {
            throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        sellerQuotationsCache = Array.isArray(data) ? data : [];
        updateQuotationTabBadges();
        renderSellerQuotationsTable(currentQuotationFilter);
    } catch (err) {
        if (seq !== _quotationsReqSeq) return;
        console.error('loadSellerQuotations error:', err);
        if (tbody) {
            renderSellerTableError(tbody, 7, "loadSellerQuotations()");
        }
        if (kpiQuotationsSent) kpiQuotationsSent.innerText = "—";
    } finally {
        _isQuotationsLoading = false;
    }
}

function openQuotationDetailModal(quoteId) {
    const q = (sellerQuotationsCache || []).find(item =>
        String(item.quotationId) === String(quoteId) ||
        String(item.id) === String(quoteId) ||
        String(item.backendId) === String(quoteId)
    );

    if (!q) {
        showToast('Quotation details not found.');
        return;
    }

    const idElem = document.getElementById('qDetailModalId');
    const statusElem = document.getElementById('qDetailModalStatus');
    const reqRefElem = document.getElementById('qDetailReqRef');
    const projElem = document.getElementById('qDetailProject');
    const custElem = document.getElementById('qDetailCustomer');
    const dateElem = document.getElementById('qDetailDate');
    const locCont = document.getElementById('qDetailLocationContainer');
    const locElem = document.getElementById('qDetailLocation');
    const itemsTbody = document.getElementById('qDetailItemsTbody');
    const countElem = document.getElementById('qDetailItemCount');
    const subtotalElem = document.getElementById('qDetailSubtotal');
    const transElem = document.getElementById('qDetailTransport');
    const gstElem = document.getElementById('qDetailGst');
    const grandElem = document.getElementById('qDetailGrandTotal');
    const valElem = document.getElementById('qDetailValidity');
    const timeElem = document.getElementById('qDetailTimeline');
    const termsElem = document.getElementById('qDetailPaymentTerms');
    const warElem = document.getElementById('qDetailWarranty');
    const orderBtnCont = document.getElementById('qDetailOrderBtnContainer');

    if (idElem) idElem.innerText = `Quotation ${q.quotationId || q.id || ''}`;
    if (statusElem) {
        const rawStatus = (q.status || 'SUBMITTED').toUpperCase();
        statusElem.innerText = rawStatus;
        if (rawStatus === 'ACCEPTED') {
            statusElem.className = 'bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold';
        } else if (rawStatus === 'UNDER_REVIEW') {
            statusElem.className = 'bg-amber-500/20 text-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold';
        } else if (rawStatus === 'REJECTED') {
            statusElem.className = 'bg-red-500/20 text-red-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold';
        } else {
            statusElem.className = 'bg-blue-500/20 text-blue-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold';
        }
    }

    if (reqRefElem) reqRefElem.innerText = q.businessRequestId || (q.materialRequestId ? 'REQ-' + q.materialRequestId : 'REQ');
    if (projElem) projElem.innerText = q.projectName || 'Material Requirement';
    if (custElem) custElem.innerText = q.customerName || 'Verified Customer';
    if (dateElem) dateElem.innerText = formatQuotationDate(q.createdAt);

    if (locCont && locElem) {
        const locParts = [q.deliveryAddress, q.customerLocation].filter(Boolean);
        if (locParts.length > 0) {
            locCont.classList.remove('hidden');
            locElem.innerText = locParts.join(' · ');
        } else {
            locCont.classList.add('hidden');
        }
    }

    // Render items
    const items = Array.isArray(q.items) ? q.items : [];
    if (countElem) countElem.innerText = `${items.length} ${items.length === 1 ? 'Item' : 'Items'}`;
    if (itemsTbody) {
        itemsTbody.innerHTML = '';
        if (items.length === 0) {
            itemsTbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-400 text-xs">${escapeHtml(q.includedItems || 'Standard catalog materials')}</td></tr>`;
        } else {
            items.forEach(it => {
                const tr = document.createElement('tr');
                const lineTotal = Number(it.lineTotal != null ? it.lineTotal : (Number(it.quantity != null ? it.quantity : (it.quotedQuantity != null ? it.quotedQuantity : 0)) * Number(it.unitPrice || 0))).toLocaleString('en-IN');
                tr.innerHTML = `
                    <td class="p-3 font-semibold text-slate-800">${escapeHtml(it.materialName || 'Material')}</td>
                    <td class="p-3 text-slate-600">${escapeHtml(String(it.quantity != null ? it.quantity : (it.quotedQuantity != null ? it.quotedQuantity : 1)))} ${escapeHtml(it.unit || it.quotedUnit || 'Units')}</td>
                    <td class="p-3 text-slate-600">₹${Number(it.unitPrice || 0).toLocaleString('en-IN')}</td>
                    <td class="p-3 text-right font-bold text-slate-900">₹${lineTotal}</td>
                `;
                itemsTbody.appendChild(tr);
            });
        }
    }

    const matCost = Number(q.materialCost != null ? q.materialCost : (q.materialAmount || 0));
    const transport = Number(q.transportationCost != null ? q.transportationCost : (q.transportation || 0));
    const gst = Number(q.taxGst != null ? q.taxGst : (q.taxes || 0));
    const grand = Number(q.totalAmount != null ? q.totalAmount : (q.quotedAmount || 0));

    if (subtotalElem) subtotalElem.innerText = '₹' + matCost.toLocaleString('en-IN');
    if (transElem) transElem.innerText = '₹' + transport.toLocaleString('en-IN');
    if (gstElem) gstElem.innerText = '₹' + gst.toLocaleString('en-IN');
    if (grandElem) grandElem.innerText = '₹' + grand.toLocaleString('en-IN');

    if (valElem) valElem.innerText = formatQuotationValidity(q.validity, q.createdAt);
    if (timeElem) timeElem.innerText = q.timeline || '2-3 Days';
    if (termsElem) termsElem.innerText = q.paymentTerms || '100% on Site Delivery';
    if (warElem) warElem.innerText = q.warranty || 'Standard Manufacturer / BIS Batch Certified';

    // Action buttons inside detail modal
    if (orderBtnCont) {
        orderBtnCont.innerHTML = '';
        const rawStatus = (q.status || '').toUpperCase();
        if (rawStatus === 'ACCEPTED') {
            const linkedOrder = (sellerOrdersCache || []).find(o =>
                (o.quotationId && o.quotationId === q.backendId) ||
                (o.quotationCode && (o.quotationCode === q.quotationId || o.quotationCode === q.id))
            );
            if (linkedOrder) {
                orderBtnCont.innerHTML = `
                    <button type="button" onclick="closeModal('quotationDetailModal'); viewQuotationOrder('${escapeJs(q.quotationId || String(q.id))}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition-all flex items-center space-x-1.5">
                        <i class="fa-solid fa-boxes-stacked"></i>
                        <span>View Linked Order (${escapeHtml(linkedOrder.orderCode || ('ORD-' + linkedOrder.id))})</span>
                    </button>
                `;
            } else {
                orderBtnCont.innerHTML = `
                    <span class="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                        <i class="fa-solid fa-circle-check text-emerald-600"></i>
                        <span>Accepted Quotation</span>
                    </span>
                `;
            }
        } else if (rawStatus === 'SUBMITTED' || rawStatus === 'UNDER_REVIEW') {
            orderBtnCont.innerHTML = `
                <button type="button" onclick="closeModal('quotationDetailModal'); openUpdateQuotationModal('${escapeJs(q.quotationId || String(q.id))}')" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-sm transition-all flex items-center space-x-1.5">
                    <i class="fa-solid fa-pen-to-square"></i>
                    <span>Update Quotation</span>
                </button>
            `;
        }
    }

    openModal('quotationDetailModal');
}

/**
 * Open Quotation Modal configured for Updating an Existing Quotation
 */
async function openUpdateQuotationModal(quoteId) {
    const q = (sellerQuotationsCache || []).find(item =>
        String(item.quotationId) === String(quoteId) ||
        String(item.id) === String(quoteId) ||
        String(item.backendId) === String(quoteId)
    );

    if (!q) {
        showToast('Quotation not found.');
        return;
    }

    const rawStatus = (q.status || '').toUpperCase();
    if (rawStatus === 'ACCEPTED') {
        showToast('Quotation is already been accepted. Now it cannot be updated.');
        return;
    }

    if (rawStatus === 'REJECTED' || rawStatus === 'EXPIRED' || rawStatus === 'WITHDRAWN') {
        showToast(`This quotation is ${rawStatus.toLowerCase()} and cannot be updated. You may duplicate it to submit a new quotation if permitted.`);
        return;
    }

    editingQuotationTarget = q;
    const reqId = q.businessRequestId || (q.materialRequestId ? 'REQ-' + q.materialRequestId : 'REQ');
    const dbId = q.materialRequestId || null;

    const modalTitle = document.querySelector('#quotationModal h3');
    if (modalTitle) modalTitle.innerText = `Update Quotation — ${q.quotationId || q.id}`;

    const reqIdElem = document.getElementById('quoteModalReqId');
    if (reqIdElem) {
        reqIdElem.innerText = `Updating active quotation ${q.quotationId || q.id} for ${reqId}`;
    }

    const sendBtn = document.getElementById('sendQuotationBtn');
    if (sendBtn) {
        sendBtn.className = "px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-sm transition-all flex items-center space-x-2";
        sendBtn.innerHTML = `<i class="fa-solid fa-pen-to-square mr-1.5"></i><span>Update Quotation Now</span>`;
        sendBtn.onclick = submitQuotationUpdate;
    }

    // Pre-populate commercial inputs
    const transInp = document.getElementById('qTransport');
    const timelineInp = document.getElementById('qTimeline');
    const termsInp = document.getElementById('qPaymentTerms');
    const validityInp = document.getElementById('qValidity');
    const warrantyInp = document.getElementById('qWarranty');

    if (transInp) transInp.value = q.transportationCost != null ? q.transportationCost : (q.transportation || 0);
    if (timelineInp) timelineInp.value = q.timeline || '2-3 Days';
    if (termsInp) termsInp.value = q.paymentTerms || '100% on Site Delivery';
    if (validityInp) validityInp.value = q.validity || '7 Days';
    if (warrantyInp) warrantyInp.value = q.warranty || 'Standard Manufacturer / BIS Batch Certified';

    // Fetch seller catalog
    const catalog = await getSellerCatalogMaterials();
    const tbody = document.getElementById('qItemsTbody');

    const quoteItems = Array.isArray(q.items) && q.items.length > 0 ? q.items : [
        {
            materialName: q.materialSummary || 'Catalog Material',
            quantity: q.quotedQuantity || 1,
            unit: q.quotedUnit || 'Units',
            unitPrice: q.materialCost || 0
        }
    ];

    currentQuotationTarget = {
        reqId: reqId,
        dbId: dbId,
        items: quoteItems
    };

    if (tbody) {
        tbody.innerHTML = "";
        quoteItems.forEach((it, idx) => {
            const reqItemName = it.materialName || 'Material';
            const reqQty = it.quantity != null ? it.quantity : (it.quotedQuantity != null ? it.quotedQuantity : 1);
            const reqUnit = it.unit || it.quotedUnit || 'Units';
            const reqItemId = it.materialRequestItemId || it.requestItemId || '';
            const unitPrice = it.unitPrice != null ? it.unitPrice : 0;
            const targetMatId = it.materialId || it.catalogMaterialId;

            let matchingMat = catalog.find(m => targetMatId && m.id === targetMatId) ||
                              catalog.find(m => m.materialName && reqItemName && (
                                  m.materialName.toLowerCase().includes(reqItemName.toLowerCase()) ||
                                  reqItemName.toLowerCase().includes(m.materialName.toLowerCase())
                              ));

            const defaultPrice = unitPrice > 0 ? unitPrice : (matchingMat ? (matchingMat.unitPrice || 0) : 0);
            const defaultUnit = reqUnit || (matchingMat ? matchingMat.unit : 'Units');

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-all';
            tr.dataset.reqItemId = reqItemId;
            tr.dataset.itemIndex = idx;

            let optionsHtml = '<option value="">-- Select Your Catalog SKU --</option>';
            catalog.forEach(catMat => {
                const isSelected = (targetMatId && catMat.id === targetMatId) || (!targetMatId && matchingMat && matchingMat.id === catMat.id) ? 'selected' : '';
                const brand = catMat.brand ? ` (${catMat.brand})` : '';
                optionsHtml += `<option value="${catMat.id}" data-price="${catMat.unitPrice || 0}" data-unit="${escapeHtml(catMat.unit || '')}" ${isSelected}>${escapeHtml(catMat.materialName)}${brand} - ₹${catMat.unitPrice || 0}/${catMat.unit || 'unit'}</option>`;
            });

            tr.innerHTML = `
                <td class="p-3">
                    <label class="flex items-center space-x-2 cursor-pointer mb-1">
                        <input type="checkbox" class="q-item-include w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" checked onchange="toggleQuoteRow(this)">
                        <span class="font-bold text-slate-800 text-xs">${escapeHtml(reqItemName)}</span>
                    </label>
                    <span class="text-[10px] text-slate-500 font-medium ml-6 block">Req: ${escapeHtml(String(reqQty))} ${escapeHtml(reqUnit)}</span>
                </td>
                <td class="p-3">
                    <select class="q-sku-select w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white" onchange="onQuotationSkuChanged(this)">
                        ${optionsHtml}
                    </select>
                </td>
                <td class="p-3">
                    <input type="number" min="0.01" step="any" class="q-item-qty w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs" value="${reqQty}" oninput="calculateQuote()">
                </td>
                <td class="p-3">
                    <input type="text" class="q-item-unit w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs" value="${escapeHtml(defaultUnit)}">
                </td>
                <td class="p-3">
                    <input type="number" min="0" step="any" class="q-item-price w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs" value="${defaultPrice}" oninput="calculateQuote()">
                </td>
                <td class="p-3 text-right">
                    <span class="q-item-total font-bold text-slate-800">₹0</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    calculateQuote();
    openModal('quotationModal');
}

/**
 * Submit updated quotation data to backend (PUT /api/quotations/{id})
 */
async function submitQuotationUpdate() {
    if (!editingQuotationTarget) {
        showToast('Error: No active quotation selected for update.');
        return;
    }

    if ((editingQuotationTarget.status || '').toUpperCase() === 'ACCEPTED') {
        showToast('Quotation is already been accepted. Now it cannot be updated.');
        closeModal('quotationModal');
        return;
    }

    const submitBtn = document.getElementById('sendQuotationBtn');
    const transportInput = document.getElementById('qTransport');
    const timelineInput = document.getElementById('qTimeline');
    const paymentTermsInput = document.getElementById('qPaymentTerms');
    const validityInput = document.getElementById('qValidity');
    const warrantyInput = document.getElementById('qWarranty');

    const transport = parseFloat(transportInput ? transportInput.value : 0) || 0;
    const timeline = timelineInput ? timelineInput.value.trim() : "2-3 Days";
    const paymentTerms = paymentTermsInput ? paymentTermsInput.value.trim() : "100% on Site Delivery";
    const validity = validityInput ? validityInput.value.trim() : "7 Days";
    const warranty = warrantyInput ? warrantyInput.value.trim() : "Standard Manufacturer / BIS Batch Certified";

    const rows = document.querySelectorAll('#qItemsTbody tr');
    const items = [];
    const seenReqItemIds = new Set();
    let subtotal = 0;
    const itemSummaries = [];

    for (const tr of rows) {
        const isIncluded = tr.querySelector('.q-item-include')?.checked;
        if (!isIncluded) continue;

        const skuSelect = tr.querySelector('.q-sku-select');
        const materialId = parseInt(skuSelect?.value) || null;
        const reqItemId = tr.dataset.reqItemId ? parseInt(tr.dataset.reqItemId) : null;
        const qty = parseFloat(tr.querySelector('.q-item-qty')?.value || 0) || 0;
        const unit = tr.querySelector('.q-item-unit')?.value?.trim() || 'Units';
        const unitPrice = parseFloat(tr.querySelector('.q-item-price')?.value || 0) || 0;

        if (!materialId) {
            showToast('Please select a catalog SKU for all included items. — कृपया सभी शामिल वस्तुओं के लिए सामग्री SKU चुनें।');
            return;
        }
        if (qty <= 0) {
            showToast('Quoted quantity must be greater than zero. — मात्रा शून्य से अधिक होनी चाहिए।');
            return;
        }
        if (unitPrice < 0) {
            showToast('Unit price cannot be negative. — दर शून्य से कम नहीं हो सकती।');
            return;
        }
        if (reqItemId) {
            if (seenReqItemIds.has(reqItemId)) {
                showToast('Duplicate mapping for requested item rejected. — दोहरा मैपिंग अमान्य है।');
                return;
            }
            seenReqItemIds.add(reqItemId);
        }

        const lineTotal = Math.round(qty * unitPrice * 100) / 100;
        subtotal += lineTotal;

        const selectedOpt = skuSelect.options[skuSelect.selectedIndex];
        const matName = selectedOpt ? selectedOpt.text.split(' - ')[0] : 'Catalog SKU';
        itemSummaries.push(`${matName} (${qty} ${unit})`);

        items.push({
            materialRequestItemId: reqItemId,
            materialId: materialId,
            quantity: qty,
            unit: unit,
            unitPrice: unitPrice
        });
    }

    if (items.length === 0) {
        showToast('Please include at least one material to quote. — कम से कम एक सामग्री का चयन करें।');
        return;
    }

    const gst = Math.round(subtotal * 0.18);
    const total = subtotal + gst + transport;

    const token = getCleanToken();
    if (!token) {
        showToast('Authentication required. Please log in as a Material Seller.');
        return;
    }

    const targetQuoteId = editingQuotationTarget.backendId || editingQuotationTarget.quotationId || editingQuotationTarget.id;
    if (!targetQuoteId) {
        showToast('Error: Target quotation ID could not be identified.');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Updating...';
    }

    const payload = {
        requestType: editingQuotationTarget.requestType || "MATERIAL_REQUIREMENT",
        materialRequestId: editingQuotationTarget.materialRequestId || null,
        requestId: editingQuotationTarget.businessRequestId || (editingQuotationTarget.materialRequestId ? 'REQ-' + editingQuotationTarget.materialRequestId : null),
        quotedAmount: total,
        materialCost: subtotal,
        labourCost: 0,
        transportationCost: transport,
        taxGst: gst,
        timeline: timeline,
        validity: validity,
        warranty: warranty,
        paymentTerms: paymentTerms,
        includedItems: itemSummaries.join(', ') + " with direct site delivery",
        excludedItems: "Unloading to upper floors",
        message: `Quotation updated with ${items.length} structured catalog items. Total: ₹${total.toLocaleString('en-IN')}.`,
        items: items
    };

    const API_BASE_URL = getApiBaseUrl();

    try {
        const res = await fetch(`${API_BASE_URL}/api/quotations/${targetQuoteId}`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 200 || res.ok) {
            showToast(`Quotation ${data.quotationId || targetQuoteId} updated successfully! — कोटेशन सफलतापूर्वक अपडेट किया गया!`);
            closeModal('quotationModal');
            editingQuotationTarget = null;
            if (typeof loadSellerQuotations === 'function') {
                await loadSellerQuotations();
            }
        } else if (res.status === 409) {
            const errorMsg = (data.error || '').toLowerCase();
            if (errorMsg.includes('already been accepted') || data.code === 'QUOTATION_ALREADY_ACCEPTED') {
                showToast('Quotation is already been accepted. Now it cannot be updated.');
            } else {
                showToast(data.error || 'Conflict: Quotation cannot be updated.');
            }
            closeModal('quotationModal');
            if (typeof loadSellerQuotations === 'function') {
                await loadSellerQuotations();
            }
        } else if (res.status === 403) {
            showToast(data.error || 'Unauthorized: You can only update your own quotations.');
        } else if (res.status === 401) {
            showToast('Session expired. Please log in again.');
        } else if (res.status === 400) {
            showToast(data.error || 'Invalid quotation update data.');
        } else {
            showToast(data.error || 'Failed to update quotation. Server error.');
        }
    } catch (err) {
        console.error('Quotation update network error:', err);
        showToast('Network error. Unable to reach server. Please check your connection.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.originalText || '<i class="fa-solid fa-pen-to-square mr-1.5"></i><span>Update Quotation Now</span>';
        }
    }
}

async function deleteSellerQuotation(quoteId) {
    const q = (sellerQuotationsCache || []).find(item =>
        String(item.quotationId) === String(quoteId) ||
        String(item.id) === String(quoteId) ||
        String(item.backendId) === String(quoteId)
    );
    if (q && (q.status || '').toUpperCase() === 'ACCEPTED') {
        showToast('Quotation is already been accepted. Now it cannot be modified or deleted.');
        return;
    }
    const token = getCleanToken();
    if (!token) { showToast('Authentication required.'); return; }
    const API_BASE_URL = getApiBaseUrl();
    try {
        const res = await fetch(`${API_BASE_URL}/api/quotations/${quoteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            showToast('Quotation deleted successfully.');
            if (typeof loadSellerQuotations === 'function') await loadSellerQuotations();
        } else if (res.status === 409) {
            showToast(data.error || 'Quotation is already been accepted. Now it cannot be modified or deleted.');
        } else {
            showToast(data.error || 'Failed to delete quotation.');
        }
    } catch (e) {
        showToast('Network error.');
    }
}

async function withdrawSellerQuotation(quoteId) {
    const q = (sellerQuotationsCache || []).find(item =>
        String(item.quotationId) === String(quoteId) ||
        String(item.id) === String(quoteId) ||
        String(item.backendId) === String(quoteId)
    );
    if (q && (q.status || '').toUpperCase() === 'ACCEPTED') {
        showToast('Quotation is already been accepted. Now it cannot be modified or withdrawn.');
        return;
    }
    const token = getCleanToken();
    if (!token) { showToast('Authentication required.'); return; }
    const API_BASE_URL = getApiBaseUrl();
    try {
        const res = await fetch(`${API_BASE_URL}/api/quotations/${quoteId}/withdraw`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            showToast('Quotation withdrawn successfully.');
            if (typeof loadSellerQuotations === 'function') await loadSellerQuotations();
        } else if (res.status === 409) {
            showToast(data.error || 'Quotation is already been accepted. Now it cannot be modified or withdrawn.');
        } else {
            showToast(data.error || 'Failed to withdraw quotation.');
        }
    } catch (e) {
        showToast('Network error.');
    }
}

window.openUpdateQuotationModal = openUpdateQuotationModal;
window.submitQuotationUpdate = submitQuotationUpdate;
window.deleteSellerQuotation = deleteSellerQuotation;
window.withdrawSellerQuotation = withdrawSellerQuotation;
window.viewExistingQuotation = viewExistingQuotation;
window.isQuotationSubmittedForRequest = isQuotationSubmittedForRequest;

function duplicateQuotation(quoteId) {
    const q = (sellerQuotationsCache || []).find(item =>
        String(item.quotationId) === String(quoteId) ||
        String(item.id) === String(quoteId) ||
        String(item.backendId) === String(quoteId)
    );

    if (!q) {
        showToast('Quotation not found.');
        return;
    }

    const rawStatus = (q.status || '').toUpperCase();
    if (rawStatus === 'SUBMITTED' || rawStatus === 'UNDER_REVIEW' || rawStatus === 'ACCEPTED') {
        showToast(`An active quotation (${q.quotationId || q.id}) already exists for this requirement. Resubmission is not permitted while an active quotation is pending.`);
        return;
    }

    const reqId = q.businessRequestId || (q.materialRequestId ? 'REQ-' + q.materialRequestId : null);
    const dbId = q.materialRequestId || null;
    const firstItem = (Array.isArray(q.items) && q.items[0]) || {};

    openQuotationModal(
        reqId,
        firstItem.materialName || 'Material',
        firstItem.quantity || firstItem.quotedQuantity || 1,
        firstItem.unit || firstItem.quotedUnit || 'Units',
        dbId
    );

    setTimeout(() => {
        const transInp = document.getElementById('qTransport');
        const timelineInp = document.getElementById('qTimeline');
        const termsInp = document.getElementById('qPaymentTerms');
        const validityInp = document.getElementById('qValidity');
        const warrantyInp = document.getElementById('qWarranty');

        if (transInp && q.transportationCost != null) transInp.value = q.transportationCost;
        if (timelineInp && q.timeline) timelineInp.value = q.timeline;
        if (termsInp && q.paymentTerms) termsInp.value = q.paymentTerms;
        if (validityInp && q.validity) validityInp.value = q.validity;
        if (warrantyInp && q.warranty) warrantyInp.value = q.warranty;

        if (typeof calculateQuote === 'function') {
            calculateQuote();
        }
    }, 250);
}

function downloadQuotationPdf(quoteId) {
    showToast('PDF download is currently unavailable. This feature will be enabled in an upcoming release.');
}

function viewQuotationOrder(quoteId) {
    switchTab('orders');
    const linkedOrder = (sellerOrdersCache || []).find(o =>
        (o.quotationId && o.quotationId === quoteId) ||
        (o.quotationCode && o.quotationCode === quoteId)
    );
    if (linkedOrder) {
        showToast(`Navigated to order ${linkedOrder.orderCode || ('ORD-' + linkedOrder.id)}.`);
    }
}

/**
 * Live Seller Orders Management (Flow B & Order Fulfillment)
 */
let sellerOrdersCache = [];

/**
 * Checks if a given order status represents an active, non-terminal fulfillment lifecycle state.
 * Active: WAITING_FOR_ACCEPTANCE, CONFIRMED, ORDER_ACCEPTED, ACCEPTED, PROCESSING, READY_FOR_DISPATCH, DISPATCHED, OUT_FOR_DELIVERY.
 * Terminal: DELIVERED, COMPLETED, CANCELLED, DECLINED, REJECTED.
 */
function isOrderActiveStatus(statusStr) {
    if (!statusStr) return false;
    const s = String(statusStr).trim().toUpperCase();
    return [
        'WAITING_FOR_ACCEPTANCE',
        'CONFIRMED',
        'ORDER_CONFIRMED',
        'ORDER_ACCEPTED',
        'ACCEPTED',
        'PROCESSING',
        'READY_FOR_DISPATCH',
        'DISPATCHED',
        'OUT_FOR_DELIVERY'
    ].includes(s);
}

/**
 * Checks if an order is in an accepted state (where seller has accepted the order).
 */
function isOrderAccepted(order) {
    if (!order) return false;
    const rawStatus = (order.orderStatus || order.status || order.rawStatus || '').trim().toUpperCase();
    return [
        'CONFIRMED',
        'ORDER_CONFIRMED',
        'ORDER_ACCEPTED',
        'ACCEPTED',
        'PROCESSING',
        'READY_FOR_DISPATCH',
        'DISPATCHED',
        'OUT_FOR_DELIVERY'
    ].includes(rawStatus);
}

/**
 * Checks if an order has a valid, non-placeholder expected delivery date.
 */
function hasValidExpectedDeliveryDate(order) {
    if (!order) return false;
    const dateVal = order.expectedDeliveryDate || order.deliveryDate;
    if (!dateVal) return false;
    const d = String(dateVal).trim();
    if (!d || d.toLowerCase() === 'not set' || d.toLowerCase() === 'pending confirmation' || d.toLowerCase() === 'standard delivery window' || d.toLowerCase() === 'null') {
        return false;
    }
    return true;
}

/**
 * Standardized renderer for Expected Delivery cell across Seller Dashboard table.
 * Accurately displays:
 * - Red blinking pulsing dot, "Not Set", and "Expected Date Required" for accepted orders without a date
 * - Green verified calendar check, formatted DD/MM/YYYY date, and "Edit Date" for orders with persisted date
 * - Subdued "Not Set (Pending order acceptance)" for unaccepted orders without blinking alert
 */
function renderExpectedDeliveryCellContent(order) {
    if (!order) return '';
    const isDirectBuy = order.sourceType === 'DIRECT_BUY' || order.type === 'DIRECT_BUY' || order.isDirectBuy === true;
    const orderSourceType = isDirectBuy ? 'DIRECT_BUY' : 'MATERIAL_ORDER';
    const orderCode = order.orderCode || order.orderId || ('ORD-' + order.id);
    const isAccepted = isOrderAccepted(order);
    const hasValidDate = hasValidExpectedDeliveryDate(order);
    const isMissingDate = isAccepted && !hasValidDate;
    const mrId = order.materialRequestId || (isDirectBuy ? order.id : null);
    const mrIdParam = mrId ? mrId : 'null';

    if (isMissingDate) {
        return `
            <div class="space-y-1.5 py-0.5" id="delivery-cell-${order.id}">
                <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Expected Delivery</span>
                <div class="flex items-center gap-1.5">
                    <span class="text-xs font-bold text-slate-700">Not Set</span>
                    <span class="relative flex h-2.5 w-2.5 flex-shrink-0" title="Expected Date Required">
                        <span class="expected-date-ping-dot absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                    </span>
                </div>
                <div class="expected-date-required-badge inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-100/90 border border-rose-300 text-rose-800 text-[10px] font-bold shadow-xs">
                    <i class="fa-solid fa-triangle-exclamation text-rose-600 text-[10px]"></i>
                    <span>Expected Date Required</span>
                </div>
                <div>
                    <button type="button" 
                        id="btn-update-delivery-${order.id}"
                        onclick="openUpdateDeliveryDateModal(${order.id}, '${orderSourceType}', '${escapeJs(orderCode)}', '', ${mrIdParam})" 
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1">
                        <i class="fa-regular fa-calendar-plus text-xs"></i>
                        <span>Update Date</span>
                    </button>
                </div>
            </div>
        `;
    } else if (hasValidDate) {
        const rawDate = (order.expectedDeliveryDate || order.deliveryDate || '').toString().trim();
        const displayDate = formatExpectedDeliveryDateForDisplay(rawDate);
        return `
            <div class="space-y-1 py-0.5" id="delivery-cell-${order.id}">
                <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Expected Delivery</span>
                <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <i class="fa-regular fa-calendar-check text-emerald-600 text-sm"></i>
                    <span>${escapeHtml(displayDate)}</span>
                </span>
                ${isAccepted ? `
                <button type="button" 
                    onclick="openUpdateDeliveryDateModal(${order.id}, '${orderSourceType}', '${escapeJs(orderCode)}', '${escapeJs(displayDate)}', ${mrIdParam})" 
                    class="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline mt-0.5 inline-flex items-center gap-1 cursor-pointer">
                    <i class="fa-regular fa-pen-to-square text-[9px]"></i>
                    <span>Edit Date</span>
                </button>
                ` : ''}
            </div>
        `;
    } else {
        return `
            <div class="space-y-1 py-0.5" id="delivery-cell-${order.id}">
                <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Expected Delivery</span>
                <span class="text-xs font-semibold text-slate-500 block">Not Set</span>
                <span class="text-[10px] text-slate-400 italic block">Pending order acceptance</span>
            </div>
        `;
    }
}

/**
 * Synchronizes the Orders sidebar badge and Dashboard KPI counter with authoritative active orders count.
 */
function updateSellerOrdersBadge(orders) {
    const ordersBadge = document.getElementById('nav-orders-badge');
    const kpiActiveOrders = document.getElementById('kpi-active-orders');
    if (!ordersBadge && !kpiActiveOrders) return;

    let activeCount = 0;
    if (Array.isArray(orders)) {
        activeCount = orders.filter(o => {
            const s = (o.orderStatus || o.status || o.rawStatus || '').trim().toUpperCase();
            return isOrderActiveStatus(s);
        }).length;
    } else if (typeof orders === 'number') {
        activeCount = orders;
    }

    if (ordersBadge) {
        ordersBadge.innerText = `${activeCount} Active`;
    }
    if (kpiActiveOrders) {
        kpiActiveOrders.innerText = activeCount;
    }
}

async function loadSellerOrders() {
    const seq = ++_ordersReqSeq;
    const tbody = document.getElementById('sellerOrdersTbody');
    const ordersBadge = document.getElementById('nav-orders-badge');
    const kpiActiveOrders = document.getElementById('kpi-active-orders');

    if (tbody) {
        renderSellerTableLoading(tbody, 7);
    }

    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();
    if (!token) {
        if (seq !== _ordersReqSeq) return;
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 text-xs">Please log in to view assigned material orders.</td></tr>`;
        }
        if (ordersBadge) ordersBadge.innerText = "";
        return;
    }

    try {
        const res = await fetch(API_BASE_URL + `/api/material-orders/seller?_t=${Date.now()}`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            cache: 'no-store'
        });

        if (seq !== _ordersReqSeq) return;

        if (!res.ok) {
            throw new Error(`Server returned HTTP ${res.status}`);
        }

        const orders = await res.json();
        if (Array.isArray(orders)) {
            sellerOrdersCache = orders;
            if (tbody) {
                if (orders.length > 0) {
                    renderSellerOrders(orders);
                } else {
                    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 text-xs">No customer orders assigned yet.</td></tr>`;
                }
            }
            updateSellerOrdersBadge(orders);
        } else {
            throw new Error("Invalid response format");
        }
    } catch (e) {
        if (seq !== _ordersReqSeq) return;
        console.warn("Could not fetch seller orders:", e);
        if (tbody) {
            renderSellerTableError(tbody, 7, "loadSellerOrders()");
        }
        if (ordersBadge) ordersBadge.innerText = "—";
        if (kpiActiveOrders) kpiActiveOrders.innerText = "—";
    }
}

function renderSellerOrders(orders) {
    const tbody = document.getElementById('sellerOrdersTbody');
    if (!tbody) return;

    tbody.innerHTML = "";

    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-all";

        const orderCode = order.orderCode || order.orderId || ('ORD-' + order.id);
        const buyerName = order.buyerName || "Authorized Buyer";
        const buyerRole = order.buyerRole || "CUSTOMER";
        const totalAmount = Number(order.totalAmount || 0).toLocaleString('en-IN');
        const rawStatus = (order.orderStatus || order.status || order.rawStatus || "WAITING_FOR_ACCEPTANCE").trim().toUpperCase();

        const isDirectBuy = order.sourceType === 'DIRECT_BUY' || order.type === 'DIRECT_BUY' || order.isDirectBuy === true;
        const orderSourceType = isDirectBuy ? 'DIRECT_BUY' : 'MATERIAL_ORDER';

        const isAccepted = isOrderAccepted(order);
        const hasValidDate = hasValidExpectedDeliveryDate(order);
        const isMissingDate = isAccepted && !hasValidDate;

        // Items display with explicit quantity to deliver
        const items = order.items || [];
        let itemsHtml = items.map(it => `
            <div class="mb-1">
                <span class="font-bold text-slate-800 text-xs">✓ ${escapeHtml(it.materialName)}</span>
                <span class="block text-emerald-700 font-bold text-[11px]">Deliver: ${it.allocatedQuantity || it.quantity || 1} ${escapeHtml(it.unit || '')} @ ₹${it.agreedRate || it.unitPrice || 0}</span>
            </div>
        `).join('');

        if (order.unselectedItems && order.unselectedItems.length > 0) {
            itemsHtml += `
                <div class="mt-1 pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                    <span class="font-semibold block">Not Selected from quote:</span>
                    <span class="italic">${escapeHtml(order.unselectedItems.join(', '))}</span>
                </div>
            `;
        }

        // Status badge & styling
        let statusBadge = "";
        let actionButtons = "";

        if (rawStatus === "WAITING_FOR_ACCEPTANCE") {
            statusBadge = `<span class="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold block text-center">Waiting for Acceptance<br><span class="text-[9px] font-medium">स्वीकृति की प्रतीक्षा</span></span>`;
            actionButtons = `<button onclick="acceptSellerOrder(${order.id}, '${orderSourceType}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"><i class="fa-solid fa-check"></i> Accept Order</button>`;
        } else if (rawStatus === "ORDER_ACCEPTED" || rawStatus === "ACCEPTED" || rawStatus === "CONFIRMED" || rawStatus === "ORDER_CONFIRMED") {
            statusBadge = `<span class="bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full text-[10px] font-bold block text-center">Order Accepted<br><span class="text-[9px] font-medium">ऑर्डर स्वीकार किया गया</span></span>`;
            actionButtons = `<button onclick="updateSellerOrderStatus(${order.id}, 'PROCESSING', '${orderSourceType}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"><i class="fa-solid fa-gears"></i> Start Processing</button>`;
        } else if (rawStatus === "PROCESSING") {
            statusBadge = `<span class="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-[10px] font-bold block text-center">Processing<br><span class="text-[9px] font-medium">प्रक्रिया में</span></span>`;
            actionButtons = `<button onclick="updateSellerOrderStatus(${order.id}, 'READY_FOR_DISPATCH', '${orderSourceType}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"><i class="fa-solid fa-box"></i> Ready for Dispatch</button>`;
        } else if (rawStatus === "READY_FOR_DISPATCH" || rawStatus === "DISPATCHED") {
            statusBadge = `<span class="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full text-[10px] font-bold block text-center">Order Dispatched<br><span class="text-[9px] font-medium">ऑर्डर भेजा गया</span></span>`;
            actionButtons = `<button onclick="updateSellerOrderStatus(${order.id}, 'OUT_FOR_DELIVERY', '${orderSourceType}')" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"><i class="fa-solid fa-truck"></i> Mark as Out for Delivery</button>`;
        } else if (rawStatus === "OUT_FOR_DELIVERY") {
            statusBadge = `<span class="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full text-[10px] font-bold block text-center">Out for Delivery<br><span class="text-[9px] font-medium">डिलीवरी के लिए निकल चुका है</span></span>`;
            actionButtons = `<button onclick="updateSellerOrderStatus(${order.id}, 'DELIVERED', '${orderSourceType}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"><i class="fa-solid fa-circle-check"></i> Mark as Delivered</button>`;
        } else if (rawStatus === "DELIVERED" || rawStatus === "COMPLETED") {
            statusBadge = `<span class="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold block text-center">Delivered<br><span class="text-[9px] font-medium">डिलीवर हो गया</span></span>`;
            actionButtons = `<span class="text-xs text-emerald-600 font-bold"><i class="fa-solid fa-circle-check mr-1"></i> Fulfilled</span>`;
        } else {
            statusBadge = `<span class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-bold block text-center">${escapeHtml(rawStatus)}</span>`;
        }

        // Authorized Buyer info with visual indicator if date pending
        const buyerInfoHtml = `
            <div>
                <div class="flex items-center space-x-1.5">
                    <span class="text-blue-600 font-bold block text-xs">${escapeHtml(orderCode)}</span>
                    ${isMissingDate ? `<span id="date-pending-badge-${order.id}" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"><i class="fa-solid fa-clock text-rose-500 mr-1 text-[9px]"></i>Date Pending</span>` : ''}
                </div>
                <span class="font-bold text-slate-800 text-xs block">${escapeHtml(buyerName)} <span class="text-[10px] text-slate-500 font-normal">(${escapeHtml(buyerRole)})</span></span>
                ${order.contactNumber ? `<span class="text-[11px] text-slate-600 block"><i class="fa-solid fa-phone mr-1 text-slate-400"></i>${escapeHtml(order.contactNumber)}</span>` : ''}
                ${order.deliveryAddress ? `<span class="text-[11px] text-slate-500 block truncate max-w-xs" title="${escapeHtml(order.deliveryAddress)}"><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i>${escapeHtml(order.deliveryAddress)}</span>` : ''}
            </div>
        `;

        // Expected Delivery column presentation via centralized helper
        const expectedDeliveryCellHtml = renderExpectedDeliveryCellContent(order);

        tr.innerHTML = `
            <td class="p-4 font-medium">${buyerInfoHtml}</td>
            <td class="p-4">${itemsHtml}</td>
            <td class="p-4 font-bold text-slate-900 text-xs">₹${totalAmount}</td>
            <td class="p-4">${expectedDeliveryCellHtml}</td>
            <td class="p-4"><span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-bold">Authorized</span></td>
            <td class="p-4">${statusBadge}</td>
            <td class="p-4 text-right space-y-1">
                ${actionButtons}
            </td>
        `;

        tbody.appendChild(tr);
    });
}

async function acceptSellerOrder(orderId, sourceType = 'MATERIAL_ORDER') {
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();
    if (!token) return;

    try {
        const url = (sourceType === 'DIRECT_BUY')
            ? API_BASE_URL + `/api/direct-buy/requests/${orderId}/accept`
            : API_BASE_URL + `/api/material-orders/${orderId}/accept`;

        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (res.ok) {
            showToast("Order accepted successfully! — ऑर्डर स्वीकार कर लिया गया!");
            await loadSellerOrders();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.error || err.message || "Failed to accept order");
        }
    } catch (e) {
        showToast("Error accepting order");
    }
}

async function updateSellerOrderStatus(orderId, status, sourceType = 'MATERIAL_ORDER') {
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();
    if (!token) return;

    try {
        const url = (sourceType === 'DIRECT_BUY')
            ? API_BASE_URL + `/api/direct-buy/requests/${orderId}/status`
            : API_BASE_URL + `/api/material-orders/${orderId}/status`;

        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: status, sourceType: sourceType })
        });

        if (res.ok) {
            showToast(`Order status updated to ${status} — स्थिति अपडेट की गई`);
            await loadSellerOrders();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.error || err.message || "Failed to update order status");
        }
    } catch (e) {
        showToast("Error updating order status");
    }
}

/**
 * Returns current business date in Asia/Kolkata timezone.
 * @returns {{ year: number, month: number, day: number, iso: string, display: string }}
 */
function getTodayDateInIST() {
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const iso = formatter.format(new Date()); // "YYYY-MM-DD"
        const [y, m, d] = iso.split('-');
        return {
            year: parseInt(y, 10),
            month: parseInt(m, 10),
            day: parseInt(d, 10),
            iso: `${y}-${m}-${d}`,
            display: `${d}/${m}/${y}`
        };
    } catch (e) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return {
            year: y,
            month: parseInt(m, 10),
            day: parseInt(d, 10),
            iso: `${y}-${m}-${d}`,
            display: `${d}/${m}/${y}`
        };
    }
}

/**
 * Formats any recognized expected delivery date string (e.g. "28 Oct 2026", "2026-10-28", "28/10/2026")
 * into consistent DD/MM/YYYY display format.
 */
function formatExpectedDeliveryDateForDisplay(dateStr) {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    if (!trimmed || trimmed.toLowerCase() === 'not set' || trimmed.toLowerCase() === 'pending confirmation' || trimmed.toLowerCase() === 'standard delivery window' || trimmed.toLowerCase() === 'null') {
        return trimmed;
    }

    const comp = parseExpectedDeliveryDateToComponents(trimmed);
    if (comp && comp.display) {
        return comp.display;
    }

    return trimmed;
}

/**
 * Parses known format into calendar components { day, month, year, iso: 'YYYY-MM-DD', display: 'DD/MM/YYYY' }
 */
function parseExpectedDeliveryDateToComponents(dateStr) {
    if (!dateStr) return null;
    let trimmed = String(dateStr).trim();
    if (!trimmed || trimmed.toLowerCase() === 'not set' || trimmed.toLowerCase() === 'pending confirmation' || trimmed.toLowerCase() === 'standard delivery window' || trimmed.toLowerCase() === 'null') return null;

    // Remove any commas or redundant spaces (e.g., "28 Oct, 2026")
    trimmed = trimmed.replace(/,\s*/g, ' ').replace(/\s+/g, ' ');

    // 1. Slash or hyphen format "DD/MM/YYYY" or "DD-MM-YYYY"
    const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slashMatch) {
        const d = parseInt(slashMatch[1], 10);
        const m = parseInt(slashMatch[2], 10);
        const y = parseInt(slashMatch[3], 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return {
                day: d,
                month: m,
                year: y,
                iso: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                display: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y).padStart(4, '0')}`
            };
        }
    }

    // 2. ISO "YYYY-MM-DD"
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const y = parseInt(isoMatch[1], 10);
        const m = parseInt(isoMatch[2], 10);
        const d = parseInt(isoMatch[3], 10);
        return {
            day: d,
            month: m,
            year: y,
            iso: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            display: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y).padStart(4, '0')}`
        };
    }

    const months = {
        'jan': 1, 'january': 1,
        'feb': 2, 'february': 2,
        'mar': 3, 'march': 3,
        'apr': 4, 'april': 4,
        'may': 5,
        'jun': 6, 'june': 6,
        'jul': 7, 'july': 7,
        'aug': 8, 'august': 8,
        'sep': 9, 'september': 9,
        'oct': 10, 'october': 10,
        'nov': 11, 'november': 11,
        'dec': 12, 'december': 12
    };

    // 3. Textual day-first "28 Oct 2026" or "28 October 2026"
    const dayFirstMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (dayFirstMatch) {
        const m = months[dayFirstMatch[2].toLowerCase()];
        if (m) {
            const d = parseInt(dayFirstMatch[1], 10);
            const y = parseInt(dayFirstMatch[3], 10);
            return {
                day: d,
                month: m,
                year: y,
                iso: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                display: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y).padStart(4, '0')}`
            };
        }
    }

    // 4. Textual month-first "Oct 28 2026" or "October 28 2026"
    const monthFirstMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/);
    if (monthFirstMatch) {
        const m = months[monthFirstMatch[1].toLowerCase()];
        if (m) {
            const d = parseInt(monthFirstMatch[2], 10);
            const y = parseInt(monthFirstMatch[3], 10);
            return {
                day: d,
                month: m,
                year: y,
                iso: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                display: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y).padStart(4, '0')}`
            };
        }
    }

    return null;
}

/**
 * Strictly validates an expected delivery date string (entered manually in DD/MM/YYYY or picked).
 * Enforces:
 * - Non-blank
 * - Strict calendar date (rejects 31/02/2026, 29/02 in non-leap, 31/04, etc.)
 * - Year between 2000 and 2100
 * - Past date rejection using Asia/Kolkata current date
 */
function validateStrictExpectedDeliveryDate(rawInput) {
    if (!rawInput || !rawInput.trim()) {
        return { valid: false, error: 'Expected delivery date is required.' };
    }

    const trimmed = rawInput.trim();
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) {
        return { valid: false, error: 'Invalid date format. Please enter date in DD/MM/YYYY format (e.g. 28/10/2026).' };
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (year < 2000 || year > 2100) {
        return { valid: false, error: 'Please enter a valid 4-digit year between 2000 and 2100.' };
    }

    if (month < 1 || month > 12) {
        return { valid: false, error: 'Invalid month in date. Month must be between 01 and 12.' };
    }

    // Strict days in month (handles leap year accurately via Date(year, month, 0))
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
        return { valid: false, error: `Invalid date: Day ${day} does not exist in month ${month}/${year}.` };
    }

    const isoStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const todayIST = getTodayDateInIST();

    // Check past date in Asia/Kolkata
    if (isoStr < todayIST.iso) {
        return { valid: false, error: `Expected delivery date cannot be in the past (${todayIST.display} IST is today).` };
    }

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const canonicalApiDate = `${String(day).padStart(2, '0')} ${MONTHS[month - 1]} ${year}`;
    const displayDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

    return {
        valid: true,
        day, month, year,
        iso: isoStr,
        displayDate: displayDate,
        canonicalApiDate: canonicalApiDate
    };
}

/**
 * Triggers native calendar picker and syncs from current manual input if valid
 */
function triggerDeliveryDatePicker() {
    const picker = document.getElementById('deliveryModalDatePicker');
    const manualInput = document.getElementById('deliveryModalManualDate');
    if (!picker) return;

    if (manualInput && manualInput.value) {
        const val = validateStrictExpectedDeliveryDate(manualInput.value);
        if (val.valid) {
            picker.value = val.iso;
        }
    }

    if (typeof picker.showPicker === 'function') {
        try {
            picker.showPicker();
            return;
        } catch (e) {
            // fallback
        }
    }
    picker.focus();
    picker.click();
}

let _deliveryModalSyncInitialized = false;
function setupDeliveryModalSyncListeners() {
    if (_deliveryModalSyncInitialized) return;
    _deliveryModalSyncInitialized = true;

    const picker = document.getElementById('deliveryModalDatePicker');
    const manualInput = document.getElementById('deliveryModalManualDate');
    const errContainer = document.getElementById('deliveryModalError');

    if (picker && manualInput) {
        // When calendar picker value changes -> update manual input to DD/MM/YYYY
        picker.addEventListener('change', () => {
            if (picker.value) {
                const parts = picker.value.split('-');
                if (parts.length === 3) {
                    const [y, m, d] = parts;
                    manualInput.value = `${d}/${m}/${y}`;
                    if (errContainer) errContainer.classList.add('hidden');
                }
            }
        });

        // When user types in manual input -> sync to picker if valid
        manualInput.addEventListener('input', () => {
            if (errContainer) errContainer.classList.add('hidden');
            const val = manualInput.value.trim();
            if (val.length === 10) {
                const res = validateStrictExpectedDeliveryDate(val);
                if (res.valid) {
                    picker.value = res.iso;
                }
            }
        });
    }
}

/**
 * Open professional date picker modal for updating expected delivery date
 */
function openUpdateDeliveryDateModal(orderId, sourceType = 'MATERIAL_ORDER', orderCode = '', currentDate = '', materialRequestId = null) {
    const modal = document.getElementById('updateDeliveryDateModal');
    if (!modal) return;

    const orderIdInput = document.getElementById('deliveryModalOrderId');
    const sourceTypeInput = document.getElementById('deliveryModalSourceType');
    const mrIdInput = document.getElementById('deliveryModalMaterialRequestId');
    const orderCodeSpan = document.getElementById('deliveryModalOrderCode');
    const sourceBadge = document.getElementById('deliveryModalSourceBadge');

    if (orderIdInput) orderIdInput.value = orderId;
    if (sourceTypeInput) sourceTypeInput.value = sourceType || 'MATERIAL_ORDER';
    if (mrIdInput) mrIdInput.value = (materialRequestId && materialRequestId !== 'null') ? materialRequestId : '';
    if (orderCodeSpan) orderCodeSpan.innerText = orderCode || ('ORD-' + orderId);

    if (sourceBadge) {
        if (sourceType === 'DIRECT_BUY') {
            sourceBadge.innerText = 'Direct Buy Order';
            sourceBadge.className = 'bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold';
        } else {
            sourceBadge.innerText = 'Standard Order';
            sourceBadge.className = 'bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold';
        }
    }

    const todayIST = getTodayDateInIST();
    const todayHint = document.getElementById('deliveryModalTodayHint');
    if (todayHint) {
        todayHint.innerText = `Min: ${todayIST.display} (IST)`;
    }

    const picker = document.getElementById('deliveryModalDatePicker');
    const manualInput = document.getElementById('deliveryModalManualDate');

    if (picker) {
        picker.min = todayIST.iso;
        picker.value = '';
    }
    if (manualInput) {
        manualInput.value = '';
    }

    if (currentDate && currentDate.trim() && currentDate.toLowerCase() !== 'not set' && currentDate.toLowerCase() !== 'pending confirmation' && currentDate.toLowerCase() !== 'standard delivery window' && currentDate.toLowerCase() !== 'null') {
        const parsed = parseExpectedDeliveryDateToComponents(currentDate);
        if (parsed) {
            if (manualInput) manualInput.value = parsed.display;
            if (picker) picker.value = parsed.iso;
        }
    }

    setupDeliveryModalSyncListeners();

    const errContainer = document.getElementById('deliveryModalError');
    if (errContainer) errContainer.classList.add('hidden');

    const saveBtn = document.getElementById('deliveryModalSaveBtn');
    const spinner = document.getElementById('deliveryModalSpinner');
    const saveText = document.getElementById('deliveryModalSaveText');
    if (saveBtn) saveBtn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (saveText) saveText.innerText = 'Save Delivery Date';

    openModal('updateDeliveryDateModal');
    if (manualInput) setTimeout(() => manualInput.focus(), 100);
}

let _isSavingDeliveryDate = false;

/**
 * Validates, locks against duplicate submissions, and persists expected delivery date to authoritative backend
 */
async function submitDeliveryDateUpdate() {
    if (_isSavingDeliveryDate) return;

    const orderId = document.getElementById('deliveryModalOrderId') ? document.getElementById('deliveryModalOrderId').value : null;
    const sourceType = document.getElementById('deliveryModalSourceType') ? document.getElementById('deliveryModalSourceType').value : 'MATERIAL_ORDER';
    const mrIdInput = document.getElementById('deliveryModalMaterialRequestId');
    const materialRequestId = mrIdInput && mrIdInput.value && mrIdInput.value !== 'null' ? mrIdInput.value : null;
    const manualInput = document.getElementById('deliveryModalManualDate');
    const picker = document.getElementById('deliveryModalDatePicker');

    let rawVal = manualInput ? manualInput.value.trim() : '';
    if (!rawVal && picker && picker.value) {
        const parts = picker.value.split('-');
        if (parts.length === 3) rawVal = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const errContainer = document.getElementById('deliveryModalError');
    const errText = document.getElementById('deliveryModalErrorText');

    function showError(msg) {
        if (errContainer && errText) {
            errText.innerText = msg;
            errContainer.classList.remove('hidden');
        } else {
            showToast(msg);
        }
    }

    if (errContainer) errContainer.classList.add('hidden');

    if (!orderId) {
        showError('Order reference missing. Please try again.');
        return;
    }

    const validation = validateStrictExpectedDeliveryDate(rawVal);
    if (!validation.valid) {
        showError(validation.error);
        if (manualInput) manualInput.focus();
        return;
    }

    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();
    if (!token) {
        showError('Session expired. Please log in again.');
        return;
    }

    const saveBtn = document.getElementById('deliveryModalSaveBtn');
    const spinner = document.getElementById('deliveryModalSpinner');
    const saveText = document.getElementById('deliveryModalSaveText');

    try {
        _isSavingDeliveryDate = true;
        if (saveBtn) saveBtn.disabled = true;
        if (spinner) spinner.classList.remove('hidden');
        if (saveText) saveText.innerText = 'Saving...';

        let targetId = orderId;
        if (sourceType === 'DIRECT_BUY' && materialRequestId) {
            targetId = materialRequestId;
        }

        let url = (sourceType === 'DIRECT_BUY')
            ? `${API_BASE_URL}/api/direct-buy/requests/${targetId}/expected-delivery`
            : `${API_BASE_URL}/api/material-orders/${targetId}/expected-delivery`;

        let res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                expectedDeliveryDate: validation.canonicalApiDate,
                sourceType: sourceType
            })
        });

        // Robust fallback if 404
        if (res.status === 404) {
            const fallbackUrl = (sourceType === 'DIRECT_BUY')
                ? `${API_BASE_URL}/api/material-orders/${orderId}/expected-delivery`
                : `${API_BASE_URL}/api/direct-buy/requests/${orderId}/expected-delivery`;
            const fallbackRes = await fetch(fallbackUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    expectedDeliveryDate: validation.canonicalApiDate,
                    sourceType: sourceType
                })
            });
            if (fallbackRes.ok) {
                res = fallbackRes;
            }
        }

        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            const confirmedDate = data.expectedDeliveryDate || data.deliveryDate || validation.canonicalApiDate;
            const displayDate = formatExpectedDeliveryDateForDisplay(confirmedDate);

            // Update in-memory cache for all matching records
            if (Array.isArray(sellerOrdersCache)) {
                sellerOrdersCache.forEach(o => {
                    if (String(o.id) === String(orderId) || 
                        (materialRequestId && String(o.id) === String(materialRequestId)) ||
                        (o.materialRequestId && String(o.materialRequestId) === String(orderId)) ||
                        (materialRequestId && o.materialRequestId && String(o.materialRequestId) === String(materialRequestId))) {
                        o.expectedDeliveryDate = confirmedDate;
                        o.deliveryDate = confirmedDate;
                    }
                });
            }

            // Immediately re-render the delivery cell in DOM using the updated authoritative order data
            const cellElem = document.getElementById(`delivery-cell-${orderId}`);
            if (cellElem) {
                const targetOrder = (Array.isArray(sellerOrdersCache) && sellerOrdersCache.find(o => String(o.id) === String(orderId))) || {
                    id: orderId,
                    sourceType: sourceType,
                    expectedDeliveryDate: confirmedDate,
                    orderStatus: 'ACCEPTED',
                    materialRequestId: materialRequestId
                };
                cellElem.outerHTML = renderExpectedDeliveryCellContent(targetOrder);
            }

            // Remove Date Pending badge from buyer column if present
            const pendingBadge = document.getElementById(`date-pending-badge-${orderId}`);
            if (pendingBadge) pendingBadge.remove();

            closeModal('updateDeliveryDateModal');
            showToast(`Expected delivery date updated to ${displayDate}! — डिलीवरी की तारीख अपडेट की गई!`);

            // Authoritative background refresh with cache busting to guarantee persistent sync
            await loadSellerOrders();
        } else {
            const errData = await res.json().catch(() => ({}));
            const msg = errData.error || errData.message || `Failed to update delivery date (HTTP ${res.status})`;
            showError(msg);
        }
    } catch (err) {
        console.error('Error saving delivery date:', err);
        showError('Network error while saving expected delivery date. Please try again.');
    } finally {
        _isSavingDeliveryDate = false;
        if (saveBtn) saveBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
        if (saveText) saveText.innerText = 'Save Delivery Date';
    }
}

/**
 * Backward compatibility wrapper for existing invocation paths
 */
function promptUpdateDeliveryDate(orderId, sourceType = 'MATERIAL_ORDER') {
    openUpdateDeliveryDateModal(orderId, sourceType);
}

/**
 * Show notification toast and navigate to material requests view
 * @param {string} reqId 
 */
function viewRequirementDetail(reqId) {
    showToast('Loading details for requirement ' + reqId);
    switchTab('requests');
}

/**
 * Show notification toast and navigate to orders view
 * @param {string} orderId 
 */
function openOrderDetail(orderId) {
    showToast('Opening fulfillment details for ' + orderId);
    switchTab('orders');
}

/**
 * Display toast message overlay temporarily
 * @param {string} message 
 */
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    if (toast && toastMsg) {
        toastMsg.innerText = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('button')) {
        const dropdown = document.getElementById('notifications-dropdown');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    }
};

// Initialize seller notifications on startup
document.addEventListener('DOMContentLoaded', () => {
    loadSellerNotifications();
});




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

/* ==========================================================================
   DYNAMIC DATA BINDING: SELLER HIRED PROFESSIONALS (DIRECT HIRE INTEGRATION)
   ========================================================================== */

let allSellerHiredProfessionals = [];
let _hiredProReqSeq = 0;

/**
 * Initialize DOM listeners for Seller Hired Professionals filter controls
 */
function initSellerHiredProfessionalsListeners() {
    const searchInput = document.getElementById("sellerHiredSearchInput");
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = "true";
        searchInput.addEventListener("input", () => {
            renderSellerHiredCards();
        });
    }

    const statusFilter = document.getElementById("sellerHiredStatusFilter");
    if (statusFilter && !statusFilter.dataset.bound) {
        statusFilter.dataset.bound = "true";
        statusFilter.addEventListener("change", () => {
            renderSellerHiredCards();
        });
    }

    const resetBtn = document.getElementById("sellerBtnResetHiredFilters");
    if (resetBtn && !resetBtn.dataset.bound) {
        resetBtn.dataset.bound = "true";
        resetBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (statusFilter) statusFilter.value = "ALL";
            renderSellerHiredCards();
        });
    }
}

/**
 * Fetch authoritative accepted hired professionals from GET /api/hired-professionals
 */
async function loadSellerHiredProfessionals() {
    const seq = ++_hiredProReqSeq;
    const token = getCleanToken();

    const loadingState = document.getElementById("sellerHiredLoadingState");
    const errorState = document.getElementById("sellerHiredErrorState");
    const emptyState = document.getElementById("sellerHiredEmptyState");
    const noFilterState = document.getElementById("sellerHiredNoFilterState");
    const cardsGrid = document.getElementById("sellerHiredCardsGrid");
    const errorTitle = document.getElementById("sellerHiredErrorTitle");
    const errorMsg = document.getElementById("sellerHiredErrorMessage");

    if (loadingState) loadingState.classList.remove("hidden");
    if (errorState) errorState.classList.add("hidden");
    if (emptyState) emptyState.classList.add("hidden");
    if (noFilterState) noFilterState.classList.add("hidden");
    if (cardsGrid) cardsGrid.classList.add("hidden");

    if (!token) {
        if (loadingState) loadingState.classList.add("hidden");
        if (errorState) {
            errorState.classList.remove("hidden");
            if (errorTitle) errorTitle.textContent = "Session Expired";
            if (errorMsg) errorMsg.textContent = "Please log in again to view your hired professionals.";
        }
        return;
    }

    try {
        const response = await fetch(`${getApiBaseUrl()}/api/hired-professionals`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        if (seq !== _hiredProReqSeq) return;

        if (response.status === 401) {
            if (loadingState) loadingState.classList.add("hidden");
            if (errorState) {
                errorState.classList.remove("hidden");
                if (errorTitle) errorTitle.textContent = "Session Expired";
                if (errorMsg) errorMsg.textContent = "Your session has expired. Please log in again.";
            }
            return;
        }

        if (response.status === 403) {
            if (loadingState) loadingState.classList.add("hidden");
            if (errorState) {
                errorState.classList.remove("hidden");
                if (errorTitle) errorTitle.textContent = "Access Restricted";
                if (errorMsg) errorMsg.textContent = "Access denied. Only registered requesters can view hired professionals.";
            }
            return;
        }

        if (!response.ok) {
            throw new Error(`Server returned error status (${response.status})`);
        }

        const data = await response.json();
        if (seq !== _hiredProReqSeq) return;

        allSellerHiredProfessionals = Array.isArray(data) ? data : [];

        // Update Summary KPI Metrics
        updateSellerHiredMetrics(allSellerHiredProfessionals);

        // Render Cards with active filters
        renderSellerHiredCards();

    } catch (err) {
        if (seq !== _hiredProReqSeq) return;
        console.error("Seller Dashboard: Failed to load hired professionals:", err);
        if (loadingState) loadingState.classList.add("hidden");
        if (errorState) {
            errorState.classList.remove("hidden");
            if (errorTitle) errorTitle.textContent = "Unable to Load Hired Professionals";
            if (errorMsg) errorMsg.textContent = "An error occurred while fetching your records. Please check your network connection and retry.";
        }
    }
}

/**
 * Update summary KPI metrics based on live records
 */
function updateSellerHiredMetrics(list) {
    const totalEl = document.getElementById("sellerMetricTotalHired");
    const activeEl = document.getElementById("sellerMetricActiveHired");
    const servicesEl = document.getElementById("sellerMetricTotalServices");

    const total = list.length;
    const active = list.filter(item => (item.status || "").toUpperCase() === "ACTIVE").length;

    const distinctServices = new Set();
    list.forEach(item => {
        if (item.service) distinctServices.add(item.service.trim().toLowerCase());
        else if (item.serviceType) distinctServices.add(item.serviceType.trim().toLowerCase());
    });

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (servicesEl) servicesEl.textContent = distinctServices.size;
}

/**
 * Filter and render professional cards inside the Seller Dashboard grid
 */
function renderSellerHiredCards() {
    const loadingState = document.getElementById("sellerHiredLoadingState");
    const errorState = document.getElementById("sellerHiredErrorState");
    const emptyState = document.getElementById("sellerHiredEmptyState");
    const noFilterState = document.getElementById("sellerHiredNoFilterState");
    const cardsGrid = document.getElementById("sellerHiredCardsGrid");
    const resultsCount = document.getElementById("sellerHiredResultsCount");

    if (loadingState) loadingState.classList.add("hidden");
    if (errorState) errorState.classList.add("hidden");

    const searchInput = document.getElementById("sellerHiredSearchInput");
    const statusFilter = document.getElementById("sellerHiredStatusFilter");

    const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const selectedStatus = statusFilter ? statusFilter.value : "ALL";

    const filtered = allSellerHiredProfessionals.filter(item => {
        if (selectedStatus !== "ALL") {
            const itemStatus = (item.status || "").toUpperCase();
            if (itemStatus !== selectedStatus) return false;
        }

        if (query) {
            const proName = (item.professionalName || "").toLowerCase();
            const service = (item.service || "").toLowerCase();
            const serviceType = (item.serviceType || "").toLowerCase();
            const location = (item.location || "").toLowerCase();
            const hiringId = (item.hiringId || "").toLowerCase();
            const reqId = (item.requestId || "").toLowerCase();

            const matches = proName.includes(query) ||
                            service.includes(query) ||
                            serviceType.includes(query) ||
                            location.includes(query) ||
                            hiringId.includes(query) ||
                            reqId.includes(query);
            if (!matches) return false;
        }

        return true;
    });

    if (resultsCount) {
        resultsCount.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${allSellerHiredProfessionals.length}</strong> hired professionals`;
    }

    if (allSellerHiredProfessionals.length === 0) {
        if (emptyState) emptyState.classList.remove("hidden");
        if (noFilterState) noFilterState.classList.add("hidden");
        if (cardsGrid) {
            cardsGrid.classList.add("hidden");
            cardsGrid.innerHTML = "";
        }
        return;
    }

    if (filtered.length === 0) {
        if (emptyState) emptyState.classList.add("hidden");
        if (noFilterState) noFilterState.classList.remove("hidden");
        if (cardsGrid) {
            cardsGrid.classList.add("hidden");
            cardsGrid.innerHTML = "";
        }
        return;
    }

    if (emptyState) emptyState.classList.add("hidden");
    if (noFilterState) noFilterState.classList.add("hidden");
    if (cardsGrid) {
        cardsGrid.innerHTML = filtered.map(item => createSellerHiredCardHtml(item)).join("");
        cardsGrid.classList.remove("hidden");
    }
}

/**
 * Generate semantic, Tailwind-styled professional card HTML matching Seller Dashboard design
 */
function createSellerHiredCardHtml(item) {
    const proName = escapeSellerHtml(item.professionalName || "Professional Specialist");
    const hiringId = escapeSellerHtml(item.hiringId || item.requestId || "HIRE-N/A");
    const requestId = escapeSellerHtml(item.requestId || "REQ-N/A");
    const roleDisplay = escapeSellerHtml(formatSellerProRole(item.professionalRole, item.serviceType));
    const service = escapeSellerHtml(item.service || item.serviceType || "Construction Service");
    const location = escapeSellerHtml(item.location || "Location on Request");
    const dateFormatted = formatSellerProDate(item.hiringDate);
    const budgetFormatted = item.agreedBudget != null ? formatSellerCurrency(item.agreedBudget) : "Direct Quote Agreed";
    const scopeSnippet = escapeSellerHtml(item.projectScope || "Direct hire engagement for specialized engineering & site execution.");
    const phone = item.phone ? escapeSellerHtml(item.phone) : "";

    const hiredViaDisplay = (item.hiredVia === "DIRECT_HIRE" || !item.hiredVia) ? "Direct Hire" : String(item.hiredVia).replace(/_/g, " ");

    const photoUrl = item.profilePhotoUrl ? escapeSellerHtml(item.profilePhotoUrl) : "";
    const avatarHtml = photoUrl
        ? `<img src="${photoUrl}" alt="${proName}" class="w-11 h-11 rounded-xl object-cover border border-slate-200" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(item.professionalName || 'Pro')}'">`
        : `<div class="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center border border-blue-200">${getSellerProInitials(item.professionalName || "Pro")}</div>`;

    return `
        <article class="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
            <!-- Card Top Header -->
            <div class="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <span class="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <i class="fa-solid fa-user-check text-[10px]"></i>
                        <span>${escapeSellerHtml(hiredViaDisplay)}</span>
                    </span>
                    <span class="font-mono text-[11px] text-slate-400 font-medium">#${hiringId}</span>
                </div>
                <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>ACTIVE</span>
                </span>
            </div>

            <!-- Card Body Content -->
            <div class="p-4 space-y-3.5 flex-1">
                <!-- Profile Row -->
                <div class="flex items-center space-x-3">
                    ${avatarHtml}
                    <div class="overflow-hidden flex-1">
                        <h3 class="font-bold text-slate-900 text-sm truncate flex items-center space-x-1" title="${proName}">
                            <span>${proName}</span>
                            <i class="fa-solid fa-circle-check text-blue-500 text-xs flex-shrink-0" title="BuildBid Verified Professional"></i>
                        </h3>
                        <p class="text-xs text-slate-500 truncate mt-0.5">${roleDisplay}</p>
                    </div>
                </div>

                <!-- Key Attributes 2x2 Grid -->
                <div class="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center space-x-1">
                            <i class="fa-solid fa-screwdriver-wrench text-[9px]"></i>
                            <span>Service</span>
                        </span>
                        <span class="font-semibold text-slate-800 truncate block mt-0.5" title="${service}">${service}</span>
                    </div>

                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center space-x-1">
                            <i class="fa-solid fa-location-dot text-[9px]"></i>
                            <span>Location</span>
                        </span>
                        <span class="font-semibold text-slate-800 truncate block mt-0.5" title="${location}">${location}</span>
                    </div>

                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center space-x-1">
                            <i class="fa-regular fa-calendar text-[9px]"></i>
                            <span>Hired Date</span>
                        </span>
                        <span class="font-semibold text-slate-700 block mt-0.5">${dateFormatted}</span>
                    </div>

                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center space-x-1">
                            <i class="fa-solid fa-indian-rupee-sign text-[9px]"></i>
                            <span>Agreed Budget</span>
                        </span>
                        <span class="font-bold text-emerald-600 block mt-0.5">${budgetFormatted}</span>
                    </div>
                </div>

                <!-- Scope Preview -->
                <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Project Scope:</span>
                    <p class="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">${scopeSnippet}</p>
                </div>
            </div>

            <!-- Card Actions -->
            <div class="px-4 py-3 bg-white border-t border-slate-100 flex items-center space-x-2">
                <button type="button" onclick="openSellerHiredDetailsModal('${hiringId}')"
                    class="flex-1 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1.5">
                    <i class="fa-regular fa-eye text-xs"></i>
                    <span>View Full Details</span>
                </button>
                ${phone ? `
                    <a href="tel:${phone}" class="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 flex items-center justify-center transition-all" title="Direct Phone Call: ${phone}">
                        <i class="fa-solid fa-phone text-xs"></i>
                    </a>
                ` : ""}
            </div>
        </article>
    `;
}

/**
 * Open details modal populated with specified professional's records
 */
function openSellerHiredDetailsModal(hiringId) {
    const item = allSellerHiredProfessionals.find(p =>
        String(p.hiringId) === String(hiringId) || String(p.requestId) === String(hiringId)
    );
    if (!item) {
        showToast("Professional hiring record could not be found.");
        return;
    }

    const proName = escapeSellerHtml(item.professionalName || "Professional Specialist");
    const proRole = escapeSellerHtml(formatSellerProRole(item.professionalRole, item.serviceType));
    const service = escapeSellerHtml(item.service || "Specialized Service");
    const serviceType = escapeSellerHtml(item.serviceType || item.service || "General");
    const location = escapeSellerHtml(item.location || "Location on Request");
    const budget = item.agreedBudget != null ? formatSellerCurrency(item.agreedBudget) : "Direct Quote Agreed";
    const dateStr = formatSellerProDateTime(item.hiringDate);
    const scope = escapeSellerHtml(item.projectScope || "Direct hire engagement for specialized engineering & site execution.");
    const phone = item.phone ? escapeSellerHtml(item.phone) : "Not Provided";
    const email = item.email ? escapeSellerHtml(item.email) : "Not Provided";
    const hId = escapeSellerHtml(item.hiringId || item.requestId || "HIRE-N/A");
    const rId = escapeSellerHtml(item.requestId || "REQ-N/A");

    const avatarWrap = document.getElementById("sellerModalProAvatar");
    if (avatarWrap) {
        if (item.profilePhotoUrl) {
            avatarWrap.innerHTML = `<img src="${escapeSellerHtml(item.profilePhotoUrl)}" alt="${proName}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(item.professionalName || 'Pro')}'">`;
        } else {
            avatarWrap.innerHTML = getSellerProInitials(item.professionalName || "Pro");
        }
    }

    setSellerElementText("sellerModalProName", proName);
    setSellerElementText("sellerModalProRole", proRole);
    setSellerElementText("sellerModalHiringId", `#${hId}`);
    setSellerElementText("sellerModalRequestId", `#${rId}`);
    setSellerElementText("sellerModalServiceType", serviceType);
    setSellerElementText("sellerModalService", service);
    setSellerElementText("sellerModalAgreedBudget", budget);
    setSellerElementText("sellerModalLocation", location);
    setSellerElementText("sellerModalHiringDate", dateStr);
    setSellerElementText("sellerModalProjectScope", scope);

    const phoneEl = document.getElementById("sellerModalPhone");
    if (phoneEl) {
        if (item.phone) {
            phoneEl.innerHTML = `<a href="tel:${escapeSellerHtml(item.phone)}" class="text-blue-600 hover:underline flex items-center space-x-1"><i class="fa-solid fa-phone text-[10px]"></i><span>${escapeSellerHtml(item.phone)}</span></a>`;
        } else {
            phoneEl.textContent = "Not Provided";
        }
    }

    const emailEl = document.getElementById("sellerModalEmail");
    if (emailEl) {
        if (item.email) {
            emailEl.innerHTML = `<a href="mailto:${escapeSellerHtml(item.email)}" class="text-blue-600 hover:underline flex items-center space-x-1"><i class="fa-regular fa-envelope text-[10px]"></i><span>${escapeSellerHtml(item.email)}</span></a>`;
        } else {
            emailEl.textContent = "Not Provided";
        }
    }

    const hiredVia = (item.hiredVia === "DIRECT_HIRE" || !item.hiredVia) ? "Direct Hire" : String(item.hiredVia).replace(/_/g, " ");
    const hiredViaBadge = document.getElementById("sellerModalHiredViaBadge");
    if (hiredViaBadge) {
        hiredViaBadge.innerHTML = `<i class="fa-solid fa-user-check text-[10px]"></i><span>${escapeSellerHtml(hiredVia)}</span>`;
    }

    openModal("sellerHiredDetailsModal");
}

function formatSellerProRole(role, type) {
    const cleanRole = (role || "Professional").replace("ROLE_", "").toLowerCase();
    const capRole = cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1);
    if (!type) return capRole;
    return `${capRole} • ${type}`;
}

function formatSellerProDate(dateStr) {
    if (!dateStr) return "Recent";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "Recent";
        const day = String(d.getDate()).padStart(2, "0");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
    } catch (e) {
        return "Recent";
    }
}

function formatSellerProDateTime(dateStr) {
    if (!dateStr) return "Recently recorded";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "Recently recorded";
        const day = String(d.getDate()).padStart(2, "0");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    } catch (e) {
        return "Recently recorded";
    }
}

function formatSellerCurrency(amount) {
    const num = Number(amount);
    if (isNaN(num)) return "Quote Agreed";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(num);
}

function getSellerProInitials(name) {
    if (!name) return "P";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function escapeSellerHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function setSellerElementText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
}

/* ==========================================================================
   PHASE 3: SELLER DELIVERIES & LOGISTICS MANAGEMENT
   ========================================================================== */

let sellerDeliveriesCache = [];
let activeDeliveryStatusFilter = 'all';
let deliverySearchQuery = '';
let _deliveriesReqSeq = 0;

/**
 * Loads authentic seller deliveries from canonical /api/deliveries/seller endpoint
 */
async function loadSellerDeliveries() {
    const seq = ++_deliveriesReqSeq;
    const tbody = document.getElementById("sellerDeliveriesTbody");
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    if (tbody && (!sellerDeliveriesCache || sellerDeliveriesCache.length === 0)) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="p-8 text-center text-slate-500" role="status" aria-live="polite">
                    <div class="flex flex-col items-center justify-center space-y-2 py-4">
                        <i class="fa-solid fa-circle-notch fa-spin text-blue-600 text-3xl" aria-hidden="true"></i>
                        <div class="space-y-0.5 text-center">
                            <p class="font-semibold text-slate-700 text-sm">Please wait…</p>
                            <p class="text-xs text-slate-400">Loading live delivery records…</p>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    if (!token) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-8 text-center text-slate-400 text-xs">
                        <i class="fa-solid fa-lock text-slate-300 text-2xl mb-2 block"></i>
                        Please log in to manage your shipments and logistics.
                    </td>
                </tr>
            `;
        }
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/deliveries/seller`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (seq !== _deliveriesReqSeq) return;

        if (response.status === 401 || response.status === 403) {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="p-8 text-center text-rose-500 text-xs">
                            <i class="fa-solid fa-circle-exclamation text-rose-400 text-2xl mb-2 block"></i>
                            Your session has expired. Please refresh the page or log in again.
                        </td>
                    </tr>
                `;
            }
            return;
        }

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();
        sellerDeliveriesCache = Array.isArray(data) ? data : [];

        updateDeliveriesOverviewKPIs(sellerDeliveriesCache);
        renderSellerDeliveries();
    } catch (err) {
        if (seq !== _deliveriesReqSeq) return;
        console.error("Seller Deliveries: Error fetching records:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-8 text-center text-slate-500 text-xs">
                        <div class="flex flex-col items-center justify-center space-y-2">
                            <i class="fa-solid fa-triangle-exclamation text-amber-500 text-2xl"></i>
                            <p class="font-semibold text-slate-700">Unable to load deliveries</p>
                            <p class="text-slate-400 max-w-sm">${escapeSellerHtml(err.message || 'Network communication error')}</p>
                            <button type="button" onclick="loadSellerDeliveries()" class="mt-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer">
                                <i class="fa-solid fa-arrows-rotate mr-1"></i> Try Again
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Recalculates and updates Deliveries KPI counts and filter badges
 */
function updateDeliveriesOverviewKPIs(deliveries) {
    const list = Array.isArray(deliveries) ? deliveries : [];

    let total = list.length;
    let processing = 0;
    let inTransit = 0;
    let outForDelivery = 0;
    let delivered = 0;
    let delayed = 0;
    let active = 0;

    list.forEach(d => {
        const s = (d.status || '').toUpperCase();
        if (s === 'PROCESSING') {
            processing++;
            active++;
        } else if (s === 'READY_TO_DISPATCH' || s === 'DISPATCHED' || s === 'IN_TRANSIT') {
            inTransit++;
            active++;
        } else if (s === 'OUT_FOR_DELIVERY') {
            outForDelivery++;
            active++;
        } else if (s === 'DELIVERED') {
            delivered++;
        } else if (s === 'DELAYED' || s === 'DELIVERY_FAILED') {
            delayed++;
            active++;
        } else if (s !== 'RETURNED' && s !== 'CANCELLED') {
            active++;
        }
    });

    setSellerElementText('kpi-deliveries-total', String(total));
    setSellerElementText('kpi-deliveries-processing', String(processing));
    setSellerElementText('kpi-deliveries-transit', String(inTransit));
    setSellerElementText('kpi-deliveries-out', String(outForDelivery));
    setSellerElementText('kpi-deliveries-delivered', String(delivered));
    setSellerElementText('kpi-deliveries-delayed', String(delayed));

    setSellerElementText('count-pill-all', `(${total})`);
    setSellerElementText('count-pill-active', `(${active})`);
    setSellerElementText('count-pill-processing', `(${processing})`);
    setSellerElementText('count-pill-transit', `(${inTransit})`);
    setSellerElementText('count-pill-out', `(${outForDelivery})`);
    setSellerElementText('count-pill-delivered', `(${delivered})`);
    setSellerElementText('count-pill-delayed', `(${delayed})`);

    const badge = document.getElementById('nav-deliveries-badge');
    if (badge) {
        if (active > 0) {
            badge.textContent = String(active);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

/**
 * Filter delivery rows by status category
 */
function filterDeliveriesByStatus(statusKey) {
    activeDeliveryStatusFilter = statusKey;

    const filterBtnMap = {
        'all': 'filter-btn-all',
        'active': 'filter-btn-active',
        'PROCESSING': 'filter-btn-processing',
        'TRANSIT': 'filter-btn-transit',
        'OUT_FOR_DELIVERY': 'filter-btn-out',
        'DELIVERED': 'filter-btn-delivered',
        'DELAYED': 'filter-btn-delayed'
    };

    Object.entries(filterBtnMap).forEach(([key, btnId]) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (key === statusKey) {
            btn.className = 'px-3 py-1.5 rounded-lg bg-blue-600 text-white shadow-sm transition-all cursor-pointer flex items-center space-x-1';
        } else {
            btn.className = 'px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer flex items-center space-x-1';
        }
    });

    renderSellerDeliveries();
}

/**
 * Handle delivery search input
 */
function handleDeliveriesSearch(val) {
    deliverySearchQuery = (val || '').toLowerCase().trim();
    renderSellerDeliveries();
}

/**
 * Filter helper returning active filtered array
 */
function getFilteredDeliveries() {
    let list = Array.isArray(sellerDeliveriesCache) ? [...sellerDeliveriesCache] : [];

    if (activeDeliveryStatusFilter === 'active') {
        list = list.filter(d => {
            const s = (d.status || '').toUpperCase();
            return s !== 'DELIVERED' && s !== 'RETURNED' && s !== 'CANCELLED';
        });
    } else if (activeDeliveryStatusFilter === 'PROCESSING') {
        list = list.filter(d => (d.status || '').toUpperCase() === 'PROCESSING');
    } else if (activeDeliveryStatusFilter === 'TRANSIT') {
        list = list.filter(d => {
            const s = (d.status || '').toUpperCase();
            return s === 'READY_TO_DISPATCH' || s === 'DISPATCHED' || s === 'IN_TRANSIT';
        });
    } else if (activeDeliveryStatusFilter === 'OUT_FOR_DELIVERY') {
        list = list.filter(d => (d.status || '').toUpperCase() === 'OUT_FOR_DELIVERY');
    } else if (activeDeliveryStatusFilter === 'DELIVERED') {
        list = list.filter(d => (d.status || '').toUpperCase() === 'DELIVERED');
    } else if (activeDeliveryStatusFilter === 'DELAYED') {
        list = list.filter(d => {
            const s = (d.status || '').toUpperCase();
            return s === 'DELAYED' || s === 'DELIVERY_FAILED';
        });
    }

    if (deliverySearchQuery) {
        list = list.filter(d => {
            const trk = (d.trackingNumber || '').toLowerCase();
            const ord = (d.orderCode || '').toLowerCase();
            const buyer = (d.buyerName || '').toLowerCase();
            const phone = (d.contactNumber || d.driverPhone || '').toLowerCase();
            const carrier = (d.carrierName || '').toLowerCase();
            const vehicle = (d.vehicleNumber || '').toLowerCase();
            const driver = (d.driverName || '').toLowerCase();
            const addr = (d.deliveryAddress || '').toLowerCase();
            const project = (d.projectName || '').toLowerCase();
            const city = (d.city || '').toLowerCase();
            let itemsStr = '';
            if (Array.isArray(d.items)) {
                itemsStr = d.items.map(i => (i.materialName || '').toLowerCase()).join(' ');
            }
            return trk.includes(deliverySearchQuery) ||
                ord.includes(deliverySearchQuery) ||
                buyer.includes(deliverySearchQuery) ||
                phone.includes(deliverySearchQuery) ||
                carrier.includes(deliverySearchQuery) ||
                vehicle.includes(deliverySearchQuery) ||
                driver.includes(deliverySearchQuery) ||
                addr.includes(deliverySearchQuery) ||
                project.includes(deliverySearchQuery) ||
                city.includes(deliverySearchQuery) ||
                itemsStr.includes(deliverySearchQuery);
        });
    }

    return list;
}

/**
 * Status badge markup generator matching BuildBid design tokens
 */
function getDeliveryStatusBadgeHtml(status) {
    const s = (status || 'PROCESSING').toUpperCase();
    switch (s) {
        case 'PROCESSING':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><i class="fa-solid fa-gears text-[9px] mr-1"></i>Stage 1 • Processing</span>`;
        case 'READY_TO_DISPATCH':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200"><i class="fa-solid fa-boxes-packing text-[9px] mr-1"></i>Stage 2 • Ready</span>`;
        case 'DISPATCHED':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><i class="fa-solid fa-truck text-[9px] mr-1"></i>Stage 2 • Dispatched</span>`;
        case 'IN_TRANSIT':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"><i class="fa-solid fa-truck-moving text-[9px] mr-1"></i>Stage 2 • In Transit</span>`;
        case 'OUT_FOR_DELIVERY':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"><i class="fa-solid fa-truck-fast text-[9px] mr-1"></i>Stage 3 • Out for Delivery</span>`;
        case 'DELIVERED':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><i class="fa-solid fa-circle-check text-[9px] mr-1"></i>Stage 4 • Delivered</span>`;
        case 'DELAYED':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><i class="fa-solid fa-triangle-exclamation text-[9px] mr-1"></i>Delayed</span>`;
        case 'DELIVERY_FAILED':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200"><i class="fa-solid fa-circle-xmark text-[9px] mr-1"></i>Failed Attempt</span>`;
        default:
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${escapeSellerHtml(s)}</span>`;
    }
}

/**
 * Builds valid action buttons based on DeliveryStatus state machine
 */
function getDeliveryActionButtonsHtml(delivery) {
    const s = (delivery.status || 'PROCESSING').toUpperCase();
    const id = delivery.id;
    let buttons = [];

    if (s === 'PROCESSING') {
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'READY_TO_DISPATCH')" class="px-2.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"><i class="fa-solid fa-boxes-packing text-[10px]"></i><span>Pack / Ready</span></button>`);
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'DISPATCHED')" class="px-2.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"><i class="fa-solid fa-truck text-[10px]"></i><span>Dispatch</span></button>`);
    } else if (s === 'READY_TO_DISPATCH') {
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'DISPATCHED')" class="px-2.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"><i class="fa-solid fa-truck text-[10px]"></i><span>Dispatch</span></button>`);
    } else if (s === 'DISPATCHED') {
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'IN_TRANSIT')" class="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"><i class="fa-solid fa-truck-moving text-[10px]"></i><span>In Transit</span></button>`);
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'OUT_FOR_DELIVERY')" class="px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"><i class="fa-solid fa-truck-fast text-[10px]"></i><span>Out for Delivery</span></button>`);
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'DELAYED')" class="px-2 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer" title="Report Delay"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i><span>Delay</span></button>`);
    } else if (s === 'IN_TRANSIT') {
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'OUT_FOR_DELIVERY')" class="px-2.5 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"><i class="fa-solid fa-truck-fast text-[10px]"></i><span>Out for Delivery</span></button>`);
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'DELIVERED')" class="px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"><i class="fa-solid fa-shield-check text-[10px]"></i><span>Deliver</span></button>`);
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'DELAYED')" class="px-2 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer" title="Report Delay"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i><span>Delay</span></button>`);
    } else if (s === 'OUT_FOR_DELIVERY') {
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'DELIVERED')" class="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 cursor-pointer"><i class="fa-solid fa-shield-check text-xs"></i><span>Complete Delivery</span></button>`);
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'DELAYED')" class="px-2 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer" title="Report Delay"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i><span>Delay</span></button>`);
    } else if (s === 'DELAYED') {
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'IN_TRANSIT')" class="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"><i class="fa-solid fa-truck-moving text-[10px]"></i><span>Resume Transit</span></button>`);
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'OUT_FOR_DELIVERY')" class="px-2.5 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"><i class="fa-solid fa-truck-fast text-[10px]"></i><span>Out for Delivery</span></button>`);
        buttons.push(`<button type="button" onclick="openDeliveryStatusModal(${id}, 'DELIVERED')" class="px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-semibold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"><i class="fa-solid fa-shield-check text-[10px]"></i><span>Deliver</span></button>`);
    } else if (s === 'DELIVERED') {
        buttons.push(`<span class="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold text-[11px] border border-emerald-200"><i class="fa-solid fa-circle-check text-emerald-600"></i><span>Drop-off Confirmed</span></span>`);
    }

    if (s !== 'DELIVERED' && s !== 'RETURNED') {
        buttons.push(`<button type="button" onclick="openDeliveryTransportModal(${id})" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer" title="Edit Carrier, Vehicle & Driver Logistics"><i class="fa-solid fa-truck-ramp-box text-xs text-blue-600"></i></button>`);
    }

    buttons.push(`<button type="button" onclick="openDeliveryHistoryModal(${id})" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer" title="Inspect Order Details & Chronological Status History"><i class="fa-solid fa-clock-rotate-left text-xs text-slate-600"></i></button>`);

    return `<div class="flex items-center justify-end flex-wrap gap-1.5">${buttons.join('')}</div>`;
}

/**
 * Renders filtered deliveries into the main deliveries table body
 */
function renderSellerDeliveries() {
    const tbody = document.getElementById("sellerDeliveriesTbody");
    if (!tbody) return;

    const list = getFilteredDeliveries();

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="p-12 text-center text-slate-500">
                    <div class="flex flex-col items-center justify-center space-y-3">
                        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-xl shadow-xs">
                            <i class="fa-solid fa-truck-ramp-box"></i>
                        </div>
                        <div class="space-y-1">
                            <p class="font-bold text-slate-700 text-sm">No shipments found</p>
                            <p class="text-xs text-slate-400 max-w-sm">No deliveries match your current filter or search criteria. Orders will appear here as buyers confirm material requirements.</p>
                        </div>
                        ${deliverySearchQuery || activeDeliveryStatusFilter !== 'all' ? `
                            <button type="button" onclick="filterDeliveriesByStatus('all'); document.getElementById('deliveriesSearchInput').value = ''; handleDeliveriesSearch('');" class="mt-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                                Clear Filters & Search
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(d => {
        let itemsSummary = 'Direct Material Supply';
        if (Array.isArray(d.items) && d.items.length > 0) {
            const first = d.items[0];
            itemsSummary = `${first.materialName || 'Material'} (${first.quantity || 1} ${first.unit || 'units'})`;
            if (d.items.length > 1) {
                itemsSummary += ` +${d.items.length - 1} more`;
            }
        }

        let locSummary = d.city || '';
        if (d.state) locSummary += (locSummary ? ', ' : '') + d.state;
        if (d.pinCode) locSummary += (locSummary ? ' - ' : '') + d.pinCode;
        if (!locSummary && d.deliveryAddress) locSummary = d.deliveryAddress;

        const carrier = d.carrierName || 'Fleet Unassigned';
        const vehicle = d.vehicleNumber ? `<span class="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">${escapeSellerHtml(d.vehicleNumber)}</span>` : '';
        const driver = d.driverName ? `<div class="text-[10px] text-slate-500 truncate max-w-[140px] mt-0.5"><i class="fa-solid fa-user-ninja text-[9px] text-slate-400 mr-1"></i>${escapeSellerHtml(d.driverName)}</div>` : '';

        const etaDisplay = formatExpectedDeliveryDateForDisplay(d.estimatedDeliveryDate);
        let etaHtml = `<span class="text-xs font-semibold text-slate-800">${escapeSellerHtml(etaDisplay || 'Pending schedule')}</span>`;
        if ((d.status || '').toUpperCase() === 'DELAYED') {
            etaHtml += `<div class="text-[10px] font-bold text-rose-600 mt-0.5"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Delay Reported</div>`;
        }

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3.5 align-middle">
                    <div class="font-mono font-bold text-blue-600 text-xs">${escapeSellerHtml(d.trackingNumber || 'TRK-PENDING')}</div>
                    <div class="text-[11px] text-slate-500 font-mono mt-0.5">ORD: ${escapeSellerHtml(d.orderCode || 'ORD-000')}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">${escapeSellerHtml(d.createdAtFormatted || formatSellerProDateTime(d.createdAt))}</div>
                </td>
                <td class="p-3.5 align-middle">
                    <div class="font-bold text-slate-800 text-xs">${escapeSellerHtml(d.buyerName || 'Verified Buyer')}</div>
                    <div class="text-[11px] text-slate-500"><i class="fa-solid fa-phone text-[10px] text-slate-400 mr-1"></i>${escapeSellerHtml(d.contactNumber || 'Via Order')}</div>
                    <div class="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5" title="${escapeSellerHtml(d.deliveryAddress || '')}"><i class="fa-solid fa-location-dot text-[10px] text-slate-400 mr-1"></i>${escapeSellerHtml(locSummary || 'Standard drop-off')}</div>
                </td>
                <td class="p-3.5 align-middle">
                    <div class="font-semibold text-slate-800 text-xs">${escapeSellerHtml(itemsSummary)}</div>
                    <div class="text-xs font-bold text-slate-900 mt-0.5">${formatSellerCurrency(d.totalAmount)}</div>
                </td>
                <td class="p-3.5 align-middle">
                    <div class="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                        <span>${escapeSellerHtml(carrier)}</span>
                        ${vehicle}
                    </div>
                    ${driver}
                    ${d.trackingUrl && d.trackingUrl.startsWith('http') ? `
                        <a href="${escapeSellerHtml(d.trackingUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center space-x-1 text-[10px] text-blue-600 hover:underline mt-0.5 font-semibold">
                            <span>Live Tracking</span>
                            <i class="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
                        </a>
                    ` : ''}
                </td>
                <td class="p-3.5 align-middle">
                    ${etaHtml}
                </td>
                <td class="p-3.5 align-middle">
                    ${getDeliveryStatusBadgeHtml(d.status)}
                </td>
                <td class="p-3.5 align-middle text-right">
                    ${getDeliveryActionButtonsHtml(d)}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Opens delivery status transition confirmation modal
 */
function openDeliveryStatusModal(deliveryId, targetStatus) {
    const d = (sellerDeliveriesCache || []).find(item => String(item.id) === String(deliveryId));
    if (!d) return;

    document.getElementById('statusModalDeliveryId').value = d.id;
    document.getElementById('statusModalTargetStatus').value = targetStatus;
    document.getElementById('statusModalTrackingNumber').textContent = d.trackingNumber || 'TRK-0000';
    document.getElementById('statusModalOrderCode').textContent = d.orderCode || 'ORD-0000';

    const titleElem = document.getElementById('statusModalTitle');
    const subElem = document.getElementById('statusModalSubtitle');
    const badgeElem = document.getElementById('statusModalTargetBadge');
    const iconElem = document.getElementById('statusModalIcon');
    const iconContainer = document.getElementById('statusModalIconContainer');
    const verifSection = document.getElementById('statusModalVerificationSection');
    const verifInput = document.getElementById('deliveryVerificationCodeInput');
    const delaySection = document.getElementById('statusModalDelaySection');
    const notesInput = document.getElementById('statusModalNotes');
    const errBanner = document.getElementById('statusModalError');

    if (errBanner) errBanner.classList.add('hidden');
    if (notesInput) notesInput.value = '';

    badgeElem.className = 'inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold';
    iconContainer.className = 'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base border';

    if (targetStatus === 'READY_TO_DISPATCH') {
        titleElem.textContent = 'Mark Ready for Dispatch';
        subElem.textContent = 'Confirm material packaging and vehicle loading';
        badgeElem.textContent = 'READY FOR DISPATCH';
        badgeElem.classList.add('bg-sky-100', 'text-sky-800');
        iconContainer.classList.add('bg-sky-500/20', 'text-sky-400', 'border-sky-500/30');
        iconElem.className = 'fa-solid fa-boxes-packing';
        verifSection.classList.add('hidden');
        delaySection.classList.add('hidden');
    } else if (targetStatus === 'DISPATCHED') {
        titleElem.textContent = 'Dispatch Material Order';
        subElem.textContent = 'Confirm vehicle has left your warehouse / premises';
        badgeElem.textContent = 'ORDER DISPATCHED';
        badgeElem.classList.add('bg-blue-100', 'text-blue-800');
        iconContainer.classList.add('bg-blue-500/20', 'text-blue-400', 'border-blue-500/30');
        iconElem.className = 'fa-solid fa-truck';
        verifSection.classList.add('hidden');
        delaySection.classList.add('hidden');
    } else if (targetStatus === 'IN_TRANSIT') {
        titleElem.textContent = 'Mark In Transit';
        subElem.textContent = 'Shipment is actively travelling to buyer site';
        badgeElem.textContent = 'IN TRANSIT';
        badgeElem.classList.add('bg-indigo-100', 'text-indigo-800');
        iconContainer.classList.add('bg-indigo-500/20', 'text-indigo-400', 'border-indigo-500/30');
        iconElem.className = 'fa-solid fa-truck-moving';
        verifSection.classList.add('hidden');
        delaySection.classList.add('hidden');
    } else if (targetStatus === 'OUT_FOR_DELIVERY') {
        titleElem.textContent = 'Mark Out for Delivery';
        subElem.textContent = 'Driver is in the vicinity for final unloading';
        badgeElem.textContent = 'OUT FOR DELIVERY';
        badgeElem.classList.add('bg-purple-100', 'text-purple-800');
        iconContainer.classList.add('bg-purple-500/20', 'text-purple-400', 'border-purple-500/30');
        iconElem.className = 'fa-solid fa-truck-fast';
        verifSection.classList.add('hidden');
        delaySection.classList.add('hidden');
    } else if (targetStatus === 'DELIVERED') {
        titleElem.textContent = 'Confirm Order Delivery';
        subElem.textContent = 'Requires recipient delivery verification code';
        badgeElem.textContent = 'DELIVERED (STAGE 4)';
        badgeElem.classList.add('bg-emerald-100', 'text-emerald-800');
        iconContainer.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/30');
        iconElem.className = 'fa-solid fa-shield-check';
        verifSection.classList.remove('hidden');
        delaySection.classList.add('hidden');
        if (verifInput) {
            verifInput.value = '';
            setTimeout(() => verifInput.focus(), 150);
        }
    } else if (targetStatus === 'DELAYED') {
        titleElem.textContent = 'Report Delivery Delay';
        subElem.textContent = 'Notify buyer with an exception reason';
        badgeElem.textContent = 'DELAYED';
        badgeElem.classList.add('bg-rose-100', 'text-rose-800');
        iconContainer.classList.add('bg-rose-500/20', 'text-rose-400', 'border-rose-500/30');
        iconElem.className = 'fa-solid fa-triangle-exclamation';
        verifSection.classList.add('hidden');
        delaySection.classList.remove('hidden');
    }

    openModal('deliveryStatusModal');
}

/**
 * Submits status transition to backend PUT /api/deliveries/{id}/status
 */
async function submitDeliveryStatusTransition() {
    const deliveryId = document.getElementById('statusModalDeliveryId').value;
    const targetStatus = document.getElementById('statusModalTargetStatus').value;
    const notes = document.getElementById('statusModalNotes').value.trim();
    const verifInput = document.getElementById('deliveryVerificationCodeInput');
    const delayReasonSelect = document.getElementById('statusModalDelayReason');
    const errBanner = document.getElementById('statusModalError');
    const errText = document.getElementById('statusModalErrorText');
    const confirmBtn = document.getElementById('statusModalConfirmBtn');
    const spinner = document.getElementById('statusModalSpinner');

    let verificationCode = null;
    let delayReason = null;

    if (targetStatus === 'DELIVERED') {
        verificationCode = (verifInput ? verifInput.value : '').trim();
        if (!verificationCode) {
            if (errBanner && errText) {
                errText.textContent = 'Delivery verification code is mandatory. Please ask the recipient customer for their code.';
                errBanner.classList.remove('hidden');
            }
            if (verifInput) verifInput.focus();
            return;
        }
    }

    if (targetStatus === 'DELAYED') {
        delayReason = (delayReasonSelect ? delayReasonSelect.value : '').trim();
    }

    const payload = {
        status: targetStatus,
        verificationCode: verificationCode || null,
        reason: delayReason || null,
        notes: notes || null
    };

    try {
        if (confirmBtn) confirmBtn.disabled = true;
        if (spinner) spinner.classList.remove('hidden');
        if (errBanner) errBanner.classList.add('hidden');

        const token = getCleanToken();
        const API_BASE_URL = getApiBaseUrl();

        const response = await fetch(`${API_BASE_URL}/api/deliveries/${deliveryId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || `Server rejected transition (HTTP ${response.status})`);
        }

        closeModal('deliveryStatusModal');
        showToast(`Delivery status updated to ${targetStatus}`);
        await loadSellerDeliveries();
        if (typeof loadSellerOrders === 'function') {
            loadSellerOrders().catch(() => {});
        }
    } catch (err) {
        console.error('Delivery status transition error:', err);
        if (errBanner && errText) {
            errText.textContent = err.message || 'Failed to update delivery status.';
            errBanner.classList.remove('hidden');
        }
    } finally {
        if (confirmBtn) confirmBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
    }
}

/**
 * Opens Transport & Logistics Details modal
 */
function openDeliveryTransportModal(deliveryId) {
    const d = (sellerDeliveriesCache || []).find(item => String(item.id) === String(deliveryId));
    if (!d) return;

    document.getElementById('transportModalDeliveryId').value = d.id;
    document.getElementById('transportModalTrackingNumber').textContent = d.trackingNumber || 'TRK-0000';
    document.getElementById('transportModalOrderCode').textContent = d.orderCode || 'ORD-0000';

    document.getElementById('transportCarrierInput').value = d.carrierName || '';
    document.getElementById('transportVehicleInput').value = d.vehicleNumber || '';
    document.getElementById('transportDriverNameInput').value = d.driverName || '';
    document.getElementById('transportDriverPhoneInput').value = d.driverPhone || '';
    document.getElementById('transportTrackingUrlInput').value = d.trackingUrl || '';
    document.getElementById('transportNotesInput').value = d.currentNotes || '';

    const manualDateInput = document.getElementById('transportManualDate');
    const datePicker = document.getElementById('transportDatePicker');
    if (d.estimatedDeliveryDate) {
        const comp = parseExpectedDeliveryDateToComponents(d.estimatedDeliveryDate);
        if (comp) {
            manualDateInput.value = comp.display;
            datePicker.value = comp.iso;
        } else {
            manualDateInput.value = d.estimatedDeliveryDate;
            datePicker.value = '';
        }
    } else {
        manualDateInput.value = '';
        datePicker.value = '';
    }

    const errBanner = document.getElementById('transportModalError');
    if (errBanner) errBanner.classList.add('hidden');

    openModal('deliveryTransportModal');
}

/**
 * Triggers native calendar picker for transport modal
 */
function triggerTransportDatePicker() {
    const picker = document.getElementById('transportDatePicker');
    const manualInput = document.getElementById('transportManualDate');
    if (!picker) return;

    if (manualInput && manualInput.value) {
        const val = validateStrictExpectedDeliveryDate(manualInput.value);
        if (val.valid) {
            picker.value = val.iso;
        }
    }

    if (typeof picker.showPicker === 'function') {
        try {
            picker.showPicker();
            return;
        } catch (e) {}
    }
    picker.focus();
    picker.click();
}

/**
 * Setup two-way sync for Transport Date picker
 */
let _transportModalSyncInitialized = false;
function setupTransportModalSyncListeners() {
    if (_transportModalSyncInitialized) return;
    _transportModalSyncInitialized = true;

    const picker = document.getElementById('transportDatePicker');
    const manualInput = document.getElementById('transportManualDate');
    const errContainer = document.getElementById('transportModalError');

    if (picker && manualInput) {
        picker.addEventListener('change', () => {
            if (picker.value) {
                const parts = picker.value.split('-');
                if (parts.length === 3) {
                    const [y, m, d] = parts;
                    manualInput.value = `${d}/${m}/${y}`;
                    if (errContainer) errContainer.classList.add('hidden');
                }
            }
        });

        manualInput.addEventListener('input', () => {
            if (errContainer) errContainer.classList.add('hidden');
            let v = manualInput.value.replace(/[^\d\/]/g, '');
            if (v.length === 2 && !v.includes('/')) v += '/';
            else if (v.length === 5 && v.split('/').length === 2) v += '/';
            if (v !== manualInput.value) manualInput.value = v;

            if (manualInput.value.length === 10) {
                const val = validateStrictExpectedDeliveryDate(manualInput.value);
                if (val.valid && picker) {
                    picker.value = val.iso;
                }
            }
        });
    }
}

/**
 * Submits transport & logistics updates to PUT /api/deliveries/{id}/details
 */
async function submitDeliveryTransportDetails() {
    const deliveryId = document.getElementById('transportModalDeliveryId').value;
    const carrierName = document.getElementById('transportCarrierInput').value.trim();
    const vehicleNumber = document.getElementById('transportVehicleInput').value.trim();
    const driverName = document.getElementById('transportDriverNameInput').value.trim();
    const driverPhone = document.getElementById('transportDriverPhoneInput').value.trim();
    const trackingUrl = document.getElementById('transportTrackingUrlInput').value.trim();
    const manualDate = document.getElementById('transportManualDate').value.trim();
    const notes = document.getElementById('transportNotesInput').value.trim();

    const errBanner = document.getElementById('transportModalError');
    const errText = document.getElementById('transportModalErrorText');
    const saveBtn = document.getElementById('transportModalSaveBtn');
    const spinner = document.getElementById('transportModalSpinner');

    if (manualDate) {
        const val = validateStrictExpectedDeliveryDate(manualDate);
        if (!val.valid) {
            if (errBanner && errText) {
                errText.textContent = val.error;
                errBanner.classList.remove('hidden');
            }
            return;
        }
    }

    const payload = {
        carrierName: carrierName || null,
        vehicleNumber: vehicleNumber || null,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        trackingUrl: trackingUrl || null,
        estimatedDeliveryDate: manualDate || null,
        currentNotes: notes || null
    };

    try {
        if (saveBtn) saveBtn.disabled = true;
        if (spinner) spinner.classList.remove('hidden');
        if (errBanner) errBanner.classList.add('hidden');

        const token = getCleanToken();
        const API_BASE_URL = getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/api/deliveries/${deliveryId}/details`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.message || errBody.error || `Server returned HTTP ${response.status}`);
        }

        closeModal('deliveryTransportModal');
        showToast('Logistics and transport details updated successfully');
        await loadSellerDeliveries();
    } catch (err) {
        if (errBanner && errText) {
            errText.textContent = err.message || 'Failed to update transport details.';
            errBanner.classList.remove('hidden');
        }
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
    }
}

/**
 * Opens delivery details modal with materials breakdown & chronological status history
 */
async function openDeliveryHistoryModal(deliveryId) {
    const d = (sellerDeliveriesCache || []).find(item => String(item.id) === String(deliveryId));
    if (!d) return;

    setSellerElementText('historyModalTrackingNumber', d.trackingNumber || 'TRK-0000');
    setSellerElementText('historyModalOrderCode', `Order ${d.orderCode || 'ORD-0000'}`);

    const statusBadge = document.getElementById('historyModalStatusBadge');
    if (statusBadge) {
        statusBadge.textContent = d.status || 'PROCESSING';
    }

    setSellerElementText('historyModalCustomerName', d.buyerName || 'Verified Buyer');
    setSellerElementText('historyModalCustomerPhone', d.contactNumber || 'Contact via Order');

    let fullAddr = d.deliveryAddress || 'Delivery Address Provided';
    if (d.projectName) fullAddr = `${d.projectName}, ${fullAddr}`;
    if (d.city || d.state || d.pinCode) {
        const locParts = [d.city, d.state, d.pinCode].filter(Boolean).join(', ');
        fullAddr = `${fullAddr} (${locParts})`;
    }
    setSellerElementText('historyModalDeliveryAddress', fullAddr);

    setSellerElementText('historyModalCarrier', d.carrierName || 'Fleet / Not Assigned');
    setSellerElementText('historyModalVehicle', d.vehicleNumber || 'Unassigned');
    setSellerElementText('historyModalDriver', d.driverName ? `${d.driverName} (${d.driverPhone || 'No Phone'})` : 'Not Assigned');
    setSellerElementText('historyModalEta', formatExpectedDeliveryDateForDisplay(d.estimatedDeliveryDate) || 'Pending Confirmation');

    const trackLinkContainer = document.getElementById('historyModalTrackingLinkContainer');
    const trackLink = document.getElementById('historyModalTrackingLink');
    if (trackLinkContainer && trackLink) {
        if (d.trackingUrl && d.trackingUrl.startsWith('http')) {
            trackLink.href = d.trackingUrl;
            trackLinkContainer.classList.remove('hidden');
        } else {
            trackLinkContainer.classList.add('hidden');
        }
    }

    const editLogisticsBtn = document.getElementById('historyModalUpdateLogisticsBtn');
    if (editLogisticsBtn) {
        editLogisticsBtn.onclick = () => {
            closeModal('deliveryDetailsHistoryModal');
            openDeliveryTransportModal(d.id);
        };
    }

    const itemsTbody = document.getElementById('historyModalItemsTbody');
    if (itemsTbody) {
        if (Array.isArray(d.items) && d.items.length > 0) {
            itemsTbody.innerHTML = d.items.map(i => `
                <tr class="hover:bg-slate-50">
                    <td class="p-2.5 font-semibold text-slate-800">${escapeSellerHtml(i.materialName || 'Material Item')}</td>
                    <td class="p-2.5 text-slate-600">${i.quantity != null ? i.quantity : '1'} ${escapeSellerHtml(i.unit || 'Units')}</td>
                    <td class="p-2.5 text-slate-600">${formatSellerCurrency(i.unitPrice)}</td>
                    <td class="p-2.5 text-right font-bold text-slate-800">${formatSellerCurrency(i.subtotal)}</td>
                </tr>
            `).join('');
        } else {
            itemsTbody.innerHTML = `
                <tr>
                    <td colspan="4" class="p-3 text-center text-slate-500">
                        1 Material Shipment Package • Total Order Value: <span class="font-bold text-slate-800">${formatSellerCurrency(d.totalAmount)}</span>
                    </td>
                </tr>
            `;
        }
    }

    const timelineContainer = document.getElementById('historyModalTimelineContainer');
    if (timelineContainer) {
        timelineContainer.innerHTML = `
            <div class="text-slate-400 py-3 flex items-center space-x-2">
                <i class="fa-solid fa-circle-notch fa-spin text-blue-600"></i>
                <span>Loading chronological audit events...</span>
            </div>
        `;
    }

    openModal('deliveryDetailsHistoryModal');

    try {
        const token = getCleanToken();
        const API_BASE_URL = getApiBaseUrl();
        const res = await fetch(`${API_BASE_URL}/api/deliveries/${d.id}/history`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (res.ok) {
            const historyList = await res.json();
            if (timelineContainer) {
                if (Array.isArray(historyList) && historyList.length > 0) {
                    timelineContainer.innerHTML = historyList.map((h, idx) => {
                        const isLatest = idx === historyList.length - 1;
                        const dotColor = isLatest ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-300';
                        const timeStr = h.changedDateFormatted || formatSellerProDateTime(h.changedAt);
                        const prevStatus = h.previousStatus ? `<span class="text-slate-400">${escapeSellerHtml(h.previousStatus)}</span> &rarr; ` : '';
                        const actorText = h.actorRole ? `Recorded by ${escapeSellerHtml(h.actorRole)}` : 'System event';

                        return `
                            <div class="relative pl-6 pb-2">
                                <span class="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ${dotColor}"></span>
                                <div class="flex items-center justify-between">
                                    <div class="font-bold text-slate-800 text-xs">
                                        ${prevStatus}<span class="text-blue-600">${escapeSellerHtml(h.newStatus)}</span>
                                    </div>
                                    <span class="text-[10px] text-slate-400 font-mono">${escapeSellerHtml(timeStr)}</span>
                                </div>
                                <div class="text-[11px] text-slate-500 mt-0.5">${actorText}</div>
                                ${h.reason ? `<div class="mt-1 p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-[11px]"><i class="fa-solid fa-circle-info mr-1"></i><strong>Reason:</strong> ${escapeSellerHtml(h.reason)}</div>` : ''}
                                ${h.notes ? `<div class="mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px]"><i class="fa-solid fa-note-sticky mr-1 text-slate-400"></i>${escapeSellerHtml(h.notes)}</div>` : ''}
                            </div>
                        `;
                    }).join('');
                } else {
                    timelineContainer.innerHTML = `
                        <div class="text-slate-400 py-2 text-xs">No historical transitions recorded yet for this shipment.</div>
                    `;
                }
            }
        }
    } catch (e) {
        console.warn('Failed to load delivery history:', e);
        if (timelineContainer) {
            timelineContainer.innerHTML = `
                <div class="text-rose-500 py-2 text-xs">Unable to load audit history from server.</div>
            `;
        }
    }
}

// Window global bindings for inline HTML event handlers
window.loadSellerDeliveries = loadSellerDeliveries;
window.filterDeliveriesByStatus = filterDeliveriesByStatus;
window.handleDeliveriesSearch = handleDeliveriesSearch;
window.openDeliveryStatusModal = openDeliveryStatusModal;
window.submitDeliveryStatusTransition = submitDeliveryStatusTransition;
window.openDeliveryTransportModal = openDeliveryTransportModal;
window.submitDeliveryTransportDetails = submitDeliveryTransportDetails;
window.triggerTransportDatePicker = triggerTransportDatePicker;
window.openDeliveryHistoryModal = openDeliveryHistoryModal;

