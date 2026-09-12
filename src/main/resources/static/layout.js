// layout.js

document.addEventListener("DOMContentLoaded", () => {
  const userString = localStorage.getItem("currentUser");
  if (!userString) return;

  const user = JSON.parse(userString);

  const navUserName = document.getElementById("navUserName");
  const navUserRole = document.getElementById("navUserRole");
  const navUserAvatar = document.getElementById("navUserAvatar");

  if (user.name) {
    // 1. Full name me se sirf FIRST NAME nikalein (e.g., "Heman kumar" -> "Heman")
    const firstName = user.name.trim().split(" ")[0];
    
    // First letter capitalize rakhein
    const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    if (navUserName) {
      navUserName.textContent = formattedFirstName;
    }

    // 2. Avatar Initials (HK ya First Letter)
    if (navUserAvatar) {
      const nameParts = user.name.trim().split(" ").filter(Boolean);
      const initials = nameParts.length > 1 
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0][0].toUpperCase();

      navUserAvatar.textContent = initials;
    }
  }

  if (navUserRole && user.role) {
    navUserRole.textContent = user.role;
  }
});