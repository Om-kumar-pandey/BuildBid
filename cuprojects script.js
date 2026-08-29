/* =========================================================
   BUILDBID - CUSTOMER PROJECTS DASHBOARD SCRIPT (Fully Fixed)
   ========================================================= */
const API_BASE_URL = "https://buildbid-ap3j.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  syncUniversalUserProfile();
  loadCustomerProjects();
});

// In-Memory Project State
let allProjectsList = [];

/* =========================================================
   1. PURE DYNAMIC LOGGED-IN USER SYNC
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

  // Token Backend Fetch
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("marketplaceToken") || sessionStorage.getItem("token") || "";
  if (token) {
    fetch(API_BASE_URL + "/api/customer/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    })
    .then(res => res.ok ? res.json() : null)
    .then(freshUser => {
      if (freshUser) {
        localStorage.setItem("customerUser", JSON.stringify(freshUser));
        applyUserHeaderData(freshUser);
      }
    })
    .catch(() => {});
  }
}

function applyUserHeaderData(user) {
  const nameElem = document.getElementById("user-display-name");
  const avatarElem = document.getElementById("user-avatar-initials");
  const roleElem = document.getElementById("user-display-role");

  if (!user) return;

  const rawName = 
    user.name || 
    user.fullName || 
    user.fullname || 
    user.username || 
    user.userName || 
    user.firstName || 
    user.email?.split("@")[0] || 
    "User";

  const cleanName = String(rawName).trim();

  if (nameElem && cleanName) {
    nameElem.textContent = cleanName.split(" ")[0];
  }

  if (roleElem) {
    roleElem.textContent = (user.role || "CUSTOMER").toUpperCase();
  }

  if (avatarElem && cleanName) {
    const parts = cleanName.split(" ").filter(Boolean);
    let initials = "U";
    if (parts.length === 1) {
      initials = parts[0].substring(0, 2).toUpperCase();
    } else if (parts.length > 1) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    avatarElem.textContent = initials;
  }
}

/* =========================================================
   2. LOAD PROJECTS (API + LOCALSTORAGE SYNC)
   ========================================================= */
async function loadCustomerProjects() {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("marketplaceToken") || "";

  // 1. Check local storage first
  const localProjects = JSON.parse(localStorage.getItem("customerProjects") || "[]");
  allProjectsList = localProjects;

  // 2. Try fetching from Backend API (Render Database Connected)
  if (token) {
    try {
      const response = await fetch(API_BASE_URL + "/api/customer/projects", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const apiProjects = await response.json();
        if (Array.isArray(apiProjects)) {
          allProjectsList = apiProjects;
          localStorage.setItem("customerProjects", JSON.stringify(apiProjects));
        }
      }
    } catch (err) {
      console.log("Local/Offline Mode: Showing cached projects.");
    }
  }

  filterAndRenderProjects();
}

/* =========================================================
   3. DYNAMIC FILTER & RENDER ENGINE
   ========================================================= */
function filterAndRenderProjects() {
  const searchQuery = (document.getElementById("projectSearchInput")?.value || "").toLowerCase().trim();
  const statusFilter = document.getElementById("statusFilter")?.value || "ALL";
  const categoryFilter = document.getElementById("categoryFilter")?.value || "ALL";

  const filtered = allProjectsList.filter(proj => {
    // बैकएंड से आने वाले डेटा की प्रॉपर्टीज (title, city, type) के साथ सुरक्षित मिलान
    const projTitle = proj.title || "";
    const projLocation = proj.city ? `${proj.city}, ${proj.state || ""}` : (proj.location || "");
    const projCategory = proj.type || proj.category || "";

    const matchesSearch = 
      projTitle.toLowerCase().includes(searchQuery) ||
      projLocation.toLowerCase().includes(searchQuery) ||
      projCategory.toLowerCase().includes(searchQuery);

    const projStatus = proj.status || "In Progress";
    const matchesStatus = statusFilter === "ALL" || projStatus.toLowerCase() === statusFilter.toLowerCase();
    const matchesCategory = categoryFilter === "ALL" || projCategory.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesCategory;
  });

  renderTableRows(filtered);
  updateMetricsCounters(allProjectsList);
}

function renderTableRows(projects) {
  const tbody = document.getElementById("projectsTableBody");
  const emptyBox = document.getElementById("emptyStateBox");
  const countDisplay = document.getElementById("showingResultsCount");

  if (!tbody) return;

  if (!projects || projects.length === 0) {
    tbody.innerHTML = "";
    if (emptyBox) emptyBox.style.display = "block";
    if (countDisplay) countDisplay.textContent = `Showing 0 of ${allProjectsList.length} projects`;
    return;
  }

  if (emptyBox) emptyBox.style.display = "none";
  if (countDisplay) countDisplay.textContent = `Showing ${projects.length} of ${allProjectsList.length} projects`;

  tbody.innerHTML = projects.map(proj => {
    const statusVal = proj.status || "In Progress";
    const statusClass = statusVal.toLowerCase().replace(" ", "-");
    const displayLocation = proj.city ? `${proj.city}, ${proj.state || ""}` : (proj.location || "N/A");
    const displayArea = proj.builtUpArea ? `${proj.builtUpArea} sq ft` : (proj.area || "--");
    const displayCategory = proj.type || proj.category || "General";
    const displayDate = proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : (proj.updatedDate || "Today");

    return `
      <tr>
        <td>
          <div class="project-title-text" style="font-weight: 700; color: #1e293b; font-size: 15px;">${proj.title || "Untitled Project"}</div>
          <div class="project-sub-text" style="font-size: 13px; color: #64748b; margin-top: 3px;">📍 ${displayLocation} • 🏗️ ${displayArea} • ${displayCategory}</div>
        </td>
        <td>
          <span class="status-badge ${statusClass}" style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">${statusVal}</span>
        </td>
        <td>
          <strong>${proj.bidsCount || 0}</strong> bids
        </td>
        <td>
          <div>${displayDate}</div>
          <small class="project-sub-text">Just now</small>
        </td>
        <td>
          <div class="action-btn-group" style="display: flex; gap: 8px;">
            <button class="btn-table-action" onclick="viewProjectDetails('${proj.id}')" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; color: #334155; font-size: 13px;"><i class="fa-regular fa-eye"></i> View</button>
            <button class="btn-table-action" onclick="deleteProject('${proj.id}')" style="background: #fee2e2; border: 1px solid #fca5a5; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: #dc2626;"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/* =========================================================
   4. METRICS CARDS COUNTER
   ========================================================= */
function updateMetricsCounters(list) {
  const total = list.length;
  const active = list.filter(p => (p.status || "In Progress").toLowerCase() === "in progress" || (p.status || "").toLowerCase() === "active").length;
  const completed = list.filter(p => (p.status || "").toLowerCase() === "completed").length;
  const totalBids = list.reduce((acc, curr) => acc + (parseInt(curr.bidsCount) || 0), 0);

  if (document.getElementById("totalProjectsCount")) document.getElementById("totalProjectsCount").textContent = total;
  if (document.getElementById("activeProjectsCount")) document.getElementById("activeProjectsCount").textContent = active;
  if (document.getElementById("completedProjectsCount")) document.getElementById("completedProjectsCount").textContent = completed;
  if (document.getElementById("totalBidsCount")) document.getElementById("totalBidsCount").textContent = totalBids;
}

/* =========================================================
   5. ACTIONS & HELPERS
   ========================================================= */
function deleteProject(id) {
  if (confirm("Are you sure you want to delete this project?")) {
    allProjectsList = allProjectsList.filter(p => String(p.id) !== String(id));
    localStorage.setItem("customerProjects", JSON.stringify(allProjectsList));
    filterAndRenderProjects();
  }
}

function viewProjectDetails(id) {
  const project = allProjectsList.find(p => String(p.id) === String(id));
  if (project) {
    alert(`Project Details:\nTitle: ${project.title}\nCategory: ${project.type || project.category}\nStatus: ${project.status || 'In Progress'}`);
  }
}

function resetFilters() {
  document.getElementById("projectSearchInput").value = "";
  document.getElementById("statusFilter").value = "ALL";
  document.getElementById("categoryFilter").value = "ALL";
  document.getElementById("timeFilter").value = "ALL";
  filterAndRenderProjects();
}