/**
 * ============================================================================
 * BUILDBID — STANDALONE HIRED PROFESSIONALS MODULE (hired-professionals.js)
 * Clean, modular frontend controller for viewing accepted hired professionals.
 * Strictly consumes authenticated GET /api/hired-professionals.
 * Reusable across Customer, Contractor, and Material Seller requester roles.
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURATION & AUTHENTICATION UTILITIES
// ============================================================================

function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.location) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
  }
  return "https://buildbid-ap3j.onrender.com";
}

const API_BASE_URL = getApiBaseUrl();

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

function getCurrentUser() {
  const storageKeys = ["currentUser", "customerUser", "loggedInUser", "marketplaceUser", "userData"];
  for (const key of storageKeys) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key));
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (e) {}
  }
  return null;
}

function resolveUserRole(user) {
  if (!user) return "";
  if (user.role) {
    return String(user.role).replace("ROLE_", "").toUpperCase();
  }
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const primary = user.roles[0];
    return String(typeof primary === "string" ? primary : primary.name || primary.authority || "")
      .replace("ROLE_", "")
      .toUpperCase();
  }
  return "";
}

function performUnifiedLogout() {
  const keysToRemove = [
    "marketplaceToken", "token", "authToken", "marketplaceUser",
    "currentUser", "customerUser", "loggedInUser", "userData",
    "buildbid_user", "buildbid_current_user"
  ];
  keysToRemove.forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  sessionStorage.clear();
  window.location.href = "index.html";
}

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================

let allHiredProfessionals = [];
let activeUserRole = "CUSTOMER";

// ============================================================================
// 3. INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  const token = getCleanToken();
  if (!token) {
    // Unauthenticated user -> redirect to login
    window.location.href = "index.html";
    return;
  }

  const user = getCurrentUser();
  activeUserRole = resolveUserRole(user) || "CUSTOMER";

  // Check for Professional Role Guard (Section 18)
  if (activeUserRole === "PROFESSIONAL" || activeUserRole === "SERVICE_PROVIDER") {
    renderForbiddenState();
    return;
  }

  // Setup UI shell according to authenticated requester role
  setupRoleBasedShell(user, activeUserRole);

  // Bind event listeners
  bindEventListeners();

  // Fetch verified hired professionals from backend
  fetchHiredProfessionals();
});

// ============================================================================
// 4. ROLE-AWARE SHELL CONFIGURATION
// ============================================================================

function setupRoleBasedShell(user, role) {
  const customerSidebar = document.getElementById("customerSidebar");
  const contractorSidebar = document.getElementById("contractorSidebar");
  const sellerSidebar = document.getElementById("sellerSidebar");
  const universalTopNav = document.getElementById("universalTopNavbar");
  const contractorTopNav = document.getElementById("contractorTopNav");
  const breadcrumbLink = document.getElementById("breadcrumbDashboardLink");
  const brandLogoLink = document.getElementById("brandLogoLink");
  const navUserPill = document.getElementById("navUserPill");
  const navUserName = document.getElementById("navUserName");
  const navUserRole = document.getElementById("navUserRole");
  const navAvatar = document.getElementById("navAvatar");

  let dashboardUrl = "customer dashboard.html";
  let roleDisplayName = "Customer";

  // Hide all sidebars first
  if (customerSidebar) customerSidebar.style.display = "none";
  if (contractorSidebar) contractorSidebar.style.display = "none";
  if (sellerSidebar) sellerSidebar.style.display = "none";

  if (role === "CONTRACTOR") {
    document.body.classList.add("contractor-mode");
    const contractorCss = document.getElementById("contractorDashboardStylesheet");
    if (contractorCss) contractorCss.disabled = false;

    if (universalTopNav) universalTopNav.style.display = "none";
    if (contractorTopNav) contractorTopNav.style.display = "flex";
    if (contractorSidebar) contractorSidebar.style.display = "flex";

    dashboardUrl = "contractor-dashboard.html";
    roleDisplayName = "Contractor";

    // Setup full contractor identity for Contractor top navbar
    if (user) {
      const displayName = (user.name || user.fullName || user.companyName || user.username || 'Contractor').trim();
      const words = displayName.split(' ').filter(Boolean);
      const initials = words.length > 1 ? (words[0][0] + words[words.length - 1][0]) : (words[0] ? words[0][0] : 'C');

      const nameEl = document.getElementById('top-nav-name');
      const badgeEl = document.getElementById('top-nav-badge');
      const avatarEl = document.getElementById('top-nav-avatar-text');

      if (nameEl) nameEl.textContent = displayName;
      if (badgeEl) badgeEl.textContent = 'Verified Contractor';
      if (avatarEl) avatarEl.textContent = initials.toUpperCase();
    }

    // Synchronize contractor sidebar badges immediately & fetch authoritative counts
    syncContractorBadges();

  } else if (role === "MATERIAL_SELLER" || role === "SELLER") {
    if (universalTopNav) universalTopNav.style.display = "flex";
    if (contractorTopNav) contractorTopNav.style.display = "none";
    if (sellerSidebar) sellerSidebar.style.display = "flex";
    dashboardUrl = "seller-dashboard.html";
    roleDisplayName = "Material Seller";

    // Populate user identity in universal top navbar
    if (user) {
      const rawName = user.name || user.fullName || user.username || user.companyName || roleDisplayName;
      const firstName = rawName.split(" ")[0];
      if (navUserName) navUserName.textContent = firstName;
      if (navUserRole) navUserRole.textContent = roleDisplayName;

      const photoUrl = user.profilePhoto || user.avatarUrl || user.profilePhotoUrl || "";
      if (navAvatar && navAvatar.tagName === "IMG") {
        navAvatar.src = photoUrl || `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(rawName)}`;
      }
    }
  } else {
    // Default to Customer
    if (universalTopNav) universalTopNav.style.display = "flex";
    if (contractorTopNav) contractorTopNav.style.display = "none";
    if (customerSidebar) customerSidebar.style.display = "flex";
    dashboardUrl = "customer dashboard.html";
    roleDisplayName = "Customer";

    // Populate user identity in universal top navbar
    if (user) {
      const rawName = user.name || user.fullName || user.username || user.companyName || roleDisplayName;
      const firstName = rawName.split(" ")[0];
      if (navUserName) navUserName.textContent = firstName;
      if (navUserRole) navUserRole.textContent = roleDisplayName;

      const photoUrl = user.profilePhoto || user.avatarUrl || user.profilePhotoUrl || "";
      if (navAvatar && navAvatar.tagName === "IMG") {
        navAvatar.src = photoUrl || `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(rawName)}`;
      }
    }
  }

  // Setup navigation links back to dashboard
  if (breadcrumbLink) {
    breadcrumbLink.href = dashboardUrl;
    breadcrumbLink.textContent = `${roleDisplayName} Dashboard`;
  }
  if (brandLogoLink) {
    brandLogoLink.href = dashboardUrl;
  }
  if (navUserPill) {
    navUserPill.onclick = () => {
      window.location.href = dashboardUrl;
    };
  }

  // Bind logout buttons across all sidebars
  const logoutButtons = [
    document.getElementById("logoutBtn"),
    document.getElementById("contractorLogoutBtn"),
    document.getElementById("sellerLogoutBtn")
  ];
  logoutButtons.forEach(btn => {
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "true";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        performUnifiedLogout();
      });
    }
  });
}

// ============================================================================
// CONTRACTOR SIDEBAR BADGE SYNCHRONIZATION & NOTIFICATIONS
// ============================================================================
function syncContractorBadges() {
  const cachedProjects = sessionStorage.getItem('contractor_badge_projects');
  const cachedBids = sessionStorage.getItem('contractor_badge_bids');
  const cachedContracts = sessionStorage.getItem('contractor_badge_contracts');
  const cachedNotifs = sessionStorage.getItem('contractor_badge_notifications');

  const elProjects = document.getElementById('nav-badge-projects');
  const elBids = document.getElementById('nav-badge-bids');
  const elContracts = document.getElementById('nav-badge-contracts');
  const elNotifs = document.getElementById('nav-badge-notifications');

  if (elProjects && cachedProjects !== null) elProjects.textContent = cachedProjects;
  if (elBids && cachedBids !== null) elBids.textContent = cachedBids;
  if (elContracts && cachedContracts !== null) elContracts.textContent = cachedContracts;
  if (elNotifs && cachedNotifs !== null) elNotifs.textContent = cachedNotifs;

  const token = getCleanToken();
  if (!token) return;

  const authHeaders = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/json'
  };

  fetch(`${API_BASE_URL}/api/contractor/projects`, { headers: authHeaders })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (Array.isArray(data)) {
        if (elProjects) elProjects.textContent = data.length;
        sessionStorage.setItem('contractor_badge_projects', data.length);
      }
    })
    .catch(() => {});

  fetch(`${API_BASE_URL}/api/contractor/my-bids?history=true`, { headers: authHeaders })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (Array.isArray(data)) {
        if (elBids) elBids.textContent = data.length;
        sessionStorage.setItem('contractor_badge_bids', data.length);
      }
    })
    .catch(() => {});

  fetch(`${API_BASE_URL}/api/contractor/my-bids/contracts`, { headers: authHeaders })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (Array.isArray(data)) {
        const activeContracts = data.filter(c => c.assignmentStatus === 'ACTIVE' && c.isCurrent);
        if (elContracts) elContracts.textContent = activeContracts.length;
        sessionStorage.setItem('contractor_badge_contracts', activeContracts.length);
      }
    })
    .catch(() => {});

  fetch(`${API_BASE_URL}/api/notifications`, { headers: authHeaders })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && typeof data.unreadCount === 'number') {
        if (elNotifs) elNotifs.textContent = data.unreadCount;
        sessionStorage.setItem('contractor_badge_notifications', data.unreadCount);
        const dot = document.getElementById('notif-indicator');
        if (dot) dot.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
      }
    })
    .catch(() => {});
}

window.toggleContractorNotifications = function () {
  const dropdown = document.getElementById('contractor-notif-dropdown');
  if (!dropdown) return;
  const isHidden = dropdown.style.display === 'none' || dropdown.classList.contains('hidden');
  if (isHidden) {
    dropdown.style.display = 'block';
    dropdown.classList.remove('hidden');
    loadContractorNotifications();
  } else {
    dropdown.style.display = 'none';
    dropdown.classList.add('hidden');
  }
};

async function loadContractorNotifications() {
  const token = getCleanToken();
  const listEl = document.getElementById('contractor-notifications-list');
  const dotEl = document.getElementById('notif-indicator');
  const badgeEl = document.getElementById('nav-badge-notifications');
  const titleEl = document.getElementById('contractor-notif-title');

  if (!token) {
    if (listEl) listEl.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">Please log in to view notifications</div>';
    if (dotEl) dotEl.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications`, {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      if (listEl) listEl.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">Unable to load notifications</div>';
      return;
    }
    const data = await res.json();
    const notifs = data.notifications || [];
    const unreadCount = data.unreadCount || 0;

    if (dotEl) dotEl.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    if (badgeEl) badgeEl.textContent = unreadCount;
    sessionStorage.setItem('contractor_badge_notifications', unreadCount);
    if (titleEl) titleEl.textContent = `Notifications / सूचनाएं ${unreadCount > 0 ? '(' + unreadCount + ' New)' : ''}`;

    if (!listEl) return;
    if (notifs.length === 0) {
      listEl.innerHTML = '<div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 12px;"><i class="fa-regular fa-bell-slash" style="font-size: 20px; margin-bottom: 6px; display: block; color: #cbd5e1;"></i>No notifications yet / अभी कोई सूचना नहीं है</div>';
      return;
    }
    listEl.innerHTML = notifs.map(n => {
      const isUnread = !n.isRead;
      return `
        <div onclick="handleContractorNotificationClick(${n.id}, '${escapeHTML(n.type || '')}', '${escapeHTML(n.referenceId || '')}', ${isUnread})"
             style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s; ${isUnread ? 'background: #eff6ff;' : ''}">
          <div style="font-size: 12px; font-weight: 600; color: #1e293b;">${escapeHTML(n.title || '')}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHTML(n.message || '')}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    if (listEl) listEl.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">Error loading notifications</div>';
  }
}

window.handleContractorNotificationClick = async function (notifId, type, refId, isUnread) {
  const dropdown = document.getElementById('contractor-notif-dropdown');
  if (dropdown) { dropdown.style.display = 'none'; dropdown.classList.add('hidden'); }
  if (isUnread && notifId) {
    try {
      const token = getCleanToken();
      await fetch(`${API_BASE_URL}/api/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      loadContractorNotifications();
    } catch (e) {}
  }
  const t = (type || '').toUpperCase();
  if (t.includes('ORDER') || t.includes('DIRECT_BUY')) {
    window.location.href = 'my-orders.html';
  } else if (t.includes('BID') || t.includes('PROJECT')) {
    window.location.href = 'contractor-projects.html';
  }
};

window.markAllContractorNotificationsRead = async function () {
  const token = getCleanToken();
  if (!token) return;
  try {
    await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    loadContractorNotifications();
  } catch (e) {}
};

function performUnifiedLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('authToken');
  localStorage.removeItem('marketplaceToken');
  localStorage.removeItem('customerUser');
  localStorage.removeItem('buildbid_user');
  localStorage.removeItem('buildbid_current_user');
  sessionStorage.clear();
  window.location.href = 'index.html';
}
window.performUnifiedLogout = performUnifiedLogout;
window.logoutUser = performUnifiedLogout;

function renderForbiddenState() {
  const workspaceView = document.getElementById("hiredWorkspaceView");
  const forbiddenState = document.getElementById("hiredForbiddenState");
  if (workspaceView) workspaceView.style.display = "none";
  if (forbiddenState) forbiddenState.style.display = "block";
}

// ============================================================================
// 5. EVENT LISTENERS
// ============================================================================

function bindEventListeners() {
  // Live search input
  const searchInput = document.getElementById("hiredSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      applyFiltersAndRender();
    });
  }

  // Status filter dropdown
  const statusFilter = document.getElementById("hiredStatusFilter");
  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      applyFiltersAndRender();
    });
  }

  // Reset filters button
  const resetBtn = document.getElementById("btnResetHiredFilters");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "ALL";
      applyFiltersAndRender();
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById("btnRefreshList");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", (e) => {
      e.preventDefault();
      fetchHiredProfessionals();
    });
  }

  // Retry button in error state
  const retryBtn = document.getElementById("btnRetryFetch");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      fetchHiredProfessionals();
    });
  }

  // Modal close triggers
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalFooterCloseBtn = document.getElementById("modalFooterCloseBtn");
  const modalBackdrop = document.getElementById("hiredDetailsModal");

  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeDetailsModal);
  if (modalFooterCloseBtn) modalFooterCloseBtn.addEventListener("click", closeDetailsModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) {
        closeDetailsModal();
      }
    });
  }

  // Escape key to dismiss modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDetailsModal();
    }
  });

  // Toast close trigger
  const toastCloseBtn = document.getElementById("toastCloseBtn");
  if (toastCloseBtn) {
    toastCloseBtn.addEventListener("click", () => {
      const toast = document.getElementById("globalToast");
      if (toast) toast.classList.remove("show");
    });
  }
}

// ============================================================================
// 6. BACKEND API INTEGRATION (GET /api/hired-professionals)
// ============================================================================

async function fetchHiredProfessionals() {
  const token = getCleanToken();
  if (!token) {
    showErrorState("Session Expired", "Please log in again to view your hired professionals.", true);
    return;
  }

  setViewState("LOADING");

  try {
    const response = await fetch(`${API_BASE_URL}/api/hired-professionals`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    });

    if (response.status === 401) {
      showErrorState("Session Expired", "Your session has expired. Please log in again to continue.", true);
      return;
    }

    if (response.status === 403) {
      renderForbiddenState();
      return;
    }

    if (!response.ok) {
      showErrorState(
        "Unable to Load Hired Professionals",
        `Server returned error status (${response.status}). Please try again later.`,
        false
      );
      return;
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      showErrorState(
        "Unexpected Server Response",
        "The system received malformed data from the server. Please contact support.",
        false
      );
      return;
    }

    allHiredProfessionals = data;
    updateSummaryMetrics(allHiredProfessionals);
    applyFiltersAndRender();

  } catch (error) {
    console.error("Failed to fetch hired professionals:", error);
    showErrorState(
      "Network Connection Issue",
      "Could not reach the BuildBid server. Please check your internet connection and retry.",
      false
    );
  }
}

// ============================================================================
// 7. SUMMARY METRICS CALCULATION
// ============================================================================

function updateSummaryMetrics(list) {
  const metricTotalHired = document.getElementById("metricTotalHired");
  const metricActiveHired = document.getElementById("metricActiveHired");
  const metricTotalServices = document.getElementById("metricTotalServices");

  const total = list.length;
  const active = list.filter(item => (item.status || "").toUpperCase() === "ACTIVE").length;

  const distinctServices = new Set();
  list.forEach(item => {
    if (item.service) distinctServices.add(item.service.trim().toLowerCase());
    else if (item.serviceType) distinctServices.add(item.serviceType.trim().toLowerCase());
  });

  if (metricTotalHired) metricTotalHired.textContent = total;
  if (metricActiveHired) metricActiveHired.textContent = active;
  if (metricTotalServices) metricTotalServices.textContent = distinctServices.size;
}

// ============================================================================
// 8. FILTERING & RENDERING ENGINE
// ============================================================================

function applyFiltersAndRender() {
  const searchInput = document.getElementById("hiredSearchInput");
  const statusFilter = document.getElementById("hiredStatusFilter");

  const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
  const selectedStatus = statusFilter ? statusFilter.value : "ALL";

  const filtered = allHiredProfessionals.filter(item => {
    // Status filter
    if (selectedStatus !== "ALL") {
      const itemStatus = (item.status || "").toUpperCase();
      if (itemStatus !== selectedStatus) return false;
    }

    // Search query
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

  // Update results counter
  const resultsCount = document.getElementById("hiredResultsCount");
  if (resultsCount) {
    resultsCount.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${allHiredProfessionals.length}</strong> hired professionals`;
  }

  // Check empty state
  if (allHiredProfessionals.length === 0) {
    setViewState("EMPTY");
    return;
  }

  if (filtered.length === 0) {
    renderNoSearchResults();
    return;
  }

  // Render cards
  setViewState("CONTENT");
  renderCards(filtered);
}

function renderCards(list) {
  const grid = document.getElementById("hiredCardsGrid");
  if (!grid) return;

  grid.innerHTML = list.map(item => createCardHtml(item)).join("");
}

function createCardHtml(item) {
  const proName = escapeHTML(item.professionalName || "Professional Specialist");
  const hiringId = escapeHTML(item.hiringId || item.requestId || "HIRE-N/A");
  const requestId = escapeHTML(item.requestId || "REQ-N/A");
  const roleDisplay = escapeHTML(formatRoleAndType(item.professionalRole, item.serviceType));
  const service = escapeHTML(item.service || item.serviceType || "Construction Service");
  const location = escapeHTML(item.location || "Location on Request");
  const dateFormatted = formatDate(item.hiringDate);
  const budgetFormatted = item.agreedBudget != null ? formatCurrency(item.agreedBudget) : "Quote Agreed";
  const scopeSnippet = escapeHTML(item.projectScope || "Direct hire engagement for specialized engineering & site execution.");
  const phone = item.phone ? escapeHTML(item.phone) : "";

  const hiredViaDisplay = formatHiredVia(item.hiredVia);

  // Profile photo with fallback
  const photoUrl = item.profilePhotoUrl ? escapeHTML(item.profilePhotoUrl) : "";
  const avatarHtml = photoUrl
    ? `<img src="${photoUrl}" alt="${proName}" class="pro-avatar-img" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(item.professionalName || 'Pro')}'">`
    : `<div class="pro-avatar-fallback">${getInitials(item.professionalName || "Pro")}</div>`;

  return `
    <article class="hired-card" id="card-${hiringId}" data-pro-user-id="${item.professionalUserId || ''}">
      <!-- Card Header -->
      <div class="card-header-bar">
        <div class="card-header-left">
          <span class="badge-hired-via">
            <i class="fa-solid fa-user-check"></i> ${escapeHTML(hiredViaDisplay)}
          </span>
          <span class="badge-id" title="Hiring ID: ${hiringId}">#${hiringId}</span>
        </div>
        <span class="badge-status active">
          <span class="status-dot"></span> ACTIVE
        </span>
      </div>

      <!-- Card Body -->
      <div class="card-body-content">
        <!-- Professional Row -->
        <div class="pro-profile-row">
          <div class="pro-avatar-box">
            ${avatarHtml}
          </div>
          <div class="pro-details-col">
            <h3 class="pro-name" title="${proName}">
              ${proName}
              <i class="fa-solid fa-circle-check verified-icon" title="BuildBid Verified Professional"></i>
            </h3>
            <span class="pro-role-type">${roleDisplay}</span>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="card-info-grid">
          <div class="info-item">
            <span class="info-item-label">
              <i class="fa-solid fa-screwdriver-wrench"></i> Service
            </span>
            <span class="info-item-value" title="${service}">${service}</span>
          </div>

          <div class="info-item">
            <span class="info-item-label">
              <i class="fa-solid fa-location-dot"></i> Location
            </span>
            <span class="info-item-value" title="${location}">${location}</span>
          </div>

          <div class="info-item">
            <span class="info-item-label">
              <i class="fa-regular fa-calendar"></i> Hired Date
            </span>
            <span class="info-item-value">${dateFormatted}</span>
          </div>

          <div class="info-item">
            <span class="info-item-label">
              <i class="fa-solid fa-indian-rupee-sign"></i> Agreed Budget
            </span>
            <span class="info-item-value budget">${budgetFormatted}</span>
          </div>
        </div>

        <!-- Scope Preview -->
        <div class="card-scope-box">
          <span class="scope-label">Project / Work Scope:</span>
          <p class="scope-text">${scopeSnippet}</p>
        </div>
      </div>

      <!-- Card Footer Actions -->
      <div class="card-actions-bar">
        <button type="button" class="btn-card-details" onclick="openDetailsModal('${hiringId}')">
          <i class="fa-regular fa-eye"></i> View Full Details
        </button>
        ${phone ? `
          <a href="tel:${phone}" class="btn-card-contact" title="Direct Phone Call: ${phone}">
            <i class="fa-solid fa-phone"></i>
          </a>
        ` : ""}
      </div>
    </article>
  `;
}

function renderNoSearchResults() {
  setViewState("CONTENT");
  const grid = document.getElementById("hiredCardsGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="state-container" style="grid-column: 1 / -1; padding: 40px 20px;">
      <div class="state-icon-box loading" style="background:#f8fafc; color:#64748b;">
        <i class="fa-solid fa-filter-circle-xmark"></i>
      </div>
      <h3 class="state-title">No Matching Hired Professionals</h3>
      <p class="state-description">No hired professionals match your current search and filter criteria. Try clearing your filters.</p>
      <button type="button" class="btn-state-action primary" onclick="document.getElementById('btnResetHiredFilters').click()">
        <i class="fa-solid fa-rotate-left"></i> Reset Filters
      </button>
    </div>
  `;
}

// ============================================================================
// 9. DETAILS MODAL ENGINE
// ============================================================================

function openDetailsModal(hiringId) {
  const item = allHiredProfessionals.find(p => 
    String(p.hiringId) === String(hiringId) || String(p.requestId) === String(hiringId)
  );
  if (!item) {
    showToast("Professional hiring record could not be found.", true);
    return;
  }

  const proName = escapeHTML(item.professionalName || "Professional Specialist");
  const proRole = escapeHTML(formatRoleAndType(item.professionalRole, item.serviceType));
  const service = escapeHTML(item.service || "Specialized Service");
  const serviceType = escapeHTML(item.serviceType || item.service || "General");
  const location = escapeHTML(item.location || "Location on Request");
  const budget = item.agreedBudget != null ? formatCurrency(item.agreedBudget) : "Direct Quote Agreed";
  const dateStr = formatDateTime(item.hiringDate);
  const scope = escapeHTML(item.projectScope || "Direct hire engagement for specialized engineering & site execution.");
  const phone = item.phone ? escapeHTML(item.phone) : "Not Provided";
  const email = item.email ? escapeHTML(item.email) : "Not Provided";
  const hId = escapeHTML(item.hiringId || item.requestId || "HIRE-N/A");
  const rId = escapeHTML(item.requestId || "REQ-N/A");

  // Populate avatar
  const avatarWrap = document.getElementById("modalProAvatarWrap");
  if (avatarWrap) {
    if (item.profilePhotoUrl) {
      avatarWrap.innerHTML = `
        <img src="${escapeHTML(item.profilePhotoUrl)}" alt="${proName}" class="modal-pro-avatar" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(item.professionalName || 'Pro')}'">
      `;
    } else {
      avatarWrap.innerHTML = `
        <div class="modal-pro-avatar-fallback">${getInitials(item.professionalName || "Pro")}</div>
      `;
    }
  }

  // Populate text fields
  setElementText("modalProName", proName);
  setElementText("modalProRole", proRole);
  setElementText("modalHiringId", `#${hId}`);
  setElementText("modalRequestId", `#${rId}`);
  setElementText("modalServiceType", serviceType);
  setElementText("modalService", service);
  setElementText("modalAgreedBudget", budget);
  setElementText("modalLocation", location);
  setElementText("modalHiringDate", dateStr);
  setElementText("modalProjectScope", scope);

  const hiredVia = formatHiredVia(item.hiredVia);
  const hiredViaBadge = document.getElementById("modalHiredViaBadge");
  if (hiredViaBadge) {
    hiredViaBadge.innerHTML = `<i class="fa-solid fa-user-check"></i> ${escapeHTML(hiredVia)}`;
  }

  // Phone element
  const phoneEl = document.getElementById("modalPhone");
  if (phoneEl) {
    if (item.phone) {
      phoneEl.innerHTML = `<a href="tel:${escapeHTML(item.phone)}"><i class="fa-solid fa-phone"></i> ${escapeHTML(item.phone)}</a>`;
    } else {
      phoneEl.textContent = "Not Provided";
    }
  }

  // Email element
  const emailEl = document.getElementById("modalEmail");
  if (emailEl) {
    if (item.email) {
      emailEl.innerHTML = `<a href="mailto:${escapeHTML(item.email)}"><i class="fa-regular fa-envelope"></i> ${escapeHTML(item.email)}</a>`;
    } else {
      emailEl.textContent = "Not Provided";
    }
  }

  // Show modal with transition
  const modal = document.getElementById("hiredDetailsModal");
  if (modal) {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
}

function closeDetailsModal() {
  const modal = document.getElementById("hiredDetailsModal");
  if (modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }
}

// ============================================================================
// 10. VIEW STATE MANAGEMENT & FEEDBACK
// ============================================================================

function setViewState(state) {
  const loading = document.getElementById("hiredLoadingState");
  const error = document.getElementById("hiredErrorState");
  const empty = document.getElementById("hiredEmptyState");
  const grid = document.getElementById("hiredCardsGrid");

  if (loading) loading.style.display = state === "LOADING" ? "block" : "none";
  if (error) error.style.display = state === "ERROR" ? "block" : "none";
  if (empty) empty.style.display = state === "EMPTY" ? "block" : "none";
  if (grid) grid.style.display = state === "CONTENT" ? "grid" : "none";
}

function showErrorState(title, message, isSessionError) {
  setViewState("ERROR");
  const titleEl = document.getElementById("hiredErrorTitle");
  const msgEl = document.getElementById("hiredErrorMessage");
  const retryBtn = document.getElementById("btnRetryFetch");

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  if (retryBtn) {
    if (isSessionError) {
      retryBtn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Log In Again`;
      retryBtn.onclick = () => { window.location.href = "index.html"; };
    } else {
      retryBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Retry Now`;
      retryBtn.onclick = () => { fetchHiredProfessionals(); };
    }
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById("globalToast");
  const icon = document.getElementById("toastIcon");
  const title = document.getElementById("toastTitle");
  const msg = document.getElementById("toastMessage");

  if (!toast) return;

  if (icon) {
    icon.innerHTML = isError
      ? `<i class="fa-solid fa-circle-exclamation" style="color:#ef4444;"></i>`
      : `<i class="fa-solid fa-circle-check" style="color:#10b981;"></i>`;
  }
  if (title) title.textContent = isError ? "Attention" : "Notification";
  if (msg) msg.textContent = message;

  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

// ============================================================================
// 11. FORMATTING & STRING UTILITIES
// ============================================================================

function formatRoleAndType(role, type) {
  const cleanRole = (role || "Professional").replace("ROLE_", "").toLowerCase();
  const capRole = cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1);
  if (!type) return capRole;
  return `${capRole} • ${type}`;
}

function formatHiredVia(hiredVia) {
  if (!hiredVia) return "Direct Hire";
  if (hiredVia === "DIRECT_HIRE") return "Direct Hire";
  return String(hiredVia).replace(/_/g, " ");
}

function formatDate(dateStr) {
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

function formatDateTime(dateStr) {
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

function formatCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num)) return "Quote Agreed";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(num);
}

function getInitials(name) {
  if (!name) return "P";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function escapeHTML(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setElementText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text;
}
