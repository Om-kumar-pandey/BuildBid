// ============================================================
// DYNAMIC DASHBOARD CONTROLLER (BuildBid - Fully Synced)
// ============================================================

const API_BASE_URL = "https://buildbid-ap3j.onrender.com";
let toastTimeout;

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("marketplaceToken") || "";
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

      // ** डेटाबेस से असली प्रोजेक्ट्स की संख्या फेच करके 'Projects Posted' में दिखाने के लिए **
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
  }

  // 3. Logout handler with Toast Notification
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.clear();
      showToast("Notice", "You have logged out successfully.");
    });
  }
});

// Toast Notification Functions
function showToast(title = "Notice", message = "You have logged out successfully.") {
  const toast = document.getElementById("custom-toast");
  if (!toast) {
    localStorage.clear();
    window.location.href = "index.html";
    return;
  }
  
  document.getElementById("toast-title").innerText = title;
  document.getElementById("toast-message").innerText = message;

  // Show Toast
  toast.classList.add("show");

  // Agar pehle se koi timer chal raha ho to clear karein
  clearTimeout(toastTimeout);

  // 2.5 seconds ke baad automatic band ho kar login page pe redirect karega
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
  const fullName = user.name || user.username || "Customer";
  const firstName = fullName.split(" ")[0];
  const email = user.email || "--";
  
  // Real Phone Number Check
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

  // Location Updates
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

  // Member Since
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

// Optional tab listener if present
const myProjectsBtn = document.getElementById("my-projects-tab-btn");
if (myProjectsBtn) {
  myProjectsBtn.addEventListener("click", () => {
    const profileSec = document.getElementById("profile-section");
    const projSec = document.getElementById("projects-section");
    if (profileSec) profileSec.style.display = "none";
    if (projSec) projSec.style.display = "block";
  });
}