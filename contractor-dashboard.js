/**
 * Contractor Dashboard - Dynamic Engine
 */

// 1. Current Logged-in Contractor Fetch
function getLoggedInContractor() {
  const rawData = localStorage.getItem("currentUser") || 
                  localStorage.getItem("loggedInUser") || 
                  sessionStorage.getItem("currentUser");

  if (!rawData) {
    alert("Please log in with a contractor account first!");
    // Redirects back to homepage where login modal is present
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
    bannerName.innerHTML = `${displayName} <i class="fa-solid fa-circle-check verified-icon"></i>`;
  }

  // Tagline updated to "Contractor"
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

  // Real Dynamic Stats: Reads from user object or initializes cleanly at 0
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
  document.getElementById("banner-rating").textContent = rating;
  document.getElementById("banner-reviews-count").textContent = `(${reviewsCount} Reviews)`;
  document.getElementById("banner-completed-projects").textContent = completedProjects;
  document.getElementById("banner-total-earnings").textContent = totalEarnings;

  // KPI Grid Cards (Dynamic 0 / real counts)
  document.getElementById("stat-total-bids").textContent = totalBids;
  document.getElementById("stat-active-bids").textContent = activeBids;
  document.getElementById("stat-projects-won").textContent = projectsWon;
  document.getElementById("stat-total-earnings").textContent = totalEarnings;

  // Sidebar Badges
  const badgeBids = document.getElementById("nav-badge-bids");
  if (badgeBids) badgeBids.textContent = activeBids;
  
  const badgeContracts = document.getElementById("nav-badge-contracts");
  if (badgeContracts) badgeContracts.textContent = projectsWon;

  // Performance Column
  document.getElementById("perf-response-rate").textContent = responseRate;
  document.getElementById("perf-projects-completed").textContent = completedProjects;
  document.getElementById("perf-ontime-delivery").textContent = onTimeDelivery;
  document.getElementById("perf-rating").textContent = rating === "0.0" ? "0 / 5" : `${rating} / 5`;
}

// 3. Customer Projects Feed
function renderCustomerProjects(filterType = "all") {
  const container = document.getElementById("projects-list");
  if (!container) return;

  const rawProjects = localStorage.getItem("buildbid_customer_projects") || 
                      localStorage.getItem("customerProjects");
  let projects = rawProjects ? JSON.parse(rawProjects) : [];

  const badgeProjects = document.getElementById("nav-badge-projects");
  if (badgeProjects) badgeProjects.textContent = projects.length;

  if (filterType !== "all") {
    projects = projects.filter(p => (p.status || "Open for Bidding").toLowerCase() === filterType.toLowerCase());
  }

  container.innerHTML = "";

  if (projects.length === 0) {
    container.innerHTML = `
      <div style="background:#ffffff; border-radius:8px; padding: 2.5rem; text-align:center; color:#64748b;">
        <i class="fa-regular fa-folder-open" style="font-size:2.5rem; color:#94a3b8; margin-bottom:10px;"></i>
        <h4 style="color:#334155; margin-bottom:4px;">No Projects Available</h4>
        <p style="font-size:0.85rem;">When a customer posts a project, it will be displayed here.</p>
      </div>
    `;
    return;
  }

  projects.forEach(project => {
    const card = document.createElement("div");
    card.className = "project-item";
    card.innerHTML = `
      <div class="project-left-side">
        <img src="${project.imageUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=150'}" alt="Project" class="project-thumb" />
        <div class="project-titles">
          <h4>${escapeHTML(project.title)}</h4>
          <p><i class="fa-solid fa-location-dot" style="font-size:0.7rem; color:#94a3b8;"></i> ${escapeHTML(project.location || 'Location Not Specified')}</p>
          <span>Budget: ${escapeHTML(project.budget || 'Negotiable')}</span>
        </div>
      </div>
      <div class="project-meta-col">
        <div class="meta-block">
          <span>Posted On</span>
          <strong>${escapeHTML(project.postedDate || 'Recent')}</strong>
        </div>
        <div class="meta-block">
          <span>Customer</span>
          <strong>${escapeHTML(project.customerName || 'Verified Client')}</strong>
        </div>
      </div>
      <div class="project-cta">
        <span class="status-tag">${escapeHTML(project.status || 'Open for Bidding')}</span>
        <button class="btn-view-details" onclick="openProjectModal('${project.id}')">View Details & Bid</button>
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

// 4. Logout: Clears contractor credentials and returns to index.html
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

function openProjectModal(id) {
  alert(`Project ID: ${id}\nBid submission modal triggers here.`);
}

// Real-Time Cross-Tab / Cross-Page Event Listener
window.addEventListener("storage", (e) => {
  if (e.key === "buildbid_customer_projects" || e.key === "customerProjects") {
    renderCustomerProjects();
  }
  if (e.key === "currentUser") {
    const user = getLoggedInContractor();
    renderContractorDashboard(user);
  }
});

// Bootstrapping
document.addEventListener("DOMContentLoaded", () => {
  localStorage.removeItem("buildbid_current_user");

  const contractor = getLoggedInContractor();
  if (contractor) {
    renderContractorDashboard(contractor);
    renderCustomerProjects();
  }
});