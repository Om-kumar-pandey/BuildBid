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

  const navUserName = document.getElementById("navUserName");
  const navUserRole = document.getElementById("navUserRole");
  const navUserAvatar = document.getElementById("navUserAvatar");

  const displayName = (user.name || user.fullName || user.username || "").toString().trim();

  if (displayName && displayName.toLowerCase() !== "customer" && displayName.toLowerCase() !== "user") {
    // 1. Full name me se sirf FIRST NAME nikalein (e.g., "Heman kumar" -> "Heman")
    const firstName = displayName.split(" ")[0];
    
    // First letter capitalize rakhein
    const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    if (navUserName) {
      navUserName.textContent = formattedFirstName;
    }

    // 2. Avatar Initials (HK ya First Letter)
    if (navUserAvatar) {
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
});