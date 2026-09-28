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
    const initials = displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "HK";

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
    renderLiveProjectsGrid(cachedLiveProjects);

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
        <img src="https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=350" alt="Project Image" class="market-card-img" />
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
          ${project.floors ? `<span><strong>${escapeHTML(project.floors)}</strong> Floors</span>` : ''}
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
  renderLiveProjectsGrid(cachedLiveProjects);
}

// 6. Search Filter
function handleSearchProjects() {
  const query = document.getElementById("project-search-input").value.toLowerCase();

  const filtered = cachedLiveProjects.filter(p => {
    const title = (p.projectTitle || p.title || "").toLowerCase();
    const loc = (p.location || p.city || "").toLowerCase();
    const budget = (p.budget || "").toLowerCase();
    const cat = (p.projectType || p.type || "").toLowerCase();
    const pId = (p.projectId || "").toLowerCase();
    return title.includes(query) || loc.includes(query) || budget.includes(query) || cat.includes(query) || pId.includes(query);
  });

  renderLiveProjectsGrid(filtered);
}

// 7. Tab Filters
function filterLiveProjects(type, btn) {
  document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");

  if (type === "all") {
    renderLiveProjectsGrid(cachedLiveProjects);
  } else if (type === "open") {
    renderLiveProjectsGrid(cachedLiveProjects.filter(p => (p.status || "").toUpperCase() === "OPEN" || (p.status || "").toLowerCase().includes("open")));
  } else if (type === "high-budget") {
    renderLiveProjectsGrid(cachedLiveProjects.filter(p => {
      const b = p.budget || "";
      return b.includes("Cr") || b.includes("Lakh") || (p.budgetMax && p.budgetMax >= 2000000);
    }));
  }
}

// Logout functionality
function logoutUser() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("marketplaceToken");
  localStorage.removeItem("marketplaceUser");
  localStorage.removeItem("token");
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
  setupContractorSession();
  loadLiveProjects();
});
