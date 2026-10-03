/**
 * Contractor Live Projects Engine
 * Manages live customer postings, dynamic search, and Quotation submissions.
 */

function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.location) {
        if (
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
        ) {
            return "http://localhost:8080";
        }
    }

    return "https://buildbid-ap3j.onrender.com";
}

const API_BASE_URL = getApiBaseUrl();

function getCleanToken() {
  let token = localStorage.getItem("token") ||
              localStorage.getItem("marketplaceToken") ||
              localStorage.getItem("jwtToken");
  if (!token) return null;
  token = token.trim();
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.substring(1, token.length - 1).trim();
  }
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.substring(7).trim();
  }
  return token;
}

// 1. Authenticate Contractor & Populate Navbar
function setupContractorSession() {
  const rawData = localStorage.getItem("currentUser") ||
                  localStorage.getItem("loggedInUser") ||
                  sessionStorage.getItem("currentUser") ||
                  localStorage.getItem("marketplaceUser");

  if (!rawData) {
    const token = getCleanToken();
    if (!token) {
      alert("Please login first!");
      window.location.href = "index.html";
      return null;
    }
    return { name: "Contractor", username: "contractor" };
  }

  try {
    const user = JSON.parse(rawData);
    const displayName = user.name || user.username || "Contractor";
    const initials = displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "C";

    const nameElem = document.getElementById("top-nav-name");
    if (nameElem) nameElem.textContent = displayName;

    const avatarText = document.getElementById("top-nav-avatar-text");
    if (avatarText) avatarText.textContent = initials;

    return user;
  } catch(e) {
    return { name: "Contractor", username: "contractor" };
  }
}

let cachedLiveProjects = [];
let isFetchingLiveProjects = false;

// 2. Fetch Customer Projects from Backend
async function loadLiveProjects() {
  if (isFetchingLiveProjects) return;
  isFetchingLiveProjects = true;

  const container = document.getElementById("live-projects-container");
  if (container) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; background:#fff; border-radius:10px; padding:3rem; text-align:center; color:#64748b;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:#0284c7; margin-bottom:12px;"></i>
        <p style="margin:0; font-size:0.95rem;">Loading live customer projects from database...</p>
      </div>
    `;
  }

  const token = getCleanToken();

  try {
    const res = await fetch(`${API_BASE_URL}/api/contractor/projects`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }
    });

    if (res.status === 401) {
      if (container) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; background:#fff; border-radius:10px; padding:3rem; text-align:center; color:#dc2626;">
            <i class="fa-solid fa-lock" style="font-size:2.5rem; margin-bottom:12px;"></i>
            <h3>Authentication Required</h3>
            <p>Please log in with your verified contractor account to view customer projects.</p>
            <a href="index.html" style="display:inline-block; margin-top:10px; background:#0284c7; color:#fff; padding:8px 18px; border-radius:6px; text-decoration:none; font-weight:600;">Go to Login</a>
          </div>
        `;
      }
      return;
    }

    if (res.status === 403) {
      if (container) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; background:#fff; border-radius:10px; padding:3rem; text-align:center; color:#dc2626;">
            <i class="fa-solid fa-shield-halved" style="font-size:2.5rem; margin-bottom:12px;"></i>
            <h3>Access Restricted</h3>
            <p>This section is exclusively available for verified Contractors.</p>
          </div>
        `;
      }
      return;
    }

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const projects = await res.json();
    cachedLiveProjects = Array.isArray(projects) ? projects : [];
    applyCompositeFilters();

    const badge = document.getElementById("nav-badge-projects");
    if (badge) badge.textContent = cachedLiveProjects.length;

  } catch (err) {
    console.error("Failed to load contractor projects:", err);
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; background:#fff; border-radius:10px; padding:3rem; text-align:center; color:#64748b;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem; color:#f59e0b; margin-bottom:12px;"></i>
          <h3 style="color:#1e293b; margin-bottom:4px;">Unable to load projects</h3>
          <p style="font-size:0.85rem;">Could not connect to the database. Please try again.</p>
          <button onclick="loadLiveProjects()" style="background:#0284c7; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-weight:600; cursor:pointer; margin-top:10px;">Retry</button>
        </div>
      `;
    }
  } finally {
    isFetchingLiveProjects = false;
  }
}

// 3. Fetch Contractor's Existing Quotations/Bids
function getContractorBids() {
  const raw = localStorage.getItem("buildbid_contractor_bids");
  return raw ? JSON.parse(raw) : [];
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

// 4. Render Project Cards Grid
function renderLiveProjectsGrid(projectsToDisplay) {
  const container = document.getElementById("live-projects-container");
  const badge = document.getElementById("nav-badge-projects");
  const myBids = getContractorBids();

  if (badge) badge.textContent = cachedLiveProjects.length;

  // Update bids counter badge
  const bidsBadge = document.getElementById("nav-badge-bids");
  if (bidsBadge) bidsBadge.textContent = myBids.length;

  if (!container) return;
  container.innerHTML = "";

  if (!projectsToDisplay || projectsToDisplay.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; background:#fff; border-radius:10px; padding:3.5rem; text-align:center; color:#64748b;">
        <i class="fa-regular fa-folder-open" style="font-size:3rem; color:#94a3b8; margin-bottom:12px;"></i>
        <h3 style="color:#1e293b; margin-bottom:4px;">No Live Projects Found</h3>
        <p style="font-size:0.85rem;">Currently there are no active customer requests matching your filter.</p>
      </div>
    `;
    return;
  }

  projectsToDisplay.forEach(project => {
    const pId = project.projectId || (project.id ? `PRJ-${project.id}` : "");
    const displayTitle = project.projectTitle || project.title || "BuildBid Project";
    const displayLocation = project.location || (project.city ? `${project.city}, ${project.state || ""}` : "Location Not Specified");
    const displayBudget = project.budget || (project.budgetMin && project.budgetMax ? `₹${project.budgetMin.toLocaleString("en-IN")} - ₹${project.budgetMax.toLocaleString("en-IN")}` : "Negotiable");
    const displayArea = project.builtUpArea || project.totalArea ? `${project.builtUpArea || project.totalArea} sq ft` : "";
    const displayCategory = project.projectType || project.type || "Construction";
    const displayDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "Recent";
    const displayStatus = (project.status === "OPEN" || !project.status) ? "Open for Bidding" : project.status;

    // Check if current contractor has already quoted for this project
    const hasAlreadyBid = myBids.some(b => String(b.projectId) === String(pId) || String(b.projectId) === String(project.id));

    const card = document.createElement("div");
    card.className = "market-card";
    card.innerHTML = `
      <div class="market-card-img-wrap">
        <img src="${getProjectCardImage(displayCategory)}" alt="${escapeHTML(displayCategory)}" class="market-card-img" onerror="this.onerror=null; this.src='hero-building.jpg';" />
        <span class="market-status-pill">${escapeHTML(displayStatus)}</span>
      </div>
      <div class="market-card-body">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
          <h3 style="margin: 0; font-size: 1.05rem;">${escapeHTML(displayTitle)}</h3>
          ${pId ? `<span style="background:#f1f5f9; color:#475569; font-size:11px; font-weight:700; padding:2px 6px; border-radius:4px; font-family:monospace; border:1px solid #e2e8f0; white-space:nowrap;">${escapeHTML(pId)}</span>` : ''}
        </div>
        <p class="market-location"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(displayLocation)}</p>

        <div class="market-specs">
          <div>
            <span>Customer Budget</span>
            <strong>${escapeHTML(displayBudget)}</strong>
          </div>
          <div>
            <span>Posted On</span>
            <strong>${escapeHTML(displayDate)}</strong>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:#64748b; margin-top:8px; padding-top:8px; border-top:1px dashed #e2e8f0;">
          <span>${displayArea ? `${escapeHTML(displayArea)} • ` : ''}${escapeHTML(displayCategory)}</span>
        </div>

        <div class="market-card-footer" style="display:flex; gap:8px; margin-top:12px;">
          <button class="btn-bid-now" onclick="navigateToProjectDetails('${escapeHTML(pId || project.id)}')" style="flex:1; background:#f1f5f9; color:#1e293b; border:1px solid #cbd5e1; display:inline-flex; align-items:center; justify-content:center; gap:5px; font-size:0.82rem; padding:8px 10px;">
            <i class="fa-regular fa-eye"></i> Details
          </button>
          ${
            hasAlreadyBid
              ? `<button class="btn-bid-now btn-already-bid" disabled style="flex:1; padding:8px 10px; font-size:0.82rem;"><i class="fa-solid fa-check"></i> Bid Sent</button>`
              : `<button class="btn-bid-now" onclick="navigateToBid('${escapeHTML(pId || project.id)}')" style="flex:1; padding:8px 10px; font-size:0.82rem; display:inline-flex; align-items:center; justify-content:center; gap:5px;">
                   <i class="fa-solid fa-gavel"></i> Bid / Quote
                 </button>`
          }
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

let activeBiddingProjectId = null;

// Inline Bid Builder support
function openQuotationModal(projectId) {
  const project = cachedLiveProjects.find(p => String(p.projectId) === String(projectId) || String(p.id) === String(projectId));
  if (!project) return;

  activeBiddingProjectId = project.projectId || projectId;

  // Header data populate
  const displayLocation = project.location || (project.city ? `${project.city}, ${project.state || ""}` : "Not Specified");
  document.getElementById("projectTitleDisplay").innerText = project.projectTitle || project.title || "Modern 3BHK House";
  document.getElementById("projectLocationDisplay").innerHTML = `<i class="fa-solid fa-location-dot"></i> ${displayLocation}`;

  // Hide live projects container & controls, show bid builder
  const projectListSection = document.getElementById("live-projects-container");
  const builderSection = document.getElementById("inline-bid-builder-section");

  if (projectListSection) projectListSection.style.display = "none";

  // Hide filters and search bar while bidding
  const filtersElem = document.querySelector(".filter-chips-wrap");
  if (filtersElem) filtersElem.style.display = "none";

  if (builderSection) {
    builderSection.style.display = "block";
    builderSection.scrollIntoView({ behavior: "smooth" });
  }

  calculateAllTotals();
}

function closeInlineBidBuilder() {
  const projectListSection = document.getElementById("live-projects-container");
  const builderSection = document.getElementById("inline-bid-builder-section");
  const filtersElem = document.querySelector(".filter-chips-wrap");

  if (builderSection) builderSection.style.display = "none";
  if (projectListSection) projectListSection.style.display = "grid";
  if (filtersElem) filtersElem.style.display = "flex";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ================= VIEW DETAILS NAVIGATION =================
function navigateToProjectDetails(projectId) {
  if (!projectId) return;
  window.location.href = `contractor-project-details.html?id=${encodeURIComponent(projectId)}`;
}

async function openProjectModal(projectId) {
  navigateToProjectDetails(projectId);
}

function closeProjectModal() {
  const modal = document.getElementById("contractor-project-modal");
  if (modal) modal.style.display = "none";
}

function navigateToBid(projectId) {
  if (!projectId) {
    alert("Project ID is missing.");
    return;
  }
  window.location.href = `contractor-bid-builder.html?projectId=${encodeURIComponent(projectId)}`;
}

// ================= BUILDER CALCULATIONS & ROWS =================
function calculateAllTotals() {
  let totalFloors = 0;
  document.querySelectorAll(".floor-cost-input").forEach(inp => totalFloors += Number(inp.value) || 0);
  const sumFloors = document.getElementById("sumFloors");
  if (sumFloors) sumFloors.innerText = "₹" + totalFloors.toLocaleString("en-IN");

  let totalMaterials = 0;
  document.querySelectorAll("#materialsTable tbody tr").forEach(tr => {
    const qty = Number(tr.querySelector(".mat-qty")?.value) || 0;
    const rate = Number(tr.querySelector(".mat-rate")?.value) || 0;
    const amount = qty * rate;
    const totalInp = tr.querySelector(".mat-total");
    if (totalInp) totalInp.value = amount;
    totalMaterials += amount;
  });
  const sumMat = document.getElementById("sumMaterials");
  if (sumMat) sumMat.innerText = "₹" + totalMaterials.toLocaleString("en-IN");

  let totalLabour = 0;
  document.querySelectorAll("#labourTable tbody tr").forEach(tr => {
    const workers = Number(tr.querySelector(".lab-workers")?.value) || 0;
    const days = Number(tr.querySelector(".lab-days")?.value) || 0;
    const rate = Number(tr.querySelector(".lab-rate")?.value) || 0;
    const amount = workers * days * rate;
    const totalInp = tr.querySelector(".lab-total");
    if (totalInp) totalInp.value = amount;
    totalLabour += amount;
  });
  const sumLab = document.getElementById("sumLabour");
  if (sumLab) sumLab.innerText = "₹" + totalLabour.toLocaleString("en-IN");

  const directCost = totalFloors + totalMaterials + totalLabour;
  const sumDirect = document.getElementById("sumDirect");
  if (sumDirect) sumDirect.innerText = "₹" + directCost.toLocaleString("en-IN");

  const margin = Number(document.getElementById("privateMargin")?.value) || 0;
  const tax = Number(document.getElementById("taxAmount")?.value) || 0;
  const sumMargin = document.getElementById("sumMargin");
  if (sumMargin) sumMargin.innerText = "₹" + margin.toLocaleString("en-IN");

  const sumTax = document.getElementById("sumTax");
  if (sumTax) sumTax.innerText = "₹" + tax.toLocaleString("en-IN");

  const finalAmount = directCost + margin + tax;
  const sumFinal = document.getElementById("sumFinal");
  if (sumFinal) sumFinal.innerText = "₹" + finalAmount.toLocaleString("en-IN");
}

function validateMilestones() {
  let sum = 0;
  document.querySelectorAll(".milestone-pct").forEach(inp => sum += Number(inp.value) || 0);
  const badge = document.getElementById("milestoneWarning");
  if (!badge) return true;
  if (sum === 100) {
    badge.innerText = `Total: ${sum}% (Valid)`;
    badge.className = "milestone-badge valid";
    return true;
  } else {
    badge.innerText = `Total: ${sum}% (Error: Must equal exactly 100%)`;
    badge.className = "milestone-badge invalid";
    return false;
  }
}

function deleteRow(btn) {
  const row = btn.closest("tr");
  if (row && row.parentElement.children.length > 1) {
    row.remove();
    calculateAllTotals();
    validateMilestones();
  } else {
    alert("At least one entry row is required.");
  }
}

function addFloorRow() {
  const tbody = document.querySelector("#floorsTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" placeholder="e.g. First Floor" required></td>
    <td><input type="text" placeholder="e.g. Brickwork, Tiles, Electrical" required></td>
    <td><input type="number" class="floor-cost-input" value="0" min="0" oninput="calculateAllTotals()"></td>
    <td><button type="button" class="btn-del-row" onclick="deleteRow(this)"><i class="fa-solid fa-trash"></i></button></td>
  `;
  tbody.appendChild(tr);
}

function addMaterialRow() {
  const tbody = document.querySelector("#materialsTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" placeholder="Material Name" required></td>
    <td><input type="number" class="mat-qty" value="1" min="1" oninput="calculateAllTotals()"></td>
    <td><input type="text" placeholder="Bags / Tons / Sq.ft"></td>
    <td><input type="number" class="mat-rate" value="0" min="0" oninput="calculateAllTotals()"></td>
    <td><input type="number" class="mat-total read-only-input" value="0" readonly></td>
    <td><input type="text" placeholder="Brand / Specification"></td>
    <td><button type="button" class="btn-del-row" onclick="deleteRow(this)"><i class="fa-solid fa-trash"></i></button></td>
  `;
  tbody.appendChild(tr);
}

function addLabourRow() {
  const tbody = document.querySelector("#labourTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" placeholder="Trade (Electrician, Plumber, Painter)" required></td>
    <td><input type="number" class="lab-workers" value="1" min="1" oninput="calculateAllTotals()"></td>
    <td><input type="number" class="lab-days" value="1" min="1" oninput="calculateAllTotals()"></td>
    <td><input type="number" class="lab-rate" value="0" min="0" oninput="calculateAllTotals()"></td>
    <td><input type="number" class="lab-total read-only-input" value="0" readonly></td>
    <td><button type="button" class="btn-del-row" onclick="deleteRow(this)"><i class="fa-solid fa-trash"></i></button></td>
  `;
  tbody.appendChild(tr);
}

function addMilestoneRow() {
  const tbody = document.querySelector("#milestonesTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" placeholder="Milestone Phase" required></td>
    <td><input type="number" class="milestone-pct" value="0" min="1" max="100" oninput="validateMilestones()"></td>
    <td><button type="button" class="btn-del-row" onclick="deleteRow(this)"><i class="fa-solid fa-trash"></i></button></td>
  `;
  tbody.appendChild(tr);
}

async function submitDetailedBid() {
  if (!validateMilestones()) {
    alert("Milestones must add up to exactly 100% before submission.");
    return;
  }

  const title = document.getElementById("bidTitle").value.trim();
  if (!title) {
    alert("Please provide a Quotation Title.");
    return;
  }

  const user = setupContractorSession();
  const token = getCleanToken();
  const finalBidStr = document.getElementById("sumFinal").innerText;

  const payload = {
    quotationId: "quot-" + Date.now(),
    projectId: activeBiddingProjectId,
    contractorId: user ? (user.email || user.username) : "contractor",
    contractorName: user ? (user.name || user.companyName) : "Contractor",
    contractorPhone: user ? (user.phone || "") : "",
    amount: finalBidStr,
    bidTitle: title,
    materialMode: document.getElementById("materialMode").value,
    durationDays: Number(document.getElementById("estimatedDays").value),
    warranty: document.getElementById("warrantyText").value,
    includedScope: document.getElementById("includedWork").value.split("\n").filter(Boolean),
    excludedScope: document.getElementById("excludedWork").value.split("\n").filter(Boolean),
    commercialMargin: Number(document.getElementById("privateMargin").value) || 0,
    tax: Number(document.getElementById("taxAmount").value) || 0,
    status: "UNDER_REVIEW"
  };

  // 1. Local storage sync
  const bids = getContractorBids();
  bids.unshift(payload);
  localStorage.setItem("buildbid_contractor_bids", JSON.stringify(bids));

  // 2. Increment bids count on project card in UI
  const targetIndex = cachedLiveProjects.findIndex(p =>
    String(p.projectId) === String(activeBiddingProjectId) || String(p.id) === String(activeBiddingProjectId)
  );
  if (targetIndex !== -1) {
    cachedLiveProjects[targetIndex].bidsCount = (cachedLiveProjects[targetIndex].bidsCount || 0) + 1;
  }

  // 3. Backend sync
  try {
    await fetch(`${API_BASE_URL}/api/bids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      },
      body: JSON.stringify(payload)
    });
  } catch(e) {
    console.warn("Backend sync fallback:", e);
  }

  alert("Detailed Quotation successfully submitted to the customer!");
  closeInlineBidBuilder();
  applyCompositeFilters();
}

// ================= 6. UNIFIED COMPOSITE FILTER SYSTEM =================
const advancedFilterState = {
  tab: "all",          // "all" | "open" | "high-budget"
  searchQuery: "",
  dateSort: "latest",  // "latest" | "oldest"
  budget: "all",       // "all" | "under-15" | "15-35" | "35-75" | "above-75"
  location: "",
  area: "all",         // "all" | "under-1000" | "1000-2500" | "2500-5000" | "above-5000"
  projectType: "all",  // "all" | "New Construction" | ...
  floors: "all"        // "all" | "1" | "2" | "3" | "4+"
};

function toggleAdvancedFilterPanel() {
  const panel = document.getElementById("advanced-filter-panel");
  const toggleBtn = document.getElementById("btn-filter-toggle");
  if (!panel) return;
  const isHidden = panel.style.display === "none" || !panel.style.display;
  panel.style.display = isHidden ? "block" : "none";
  if (toggleBtn) {
    toggleBtn.classList.toggle("active", isHidden);
  }
}

function updateActiveFilterBadge() {
  let count = 0;
  if (advancedFilterState.dateSort !== "latest") count++;
  if (advancedFilterState.budget !== "all") count++;
  if (advancedFilterState.location) count++;
  if (advancedFilterState.area !== "all") count++;
  if (advancedFilterState.projectType !== "all") count++;
  if (advancedFilterState.floors !== "all") count++;

  const badge = document.getElementById("active-filter-badge");
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }
}

// STRICT RULE: Uses ONLY customer stated budget (budget, budgetMin, budgetMax). Never uses estimatedCost!
function extractCustomerBudget(project) {
  if (typeof project.budgetMax === "number" && project.budgetMax > 0) {
    return project.budgetMax;
  }
  if (typeof project.budgetMin === "number" && project.budgetMin > 0) {
    return project.budgetMin;
  }
  if (typeof project.budget === "string") {
    const str = project.budget.toLowerCase().replace(/,/g, "");
    const crMatch = str.match(/([\d.]+)\s*(?:cr|crore)/);
    if (crMatch) return parseFloat(crMatch[1]) * 10000000;
    const lkMatch = str.match(/([\d.]+)\s*(?:l|lakh|lac)/);
    if (lkMatch) return parseFloat(lkMatch[1]) * 100000;
    const numMatch = str.match(/(\d{5,})/);
    if (numMatch) return parseFloat(numMatch[1]);
  }
  return null;
}

function extractProjectArea(project) {
  const a = project.builtUpArea || project.totalArea || project.plotArea;
  if (typeof a === "number" && a > 0) return a;
  if (typeof a === "string") {
    const num = parseFloat(a.replace(/,/g, ""));
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
}

function extractFloorsCount(project) {
  if (!project.floors) return 0;
  if (typeof project.floors === "number") return project.floors;
  const trimmed = String(project.floors).trim();
  if (!isNaN(trimmed)) return parseInt(trimmed, 10);
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.length;
      if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
    } catch(e) {}
  }
  const match = trimmed.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function applyCompositeFilters() {
  let list = [...cachedLiveProjects];

  // 1. Existing Tabs filter (All Projects, Open for Bidding, High Budget)
  if (advancedFilterState.tab === "open") {
    list = list.filter(p => (p.status || "").toUpperCase() === "OPEN" || (p.status || "").toLowerCase().includes("open"));
  } else if (advancedFilterState.tab === "high-budget") {
    list = list.filter(p => {
      const b = p.budget || "";
      const val = extractCustomerBudget(p);
      return b.includes("Cr") || b.includes("Lakh") || (val !== null && val >= 2000000);
    });
  }

  // 2. Existing Search filter
  if (advancedFilterState.searchQuery) {
    const q = advancedFilterState.searchQuery;
    list = list.filter(p => {
      const title = (p.projectTitle || p.title || "").toLowerCase();
      const loc = (p.location || (p.city ? `${p.city}, ${p.state || ""}` : "")).toLowerCase();
      const budget = (p.budget || "").toLowerCase();
      const cat = (p.projectType || p.type || "").toLowerCase();
      const pId = (p.projectId || (p.id ? `prj-${p.id}` : "")).toLowerCase();
      return title.includes(q) || loc.includes(q) || budget.includes(q) || cat.includes(q) || pId.includes(q);
    });
  }

  // 3. Project Type filter
  if (advancedFilterState.projectType !== "all") {
    const targetType = advancedFilterState.projectType.toLowerCase();
    list = list.filter(p => {
      const cat = (p.projectType || p.type || "").toLowerCase();
      return cat === targetType || cat.includes(targetType);
    });
  }

  // 4. Location filter (City/State)
  if (advancedFilterState.location) {
    const locQ = advancedFilterState.location.toLowerCase();
    list = list.filter(p => {
      const city = (p.city || "").toLowerCase();
      const state = (p.state || "").toLowerCase();
      const loc = (p.location || "").toLowerCase();
      return city.includes(locQ) || state.includes(locQ) || loc.includes(locQ);
    });
  }

  // 5. Customer Budget filter (CUSTOMER STATED ONLY)
  if (advancedFilterState.budget !== "all") {
    list = list.filter(p => {
      const val = extractCustomerBudget(p);
      if (val === null) return true;
      if (advancedFilterState.budget === "under-15") return val < 1500000;
      if (advancedFilterState.budget === "15-35") return val >= 1500000 && val <= 3500000;
      if (advancedFilterState.budget === "35-75") return val > 3500000 && val <= 7500000;
      if (advancedFilterState.budget === "above-75") return val > 7500000;
      return true;
    });
  }

  // 6. Area filter
  if (advancedFilterState.area !== "all") {
    list = list.filter(p => {
      const a = extractProjectArea(p);
      if (a === null) return true;
      if (advancedFilterState.area === "under-1000") return a < 1000;
      if (advancedFilterState.area === "1000-2500") return a >= 1000 && a <= 2500;
      if (advancedFilterState.area === "2500-5000") return a > 2500 && a <= 5000;
      if (advancedFilterState.area === "above-5000") return a > 5000;
      return true;
    });
  }

  // 7. Floors filter
  if (advancedFilterState.floors !== "all") {
    list = list.filter(p => {
      const f = extractFloorsCount(p);
      if (advancedFilterState.floors === "1") return f === 1;
      if (advancedFilterState.floors === "2") return f === 2;
      if (advancedFilterState.floors === "3") return f === 3;
      if (advancedFilterState.floors === "4+") return f >= 4;
      return true;
    });
  }

  // 8. Date Sort
  list.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (advancedFilterState.dateSort === "oldest") {
      return timeA - timeB;
    }
    return timeB - timeA; // default "latest"
  });

  renderLiveProjectsGrid(list);
  updateActiveFilterBadge();
}

function applyAdvancedFilters() {
  advancedFilterState.dateSort = document.getElementById("filter-date-sort")?.value || "latest";
  advancedFilterState.budget = document.getElementById("filter-budget")?.value || "all";
  advancedFilterState.location = (document.getElementById("filter-location")?.value || "").trim().toLowerCase();
  advancedFilterState.area = document.getElementById("filter-area")?.value || "all";
  advancedFilterState.projectType = document.getElementById("filter-type")?.value || "all";
  advancedFilterState.floors = document.getElementById("filter-floors")?.value || "all";

  applyCompositeFilters();
}

function resetAdvancedFilters() {
  const dSort = document.getElementById("filter-date-sort");
  if (dSort) dSort.value = "latest";
  const bgt = document.getElementById("filter-budget");
  if (bgt) bgt.value = "all";
  const loc = document.getElementById("filter-location");
  if (loc) loc.value = "";
  const area = document.getElementById("filter-area");
  if (area) area.value = "all";
  const pType = document.getElementById("filter-type");
  if (pType) pType.value = "all";
  const flrs = document.getElementById("filter-floors");
  if (flrs) flrs.value = "all";

  advancedFilterState.dateSort = "latest";
  advancedFilterState.budget = "all";
  advancedFilterState.location = "";
  advancedFilterState.area = "all";
  advancedFilterState.projectType = "all";
  advancedFilterState.floors = "all";

  applyCompositeFilters();
}

// 7. Search Handler (Composed)
function handleSearchProjects() {
  const query = (document.getElementById("project-search-input")?.value || "").trim().toLowerCase();
  advancedFilterState.searchQuery = query;
  applyCompositeFilters();
}

// 8. Tab Filters (Composed)
function filterLiveProjects(type, btn) {
  document.querySelectorAll(".filter-chips-wrap .filter-chip").forEach(c => {
    if (!c.classList.contains("btn-filter-toggle")) {
      c.classList.remove("active");
    }
  });
  if (btn && !btn.classList.contains("btn-filter-toggle")) {
    btn.classList.add("active");
  }

  advancedFilterState.tab = type;
  applyCompositeFilters();
}

// Logout functionality
function logoutUser() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("marketplaceToken");
  localStorage.removeItem("marketplaceUser");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("customerUser");
  localStorage.removeItem("buildbid_user");
  localStorage.removeItem("buildbid_current_user");
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("pendingRedirect");
  sessionStorage.removeItem("userData");
  sessionStorage.clear();
  showLogoutToast(() => {
    window.location.href = "index.html";
  });
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// Bootstrapping
document.addEventListener("DOMContentLoaded", () => {
  setupContractorSession();
  loadLiveProjects();
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
