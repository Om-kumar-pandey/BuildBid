/* =========================================================
   BUILDBID - MY PROJECTS DASHBOARD SCRIPT
   EXACT REFERENCE IMAGE MATCH + 100% REAL DYNAMIC DATA
   ========================================================= */

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

function performSelectiveLogout() {
  localStorage.removeItem("marketplaceToken");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("marketplaceUser");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("customerUser");
  localStorage.removeItem("buildbid_user");
  sessionStorage.removeItem("pendingRedirect");
  sessionStorage.removeItem("userData");
}

/* =========================================================
   PROJECT IMAGE RESOLVER (EXISTING PROJECT ASSETS ONLY)
   ========================================================= */
const PROJECT_LOCAL_IMAGES = {
  new_construction: "NEW CONSTRUCTION.png",
  renovation: "RENOVATION.png",
  home_extension: "HOME EXTENSION.png",
  finishing: "INTERIOR DESIGN.png",
  commercial: "COMMERCIAL CONSTRUCTION.png",
  industrial_warehouse: "INDUSTRIRAL AND WAREHOUSE.png",
  home_maintenance: "HOME MAINTENANCE.png",
  landscaping_gardening: "LANDSCAPING AND GARDENING.png",
  others: "OTHERS.png",
  default: "hero-building.jpg"
};

function getLocalProjectImage(projectType) {
  const norm = String(projectType || "").trim().toLowerCase();
  if (!norm) return PROJECT_LOCAL_IMAGES.default;

  if (norm.includes("new") || (norm.includes("construct") && !norm.includes("commercial") && !norm.includes("indust"))) {
    return PROJECT_LOCAL_IMAGES.new_construction;
  }
  if (norm.includes("renov") || norm.includes("remodel")) {
    return PROJECT_LOCAL_IMAGES.renovation;
  }
  if (norm.includes("extens")) {
    return PROJECT_LOCAL_IMAGES.home_extension;
  }
  if (norm.includes("finish") || norm.includes("interior") || norm.includes("design")) {
    return PROJECT_LOCAL_IMAGES.finishing;
  }
  if (norm.includes("commercial") || norm.includes("office") || norm.includes("showroom") || norm.includes("retail") || norm.includes("space")) {
    return PROJECT_LOCAL_IMAGES.commercial;
  }
  if (norm.includes("indust") || norm.includes("warehouse") || norm.includes("factory")) {
    return PROJECT_LOCAL_IMAGES.industrial_warehouse;
  }
  if (norm.includes("maint") || norm.includes("repair")) {
    return PROJECT_LOCAL_IMAGES.home_maintenance;
  }
  if (norm.includes("landscap") || norm.includes("garden")) {
    return PROJECT_LOCAL_IMAGES.landscaping_gardening;
  }
  if (norm.includes("other") || norm.includes("custom")) {
    return PROJECT_LOCAL_IMAGES.others;
  }
  return PROJECT_LOCAL_IMAGES.default;
}

// In-Memory State
let allProjectsList = [];
let currentPage = 1;
const itemsPerPage = 5;

// Reference Image Card Accent Colors
const ACCENT_COLORS = [
  "#3b82f6", // 1 - Blue
  "#f97316", // 2 - Orange
  "#10b981", // 3 - Green
  "#8b5cf6", // 4 - Purple
  "#06b6d4"  // 5 - Teal
];

/* =========================================================
   LIFECYCLE ENTRY POINT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const token = getCleanToken();
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  syncUniversalUserProfile();
  loadCustomerProjects();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      performSelectiveLogout();
      window.location.href = "index.html";
    });
  }

  // Close modals on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const reassignEl = document.getElementById("reassignConfirmModalOverlay");
      if (reassignEl && reassignEl.style.display !== "none" && !isSubmittingInlineAction) {
        closeInlineReassignModal();
        return;
      }
      const revokeEl = document.getElementById("revokeConfirmModalOverlay");
      if (revokeEl && revokeEl.style.display !== "none" && !isSubmittingInlineAction) {
        closeInlineRevokeModal();
        return;
      }
      const acceptEl = document.getElementById("acceptConfirmModalOverlay");
      if (acceptEl && acceptEl.style.display !== "none" && !isSubmittingInlineAction) {
        closeInlineAcceptModal();
        return;
      }
      closeProjectDetailsModal();
    }
  });

  // Close modal on background click
  const modalOverlay = document.getElementById("projectDetailsModalOverlay");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeProjectDetailsModal();
      }
    });
  }

  // Accept Confirmation Modal Listeners
  const cancelAcceptBtn = document.getElementById("btnCancelAccept");
  const confirmAcceptBtn = document.getElementById("btnConfirmAccept");
  const acceptOverlay = document.getElementById("acceptConfirmModalOverlay");
  if (cancelAcceptBtn) cancelAcceptBtn.addEventListener("click", closeInlineAcceptModal);
  if (confirmAcceptBtn) confirmAcceptBtn.addEventListener("click", submitInlineAcceptBid);
  if (acceptOverlay) {
    acceptOverlay.addEventListener("click", (e) => {
      if (e.target === acceptOverlay && !isSubmittingInlineAction) closeInlineAcceptModal();
    });
  }

  // Revoke Confirmation Modal Listeners
  const cancelRevokeBtn = document.getElementById("btnCancelRevoke");
  const confirmRevokeBtn = document.getElementById("btnConfirmRevoke");
  const revokeOverlay = document.getElementById("revokeConfirmModalOverlay");
  if (cancelRevokeBtn) cancelRevokeBtn.addEventListener("click", closeInlineRevokeModal);
  if (confirmRevokeBtn) confirmRevokeBtn.addEventListener("click", submitInlineRevokeAcceptance);
  if (revokeOverlay) {
    revokeOverlay.addEventListener("click", (e) => {
      if (e.target === revokeOverlay && !isSubmittingInlineAction) closeInlineRevokeModal();
    });
  }

  // Reassign Confirmation Modal Listeners
  const cancelReassignBtn = document.getElementById("btnCancelReassign");
  const confirmReassignBtn = document.getElementById("btnConfirmReassign");
  const reassignOverlay = document.getElementById("reassignConfirmModalOverlay");
  if (cancelReassignBtn) cancelReassignBtn.addEventListener("click", closeInlineReassignModal);
  if (confirmReassignBtn) confirmReassignBtn.addEventListener("click", submitInlineReassignBid);
  if (reassignOverlay) {
    reassignOverlay.addEventListener("click", (e) => {
      if (e.target === reassignOverlay && !isSubmittingInlineAction) closeInlineReassignModal();
    });
  }
});

/* =========================================================
   1. USER PROFILE SYNC
   ========================================================= */
function syncUniversalUserProfile() {
  const storageKeys = [
    "currentUser",
    "customerUser",
    "userData",
    "user",
    "loggedInUser",
    "auth_user",
    "customer"
  ];

  let activeUser = null;

  for (const key of storageKeys) {
    const rawLocal = localStorage.getItem(key);
    const rawSession = sessionStorage.getItem(key);
    const raw = rawLocal || rawSession;

    if (raw) {
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === "object") {
          activeUser = parsed;
          break;
        }
      } catch (e) {
        if (typeof raw === "string" && raw.trim().length > 0) {
          activeUser = { name: raw };
          break;
        }
      }
    }
  }

  if (activeUser) {
    applyUserHeaderData(activeUser);
  }

  const token = getCleanToken();
  if (token) {
    fetch(API_BASE_URL + "/api/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    })
    .then(res => res.ok ? res.json() : null)
    .then(freshUser => {
      if (freshUser) {
        localStorage.setItem("currentUser", JSON.stringify(freshUser));
        localStorage.setItem("customerUser", JSON.stringify(freshUser));
        applyUserHeaderData(freshUser);
      }
    })
    .catch(() => {});
  }
}

function applyUserHeaderData(user) {
  const nameElem = document.getElementById("navUserName") || document.getElementById("user-display-name");
  const avatarElem = document.getElementById("navAvatar");
  const roleElem = document.getElementById("navUserRole") || document.getElementById("user-display-role");

  if (!user) return;

  const rawName = 
    user.name || 
    user.fullName || 
    user.fullname || 
    user.username || 
    user.userName || 
    user.firstName || 
    user.email?.split("@")[0] || 
    "Customer";

  const cleanName = String(rawName).trim();

  if (nameElem && cleanName) {
    const firstName = cleanName.split(" ")[0];
    nameElem.textContent = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }

  if (roleElem) {
    const primaryRole = (user.role || (user.roles && user.roles[0]) || "CUSTOMER");
    roleElem.textContent = (typeof primaryRole === "string" ? primaryRole : primaryRole.name || "CUSTOMER")
      .replace("ROLE_", "")
      .toUpperCase();
  }

  if (avatarElem && cleanName) {
    avatarElem.src = `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(cleanName)}`;
  }
}

/* =========================================================
   2. 100% REAL DYNAMIC DATA LOADER
   ========================================================= */
async function loadCustomerProjects() {
  const token = getCleanToken();
  const authHeaders = token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : {};

  if (token) {
    try {
      // Fetch both full project entities and project bid summaries in parallel
      const [projResponse, bidsResponse] = await Promise.all([
        fetch(API_BASE_URL + "/api/customer/projects", { method: "GET", headers: authHeaders }).catch(() => null),
        fetch(API_BASE_URL + "/api/customer/my-bids/projects", { method: "GET", headers: authHeaders }).catch(() => null)
      ]);

      let rawProjects = [];
      if (projResponse && projResponse.ok) {
        rawProjects = await projResponse.json();
      } else {
        // Fallback endpoint if specific customer route is shadowed
        const fallbackRes = await fetch(API_BASE_URL + "/api/projects", { method: "GET", headers: authHeaders }).catch(() => null);
        if (fallbackRes && fallbackRes.ok) {
          rawProjects = await fallbackRes.json();
        }
      }

      let bidsProjects = [];
      if (bidsResponse && bidsResponse.ok) {
        bidsProjects = await bidsResponse.json();
      }

      // Build Map of bids count and active assignments by project ID
      const bidsMap = new Map();
      if (Array.isArray(bidsProjects)) {
        bidsProjects.forEach(bp => {
          if (bp.id !== undefined && bp.id !== null) bidsMap.set(String(bp.id), bp);
          if (bp.projectId) bidsMap.set(String(bp.projectId), bp);
        });
      }

      if (Array.isArray(rawProjects) && rawProjects.length > 0) {
        allProjectsList = rawProjects.map(p => {
          const bp = bidsMap.get(String(p.id)) || (p.projectId ? bidsMap.get(String(p.projectId)) : null);
          return {
            ...p,
            bidsCount: bp ? (bp.totalBids ?? 0) : (p.bidsCount ?? 0),
            hasActiveAssignment: bp ? Boolean(bp.hasActiveAssignment) : false,
            projectStatus: p.status || (bp ? bp.projectStatus : "OPEN")
          };
        });
        localStorage.setItem("customerProjects", JSON.stringify(allProjectsList));
        renderProjectsView();
        return;
      } else if (Array.isArray(bidsProjects) && bidsProjects.length > 0) {
        allProjectsList = bidsProjects.map(bp => ({
          id: bp.id,
          projectId: bp.projectId,
          title: bp.projectTitle,
          projectTitle: bp.projectTitle,
          type: bp.projectType,
          projectType: bp.projectType,
          location: bp.location,
          totalArea: bp.totalArea,
          status: bp.projectStatus,
          projectStatus: bp.projectStatus,
          description: bp.description,
          bidsCount: bp.totalBids ?? 0,
          hasActiveAssignment: bp.hasActiveAssignment
        }));
        localStorage.setItem("customerProjects", JSON.stringify(allProjectsList));
        renderProjectsView();
        return;
      }
    } catch (err) {
      console.warn("Backend offline or connection failed, using local cache:", err);
    }
  }

  // Offline / Cache fallback
  const localProjects = JSON.parse(localStorage.getItem("customerProjects") || "[]");
  allProjectsList = Array.isArray(localProjects) ? localProjects : [];
  renderProjectsView();
}

/* =========================================================
   3. RENDER ENGINE (EXACT REFERENCE IMAGE MATCH)
   ========================================================= */
function renderProjectsView() {
  updateTopStatistics();
  renderProjectCards();
  renderPagination();
}

/**
 * 3 Dynamic Statistic Cards at the top:
 * - Total Projects (कुल प्रोजेक्ट्स)
 * - Total Bids (कुल बोलियाँ)
 * - Pending Review (समीक्षा की प्रतीक्षा में)
 */
function updateTopStatistics() {
  const totalProjects = allProjectsList.length;
  const totalBids = allProjectsList.reduce((acc, curr) => acc + (parseInt(curr.bidsCount) || 0), 0);

  // Dynamic Pending Review count based on genuine existing status logic:
  // Projects whose authoritative status is UNDER_REVIEW, PENDING, or PENDING_REVIEW
  const pendingReview = allProjectsList.filter(p => {
    const s = String(p.status || p.projectStatus || "").toUpperCase().trim();
    return s.includes("REVIEW") || s.includes("PENDING");
  }).length;

  const statProjEl = document.getElementById("statTotalProjects");
  const statBidsEl = document.getElementById("statTotalBids");
  const statPendingEl = document.getElementById("statPendingReview");

  if (statProjEl) statProjEl.textContent = totalProjects;
  if (statBidsEl) statBidsEl.textContent = totalBids;
  if (statPendingEl) statPendingEl.textContent = pendingReview;
}

/**
 * Renders the project cards stack
 */
function renderProjectCards() {
  const container = document.getElementById("projectCardsContainer");
  const emptyBox = document.getElementById("emptyStateBox");
  const paginationBar = document.getElementById("paginationBar");

  if (!container) return;

  if (!allProjectsList || allProjectsList.length === 0) {
    container.innerHTML = "";
    if (emptyBox) emptyBox.style.display = "block";
    if (paginationBar) paginationBar.style.display = "none";
    return;
  }

  if (emptyBox) emptyBox.style.display = "none";
  if (paginationBar) paginationBar.style.display = "flex";

  const totalItems = allProjectsList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  currentPage = Math.max(1, Math.min(currentPage, totalPages));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageProjects = allProjectsList.slice(startIndex, endIndex);

  container.innerHTML = pageProjects.map((p, pageIndex) => {
    const globalIndex = startIndex + pageIndex;
    const projectNumber = globalIndex + 1;
    const accentColor = ACCENT_COLORS[globalIndex % ACCENT_COLORS.length];

    const title = p.title || p.projectTitle || "Untitled Project";
    const category = p.type || p.projectType || p.category || "New Construction";
    const categoryClass = getCategoryBadgeClass(category);

    const locationText = p.city 
      ? `${p.city}${p.state ? ", " + p.state : ""}`
      : (p.location || "Location not specified");

    const description = p.description || p.scopeOfWork || "No detailed description provided.";

    // Area formatting
    let areaLabel = "Plot Area";
    let areaValue = "N/A";
    if (p.plotArea) {
      areaLabel = "Plot Area";
      areaValue = `${p.plotArea} sq ft`;
    } else if (p.builtUpArea) {
      areaLabel = "Built-up Area";
      areaValue = `${p.builtUpArea} sq ft`;
    } else if (p.totalArea) {
      areaLabel = "Plot Area";
      areaValue = `${p.totalArea} sq ft`;
    } else if (p.area) {
      const aStr = String(p.area).trim();
      areaValue = aStr.toLowerCase().includes("sq") ? aStr : `${aStr} sq ft`;
    }

    // Floors — Clean human-readable building configuration (no raw JSON)
    const floorsInfo = parseFloorsData(p.floors || p.floorsCount);
    const floorsValue = floorsInfo.summary || "Ground Floor";

    // Quality Tier
    const qualityValue = p.qualityTier || "Standard";

    // Status mapping
    const statusObj = mapProjectStatus(p.status || p.projectStatus);

    // Bids count
    const bidsCount = parseInt(p.bidsCount) || 0;

    // Project image from existing assets
    const imageUrl = getLocalProjectImage(category);

    // Formatted Posted Date
    const postedDate = formatProjectDate(p.createdAt || p.targetStartDate);

    // Genuine Project ID from existing BuildBid backend (or safe "N/A" fallback if unavailable)
    const displayProjectId = (p.projectId && String(p.projectId).trim().length > 0)
      ? String(p.projectId).trim()
      : "N/A";

    const projectIdArg = String(p.id !== undefined && p.id !== null ? p.id : (p.projectId || ""));

    return `
      <div class="ref-project-card" id="projectCard-${p.id}" style="--card-accent: ${accentColor};">
        <!-- Number Badge Top-Left -->
        <div class="ref-card-number-badge">${projectNumber}</div>

        <!-- Main Card Content Row -->
        <div class="ref-card-main-row">
          <!-- Thumbnail Image -->
          <div class="ref-card-thumb-wrap">
            <img src="${imageUrl}" 
                 alt="${escapeHtml(title)}"
                 onerror="this.src='hero-building.jpg'">
          </div>

          <!-- Center Details Column -->
          <div class="ref-card-mid-col">
            <h3 class="ref-project-title">${escapeHtml(title)}</h3>
            <div class="ref-project-location">
              <i class="fa-solid fa-location-dot"></i>
              <span>${escapeHtml(locationText)}</span>
            </div>

            <div class="ref-category-pill ${categoryClass}">
              ${escapeHtml(category)}
            </div>

            <p class="ref-project-desc">${escapeHtml(description)}</p>

            <!-- 3 Specs Row -->
            <div class="ref-specs-row">
              <div class="ref-spec-item">
                <i class="fa-regular fa-building ref-spec-icon"></i>
                <div class="ref-spec-labels">
                  <span class="ref-spec-label">${areaLabel}</span>
                  <strong class="ref-spec-val">${escapeHtml(areaValue)}</strong>
                </div>
              </div>

              <div class="ref-spec-item">
                <i class="fa-solid fa-layer-group ref-spec-icon"></i>
                <div class="ref-spec-labels">
                  <span class="ref-spec-label">Floors</span>
                  <strong class="ref-spec-val">${escapeHtml(floorsValue)}</strong>
                </div>
              </div>

              <div class="ref-spec-item">
                <i class="fa-solid fa-award ref-spec-icon"></i>
                <div class="ref-spec-labels">
                  <span class="ref-spec-label">Quality Tier</span>
                  <strong class="ref-spec-val">${escapeHtml(qualityValue)}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Status, Bids, Action Buttons -->
          <div class="ref-card-right-col">
            <div class="ref-status-pill ${statusObj.class}">
              ${escapeHtml(statusObj.label)}
            </div>

            <div class="ref-right-actions-group">
              <!-- Bids info block -->
              <div class="ref-bids-box">
                <i class="fa-solid fa-gavel ref-bids-gavel"></i>
                <div class="ref-bids-meta">
                  <span class="ref-bids-title-top">Total Bids</span>
                  <span class="ref-bids-big-num" id="cardBidsCount-${p.id}">${bidsCount}</span>
                  <span class="ref-bids-title-bot">Bids Received</span>
                </div>
              </div>

              <!-- Vertical Divider -->
              <div class="ref-vertical-divider"></div>

              <!-- Buttons Column -->
              <div class="ref-buttons-col">
                <button class="btn-ref-details" onclick="openProjectDetailsModal('${projectIdArg}')">
                  View Details <i class="fa-solid fa-arrow-right"></i>
                </button>
                <button class="btn-ref-bids" id="btnToggleBids-${p.id}" onclick="toggleProjectBidsInline('${projectIdArg}')">
                  <i class="fa-solid fa-user-group"></i> View Bids
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Inline View Bids Drawer -->
        <div class="ref-card-bids-drawer" id="projectBidsDrawer-${p.id}" style="display: none;"></div>

        <!-- Bottom Metadata Strip -->
        <div class="ref-card-footer-strip">
          <span>Posted on ${postedDate}</span>
          <span class="ref-strip-dot">•</span>
          <span>Project ID: ${escapeHtml(displayProjectId)}</span>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Bottom Pagination Bar
 */
function renderPagination() {
  const countEl = document.getElementById("showingResultsCount");
  const controlsEl = document.getElementById("paginationControls");

  if (!countEl || !controlsEl) return;

  const totalItems = allProjectsList.length;
  if (totalItems === 0) {
    countEl.textContent = "Showing 0 of 0 projects";
    controlsEl.innerHTML = `
      <button class="btn-page-ctrl" disabled>Previous</button>
      <button class="btn-page-num active">1</button>
      <button class="btn-page-ctrl" disabled>Next</button>
    `;
    return;
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems);

  countEl.textContent = `Showing ${startIndex} to ${endIndex} of ${totalItems} projects`;

  let html = `<button class="btn-page-ctrl" ${currentPage <= 1 ? "disabled" : ""} onclick="changePage(${currentPage - 1})">Previous</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="btn-page-num ${i === currentPage ? "active" : ""}" onclick="changePage(${i})">${i}</button>`;
  }
  html += `<button class="btn-page-ctrl" ${currentPage >= totalPages ? "disabled" : ""} onclick="changePage(${currentPage + 1})">Next</button>`;
  controlsEl.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  renderProjectCards();
  renderPagination();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   4. HELPER FORMATTERS & MAPPINGS
   ========================================================= */
function mapProjectStatus(raw) {
  const s = String(raw || "OPEN").toUpperCase().trim();

  if (s === "OPEN" || s === "ACTIVE" || s === "OPEN FOR BIDS") {
    return { label: "Active", class: "ref-status-active" };
  }
  if (s.includes("REVIEW") || s.includes("PENDING")) {
    return { label: "Under Review", class: "ref-status-under-review" };
  }
  if (s.includes("CLOSE") || s.includes("COMPLET") || s.includes("CANCEL")) {
    return { label: "Closed", class: "ref-status-closed" };
  }
  if (s.includes("PROGRESS")) {
    return { label: "Active", class: "ref-status-active" };
  }
  return { label: capitalize(s), class: "ref-status-default" };
}

function getCategoryBadgeClass(category) {
  const norm = String(category || "").toLowerCase();
  if (norm.includes("new") || norm.includes("construct")) return "ref-cat-new-construction";
  if (norm.includes("renov") || norm.includes("remodel")) return "ref-cat-renovation";
  if (norm.includes("commercial")) return "ref-cat-commercial";
  if (norm.includes("extens")) return "ref-cat-extension";
  return "ref-cat-default";
}

function formatProjectDate(dateInput) {
  if (!dateInput) return "Recently";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return String(dateInput);
  }
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   FLOORS DATA PARSING & FORMATTING (SYSTEMATIC & CLEAN)
   ========================================================= */
function parseFloorsData(rawFloors) {
  if (!rawFloors) {
    return { list: [], summary: "Ground Floor", isRawParsed: false };
  }

  let list = [];
  if (Array.isArray(rawFloors)) {
    list = rawFloors;
  } else if (typeof rawFloors === "object" && rawFloors !== null) {
    if (Array.isArray(rawFloors.floors)) list = rawFloors.floors;
    else if (rawFloors.floorName) list = [rawFloors];
  } else if (typeof rawFloors === "string") {
    const trimmed = rawFloors.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {
        list = [];
      }
    } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed.floors)) list = parsed.floors;
        else if (parsed.floorName) list = [parsed];
      } catch (e) {
        list = [];
      }
    }
  }

  // If we have an array of floor objects:
  if (list.length > 0) {
    const normalizedFloors = list.map((f, idx) => {
      const name = typeof f === "string" ? f : (f.floorName || f.name || `Floor ${idx + 1}`);
      const area = (f && f.approxArea !== undefined && f.approxArea !== null && f.approxArea !== "") 
        ? Number(f.approxArea) 
        : ((f && f.area) ? Number(f.area) : null);
      const rooms = (f && f.rooms && typeof f.rooms === "object") ? f.rooms : null;
      const specialReqs = (f && f.specialRequirements && typeof f.specialRequirements === "string") 
        ? f.specialRequirements.trim() 
        : "";
      return {
        floorName: String(name).trim(),
        approxArea: (area !== null && !isNaN(area)) ? area : null,
        rooms: rooms,
        specialRequirements: specialReqs
      };
    });

    // Check if Ground Floor exists
    const hasGround = normalizedFloors.some(f => /ground|^g$/i.test(f.floorName));
    
    // Find highest upper floor number or count upper floors
    let maxUpperFloor = 0;
    let upperFloorCount = 0;

    normalizedFloors.forEach(f => {
      const lower = f.floorName.toLowerCase();
      if (/ground|^g$/i.test(lower)) {
        // ground floor
      } else {
        upperFloorCount++;
        const match = lower.match(/(\d+)(?:st|nd|rd|th)?\s*floor/i) || lower.match(/floor\s*(\d+)/i) || lower.match(/^(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxUpperFloor) {
            maxUpperFloor = num;
          }
        }
      }
    });

    let summary = "";
    if (hasGround) {
      const upperNum = maxUpperFloor > 0 ? maxUpperFloor : upperFloorCount;
      if (upperNum > 0) {
        summary = `G + ${upperNum}`;
      } else {
        summary = "Ground Floor";
      }
    } else {
      // If there is no ground floor
      if (normalizedFloors.length === 1) {
        summary = normalizedFloors[0].floorName;
      } else if (maxUpperFloor > 0) {
        summary = `${normalizedFloors.length} Floors`;
      } else {
        summary = `${normalizedFloors.length} Floors`;
      }
    }

    return {
      list: normalizedFloors,
      summary: summary,
      isRawParsed: true
    };
  }

  // Handle plain string or number
  const str = String(rawFloors).trim();

  // If string contains raw JSON that failed parsing, fallback safely
  if (str.startsWith("[") || str.startsWith("{")) {
    return { list: [], summary: "Ground Floor", isRawParsed: false };
  }

  // If already "G + X" or "G+X"
  if (/^g\s*\+\s*\d+$/i.test(str)) {
    return { list: [], summary: str.toUpperCase().replace(/\s*\+\s*/, " + "), isRawParsed: false };
  }

  // If pure number string (e.g. "1", "2", "3")
  if (/^\d+$/.test(str)) {
    const n = parseInt(str, 10);
    const summary = n <= 1 ? "Ground Floor" : `G + ${n - 1}`;
    return { list: [], summary: summary, isRawParsed: false };
  }

  return { list: [], summary: str, isRawParsed: false };
}

function getFloorHindi(name) {
  const norm = String(name || "").toLowerCase().trim();
  if (/ground|^g$/i.test(norm)) return "ग्राउंड फ्लोर";
  if (norm.includes("1st") || norm.includes("first")) return "पहली मंज़िल";
  if (norm.includes("2nd") || norm.includes("second")) return "दूसरी मंज़िल";
  if (norm.includes("3rd") || norm.includes("third")) return "तीसरी मंज़िल";
  if (norm.includes("4th") || norm.includes("fourth")) return "चौथी मंज़िल";
  if (norm.includes("5th") || norm.includes("fifth")) return "पांचवीं मंज़िल";
  return "";
}

/* =========================================================
   5. ACTIONS: VIEW DETAILS MODAL & VIEW BIDS NAVIGATION
   ========================================================= */
function openProjectDetailsModal(id) {
  const project = allProjectsList.find(p => String(p.id) === String(id) || String(p.projectId) === String(id));
  if (!project) return;

  const overlay = document.getElementById("projectDetailsModalOverlay");
  const titleEl = document.getElementById("modalProjectTitle");
  const idBadge = document.getElementById("modalProjectIdBadge");
  const catPill = document.getElementById("modalCategoryPill");
  const statusPill = document.getElementById("modalStatusPill");
  const bodyEl = document.getElementById("modalProjectBody");
  const viewBidsBtn = document.getElementById("modalViewBidsBtn");

  const title = project.title || project.projectTitle || "Project Details";
  const category = project.type || project.projectType || project.category || "New Construction";
  const displayId = (project.projectId && String(project.projectId).trim().length > 0)
    ? String(project.projectId).trim()
    : "N/A";
  const statusObj = mapProjectStatus(project.status || project.projectStatus);

  if (titleEl) titleEl.textContent = title;
  if (idBadge) idBadge.textContent = displayId;
  if (catPill) {
    catPill.textContent = category;
    catPill.className = `ref-category-pill ${getCategoryBadgeClass(category)}`;
  }
  if (statusPill) {
    statusPill.textContent = statusObj.label;
    statusPill.className = `ref-status-pill ${statusObj.class}`;
  }

  const locationText = project.city 
    ? `${project.city}${project.state ? ", " + project.state : ""}`
    : (project.location || "Not specified");

  const area = project.plotArea 
    ? `${project.plotArea} sq ft`
    : (project.builtUpArea ? `${project.builtUpArea} sq ft` : (project.totalArea ? `${project.totalArea} sq ft` : "N/A"));

  const floorsInfo = parseFloorsData(project.floors || project.floorsCount);
  const floorsSummary = floorsInfo.summary || "Ground Floor";
  const quality = project.qualityTier || "Standard";
  const budget = project.budget || project.estimatedCost || "Not specified";
  const timeline = project.timeline || project.targetStartDate || "Immediate / Not specified";
  const bidsCount = project.bidsCount || 0;
  const description = project.description || project.scopeOfWork || "No detailed description provided.";

  let floorsBreakdownHtml = "";
  if (floorsInfo.list && floorsInfo.list.length > 0) {
    floorsBreakdownHtml = `
      <div>
        <div class="modal-section-title">Floor Details — मंजिलों का विवरण</div>
        <div class="modal-floors-list">
          ${floorsInfo.list.map(f => {
            const hindi = getFloorHindi(f.floorName);
            const nameDisplay = hindi ? `${escapeHtml(f.floorName)} <span class="modal-floor-hindi">(${hindi})</span>` : escapeHtml(f.floorName);
            const areaDisplay = f.approxArea ? `${Number(f.approxArea).toLocaleString("en-IN")} sq ft` : "";
            
            let roomsDisplay = "";
            if (f.rooms && typeof f.rooms === "object") {
              const active = Object.entries(f.rooms)
                .filter(([_, count]) => count !== null && count !== undefined && Number(count) > 0)
                .map(([rName, count]) => `${rName}: ${count}`);
              if (active.length > 0) roomsDisplay = active.join(" • ");
            }

            return `
              <div class="modal-floor-item">
                <div class="modal-floor-item-header">
                  <span class="modal-floor-name"><i class="fa-solid fa-layer-group"></i> ${nameDisplay}</span>
                  ${areaDisplay ? `<span class="modal-floor-area">Area: <strong>${escapeHtml(areaDisplay)}</strong></span>` : ""}
                </div>
                ${roomsDisplay ? `<div class="modal-floor-rooms"><span class="modal-floor-rooms-label">Rooms:</span> ${escapeHtml(roomsDisplay)}</div>` : ""}
                ${f.specialRequirements ? `<div class="modal-floor-special"><span class="modal-floor-rooms-label">Special Reqs:</span> ${escapeHtml(f.specialRequirements)}</div>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="modal-specs-grid">
        <div class="modal-spec-cell">
          <span class="modal-cell-label">Location — स्थान</span>
          <span class="modal-cell-value">📍 ${escapeHtml(locationText)}</span>
        </div>
        <div class="modal-spec-cell">
          <span class="modal-cell-label">Plot / Built-up Area — क्षेत्रफल</span>
          <span class="modal-cell-value">🏗️ ${escapeHtml(area)}</span>
        </div>
        <div class="modal-spec-cell">
          <span class="modal-cell-label">Floors — मंजिलें</span>
          <span class="modal-cell-value">🏢 ${escapeHtml(floorsSummary)}</span>
        </div>
        <div class="modal-spec-cell">
          <span class="modal-cell-label">Quality Tier — गुणवत्ता स्तर</span>
          <span class="modal-cell-value">⭐ ${escapeHtml(quality)}</span>
        </div>
        <div class="modal-spec-cell">
          <span class="modal-cell-label">Estimated Budget — अनुमानित बजट</span>
          <span class="modal-cell-value">💰 ${escapeHtml(budget)}</span>
        </div>
        <div class="modal-spec-cell">
          <span class="modal-cell-label">Target Timeline — समयावधि</span>
          <span class="modal-cell-value">⏱️ ${escapeHtml(timeline)}</span>
        </div>
        <div class="modal-spec-cell">
          <span class="modal-cell-label">Bids Received — प्राप्त बोलियाँ</span>
          <span class="modal-cell-value">🔨 ${bidsCount} bids</span>
        </div>
        <div class="modal-spec-cell">
          <span class="modal-cell-label">Project ID — प्रोजेक्ट आईडी</span>
          <span class="modal-cell-value">🆔 ${escapeHtml(displayId)}</span>
        </div>
      </div>

      ${floorsBreakdownHtml}

      <div>
        <div class="modal-section-title">Project Scope & Description — विवरण</div>
        <p class="modal-desc-text">${escapeHtml(description)}</p>
      </div>
    `;
  }

  if (viewBidsBtn) {
    viewBidsBtn.onclick = () => {
      closeProjectDetailsModal();
      const targetId = project.id !== undefined && project.id !== null ? project.id : (project.projectId || "");
      const cardEl = document.getElementById(`projectCard-${targetId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toggleProjectBidsInline(targetId, true);
    };
  }

  if (overlay) {
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function closeProjectDetailsModal() {
  const overlay = document.getElementById("projectDetailsModalOverlay");
  if (overlay) {
    overlay.style.display = "none";
    document.body.style.overflow = "";
  }
}

/**
 * View Bids action: Scrolls to and expands the inline bids drawer for this project on the same page
 */
function viewProjectBids(id) {
  closeProjectDetailsModal();
  const project = allProjectsList.find(p => String(p.id) === String(id) || String(p.projectId) === String(id));
  const numericId = project && project.id !== undefined && project.id !== null ? project.id : id;
  const cardEl = document.getElementById(`projectCard-${numericId}`);
  if (cardEl) {
    cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  toggleProjectBidsInline(numericId, true);
}

/* =========================================================
   6. INLINE VIEW BIDS ENGINE & ACTIONS (PHASE 3 TO 22)
   ========================================================= */

// Cache and state management for inline bids
const inlineProjectBidsCache = {};
let inlinePendingAccept = { bidId: null, projectId: null };
let inlinePendingRevoke = { assignmentId: null, projectId: null };
let inlinePendingReassign = { bidId: null, projectId: null };
let isSubmittingInlineAction = false;

function formatBidCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return "₹ " + Number(val).toLocaleString("en-IN");
}

function safeBidText(val, fallback = "Not specified — निर्दिष्ट नहीं") {
  if (val === null || val === undefined || String(val).trim() === "") return fallback;
  return String(val).trim();
}

function formatBidDate(dateStr) {
  if (!dateStr) return "Not available — उपलब्ध नहीं";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return String(dateStr);
  }
}

function formatBidDateTime(dateStr) {
  if (!dateStr) return "Not available — उपलब्ध नहीं";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Status mapping for Phase-3 My Bid lifecycle
 */
function mapBidStatus(rawStatus) {
  const s = String(rawStatus || "").toUpperCase().trim();
  switch (s) {
    case "PENDING":
      return { label: "Under Review — समीक्षा में", badgeClass: "status-pending" };
    case "ACCEPTED":
      return { label: "Accepted — स्वीकृत", badgeClass: "status-accepted" };
    case "NOT_SELECTED":
      return { label: "Not Selected — चयनित नहीं", badgeClass: "status-not-selected" };
    case "ASSIGNMENT_DECLINED":
      return { label: "Contractor Declined — ठेकेदार ने काम करने से मना किया", badgeClass: "status-declined" };
    case "WITHDRAWN":
      return { label: "Withdrawn — वापस ली गई", badgeClass: "status-withdrawn" };
    default:
      return { label: "Under Review — समीक्षा में", badgeClass: "status-pending" };
  }
}

/**
 * Toggles the inline bids drawer inside the project card on the same page
 */
async function toggleProjectBidsInline(projectIdArg, forceOpen = false) {
  const project = allProjectsList.find(p => String(p.id) === String(projectIdArg) || String(p.projectId) === String(projectIdArg));
  const numericId = project && project.id !== undefined && project.id !== null ? project.id : projectIdArg;
  const drawerEl = document.getElementById(`projectBidsDrawer-${numericId}`);
  const toggleBtn = document.getElementById(`btnToggleBids-${numericId}`);

  if (!drawerEl) return;

  const isCurrentlyOpen = drawerEl.style.display !== "none";

  if (isCurrentlyOpen && !forceOpen) {
    drawerEl.style.display = "none";
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fa-solid fa-user-group"></i> View Bids';
      toggleBtn.classList.remove("active-bids-open");
    }
    return;
  }

  drawerEl.style.display = "block";
  if (toggleBtn) {
    toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Hide Bids — बोलियाँ छुपाएं';
    toggleBtn.classList.add("active-bids-open");
  }

  await loadProjectBidsInline(numericId);
}

/**
 * Loads bids and active assignment for a specific project from existing backend APIs
 */
async function loadProjectBidsInline(projectId, successMessage = null) {
  const drawerEl = document.getElementById(`projectBidsDrawer-${projectId}`);
  if (!drawerEl) return;

  drawerEl.innerHTML = `
    <div class="inline-bids-loader">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>Loading bids... — बोलियाँ लोड हो रही हैं...</span>
    </div>
  `;

  try {
    const token = getCleanToken();
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    const [bidsRes, assignmentRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/customer/my-bids/projects/${encodeURIComponent(projectId)}/bids`, {
        method: "GET",
        headers: headers
      }),
      fetch(`${API_BASE_URL}/api/customer/my-bids/projects/${encodeURIComponent(projectId)}/assignment`, {
        method: "GET",
        headers: headers
      })
    ]);

    if (bidsRes.status === 401) {
      renderInlineError(projectId, "Session Expired — सत्र समाप्त हो गया\nPlease log in again to view your bids. — बोलियाँ देखने के लिए कृपया फिर से लॉगिन करें।");
      return;
    }
    if (bidsRes.status === 403) {
      renderInlineError(projectId, "Access Denied — अनुमति नहीं है\nYou do not have permission to view bids for this project. — आपको इस प्रोजेक्ट की बोलियाँ देखने की अनुमति नहीं है।");
      return;
    }
    if (bidsRes.status === 404) {
      renderInlineError(projectId, "Project Not Found — प्रोजेक्ट नहीं मिला\nThe requested project could not be found. — अनुरोधित प्रोजेक्ट नहीं मिला।");
      return;
    }
    if (!bidsRes.ok) {
      renderInlineError(projectId, "Server Error — सर्वर में समस्या\nUnable to load bids at this moment. Please try again. — इस समय बोलियाँ लोड नहीं हो सकीं। कृपया पुन: प्रयास करें।");
      return;
    }

    let activeAssignment = null;
    if (assignmentRes.ok) {
      try {
        const assignData = await assignmentRes.json();
        if (assignData && assignData.id && assignData.isCurrent && assignData.assignmentStatus === "ACTIVE") {
          activeAssignment = assignData;
        }
      } catch (e) {
        activeAssignment = null;
      }
    }

    const bidsData = await bidsRes.json();
    const bids = Array.isArray(bidsData) ? bidsData : [];

    inlineProjectBidsCache[projectId] = { bids, assignment: activeAssignment };

    // Dynamically update card bids count and top statistics
    const cardBidsCountEl = document.getElementById(`cardBidsCount-${projectId}`);
    if (cardBidsCountEl) {
      cardBidsCountEl.textContent = bids.length;
    }
    const proj = allProjectsList.find(p => String(p.id) === String(projectId));
    if (proj) {
      proj.bidsCount = bids.length;
      updateTopStatistics();
    }

    renderInlineBids(projectId, bids, activeAssignment, successMessage);
  } catch (err) {
    console.error("Error fetching inline bids:", err);
    renderInlineError(projectId, "Connection Failed — कनेक्शन नहीं हो पाया\nUnable to reach the server. Please check your network connection. — सर्वर से कनेक्ट नहीं हो पाया। कृपया नेटवर्क जांचें।");
  }
}

/**
 * Renders the inline bids UI: Header, dynamic Lowest/Highest KPI strip, and contractor cards
 */
function renderInlineBids(projectId, bids, activeAssignment, successMessage = null) {
  const drawerEl = document.getElementById(`projectBidsDrawer-${projectId}`);
  if (!drawerEl) return;

  const validAmounts = bids
    .map(b => Number(b.bidAmount))
    .filter(a => !isNaN(a) && a > 0);

  const lowestBid = validAmounts.length > 0 ? Math.min(...validAmounts) : null;
  const highestBid = validAmounts.length > 0 ? Math.max(...validAmounts) : null;
  const totalBids = bids.length;

  const lowestDisplay = lowestBid !== null ? formatBidCurrency(lowestBid) : "—";
  const highestDisplay = highestBid !== null ? formatBidCurrency(highestBid) : "—";

  let successBannerHtml = "";
  if (successMessage) {
    successBannerHtml = `
      <div class="assignment-success-banner">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <strong>Success — सफलता</strong>
          <span>${escapeHtml(successMessage)}</span>
        </div>
      </div>
    `;
  }

  const headerHtml = `
    <div class="inline-bids-header">
      <div class="inline-bids-title-wrap">
        <i class="fa-solid fa-gavel"></i>
        <span class="inline-bids-title">Bids Received — प्राप्त बोलियाँ</span>
        <span class="inline-bids-count-tag">${totalBids} ${totalBids === 1 ? 'Bid' : 'Bids'}</span>
      </div>
      <button type="button" class="btn-inline-close-bids" onclick="toggleProjectBidsInline('${projectId}')" title="Collapse bids">
        <i class="fa-solid fa-chevron-up"></i> Hide — छुपाएं
      </button>
    </div>

    <!-- KPIs Row: Total Bids, Lowest Bid, Highest Bid -->
    <div class="inline-bids-kpis-bar">
      <div class="inline-kpi-card">
        <span class="inline-kpi-sub">Total Bids — कुल बोलियाँ</span>
        <strong class="inline-kpi-value">${totalBids}</strong>
      </div>
      <div class="inline-kpi-card highlight-lowest">
        <span class="inline-kpi-sub">Lowest Bid — सबसे कम बोली</span>
        <strong class="inline-kpi-value">${lowestDisplay}</strong>
      </div>
      <div class="inline-kpi-card highlight-highest">
        <span class="inline-kpi-sub">Highest Bid — सबसे अधिक बोली</span>
        <strong class="inline-kpi-value">${highestDisplay}</strong>
      </div>
    </div>
  `;

  if (totalBids === 0) {
    drawerEl.innerHTML = `
      ${successBannerHtml}
      ${headerHtml}
      <div class="inline-bids-empty">
        <i class="fa-regular fa-folder-open"></i>
        <h4>No bids received yet — अभी तक कोई बोली प्राप्त नहीं हुई</h4>
        <p>When contractors submit bids for this project, they will appear here dynamically. — जब ठेकेदार इस प्रोजेक्ट के लिए बोलियाँ जमा करेंगे, वे यहाँ दिखाई देंगी।</p>
      </div>
    `;
    return;
  }

  const hasActiveAssignment = Boolean(
    activeAssignment &&
    activeAssignment.id &&
    activeAssignment.isCurrent &&
    activeAssignment.assignmentStatus === "ACTIVE"
  );

  const isReopenedProject = !hasActiveAssignment && bids.some(b => 
    b.status === "NOT_SELECTED" || 
    b.status === "ASSIGNMENT_DECLINED" || 
    Boolean(b.rejectedAt)
  );

  const bidsCardsHtml = bids.map(bid => {
    const statusInfo = mapBidStatus(bid.status);
    const contractorInitial = (bid.contractorName || "C").charAt(0).toUpperCase();

    const canAccept = !hasActiveAssignment && !isReopenedProject && (bid.status === "PENDING");
    const canReassign = !hasActiveAssignment && isReopenedProject && (bid.status === "NOT_SELECTED" || bid.status === "PENDING");
    const isCurrentAcceptedBid = (
      bid.status === "ACCEPTED" &&
      hasActiveAssignment &&
      String(activeAssignment.bidId) === String(bid.id)
    );
    const canRevoke = isCurrentAcceptedBid;

    let contactMarkup = "";
    if (bid.contractorContact && (bid.contractorContact.phone || bid.contractorContact.email)) {
      contactMarkup = `
        <div class="contact-authorized-card">
          <div class="detail-item">
            <span class="detail-label"><i class="fa-solid fa-user-check"></i> Contractor Contact — ठेकेदार संपर्क</span>
            <span class="detail-val">${safeBidText(bid.contractorContact.name, bid.contractorName)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label"><i class="fa-solid fa-phone"></i> Phone — फोन</span>
            <span class="detail-val">${safeBidText(bid.contractorContact.phone)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label"><i class="fa-solid fa-envelope"></i> Email — ईमेल</span>
            <span class="detail-val">${safeBidText(bid.contractorContact.email)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label"><i class="fa-solid fa-location-dot"></i> Location — स्थान</span>
            <span class="detail-val">${safeBidText(bid.contractorContact.location)}</span>
          </div>
        </div>
      `;
    } else {
      contactMarkup = `
        <div class="contact-locked-banner">
          <i class="fa-solid fa-lock"></i>
          <span>Contractor Contact — ठेकेदार संपर्क: Details are available after contractor assignment. — कार्य आवंटन के बाद संपर्क विवरण उपलब्ध होगा।</span>
        </div>
      `;
    }

    return `
      <div class="inline-bid-card" id="inlineBidCard-${bid.id}">
        <div class="bid-card-summary">
          <div class="bid-card-header">
            <div class="bid-contractor-meta">
              <div class="bid-avatar">${contractorInitial}</div>
              <div class="bid-contractor-info">
                <h3>${safeBidText(bid.contractorName, "Contractor #" + (bid.contractorId || bid.id))}</h3>
                <div class="bid-submitted-date">
                  Submitted Date — जमा करने की तारीख: ${formatBidDate(bid.submittedAt)}
                  ${bid.status === "ACCEPTED" ? ' • <span class="contractor-selected-tag"><i class="fa-solid fa-circle-check"></i> Accepted Bid — स्वीकृत बोली</span>' : ''}
                </div>
              </div>
            </div>
            <span class="status-pill ${statusInfo.badgeClass}">${statusInfo.label}</span>
          </div>

          <div class="bid-card-kpis">
            <div class="bid-kpi-item">
              <span class="bid-kpi-label">Bid Amount — बोली राशि</span>
              <span class="bid-kpi-val highlight-amount">${formatBidCurrency(bid.bidAmount)}</span>
            </div>
            <div class="bid-kpi-item">
              <span class="bid-kpi-label">Estimated Duration — अनुमानित अवधि</span>
              <span class="bid-kpi-val">${safeBidText(bid.estimatedDuration, "Not specified — निर्दिष्ट नहीं")}</span>
            </div>
            <div class="bid-kpi-item">
              <span class="bid-kpi-label">Proposed Timeline — प्रस्तावित समय-सीमा</span>
              <span class="bid-kpi-val">${safeBidText(bid.proposedTimeline, "Not specified — निर्दिष्ट नहीं")}</span>
            </div>
            <div class="bid-kpi-item">
              <span class="bid-kpi-label">Workers Count — कामगारों की संख्या</span>
              <span class="bid-kpi-val">${bid.workersCount ? bid.workersCount + " workers — कामगार" : "Not specified — निर्दिष्ट नहीं"}</span>
            </div>
          </div>

          <div class="bid-card-actions">
            ${canAccept ? `
              <button type="button" class="btn-accept-bid" onclick="openInlineAcceptModal('${bid.id}', '${projectId}')">
                <i class="fa-solid fa-check"></i> Accept Bid — बोली स्वीकार करें
              </button>
            ` : ''}
            ${canReassign ? `
              <button type="button" class="btn-reassign-bid" onclick="openInlineReassignModal('${bid.id}', '${projectId}')">
                <i class="fa-solid fa-arrows-rotate"></i> Reassign Contractor — दूसरे ठेकेदार को आवंटित करें
              </button>
            ` : ''}
            ${canRevoke ? `
              <button type="button" class="btn-revoke-acceptance" onclick="openInlineRevokeModal('${activeAssignment.id}', '${projectId}')">
                <i class="fa-solid fa-arrow-rotate-left"></i> Take Back Acceptance — स्वीकृति वापस लें
              </button>
            ` : ''}
            <button type="button" class="btn-toggle-details" id="inlineToggleBtn-${bid.id}" onclick="toggleInlineBidDetails('${bid.id}')">
              <i class="fa-solid fa-chevron-down"></i> View Details — विवरण देखें
            </button>
          </div>
        </div>

        <!-- Collapsible Detailed Breakdown Drawer -->
        <div class="bid-card-details" id="inlineBidDetails-${bid.id}" style="display: none;">
          <!-- Financial Breakdown -->
          <div class="bid-details-section">
            <div class="details-section-title">
              <i class="fa-solid fa-coins"></i> Financial Cost Breakdown — वित्तीय लागत विवरण
            </div>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Bid Amount — बोली राशि</span>
                <span class="detail-val" style="font-weight: 700; color: #0284c7;">${formatBidCurrency(bid.bidAmount)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Material Cost — सामग्री लागत</span>
                <span class="detail-val">${formatBidCurrency(bid.materialCost)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Labour Cost — श्रम लागत</span>
                <span class="detail-val">${formatBidCurrency(bid.labourCost)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Equipment Cost — उपकरण लागत</span>
                <span class="detail-val">${formatBidCurrency(bid.equipmentCost)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Transport Cost — परिवहन लागत</span>
                <span class="detail-val">${formatBidCurrency(bid.transportCost)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Other Charges — अन्य शुल्क</span>
                <span class="detail-val">${formatBidCurrency(bid.otherCharges)}</span>
              </div>
            </div>
          </div>

          <!-- Scope and Project Work Information -->
          <div class="bid-details-section">
            <div class="details-section-title">
              <i class="fa-solid fa-list-check"></i> Scope of Work — काम का दायरा
            </div>
            <div class="details-grid-2col">
              <div class="detail-item full-width">
                <span class="detail-label">Scope of Work — काम का दायरा</span>
                <span class="detail-val">${safeBidText(bid.scopeOfWork)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Included Work — शामिल कार्य</span>
                <span class="detail-val">${safeBidText(bid.includedWork)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Excluded Work — गैर-शामिल कार्य</span>
                <span class="detail-val">${safeBidText(bid.excludedWork)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Estimated Duration — अनुमानित अवधि</span>
                <span class="detail-val">${safeBidText(bid.estimatedDuration)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Proposed Timeline — प्रस्तावित समय-सीमा</span>
                <span class="detail-val">${safeBidText(bid.proposedTimeline)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Workers Count — कामगारों की संख्या</span>
                <span class="detail-val">${safeBidText(bid.workersCount)}</span>
              </div>
            </div>
          </div>

          <!-- Commercial Terms -->
          <div class="bid-details-section">
            <div class="details-section-title">
              <i class="fa-solid fa-file-contract"></i> Payment Terms — भुगतान की शर्तें &amp; Warranty — वारंटी
            </div>
            <div class="details-grid-2col">
              <div class="detail-item">
                <span class="detail-label">Payment Terms — भुगतान की शर्तें</span>
                <span class="detail-val">${safeBidText(bid.paymentTerms)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Warranty — वारंटी</span>
                <span class="detail-val">${safeBidText(bid.warranty)}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Remarks — अतिरिक्त जानकारी</span>
                <span class="detail-val">${safeBidText(bid.remarks)}</span>
              </div>
            </div>
          </div>

          <!-- Dates -->
          <div class="bid-details-section">
            <div class="details-section-title">
              <i class="fa-solid fa-calendar-days"></i> Dates — महत्वपूर्ण तारीखें
            </div>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Submitted Date — जमा करने की तारीख</span>
                <span class="detail-val">${formatBidDateTime(bid.submittedAt)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Rejected Date — अस्वीकृति की तारीख</span>
                <span class="detail-val">${bid.rejectedAt ? formatBidDateTime(bid.rejectedAt) : 'N/A — उपलब्ध नहीं'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Visible Until — दृश्यता अवधि</span>
                <span class="detail-val">${bid.visibleUntil ? formatBidDateTime(bid.visibleUntil) : 'N/A — उपलब्ध नहीं'}</span>
              </div>
            </div>
          </div>

          <!-- Contractor Contact Section (Protected) -->
          <div class="bid-details-section">
            <div class="details-section-title">
              <i class="fa-solid fa-address-card"></i> Contractor Contact — ठेकेदार संपर्क
            </div>
            ${contactMarkup}
          </div>
        </div>
      </div>
    `;
  }).join("");

  drawerEl.innerHTML = `
    ${successBannerHtml}
    ${headerHtml}
    <div class="inline-bids-list">
      ${bidsCardsHtml}
    </div>
  `;
}

/**
 * Renders error message inside inline drawer with retry button
 */
function renderInlineError(projectId, errorMsg) {
  const drawerEl = document.getElementById(`projectBidsDrawer-${projectId}`);
  if (!drawerEl) return;
  drawerEl.innerHTML = `
    <div class="inline-bids-error">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <h4>Unable to Load Bids — बोलियाँ लोड नहीं हो सकीं</h4>
      <p>${escapeHtml(errorMsg)}</p>
      <button type="button" class="btn-inline-retry" onclick="loadProjectBidsInline('${projectId}')">
        <i class="fa-solid fa-rotate-right"></i> Retry — पुन: प्रयास करें
      </button>
    </div>
  `;
}

/**
 * Toggles expanded breakdown drawer for a specific contractor bid
 */
function toggleInlineBidDetails(bidId) {
  const detailsEl = document.getElementById(`inlineBidDetails-${bidId}`);
  const toggleBtn = document.getElementById(`inlineToggleBtn-${bidId}`);
  if (!detailsEl || !toggleBtn) return;

  const isHidden = detailsEl.style.display === "none";
  if (isHidden) {
    detailsEl.style.display = "flex";
    toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Hide Details — विवरण छुपाएं';
  } else {
    detailsEl.style.display = "none";
    toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> View Details — विवरण देखें';
  }
}

// =========================================================
// CUSTOMER BID ACCEPTANCE ACTIONS (POST /bids/{bidId}/accept)
// =========================================================

function openInlineAcceptModal(bidId, projectId) {
  const cache = inlineProjectBidsCache[projectId];
  if (!cache || !cache.bids) return;
  const bid = cache.bids.find(b => String(b.id) === String(bidId));
  if (!bid) return;

  inlinePendingAccept = { bidId, projectId };

  const contractorEl = document.getElementById("confirmContractorName");
  const amountEl = document.getElementById("confirmBidAmount");
  const timelineEl = document.getElementById("confirmTimeline");
  const errorEl = document.getElementById("acceptConfirmError");
  const confirmBtn = document.getElementById("btnConfirmAccept");
  const confirmTextEl = document.getElementById("btnConfirmAcceptText");
  const cancelBtn = document.getElementById("btnCancelAccept");
  const overlay = document.getElementById("acceptConfirmModalOverlay");

  if (contractorEl) contractorEl.textContent = safeBidText(bid.contractorName, "Contractor #" + (bid.contractorId || bid.id));
  if (amountEl) amountEl.textContent = formatBidCurrency(bid.bidAmount);
  if (timelineEl) timelineEl.textContent = safeBidText(bid.proposedTimeline || bid.estimatedDuration, "Not specified — निर्दिष्ट नहीं");

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  if (confirmBtn) confirmBtn.disabled = false;
  if (cancelBtn) cancelBtn.disabled = false;
  if (confirmTextEl) confirmTextEl.innerHTML = '<i class="fa-solid fa-check"></i> Confirm &amp; Accept — पुष्टि करें और स्वीकार करें';

  if (overlay) overlay.style.display = "flex";
}

function closeInlineAcceptModal() {
  if (isSubmittingInlineAction) return;
  const overlay = document.getElementById("acceptConfirmModalOverlay");
  if (overlay) overlay.style.display = "none";
  inlinePendingAccept = { bidId: null, projectId: null };
}

async function submitInlineAcceptBid() {
  if (!inlinePendingAccept.bidId || isSubmittingInlineAction) return;

  const { bidId, projectId } = inlinePendingAccept;
  isSubmittingInlineAction = true;

  const confirmBtn = document.getElementById("btnConfirmAccept");
  const confirmTextEl = document.getElementById("btnConfirmAcceptText");
  const cancelBtn = document.getElementById("btnCancelAccept");
  const errorEl = document.getElementById("acceptConfirmError");

  if (confirmBtn) confirmBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;
  if (confirmTextEl) {
    confirmTextEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Accepting bid... — बोली स्वीकार की जा रही है...';
  }
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  try {
    const token = getCleanToken();
    const response = await fetch(`${API_BASE_URL}/api/customer/my-bids/bids/${encodeURIComponent(bidId)}/accept`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });

    if (response.ok) {
      isSubmittingInlineAction = false;
      closeInlineAcceptModal();
      const successNote = "Contractor has been successfully selected for this project. — इस प्रोजेक्ट के लिए ठेकेदार का सफलतापूर्वक चयन कर लिया गया है।";
      await loadProjectBidsInline(projectId, successNote);
      return;
    }

    let errorMsg = "";
    try {
      const errData = await response.json();
      if (errData && errData.error) errorMsg = errData.error;
    } catch {}

    if (response.status === 400) {
      errorMsg = errorMsg || "Invalid state or this bid cannot be accepted. — अमान्य स्थिति या इस बोली को स्वीकार नहीं किया जा सकता।";
    } else if (response.status === 401) {
      errorMsg = "Session Expired — सत्र समाप्त हो गया\nYour session has expired or is invalid. Please log in again.";
    } else if (response.status === 403) {
      errorMsg = "Access Denied — अनुमति नहीं है\nYou do not have permission to accept this bid.";
    } else if (response.status === 409) {
      errorMsg = "Information Changed — जानकारी बदल गई है\nThis project status has changed. Refreshing latest data.";
      await loadProjectBidsInline(projectId);
    } else {
      errorMsg = errorMsg || "Unable to accept bid. Please try again. — बोली स्वीकार करने में असमर्थ। कृपया पुन: प्रयास करें।";
    }

    if (errorEl) {
      errorEl.textContent = errorMsg;
      errorEl.style.display = "block";
    }
  } catch (err) {
    console.error("Accept bid error:", err);
    if (errorEl) {
      errorEl.textContent = "Connection Failed — कनेक्शन नहीं हो पाया\nUnable to reach the server. Please check your network connection.";
      errorEl.style.display = "block";
    }
  } finally {
    isSubmittingInlineAction = false;
    if (confirmBtn) confirmBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    if (confirmTextEl) confirmTextEl.innerHTML = '<i class="fa-solid fa-check"></i> Confirm &amp; Accept — पुष्टि करें और स्वीकार करें';
  }
}

// =========================================================
// CUSTOMER REVOKE ACTIONS (POST /assignments/{id}/revoke)
// =========================================================

function openInlineRevokeModal(assignmentId, projectId) {
  const cache = inlineProjectBidsCache[projectId];
  if (!cache || !cache.assignment || String(cache.assignment.id) !== String(assignmentId)) return;

  inlinePendingRevoke = { assignmentId, projectId };
  const acceptedBid = (cache.bids || []).find(b => String(b.id) === String(cache.assignment.bidId));

  const contractorEl = document.getElementById("revokeContractorName");
  const amountEl = document.getElementById("revokeBidAmount");
  const assignmentEl = document.getElementById("revokeAssignmentId");
  const errorEl = document.getElementById("revokeConfirmError");
  const confirmBtn = document.getElementById("btnConfirmRevoke");
  const confirmTextEl = document.getElementById("btnConfirmRevokeText");
  const cancelBtn = document.getElementById("btnCancelRevoke");
  const overlay = document.getElementById("revokeConfirmModalOverlay");

  const contractorName = acceptedBid 
    ? safeBidText(acceptedBid.contractorName, "Contractor #" + (acceptedBid.contractorId || acceptedBid.id))
    : (cache.assignment.contractor ? safeBidText(cache.assignment.contractor.name) : "Selected Contractor — चयनित ठेकेदार");

  const bidAmount = acceptedBid 
    ? formatBidCurrency(acceptedBid.bidAmount)
    : (cache.assignment.bidAmount ? formatBidCurrency(cache.assignment.bidAmount) : "—");

  if (contractorEl) contractorEl.textContent = contractorName;
  if (amountEl) amountEl.textContent = bidAmount;
  if (assignmentEl) assignmentEl.textContent = "#" + assignmentId;

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  if (confirmBtn) confirmBtn.disabled = false;
  if (cancelBtn) cancelBtn.disabled = false;
  if (confirmTextEl) confirmTextEl.innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i> Confirm &amp; Withdraw — पुष्टि करें और वापस लें';

  if (overlay) overlay.style.display = "flex";
}

function closeInlineRevokeModal() {
  if (isSubmittingInlineAction) return;
  const overlay = document.getElementById("revokeConfirmModalOverlay");
  if (overlay) overlay.style.display = "none";
  inlinePendingRevoke = { assignmentId: null, projectId: null };
}

async function submitInlineRevokeAcceptance() {
  if (!inlinePendingRevoke.assignmentId || isSubmittingInlineAction) return;

  const { assignmentId, projectId } = inlinePendingRevoke;
  isSubmittingInlineAction = true;

  const confirmBtn = document.getElementById("btnConfirmRevoke");
  const confirmTextEl = document.getElementById("btnConfirmRevokeText");
  const cancelBtn = document.getElementById("btnCancelRevoke");
  const errorEl = document.getElementById("revokeConfirmError");

  if (confirmBtn) confirmBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;
  if (confirmTextEl) {
    confirmTextEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Withdrawing acceptance... — स्वीकृति वापस ली जा रही है...';
  }
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  try {
    const token = getCleanToken();
    const response = await fetch(`${API_BASE_URL}/api/customer/my-bids/assignments/${encodeURIComponent(assignmentId)}/revoke`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });

    if (response.ok) {
      isSubmittingInlineAction = false;
      closeInlineRevokeModal();
      const successNote = "Acceptance withdrawn successfully. Project reopened for My Bid selection. — स्वीकृति सफलतापूर्वक वापस ली गई। प्रोजेक्ट चयन के लिए फिर से खुल गया है।";
      await loadProjectBidsInline(projectId, successNote);
      return;
    }

    let errorMsg = "";
    try {
      const errData = await response.json();
      if (errData && errData.error) errorMsg = errData.error;
    } catch {}

    errorMsg = errorMsg || "Unable to withdraw acceptance. Please try again. — स्वीकृति वापस लेने में असमर्थ। कृपया पुन: प्रयास करें।";
    if (errorEl) {
      errorEl.textContent = errorMsg;
      errorEl.style.display = "block";
    }
  } catch (err) {
    console.error("Revoke acceptance error:", err);
    if (errorEl) {
      errorEl.textContent = "Connection Failed — कनेक्शन नहीं हो पाया\nUnable to reach the server. Please check your network connection.";
      errorEl.style.display = "block";
    }
  } finally {
    isSubmittingInlineAction = false;
    if (confirmBtn) confirmBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    if (confirmTextEl) confirmTextEl.innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i> Confirm &amp; Withdraw — पुष्टि करें और वापस लें';
  }
}

// =========================================================
// CUSTOMER REASSIGN ACTIONS (POST /bids/{bidId}/reassign)
// =========================================================

function openInlineReassignModal(bidId, projectId) {
  const cache = inlineProjectBidsCache[projectId];
  if (!cache || !cache.bids) return;
  const bid = cache.bids.find(b => String(b.id) === String(bidId));
  if (!bid) return;

  inlinePendingReassign = { bidId, projectId };

  const contractorEl = document.getElementById("reassignContractorName");
  const amountEl = document.getElementById("reassignBidAmount");
  const durationEl = document.getElementById("reassignDuration");
  const timelineEl = document.getElementById("reassignTimeline");
  const errorEl = document.getElementById("reassignConfirmError");
  const confirmBtn = document.getElementById("btnConfirmReassign");
  const confirmTextEl = document.getElementById("btnConfirmReassignText");
  const cancelBtn = document.getElementById("btnCancelReassign");
  const overlay = document.getElementById("reassignConfirmModalOverlay");

  if (contractorEl) contractorEl.textContent = safeBidText(bid.contractorName, "Contractor #" + (bid.contractorId || bid.id));
  if (amountEl) amountEl.textContent = formatBidCurrency(bid.bidAmount);
  if (durationEl) durationEl.textContent = safeBidText(bid.estimatedDuration, "Not specified — निर्दिष्ट नहीं");
  if (timelineEl) timelineEl.textContent = safeBidText(bid.proposedTimeline, "Not specified — निर्दिष्ट नहीं");

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  if (confirmBtn) confirmBtn.disabled = false;
  if (cancelBtn) cancelBtn.disabled = false;
  if (confirmTextEl) confirmTextEl.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Confirm Reassignment — पुन: आवंटन की पुष्टि करें';

  if (overlay) overlay.style.display = "flex";
}

function closeInlineReassignModal() {
  if (isSubmittingInlineAction) return;
  const overlay = document.getElementById("reassignConfirmModalOverlay");
  if (overlay) overlay.style.display = "none";
  inlinePendingReassign = { bidId: null, projectId: null };
}

async function submitInlineReassignBid() {
  if (!inlinePendingReassign.bidId || isSubmittingInlineAction) return;

  const { bidId, projectId } = inlinePendingReassign;
  isSubmittingInlineAction = true;

  const confirmBtn = document.getElementById("btnConfirmReassign");
  const confirmTextEl = document.getElementById("btnConfirmReassignText");
  const cancelBtn = document.getElementById("btnCancelReassign");
  const errorEl = document.getElementById("reassignConfirmError");

  if (confirmBtn) confirmBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;
  if (confirmTextEl) {
    confirmTextEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reassigning contractor... — ठेकेदार को पुन: आवंटित किया जा रहा है...';
  }
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  try {
    const token = getCleanToken();
    const response = await fetch(`${API_BASE_URL}/api/customer/my-bids/bids/${encodeURIComponent(bidId)}/reassign`, {
      method: "POST",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });

    if (response.ok) {
      isSubmittingInlineAction = false;
      closeInlineReassignModal();
      const successNote = "Contractor reassigned successfully. — ठेकेदार को सफलतापूर्वक पुन: आवंटित किया गया।";
      await loadProjectBidsInline(projectId, successNote);
      return;
    }

    let errorMsg = "";
    try {
      const errData = await response.json();
      if (errData && errData.error) errorMsg = errData.error;
    } catch {}

    errorMsg = errorMsg || "Unable to reassign contractor. Please try again. — पुन: आवंटित करने में असमर्थ। कृपया पुन: प्रयास करें।";
    if (errorEl) {
      errorEl.textContent = errorMsg;
      errorEl.style.display = "block";
    }
  } catch (err) {
    console.error("Reassign bid error:", err);
    if (errorEl) {
      errorEl.textContent = "Connection Failed — कनेक्शन नहीं हो पाया\nUnable to reach the server. Please check your network connection.";
      errorEl.style.display = "block";
    }
  } finally {
    isSubmittingInlineAction = false;
    if (confirmBtn) confirmBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    if (confirmTextEl) confirmTextEl.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Confirm Reassignment — पुन: आवंटन की पुष्टि करें';
  }
}

