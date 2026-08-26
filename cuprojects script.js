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
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || sessionStorage.getItem("token") || "";
  if (token) {
    fetch("/api/customer/profile", {
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
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";

  // 1. Check local storage first
  const localProjects = JSON.parse(localStorage.getItem("customerProjects") || "[]");
  allProjectsList = localProjects;

  // 2. Try fetching from Backend API
  if (token) {
    try {
      const response = await fetch("/api/customer/projects", {
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
    const matchesSearch = 
      (proj.title && proj.title.toLowerCase().includes(searchQuery)) ||
      (proj.location && proj.location.toLowerCase().includes(searchQuery)) ||
      (proj.category && proj.category.toLowerCase().includes(searchQuery));

    const matchesStatus = statusFilter === "ALL" || (proj.status && proj.status.toLowerCase() === statusFilter.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || (proj.category && proj.category.toLowerCase() === categoryFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesCategory;
  });

  renderTableRows(filtered);
  updateMetricsCounters(allProjectsList);
}

function renderTableRows(projects) {
  const tbody = document.getElementById("projectsTableBody");
  const emptyBox = document.getElementById("emptyStateBox");
  const countDisplay = document.getElementById("showingResultsCount");

  if (!projects || projects.length === 0) {
    tbody.innerHTML = "";
    emptyBox.style.display = "block";
    countDisplay.textContent = `Showing 0 of ${allProjectsList.length} projects`;
    return;
  }

  emptyBox.style.display = "none";
  countDisplay.textContent = `Showing ${projects.length} of ${allProjectsList.length} projects`;

  tbody.innerHTML = projects.map(proj => {
    const statusClass = (proj.status || "In Progress").toLowerCase().replace(" ", "-");
    return `
      <tr>
        <td>
          <div class="project-title-text">${proj.title || "Untitled Project"}</div>
          <div class="project-sub-text">${proj.location || "N/A"} • ${proj.area || "--"} • ${proj.category || "General"}</div>
        </td>
        <td>
          <span class="status-badge ${statusClass}">${proj.status || "In Progress"}</span>
        </td>
        <td>
          <strong>${proj.bidsCount || 0}</strong> bids
        </td>
        <td>
          <div>${proj.updatedDate || "Today"}</div>
          <small class="project-sub-text">${proj.updatedTime || "Just now"}</small>
        </td>
        <td>
          <div class="action-btn-group">
            <button class="btn-table-action" onclick="viewProjectDetails('${proj.id}')"><i class="fa-regular fa-eye"></i> View</button>
            <button class="btn-table-action" onclick="deleteProject('${proj.id}')"><i class="fa-regular fa-trash-can"></i></button>
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
  const active = list.filter(p => (p.status || "").toLowerCase() === "in progress").length;
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
    alert(`Project Details:\nTitle: ${project.title}\nCategory: ${project.category}\nStatus: ${project.status}`);
  }
}

function resetFilters() {
  document.getElementById("projectSearchInput").value = "";
  document.getElementById("statusFilter").value = "ALL";
  document.getElementById("categoryFilter").value = "ALL";
  document.getElementById("timeFilter").value = "ALL";
  filterAndRenderProjects();
}
