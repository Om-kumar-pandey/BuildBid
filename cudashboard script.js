// ============================================================
// DYNAMIC DASHBOARD CONTROLLER (BuildBid - Fully Synced)
// ============================================================

function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.location) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
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

  // Strict Customer Role Guard (Pre-check from cache)
  const cachedUserRaw = localStorage.getItem("currentUser") || localStorage.getItem("customerUser");
  if (cachedUserRaw) {
    try {
      const u = JSON.parse(cachedUserRaw);
      const r = (u.role || (u.roles && u.roles[0]) || "").toString().replace("ROLE_", "").toUpperCase();
      if (r && r !== "CUSTOMER") {
        if (r === "CONTRACTOR") {
          window.location.href = "contractor-dashboard.html";
        } else if (r === "MATERIAL_SELLER" || r === "SELLER") {
          window.location.href = "seller index.html";
        } else {
          window.location.href = "index.html";
        }
        return;
      }
    } catch (e) {}
  }

  // 1. Initial Render with available stored data
  let user = {};
  const storageKeys = ["currentUser", "customerUser", "marketplaceUser", "userData"];
  for (const key of storageKeys) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      if (parsed && typeof parsed === "object") {
        user = { ...user, ...parsed };
        const pName = parsed.fullName || parsed.name || parsed.username;
        if (pName && pName.toLowerCase() !== "customer" && pName.toLowerCase() !== "user") {
          user.name = pName;
          user.fullName = pName;
        }
      }
    } catch (e) {}
  }

  renderUserProfile(user);
  renderUserStats(user.stats);
  renderVerificationStatus(user.verifications);
  renderRecentActivities(user.activities);

  // 2. Fetch fresh details from backend safely
  try {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.ok) {
      const liveUserData = await response.json();

      user = {
        ...user,
        ...liveUserData,
        name: (liveUserData.name && liveUserData.name.trim() !== "") ? liveUserData.name : (user.name || "Customer"),
        fullName: (liveUserData.name && liveUserData.name.trim() !== "") ? liveUserData.name : (user.fullName || "Customer"),
        email: (liveUserData.email && liveUserData.email.trim() !== "") ? liveUserData.email : (user.email || ""),
        phone: (liveUserData.phone && liveUserData.phone.trim() !== "") ? liveUserData.phone : (user.phone || ""),
        location: (liveUserData.location && liveUserData.location.trim() !== "") ? liveUserData.location : (user.location || ""),
        createdAt: liveUserData.createdAt || user.createdAt
      };

      const rolesArray = liveUserData.roles || user.roles || ["CUSTOMER"];
      const primaryRole = (rolesArray.length > 0)
        ? (typeof rolesArray[0] === "string" ? rolesArray[0] : rolesArray[0].name || "CUSTOMER")
        : "CUSTOMER";
      
      user.role = primaryRole.replace("ROLE_", "").toUpperCase();

      // Safe role routing: Only allow CUSTOMER on this dashboard
      const activeRole = user.role;
      if (activeRole !== "CUSTOMER") {
        if (activeRole === "CONTRACTOR") {
          window.location.href = "contractor-dashboard.html";
          return;
        } else if (activeRole === "MATERIAL_SELLER" || activeRole === "SELLER") {
          window.location.href = "seller index.html";
          return;
        } else {
          window.location.href = "index.html";
          return;
        }
      }

      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("customerUser", JSON.stringify(user));

      // Re-render with database synced data
      renderUserProfile(user);
    } else {
      console.warn("Live profile sync status:", response.status);
    }

    // Fetch dynamic Customer Profile from dedicated API
    try {
      const profileResponse = await fetch(`${API_BASE_URL}/api/customer/profile`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (profileResponse.ok) {
        const customerProfileData = await profileResponse.json();
        user = {
          ...user,
          ...customerProfileData,
          name: customerProfileData.fullName || user.name,
          fullName: customerProfileData.fullName || user.fullName,
          phone: customerProfileData.phone || user.phone,
          email: customerProfileData.email || user.email,
          address: customerProfileData.address || user.address || "",
          city: customerProfileData.city || user.city || "",
          state: customerProfileData.state || user.state || "",
          pincode: customerProfileData.pincode || user.pincode || "",
          aboutMe: customerProfileData.aboutMe || user.aboutMe || "",
          bio: customerProfileData.aboutMe || user.bio || "",
          preferredLanguage: customerProfileData.preferredLanguage || user.preferredLanguage || "English, Hindi",
          language: customerProfileData.preferredLanguage || user.language || "English, Hindi",
          profilePhoto: customerProfileData.profilePhoto || user.profilePhoto || "",
          avatarUrl: customerProfileData.profilePhoto || user.avatarUrl || "",
          memberSince: customerProfileData.memberSince || user.memberSince || user.createdAt
        };

        localStorage.setItem("currentUser", JSON.stringify(user));
        localStorage.setItem("customerUser", JSON.stringify(user));
        renderUserProfile(user);
      }
    } catch (profErr) {
      console.warn("Customer profile fetch failed:", profErr);
    }

    // Fetch actual project count from database for 'Projects Posted'
    let projResponse = await fetch(`${API_BASE_URL}/api/customer/projects`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!projResponse.ok && projResponse.status === 404) {
      projResponse = await fetch(`${API_BASE_URL}/api/projects`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
    }

    if (projResponse.ok) {
      const dbProjects = await projResponse.json();
      if (Array.isArray(dbProjects)) {
        if (!user.stats) user.stats = {};
        user.stats.projectsPosted = dbProjects.length;
        renderUserStats(user.stats);
        localStorage.setItem("currentUser", JSON.stringify(user));
        localStorage.setItem("customerUser", JSON.stringify(user));
      }
    }

  } catch (err) {
    console.warn("Backend sync failed, using cached data.", err);
  }

  // 3. Connect Edit Profile button to customer-profile-edit.html
  const editProfileBtn = document.getElementById("editProfileBtn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      window.location.href = "customer-profile-edit.html";
    });
  }

  const avatarCameraBtn = document.querySelector(".avatar-camera-btn");
  if (avatarCameraBtn) {
    avatarCameraBtn.addEventListener("click", () => {
      window.location.href = "customer-profile-edit.html";
    });
  }

  // 4. Logout handler with Toast Notification - ONLY ON EXPLICIT LOGOUT CLICK
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

  // 5. Initialize Explore BuildBid Carousel & Did You Know Rotator
  initExploreCarousel();
  initDidYouKnowCarousel();
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

  const rawName = (user.fullName || user.name || user.username || "").toString().trim();
  const fullName = (rawName && rawName.toLowerCase() !== "customer" && rawName.toLowerCase() !== "user")
    ? rawName
    : (user.email ? user.email.split("@")[0] : "Customer");

  const firstName = fullName.split(" ")[0];
  const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const email = user.email || "--";
  const phone = (user.phone && String(user.phone).trim() !== "") ? String(user.phone).trim() : "--";
  
  const role = (user.role || (user.roles && user.roles[0]) || "Customer")
    .toString()
    .replace("ROLE_", "")
    .toUpperCase();

  const customPhoto = user.profilePhoto || user.avatarUrl || user.profilePhotoUrl;
  const avatarUrl = (customPhoto && customPhoto.trim() !== "")
    ? customPhoto
    : `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(fullName)}`;

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
  const locParts = [user.city, user.state].filter(Boolean);
  const displayLocation = locParts.length > 0 ? locParts.join(", ") : (user.location || "");
  if (heroLocation && locationWrapper) {
    if (displayLocation && String(displayLocation).trim() !== "") {
      heroLocation.textContent = String(displayLocation).trim();
      locationWrapper.style.display = "inline-block";
    } else {
      locationWrapper.style.display = "none";
    }
  }

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'short' });
  const currentYear = currentDate.getFullYear();
  const memberDate = user.memberSince || user.createdAt;
  const joinDate = memberDate ? new Date(memberDate).toLocaleString('default', { month: 'short', year: 'numeric' }) : `${currentMonth} ${currentYear}`;
  const heroMemberSince = document.getElementById("heroMemberSince");
  if (heroMemberSince) {
    heroMemberSince.textContent = `Member since ${joinDate}`;
  }

  const bioName = document.getElementById("bioName");
  if (bioName) bioName.textContent = fullName;

  const aboutBioElem = document.getElementById("aboutBio");
  if (aboutBioElem) {
    aboutBioElem.textContent = (user.aboutMe && user.aboutMe.trim() !== "")
      ? user.aboutMe
      : (user.bio || `Welcome to BuildBid! Update your profile to add your personalized bio.`);
  }

  const dataFullName = document.getElementById("dataFullName");
  if (dataFullName) dataFullName.textContent = (fullName && fullName.toLowerCase() !== "customer") ? fullName : "--";

  const dataEmail = document.getElementById("dataEmail");
  if (dataEmail) dataEmail.textContent = email;

  const dataPhone = document.getElementById("dataPhone");
  if (dataPhone) dataPhone.textContent = phone;

  const dataAddress = document.getElementById("dataAddress");
  if (dataAddress) dataAddress.textContent = (user.address && user.address.trim() !== "") ? user.address : "--";

  const dataLocationDetails = document.getElementById("dataLocationDetails");
  if (dataLocationDetails) {
    const fullLocParts = [user.city, user.state, user.pincode].filter(Boolean);
    dataLocationDetails.textContent = fullLocParts.length > 0 ? fullLocParts.join(", ") : (user.location || "--");
  }

  const dataLanguage = document.getElementById("dataLanguage");
  if (dataLanguage) dataLanguage.textContent = user.preferredLanguage || user.language || "English, Hindi";
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

// ============================================================
// EXPLORE BUILDBID CAROUSEL CONTROLLER (Infinite Auto-Rotate)
// ============================================================
function initExploreCarousel() {
  const viewport = document.getElementById("exploreViewport");
  const track = document.getElementById("exploreTrack");
  const prevBtn = document.getElementById("explorePrevBtn");
  const nextBtn = document.getElementById("exploreNextBtn");
  const pauseBtn = document.getElementById("explorePauseBtn");
  const pauseIcon = document.getElementById("explorePauseIcon");
  const dotsContainer = document.getElementById("exploreDotsContainer");
  const autoRotateBadge = document.querySelector(".explore-auto-badge .rotating-icon");

  if (!viewport || !track) return;

  const cards = track.querySelectorAll(".explore-feature-card");
  const totalCards = cards.length;
  if (totalCards === 0) return;

  let currentIndex = 0;
  let isPaused = false;
  let isHovered = false;
  let autoTimer = null;
  const ROTATE_INTERVAL = 1400; // Smooth ~1.4s infinite auto-rotation

  function getVisibleCardsCount() {
    const width = window.innerWidth;
    if (width <= 650) return 1;
    if (width <= 1000) return 2;
    return 3;
  }

  function getMaxIndex() {
    const visible = getVisibleCardsCount();
    return Math.max(0, totalCards - visible);
  }

  function renderDots() {
    if (!dotsContainer) return;
    const maxIdx = getMaxIndex();
    const dotsCount = maxIdx + 1;
    dotsContainer.innerHTML = "";

    for (let i = 0; i < dotsCount; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `explore-dot ${i === currentIndex ? "active" : ""}`;
      dot.setAttribute("aria-label", `Slide ${i + 1}`);
      dot.addEventListener("click", () => {
        currentIndex = i;
        updateCarousel();
        resetTimer();
      });
      dotsContainer.appendChild(dot);
    }
  }

  function updateCarousel() {
    const maxIdx = getMaxIndex();
    if (currentIndex > maxIdx) currentIndex = maxIdx;
    if (currentIndex < 0) currentIndex = 0;

    const firstCard = cards[0];
    if (firstCard) {
      const cardWidth = firstCard.getBoundingClientRect().width;
      const gap = 20;
      const offset = currentIndex * (cardWidth + gap);
      track.style.transform = `translateX(-${offset}px)`;
    }

    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll(".explore-dot");
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === currentIndex);
      });
    }
  }

  function advanceNext() {
    const maxIdx = getMaxIndex();
    if (currentIndex >= maxIdx) {
      currentIndex = 0;
    } else {
      currentIndex++;
    }
    updateCarousel();
  }

  function advancePrev() {
    const maxIdx = getMaxIndex();
    if (currentIndex <= 0) {
      currentIndex = maxIdx;
    } else {
      currentIndex--;
    }
    updateCarousel();
  }

  function startTimer() {
    stopTimer();
    autoTimer = setInterval(() => {
      if (!isPaused && !isHovered) {
        advanceNext();
      }
    }, ROTATE_INTERVAL);
  }

  function stopTimer() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function resetTimer() {
    stopTimer();
    startTimer();
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      advanceNext();
      resetTimer();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      advancePrev();
      resetTimer();
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      isPaused = !isPaused;
      if (isPaused) {
        if (pauseIcon) {
          pauseIcon.classList.remove("fa-pause");
          pauseIcon.classList.add("fa-play");
        }
        if (autoRotateBadge) {
          autoRotateBadge.style.animationPlayState = "paused";
        }
        pauseBtn.title = "Resume Auto-Rotate";
      } else {
        if (pauseIcon) {
          pauseIcon.classList.remove("fa-play");
          pauseIcon.classList.add("fa-pause");
        }
        if (autoRotateBadge) {
          autoRotateBadge.style.animationPlayState = "running";
        }
        pauseBtn.title = "Pause Auto-Rotate";
        resetTimer();
      }
    });
  }

  viewport.addEventListener("mouseenter", () => {
    isHovered = true;
  });

  viewport.addEventListener("mouseleave", () => {
    isHovered = false;
  });

  window.addEventListener("resize", () => {
    renderDots();
    updateCarousel();
  });

  // Initial layout and timer start
  renderDots();
  updateCarousel();
  startTimer();
}

// ============================================================
// DID YOU KNOW? ROTATING TIPS CONTROLLER
// ============================================================
function initDidYouKnowCarousel() {
  const tipElem = document.getElementById("dykLiveTip");
  const prevBtn = document.getElementById("dykPrevBtn");
  const nextBtn = document.getElementById("dykNextBtn");
  const dotsContainer = document.getElementById("dykDotsContainer");

  if (!tipElem) return;

  const tips = [
    "You can compare multiple contractor bids for the same project on BuildBid.",
    "You can directly hire verified architects, civil engineers, and contractors on BuildBid.",
    "You can order certified quality materials with instant quotation comparison on BuildBid."
  ];

  let currentTipIndex = 0;
  let tipTimer = null;
  const TIP_INTERVAL = 4000;

  function renderDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = "";
    tips.forEach((_, idx) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `dyk-dot ${idx === currentTipIndex ? "active" : ""}`;
      dot.setAttribute("aria-label", `Tip ${idx + 1}`);
      dot.addEventListener("click", () => {
        setTip(idx);
        resetTimer();
      });
      dotsContainer.appendChild(dot);
    });
  }

  function setTip(index) {
    if (index < 0) index = tips.length - 1;
    if (index >= tips.length) index = 0;
    currentTipIndex = index;

    tipElem.style.opacity = "0";
    setTimeout(() => {
      tipElem.textContent = tips[currentTipIndex];
      tipElem.style.opacity = "1";
    }, 200);

    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll(".dyk-dot");
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === currentTipIndex);
      });
    }
  }

  function startTimer() {
    stopTimer();
    tipTimer = setInterval(() => {
      setTip(currentTipIndex + 1);
    }, TIP_INTERVAL);
  }

  function stopTimer() {
    if (tipTimer) {
      clearInterval(tipTimer);
      tipTimer = null;
    }
  }

  function resetTimer() {
    stopTimer();
    startTimer();
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      setTip(currentTipIndex + 1);
      resetTimer();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      setTip(currentTipIndex - 1);
      resetTimer();
    });
  }

  renderDots();
  setTip(0);
  startTimer();
}
