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
  new_construction: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" width="400" height="220">
      <defs>
        <linearGradient id="bg-nc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
        <linearGradient id="accent-nc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#fbbf24"/>
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#bg-nc)"/>
      <g opacity="0.08" stroke="#ffffff" stroke-width="1">
        <line x1="0" y1="40" x2="400" y2="40"/><line x1="0" y1="80" x2="400" y2="80"/><line x1="0" y1="120" x2="400" y2="120"/><line x1="0" y1="160" x2="400" y2="160"/>
        <line x1="50" y1="0" x2="50" y2="220"/><line x1="100" y1="0" x2="100" y2="220"/><line x1="150" y1="0" x2="150" y2="220"/><line x1="200" y1="0" x2="200" y2="220"/><line x1="250" y1="0" x2="250" y2="220"/><line x1="300" y1="0" x2="300" y2="220"/><line x1="350" y1="0" x2="350" y2="220"/>
      </g>
      <polygon points="120,175 120,115 200,60 280,115 280,175" fill="rgba(245,158,11,0.12)" stroke="url(#accent-nc)" stroke-width="3"/>
      <rect x="145" y="130" width="30" height="30" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <line x1="160" y1="130" x2="160" y2="160" stroke="#38bdf8" stroke-width="1.5"/><line x1="145" y1="145" x2="175" y2="145" stroke="#38bdf8" stroke-width="1.5"/>
      <rect x="225" y="130" width="30" height="30" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <line x1="240" y1="130" x2="240" y2="160" stroke="#38bdf8" stroke-width="1.5"/><line x1="225" y1="145" x2="255" y2="145" stroke="#38bdf8" stroke-width="1.5"/>
      <rect x="185" y="130" width="30" height="45" fill="rgba(255,255,255,0.08)" stroke="#ffffff" stroke-width="2"/>
      <line x1="60" y1="175" x2="340" y2="175" stroke="#64748b" stroke-width="2"/>
      <line x1="70" y1="175" x2="70" y2="55" stroke="#94a3b8" stroke-width="2" opacity="0.6"/>
      <line x1="45" y1="55" x2="130" y2="55" stroke="#94a3b8" stroke-width="2" opacity="0.6"/>
      <line x1="70" y1="55" x2="110" y2="40" stroke="#94a3b8" stroke-width="1.5" opacity="0.6"/>
      <line x1="110" y1="55" x2="110" y2="80" stroke="#f59e0b" stroke-width="1.5" opacity="0.8"/>
      <rect x="20" y="20" width="140" height="24" rx="12" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" stroke-width="1"/>
      <text x="90" y="36" fill="#fbbf24" font-size="11" font-family="system-ui,sans-serif" font-weight="700" text-anchor="middle">NEW CONSTRUCTION</text>
    </svg>
  `)}`,

  renovation: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" width="400" height="220">
      <defs>
        <linearGradient id="bg-ren" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1c1917"/>
          <stop offset="100%" stop-color="#292524"/>
        </linearGradient>
        <linearGradient id="accent-ren" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ea580c"/>
          <stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#bg-ren)"/>
      <g opacity="0.08" stroke="#ffffff" stroke-width="1">
        <line x1="0" y1="40" x2="400" y2="40"/><line x1="0" y1="80" x2="400" y2="80"/><line x1="0" y1="120" x2="400" y2="120"/><line x1="0" y1="160" x2="400" y2="160"/>
        <line x1="100" y1="0" x2="100" y2="220"/><line x1="200" y1="0" x2="200" y2="220"/><line x1="300" y1="0" x2="300" y2="220"/>
      </g>
      <rect x="110" y="70" width="180" height="100" rx="4" fill="rgba(234,88,12,0.1)" stroke="url(#accent-ren)" stroke-width="2.5"/>
      <line x1="110" y1="105" x2="290" y2="105" stroke="#f97316" stroke-width="1.5" opacity="0.6"/>
      <line x1="110" y1="140" x2="290" y2="140" stroke="#f97316" stroke-width="1.5" opacity="0.6"/>
      <line x1="155" y1="70" x2="155" y2="105" stroke="#f97316" stroke-width="1.5" opacity="0.6"/>
      <line x1="245" y1="70" x2="245" y2="105" stroke="#f97316" stroke-width="1.5" opacity="0.6"/>
      <line x1="200" y1="105" x2="200" y2="140" stroke="#f97316" stroke-width="1.5" opacity="0.6"/>
      <rect x="230" y="60" width="45" height="14" rx="3" fill="#ea580c"/>
      <path d="M252,74 L252,90 L268,90 L268,110" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round"/>
      <rect x="264" y="110" width="8" height="24" rx="2" fill="#78716c"/>
      <line x1="60" y1="175" x2="340" y2="175" stroke="#78716c" stroke-width="2"/>
      <rect x="20" y="20" width="105" height="24" rx="12" fill="rgba(234,88,12,0.2)" stroke="#ea580c" stroke-width="1"/>
      <text x="72" y="36" fill="#fb923c" font-size="11" font-family="system-ui,sans-serif" font-weight="700" text-anchor="middle">RENOVATION</text>
    </svg>
  `)}`,

  home_extension: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" width="400" height="220">
      <defs>
        <linearGradient id="bg-ext" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e3a5f"/>
        </linearGradient>
        <linearGradient id="accent-ext" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#06b6d4"/>
          <stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#bg-ext)"/>
      <g opacity="0.08" stroke="#ffffff" stroke-width="1">
        <line x1="0" y1="40" x2="400" y2="40"/><line x1="0" y1="80" x2="400" y2="80"/><line x1="0" y1="120" x2="400" y2="120"/><line x1="0" y1="160" x2="400" y2="160"/>
        <line x1="100" y1="0" x2="100" y2="220"/><line x1="200" y1="0" x2="200" y2="220"/><line x1="300" y1="0" x2="300" y2="220"/>
      </g>
      <polygon points="90,170 90,110 160,65 220,110 220,170" fill="rgba(255,255,255,0.05)" stroke="#64748b" stroke-width="2"/>
      <rect x="110" y="125" width="25" height="25" fill="none" stroke="#64748b" stroke-width="1.5"/>
      <rect x="148" y="125" width="22" height="45" fill="none" stroke="#64748b" stroke-width="1.5"/>
      <rect x="220" y="85" width="100" height="85" fill="rgba(6,182,212,0.12)" stroke="url(#accent-ext)" stroke-width="2.5"/>
      <rect x="235" y="100" width="30" height="70" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <rect x="275" y="100" width="30" height="70" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <line x1="50" y1="170" x2="350" y2="170" stroke="#475569" stroke-width="2"/>
      <line x1="240" y1="65" x2="300" y2="65" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4"/>
      <polygon points="305,65 298,60 298,70" fill="#38bdf8"/>
      <rect x="20" y="20" width="130" height="24" rx="12" fill="rgba(6,182,212,0.2)" stroke="#06b6d4" stroke-width="1"/>
      <text x="85" y="36" fill="#38bdf8" font-size="11" font-family="system-ui,sans-serif" font-weight="700" text-anchor="middle">HOME EXTENSION</text>
    </svg>
  `)}`,

  interior: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" width="400" height="220">
      <defs>
        <linearGradient id="bg-int" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#18181b"/>
          <stop offset="100%" stop-color="#27272a"/>
        </linearGradient>
        <linearGradient id="accent-int" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#8b5cf6"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#bg-int)"/>
      <line x1="90" y1="50" x2="90" y2="170" stroke="#3f3f46" stroke-width="3"/>
      <line x1="102" y1="50" x2="102" y2="170" stroke="#3f3f46" stroke-width="3"/>
      <line x1="114" y1="50" x2="114" y2="170" stroke="#3f3f46" stroke-width="3"/>
      <line x1="126" y1="50" x2="126" y2="170" stroke="#3f3f46" stroke-width="3"/>
      <line x1="180" y1="0" x2="180" y2="70" stroke="#a855f7" stroke-width="1.5"/>
      <polygon points="172,78 188,78 180,68" fill="#a855f7"/>
      <circle cx="180" cy="80" r="3" fill="#fde047"/>
      <line x1="220" y1="0" x2="220" y2="55" stroke="#a855f7" stroke-width="1.5"/>
      <polygon points="212,63 228,63 220,53" fill="#a855f7"/>
      <circle cx="220" cy="65" r="3" fill="#fde047"/>
      <rect x="180" y="130" width="80" height="40" rx="8" fill="rgba(139,92,246,0.15)" stroke="url(#accent-int)" stroke-width="2"/>
      <rect x="195" y="115" width="50" height="25" rx="5" fill="none" stroke="url(#accent-int)" stroke-width="2"/>
      <line x1="190" y1="170" x2="185" y2="182" stroke="#e4e4e7" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="250" y1="170" x2="255" y2="182" stroke="#e4e4e7" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="60" y1="182" x2="340" y2="182" stroke="#52525b" stroke-width="2"/>
      <rect x="20" y="20" width="95" height="24" rx="12" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" stroke-width="1"/>
      <text x="67" y="36" fill="#c084fc" font-size="11" font-family="system-ui,sans-serif" font-weight="700" text-anchor="middle">INTERIOR</text>
    </svg>
  `)}`,

  industrial: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" width="400" height="220">
      <defs>
        <linearGradient id="bg-ind" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#134e4a"/>
        </linearGradient>
        <linearGradient id="accent-ind" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#34d399"/>
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#bg-ind)"/>
      <g opacity="0.08" stroke="#ffffff" stroke-width="1">
        <line x1="0" y1="40" x2="400" y2="40"/><line x1="0" y1="80" x2="400" y2="80"/><line x1="0" y1="120" x2="400" y2="120"/><line x1="0" y1="160" x2="400" y2="160"/>
      </g>
      <polygon points="100,170 100,105 140,80 140,105 180,80 180,105 220,80 220,105 260,80 260,170" fill="rgba(16,185,129,0.12)" stroke="url(#accent-ind)" stroke-width="2.5"/>
      <line x1="80" y1="60" x2="280" y2="60" stroke="#f59e0b" stroke-width="3"/>
      <line x1="120" y1="60" x2="140" y2="45" stroke="#f59e0b" stroke-width="2"/>
      <line x1="160" y1="60" x2="180" y2="45" stroke="#f59e0b" stroke-width="2"/>
      <line x1="200" y1="60" x2="220" y2="45" stroke="#f59e0b" stroke-width="2"/>
      <line x1="240" y1="60" x2="260" y2="45" stroke="#f59e0b" stroke-width="2"/>
      <rect x="165" y="130" width="30" height="40" fill="none" stroke="#34d399" stroke-width="2"/>
      <line x1="60" y1="170" x2="340" y2="170" stroke="#475569" stroke-width="2"/>
      <rect x="20" y="20" width="105" height="24" rx="12" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="1"/>
      <text x="72" y="36" fill="#34d399" font-size="11" font-family="system-ui,sans-serif" font-weight="700" text-anchor="middle">INDUSTRIAL</text>
    </svg>
  `)}`,

  other: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" width="400" height="220">
      <defs>
        <linearGradient id="bg-oth" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b2a55"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
        <linearGradient id="accent-oth" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#bg-oth)"/>
      <g opacity="0.1" stroke="#ffffff" stroke-width="1">
        <line x1="0" y1="40" x2="400" y2="40"/><line x1="0" y1="80" x2="400" y2="80"/><line x1="0" y1="120" x2="400" y2="120"/><line x1="0" y1="160" x2="400" y2="160"/>
        <line x1="100" y1="0" x2="100" y2="220"/><line x1="200" y1="0" x2="200" y2="220"/><line x1="300" y1="0" x2="300" y2="220"/>
      </g>
      <polygon points="200,60 140,165 260,165" fill="none" stroke="url(#accent-oth)" stroke-width="2.5"/>
      <circle cx="200" cy="60" r="6" fill="#38bdf8"/>
      <line x1="160" y1="130" x2="240" y2="130" stroke="#38bdf8" stroke-width="2"/>
      <line x1="60" y1="175" x2="340" y2="175" stroke="#64748b" stroke-width="2"/>
      <rect x="20" y="20" width="115" height="24" rx="12" fill="rgba(2,132,199,0.2)" stroke="#0284c7" stroke-width="1"/>
      <text x="77" y="36" fill="#38bdf8" font-size="11" font-family="system-ui,sans-serif" font-weight="700" text-anchor="middle">CONSTRUCTION</text>
    </svg>
  `)}`
};

function getProjectCardImage(projectType) {
  const norm = String(projectType || "").trim().toLowerCase();
  if (norm.includes("commercial")) {
    return "hero-building.jpg";
  }
  if (norm.includes("new") || (norm.includes("construct") && !norm.includes("indust"))) {
    return PROJECT_CATEGORY_IMAGES.new_construction;
  }
  if (norm.includes("renov") || norm.includes("remodel")) {
    return PROJECT_CATEGORY_IMAGES.renovation;
  }
  if (norm.includes("extens")) {
    return PROJECT_CATEGORY_IMAGES.home_extension;
  }
  if (norm.includes("interior") || norm.includes("design")) {
    return PROJECT_CATEGORY_IMAGES.interior;
  }
  if (norm.includes("indust") || norm.includes("factory") || norm.includes("warehouse")) {
    return PROJECT_CATEGORY_IMAGES.industrial;
  }
  return PROJECT_CATEGORY_IMAGES.other;
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
