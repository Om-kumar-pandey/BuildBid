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
      let toastTimeout;

function showToast(title = "Notice", message = "You have logged out successfully.") {
  const toast = document.getElementById("custom-toast");
  document.getElementById("toast-title").innerText = title;
  document.getElementById("toast-message").innerText = message;

  // Show Toast
  toast.classList.add("show");

  // Agar pehle se koi timer chal raha ho to clear karein
  clearTimeout(toastTimeout);

  // 2.5 seconds ke baad automatic band ho kar login page pe redirect karega
  toastTimeout = setTimeout(() => {
    hideToast();
    
    // Redirect code (apna actual login page link yahan replace karein)
    window.location.href = "index.html"; 
  }, 2500);
}

function hideToast() {
  const toast = document.getElementById("custom-toast");
  toast.classList.remove("show");
}
      window.location.href = "index.html";
    });
  }
});

function renderUserProfile(user) {
  const fullName = user.name || user.username || "Customer";
  const firstName = fullName.split(" ")[0];
  const email = user.email || "--";
  
  // Real Phone Number Check (Hardcoded number bilkul nahi aayega)
  const phone = (user.phone && user.phone.trim() !== "") ? user.phone : "Not Provided";
  
  const role = (user.role || (user.roles && user.roles[0]) || "Customer").toUpperCase();
  const avatarUrl = user.avatarUrl || `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(fullName)}`;

  // Header Updates
  if (document.getElementById("navUserName")) document.getElementById("navUserName").textContent = firstName;
  if (document.getElementById("navUserRole")) document.getElementById("navUserRole").textContent = role;
  if (document.getElementById("navAvatar")) document.getElementById("navAvatar").src = avatarUrl;

  // Hero Card Updates
  if (document.getElementById("heroName")) document.getElementById("heroName").textContent = fullName;
  if (document.getElementById("heroAvatar")) document.getElementById("heroAvatar").src = avatarUrl;
  if (document.getElementById("heroRoleDisplay")) document.getElementById("heroRoleDisplay").textContent = role;

  // Location: Agar location hai toh hi dikhaye, nahi toh hide kar de
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

  // Member Since (2026)
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'short' });
  const currentYear = currentDate.getFullYear();
  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' }) : `${currentMonth} ${currentYear}`;
  if (document.getElementById("heroMemberSince")) {
    document.getElementById("heroMemberSince").textContent = `Member since ${joinDate}`;
  }

  // About Me Section
  if (document.getElementById("bioName")) document.getElementById("bioName").textContent = fullName;
  if (document.getElementById("aboutBio")) {
    aboutBio.textContent = user.bio || `Hi! I am ${fullName}, using BuildBid to plan and manage my construction projects efficiently.`;
  }
  if (document.getElementById("dataFullName")) document.getElementById("dataFullName").textContent = fullName;
  if (document.getElementById("dataEmail")) document.getElementById("dataEmail").textContent = email;
  if (document.getElementById("dataPhone")) document.getElementById("dataPhone").textContent = phone;
  if (document.getElementById("dataLanguage")) document.getElementById("dataLanguage").textContent = user.language || "English, Hindi";
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
document.getElementById("my-projects-tab-btn").addEventListener("click", () => {
  // 1. Profile section hide karein aur Projects section show karein
  document.getElementById("profile-section").style.display = "none";
  document.getElementById("projects-section").style.display = "block";

  // 2. Fresh dynamic data fetch karein
  fetchCustomerProjects();
});
