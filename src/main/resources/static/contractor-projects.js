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

  document.getElementById("top-nav-name").textContent = displayName;
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
              : `<button class="btn-bid-now" onclick="openBidModal('${project.id}')"><i class="fa-solid fa-file-invoice-dollar"></i> Send Quotation</button>`
          }
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// 5. Open Quotation Modal
function openBidModal(projectId) {
  const projects = getLiveProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  document.getElementById("modal-project-id").value = project.id;
  document.getElementById("modal-project-title").textContent = project.title;
  document.getElementById("modal-project-location").textContent = `Location: ${project.location || 'Not Specified'}`;
  document.getElementById("modal-customer-budget").value = project.budget || 'Negotiable';
  
  // Clear previous form inputs
  document.getElementById("bid-amount").value = "";
  document.getElementById("bid-timeline").value = "";
  document.getElementById("bid-notes").value = "";

  document.getElementById("bid-modal").classList.add("active");
}

function closeBidModal() {
  document.getElementById("bid-modal").classList.remove("active");
}

// 6. Submit Contractor Quotation / Bid
function submitContractorQuotation(e) {
  e.preventDefault();

  const projectId = document.getElementById("modal-project-id").value;
  const amount = document.getElementById("bid-amount").value;
  const timeline = document.getElementById("bid-timeline").value;
  const materialType = document.getElementById("bid-material-type").value;
  const notes = document.getElementById("bid-notes").value;
  const user = setupContractorSession();

  const quotationPayload = {
    quotationId: "quot-" + Date.now(),
    projectId: projectId,
    contractorId: user.email || user.username,
    contractorName: user.name || user.companyName,
    contractorPhone: user.phone || "",
    amount: "₹" + Number(amount).toLocaleString('en-IN'),
    timeline: timeline,
    materialType: materialType,
    notes: notes,
    submittedDate: "Today",
    status: "Pending Review"
  };

  // 1. Save Quotation locally
  const bids = getContractorBids();
  bids.unshift(quotationPayload);
  localStorage.setItem("buildbid_contractor_bids", JSON.stringify(bids));

  // 2. Increment project bid counter
  const projects = getLiveProjects();
  const targetIndex = projects.findIndex(p => p.id === projectId);
  if (targetIndex !== -1) {
    projects[targetIndex].bidsCount = (projects[targetIndex].bidsCount || 0) + 1;
    localStorage.setItem("buildbid_customer_projects", JSON.stringify(projects));
  }

  // 3. Update contractor's active bids metric in currentUser stats
  const rawUser = localStorage.getItem("currentUser");
  if (rawUser) {
    const parsedUser = JSON.parse(rawUser);
    parsedUser.stats = parsedUser.stats || {};
    parsedUser.stats.totalBids = (parsedUser.stats.totalBids || 0) + 1;
    parsedUser.stats.activeBids = (parsedUser.stats.activeBids || 0) + 1;
    localStorage.setItem("currentUser", JSON.stringify(parsedUser));
  }

  alert("Quotation successfully submitted to the customer!");
  closeBidModal();
  renderLiveProjectsGrid(getLiveProjects());
}

// 7. Search Filter
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

// 8. Tab Filters
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