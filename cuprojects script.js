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
    logoutBtn.dataset.bound = "true";
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      performSelectiveLogout();
      showLogoutToast(() => {
        window.location.href = "index.html";
      });
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
      const bidsEl = document.getElementById("bidsDashboardModalOverlay");
      if (bidsEl && bidsEl.style.display !== "none") {
        closeBidsModal();
        return;
      }
      closeProjectDetailsModal();
    }
  });

  // Close modals on background click
  const modalOverlay = document.getElementById("projectDetailsModalOverlay");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeProjectDetailsModal();
      }
    });
  }

  const bidsDashboardOverlay = document.getElementById("bidsDashboardModalOverlay");
  if (bidsDashboardOverlay) {
    bidsDashboardOverlay.addEventListener("click", (e) => {
      if (e.target === bidsDashboardOverlay) {
        closeBidsModal();
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
}

/**
 * 4 Dynamic Statistic Cards at the top:
 * - Total Projects (कुल प्रोजेक्ट्स)
 * - Total Bids (कुल बोलियां)
 * - Pending Review (समीक्षा लंबित)
 * - Completed Projects (पूरे किए गए प्रोजेक्ट्स)
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

  // Dynamic Completed Projects count based on genuine authoritative status:
  // Count only projects whose authoritative status is COMPLETED or COMPLETE
  const completedProjects = allProjectsList.filter(p => {
    const s = String(p.status || p.projectStatus || "").toUpperCase().trim();
    return s === "COMPLETED" || s === "COMPLETE";
  }).length;

  const statProjEl = document.getElementById("statTotalProjects");
  const statBidsEl = document.getElementById("statTotalBids");
  const statPendingEl = document.getElementById("statPendingReview");
  const statCompletedEl = document.getElementById("statCompletedProjects");

  if (statProjEl) statProjEl.textContent = totalProjects;
  if (statBidsEl) statBidsEl.textContent = totalBids;
  if (statPendingEl) statPendingEl.textContent = pendingReview;
  if (statCompletedEl) statCompletedEl.textContent = completedProjects;
}

/**
 * Renders the project cards stack
 */
function renderProjectCards() {
  const container = document.getElementById("projectCardsContainer");
  const emptyBox = document.getElementById("emptyStateBox");

  if (!container) return;

  if (!allProjectsList || allProjectsList.length === 0) {
    container.innerHTML = "";
    if (emptyBox) emptyBox.style.display = "block";
    return;
  }

  if (emptyBox) emptyBox.style.display = "none";

  container.innerHTML = allProjectsList.map((p, index) => {
    const projectNumber = index + 1;
    const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length];

    const title = p.title || p.projectTitle || "Untitled Project";
    const category = p.type || p.projectType || p.category || "New Construction";
    const categoryClass = getCategoryBadgeClass(category);

    const locationText = p.city 
      ? `${p.city}${p.state ? ", " + p.state : ""}`
      : (p.location || "Location not specified");

    const rawDesc = (p.description !== undefined && p.description !== null && String(p.description).trim().length > 0)
      ? String(p.description).trim()
      : ((p.projectDescription !== undefined && p.projectDescription !== null && String(p.projectDescription).trim().length > 0)
          ? String(p.projectDescription).trim()
          : "");
    const description = rawDesc.length > 0 ? rawDesc : "....";

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
                ${((p.projectId && String(p.projectId).startsWith("HIRE-")) || (p.completeDataJson && String(p.completeDataJson).includes("requestedProfessionals"))) ? `
                  <button class="btn-ref-bids" id="btnViewBids-${p.id}" onclick="window.location.href='requirement-applications.html?projectId=${encodeURIComponent(projectIdArg)}'">
                    <i class="fa-solid fa-users-viewfinder"></i> Review Quotes
                  </button>
                ` : `
                  <button class="btn-ref-bids" id="btnViewBids-${p.id}" onclick="openBidsDashboardModal('${projectIdArg}')">
                    <i class="fa-solid fa-user-group"></i> View Bids
                  </button>
                `}
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
 * Bottom Pagination Bar (Removed per Change 1)
 */
function renderPagination() {
  // Pagination UI removed
}

function changePage(page) {
  // Pagination UI removed
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
      const area = (f && f.declaredAreaSqFt !== undefined && f.declaredAreaSqFt !== null && f.declaredAreaSqFt !== "")
        ? Number(f.declaredAreaSqFt)
        : ((f && f.approxArea !== undefined && f.approxArea !== null && f.approxArea !== "") 
            ? Number(f.approxArea) 
            : ((f && f.area) ? Number(f.area) : null));
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

  let completeData = {};
  if (project.completeDataJson) {
    try {
      completeData = typeof project.completeDataJson === "string" ? JSON.parse(project.completeDataJson) : project.completeDataJson;
    } catch(e) {}
  }

  const floorsInfo = parseFloorsData(project.floors || completeData.floors || project.floorsCount);
  const floorsSummary = floorsInfo.summary || "Ground Floor";
  const quality = project.qualityTier || "Standard";
  const budget = project.budget || project.estimatedCost || "Not specified";
  const timeline = project.timeline || project.targetStartDate || "Immediate / Not specified";
  const bidsCount = project.bidsCount || 0;
  const rawModalDesc = (project.description !== undefined && project.description !== null && String(project.description).trim().length > 0)
    ? String(project.description).trim()
    : ((project.projectDescription !== undefined && project.projectDescription !== null && String(project.projectDescription).trim().length > 0)
        ? String(project.projectDescription).trim()
        : "");
  const description = rawModalDesc.length > 0 ? rawModalDesc : "....";

  const hasBasement = Boolean(project.hasBasement || completeData.hasBasement || project.basementDetails || completeData.basementDetails);
  const basementDetails = project.basementDetails || completeData.basementDetails || {};
  const isFullBasementParking = Boolean(
    project.fullBasementParking === true || 
    completeData.fullBasementParking === true || 
    basementDetails.fullBasementParking === true
  );

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

  let basementBreakdownHtml = "";
  if (hasBasement) {
    const bArea = basementDetails.approxArea || project.basementAreaSqFt || completeData.basementAreaSqFt;
    const bAreaDisplay = bArea ? `${Number(bArea).toLocaleString("en-IN")} sq ft` : "";
    let bRoomsDisplay = "";
    if (basementDetails.rooms && typeof basementDetails.rooms === "object") {
      const active = Object.entries(basementDetails.rooms)
        .filter(([_, count]) => count !== null && count !== undefined && Number(count) > 0)
        .map(([rName, count]) => `${rName}: ${count}`);
      if (active.length > 0) bRoomsDisplay = active.join(" • ");
    }
    const bFeatures = Array.isArray(basementDetails.features) && basementDetails.features.length > 0
      ? basementDetails.features.join(" • ")
      : "";

    basementBreakdownHtml = `
      <div style="margin-top: 14px;">
        <div class="modal-section-title">Basement Details — बेसमेंट का विवरण</div>
        <div class="modal-floors-list">
          <div class="modal-floor-item">
            <div class="modal-floor-item-header">
              <span class="modal-floor-name"><i class="fa-solid fa-dungeon"></i> Basement <span class="modal-floor-hindi">(बेसमेंट)</span></span>
              ${bAreaDisplay ? `<span class="modal-floor-area">Area: <strong>${escapeHtml(bAreaDisplay)}</strong></span>` : ""}
            </div>
            ${isFullBasementParking ? `
              <div class="modal-floor-special" style="margin-top: 6px;">
                <span class="modal-floor-rooms-label" style="color: #0284c7; font-weight: 600;">
                  <i class="fa-solid fa-square-parking"></i> Full Basement Parking / पूरा बेसमेंट पार्किंग:
                </span>
                <strong>Yes / हाँ</strong>
              </div>
            ` : ""}
            ${bRoomsDisplay ? `<div class="modal-floor-rooms"><span class="modal-floor-rooms-label">Spaces:</span> ${escapeHtml(bRoomsDisplay)}</div>` : ""}
            ${bFeatures ? `<div class="modal-floor-special"><span class="modal-floor-rooms-label">Provisions:</span> ${escapeHtml(bFeatures)}</div>` : ""}
            ${basementDetails.specialRequirements ? `<div class="modal-floor-special"><span class="modal-floor-rooms-label">Special Reqs:</span> ${escapeHtml(basementDetails.specialRequirements)}</div>` : ""}
          </div>
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
      ${basementBreakdownHtml}

      <div>
        <div class="modal-section-title">Project Scope & Description — विवरण</div>
        <p class="modal-desc-text">${escapeHtml(description)}</p>
      </div>
    `;
  }

  if (viewBidsBtn) {
    const isHireProject = (project.projectId && String(project.projectId).startsWith("HIRE-")) || 
                          (project.completeDataJson && String(project.completeDataJson).includes("requestedProfessionals"));
    if (isHireProject) {
      viewBidsBtn.innerHTML = `<i class="fa-solid fa-users-viewfinder"></i> Review Applications — प्रोफेशनल्स देखें`;
      viewBidsBtn.onclick = () => {
        closeProjectDetailsModal();
        const targetId = project.projectId || project.id;
        window.location.href = `requirement-applications.html?projectId=${encodeURIComponent(targetId)}`;
      };
    } else {
      viewBidsBtn.innerHTML = `<i class="fa-solid fa-user-group"></i> View Bids — बोलियाँ देखें`;
      viewBidsBtn.onclick = () => {
        closeProjectDetailsModal();
        const targetId = project.id !== undefined && project.id !== null ? project.id : (project.projectId || "");
        openBidsDashboardModal(targetId);
      };
    }
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
 * View Bids action: Opens the View Bids Dashboard modal for this project
 */
function viewProjectBids(id) {
  closeProjectDetailsModal();
  openBidsDashboardModal(id);
}

/* =========================================================
   6. VIEW BIDS POP-OUT DASHBOARD ENGINE & ACTIONS
   ========================================================= */

// Cache and state management for project bids
const inlineProjectBidsCache = {};
let currentModalProjectId = null;
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
 * Opens the View Bids Dashboard pop-out modal for a specific project
 */
async function openBidsDashboardModal(projectIdArg) {
  const project = allProjectsList.find(p => String(p.id) === String(projectIdArg) || String(p.projectId) === String(projectIdArg));
  const numericId = project && project.id !== undefined && project.id !== null ? project.id : projectIdArg;
  currentModalProjectId = String(numericId);

  const overlay = document.getElementById("bidsDashboardModalOverlay");
  const titleEl = document.getElementById("bidsModalProjectTitle");
  const idEl = document.getElementById("bidsModalProjectId");
  const typeEl = document.getElementById("bidsModalProjectType");
  const locEl = document.getElementById("bidsModalProjectLocation");
  const statusEl = document.getElementById("bidsModalProjectStatus");
  const totalBidsEl = document.getElementById("bidsModalTotalBids");
  const lowestBidEl = document.getElementById("bidsModalLowestBid");
  const highestBidEl = document.getElementById("bidsModalHighestBid");
  const successBanner = document.getElementById("bidsModalSuccessBanner");
  const bodyEl = document.getElementById("bidsModalBody");
  const footerCountEl = document.getElementById("bidsModalFooterCount");

  if (!overlay || !bodyEl) return;

  // Populate Header Metadata
  const title = project ? (project.title || project.projectTitle || "Untitled Project") : "Project Bids";
  const displayId = (project && project.projectId && String(project.projectId).trim().length > 0)
    ? String(project.projectId).trim()
    : (project && project.id ? "PRJ-" + project.id : "ID: " + numericId);
  const category = project ? (project.type || project.projectType || project.category || "General Construction") : "Construction";
  const locationText = project 
    ? (project.city ? `${project.city}${project.state ? ", " + project.state : ""}` : (project.location || "Location not specified"))
    : "Location not specified";
  const statusObj = mapProjectStatus(project ? (project.status || project.projectStatus) : "OPEN");

  if (titleEl) titleEl.textContent = title;
  if (idEl) idEl.textContent = displayId;
  if (typeEl) typeEl.textContent = category;
  if (locEl) locEl.textContent = locationText;
  if (statusEl) {
    statusEl.textContent = statusObj.label;
    statusEl.className = "bids-modal-meta-pill status-pill-tag " + statusObj.class;
  }

  // Reset Modal KPIs & Banner for Project Isolation
  if (totalBidsEl) totalBidsEl.textContent = "—";
  if (lowestBidEl) lowestBidEl.textContent = "—";
  if (highestBidEl) highestBidEl.textContent = "—";
  if (footerCountEl) footerCountEl.textContent = "Loading project bids...";
  if (successBanner) {
    successBanner.innerHTML = "";
    successBanner.style.display = "none";
  }

  // Show Loading State
  bodyEl.innerHTML = `
    <div class="bids-modal-loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span class="loading-main">Loading Bids... — बोलियां लोड हो रही हैं...</span>
      <span class="loading-sub">Fetching contractor proposals for this project...</span>
    </div>
  `;

  overlay.style.display = "flex";
  document.body.style.overflow = "hidden";

  await loadProjectBidsForModal(numericId);
}

/**
 * Closes the View Bids Dashboard modal cleanly
 */
function closeBidsModal() {
  const overlay = document.getElementById("bidsDashboardModalOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
  document.body.style.overflow = "";
  currentModalProjectId = null;
}

// Backward-compatibility aliases
function toggleProjectBidsInline(projectIdArg) {
  openBidsDashboardModal(projectIdArg);
}

function loadProjectBidsInline(projectId, successMessage = null) {
  return loadProjectBidsForModal(projectId, successMessage);
}

/**
 * Loads bids and active assignment for a specific project from existing backend APIs
 */
async function loadProjectBidsForModal(projectId, successMessage = null) {
  const bodyEl = document.getElementById("bidsModalBody");
  if (!bodyEl) return;

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

    // Handle authentication / permission errors gracefully
    if (bidsRes.status === 401) {
      renderBidsModalError(projectId, "Session Expired — सत्र समाप्त हो गया\nPlease log in again to view your bids. — बोलियाँ देखने के लिए कृपया फिर से लॉगिन करें।");
      return;
    }
    if (bidsRes.status === 403) {
      renderBidsModalError(projectId, "Access Denied — अनुमति नहीं है\nYou do not have permission to view bids for this project. — आपको इस प्रोजेक्ट की बोलियाँ देखने की अनुमति नहीं है।");
      return;
    }
    if (bidsRes.status === 404) {
      renderBidsModalError(projectId, "Project Not Found — प्रोजेक्ट नहीं मिला\nThe requested project could not be found. — अनुरोधित प्रोजेक्ट नहीं मिला।");
      return;
    }
    if (!bidsRes.ok) {
      renderBidsModalError(projectId, "Server Error — सर्वर में समस्या\nUnable to load bids at this moment. Please try again. — इस समय बोलियाँ लोड नहीं हो सकीं। कृपया पुन: प्रयास करें।");
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

    // Update card bids count and top statistics (maintaining aggregate Top My Projects KPI)
    const cardBidsCountEl = document.getElementById(`cardBidsCount-${projectId}`);
    if (cardBidsCountEl) {
      cardBidsCountEl.textContent = bids.length;
    }
    const proj = allProjectsList.find(p => String(p.id) === String(projectId));
    if (proj) {
      proj.bidsCount = bids.length;
      updateTopStatistics();
    }

    // Verify user is still viewing this project modal before rendering (prevents race conditions)
    if (currentModalProjectId !== String(projectId)) return;

    renderBidsModalContent(projectId, bids, activeAssignment, successMessage);
  } catch (err) {
    console.error("Error fetching modal bids:", err);
    renderBidsModalError(projectId, "Connection Failed — कनेक्शन नहीं हो पाया\nUnable to reach the server. Please check your network connection. — सर्वर से कनेक्ट नहीं हो पाया। कृपया नेटवर्क जांचें।");
  }
}

/**
 * Renders the pop-out modal content: dynamic Lowest/Highest/Total KPI strip, and all contractor cards
 */
function renderBidsModalContent(projectId, bids, activeAssignment, successMessage = null) {
  const bodyEl = document.getElementById("bidsModalBody");
  const totalBidsEl = document.getElementById("bidsModalTotalBids");
  const lowestBidEl = document.getElementById("bidsModalLowestBid");
  const highestBidEl = document.getElementById("bidsModalHighestBid");
  const footerCountEl = document.getElementById("bidsModalFooterCount");
  const bannerEl = document.getElementById("bidsModalSuccessBanner");

  if (!bodyEl) return;

  // Dynamic KPI Calculations for THIS PROJECT ONLY
  const validAmounts = bids
    .map(b => Number(b.bidAmount))
    .filter(a => !isNaN(a) && a > 0);

  const lowestBid = validAmounts.length > 0 ? Math.min(...validAmounts) : null;
  const highestBid = validAmounts.length > 0 ? Math.max(...validAmounts) : null;
  const totalBids = bids.length;

  const lowestDisplay = lowestBid !== null ? formatBidCurrency(lowestBid) : "—";
  const highestDisplay = highestBid !== null ? formatBidCurrency(highestBid) : "—";

  if (totalBidsEl) totalBidsEl.textContent = totalBids;
  if (lowestBidEl) lowestBidEl.textContent = lowestDisplay;
  if (highestBidEl) highestBidEl.textContent = highestDisplay;

  if (footerCountEl) {
    footerCountEl.textContent = totalBids === 1
      ? "Showing 1 bid for this project — इस प्रोजेक्ट की 1 बोली"
      : `Showing all ${totalBids} bids for this project — इस प्रोजेक्ट की कुल ${totalBids} बोलियाँ`;
  }

  // Success Banner
  if (bannerEl) {
    if (successMessage) {
      bannerEl.innerHTML = `
        <div class="bids-modal-success-banner">
          <i class="fa-solid fa-circle-check"></i>
          <div>
            <strong>Success — सफलता</strong>
            <span>${escapeHtml(successMessage)}</span>
          </div>
        </div>
      `;
      bannerEl.style.display = "block";
    } else {
      bannerEl.innerHTML = "";
      bannerEl.style.display = "none";
    }
  }

  // Handle 0 Bids cleanly
  if (totalBids === 0) {
    bodyEl.innerHTML = `
      <div class="bids-modal-empty">
        <div class="empty-icon-circle">
          <i class="fa-regular fa-folder-open"></i>
        </div>
        <h3>No bids received yet — अभी तक कोई बोली प्राप्त नहीं हुई</h3>
        <p>When contractors review your project specifications and submit competitive bids, they will appear here in real-time. — जब ठेकेदार आपके प्रोजेक्ट की समीक्षा करेंगे और बोलियाँ प्रस्तुत करेंगे, वे यहाँ दिखाई देंगी।</p>
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

  // Render ALL Bids (No artificial pagination or truncation)
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

  bodyEl.innerHTML = `
    <div class="inline-bids-list">
      ${bidsCardsHtml}
    </div>
  `;
}

/**
 * Renders error message inside modal with retry button
 */
function renderBidsModalError(projectId, errorMsg) {
  const bodyEl = document.getElementById("bidsModalBody");
  const totalBidsEl = document.getElementById("bidsModalTotalBids");
  const lowestBidEl = document.getElementById("bidsModalLowestBid");
  const highestBidEl = document.getElementById("bidsModalHighestBid");
  const footerCountEl = document.getElementById("bidsModalFooterCount");

  if (totalBidsEl) totalBidsEl.textContent = "—";
  if (lowestBidEl) lowestBidEl.textContent = "—";
  if (highestBidEl) highestBidEl.textContent = "—";
  if (footerCountEl) footerCountEl.textContent = "Error loading bids";

  if (!bodyEl) return;
  bodyEl.innerHTML = `
    <div class="bids-modal-error">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <h3>Unable to Load Bids — बोलियाँ लोड नहीं हो सकीं</h3>
      <p>${escapeHtml(errorMsg)}</p>
      <button type="button" class="btn-bids-retry" onclick="loadProjectBidsForModal('${projectId}')">
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
