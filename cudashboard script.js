// ============================================================
// DYNAMIC DASHBOARD CONTROLLER (BuildBid - Fully Synced)
// ============================================================

function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.location && window.location.origin && !window.location.origin.startsWith("file:")) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      if (window.location.port && window.location.port !== "8080") {
        return `${window.location.protocol}//${window.location.hostname}:8080`;
      }
      return window.location.origin;
    }
    return window.location.origin;
  }
  return "https://buildbid-ap3j.onrender.com";
}

const API_BASE_URL = getApiBaseUrl();
let toastTimeout;

function getCleanToken() {
  let token = localStorage.getItem("token") || 
              localStorage.getItem("authToken") || 
              localStorage.getItem("marketplaceToken") || 
              sessionStorage.getItem("token") || "";
  if (!token) return "";
  token = String(token).trim();
  let changed = true;
  while (changed) {
    changed = false;
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      token = token.slice(1, -1).trim();
      changed = true;
    }
    if (token.startsWith("Bearer ")) {
      token = token.substring(7).trim();
      changed = true;
    }
  }
  return token;
}

function performSelectiveLogout() {
  localStorage.removeItem("marketplaceToken");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("marketplaceUser");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("customerUser");
  localStorage.removeItem("buildbid_user");
  sessionStorage.removeItem("pendingRedirect");
  sessionStorage.removeItem("userData");
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = getCleanToken();
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  // 1. Initial Render with available stored data
  let user = {};
  const storageKeys = ["currentUser", "customerUser", "marketplaceUser", "userData"];
  for (const key of storageKeys) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      if (parsed && typeof parsed === "object") {
        user = { ...user, ...parsed };
        const pName = parsed.name || parsed.fullName || parsed.username;
        if (pName && pName.toLowerCase() !== "customer" && pName.toLowerCase() !== "user") {
          user.name = pName;
        }
      }
    } catch (e) {}
  }

  renderUserProfile(user);
  renderUserStats(user.stats);
  renderVerificationStatus(user.verifications);
  renderRecentActivities(user.activities);

  // 2. Fetch fresh details from backend
  try {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.ok) {
      const liveUserData = await response.json();

      user = {
        ...user,
        ...liveUserData,
        name: (liveUserData.name && liveUserData.name.trim() !== "") ? liveUserData.name : (user.name || ""),
        email: (liveUserData.email && liveUserData.email.trim() !== "") ? liveUserData.email : (user.email || ""),
        phone: (liveUserData.phone && liveUserData.phone.trim() !== "") ? liveUserData.phone : (user.phone || ""),
        location: (liveUserData.location && liveUserData.location.trim() !== "") ? liveUserData.location : (user.location || "")
      };

      const primaryRole = (liveUserData.roles && liveUserData.roles.length > 0)
        ? (typeof liveUserData.roles[0] === "string" ? liveUserData.roles[0] : liveUserData.roles[0].name || "")
        : (user.role || "CUSTOMER");
      user.role = primaryRole.replace("ROLE_", "").toUpperCase();

      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("customerUser", JSON.stringify(user));

      // Re-render with database synced data
      renderUserProfile(user);

      // Enforce correct role isolation smoothly without breaking navigation loops
      const activeRole = user.role;
      if (activeRole === "CONTRACTOR") {
        window.location.href = "dashborad.html";
        return;
      } else if (activeRole === "MATERIAL_SELLER" || activeRole === "SELLER") {
        window.location.href = "material seller dashboard.html";
        return;
      } else if (activeRole === "PROFESSIONAL" || activeRole === "SERVICE_PROVIDER") {
        window.location.href = "professional dashboard.html";
        return;
      }
    } else {
      console.warn("Live profile sync status:", response.status);
    }

    // Fetch actual project count from database for 'Projects Posted'
    const projResponse = await fetch(`${API_BASE_URL}/api/customer/projects`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (projResponse.ok) {
      const dbProjects = await projResponse.json();
      if (Array.isArray(dbProjects)) {
        if (!user.stats) user.stats = {};
        user.stats.projectsPosted = dbProjects.length;
        renderUserStats(user.stats);
      }
    }

  } catch (err) {
    console.warn("Backend sync failed, using cached data.", err);
  }

  // 3. Logout handler with Toast Notification - ONLY ON EXPLICIT LOGOUT CLICK
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      performSelectiveLogout();
      showToast("Notice", "You have logged out successfully.");
    });
  }

  // 4. In-page Profile click handling - NEVER LOG OUT ON PROFILE NAVIGATION
  const profileLinks = document.querySelectorAll('a[href*="customer dashboard.html"]');
  profileLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      if (window.location.pathname.endsWith("customer dashboard.html") || 
          window.location.pathname.endsWith("customer%20dashboard.html") ||
          window.location.pathname === "/" ||
          window.location.pathname.endsWith("/customer dashboard.html")) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const currentToken = getCleanToken();
        if (currentToken) {
          fetch(`${API_BASE_URL}/api/me`, {
            headers: { "Authorization": `Bearer ${currentToken}` }
          })
          .then(res => res.ok ? res.json() : null)
          .then(userData => {
            if (userData) {
              localStorage.setItem("currentUser", JSON.stringify(userData));
              localStorage.setItem("customerUser", JSON.stringify(userData));
              renderUserProfile(userData);
            }
          })
          .catch(() => {});
        }
      }
    });
  });
});

// Toast Notification Functions
function showToast(title = "Notice", message = "You have logged out successfully.") {
  const toast = document.getElementById("custom-toast");
  if (!toast) {
    performSelectiveLogout();
    window.location.href = "index.html";
    return;
  }

  document.getElementById("toast-title").innerText = title;
  document.getElementById("toast-message").innerText = message;

  toast.classList.add("show");
  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    hideToast();
    window.location.href = "index.html";
  }, 2500);
}

function hideToast() {
  const toast = document.getElementById("custom-toast");
  if (toast) {
    toast.classList.remove("show");
  }
}

function renderUserProfile(user) {
  if (!user) user = {};

  const rawName = (user.name || user.fullName || user.fullname || user.username || user.userName || "").toString().trim();
  const fullName = (rawName && rawName.toLowerCase() !== "customer" && rawName.toLowerCase() !== "user")
    ? rawName
    : (user.email ? user.email.split("@")[0] : "Customer");

  const firstName = fullName.split(" ")[0];
  const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const email = user.email || "--";
  const phone = (user.phone && String(user.phone).trim() !== "") ? String(user.phone).trim() : "Not Provided";
  
  const role = (user.role || (user.roles && user.roles[0]) || "Customer")
    .toString()
    .replace("ROLE_", "")
    .toUpperCase();

  const avatarUrl = user.avatarUrl || `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(fullName)}`;

  const navUserName = document.getElementById("navUserName");
  if (navUserName) navUserName.textContent = formattedFirstName;

  const navUserRole = document.getElementById("navUserRole");
  if (navUserRole) navUserRole.textContent = role;

  const navAvatar = document.getElementById("navAvatar");
  if (navAvatar) navAvatar.src = avatarUrl;

  const heroName = document.getElementById("heroName");
  if (heroName) heroName.textContent = fullName;

  const heroAvatar = document.getElementById("heroAvatar");
  if (heroAvatar) heroAvatar.src = avatarUrl;

  const heroRoleDisplay = document.getElementById("heroRoleDisplay");
  if (heroRoleDisplay) heroRoleDisplay.textContent = role;

  const locationWrapper = document.getElementById("locationWrapper");
  const heroLocation = document.getElementById("heroLocation");
  if (heroLocation && locationWrapper) {
    if (user.location && String(user.location).trim() !== "") {
      heroLocation.textContent = String(user.location).trim();
      locationWrapper.style.display = "inline-block";
    } else {
      locationWrapper.style.display = "none";
    }
  }

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'short' });
  const currentYear = currentDate.getFullYear();
  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' }) : `${currentMonth} ${currentYear}`;
  const heroMemberSince = document.getElementById("heroMemberSince");
  if (heroMemberSince) {
    heroMemberSince.textContent = `Member since ${joinDate}`;
  }

  const bioName = document.getElementById("bioName");
  if (bioName) bioName.textContent = fullName;

  const aboutBioElem = document.getElementById("aboutBio");
  if (aboutBioElem) {
    aboutBioElem.textContent = user.bio || `Hi! I am ${fullName}, using BuildBid to plan and manage my construction projects efficiently.`;
  }

  const dataFullName = document.getElementById("dataFullName");
  if (dataFullName) dataFullName.textContent = (fullName && fullName.toLowerCase() !== "customer") ? fullName : "--";

  const dataEmail = document.getElementById("dataEmail");
  if (dataEmail) dataEmail.textContent = email;

  const dataPhone = document.getElementById("dataPhone");
  if (dataPhone) dataPhone.textContent = phone;

  const dataLanguage = document.getElementById("dataLanguage");
  if (dataLanguage) dataLanguage.textContent = user.language || "English, Hindi";
}

function renderUserStats(stats) {
  const userStats = stats || { projectsPosted: 0, bidsReceived: 0, ordersPlaced: 0, averageRating: 5.0 };
  const statProjectsPosted = document.getElementById("statProjectsPosted");
  if (statProjectsPosted) statProjectsPosted.textContent = userStats.projectsPosted;

  const statBidsReceived = document.getElementById("statBidsReceived");
  if (statBidsReceived) statBidsReceived.textContent = userStats.bidsReceived;

  const statOrdersPlaced = document.getElementById("statOrdersPlaced");
  if (statOrdersPlaced) statOrdersPlaced.textContent = userStats.ordersPlaced;

  const statAverageRating = document.getElementById("statAverageRating");
  if (statAverageRating) statAverageRating.textContent = parseFloat(userStats.averageRating).toFixed(1);
}

function renderVerificationStatus(verifications) {
  const verifyContainer = document.getElementById("verificationContainer");
  if (!verifyContainer) return;

  const defaultVerifications = verifications || [
    { title: "Email Verified", isVerified: true },
    { title: "Phone Verified", isVerified: true },
    { title: "ID Proof Verified", isVerified: false },
    { title: "Address Verified", isVerified: false }
  ];

  verifyContainer.innerHTML = defaultVerifications.map(item => `
    <div class="check-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <i class="fa-solid fa-circle-check" style="color: ${item.isVerified ? '#10b981' : '#cbd5e1'};"></i>
      <span style="${!item.isVerified ? 'color: #94a3b8;' : ''}">${item.title}</span>
    </div>
  `).join('');
}

function renderRecentActivities(activities) {
  const container = document.getElementById("activityContainer");
  if (!container) return;

  const activityList = (activities && activities.length > 0) ? activities : [
    { title: 'Welcome to BuildBid! Complete your profile to get started.', time: 'Just now' }
  ];

  container.innerHTML = activityList.map(act => `
    <div class="timeline-row">
      <div class="timeline-icon bg-light-blue"><i class="fa-regular fa-file-lines icon-blue"></i></div>
      <div class="timeline-text"><p>${act.title}</p></div>
      <div class="timeline-time">${act.time}</div>
    </div>
  `).join('');
}

const myProjectsBtn = document.getElementById("my-projects-tab-btn");
if (myProjectsBtn) {
  myProjectsBtn.addEventListener("click", () => {
    const profileSec = document.getElementById("profile-section");
    const projSec = document.getElementById("projects-section");
    if (profileSec) profileSec.style.display = "none";
    if (projSec) projSec.style.display = "block";
  });
}
