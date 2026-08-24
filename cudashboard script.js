// ============================================================
// DYNAMIC DASHBOARD CONTROLLER (BuildBid)
// ============================================================

const API_BASE_URL = "https://buildbid-ap3j.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("marketplaceToken");
  let user = JSON.parse(localStorage.getItem("currentUser")) || {};

  // 1. Initial Render with available stored data
  renderUserProfile(user);
  renderUserStats(user.stats);
  renderVerificationStatus(user.verifications);
  renderRecentActivities(user.activities);

  // 2. Fetch fresh details from backend (agar token ho)
  if (token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const liveUserData = await response.json();
        
        // Backend data merge karein bina local phone ko overwrite kiye
        user = {
          ...user,
          ...liveUserData,
          phone: (liveUserData.phone && liveUserData.phone.trim() !== "") ? liveUserData.phone : (user.phone || ""),
          location: (liveUserData.location && liveUserData.location.trim() !== "") ? liveUserData.location : (user.location || "")
        };

        localStorage.setItem("currentUser", JSON.stringify(user));
        
        // Re-render with synced data
        renderUserProfile(user);
      }
    } catch (err) {
      console.warn("Backend /api/me unreachable, using cached data.", err);
    }
  }

  // 3. Logout handler
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.clear();
      alert("You have logged out.");
      window.location.href = "index.html";
    });
  }
});

// ============================================================
// 1. RENDER USER PROFILE DATA
// ============================================================
function renderUserProfile(user) {
  const fullName = user.name || user.username || "Customer";
  const firstName = fullName.split(" ")[0];
  const email = user.email || "--";
  
  // Real Phone Number Check
  const phone = (user.phone && user.phone.trim() !== "") ? user.phone : "--";
  
  const role = (user.role || (user.roles && user.roles[0]) || "Customer").toUpperCase();
  const avatarUrl = user.avatarUrl || `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(fullName)}`;

  // Header
  const navUserName = document.getElementById("navUserName");
  if (navUserName) navUserName.textContent = firstName;
  
  const navUserRole = document.getElementById("navUserRole");
  if (navUserRole) navUserRole.textContent = role;
  
  const navAvatar = document.getElementById("navAvatar");
  if (navAvatar) navAvatar.src = avatarUrl;

  // Hero Card
  const heroName = document.getElementById("heroName");
  if (heroName) heroName.textContent = fullName;
  
  const heroAvatar = document.getElementById("heroAvatar");
  if (heroAvatar) heroAvatar.src = avatarUrl;
  
  const heroRoleDisplay = document.getElementById("heroRoleDisplay");
  if (heroRoleDisplay) heroRoleDisplay.textContent = role;

  // Location Visibility (Varanasi bilkul nahi aayega agar user ne location nahi dali)
  const locationWrapper = document.getElementById("locationWrapper");
  const heroLocation = document.getElementById("heroLocation");
  if (heroLocation && locationWrapper) {
    if (user.location && user.location.trim() !== "") {
      heroLocation.textContent = user.location;
      locationWrapper.style.display = "inline-block";
    } else {
      locationWrapper.style.display = "none";
    }
  }

  // Member Since (Current Year 2026)
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'short' });
  const currentYear = currentDate.getFullYear();
  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' }) : `${currentMonth} ${currentYear}`;
  
  const heroMemberSince = document.getElementById("heroMemberSince");
  if (heroMemberSince) {
    heroMemberSince.textContent = `Member since ${joinDate}`;
  }

  // About Me Section
  const bioName = document.getElementById("bioName");
  if (bioName) bioName.textContent = fullName;

  const aboutBio = document.getElementById("aboutBio");
  if (aboutBio) {
    aboutBio.textContent = user.bio || `Hi! I am ${fullName}, using BuildBid to plan and manage my construction projects efficiently. I love working with trusted professionals and quality materials to build my dream projects.`;
  }

  const dataFullName = document.getElementById("dataFullName");
  if (dataFullName) dataFullName.textContent = fullName;

  const dataEmail = document.getElementById("dataEmail");
  if (dataEmail) dataEmail.textContent = email;
  
  // Real Phone Number update
  const dataPhone = document.getElementById("dataPhone");
  if (dataPhone) dataPhone.textContent = phone;

  const dataLanguage = document.getElementById("dataLanguage");
  if (dataLanguage) dataLanguage.textContent = user.language || "English, Hindi";
}

// ============================================================
// 2. RENDER STATS
// ============================================================
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

// ============================================================
// 3. RENDER VERIFICATION STATUS
// ============================================================
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

// ============================================================
// 4. RENDER RECENT ACTIVITIES
// ============================================================
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