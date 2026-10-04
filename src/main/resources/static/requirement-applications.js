/**
 * ============================================================================
 * BUILDBID — POST REQUIREMENT APPLICATION REVIEW & MULTI-HIRING MODULE
 * requirement-applications.js
 * 
 * Secure, backend-authoritative controller for reviewing professional
 * applications and quotations grouped trade-wise under a single Post Requirement.
 * 
 * Supports Requester roles: CUSTOMER, CONTRACTOR, MATERIAL_SELLER.
 * Strictly uses authenticated Step 7 REST APIs:
 * - GET   /api/requester/requirements/{projectId}/applications
 * - PATCH /api/requester/applications/{applicationId}/status
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURATION & AUTH UTILITIES
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

let activeProjectId = "";
let currentProject = null;
let allUserProjects = [];
let allApplications = [];
let tradeQuotas = []; // [{ tradeRole, requiredQuantity, acceptedQuantity, remainingQuantity, isFilled, applications: [] }]
let selectedTradeFilter = "ALL"; // "ALL" or specific trade string
let selectedStatusFilter = "ALL";
let searchQuery = "";
let sortOrder = "NEWEST";
let isSubmittingAction = false;
let pendingRejectApplicationId = null;

// ============================================================================
// 3. INITIALIZATION & ROLE DETECTION
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const token = getCleanToken();
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const user = getCurrentUser();
  const role = resolveUserRole(user) || "CUSTOMER";

  // Professional Role Guard: PROFESSIONAL is NOT a requester (Section 6, 31)
  if (role === "PROFESSIONAL" || role === "SERVICE_PROVIDER") {
    renderForbiddenState("Access denied. Professionals cannot review requester applications. Please log in as a Customer, Contractor, or Material Seller.");
    return;
  }

  setupRoleBasedShell(user, role);

  // Parse target projectId from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get("projectId") || urlParams.get("id");

  await initializeRequesterDashboard(targetId);
});

function setupRoleBasedShell(user, role) {
  // Update Top Nav user profile pill
  const nameElem = document.getElementById("navUserName");
  const roleElem = document.getElementById("navUserRole");
  const avatarElem = document.getElementById("navAvatar");

  const displayName = user ? (user.name || user.fullName || user.username || user.companyName || "Requester") : "Requester";
  if (nameElem) nameElem.textContent = displayName;
  if (roleElem) roleElem.textContent = role;
  if (avatarElem) {
    avatarElem.src = `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(displayName)}`;
  }

  // Update Breadcrumb links based on role
  const bcHome = document.getElementById("breadcrumbHomeLink");
  const bcProj = document.getElementById("breadcrumbProjectsLink");
  const postReqBtn = document.getElementById("btnPostRequirementLink");

  // Show only the relevant role sidebar
  const customerSidebar = document.getElementById("customerSidebar");
  const contractorSidebar = document.getElementById("contractorSidebar");
  const sellerSidebar = document.getElementById("sellerSidebar");

  if (customerSidebar) customerSidebar.style.display = "none";
  if (contractorSidebar) contractorSidebar.style.display = "none";
  if (sellerSidebar) sellerSidebar.style.display = "none";

  if (role === "CONTRACTOR") {
    if (contractorSidebar) contractorSidebar.style.display = "block";
    if (bcHome) bcHome.href = "contractor-dashboard.html";
    if (bcProj) bcProj.href = "contractor-projects.html";
    if (postReqBtn) postReqBtn.href = "contractor-post-requirement.html";
  } else if (role === "MATERIAL_SELLER") {
    if (sellerSidebar) sellerSidebar.style.display = "block";
    if (bcHome) bcHome.href = "seller-dashboard.html";
    if (bcProj) bcProj.href = "seller-dashboard.html#requests";
    if (postReqBtn) postReqBtn.href = "post-requirements.html";
  } else {
    // Default: CUSTOMER
    if (customerSidebar) customerSidebar.style.display = "block";
    if (bcHome) bcHome.href = "customer dashboard.html";
    if (bcProj) bcProj.href = "customer projects.html";
    if (postReqBtn) postReqBtn.href = "post-requirements.html";
  }
}

// ============================================================================
// 4. DATA LOADING ENGINE
// ============================================================================

async function initializeRequesterDashboard(targetId) {
  showLoading(true, "Loading your project requirements...");

  try {
    const token = getCleanToken();
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    // 1. Fetch all projects owned by the authenticated requester
    let projectsResponse = await fetch(`${API_BASE_URL}/api/customer/projects`, { headers }).catch(() => null);
    if (!projectsResponse || !projectsResponse.ok) {
      projectsResponse = await fetch(`${API_BASE_URL}/api/projects`, { headers }).catch(() => null);
    }

    if (projectsResponse && projectsResponse.ok) {
      const data = await projectsResponse.json();
      allUserProjects = Array.isArray(data) ? data : [];
    } else if (projectsResponse && projectsResponse.status === 401) {
      renderSessionExpiredState();
      return;
    } else {
      allUserProjects = [];
    }

    // Populate the Requirement Switcher dropdown
    populateRequirementSelector(allUserProjects, targetId);

    // Determine target project ID
    let effectiveId = targetId;
    if (!effectiveId && allUserProjects.length > 0) {
      // Pick first project, favoring HIRE requirements
      const hireProj = allUserProjects.find(p => (p.projectId && String(p.projectId).startsWith("HIRE-")) ||
                                                 (p.completeDataJson && String(p.completeDataJson).includes("requestedProfessionals")));
      effectiveId = hireProj ? (hireProj.projectId || hireProj.id) : (allUserProjects[0].projectId || allUserProjects[0].id);
    }

    if (!effectiveId) {
      showLoading(false);
      renderEmptyRequesterState();
      return;
    }

    activeProjectId = String(effectiveId).trim();
    await loadRequirementAndApplications(activeProjectId);

  } catch (err) {
    console.error("Failed to initialize dashboard:", err);
    showLoading(false);
    renderErrorState("Unable to connect to the server. Please check your network and refresh.");
  }
}

function populateRequirementSelector(projects, currentSelectedId) {
  const selectElem = document.getElementById("requirementProjectSelect");
  if (!selectElem) return;

  selectElem.innerHTML = "";

  if (!projects || projects.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No requirements found";
    opt.disabled = true;
    opt.selected = true;
    selectElem.appendChild(opt);
    return;
  }

  projects.forEach(p => {
    const id = p.projectId || p.id || "";
    const title = p.projectTitle || p.title || "Requirement";
    const type = p.projectType || p.type || "General";
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${title} (${id}) — ${type}`;
    if (String(id).toLowerCase() === String(currentSelectedId).toLowerCase()) {
      opt.selected = true;
    }
    selectElem.appendChild(opt);
  });
}

function onRequirementChanged(newProjectId) {
  if (!newProjectId || newProjectId === activeProjectId) return;
  activeProjectId = newProjectId;
  // Update browser URL without reloading page
  const url = new URL(window.location);
  url.searchParams.set("projectId", newProjectId);
  window.history.pushState({}, "", url);

  loadRequirementAndApplications(activeProjectId);
}

async function loadRequirementAndApplications(projectId) {
  showLoading(true, "Fetching requirement quotations...");
  hideAlert();

  const token = getCleanToken();
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  try {
    // 1. Fetch project entity details
    let projRes = await fetch(`${API_BASE_URL}/api/customer/projects/${encodeURIComponent(projectId)}`, { headers }).catch(() => null);
    if (!projRes || !projRes.ok) {
      projRes = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`, { headers }).catch(() => null);
    }

    if (projRes) {
      if (projRes.status === 401) {
        showLoading(false);
        renderSessionExpiredState();
        return;
      }
      if (projRes.status === 403) {
        showLoading(false);
        renderForbiddenState("You don't have permission to view these requirement applications.");
        return;
      }
      if (projRes.status === 404) {
        showLoading(false);
        renderNotFoundState("Requirement not found. The project may have been removed or does not exist.");
        return;
      }
      if (projRes.ok) {
        currentProject = await projRes.json();
      }
    }

    // 2. Fetch applications using Step 7 Requester API
    const appsRes = await fetch(`${API_BASE_URL}/api/requester/requirements/${encodeURIComponent(projectId)}/applications`, {
      method: "GET",
      headers
    });

    if (appsRes.status === 401) {
      showLoading(false);
      renderSessionExpiredState();
      return;
    }
    if (appsRes.status === 403) {
      showLoading(false);
      renderForbiddenState("You don't have permission to view applications for this requirement.");
      return;
    }
    if (appsRes.status === 404) {
      showLoading(false);
      renderNotFoundState("Requirement not found on server.");
      return;
    }
    if (!appsRes.ok) {
      const errData = await appsRes.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned ${appsRes.status}`);
    }

    const appsData = await appsRes.json();
    allApplications = Array.isArray(appsData) ? appsData : [];

    // 3. Extract trade requirements and compute independent trade quotas
    computeTradeQuotasAndSummaries();

    // 4. Render UI components
    renderProjectSummary();
    renderTradeQuotaCards();
    renderApplicationsGrid();

    showLoading(false);

  } catch (err) {
    console.error("Failed to load requirement applications:", err);
    showLoading(false);
    renderErrorState("Failed to load applications: " + (err.message || "Unknown error"));
  }
}

// ============================================================================
// 5. TRADE QUOTAS COMPUTATION & DERIVATION (SECTION 2, 7, 11, 12)
// ============================================================================

function normalizeTrade(role) {
  if (!role) return "GENERAL";
  return String(role).trim().toUpperCase();
}

function computeTradeQuotasAndSummaries() {
  const tradeMap = new Map();

  // 1. Primary: Extract trades from project completeDataJson.requestedProfessionals
  if (currentProject && currentProject.completeDataJson) {
    try {
      const completeData = typeof currentProject.completeDataJson === "string" 
        ? JSON.parse(currentProject.completeDataJson) 
        : currentProject.completeDataJson;

      if (Array.isArray(completeData.requestedProfessionals)) {
        completeData.requestedProfessionals.forEach(item => {
          let role = item.role || "";
          if (role.toLowerCase() === "other" && item.customRole) {
            role = item.customRole;
          }
          if (!role && item.customRole) role = item.customRole;
          if (!role) role = "General Construction";

          const qty = Math.max(1, parseInt(item.quantity) || 1);
          const norm = normalizeTrade(role);

          if (!tradeMap.has(norm)) {
            tradeMap.set(norm, {
              tradeRole: role.trim(),
              normalizedTrade: norm,
              requiredQuantity: qty,
              acceptedQuantity: 0,
              remainingQuantity: qty,
              isFilled: false,
              applications: []
            });
          } else {
            tradeMap.get(norm).requiredQuantity += qty;
          }
        });
      }
    } catch (e) {}
  }

  // 2. Secondary: Fallback to project.requirements map
  if (tradeMap.size === 0 && currentProject && currentProject.requirements) {
    const reqs = currentProject.requirements;
    for (const [key, val] of Object.entries(reqs)) {
      if (val === true && key && key.trim().length > 0) {
        const norm = normalizeTrade(key);
        if (!tradeMap.has(norm)) {
          tradeMap.set(norm, {
            tradeRole: key.trim(),
            normalizedTrade: norm,
            requiredQuantity: 1,
            acceptedQuantity: 0,
            remainingQuantity: 1,
            isFilled: false,
            applications: []
          });
        }
      }
    }
  }

  // 3. Tertiary: Any trade appearing in applications that wasn't declared
  allApplications.forEach(app => {
    const role = app.tradeRole || "General Construction";
    const norm = normalizeTrade(role);
    if (!tradeMap.has(norm)) {
      tradeMap.set(norm, {
        tradeRole: role.trim(),
        normalizedTrade: norm,
        requiredQuantity: 1,
        acceptedQuantity: 0,
        remainingQuantity: 1,
        isFilled: false,
        applications: []
      });
    }
  });

  // 4. Default if still completely empty
  if (tradeMap.size === 0) {
    const defaultRole = (currentProject && (currentProject.projectType || currentProject.type)) || "General Construction";
    const norm = normalizeTrade(defaultRole);
    tradeMap.set(norm, {
      tradeRole: defaultRole,
      normalizedTrade: norm,
      requiredQuantity: 1,
      acceptedQuantity: 0,
      remainingQuantity: 1,
      isFilled: false,
      applications: []
    });
  }

  // 5. Match applications to trades and compute counts
  allApplications.forEach(app => {
    const norm = normalizeTrade(app.tradeRole);
    let targetQuota = tradeMap.get(norm);
    if (!targetQuota) {
      // Find loose match
      for (const [k, v] of tradeMap.entries()) {
        if (norm.includes(k) || k.includes(norm)) {
          targetQuota = v;
          break;
        }
      }
    }
    if (targetQuota) {
      targetQuota.applications.push(app);
      if (app.status === "ACCEPTED") {
        targetQuota.acceptedQuantity += 1;
      }
    }
  });

  // 6. Calculate remaining & filled status independently per trade
  tradeQuotas = Array.from(tradeMap.values()).map(t => {
    const remaining = Math.max(0, t.requiredQuantity - t.acceptedQuantity);
    return {
      ...t,
      remainingQuantity: remaining,
      isFilled: remaining === 0
    };
  });
}

// ============================================================================
// 6. UI RENDERING ENGINES
// ============================================================================

function renderProjectSummary() {
  const p = currentProject;
  if (!p) return;

  const idBadge = document.getElementById("summaryProjectIdBadge");
  const statusBadge = document.getElementById("summaryProjectStatusBadge");
  const catPill = document.getElementById("summaryCategoryPill");
  const titleEl = document.getElementById("summaryProjectTitle");
  const locEl = document.getElementById("summaryLocation");
  const startEl = document.getElementById("summaryStartDate");
  const tradesCountEl = document.getElementById("summaryTotalTrades");
  const hiringProgressEl = document.getElementById("summaryHiringProgress");
  const descEl = document.getElementById("summaryDescription");
  const progressFraction = document.getElementById("overallProgressFraction");
  const progressBar = document.getElementById("overallProgressBar");

  const displayId = p.projectId ? `#${p.projectId}` : `#PRJ-${p.id}`;
  if (idBadge) idBadge.textContent = displayId;

  if (titleEl) titleEl.textContent = p.projectTitle || p.title || "Project Requirement";
  if (catPill) catPill.textContent = p.projectType || p.type || "Requirement";

  const status = String(p.status || "OPEN").toUpperCase();
  if (statusBadge) {
    statusBadge.textContent = status;
    statusBadge.className = `req-status-pill ${status === "OPEN" ? "status-open" : (status.includes("FILL") ? "status-filled" : "status-closed")}`;
  }

  // Location formatting
  let locText = p.city ? `${p.city}${p.state ? ", " + p.state : ""}` : (p.location || "Not specified");
  if (p.pincode && !locText.includes(p.pincode)) locText += ` ${p.pincode}`;
  if (locEl) locEl.textContent = locText;

  // Start Date
  const dateVal = p.targetStartDate || p.timeline || p.startDate || "Immediate / Not specified";
  if (startEl) startEl.textContent = dateVal;

  // Overall totals
  let totalRequired = 0;
  let totalAccepted = 0;
  tradeQuotas.forEach(t => {
    totalRequired += t.requiredQuantity;
    totalAccepted += t.acceptedQuantity;
  });

  if (tradesCountEl) tradesCountEl.textContent = `${tradeQuotas.length} ${tradeQuotas.length === 1 ? 'Trade' : 'Trades'}`;
  if (hiringProgressEl) hiringProgressEl.textContent = `${totalAccepted} / ${totalRequired} Accepted`;

  if (descEl) {
    const rawDesc = p.description || p.projectDescription || p.scopeOfWork || "";
    descEl.textContent = rawDesc.trim().length > 0 ? rawDesc : "No additional description provided.";
  }

  // Progress Bar
  const pct = totalRequired > 0 ? Math.min(100, Math.round((totalAccepted / totalRequired) * 100)) : 0;
  if (progressFraction) progressFraction.textContent = `${totalAccepted} of ${totalRequired} positions filled (${pct}%)`;
  if (progressBar) progressBar.style.width = `${pct}%`;
}

function getTradeIcon(tradeName) {
  const norm = String(tradeName || "").toLowerCase();
  if (norm.includes("labour") || norm.includes("labor") || norm.includes("worker") || norm.includes("helper")) {
    return "fa-person-digging";
  }
  if (norm.includes("engineer") || norm.includes("civil")) {
    return "fa-user-graduate";
  }
  if (norm.includes("electric")) {
    return "fa-bolt";
  }
  if (norm.includes("plumb")) {
    return "fa-faucet-drip";
  }
  if (norm.includes("paint")) {
    return "fa-paint-roller";
  }
  if (norm.includes("mason")) {
    return "fa-trowel-bricks";
  }
  if (norm.includes("architect")) {
    return "fa-compass-drafting";
  }
  if (norm.includes("interior") || norm.includes("design")) {
    return "fa-couch";
  }
  if (norm.includes("carpenter")) {
    return "fa-hammer";
  }
  return "fa-helmet-safety";
}

function renderTradeQuotaCards() {
  const tabsContainer = document.getElementById("tradeTabsContainer");
  const cardsGrid = document.getElementById("tradeCardsGrid");
  if (!cardsGrid) return;

  cardsGrid.innerHTML = "";

  // Render Tabs above grid
  if (tabsContainer) {
    tabsContainer.innerHTML = "";

    // "All Trades" Tab
    const allTab = document.createElement("button");
    allTab.type = "button";
    allTab.className = `trade-tab-pill ${selectedTradeFilter === "ALL" ? "active" : ""}`;
    allTab.innerHTML = `All Trades (${allApplications.length})`;
    allTab.onclick = () => selectTradeFilter("ALL");
    tabsContainer.appendChild(allTab);

    tradeQuotas.forEach(t => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = `trade-tab-pill ${selectedTradeFilter === t.normalizedTrade ? "active" : ""}`;
      tab.innerHTML = `${escapeHtml(t.tradeRole)} (${t.applications.length})`;
      tab.onclick = () => selectTradeFilter(t.normalizedTrade);
      tabsContainer.appendChild(tab);
    });
  }

  if (tradeQuotas.length === 0) {
    cardsGrid.innerHTML = `<div class="trade-card-skeleton">No trade requirements defined.</div>`;
    return;
  }

  // Render Cards in Grid
  tradeQuotas.forEach(t => {
    const iconClass = getTradeIcon(t.tradeRole);
    const card = document.createElement("div");
    const isSelected = selectedTradeFilter === t.normalizedTrade;
    card.className = `trade-card ${isSelected ? 'active-trade' : ''} ${t.isFilled ? 'filled' : ''}`;
    card.onclick = () => selectTradeFilter(t.normalizedTrade);

    const appsCount = t.applications.length;
    const statusBadgeHtml = t.isFilled
      ? `<span class="trade-card-status-badge badge-filled"><i class="fa-solid fa-circle-check"></i> Requirement Filled</span>`
      : `<span class="trade-card-status-badge badge-open">${t.remainingQuantity} Required</span>`;

    card.innerHTML = `
      <div>
        <div class="trade-card-top">
          <div class="trade-card-title-group">
            <div class="trade-role-icon">
              <i class="fa-solid ${iconClass}"></i>
            </div>
            <div>
              <h4 class="trade-card-name">${escapeHtml(t.tradeRole)}</h4>
              <small style="color:#64748b; font-size:11px;">Target Quota: ${t.requiredQuantity}</small>
            </div>
          </div>
          ${statusBadgeHtml}
        </div>

        <div class="trade-quota-stats-row">
          <div class="quota-stat-box">
            <span class="quota-stat-label">Required</span>
            <span class="quota-stat-val">${t.requiredQuantity}</span>
          </div>
          <div class="quota-stat-box">
            <span class="quota-stat-label">Accepted</span>
            <span class="quota-stat-val stat-accepted">${t.acceptedQuantity}</span>
          </div>
          <div class="quota-stat-box">
            <span class="quota-stat-label">Remaining</span>
            <span class="quota-stat-val stat-remaining ${t.remainingQuantity === 0 ? 'zero' : ''}">${t.remainingQuantity}</span>
          </div>
        </div>
      </div>

      <div class="trade-card-footer">
        <span class="trade-apps-count-pill">
          <i class="fa-solid fa-file-invoice"></i> ${appsCount} ${appsCount === 1 ? 'Application' : 'Applications'}
        </span>
        <button type="button" class="btn-view-trade-quotes" onclick="event.stopPropagation(); selectTradeFilter('${t.normalizedTrade}')">
          View Quotes <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `;

    cardsGrid.appendChild(card);
  });
}

function selectTradeFilter(tradeNormalized) {
  selectedTradeFilter = tradeNormalized;
  renderTradeQuotaCards();
  renderApplicationsGrid();
}

function handleFilterChange() {
  const searchInput = document.getElementById("appSearchInput");
  const statusSelect = document.getElementById("appStatusFilter");
  const sortSelect = document.getElementById("appSortFilter");

  searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";
  selectedStatusFilter = statusSelect ? statusSelect.value : "ALL";
  sortOrder = sortSelect ? sortSelect.value : "NEWEST";

  renderApplicationsGrid();
}

// ============================================================================
// 7. APPLICATIONS CARDS RENDERING (SECTION 8)
// ============================================================================

function renderApplicationsGrid() {
  const container = document.getElementById("applicationsGrid");
  const emptyBox = document.getElementById("emptyApplicationsState");
  const titleDisplay = document.getElementById("activeTradeTitleDisplay");
  const countBadge = document.getElementById("activeTradeAppsCount");
  const quotaDisplay = document.getElementById("activeTradeQuotaDisplay");

  if (!container) return;
  container.innerHTML = "";

  // Filter applications by selected Trade
  let filtered = [...allApplications];
  let activeQuota = null;

  if (selectedTradeFilter !== "ALL") {
    filtered = filtered.filter(a => normalizeTrade(a.tradeRole) === selectedTradeFilter);
    activeQuota = tradeQuotas.find(t => t.normalizedTrade === selectedTradeFilter);
  }

  // Update Toolbar Meta
  if (selectedTradeFilter === "ALL") {
    if (titleDisplay) titleDisplay.innerHTML = `All Trade Quotations <span class="apps-count-badge" id="activeTradeAppsCount">${filtered.length}</span>`;
    if (quotaDisplay) quotaDisplay.textContent = `Showing candidate quotations across all required trades`;
  } else {
    const tradeName = activeQuota ? activeQuota.tradeRole : selectedTradeFilter;
    if (titleDisplay) titleDisplay.innerHTML = `${escapeHtml(tradeName)} Quotations <span class="apps-count-badge" id="activeTradeAppsCount">${filtered.length}</span>`;
    if (quotaDisplay && activeQuota) {
      quotaDisplay.textContent = `Quota: ${activeQuota.acceptedQuantity} / ${activeQuota.requiredQuantity} Accepted (${activeQuota.remainingQuantity} Slots Remaining)`;
    }
  }

  // Filter by Status
  if (selectedStatusFilter !== "ALL") {
    filtered = filtered.filter(a => String(a.status || "").toUpperCase() === selectedStatusFilter);
  }

  // Filter by Search Query
  if (searchQuery) {
    filtered = filtered.filter(a => {
      const name = (a.professionalName || "").toLowerCase();
      const loc = (a.professionalLocation || "").toLowerCase();
      const trade = (a.tradeRole || "").toLowerCase();
      const msg = (a.coverMessage || "").toLowerCase();
      return name.includes(searchQuery) || loc.includes(searchQuery) || trade.includes(searchQuery) || msg.includes(searchQuery);
    });
  }

  // Sort
  if (sortOrder === "RATE_ASC") {
    filtered.sort((a, b) => (Number(a.proposedRate) || 0) - (Number(b.proposedRate) || 0));
  } else if (sortOrder === "RATE_DESC") {
    filtered.sort((a, b) => (Number(b.proposedRate) || 0) - (Number(a.proposedRate) || 0));
  } else if (sortOrder === "NAME_ASC") {
    filtered.sort((a, b) => (a.professionalName || "").localeCompare(b.professionalName || ""));
  } else {
    // NEWEST: default
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  if (countBadge) countBadge.textContent = filtered.length;

  // Empty State Handling
  if (filtered.length === 0) {
    if (emptyBox) {
      emptyBox.style.display = "block";
      const emptyTitle = document.getElementById("emptyStateTitle");
      const emptySub = document.getElementById("emptyStateSubtitle");

      if (allApplications.length === 0) {
        if (emptyTitle) emptyTitle.textContent = "No Professional Applications Yet";
        if (emptySub) emptySub.textContent = "Professionals have not submitted quotes for this requirement yet. Once submitted, they will appear here.";
      } else if (selectedTradeFilter !== "ALL") {
        const tradeName = activeQuota ? activeQuota.tradeRole : selectedTradeFilter;
        if (emptyTitle) emptyTitle.textContent = `No Quotations for ${escapeHtml(tradeName)} Yet`;
        if (emptySub) emptySub.textContent = `No candidate quotations received for ${escapeHtml(tradeName)} yet. Check other trades or refresh.`;
      } else {
        if (emptyTitle) emptyTitle.textContent = "No Matching Applications Found";
        if (emptySub) emptySub.textContent = "No applications match your current search and filter criteria.";
      }
    }
    return;
  }

  if (emptyBox) emptyBox.style.display = "none";

  // Render individual application cards
  filtered.forEach(app => {
    const card = renderApplicationCard(app);
    container.appendChild(card);
  });
}

function renderApplicationCard(app) {
  const card = document.createElement("div");
  const status = String(app.status || "APPLIED").toUpperCase();
  const isAccepted = status === "ACCEPTED";
  const isRejected = status === "REJECTED";
  const isShortlisted = status === "SHORTLISTED";

  card.className = `app-card ${isAccepted ? 'accepted-card' : ''} ${isRejected ? 'rejected-card' : ''}`;
  card.id = `appCard-${app.applicationId}`;

  // Find relevant trade quota to evaluate capacity state
  const normTrade = normalizeTrade(app.tradeRole);
  const tradeQuota = tradeQuotas.find(t => t.normalizedTrade === normTrade);
  const isTradeCapacityFilled = tradeQuota ? tradeQuota.isFilled : false;

  const proName = escapeHtml(app.professionalName || "Verified Professional");
  const proTrade = escapeHtml(app.tradeRole || "Professional");
  const proLoc = escapeHtml(app.professionalLocation || "Location Not Specified");
  const rateVal = app.proposedRate ? `₹${Number(app.proposedRate).toLocaleString('en-IN')}` : "₹--";
  const rateTypeFormatted = formatRateType(app.rateType);
  const teamSize = app.teamSize ? `${app.teamSize} Crew Member${app.teamSize > 1 ? 's' : ''}` : "Individual (1)";
  const duration = app.estimatedDuration || "Not Specified";
  const appliedDate = app.createdAt ? formatDateTime(app.createdAt) : "Recently";
  const coverMsg = app.coverMessage ? escapeHtml(app.coverMessage) : "No message included with this proposal.";

  // Avatar or placeholder
  const avatarHtml = app.profilePhotoUrl 
    ? `<img src="${escapeHtml(app.profilePhotoUrl)}" alt="${proName}" class="app-card-avatar" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(proName)}';">`
    : `<img src="https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(proName)}" alt="${proName}" class="app-card-avatar">`;

  // Status Badge
  let statusBadgeHtml = "";
  if (isAccepted) {
    statusBadgeHtml = `<span class="app-status-badge badge-accepted"><i class="fa-solid fa-circle-check"></i> Accepted</span>`;
  } else if (isShortlisted) {
    statusBadgeHtml = `<span class="app-status-badge badge-shortlisted"><i class="fa-solid fa-bookmark"></i> Shortlisted</span>`;
  } else if (isRejected) {
    statusBadgeHtml = `<span class="app-status-badge badge-rejected"><i class="fa-solid fa-ban"></i> Rejected</span>`;
  } else {
    statusBadgeHtml = `<span class="app-status-badge badge-applied">Applied</span>`;
  }

  // Action Buttons Section
  let actionsHtml = "";
  if (isAccepted) {
    actionsHtml = `
      <div class="card-accepted-status-strip">
        <i class="fa-solid fa-circle-check"></i> ✓ Accepted & Hired
      </div>
    `;
  } else if (isRejected) {
    actionsHtml = `
      <div class="card-rejected-status-strip">
        <i class="fa-solid fa-xmark"></i> Rejected
      </div>
    `;
  } else {
    // APPLIED or SHORTLISTED
    const acceptBtnDisabled = isTradeCapacityFilled;
    const acceptBtnText = acceptBtnDisabled 
      ? `Capacity Filled` 
      : `<i class="fa-solid fa-check"></i> Accept`;

    actionsHtml = `
      <button type="button" class="btn-card-action btn-details" onclick="openDetailsModal('${escapeHtml(app.applicationId)}')">
        Details
      </button>
      ${!isShortlisted ? `
        <button type="button" class="btn-card-action btn-shortlist" id="btnShortlist-${app.applicationId}" onclick="handleShortlistClick('${escapeHtml(app.applicationId)}')">
          Shortlist
        </button>
      ` : ''}
      <button type="button" class="btn-card-action btn-reject" id="btnReject-${app.applicationId}" onclick="promptRejectModal('${escapeHtml(app.applicationId)}', '${proName}')">
        Reject
      </button>
      <button type="button" class="btn-card-action btn-accept" id="btnAccept-${app.applicationId}" 
              ${acceptBtnDisabled ? 'disabled title="Requirement capacity for this trade is already met"' : ''}
              onclick="handleAcceptClick('${escapeHtml(app.applicationId)}')">
        ${acceptBtnText}
      </button>
    `;
  }

  card.innerHTML = `
    <div>
      <div class="app-card-pro-row">
        ${avatarHtml}
        <div class="app-card-pro-info">
          <div class="app-card-name-row">
            <h4 class="app-pro-name" title="${proName}">${proName}</h4>
            ${statusBadgeHtml}
          </div>
          <div class="app-card-tags-row">
            <span class="app-trade-tag">${proTrade}</span>
            <span class="app-location-tag">
              <i class="fa-solid fa-location-dot"></i> ${proLoc}
            </span>
          </div>
        </div>
      </div>

      <!-- Proposed Rate Highlight -->
      <div class="app-rate-banner">
        <div class="app-rate-box">
          <span class="app-rate-amount">${rateVal}</span>
          <span class="app-rate-unit">/ ${rateTypeFormatted}</span>
        </div>
        <div class="app-team-duration-row">
          <span title="Team Size"><i class="fa-solid fa-user-group"></i> ${teamSize}</span>
          <span>•</span>
          <span title="Duration"><i class="fa-regular fa-clock"></i> ${duration}</span>
        </div>
      </div>

      <!-- Proposal Message Preview -->
      <div class="app-cover-preview" title="${coverMsg}">
        "${coverMsg}"
      </div>

      <div class="app-date-meta">
        <span>App ID: ${escapeHtml(app.applicationId || 'N/A')}</span>
        <span>Applied on ${appliedDate}</span>
      </div>
    </div>

    <div class="app-card-actions">
      ${actionsHtml}
    </div>
  `;

  return card;
}

function formatRateType(rateType) {
  const norm = String(rateType || "").toUpperCase().trim();
  if (norm.includes("DAY") || norm === "PER_DAY") return "DAY";
  if (norm.includes("LUMP") || norm === "LUMP_SUM") return "LUMP SUM";
  if (norm.includes("SQFT") || norm.includes("SQ_FT") || norm === "PER_SQFT") return "SQ.FT";
  if (norm.includes("MONTH") || norm === "PER_MONTH") return "MONTH";
  return norm || "DAY";
}

function formatDateTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return String(isoString);
  }
}

// ============================================================================
// 8. APPLICATION DETAILS MODAL (SECTION 9)
// ============================================================================

function openDetailsModal(applicationId) {
  const app = allApplications.find(a => a.applicationId === applicationId);
  if (!app) return;

  const modal = document.getElementById("applicationDetailsModal");
  const proNameEl = document.getElementById("modalProName");
  const fullNameEl = document.getElementById("modalProFullName");
  const tradePill = document.getElementById("modalProTrade");
  const statusBadge = document.getElementById("modalProStatusBadge");
  const locationEl = document.getElementById("modalProLocation");
  const appIdEl = document.getElementById("modalAppIdDisplay");
  const appDateEl = document.getElementById("modalAppDateDisplay");
  const avatarImg = document.getElementById("modalProAvatar");
  const quotaAlert = document.getElementById("modalQuotaAlert");
  const quotaText = document.getElementById("modalQuotaAlertText");
  const proposedRateEl = document.getElementById("modalProposedRate");
  const rateTypeEl = document.getElementById("modalRateType");
  const teamSizeEl = document.getElementById("modalTeamSize");
  const durationEl = document.getElementById("modalDuration");
  const coverMsgEl = document.getElementById("modalCoverMessage");
  const ctaGroup = document.getElementById("modalCtaGroup");
  const errorBox = document.getElementById("modalActionError");

  if (errorBox) errorBox.style.display = "none";

  const proName = app.professionalName || "Verified Professional";
  const proTrade = app.tradeRole || "Professional";
  const status = String(app.status || "APPLIED").toUpperCase();
  const isAccepted = status === "ACCEPTED";
  const isRejected = status === "REJECTED";
  const isShortlisted = status === "SHORTLISTED";

  if (proNameEl) proNameEl.textContent = proName;
  if (fullNameEl) fullNameEl.textContent = proName;
  if (tradePill) tradePill.textContent = proTrade;

  if (statusBadge) {
    statusBadge.textContent = status;
    statusBadge.className = `modal-status-badge ${isAccepted ? 'badge-accepted' : (isRejected ? 'badge-rejected' : (isShortlisted ? 'badge-shortlisted' : 'badge-applied'))}`;
  }

  if (locationEl) locationEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${escapeHtml(app.professionalLocation || "Location Not Specified")}`;
  if (appIdEl) appIdEl.textContent = `App ID: ${app.applicationId || 'N/A'}`;
  if (appDateEl) appDateEl.textContent = `Applied: ${formatDateTime(app.createdAt)}`;

  if (avatarImg) {
    avatarImg.src = app.profilePhotoUrl 
      ? app.profilePhotoUrl 
      : `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(proName)}`;
  }

  // Quota status check
  const normTrade = normalizeTrade(app.tradeRole);
  const tradeQuota = tradeQuotas.find(t => t.normalizedTrade === normTrade);
  const isFilled = tradeQuota ? tradeQuota.isFilled : false;

  if (quotaAlert && quotaText && tradeQuota) {
    if (isFilled) {
      quotaAlert.className = "modal-quota-alert filled";
      quotaText.innerHTML = `<strong>${escapeHtml(tradeQuota.tradeRole)} Quota Filled:</strong> All ${tradeQuota.requiredQuantity} of ${tradeQuota.requiredQuantity} positions accepted.`;
    } else {
      quotaAlert.className = "modal-quota-alert";
      quotaText.innerHTML = `<strong>${escapeHtml(tradeQuota.tradeRole)} Quota Status:</strong> ${tradeQuota.acceptedQuantity} of ${tradeQuota.requiredQuantity} accepted (${tradeQuota.remainingQuantity} slots remaining).`;
    }
  }

  // Quotation Terms
  if (proposedRateEl) proposedRateEl.textContent = app.proposedRate ? `₹${Number(app.proposedRate).toLocaleString('en-IN')}` : "₹--";
  if (rateTypeEl) rateTypeEl.textContent = formatRateType(app.rateType);
  if (teamSizeEl) teamSizeEl.textContent = app.teamSize ? `${app.teamSize} Member${app.teamSize > 1 ? 's' : ''}` : "1 Member";
  if (durationEl) durationEl.textContent = app.estimatedDuration || "Not Specified";
  if (coverMsgEl) coverMsgEl.textContent = app.coverMessage || "No additional message included.";

  // Modal Action Buttons
  if (ctaGroup) {
    ctaGroup.innerHTML = "";

    if (isAccepted) {
      ctaGroup.innerHTML = `
        <span class="card-accepted-status-strip" style="padding: 9px 16px;">
          <i class="fa-solid fa-circle-check"></i> ✓ Accepted & Hired
        </span>
      `;
    } else if (isRejected) {
      ctaGroup.innerHTML = `
        <span class="card-rejected-status-strip" style="padding: 9px 16px;">
          <i class="fa-solid fa-ban"></i> Application Rejected
        </span>
      `;
    } else {
      // APPLIED or SHORTLISTED
      if (!isShortlisted) {
        const shortlistBtn = document.createElement("button");
        shortlistBtn.type = "button";
        shortlistBtn.className = "btn-modal-shortlist";
        shortlistBtn.id = `modalBtnShortlist-${app.applicationId}`;
        shortlistBtn.textContent = "Shortlist";
        shortlistBtn.onclick = () => handleShortlistClick(app.applicationId, true);
        ctaGroup.appendChild(shortlistBtn);
      }

      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "btn-modal-reject";
      rejectBtn.id = `modalBtnReject-${app.applicationId}`;
      rejectBtn.textContent = "Reject";
      rejectBtn.onclick = () => promptRejectModal(app.applicationId, proName, true);
      ctaGroup.appendChild(rejectBtn);

      const acceptBtn = document.createElement("button");
      acceptBtn.type = "button";
      acceptBtn.className = "btn-modal-accept";
      acceptBtn.id = `modalBtnAccept-${app.applicationId}`;
      if (isFilled) {
        acceptBtn.disabled = true;
        acceptBtn.title = "Requirement capacity for this trade is already met";
        acceptBtn.innerHTML = `Capacity Filled`;
      } else {
        acceptBtn.innerHTML = `<i class="fa-solid fa-check"></i> Accept Quotation`;
        acceptBtn.onclick = () => handleAcceptClick(app.applicationId, true);
      }
      ctaGroup.appendChild(acceptBtn);
    }
  }

  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function closeDetailsModal() {
  const modal = document.getElementById("applicationDetailsModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
}

// ============================================================================
// 9. ACCEPT APPLICATION FLOW (SECTION 10, 11, 15, 16)
// ============================================================================

async function handleAcceptClick(applicationId, fromModal = false) {
  if (isSubmittingAction) return;
  isSubmittingAction = true;

  const btnOnCard = document.getElementById(`btnAccept-${applicationId}`);
  const btnInModal = document.getElementById(`modalBtnAccept-${applicationId}`);

  if (btnOnCard) {
    btnOnCard.disabled = true;
    btnOnCard.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Accepting...`;
  }
  if (btnInModal) {
    btnInModal.disabled = true;
    btnInModal.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Accepting...`;
  }

  const token = getCleanToken();
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/requester/applications/${encodeURIComponent(applicationId)}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "ACCEPTED" })
    });

    if (response.status === 409) {
      // 409 Conflict: Capacity already fulfilled (Section 16)
      showConflictModal("This trade requirement has already been filled. Please refresh the applications.");
      await loadRequirementAndApplications(activeProjectId);
      return;
    }

    if (response.status === 401) {
      showToast("Session expired. Please log in again.", "error");
      renderSessionExpiredState();
      return;
    }

    if (response.status === 403) {
      showToast("Access denied. You do not own this project requirement.", "error");
      return;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const updatedApp = await response.json();
    showToast(`✓ Quotation accepted! Professional has been hired.`, "success");

    if (fromModal) {
      closeDetailsModal();
    }

    // Refresh state authoritatively from backend (Section 17)
    await loadRequirementAndApplications(activeProjectId);

  } catch (err) {
    console.error("Accept error:", err);
    showToast(`Error accepting application: ${err.message}`, "error");
  } finally {
    isSubmittingAction = false;
  }
}

// ============================================================================
// 10. REJECT APPLICATION FLOW (SECTION 13)
// ============================================================================

function promptRejectModal(applicationId, proName, fromModal = false) {
  pendingRejectApplicationId = applicationId;
  const modal = document.getElementById("rejectConfirmModal");
  const msgEl = document.getElementById("rejectConfirmMessage");
  const executeBtn = document.getElementById("btnExecuteReject");

  if (msgEl) {
    msgEl.textContent = `Are you sure you want to reject the quotation from ${proName || 'this professional'}? The application will remain stored as REJECTED.`;
  }

  if (executeBtn) {
    executeBtn.onclick = () => executeReject(fromModal);
  }

  if (modal) {
    modal.style.display = "flex";
  }
}

function closeRejectConfirmModal() {
  const modal = document.getElementById("rejectConfirmModal");
  if (modal) modal.style.display = "none";
  pendingRejectApplicationId = null;
}

async function executeReject(fromModal = false) {
  if (!pendingRejectApplicationId || isSubmittingAction) return;
  const applicationId = pendingRejectApplicationId;
  isSubmittingAction = true;

  const btnConfirm = document.getElementById("btnExecuteReject");
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...`;
  }

  const token = getCleanToken();
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/requester/applications/${encodeURIComponent(applicationId)}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "REJECTED" })
    });

    if (response.status === 401) {
      showToast("Session expired. Please log in again.", "error");
      renderSessionExpiredState();
      return;
    }

    if (response.status === 403) {
      showToast("Access denied. You do not own this project requirement.", "error");
      return;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    closeRejectConfirmModal();
    if (fromModal) {
      closeDetailsModal();
    }

    showToast("Application marked as REJECTED.", "info");

    // Refresh state authoritatively from backend
    await loadRequirementAndApplications(activeProjectId);

  } catch (err) {
    console.error("Reject error:", err);
    showToast(`Error rejecting application: ${err.message}`, "error");
  } finally {
    isSubmittingAction = false;
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = `<i class="fa-solid fa-xmark"></i> Reject Quotation`;
    }
  }
}

// ============================================================================
// 11. SHORTLIST FLOW (SECTION 14)
// ============================================================================

async function handleShortlistClick(applicationId, fromModal = false) {
  if (isSubmittingAction) return;
  isSubmittingAction = true;

  const btnOnCard = document.getElementById(`btnShortlist-${applicationId}`);
  const btnInModal = document.getElementById(`modalBtnShortlist-${applicationId}`);

  if (btnOnCard) {
    btnOnCard.disabled = true;
    btnOnCard.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
  }
  if (btnInModal) {
    btnInModal.disabled = true;
    btnInModal.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
  }

  const token = getCleanToken();
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/requester/applications/${encodeURIComponent(applicationId)}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "SHORTLISTED" })
    });

    if (response.ok) {
      showToast("Professional shortlisted for this requirement.", "info");
      if (fromModal) {
        closeDetailsModal();
      }
      await loadRequirementAndApplications(activeProjectId);
    } else {
      const errData = await response.json().catch(() => ({}));
      showToast(errData.error || "Failed to shortlist application", "error");
    }
  } catch (err) {
    console.error("Shortlist error:", err);
    showToast("Failed to shortlist application: " + err.message, "error");
  } finally {
    isSubmittingAction = false;
  }
}

// ============================================================================
// 12. 409 CONFLICT MODAL HANDLING (SECTION 16)
// ============================================================================

function showConflictModal(message) {
  const modal = document.getElementById("conflictModalOverlay");
  const msgEl = document.getElementById("conflictModalMessage");
  if (msgEl && message) {
    msgEl.textContent = message;
  }
  if (modal) {
    modal.style.display = "flex";
  }
}

function resolveConflictAndRefresh() {
  const modal = document.getElementById("conflictModalOverlay");
  if (modal) modal.style.display = "none";
  closeDetailsModal();
  loadRequirementAndApplications(activeProjectId);
}

function refreshCurrentRequirement() {
  if (!activeProjectId) return;
  const refreshBtn = document.getElementById("btnRefreshApplications");
  if (refreshBtn) {
    const icon = refreshBtn.querySelector("i");
    if (icon) icon.classList.add("fa-spin");
    setTimeout(() => {
      if (icon) icon.classList.remove("fa-spin");
    }, 1000);
  }
  loadRequirementAndApplications(activeProjectId);
}

// ============================================================================
// 13. UI HELPER & STATE RENDERERS
// ============================================================================

function showLoading(show, message = "Loading...") {
  const overlay = document.getElementById("loadingStateOverlay");
  const textEl = document.getElementById("loadingStateText");
  if (!overlay) return;

  if (show) {
    if (textEl) textEl.textContent = message;
    overlay.style.display = "flex";
  } else {
    overlay.style.display = "none";
  }
}

function showAlert(type, title, message) {
  const container = document.getElementById("statusAlertContainer");
  if (!container) return;
  container.innerHTML = `
    <div style="background:${type === 'error' ? '#fef2f2' : '#eff6ff'}; border:1px solid ${type === 'error' ? '#fecaca' : '#bfdbfe'}; color:${type === 'error' ? '#991b1b' : '#1e40af'}; padding:14px 18px; border-radius:10px; margin-bottom:20px; display:flex; align-items:center; gap:12px;">
      <i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}" style="font-size:18px;"></i>
      <div>
        <strong>${escapeHtml(title)}:</strong> ${escapeHtml(message)}
      </div>
    </div>
  `;
}

function hideAlert() {
  const container = document.getElementById("statusAlertContainer");
  if (container) container.innerHTML = "";
}

function renderEmptyRequesterState() {
  const container = document.querySelector(".req-apps-main-container");
  if (!container) return;
  container.innerHTML = `
    <div style="background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; padding:60px 24px; text-align:center; max-width:600px; margin:40px auto; box-shadow:0 4px 16px rgba(0,0,0,0.05);">
      <div style="width:64px; height:64px; border-radius:50%; background:#f1f5f9; color:#94a3b8; font-size:28px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
        <i class="fa-regular fa-folder-open"></i>
      </div>
      <h3 style="font-size:20px; font-weight:800; color:#1e293b; margin-bottom:8px;">No Requirements Posted Yet</h3>
      <p style="color:#64748b; font-size:14px; line-height:1.5; margin-bottom:24px;">
        You have not posted any project requirements yet. Post your trade requirements to receive competitive quotations from qualified professionals.
      </p>
      <a href="post-requirements.html" class="btn-banner-action primary" style="display:inline-flex; align-items:center; gap:8px;">
        <i class="fa-solid fa-plus"></i> Post Requirement Now
      </a>
    </div>
  `;
}

function renderSessionExpiredState() {
  const container = document.querySelector(".req-apps-main-container");
  if (!container) return;
  container.innerHTML = `
    <div style="background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; padding:50px 24px; text-align:center; max-width:520px; margin:40px auto; box-shadow:0 4px 16px rgba(0,0,0,0.05);">
      <div style="width:60px; height:60px; border-radius:50%; background:#fef2f2; color:#ef4444; font-size:26px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
        <i class="fa-solid fa-lock"></i>
      </div>
      <h3 style="font-size:19px; font-weight:800; color:#1e293b; margin-bottom:8px;">Session Expired</h3>
      <p style="color:#64748b; font-size:14px; line-height:1.5; margin-bottom:20px;">
        Your authenticated session has expired. Please log in again to manage your requirement applications.
      </p>
      <a href="index.html" class="btn-banner-action primary" style="display:inline-flex;">
        <i class="fa-solid fa-arrow-right-to-bracket"></i> Login Again
      </a>
    </div>
  `;
}

function renderForbiddenState(message) {
  const container = document.querySelector(".req-apps-main-container");
  if (!container) return;
  container.innerHTML = `
    <div style="background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; padding:50px 24px; text-align:center; max-width:520px; margin:40px auto; box-shadow:0 4px 16px rgba(0,0,0,0.05);">
      <div style="width:60px; height:60px; border-radius:50%; background:#fef2f2; color:#ef4444; font-size:26px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
        <i class="fa-solid fa-shield-halved"></i>
      </div>
      <h3 style="font-size:19px; font-weight:800; color:#1e293b; margin-bottom:8px;">Access Denied</h3>
      <p style="color:#64748b; font-size:14px; line-height:1.5; margin-bottom:20px;">
        ${escapeHtml(message || "You don't have permission to view these requirement applications.")}
      </p>
      <button onclick="window.history.back()" class="btn-banner-action secondary" style="color:#0f172a; border-color:#cbd5e1; display:inline-flex;">
        <i class="fa-solid fa-arrow-left"></i> Go Back
      </button>
    </div>
  `;
}

function renderNotFoundState(message) {
  const container = document.querySelector(".req-apps-main-container");
  if (!container) return;
  container.innerHTML = `
    <div style="background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; padding:50px 24px; text-align:center; max-width:520px; margin:40px auto; box-shadow:0 4px 16px rgba(0,0,0,0.05);">
      <div style="width:60px; height:60px; border-radius:50%; background:#fef3c7; color:#d97706; font-size:26px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
        <i class="fa-regular fa-circle-question"></i>
      </div>
      <h3 style="font-size:19px; font-weight:800; color:#1e293b; margin-bottom:8px;">Requirement Not Found</h3>
      <p style="color:#64748b; font-size:14px; line-height:1.5; margin-bottom:20px;">
        ${escapeHtml(message || "The requested post requirement could not be found.")}
      </p>
      <button onclick="window.location.href='customer projects.html'" class="btn-banner-action primary" style="display:inline-flex;">
        View My Projects
      </button>
    </div>
  `;
}

function renderErrorState(message) {
  showAlert("error", "Error", message);
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;
  let iconClass = "fa-circle-info";
  if (type === "success") iconClass = "fa-circle-check";
  if (type === "error") iconClass = "fa-circle-xmark";
  if (type === "warning") iconClass = "fa-triangle-exclamation";

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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

function handleNotificationClick() {
  showToast("No new unread notifications.", "info");
}

function handleMessagesClick() {
  showToast("Direct messages with accepted professionals will open here.", "info");
}
