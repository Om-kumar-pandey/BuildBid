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

  // Close modal on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
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

    // Floors
    const floorsValue = p.floors || p.floorsCount || "G+1";

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
      <div class="ref-project-card" style="--card-accent: ${accentColor};">
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
                  <span class="ref-bids-big-num">${bidsCount}</span>
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
                <button class="btn-ref-bids" onclick="viewProjectBids('${projectIdArg}')">
                  <i class="fa-solid fa-user-group"></i> View Bids
                </button>
              </div>
            </div>
          </div>
        </div>

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

  const floors = project.floors || project.floorsCount || "G+1";
  const quality = project.qualityTier || "Standard";
  const budget = project.budget || project.estimatedCost || "Not specified";
  const timeline = project.timeline || project.targetStartDate || "Immediate / Not specified";
  const bidsCount = project.bidsCount || 0;
  const description = project.description || project.scopeOfWork || "No detailed description provided.";

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
          <span class="modal-cell-value">🏢 ${escapeHtml(floors)}</span>
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

      <div>
        <div class="modal-section-title">Project Scope & Description — विवरण</div>
        <p class="modal-desc-text">${escapeHtml(description)}</p>
      </div>
    `;
  }

  if (viewBidsBtn) {
    viewBidsBtn.onclick = () => {
      closeProjectDetailsModal();
      viewProjectBids(project.id !== undefined && project.id !== null ? project.id : (project.projectId || ""));
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
 * View Bids button: Navigates to existing My Bids subsystem for this specific project
 */
function viewProjectBids(id) {
  window.location.href = `my-bids.html?projectId=${encodeURIComponent(id)}`;
}
