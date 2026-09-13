function formatRelativeTime(dateValue) {
  if (!dateValue) return "Recently";

  // Agar timestamp number ya date string hai
  const timestamp = typeof dateValue === "number" ? dateValue : new Date(dateValue).getTime();
  
  if (isNaN(timestamp)) {
    // Agar pehle se "2 hours ago" jaisa string store hai
    return dateValue;
  }

  const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);

  if (secondsAgo < 60) return "Just now";
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 30) return `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
  
  return new Date(timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}
/**
 * Contractor Live Projects Engine
 * Manages live customer postings, dynamic search, and Quotation redirection.
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
    const hasAlreadyBid = myBids.some(b => String(b.projectId) === String(project.id));

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

// 5. Open Detailed Bid Builder Page (Redirects to contractor-bid-builder.html)
function openQuotationModal(projectId) {
  const projects = getLiveProjects();
  const project = projects.find(p => String(p.id) === String(projectId));
  
  if (project) {
    sessionStorage.setItem("selectedProject", JSON.stringify(project));
  }
  
  // Directly open contractor-bid-builder.html with project ID
  window.location.href = `contractor-bid-builder.html?projectId=${encodeURIComponent(projectId)}`;
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

// 8. Helpers
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
