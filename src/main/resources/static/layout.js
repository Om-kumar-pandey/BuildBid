// layout.js

document.addEventListener("DOMContentLoaded", () => {
  const userString = localStorage.getItem("currentUser") || localStorage.getItem("customerUser");
  if (!userString) return;

  let user = {};
  try {
    user = JSON.parse(userString) || {};
  } catch (e) {
    return;
  }

  const navUserName = document.getElementById("navUserName") || document.getElementById("userName");
  const navUserRole = document.getElementById("navUserRole");
  const navAvatar = document.getElementById("navAvatar");
  const navUserAvatar = document.getElementById("navUserAvatar") || document.getElementById("userInitials");

  const displayName = (user.name || user.fullName || user.username || "").toString().trim();
  const photoUrl = (user.profilePhoto || user.avatarUrl || user.profilePhotoUrl || "").toString().trim();

  if (displayName && displayName.toLowerCase() !== "customer" && displayName.toLowerCase() !== "user") {
    // 1. Full name me se sirf FIRST NAME nikalein (e.g., "Heman kumar" -> "Heman")
    const firstName = displayName.split(" ")[0];
    
    // First letter capitalize rakhein
    const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    if (navUserName) {
      navUserName.textContent = formattedFirstName;
    }
  }

  // 2. Profile Image & Avatar Synchronization (Shared across all Customer pages)
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(displayName || "User")}`;

  if (navAvatar && navAvatar.tagName === "IMG") {
    navAvatar.src = photoUrl ? photoUrl : fallbackAvatarUrl;
  }

  if (navUserAvatar && navUserAvatar !== navAvatar) {
    if (photoUrl) {
      navUserAvatar.style.backgroundImage = `url('${photoUrl}')`;
      navUserAvatar.style.backgroundSize = "cover";
      navUserAvatar.style.backgroundPosition = "center";
      navUserAvatar.textContent = "";
    } else if (displayName && displayName.toLowerCase() !== "customer" && displayName.toLowerCase() !== "user") {
      navUserAvatar.style.backgroundImage = "";
      const nameParts = displayName.split(" ").filter(Boolean);
      const initials = nameParts.length > 1 
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0][0].toUpperCase();

      navUserAvatar.textContent = initials;
    }
  }

  if (navUserRole && user.role) {
    navUserRole.textContent = String(user.role).replace("ROLE_", "").toUpperCase();
  }

  // Fallback Logout handler for shell continuity
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "true";
    logoutBtn.addEventListener("click", (e) => {
      if (document.getElementById("custom-toast")) return; // Let custom-toast page handle animated logout
      e.preventDefault();
      localStorage.removeItem("marketplaceToken");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("marketplaceUser");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("customerUser");
      localStorage.removeItem("buildbid_user");
      sessionStorage.removeItem("pendingRedirect");
      sessionStorage.removeItem("userData");
      window.location.href = "index.html";
    });
  }

  // Intercept clicks on currently unimplemented sidebar items to prevent 404
  const unimplementedLinks = document.querySelectorAll('.side-menu a[href="javascript:void(0)"]');
  unimplementedLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
    });
  });
});