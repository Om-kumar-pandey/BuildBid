/**
 * Contractor Live Projects Engine
 * Manages live customer postings, dynamic search, and Quotation submissions.
 */

// 1. Authenticate Contractor & Populate Navbar
function setupContractorSession() {
  const rawData = localStorage.getItem("currentUser") || 
                  localStorage.getItem("loggedInUser") || 
                  sessionStorage.getItem("currentUser");

  if (!rawData) {
    alert("Please login first!");
    window.location.href = "index.html";
    return null;
  }

  const user = JSON.parse(rawData);
  const displayName = user.name || user.username || "Contractor";
  const initials = displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "HK";

  const nameElem = document.getElementById("top-nav-name");
  if (nameElem) nameElem.textContent = displayName;
  
  const avatarText = document.getElementById("top-nav-avatar-text");
  if (avatarText) avatarText.textContent = initials;

  return user;
}

// 2. Fetch Customer Projects
function getLiveProjects() {
  const rawProjects = localStorage.getItem("buildbid_customer_projects") || 
                      localStorage.getItem("customerProjects");
  return rawProjects ? JSON.parse(rawProjects) : [];
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

  const allProjects = getLiveProjects();
  if (badge) badge.textContent = allProjects.length;

  // Update bids counter badge
  const bidsBadge = document.getElementById("nav-badge-bids");
  if (bidsBadge) bidsBadge.textContent = myBids.length;

  if (!container) return;
  container.innerHTML = "";

  if (projectsToDisplay.length === 0) {
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
    // Check if current contractor has already quoted for this project
    const hasAlreadyBid = myBids.some(b => b.projectId === project.id);

    const card = document.createElement("div");
    card.className = "market-card";
    card.innerHTML = `
      <div class="market-card-img-wrap">
        <img src="${project.imageUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=350'}" alt="Project Image" class="market-card-img" />
        <span class="market-status-pill">${escapeHTML(project.status || 'Live')}</span>
      </div>
      <div class="market-card-body">
        <h3>${escapeHTML(project.title)}</h3>
        <p class="market-location"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(project.location || 'Location Not Specified')}</p>
        
        <div class="market-specs">
          <div>
            <span>Customer Budget</span>
            <strong>${escapeHTML(project.budget || 'Negotiable')}</strong>
          </div>
          <div>
            <span>Posted On</span>
            <strong>${escapeHTML(project.postedDate || 'Recent')}</strong>
          </div>
        </div>

        <div class="market-card-footer">
          <span class="bids-badge"><i class="fa-solid fa-gavel"></i> <strong>${project.bidsCount || 0}</strong> Bids</span>
          ${
            hasAlreadyBid 
              ? `<button class="btn-bid-now btn-already-bid" disabled><i class="fa-solid fa-check"></i> Quotation Sent</button>`
              : `<button class="btn-bid-now" onclick="openQuotationModal('${project.id}')"><i class="fa-solid fa-file-invoice-dollar"></i> Send Quotation</button>`
          }
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

let activeBiddingProjectId = null;

// Replace existing openQuotationModal with inline switcher:
function openQuotationModal(projectId) {
  const projects = getLiveProjects();
  const project = projects.find(p => String(p.id) === String(projectId));
  if (!project) return;

  activeBiddingProjectId = projectId;

  // Header data populate karein
  document.getElementById("projectTitleDisplay").innerText = project.title || "Modern 3BHK House";
  document.getElementById("projectLocationDisplay").innerHTML = `<i class="fa-solid fa-location-dot"></i> ${project.location || "Greater Noida, Uttar Pradesh"}`;

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
  const token = localStorage.getItem("token") || localStorage.getItem("marketplaceToken");
  const finalBidStr = document.getElementById("sumFinal").innerText;

  const payload = {
    quotationId: "quot-" + Date.now(),
    projectId: activeBiddingProjectId,
    contractorId: user.email || user.username,
    contractorName: user.name || user.companyName,
    contractorPhone: user.phone || "",
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

  // 2. Increment bids count on project card
  const projects = getLiveProjects();
  const targetIndex = projects.findIndex(p => String(p.id) === String(activeBiddingProjectId));
  if (targetIndex !== -1) {
    projects[targetIndex].bidsCount = (projects[targetIndex].bidsCount || 0) + 1;
    localStorage.setItem("buildbid_customer_projects", JSON.stringify(projects));
  }

  // 3. Backend sync
  try {
    await fetch("https://buildbid-ap3j.onrender.com/api/bids", {
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
  renderLiveProjectsGrid(getLiveProjects());
}

// 6. Search Filter
function handleSearchProjects() {
  const query = document.getElementById("project-search-input").value.toLowerCase();
  const projects = getLiveProjects();

  const filtered = projects.filter(p => 
    (p.title && p.title.toLowerCase().includes(query)) ||
    (p.location && p.location.toLowerCase().includes(query)) ||
    (p.budget && p.budget.toLowerCase().includes(query))
  );

  renderLiveProjectsGrid(filtered);
}

// 7. Tab Filters
function filterLiveProjects(type, btn) {
  document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const projects = getLiveProjects();
  if (type === "all") {
    renderLiveProjectsGrid(projects);
  } else if (type === "open") {
    renderLiveProjectsGrid(projects.filter(p => (p.status || "").toLowerCase().includes("open")));
  } else if (type === "high-budget") {
    renderLiveProjectsGrid(projects.filter(p => (p.budget || "").includes("Cr") || (p.budget || "").includes("Lakh")));
  }
}

// Logout functionality
function logoutUser() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("marketplaceToken");
  localStorage.removeItem("marketplaceUser");
  window.location.href = "index.html";
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// Real-Time Cross-Window Synchronization
window.addEventListener("storage", (e) => {
  if (e.key === "buildbid_customer_projects" || e.key === "customerProjects") {
    renderLiveProjectsGrid(getLiveProjects());
  }
});

// Bootstrapping
document.addEventListener("DOMContentLoaded", () => {
  setupContractorSession();
  renderLiveProjectsGrid(getLiveProjects());
});
