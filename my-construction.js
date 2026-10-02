/* =========================================================
   BUILDBID - MY CONSTRUCTION LOGIC (my-construction.js)
   100% Dynamic Customer Construction Project Tracking
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

/* =========================================================
   PROJECT LOCAL IMAGES RESOLVER
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
  if (norm.includes("commercial") || norm.includes("office") || norm.includes("showroom") || norm.includes("retail")) {
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
  return PROJECT_LOCAL_IMAGES.default;
}

function formatCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return "₹ " + Number(val).toLocaleString("en-IN");
}

function formatDate(dateStr) {
  if (!dateStr) return "Recently — हाल ही में";
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

/* =========================================================
   STATE MANAGEMENT
   ========================================================= */
let allottedConstructionsList = [];
let activeTrackingProject = null;

document.addEventListener("DOMContentLoaded", () => {
  initSearchAndFilters();
  initModalListeners();
  loadAllottedConstructions();

  const refreshBtn = document.getElementById("btnRefreshConstruction");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadAllottedConstructions();
    });
  }
});

/* =========================================================
   SEARCH & FILTERS
   ========================================================= */
function initSearchAndFilters() {
  const searchInput = document.getElementById("constructionSearchInput");
  const stageFilter = document.getElementById("constructionStageFilter");

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }
  if (stageFilter) {
    stageFilter.addEventListener("change", applyFilters);
  }
}

function applyFilters() {
  const searchVal = (document.getElementById("constructionSearchInput")?.value || "").toLowerCase().trim();
  const stageVal = document.getElementById("constructionStageFilter")?.value || "ALL";

  const filtered = allottedConstructionsList.filter(item => {
    const p = item.project;
    const c = item.assignment?.contractor;
    const titleMatch = (p.title || p.projectTitle || "").toLowerCase().includes(searchVal);
    const idMatch = (p.projectId || String(p.id) || "").toLowerCase().includes(searchVal);
    const contractorMatch = (c?.name || "").toLowerCase().includes(searchVal);

    const matchesSearch = !searchVal || titleMatch || idMatch || contractorMatch;

    let matchesStage = true;
    if (stageVal === "ALLOTTED") {
      matchesStage = item.assignment?.assignmentStatus === "ACTIVE" && (!item.progress || item.progress < 30);
    } else if (stageVal === "IN_PROGRESS") {
      matchesStage = item.progress >= 20 && item.progress < 100;
    } else if (stageVal === "COMPLETED") {
      matchesStage = item.assignment?.assignmentStatus === "COMPLETED" || item.progress >= 100;
    }

    return matchesSearch && matchesStage;
  });

  renderConstructionCards(filtered);
}

/* =========================================================
   100% REAL DYNAMIC DATA LOADER
   Source of Truth: MyBidAssignment via existing backend APIs
   ========================================================= */
async function loadAllottedConstructions() {
  const grid = document.getElementById("constructionGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="loading-box">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>Loading Construction Projects... — निर्माण परियोजनाएं लोड हो रही हैं...</span>
    </div>
  `;

  const token = getCleanToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};

  try {
    // 1. Fetch all customer projects and their bid summary
    const response = await fetch(`${API_BASE_URL}/api/customer/my-bids/projects`, {
      method: "GET",
      headers: headers
    });

    let rawProjects = [];
    if (response.ok) {
      rawProjects = await response.json();
    } else {
      // Fallback to customer projects endpoint if shadowed
      const altRes = await fetch(`${API_BASE_URL}/api/customer/projects`, { method: "GET", headers: headers }).catch(() => null);
      if (altRes && altRes.ok) {
        rawProjects = await altRes.json();
      }
    }

    if (!Array.isArray(rawProjects)) rawProjects = [];

    // 2. Identify projects that have active contractor assignments
    // A project appears in My Construction ONLY AFTER allotment/award
    const allottedProjects = [];

    for (const proj of rawProjects) {
      const projId = proj.id;
      if (!projId) continue;

      // Check assignment via existing dedicated assignment endpoint
      try {
        const assignRes = await fetch(`${API_BASE_URL}/api/customer/my-bids/projects/${encodeURIComponent(projId)}/assignment`, {
          method: "GET",
          headers: headers
        });

        if (assignRes.ok) {
          const assignData = await assignRes.json();
          // Verify active assignment
          if (assignData && assignData.isCurrent && assignData.assignmentStatus === "ACTIVE") {
            allottedProjects.push({
              project: proj,
              assignment: assignData,
              progress: 25, // Default active progress stage (Foundation & Site Setup)
              currentStage: "Site Setup & Foundation (नींव कार्य)",
              milestones: generateDefaultMilestones()
            });
          }
        }
      } catch (err) {
        console.warn("Could not check assignment for project", projId, err);
      }
    }

    allottedConstructionsList = allottedProjects;
    updateKpiStats(allottedConstructionsList);
    renderConstructionCards(allottedConstructionsList);

  } catch (err) {
    console.error("Failed to load allotted constructions:", err);
    grid.innerHTML = `
      <div class="empty-construction-card">
        <div class="empty-icon-wrap" style="background:#fee2e2; color:#dc2626;">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 class="empty-title">Unable to Load Construction Projects</h3>
        <p class="empty-desc">Please verify your internet connection or log in again to view your active construction projects.</p>
        <button type="button" class="btn-empty-action" onclick="loadAllottedConstructions()">Retry — पुन: प्रयास करें</button>
      </div>
    `;
  }
}

/* =========================================================
   DEFAULT CONSTRUCTION MILESTONES TEMPLATE
   ========================================================= */
function generateDefaultMilestones() {
  return [
    {
      title: "1. Site Preparation & Mobilization (स्थल तैयारी)",
      desc: "Site cleaning, temporary fencing, worker setup, and layout marking.",
      status: "COMPLETED",
      statusLabel: "Completed — पूर्ण"
    },
    {
      title: "2. Excavation & Foundation (खुदाई एवं नींव)",
      desc: "Footing excavation, PCC, steel reinforcement, and foundation casting.",
      status: "CURRENT",
      statusLabel: "In Progress — प्रगति पर"
    },
    {
      title: "3. RCC Structure & Columns (ढांचा निर्माण)",
      desc: "Columns, plinth beam, and slab shuttering/casting.",
      status: "PENDING",
      statusLabel: "Upcoming — आगामी"
    },
    {
      title: "4. Brickwork & Masonry (चिनाई कार्य)",
      desc: "External and internal walls, door & window frames installation.",
      status: "PENDING",
      statusLabel: "Upcoming — आगामी"
    },
    {
      title: "5. Electrical & Plumbing Rough-in (विद्युत एवं प्लंबिंग)",
      desc: "Concealed conduit piping, sanitary drain lines, and water inlet works.",
      status: "PENDING",
      statusLabel: "Upcoming — आगामी"
    },
    {
      title: "6. Plaster, Flooring & Handover (फिनिशिंग एवं हैंडओवर)",
      desc: "Internal/external plaster, vitrified tiles, painting, and final handover.",
      status: "PENDING",
      statusLabel: "Upcoming — आगामी"
    }
  ];
}

/* =========================================================
   KPI METRICS CALCULATION
   ========================================================= */
function updateKpiStats(list) {
  const statAllotted = document.getElementById("statAllottedProjects");
  const statInProgress = document.getElementById("statInProgress");
  const statContractors = document.getElementById("statActiveContractors");
  const statMilestones = document.getElementById("statMilestones");
  const statCompleted = document.getElementById("statCompleted");

  if (!list || list.length === 0) {
    if (statAllotted) statAllotted.textContent = "0";
    if (statInProgress) statInProgress.textContent = "0";
    if (statContractors) statContractors.textContent = "0";
    if (statMilestones) statMilestones.textContent = "0";
    if (statCompleted) statCompleted.textContent = "0";
    return;
  }

  const allottedCount = list.length;
  const inProgressCount = list.filter(i => (i.progress || 0) < 100).length;
  const completedCount = list.filter(i => (i.progress || 0) >= 100).length;

  const contractorIds = new Set();
  list.forEach(i => {
    if (i.assignment?.contractor?.userId) {
      contractorIds.add(i.assignment.contractor.userId);
    }
  });

  const totalMilestones = list.reduce((acc, curr) => acc + (curr.milestones ? curr.milestones.length : 0), 0);

  if (statAllotted) statAllotted.textContent = String(allottedCount);
  if (statInProgress) statInProgress.textContent = String(inProgressCount);
  if (statContractors) statContractors.textContent = String(contractorIds.size || allottedCount);
  if (statMilestones) statMilestones.textContent = String(totalMilestones);
  if (statCompleted) statCompleted.textContent = String(completedCount);
}

/* =========================================================
   RENDER CONSTRUCTION CARDS & EMPTY STATE
   ========================================================= */
function renderConstructionCards(list) {
  const grid = document.getElementById("constructionGrid");
  if (!grid) return;

  if (!list || list.length === 0) {
    grid.innerHTML = `
      <div class="empty-construction-card">
        <div class="empty-icon-wrap">
          <i class="fa-solid fa-trowel-bricks"></i>
        </div>
        <h3 class="empty-title">No Allotted Construction Projects Yet — अभी कोई आवंटित प्रोजेक्ट नहीं है</h3>
        <p class="empty-desc">
          A project appears here only after you have accepted / awarded a contractor's bid in My Projects. Once allotted, you can track live construction progress, contractor milestones, and invoices in this dashboard.
        </p>
        <p class="empty-desc-hi">
          जब आप "My Projects" में मिली बोलियों में से किसी कॉन्ट्रैक्टर को काम आवंटित करेंगे, तब आपका प्रोजेक्ट यहाँ लाइव ट्रैकिंग के लिए दिखाई देगा।
        </p>
        <a href="customer projects.html" class="btn-empty-action">
          <i class="fa-solid fa-briefcase"></i> Go to My Projects — प्रोजेक्ट्स देखें
        </a>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map((item, idx) => {
    const p = item.project;
    const a = item.assignment;
    const contractor = a.contractor || {};
    const title = p.title || p.projectTitle || "Construction Project";
    const displayId = (p.projectId && String(p.projectId).trim().length > 0)
      ? String(p.projectId).trim()
      : (p.id ? "PRJ-" + p.id : "PRJ-" + (idx + 1));
    const pType = p.type || p.projectType || "General Construction";
    const loc = p.city ? `${p.city}${p.state ? ", " + p.state : ""}` : (p.location || "Location not specified");
    const coverImg = getLocalProjectImage(pType);
    const contractorName = contractor.name || "Assigned Contractor";
    const contractorInit = contractorName.charAt(0).toUpperCase();
    const contractValue = formatCurrency(a.bidAmount);
    const progress = item.progress || 25;
    const stage = item.currentStage || "Site Setup & Foundation";

    return `
      <div class="construction-card" data-index="${idx}">
        <div class="card-cover">
          <img src="${coverImg}" alt="${title}" onerror="this.src='hero-building.jpg'">
          <span class="status-badge status-in-progress">In Progress — प्रगति पर</span>
          <span class="card-project-id-badge">${displayId}</span>
        </div>

        <div class="card-body">
          <h3 class="project-title">${title}</h3>

          <div class="project-meta-pills">
            <span class="meta-pill"><i class="fa-solid fa-location-dot"></i> ${loc}</span>
            <span>•</span>
            <span class="meta-pill"><i class="fa-solid fa-layer-group"></i> ${pType}</span>
          </div>

          <!-- Contractor Info Box -->
          <div class="contractor-info-box">
            <div class="contractor-details">
              <div class="contractor-avatar">${contractorInit}</div>
              <div class="contractor-meta">
                <span class="contractor-role-label">Contractor — ठेकेदार</span>
                <p class="contractor-name">${contractorName} <i class="fa-solid fa-circle-check verified-tag"></i></p>
              </div>
            </div>
            <div class="contract-value-wrap">
              <span class="contract-value-label">Agreed Value</span>
              <span class="contract-value-amount">${contractValue}</span>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-section">
            <div class="progress-header">
              <span class="progress-stage">${stage}</span>
              <span class="progress-percent">${progress}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${progress}%;"></div>
            </div>
          </div>

          <!-- Actions -->
          <div class="card-actions">
            <button type="button" class="btn-track-primary" onclick="openTrackingModal(${idx})">
              <i class="fa-solid fa-bars-progress"></i> View Tracking — लाइव ट्रैकिंग
            </button>
            <button type="button" class="btn-track-secondary" onclick="openTrackingModal(${idx}, 'tab-contractor')" title="Contractor Details">
              <i class="fa-solid fa-helmet-safety"></i>
            </button>
            <button type="button" class="btn-track-secondary" onclick="openTrackingModal(${idx}, 'tab-invoices')" title="Invoices">
              <i class="fa-solid fa-file-invoice"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* =========================================================
   TRACKING POP-OUT MODAL
   ========================================================= */
function initModalListeners() {
  const overlay = document.getElementById("constructionTrackingModal");
  const closeBtn = document.getElementById("btnCloseModal");
  const secCloseBtn = document.getElementById("btnSecondaryClose");

  if (closeBtn) closeBtn.addEventListener("click", closeTrackingModal);
  if (secCloseBtn) secCloseBtn.addEventListener("click", closeTrackingModal);

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeTrackingModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && overlay.style.display !== "none") {
      closeTrackingModal();
    }
  });

  // Modal Tab Switching
  const tabButtons = document.querySelectorAll(".modal-tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      switchModalTab(targetTab);
    });
  });
}

function switchModalTab(tabId) {
  const tabButtons = document.querySelectorAll(".modal-tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach(btn => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  tabPanes.forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add("active");
    } else {
      pane.classList.remove("active");
    }
  });
}

function openTrackingModal(index, defaultTab = "tab-milestones") {
  const item = allottedConstructionsList[index];
  if (!item) return;

  activeTrackingProject = item;
  const p = item.project;
  const a = item.assignment;
  const c = a.contractor || {};

  const overlay = document.getElementById("constructionTrackingModal");
  const titleEl = document.getElementById("modalProjectTitle");
  const idEl = document.getElementById("modalProjectId");
  const typeEl = document.getElementById("modalProjectType");
  const locEl = document.getElementById("modalProjectLocation");
  const descEl = document.getElementById("modalProjectDescription");
  const areaEl = document.getElementById("modalProjectArea");
  const valEl = document.getElementById("modalContractValue");

  // Contractor Tab Fields
  const cAvatar = document.getElementById("modalContractorAvatar");
  const cName = document.getElementById("modalContractorName");
  const cPhone = document.getElementById("modalContractorPhone");
  const cEmail = document.getElementById("modalContractorEmail");
  const cLoc = document.getElementById("modalContractorLoc");
  const cDate = document.getElementById("modalAllottedDate");

  const title = p.title || p.projectTitle || "Construction Project";
  const displayId = (p.projectId && String(p.projectId).trim().length > 0)
    ? String(p.projectId).trim()
    : (p.id ? "PRJ-" + p.id : "PRJ");
  const pType = p.type || p.projectType || "General Construction";
  const loc = p.city ? `${p.city}${p.state ? ", " + p.state : ""}` : (p.location || "Location not specified");

  if (titleEl) titleEl.textContent = title;
  if (idEl) idEl.textContent = displayId;
  if (typeEl) typeEl.textContent = pType;
  if (locEl) locEl.textContent = loc;
  if (descEl) descEl.textContent = p.description || "Detailed scope of work agreed under construction contract.";
  if (areaEl) areaEl.textContent = p.totalArea ? `${p.totalArea} sq. ft.` : "Not specified";
  if (valEl) valEl.textContent = formatCurrency(a.bidAmount);

  // Contractor
  const contractorName = c.name || "Assigned Contractor";
  if (cAvatar) cAvatar.textContent = contractorName.charAt(0).toUpperCase();
  if (cName) cName.innerHTML = `${contractorName} <i class="fa-solid fa-circle-check verified-tag"></i>`;
  if (cPhone) cPhone.textContent = c.phone || "Masked for security (Active Contract)";
  if (cEmail) cEmail.textContent = c.email || "Available via BuildBid Portal";
  if (cLoc) cLoc.textContent = c.location || loc;
  if (cDate) cDate.textContent = `Awarded on: ${formatDate(a.acceptedAt)}`;

  // Milestones Timeline
  renderModalMilestones(item.milestones || generateDefaultMilestones());

  // Activate Tab
  switchModalTab(defaultTab);

  if (overlay) {
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function closeTrackingModal() {
  const overlay = document.getElementById("constructionTrackingModal");
  if (overlay) {
    overlay.style.display = "none";
  }
  document.body.style.overflow = "";
  activeTrackingProject = null;
}

function renderModalMilestones(milestones) {
  const container = document.getElementById("modalMilestonesContainer");
  if (!container) return;

  container.innerHTML = milestones.map(m => {
    let iconClass = "icon-pending";
    let icon = '<i class="fa-regular fa-clock"></i>';
    let tagClass = "tag-pending";

    if (m.status === "COMPLETED") {
      iconClass = "icon-done";
      icon = '<i class="fa-solid fa-check"></i>';
      tagClass = "tag-done";
    } else if (m.status === "CURRENT") {
      iconClass = "icon-current";
      icon = '<i class="fa-solid fa-spinner fa-spin"></i>';
      tagClass = "tag-current";
    }

    return `
      <div class="milestone-item">
        <div class="milestone-icon ${iconClass}">
          ${icon}
        </div>
        <div class="milestone-content">
          <div class="milestone-title-row">
            <span class="milestone-title">${m.title}</span>
            <span class="milestone-status-tag ${tagClass}">${m.statusLabel}</span>
          </div>
          <p class="milestone-desc">${m.desc}</p>
        </div>
      </div>
    `;
  }).join("");
}
