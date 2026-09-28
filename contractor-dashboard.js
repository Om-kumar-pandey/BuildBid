/**
 * Contractor Dashboard - Dynamic Engine
 * Connects directly to authoritative backend projects API
 */

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

// 1. Current Logged-in Contractor Fetch
function getLoggedInContractor() {
  const rawData = localStorage.getItem("currentUser") ||
                  localStorage.getItem("loggedInUser") ||
                  sessionStorage.getItem("currentUser");

  if (!rawData) {
    alert("Please log in with a contractor account first!");
    window.location.href = "index.html";
    return null;
  }

  const user = JSON.parse(rawData);

  // Validate Contractor Role
  const userRole = (user.role || (user.roles && user.roles[0]) || "").toUpperCase();
  if (userRole && userRole !== "CONTRACTOR") {
    alert("Access Denied: This dashboard is reserved for Contractors only!");
    window.location.href = "index.html";
    return null;
  }

  return user;
}

// 2. Render Profile & Dynamic Stats
function renderContractorDashboard(user) {
  if (!user) return;

  const displayName = user.name || user.companyName || user.username || "Contractor";

  // Dynamic Initials ('HK')
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "C";

  // Top Bar Details
  const topNavName = document.getElementById("top-nav-name");
  if (topNavName) topNavName.textContent = displayName;

  const topNavBadge = document.getElementById("top-nav-badge");
  if (topNavBadge) topNavBadge.textContent = "Verified Contractor";

  // Banner Details
  const bannerName = document.getElementById("banner-contractor-name");
  if (bannerName) {
    bannerName.innerHTML = `${escapeHTML(displayName)} <i class="fa-solid fa-circle-check verified-icon"></i>`;
  }

  const bannerTagline = document.getElementById("banner-contractor-tagline");
  if (bannerTagline) {
    bannerTagline.textContent = "Contractor";
  }

  const bannerLocation = document.getElementById("banner-location");
  if (bannerLocation) {
    bannerLocation.textContent = user.location || user.city || "Greater Noida, UP";
  }

  const bannerPhone = document.getElementById("banner-phone");
  if (bannerPhone) {
    bannerPhone.textContent = user.phone ? `+91 ${user.phone}` : "Not Provided";
  }

  const bannerEmail = document.getElementById("banner-email");
  if (bannerEmail) {
    bannerEmail.textContent = user.email || "Not Provided";
  }

  const logoText = document.getElementById("banner-logo-text");
  if (logoText) logoText.textContent = initials;

  // Real Dynamic Stats
  const stats = user.stats || {};
  const completedProjects = stats.completedProjects ?? 0;
  const totalEarnings = stats.totalEarnings ? `₹${stats.totalEarnings}` : "₹0";
  const rating = stats.rating ? stats.rating : "0.0";
  const reviewsCount = stats.reviewsCount ?? 0;
  const totalBids = stats.totalBids ?? 0;
  const activeBids = stats.activeBids ?? 0;
  const projectsWon = stats.projectsWon ?? 0;
  const responseRate = stats.responseRate || "0%";
  const onTimeDelivery = stats.onTimeDelivery || "0%";

  // Banner right-side metrics
  const bRating = document.getElementById("banner-rating");
  if (bRating) bRating.textContent = rating;
  const bReviews = document.getElementById("banner-reviews-count");
  if (bReviews) bReviews.textContent = `(${reviewsCount} Reviews)`;
  const bComp = document.getElementById("banner-completed-projects");
  if (bComp) bComp.textContent = completedProjects;
  const bEarn = document.getElementById("banner-total-earnings");
  if (bEarn) bEarn.textContent = totalEarnings;

  // KPI Grid Cards
  const sTotBids = document.getElementById("stat-total-bids");
  if (sTotBids) sTotBids.textContent = totalBids;
  const sActBids = document.getElementById("stat-active-bids");
  if (sActBids) sActBids.textContent = activeBids;
  const sWon = document.getElementById("stat-projects-won");
  if (sWon) sWon.textContent = projectsWon;
  const sTotEarn = document.getElementById("stat-total-earnings");
  if (sTotEarn) sTotEarn.textContent = totalEarnings;

  // Sidebar Badges
  const badgeBids = document.getElementById("nav-badge-bids");
  if (badgeBids) badgeBids.textContent = activeBids;

  const badgeContracts = document.getElementById("nav-badge-contracts");
  if (badgeContracts) badgeContracts.textContent = projectsWon;

  // Performance Column
  const pResp = document.getElementById("perf-response-rate");
  if (pResp) pResp.textContent = responseRate;
  const pComp = document.getElementById("perf-projects-completed");
  if (pComp) pComp.textContent = completedProjects;
  const pOnTime = document.getElementById("perf-ontime-delivery");
  if (pOnTime) pOnTime.textContent = onTimeDelivery;
  const pRating = document.getElementById("perf-rating");
  if (pRating) pRating.textContent = rating === "0.0" ? "0 / 5" : `${rating} / 5`;
}

// 3. Customer Projects Feed (Authoritative Backend State)
let cachedContractorProjects = [];
let isFetchingProjects = false;

async function loadContractorProjects() {
  if (isFetchingProjects) return;
  isFetchingProjects = true;

  const container = document.getElementById("projects-list");
  const token = getCleanToken();

  if (container && (!cachedContractorProjects || cachedContractorProjects.length === 0)) {
    container.innerHTML = `
      <div style="background:#ffffff; border-radius:8px; padding: 2.5rem; text-align:center; color:#64748b;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:#0284c7; margin-bottom:10px;"></i>
        <p style="font-size:0.9rem; margin:0;">Loading live customer projects from database...</p>
      </div>
    `;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/contractor/projects`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }
    });

    if (response.ok) {
      const data = await response.json();
      cachedContractorProjects = Array.isArray(data) ? data : [];
    } else if (response.status === 401) {
      console.warn("Unauthorized: contractor token expired or missing.");
    } else if (response.status === 403) {
      console.warn("Forbidden: Contractor role required.");
    }
  } catch (err) {
    console.error("Error loading contractor projects:", err);
  } finally {
    isFetchingProjects = false;
    renderCustomerProjects("all");
  }
}

// ================= BUILD BID PROJECT TYPE IMAGE SYSTEM =================
const PROJECT_CATEGORY_IMAGES = {
  new_construction: "NEW CONSTRUCTION.png",
  renovation: "RENOVATION.png",
  home_extension: "HOME EXTENSION.png",
  interior_design: "INTERIOR DESIGN.png",
  commercial_construction: "COMMERCIAL CONSTRUCTION.png",
  industrial_warehouse: "INDUSTRIRAL AND WAREHOUSE.png",
  others: "OTHERS.png"
};

function getProjectCardImage(projectType) {
  const norm = String(projectType || "").trim().toLowerCase();
  if (norm.includes("new") || (norm.includes("construct") && !norm.includes("commercial") && !norm.includes("indust"))) {
    return PROJECT_CATEGORY_IMAGES.new_construction;
  }
  if (norm.includes("renov") || norm.includes("remodel")) {
    return PROJECT_CATEGORY_IMAGES.renovation;
  }
  if (norm.includes("extens")) {
    return PROJECT_CATEGORY_IMAGES.home_extension;
  }
  if (norm.includes("interior") || norm.includes("design")) {
    return PROJECT_CATEGORY_IMAGES.interior_design;
  }
  if (norm.includes("commercial") || norm.includes("showroom") || norm.includes("office") || norm.includes("retail")) {
    return PROJECT_CATEGORY_IMAGES.commercial_construction;
  }
  if (norm.includes("indust") || norm.includes("warehouse") || norm.includes("factory")) {
    return PROJECT_CATEGORY_IMAGES.industrial_warehouse;
  }
  return PROJECT_CATEGORY_IMAGES.others;
}

function renderCustomerProjects(filterType = "all") {
  const container = document.getElementById("projects-list");
  if (!container) return;

  const badgeProjects = document.getElementById("nav-badge-projects");
  if (badgeProjects) badgeProjects.textContent = cachedContractorProjects.length;

  let projects = [...cachedContractorProjects];

  if (filterType !== "all") {
    projects = projects.filter(p => {
      const s = (p.status || "OPEN").toUpperCase();
      if (filterType === "Open for Bidding") {
        return s === "OPEN" || s === "OPEN FOR BIDDING" || s === "OPEN FOR BIDS";
      }
      return s.toLowerCase() === filterType.toLowerCase();
    });
  }

  container.innerHTML = "";

  if (projects.length === 0) {
    container.innerHTML = `
      <div style="background:#ffffff; border-radius:8px; padding: 2.5rem; text-align:center; color:#64748b;">
        <i class="fa-regular fa-folder-open" style="font-size:2.5rem; color:#94a3b8; margin-bottom:10px;"></i>
        <h4 style="color:#334155; margin-bottom:4px;">No Projects Available</h4>
        <p style="font-size:0.85rem;">When a customer posts an open project, it will appear here automatically.</p>
      </div>
    `;
    return;
  }

  projects.forEach(project => {
    const card = document.createElement("div");
    card.className = "project-item";

    const displayTitle = project.projectTitle || project.title || "BuildBid Project";
    const displayId = project.projectId || (project.id ? `PRJ-${project.id}` : "");
    const displayLocation = project.location || (project.city ? `${project.city}, ${project.state || ""}` : "Location Not Specified");
    const displayBudget = project.budget || (project.budgetMin && project.budgetMax ? `₹${project.budgetMin.toLocaleString("en-IN")} - ₹${project.budgetMax.toLocaleString("en-IN")}` : "Negotiable");
    const displayArea = project.builtUpArea || project.totalArea ? `${project.builtUpArea || project.totalArea} sq ft` : "";
    const displayCategory = project.projectType || project.type || "Construction";
    const displayStatus = (project.status === "OPEN" || !project.status) ? "Open for Bidding" : project.status;
    const displayDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "Recent";

    card.innerHTML = `
      <div class="project-left-side">
        <img src="${getProjectCardImage(displayCategory)}" alt="${escapeHTML(displayCategory)}" class="project-thumb" onerror="this.onerror=null; this.src='hero-building.jpg';" />
        <div class="project-titles">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <h4 style="margin: 0; font-size: 1rem; color: #1e293b;">${escapeHTML(displayTitle)}</h4>
            ${displayId ? `<span class="project-id-badge" style="background:#f1f5f9; color:#475569; font-size:11px; font-weight:700; padding:2px 7px; border-radius:4px; font-family:monospace; border:1px solid #e2e8f0;">${escapeHTML(displayId)}</span>` : ''}
          </div>
          <p style="margin: 4px 0 2px;"><i class="fa-solid fa-location-dot" style="font-size:0.75rem; color:#94a3b8;"></i> ${escapeHTML(displayLocation)}</p>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
            ${displayArea ? `<span>${escapeHTML(displayArea)} • </span>` : ''}
            <span>${escapeHTML(displayCategory)}</span>
          </div>
          <span style="display:inline-block; font-weight: 600; color: #047857; margin-top: 3px; font-size: 0.82rem;">Budget: ${escapeHTML(displayBudget)}</span>
        </div>
      </div>
      <div class="project-meta-col">
        <div class="meta-block">
          <span>Posted On</span>
          <strong>${escapeHTML(displayDate)}</strong>
        </div>
        <div class="meta-block">
          <span>Type</span>
          <strong>${escapeHTML(displayCategory)}</strong>
        </div>
      </div>
      <div class="project-cta" style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
        <span class="status-tag" style="background: #e0f2fe; color: #0369a1; font-weight: 600; font-size: 0.75rem; padding: 3px 10px; border-radius: 20px;">${escapeHTML(displayStatus)}</span>
        <div style="display: flex; gap: 6px;">
          <button class="btn-view-details" onclick="navigateToProjectDetails('${escapeHTML(displayId || project.id)}')"><i class="fa-regular fa-eye"></i> View Details</button>
          <button class="btn-bid-direct" onclick="navigateToBid('${escapeHTML(displayId || project.id)}')" style="background:#0284c7; color:#fff; border:none; padding:7px 12px; border-radius:6px; font-weight:600; font-size:0.8rem; cursor:pointer; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-gavel"></i> Bid</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function handleTabFilter(status, btnElement) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");
  renderCustomerProjects(status);
}

// 4. View Details Navigation
function navigateToProjectDetails(projectId) {
  if (!projectId) return;
  window.location.href = `contractor-project-details.html?id=${encodeURIComponent(projectId)}`;
}

function openProjectModal(projectId) {
  navigateToProjectDetails(projectId);
}

function closeProjectModal() {
  const modal = document.getElementById("contractor-project-modal");
  if (modal) modal.style.display = "none";
}

// 5. Navigate to Existing Bid Flow
function navigateToBid(projectId) {
  if (!projectId) return;
  sessionStorage.setItem("selectedProjectId", projectId);
  window.location.href = `contractor-bid-builder.html?projectId=${encodeURIComponent(projectId)}`;
}

// 6. Logout
function logoutUser() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("marketplaceToken");
  localStorage.removeItem("marketplaceUser");
  localStorage.removeItem("buildbid_current_user");
  window.location.href = "index.html";
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// Bootstrapping
document.addEventListener("DOMContentLoaded", () => {
  localStorage.removeItem("buildbid_current_user");

  const contractor = getLoggedInContractor();
  if (contractor) {
    renderContractorDashboard(contractor);
    loadContractorProjects();
  }
});
