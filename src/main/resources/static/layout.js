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

  // 3. User Pill Navigation to Customer Dashboard
  const userPills = document.querySelectorAll(".user-pill");
  userPills.forEach(pill => {
    pill.style.cursor = "pointer";
    pill.title = "View Customer Profile";
    pill.addEventListener("click", () => {
      if (!window.location.pathname.endsWith("customer dashboard.html") &&
          !window.location.pathname.endsWith("customer%20dashboard.html")) {
        window.location.href = "customer dashboard.html";
      }
    });
  });

  // Shared Logout handler for shell continuity
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "true";
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("marketplaceToken");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("marketplaceUser");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("customerUser");
      localStorage.removeItem("buildbid_user");
      localStorage.removeItem("buildbid_current_user");
      sessionStorage.removeItem("pendingRedirect");
      sessionStorage.removeItem("userData");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("currentUser");
      sessionStorage.clear();
      showLogoutToast(() => {
        window.location.href = "index.html";
      });
    });
  }

  // Intercept clicks on currently unimplemented sidebar items to prevent 404
  const unimplementedLinks = document.querySelectorAll('.side-menu a[href="javascript:void(0)"]');
  unimplementedLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
    });
  });

  // Initialize Global Notification Bell and Dropdown
  initGlobalNotifications();
});

/* =========================================================
   GLOBAL NOTIFICATION SUBSYSTEM (SHARED ACROSS BUYER PAGES)
   ========================================================= */

function getGlobalCleanToken() {
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

function formatNotifTime(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs) || diffMs < 0) return "Just now";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  } catch (e) {
    return "Recently";
  }
}

function getNotifTargetUrl(n) {
  const type = (n.type || "").toUpperCase();
  const ref = n.referenceId ? encodeURIComponent(n.referenceId) : "";
  
  if (type === "POST_REQUIREMENT_MATCH" || type.includes("POST_REQUIREMENT_MATCH")) {
    return `professional dashboard.html#find-work`;
  }
  if (type === "POST_REQUIREMENT_APPLICATION" || type.includes("POST_REQUIREMENT_APPLICATION")) {
    return `requirement-applications.html`;
  }
  if (type === "POST_REQUIREMENT_ACCEPTED" || type.includes("POST_REQUIREMENT_ACCEPTED")) {
    return `professional dashboard.html#requests`;
  }
  if (type === "POST_REQUIREMENT_REJECTED" || type.includes("POST_REQUIREMENT_REJECTED")) {
    return `professional dashboard.html#find-work`;
  }
  if (type.includes("QUOTATION_RECEIVED") || type.includes("QUOTATION")) {
    return `my-requests.html${ref ? '?ref=' + ref : ''}`;
  }
  if (type.includes("ORDER") || type.includes("DELIVERY") || type.includes("PROCESSING") || 
      type.includes("STATUS") || type.includes("DISPATCH") || type.includes("DIRECT_BUY")) {
    return `my-orders.html${ref ? '?ref=' + ref : ''}`;
  }
  return `my-requests.html`;
}

async function initGlobalNotifications() {
  const token = getGlobalCleanToken();
  if (!token) return;

  const notifItemWrap = document.querySelector('.nav-action-item .fa-bell')?.closest('.nav-action-item') ||
                        document.getElementById('navNotificationCount')?.closest('.nav-action-item');

  if (!notifItemWrap) return;

  notifItemWrap.classList.add('notif-dropdown-wrapper');

  // Create dropdown container if not present
  let dropdown = notifItemWrap.querySelector('.buildbid-notif-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'buildbid-notif-dropdown';
    notifItemWrap.appendChild(dropdown);
  }

  const baseUrl = (typeof window !== "undefined" && window.location && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
    ? "http://localhost:8080"
    : "https://buildbid-ap3j.onrender.com";

  async function refreshNotifications() {
    try {
      const res = await fetch(`${baseUrl}/api/notifications`, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) return;

      const data = await res.json();
      const notifs = data.notifications || [];
      const unreadCount = data.unreadCount || 0;

      // Update badge
      const badge = document.getElementById('navNotificationCount');
      if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
      }

      renderDropdown(notifs, unreadCount);
    } catch (e) {
      console.warn("Could not load notifications:", e);
    }
  }

  function renderDropdown(notifs, unreadCount) {
    const headerHTML = `
      <div class="notif-dropdown-header">
        <div class="notif-header-title">
          <i class="fa-solid fa-bell" style="color: #0284c7;"></i>
          <span>Notifications / सूचनाएं</span>
          ${unreadCount > 0 ? `<span class="notif-unread-pill">${unreadCount} New</span>` : ''}
        </div>
        ${unreadCount > 0 ? `
          <button type="button" class="btn-mark-all-read" id="btnMarkAllNotifsRead">
            Mark all read / सभी पढ़े
          </button>
        ` : ''}
      </div>
    `;

    let bodyHTML = '';
    if (notifs.length === 0) {
      bodyHTML = `
        <div class="notif-dropdown-empty">
          <i class="fa-regular fa-bell-slash"></i>
          <span>No notifications yet / अभी कोई सूचना नहीं है</span>
        </div>
      `;
    } else {
      bodyHTML = `
        <div class="notif-dropdown-body">
          ${notifs.map(n => {
            const isUnread = !n.isRead;
            const timeAgo = formatNotifTime(n.createdAt);
            let iconClass = "fa-solid fa-bell";
            const type = (n.type || "").toUpperCase();
            if (type.includes("ORDER")) iconClass = "fa-solid fa-boxes-packing";
            else if (type.includes("QUOTATION")) iconClass = "fa-solid fa-file-invoice-dollar";
            else if (type.includes("DELIVERY") || type.includes("DISPATCH") || type.includes("STATUS")) iconClass = "fa-solid fa-truck-fast";
            else if (type.includes("DIRECT_BUY")) iconClass = "fa-solid fa-cart-shopping";
            else if (type.includes("POST_REQUIREMENT_MATCH")) iconClass = "fa-solid fa-briefcase";
            else if (type.includes("POST_REQUIREMENT_ACCEPTED")) iconClass = "fa-solid fa-circle-check";
            else if (type.includes("POST_REQUIREMENT_REJECTED")) iconClass = "fa-solid fa-circle-xmark";
            else if (type.includes("POST_REQUIREMENT_APPLICATION")) iconClass = "fa-solid fa-file-lines";

            return `
              <div class="notif-item ${isUnread ? 'unread' : ''}" data-notif-id="${n.id}" data-target-url="${getNotifTargetUrl(n)}">
                <div class="notif-icon-circle">
                  <i class="${iconClass}"></i>
                </div>
                <div class="notif-content-wrap">
                  <div class="notif-title-row">
                    <span class="notif-item-title">${n.title}${n.titleHi ? ' / ' + n.titleHi : ''}</span>
                    ${isUnread ? '<span class="notif-unread-dot" title="Unread"></span>' : ''}
                  </div>
                  <p class="notif-item-message">${n.message || ''}</p>
                  ${n.messageHi ? `<p class="notif-item-message" style="color: #64748b; font-size: 11px; margin-top: 2px;">${n.messageHi}</p>` : ''}
                  <span class="notif-item-time"><i class="fa-regular fa-clock" style="margin-right: 3px;"></i>${timeAgo}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    dropdown.innerHTML = headerHTML + bodyHTML;

    // Attach mark all read handler
    const markAllBtn = dropdown.querySelector('#btnMarkAllNotifsRead');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await fetch(`${baseUrl}/api/notifications/mark-all-read`, {
            method: "PUT",
            headers: {
              "Authorization": "Bearer " + token,
              "Content-Type": "application/json"
            }
          });
          refreshNotifications();
        } catch (err) {
          console.error("Mark all read error:", err);
        }
      });
    }

    // Attach item click handler
    const items = dropdown.querySelectorAll('.notif-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        const notifId = item.dataset.notifId;
        const targetUrl = item.dataset.targetUrl;

        if (item.classList.contains('unread') && notifId) {
          fetch(`${baseUrl}/api/notifications/${notifId}/read`, {
            method: "PUT",
            headers: {
              "Authorization": "Bearer " + token,
              "Content-Type": "application/json"
            }
          }).catch(() => {});
        }

        dropdown.classList.remove('active');
        if (targetUrl) {
          window.location.href = targetUrl;
        }
      });
    });
  }

  // Toggle dropdown on bell click
  notifItemWrap.addEventListener('click', (e) => {
    if (e.target.closest('.buildbid-notif-dropdown')) return;
    e.stopPropagation();
    dropdown.classList.toggle('active');
    if (dropdown.classList.contains('active')) {
      refreshNotifications();
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!notifItemWrap.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  // Initial fetch
  refreshNotifications();
}


function showLogoutToast(callback, customTitle, customMessage) {
  let toast = document.getElementById("custom-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "custom-toast";
    toast.className = "toast-card";
    toast.innerHTML = `
      <div class="toast-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      </div>
      <div class="toast-body">
        <h4 id="toast-title" class="toast-title">Logout Successful</h4>
        <p id="toast-message" class="toast-message">You have logged out successfully. — सफलतापूर्वक लॉगआउट किया गया।</p>
      </div>
      <button class="toast-close" type="button" aria-label="Close notification">&times;</button>
    `;
    toast.style.cssText = "position:fixed;top:25px;right:25px;z-index:999999;min-width:280px;max-width:380px;display:flex;align-items:center;gap:12px;padding:12px 16px;background:#ffffff;border:1px solid #e2e8f0;border-radius:13px;box-shadow:0 18px 40px rgba(15,23,42,0.13),0 3px 9px rgba(15,23,42,0.05);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);opacity:0;transform:translateY(-20px);pointer-events:none;font-family:'Inter',system-ui,sans-serif;";
    const iconEl = toast.querySelector(".toast-icon");
    if (iconEl) iconEl.style.cssText = "width:38px;height:38px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#ecfdf5;color:#10b981;border-radius:8px;";
    const titleEl = toast.querySelector(".toast-title");
    if (titleEl) titleEl.style.cssText = "margin:0;color:#1e293b;font-size:14px;font-weight:700;";
    const msgEl = toast.querySelector(".toast-message");
    if (msgEl) msgEl.style.cssText = "margin:2px 0 0 0;color:#64748b;font-size:12px;";
    const closeEl = toast.querySelector(".toast-close");
    if (closeEl) closeEl.style.cssText = "background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer;";
    document.body.appendChild(toast);
  }

  const titleEl = document.getElementById("toast-title");
  if (titleEl) titleEl.innerText = customTitle || "Logout Successful";
  const msgEl = document.getElementById("toast-message");
  if (msgEl) msgEl.innerText = customMessage || "You have logged out successfully. — सफलतापूर्वक लॉगआउट किया गया।";

  void toast.offsetHeight;
  toast.classList.add("show");
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";
  toast.style.pointerEvents = "auto";

  let navigated = false;
  const navigateOnce = () => {
    if (navigated) return;
    navigated = true;
    toast.classList.remove("show");
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    toast.style.pointerEvents = "none";
    if (typeof callback === "function") callback();
    else window.location.href = "index.html";
  };

  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      navigateOnce();
    };
  }

  setTimeout(navigateOnce, 1200);
}
