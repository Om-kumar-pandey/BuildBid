document.addEventListener("DOMContentLoaded", () => {
  syncAndLoadUserProfile(); // Dynamic User Name, Avatar, Role Sync
  fetchCustomerProjects();  // Dynamic Projects API Fetch
  initFilters();
});

let allProjects = [];

// Dynamic User Header Synchronization
async function syncAndLoadUserProfile() {
  // 1. Check local session/storage for logged-in user
  const storedUser = 
    JSON.parse(localStorage.getItem("customerUser") || "null") ||
    JSON.parse(localStorage.getItem("userData") || "null") ||
    JSON.parse(localStorage.getItem("user") || "null") ||
    JSON.parse(sessionStorage.getItem("user") || "null");

  if (storedUser && (storedUser.name || storedUser.fullName)) {
    applyUserDataToHeader(storedUser);
  }

  // 2. Fetch fresh user data from Backend API
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
    const response = await fetch("/api/customer/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.ok) {
      const userData = await response.json();
      localStorage.setItem("customerUser", JSON.stringify(userData));
      applyUserDataToHeader(userData);
    }
  } catch (err) {
    // Agar local offline/file run ho raha ho, toh stored data ya current view name maintain rahega
    console.log("Backend offline or local file run. Using stored session user.");
  }
}

function applyUserDataToHeader(user) {
  const nameElem = document.getElementById("user-display-name");
  const avatarElem = document.getElementById("user-avatar-initials");
  const roleElem = document.getElementById("user-display-role");
  const notifBadge = document.getElementById("notification-count");
  const msgBadge = document.getElementById("message-count");

  const fullName = user.name || user.fullName || user.username || "Heman kumar";
  
  // First name or full name display
  if (nameElem) {
    nameElem.textContent = fullName.split(" ")[0] || fullName;
  }
  
  if (roleElem) {
    roleElem.textContent = (user.role || "CUSTOMER").toUpperCase();
  }

  // Initials (e.g. "Heman kumar" -> "HK")
  if (avatarElem) {
    const initials = fullName
      .trim()
      .split(" ")
      .filter(Boolean)
      .map(part => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    avatarElem.textContent = initials || "HK";
  }

  // Badges
  if (notifBadge) {
    if (user.notificationsCount && user.notificationsCount > 0) {
      notifBadge.textContent = user.notificationsCount;
      notifBadge.style.display = "inline-block";
    } else {
      notifBadge.style.display = "none";
    }
  }

  if (msgBadge) {
    if (user.messagesCount && user.messagesCount > 0) {
      msgBadge.textContent = user.messagesCount;
      msgBadge.style.display = "inline-block";
    } else {
      msgBadge.style.display = "none";
    }
  }
}

// Fetch Projects Data Dynamically
async function fetchCustomerProjects() {
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
    const response = await fetch("/api/customer/projects", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("API call failed");
    }

    const data = await response.json();
    allProjects = data.projects || [];

    updateSummaryStats(data.metrics);
    renderProjectsTable(allProjects);
  } catch (error) {
    console.log("No dynamic projects loaded yet or API unavailable.");
    renderProjectsTable([]);
  }
}

function updateSummaryStats(metrics) {
  document.getElementById("total-projects").textContent = metrics?.totalProjects ?? 0;
  document.getElementById("active-projects").textContent = metrics?.activeProjects ?? 0;
  document.getElementById("completed-projects").textContent = metrics?.completedProjects ?? 0;
  document.getElementById("total-bids").textContent = metrics?.totalBids ?? 0;
}

function renderProjectsTable(projects) {
  const tbody = document.getElementById("projects-tbody");
  tbody.innerHTML = "";

  if (!projects || projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">No projects found. Click on "Post New Project" to create one.</td></tr>`;
    document.getElementById("pagination-info").textContent = "Showing 0 of 0 projects";
    return;
  }

  projects.forEach((proj) => {
    const statusClass = getStatusClass(proj.status);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <div class="project-cell">
          <img src="${proj.imageUrl || 'https://via.placeholder.com/80?text=Project'}" alt="${proj.title}">
          <div>
            <div class="project-name">${proj.title}</div>
            <div class="project-meta">
              <i class="fa-solid fa-location-dot"></i> ${proj.location} &bull; ${proj.area || ''} &bull; ${proj.category || ''}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span class="status-badge ${statusClass}">${proj.status}</span>
      </td>
      <td>
        <div class="bids-count">${proj.bidsCount || 0}</div>
        <div class="bids-sub">Bids Received</div>
      </td>
      <td>
        <div class="date-info">${proj.lastUpdatedDate || 'N/A'}</div>
        <div class="date-sub">${proj.lastUpdatedTime || ''}</div>
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-view" onclick="viewProjectDetails('${proj.id}')">View Details</button>
          <button class="btn-more"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("pagination-info").textContent = `Showing 1 to ${projects.length} of ${projects.length} projects`;
}

function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case "in progress": return "status-in-progress";
    case "completed": return "status-completed";
    case "pending": return "status-pending";
    default: return "";
  }
}

function viewProjectDetails(projectId) {
  window.location.href = `/customer/project-details/${projectId}`;
}

// Search & Filter Handlers
function initFilters() {
  const searchInput = document.getElementById("search-input");
  const statusFilter = document.getElementById("status-filter");
  const categoryFilter = document.getElementById("category-filter");

  const runFilter = () => {
    const query = searchInput.value.toLowerCase().trim();
    const status = statusFilter.value;
    const category = categoryFilter.value;

    const filtered = allProjects.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(query) || (p.location && p.location.toLowerCase().includes(query));
      const matchStatus = status === "All" || p.status === status;
      const matchCategory = category === "All" || p.category === category;
      return matchSearch && matchStatus && matchCategory;
    });

    renderProjectsTable(filtered);
  };

  searchInput.addEventListener("input", runFilter);
  statusFilter.addEventListener("change", runFilter);
  categoryFilter.addEventListener("change", runFilter);
}
