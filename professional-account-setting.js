/**
 * BuildBid - Professional Account Settings Controller
 * File: professional-account-setting.js
 * Phase 1: New UI Foundation, 14 Sections Navigation & Security Guard
 */

(function () {
  "use strict";

  // ============================================================
  // 1. CONFIGURATION & STATE
  // ============================================================
  function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.location) {
      if (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://localhost:8080";
      }
    }
    return "https://buildbid-ap3j.onrender.com";
  }

  const API_BASE_URL = getApiBaseUrl();
  let currentProfile = null;
  let toastTimer = null;

  // ============================================================
  // 2. AUTHENTICATION & TOKEN HELPERS
  // ============================================================
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

  function getProCacheOwnerIdentifier() {
    try {
      const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
      if (!raw) return null;
      const u = JSON.parse(raw);
      const identifier = u.email || u.username || u.id;
      return identifier ? String(identifier).trim().toLowerCase() : null;
    } catch (e) {
      return null;
    }
  }

  function getValidProCachedAvatar() {
    try {
      const token = getCleanToken();
      if (!token) {
        localStorage.removeItem("buildbid_pro_avatar_cache");
        localStorage.removeItem("buildbid_pro_avatar_cache_owner");
        return null;
      }
      const currentOwner = getProCacheOwnerIdentifier();
      const storedOwner = localStorage.getItem("buildbid_pro_avatar_cache_owner");
      const cachedAvatar = localStorage.getItem("buildbid_pro_avatar_cache");
      if (!cachedAvatar) return null;
      if (!currentOwner || !storedOwner || currentOwner !== storedOwner.toLowerCase()) {
        localStorage.removeItem("buildbid_pro_avatar_cache");
        localStorage.removeItem("buildbid_pro_avatar_cache_owner");
        return null;
      }
      return cachedAvatar;
    } catch (e) {
      return null;
    }
  }

  function enforceProfessionalAuthGuard() {
    const token = getCleanToken();
    if (!token) {
      console.warn("[BuildBid Pro] No valid authentication token found. Redirecting to login...");
      window.location.href = "index.html";
      return false;
    }

    const rawUser = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        const role = (parsed.role || (parsed.roles && parsed.roles[0]) || "").toString().replace("ROLE_", "").toUpperCase();
        if (role && role !== "PROFESSIONAL" && role !== "SERVICE_PROVIDER") {
          console.warn("[BuildBid Pro] Unauthorized role for professional settings:", role);
          if (role === "CUSTOMER") {
            window.location.href = "customer dashboard.html";
          } else if (role === "CONTRACTOR") {
            window.location.href = "contractor-dashboard.html";
          } else if (role === "MATERIAL_SELLER" || role === "SELLER") {
            window.location.href = "seller-dashboard.html";
          } else {
            window.location.href = "index.html";
          }
          return false;
        }
      } catch (e) {
        console.warn("[BuildBid Pro] Stored user parsing warning:", e);
      }
    }
    return true;
  }

  // ============================================================
  // 3. TOAST NOTIFICATION UTILITY
  // ============================================================
  function showToast(message, type = "info") {
    const toast = document.getElementById("pro-settings-toast");
    const msgEl = document.getElementById("pro-settings-toast-msg");
    const iconEl = document.getElementById("pro-settings-toast-icon");
    if (!toast || !msgEl) return;

    if (toastTimer) clearTimeout(toastTimer);

    msgEl.textContent = message;
    if (iconEl) {
      if (type === "success") {
        iconEl.className = "fa-solid fa-circle-check pro-settings-toast-icon";
        iconEl.style.color = "var(--pro-emerald-500)";
      } else if (type === "warning") {
        iconEl.className = "fa-solid fa-triangle-exclamation pro-settings-toast-icon";
        iconEl.style.color = "var(--pro-amber-500)";
      } else if (type === "error") {
        iconEl.className = "fa-solid fa-circle-xmark pro-settings-toast-icon";
        iconEl.style.color = "var(--pro-rose-500)";
      } else {
        iconEl.className = "fa-solid fa-circle-info pro-settings-toast-icon";
        iconEl.style.color = "var(--pro-orange-500)";
      }
    }

    toast.classList.add("active");
    toastTimer = setTimeout(() => {
      toast.classList.remove("active");
    }, 3800);
  }

  window.notifyPlannedFeature = function (msg) {
    showToast(msg || "This feature is planned for Phase 2 backend persistence.", "info");
  };

  // ============================================================
  // 4. LOGOUT & MODAL HANDLING
  // ============================================================
  window.openSignoutModal = function () {
    const modal = document.getElementById("modal-signout");
    if (modal) modal.classList.add("active");
  };

  window.closeSignoutModal = function () {
    const modal = document.getElementById("modal-signout");
    if (modal) modal.classList.remove("active");
  };

  window.executeLogout = function () {
    localStorage.removeItem("marketplaceToken");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("marketplaceUser");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("customerUser");
    localStorage.removeItem("buildbid_user");
    localStorage.removeItem("buildbid_current_user");
    localStorage.removeItem("buildbid_pro_avatar_cache");
    localStorage.removeItem("buildbid_pro_avatar_cache_owner");
    sessionStorage.clear();
    showToast("Signed out successfully. Redirecting...", "info");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 700);
  };

  // ============================================================
  // 5. FETCH & POPULATE PROFILE DATA
  // ============================================================
  async function fetchProfessionalProfile() {
    const token = getCleanToken();
    if (!token) return;

    const alertContainer = document.getElementById("pro-settings-alert-container");

    try {
      let data = null;
      let response = await fetch(`${API_BASE_URL}/api/professional/profile`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.status === 401 || response.status === 403) {
        console.warn("[BuildBid Pro] Token expired or unauthorized. Redirecting to login...");
        executeLogout();
        return;
      }

      if (response.ok) {
        data = await response.json();
      } else {
        // Fallback to /api/me
        const meRes = await fetch(`${API_BASE_URL}/api/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        });
        if (meRes.ok) {
          data = await meRes.json();
        }
      }

      if (data) {
        currentProfile = data.profile || data;
        populateProfileUI(currentProfile);
        if (alertContainer) alertContainer.innerHTML = "";
        await loadSavedPhotoFromBackend(token);
      } else {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn("[BuildBid Pro] Network or fetch error while loading profile:", err);
      // Fallback gracefully to cached identity if available
      loadCachedIdentityFallback();

      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="pro-settings-alert pro-settings-alert-warning" role="alert">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 16px;"></i>
            <div style="flex: 1;">
              <strong>Backend Sync Notice:</strong> Unable to connect to the backend server right now. Displaying cached session details.
            </div>
            <button type="button" class="pro-settings-btn pro-settings-btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="location.reload()">
              <i class="fa-solid fa-rotate-right"></i> Retry
            </button>
          </div>
        `;
      }
    }
  }

  function loadCachedIdentityFallback() {
    let cachedUser = null;
    try {
      const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
      if (raw) cachedUser = JSON.parse(raw);
    } catch (e) {}

    if (cachedUser) {
      populateProfileUI(cachedUser);
    }
  }

  function populateProfileUI(user) {
    if (!user) return;

    const name = user.name || user.fullName || user.username || "Professional";
    const title = user.title || user.professionalTitle || "";
    const email = user.email || "";
    const phone = user.phone || user.phoneNumber || user.mobile || "";
    const location = user.location || user.city || "";
    const pincode = user.pincode || user.postalCode || "";
    const bio = user.bio || user.about || user.aboutMe || "";
    const profession = title || user.category || user.profession || user.professionalType || user.type || "Licensed Professional";
    const photoUrl = user.profilePhotoUrl || user.profilePhoto || user.avatarUrl || user.photoUrl || "";
    const isEmailVerified = Boolean(user.emailVerified !== undefined ? user.emailVerified : (user.verified || user.isVerified));
    const isVerified = Boolean(user.verified || user.isVerified || user.verificationStatus === "VERIFIED");

    // Header & User Pill
    const navName = document.getElementById("pro-settings-nav-name");
    if (navName) navName.textContent = name;

    const navRole = document.getElementById("pro-settings-nav-role");
    if (navRole) navRole.textContent = profession;

    // Avatar previews: check cached data URL first, then remote/api url
    const cachedAvatar = getValidProCachedAvatar();
    const navAvatar = document.getElementById("pro-settings-nav-avatar");
    const previewAvatar = document.getElementById("pro-settings-photo-preview");

    if (cachedAvatar) {
      if (navAvatar) navAvatar.src = cachedAvatar;
      if (previewAvatar) previewAvatar.src = cachedAvatar;
      hasSavedPhoto = true;
      const removeBtn = document.getElementById("pro-photo-remove-btn");
      if (removeBtn) {
        removeBtn.disabled = false;
        removeBtn.classList.remove("pro-settings-btn-disabled");
      }
    } else if (photoUrl && (photoUrl.startsWith("/api/") || photoUrl.startsWith("data:") || photoUrl.startsWith("blob:") || (photoUrl.startsWith("http") && !photoUrl.includes("images.unsplash.com")))) {
      if (!photoUrl.startsWith("/api/")) {
        if (navAvatar) navAvatar.src = photoUrl;
        if (previewAvatar) previewAvatar.src = photoUrl;
        hasSavedPhoto = true;
        const removeBtn = document.getElementById("pro-photo-remove-btn");
        if (removeBtn) {
          removeBtn.disabled = false;
          removeBtn.classList.remove("pro-settings-btn-disabled");
        }
      }
    }

    // Personal Information Form
    const inputName = document.getElementById("pro-input-fullname");
    if (inputName) inputName.value = name;

    const inputTitle = document.getElementById("pro-input-title");
    if (inputTitle) inputTitle.value = title;

    const inputEmail = document.getElementById("pro-input-email");
    if (inputEmail && email) inputEmail.value = email;

    const inputPhone = document.getElementById("pro-input-phone");
    if (inputPhone && phone) inputPhone.value = phone;

    const inputLocation = document.getElementById("pro-input-location");
    if (inputLocation) inputLocation.value = location;

    const inputPincode = document.getElementById("pro-input-pincode");
    if (inputPincode) inputPincode.value = pincode;

    const inputBio = document.getElementById("pro-input-bio");
    if (inputBio) inputBio.value = bio;

    // Verification Displays
    const verifyEmail = document.getElementById("verify-email-display");
    if (verifyEmail && email) {
      verifyEmail.textContent = `Email: ${email}`;
    }

    const verifyPhone = document.getElementById("verify-phone-display");
    if (verifyPhone && phone) {
      verifyPhone.textContent = `Mobile: ${phone}`;
    }

    // Verification Badges
    const badgeEmail = document.getElementById("badge-email-status");
    if (badgeEmail) {
      if (isEmailVerified) {
        badgeEmail.className = "pro-settings-badge pro-settings-badge-verified";
        badgeEmail.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verified`;
      } else {
        badgeEmail.className = "pro-settings-badge pro-settings-badge-pending";
        badgeEmail.innerHTML = `<i class="fa-solid fa-clock"></i> Pending Verification`;
      }
    }

    const badgePhone = document.getElementById("badge-phone-status");
    if (badgePhone) {
      if (isVerified && phone) {
        badgePhone.className = "pro-settings-badge pro-settings-badge-verified";
        badgePhone.innerHTML = `<i class="fa-solid fa-circle-check"></i> Phone Verified`;
      } else {
        badgePhone.className = "pro-settings-badge pro-settings-badge-pending";
        badgePhone.innerHTML = `<i class="fa-solid fa-clock"></i> Verification Pending`;
      }
    }

    const metricVerif = document.getElementById("metric-verification");
    if (metricVerif) {
      metricVerif.textContent = isVerified ? "Verified Pro" : "Verification Pending";
    }

    // Dynamic Completion Calculation
    let completedFields = 0;
    const totalFields = 6;
    if (name) completedFields++;
    if (email) completedFields++;
    if (phone) completedFields++;
    if (location) completedFields++;
    if (pincode) completedFields++;
    if (bio || title) completedFields++;

    const percent = Math.min(100, Math.round((completedFields / totalFields) * 100));
    const completionEl = document.getElementById("metric-completion");
    if (completionEl) {
      completionEl.textContent = `${percent}% Complete`;
    }

    // Baseline tracking for dirty change detection
    originalPersonalInfo = {
      fullName: normalizeFieldValue(name),
      title: normalizeFieldValue(title),
      location: normalizeFieldValue(location),
      pincode: normalizeFieldValue(pincode),
      bio: normalizeFieldValue(bio)
    };
    updatePersonalInfoSaveButtonState();
  }

  // ============================================================
  // 5A. PERSONAL INFORMATION SAVE MODULE (Dirty Checking & Zero Waste)
  // ============================================================
  let isSavingPersonalInfo = false;
  let originalPersonalInfo = null;

  function normalizeFieldValue(val) {
    if (val === null || val === undefined) return "";
    return String(val).trim();
  }

  function getPersonalInfoFormValues() {
    const nameInput = document.getElementById("pro-input-fullname");
    const titleInput = document.getElementById("pro-input-title");
    const locInput = document.getElementById("pro-input-location");
    const pinInput = document.getElementById("pro-input-pincode");
    const bioInput = document.getElementById("pro-input-bio");

    return {
      fullName: normalizeFieldValue(nameInput ? nameInput.value : ""),
      title: normalizeFieldValue(titleInput ? titleInput.value : ""),
      location: normalizeFieldValue(locInput ? locInput.value : ""),
      pincode: normalizeFieldValue(pinInput ? pinInput.value : ""),
      bio: normalizeFieldValue(bioInput ? bioInput.value : "")
    };
  }

  function hasPersonalInfoChanges() {
    if (!originalPersonalInfo) return false;
    const current = getPersonalInfoFormValues();
    return (
      current.fullName !== originalPersonalInfo.fullName ||
      current.title !== originalPersonalInfo.title ||
      current.location !== originalPersonalInfo.location ||
      current.pincode !== originalPersonalInfo.pincode ||
      current.bio !== originalPersonalInfo.bio
    );
  }

  function updatePersonalInfoSaveButtonState() {
    const saveBtn = document.getElementById("pro-btn-save-personal-info");
    if (!saveBtn) return;
    const hasChanges = hasPersonalInfoChanges() || Boolean(pendingFile || croppedBlob);
    saveBtn.disabled = !hasChanges;
    if (!hasChanges) {
      saveBtn.classList.add("pro-settings-btn-disabled");
    } else {
      saveBtn.classList.remove("pro-settings-btn-disabled");
    }
  }

  function setPersonalInfoFeedback(message, type = "") {
    const feedback = document.getElementById("pro-personal-info-feedback");
    if (!feedback) return;
    if (!message) {
      feedback.style.display = "none";
      feedback.textContent = "";
      feedback.className = "pro-photo-feedback";
      return;
    }
    feedback.style.display = "block";
    feedback.className = "pro-photo-feedback " + (type || "");
    if (type === "error") {
      feedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${escapeHtml(message)}</span>`;
    } else if (type === "success") {
      feedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${escapeHtml(message)}</span>`;
    } else if (type === "info") {
      feedback.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>${escapeHtml(message)}</span>`;
    } else {
      feedback.textContent = message;
    }
  }

  async function savePersonalInformation() {
    if (isSavingPersonalInfo) return;

    const hasChanges = hasPersonalInfoChanges();
    const hasPendingPhoto = Boolean(pendingFile || croppedBlob);

    // Unchanged submission guard: do not make HTTP request, do not show success toast
    if (!hasChanges && !hasPendingPhoto) {
      setPersonalInfoFeedback("No changes to save.", "info");
      setTimeout(() => {
        const fb = document.getElementById("pro-personal-info-feedback");
        if (fb && fb.textContent && fb.textContent.includes("No changes to save")) {
          fb.style.display = "none";
          fb.textContent = "";
        }
      }, 2500);
      return;
    }

    const token = getCleanToken();
    if (!token) {
      showToast("Authentication required. Please log in.", "error");
      executeLogout();
      return;
    }

    // If a photo was selected or cropped but not yet saved, upload it first
    if (hasPendingPhoto) {
      await confirmAndSaveCroppedPhoto();
      if (!hasChanges) {
        updatePersonalInfoSaveButtonState();
        return;
      }
    }

    const currentValues = getPersonalInfoFormValues();
    const fullName = currentValues.fullName;
    const title = currentValues.title;
    const location = currentValues.location;
    const pincode = currentValues.pincode;
    const bio = currentValues.bio;

    const nameInput = document.getElementById("pro-input-fullname");
    const titleInput = document.getElementById("pro-input-title");
    const locInput = document.getElementById("pro-input-location");
    const pinInput = document.getElementById("pro-input-pincode");
    const bioInput = document.getElementById("pro-input-bio");

    // Client-side validations
    if (!fullName || fullName.length < 2) {
      setPersonalInfoFeedback("Full legal name is required (at least 2 characters).", "error");
      showToast("Please provide a valid full name.", "warning");
      if (nameInput) nameInput.focus();
      return;
    }

    if (fullName.length > 100) {
      setPersonalInfoFeedback("Full name cannot exceed 100 characters.", "error");
      showToast("Full name is too long.", "warning");
      if (nameInput) nameInput.focus();
      return;
    }

    if (title && title.length > 150) {
      setPersonalInfoFeedback("Professional title cannot exceed 150 characters.", "error");
      showToast("Professional title is too long.", "warning");
      if (titleInput) titleInput.focus();
      return;
    }

    if (location && location.length > 150) {
      setPersonalInfoFeedback("Operating city cannot exceed 150 characters.", "error");
      showToast("Location is too long.", "warning");
      if (locInput) locInput.focus();
      return;
    }

    if (pincode && pincode.length > 20) {
      setPersonalInfoFeedback("Base pincode cannot exceed 20 characters.", "error");
      showToast("Pincode is too long.", "warning");
      if (pinInput) pinInput.focus();
      return;
    }

    if (bio && bio.length > 5000) {
      setPersonalInfoFeedback("Bio cannot exceed 5000 characters.", "error");
      showToast("Bio is too long.", "warning");
      if (bioInput) bioInput.focus();
      return;
    }

    isSavingPersonalInfo = true;
    const saveBtn = document.getElementById("pro-btn-save-personal-info");
    const originalBtnHtml = saveBtn ? saveBtn.innerHTML : "Save Changes";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.classList.add("pro-settings-btn-disabled");
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving Changes...</span>`;
    }

    setPersonalInfoFeedback("Saving changes to database...", "info");

    try {
      const response = await fetch(`${API_BASE_URL}/api/professional/profile`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          fullName: fullName,
          name: fullName,
          title: title,
          location: location,
          pincode: pincode,
          bio: bio
        })
      });

      if (response.status === 401 || response.status === 403) {
        showToast("Session expired or unauthorized for professional settings.", "error");
        executeLogout();
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (response.ok && (result.success !== false)) {
        const updated = result.profile || result;
        currentProfile = updated;
        populateProfileUI(updated);

        // Update baseline form values from confirmed server response
        originalPersonalInfo = {
          fullName: normalizeFieldValue(updated.fullName || updated.name || fullName),
          title: normalizeFieldValue(updated.title !== undefined ? updated.title : title),
          location: normalizeFieldValue(updated.location !== undefined ? updated.location : location),
          pincode: normalizeFieldValue(updated.pincode !== undefined ? updated.pincode : pincode),
          bio: normalizeFieldValue(updated.bio !== undefined ? updated.bio : bio)
        };

        // Synchronize cached user in localStorage
        try {
          const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
          let u = raw ? JSON.parse(raw) : {};
          u.name = updated.name || updated.fullName || fullName;
          u.fullName = updated.fullName || updated.name || fullName;
          u.title = updated.title !== undefined ? updated.title : title;
          u.location = updated.location !== undefined ? updated.location : location;
          u.pincode = updated.pincode !== undefined ? updated.pincode : pincode;
          u.bio = updated.bio !== undefined ? updated.bio : bio;
          localStorage.setItem("currentUser", JSON.stringify(u));
          localStorage.setItem("marketplaceUser", JSON.stringify(u));
        } catch (e) {}

        setPersonalInfoFeedback("Personal information saved successfully to database.", "success");
        setTimeout(() => {
          const fb = document.getElementById("pro-personal-info-feedback");
          if (fb && fb.textContent && fb.textContent.includes("Personal information saved successfully")) {
            fb.style.display = "none";
            fb.textContent = "";
          }
        }, 3500);

        showToast("Personal information saved successfully.", "success");
        updatePersonalInfoSaveButtonState();
      } else {
        const errorMsg = result.error || result.message || `Failed to save changes (HTTP ${response.status}).`;
        setPersonalInfoFeedback(errorMsg, "error");
        showToast(errorMsg, "error");
      }
    } catch (err) {
      console.error("[BuildBid Pro] Save personal information network error:", err);
      setPersonalInfoFeedback("Network error connecting to backend server. Please retry.", "error");
      showToast("Unable to save changes due to network failure.", "error");
    } finally {
      isSavingPersonalInfo = false;
      if (saveBtn) {
        saveBtn.innerHTML = originalBtnHtml;
        updatePersonalInfoSaveButtonState();
      }
    }
  }

  function initPersonalInformationModule() {
    const saveBtn = document.getElementById("pro-btn-save-personal-info");
    if (saveBtn && !saveBtn._proBound) {
      saveBtn._proBound = true;
      saveBtn.addEventListener("click", savePersonalInformation);
    }

    const fieldIds = [
      "pro-input-fullname",
      "pro-input-title",
      "pro-input-location",
      "pro-input-pincode",
      "pro-input-bio"
    ];

    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el._dirtyBound) {
        el._dirtyBound = true;
        el.addEventListener("input", updatePersonalInfoSaveButtonState);
        el.addEventListener("change", updatePersonalInfoSaveButtonState);
      }
    });

    updatePersonalInfoSaveButtonState();
  }

  window.savePersonalInformation = savePersonalInformation;

  // ============================================================
  // 5B. PROFILE PHOTO MANAGEMENT MODULE (Phase 2 & 3 Persistence & Sync)
  // ============================================================
  const DEFAULT_AVATAR = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bgGrad%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%230f172a%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%231e3a8a%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2228%22%20fill%3D%22url(%23bgGrad)%22%2F%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2246%22%20r%3D%2220%22%20fill%3D%22%23cbd5e1%22%2F%3E%3Cpath%20d%3D%22M%2032%2098%20C%2032%2076%2044%2072%2060%2072%20C%2076%2072%2088%2076%2088%2098%20Z%22%20fill%3D%22%23cbd5e1%22%2F%3E%3C%2Fsvg%3E";
  let savedPhotoBlobUrl = null;
  let pendingBlobUrl = null;
  let pendingFile = null;
  let isPhotoOperating = false;
  let hasSavedPhoto = false;
  let photoLoadRequestId = 0;
  let activePhotoFetchPromise = null;

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setPhotoFeedback(message, type = "") {
    const feedback = document.getElementById("pro-photo-feedback");
    if (!feedback) return;
    feedback.textContent = message || "";
    feedback.className = "pro-photo-feedback " + (type || "");
    if (type === "error") {
      feedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${escapeHtml(message)}</span>`;
    } else if (type === "success") {
      feedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${escapeHtml(message)}</span>`;
    } else if (type === "info") {
      feedback.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${escapeHtml(message)}</span>`;
    }
  }

  function setPhotoOperatingState(isBusy) {
    isPhotoOperating = isBusy;
    const overlay = document.getElementById("pro-photo-loading-overlay");
    if (overlay) overlay.style.display = isBusy ? "flex" : "none";

    const chooseBtn = document.getElementById("pro-photo-choose-btn");
    const removeBtn = document.getElementById("pro-photo-remove-btn");
    const saveBtn = document.getElementById("pro-photo-save-btn");
    const cancelBtn = document.getElementById("pro-photo-cancel-btn");
    const badgeBtn = document.getElementById("pro-photo-badge-btn");

    if (chooseBtn) chooseBtn.disabled = isBusy;
    if (removeBtn) removeBtn.disabled = isBusy || !hasSavedPhoto;
    if (saveBtn) saveBtn.disabled = isBusy;
    if (cancelBtn) cancelBtn.disabled = isBusy;
    if (badgeBtn) badgeBtn.disabled = isBusy;
  }

  function showPendingPhotoActions(show) {
    const defaultActions = document.getElementById("pro-photo-actions-default");
    const pendingActions = document.getElementById("pro-photo-actions-pending");
    if (defaultActions) defaultActions.style.display = show ? "none" : "flex";
    if (pendingActions) pendingActions.style.display = show ? "flex" : "none";
  }

  function dispatchAvatarSyncEvent(photoUrl, version) {
    const payload = {
      photoUrl: photoUrl || null,
      version: version || Date.now()
    };

    // 1. Direct synchronization across all dashboard avatar elements if present in DOM
    const avatarIds = [
      "pro-settings-nav-avatar",
      "pro-settings-photo-preview",
      "side-avatar",
      "proHeroAvatar",
      "top-avatar",
      "proProfileTabAvatar",
      "settings-header-avatar"
    ];
    avatarIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (savedPhotoBlobUrl) {
          el.src = savedPhotoBlobUrl;
        } else if (photoUrl && (photoUrl.startsWith("data:") || photoUrl.startsWith("blob:") || (photoUrl.startsWith("http") && !photoUrl.includes("images.unsplash.com")))) {
          el.src = photoUrl;
        } else if (getValidProCachedAvatar()) {
          el.src = getValidProCachedAvatar();
        } else {
          el.src = DEFAULT_AVATAR;
        }
      }
    });

    // 2. Dispatch in current window document
    try {
      window.dispatchEvent(new CustomEvent("buildbid:avatar-sync", { detail: payload }));
    } catch (e) {
      console.warn("[BuildBid Pro] Error dispatching custom avatar event:", e);
    }

    // 3. Broadcast cross-tab synchronization signal
    try {
      localStorage.setItem("buildbid_avatar_sync_signal", JSON.stringify(payload));
    } catch (e) {}

    // 4. Keep cached user reference clean in localStorage
    try {
      const raw = localStorage.getItem("currentUser");
      if (raw) {
        const u = JSON.parse(raw);
        if (photoUrl) {
          u.profilePhotoUrl = photoUrl;
        } else {
          delete u.profilePhotoUrl;
          delete u.profilePhoto;
          delete u.avatarUrl;
        }
        localStorage.setItem("currentUser", JSON.stringify(u));
      }
    } catch (e) {}
  }

  async function loadSavedPhotoFromBackend(token, force = false) {
    if (!token) return;
    if (activePhotoFetchPromise && !force) {
      return activePhotoFetchPromise;
    }

    const thisRequestId = ++photoLoadRequestId;
    activePhotoFetchPromise = (async () => {
      try {
        const url = `${API_BASE_URL}/api/professional/profile/photo${force ? '?t=' + Date.now() : ''}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Cache-Control": "no-cache"
          },
          cache: "no-cache"
        });

        if (thisRequestId !== photoLoadRequestId) return;

        const previewAvatar = document.getElementById("pro-settings-photo-preview");
        const navAvatar = document.getElementById("pro-settings-nav-avatar");
        const removeBtn = document.getElementById("pro-photo-remove-btn");

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (!contentType.startsWith("image/")) {
            console.warn("[BuildBid Pro] Unexpected content type for avatar:", contentType);
            return;
          }

          const blob = await response.blob();
          if (thisRequestId !== photoLoadRequestId) return;

          if (savedPhotoBlobUrl) {
            URL.revokeObjectURL(savedPhotoBlobUrl);
          }
          savedPhotoBlobUrl = URL.createObjectURL(blob);
          if (previewAvatar) previewAvatar.src = savedPhotoBlobUrl;
          if (navAvatar) navAvatar.src = savedPhotoBlobUrl;
          ["side-avatar", "proHeroAvatar", "top-avatar", "proProfileTabAvatar", "settings-header-avatar"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.src = savedPhotoBlobUrl;
          });
          hasSavedPhoto = true;
          if (removeBtn) {
            removeBtn.disabled = false;
            removeBtn.classList.remove("pro-settings-btn-disabled");
          }

          // Cache base64 data URL in localStorage for zero-flash hydration across pages
          try {
            const reader = new FileReader();
            reader.onloadend = function () {
              if (reader.result) {
                try {
                  localStorage.setItem("buildbid_pro_avatar_cache", reader.result);
                  const owner = getProCacheOwnerIdentifier();
                  if (owner) localStorage.setItem("buildbid_pro_avatar_cache_owner", owner);
                } catch (e) {}
              }
            };
            reader.readAsDataURL(blob);
          } catch (e) {}
        } else if (response.status === 404) {
          hasSavedPhoto = false;
          if (savedPhotoBlobUrl) {
            URL.revokeObjectURL(savedPhotoBlobUrl);
            savedPhotoBlobUrl = null;
          }
          try {
            localStorage.removeItem("buildbid_pro_avatar_cache");
            localStorage.removeItem("buildbid_pro_avatar_cache_owner");
          } catch (e) {}
          if (previewAvatar) previewAvatar.src = DEFAULT_AVATAR;
          if (navAvatar) navAvatar.src = DEFAULT_AVATAR;
          ["side-avatar", "proHeroAvatar", "top-avatar", "proProfileTabAvatar", "settings-header-avatar"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.src = DEFAULT_AVATAR;
          });
          if (removeBtn) {
            removeBtn.disabled = true;
            removeBtn.classList.add("pro-settings-btn-disabled");
          }
        } else if (response.status === 401 || response.status === 403) {
          hasSavedPhoto = false;
          if (savedPhotoBlobUrl) {
            URL.revokeObjectURL(savedPhotoBlobUrl);
            savedPhotoBlobUrl = null;
          }
          try {
            localStorage.removeItem("buildbid_pro_avatar_cache");
            localStorage.removeItem("buildbid_pro_avatar_cache_owner");
          } catch (e) {}
          if (previewAvatar) previewAvatar.src = DEFAULT_AVATAR;
          if (navAvatar) navAvatar.src = DEFAULT_AVATAR;
          ["side-avatar", "proHeroAvatar", "top-avatar", "proProfileTabAvatar", "settings-header-avatar"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.src = DEFAULT_AVATAR;
          });
          if (removeBtn) {
            removeBtn.disabled = true;
            removeBtn.classList.add("pro-settings-btn-disabled");
          }
        }
      } catch (err) {
        if (thisRequestId !== photoLoadRequestId) return;
        console.warn("[BuildBid Pro] Could not load saved profile photo from backend:", err);
      } finally {
        activePhotoFetchPromise = null;
      }
    })();

    return activePhotoFetchPromise;
  }

  // ============================================================
  // CROP & PREVIEW STATE & ENGINE
  // ============================================================
  let cropSourceImage = null;
  let cropCanvas = null;
  let cropCtx = null;
  let cropState = {
    panX: 0,
    panY: 0,
    zoom: 1,
    minZoom: 0.2,
    maxZoom: 3,
    rotation: 0
  };
  let isCropDragging = false;
  let dragStartPos = { x: 0, y: 0 };
  let cropStartPan = { x: 0, y: 0 };
  let croppedBlob = null;
  let croppedDataUrl = null;

  function initCropCanvas() {
    cropCanvas = document.getElementById("pro-crop-canvas");
    if (!cropCanvas) return;
    cropCtx = cropCanvas.getContext("2d");

    function getEventPos(e) {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e) {
      if (!cropSourceImage) return;
      isCropDragging = true;
      dragStartPos = getEventPos(e);
      cropStartPan = { x: cropState.panX, y: cropState.panY };
      if (e.cancelable && e.type.startsWith("touch")) e.preventDefault();
    }

    function onPointerMove(e) {
      if (!isCropDragging || !cropSourceImage) return;
      const currentPos = getEventPos(e);
      cropState.panX = cropStartPan.x + (currentPos.x - dragStartPos.x);
      cropState.panY = cropStartPan.y + (currentPos.y - dragStartPos.y);
      drawCropCanvas();
      if (e.cancelable && e.type.startsWith("touch")) e.preventDefault();
    }

    function onPointerUp() {
      isCropDragging = false;
    }

    cropCanvas.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    cropCanvas.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
    window.addEventListener("touchcancel", onPointerUp);

    // Mouse wheel zoom
    cropCanvas.addEventListener("wheel", function (e) {
      if (!cropSourceImage) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setCropZoom(cropState.zoom + delta);
    }, { passive: false });

    // Slider
    const slider = document.getElementById("pro-crop-zoom-slider");
    if (slider) {
      slider.addEventListener("input", function (e) {
        setCropZoom(parseFloat(e.target.value));
      });
    }

    // Zoom buttons
    const zoomInBtn = document.getElementById("pro-crop-zoom-in");
    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", () => setCropZoom(cropState.zoom + 0.1));
    }
    const zoomOutBtn = document.getElementById("pro-crop-zoom-out");
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", () => setCropZoom(cropState.zoom - 0.1));
    }

    // Rotate button
    const rotateBtn = document.getElementById("pro-crop-rotate-btn");
    if (rotateBtn) {
      rotateBtn.addEventListener("click", function () {
        cropState.rotation = (cropState.rotation + 90) % 360;
        drawCropCanvas();
      });
    }

    // Reset button
    const resetBtn = document.getElementById("pro-crop-reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", resetCropState);
    }
  }

  function setCropZoom(newZoom) {
    cropState.zoom = Math.max(cropState.minZoom, Math.min(cropState.maxZoom, newZoom));
    const slider = document.getElementById("pro-crop-zoom-slider");
    if (slider) slider.value = cropState.zoom;
    drawCropCanvas();
  }

  function resetCropState() {
    if (!cropSourceImage) return;
    const minDim = Math.min(cropSourceImage.width, cropSourceImage.height) || 1;
    const fitZoom = 260 / minDim;
    cropState.zoom = Math.max(0.4, Math.min(3, fitZoom));
    cropState.minZoom = Math.max(0.1, fitZoom * 0.5);
    cropState.maxZoom = Math.max(3, fitZoom * 3);
    cropState.panX = 0;
    cropState.panY = 0;
    cropState.rotation = 0;
    const slider = document.getElementById("pro-crop-zoom-slider");
    if (slider) {
      slider.min = cropState.minZoom;
      slider.max = cropState.maxZoom;
      slider.value = cropState.zoom;
    }
    drawCropCanvas();
  }

  function drawCropCanvas() {
    if (!cropCanvas || !cropCtx) return;
    const w = cropCanvas.width;
    const h = cropCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = 130; // 260px diameter circle

    cropCtx.clearRect(0, 0, w, h);

    if (cropSourceImage) {
      cropCtx.save();
      cropCtx.translate(cx + cropState.panX, cy + cropState.panY);
      cropCtx.rotate((cropState.rotation * Math.PI) / 180);
      cropCtx.scale(cropState.zoom, cropState.zoom);
      cropCtx.drawImage(
        cropSourceImage,
        -cropSourceImage.width / 2,
        -cropSourceImage.height / 2
      );
      cropCtx.restore();
    }

    // Dark outer mask outside circle
    cropCtx.save();
    cropCtx.fillStyle = "rgba(11, 17, 32, 0.72)";
    cropCtx.beginPath();
    cropCtx.rect(0, 0, w, h);
    cropCtx.arc(cx, cy, R, 0, Math.PI * 2, true);
    cropCtx.fill();
    cropCtx.restore();

    // Circular crop border
    cropCtx.save();
    cropCtx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    cropCtx.lineWidth = 2.5;
    cropCtx.beginPath();
    cropCtx.arc(cx, cy, R, 0, Math.PI * 2);
    cropCtx.stroke();
    cropCtx.restore();

    // Grid guide lines (clipped inside circle)
    cropCtx.save();
    cropCtx.beginPath();
    cropCtx.arc(cx, cy, R, 0, Math.PI * 2);
    cropCtx.clip();
    cropCtx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    cropCtx.lineWidth = 1;
    cropCtx.beginPath();
    cropCtx.moveTo(cx - R / 3, cy - R);
    cropCtx.lineTo(cx - R / 3, cy + R);
    cropCtx.moveTo(cx + R / 3, cy - R);
    cropCtx.lineTo(cx + R / 3, cy + R);
    cropCtx.moveTo(cx - R, cy - R / 3);
    cropCtx.lineTo(cx + R, cy - R / 3);
    cropCtx.moveTo(cx - R, cy + R / 3);
    cropCtx.lineTo(cx + R, cy + R / 3);
    cropCtx.stroke();
    cropCtx.restore();
  }

  function handlePhotoFileSelected(e) {
    if (isPhotoOperating) return;
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) return;

    // 1. Client-side MIME and Extension validation (JPG, JPEG, PNG, WebP)
    const ext = (file.name || "").split(".").pop().toLowerCase();
    const validExtensions = ["jpg", "jpeg", "png", "webp"];
    const validMimes = [
      "image/jpeg",
      "image/jpg",
      "image/pjpeg",
      "image/png",
      "image/webp"
    ];
    const hasValidType = file.type ? validMimes.includes(file.type.toLowerCase()) : false;
    const hasValidExt = validExtensions.includes(ext);

    if (!hasValidType && !hasValidExt) {
      setPhotoFeedback("Unsupported format. Please select a valid JPG, JPEG, PNG, or WebP image.", "error");
      showToast("Unsupported image format. Please select JPG, JPEG, PNG, or WebP.", "error");
      e.target.value = "";
      return;
    }

    // 2. Client-side size validation (5MB max)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setPhotoFeedback(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.`, "error");
      showToast("Selected file exceeds 5MB size limit.", "error");
      e.target.value = "";
      return;
    }

    if (file.size === 0) {
      setPhotoFeedback("Selected file is empty.", "error");
      showToast("Selected file is empty (0 bytes).", "error");
      e.target.value = "";
      return;
    }

    pendingFile = file;
    updatePersonalInfoSaveButtonState();

    // Instant local preview in card and reveal pending photo action buttons
    const tempUrl = URL.createObjectURL(file);
    const mainPreview = document.getElementById("pro-settings-photo-preview");
    if (mainPreview) mainPreview.src = tempUrl;
    showPendingPhotoActions(true);

    // 3. Load into Image object and open Crop Interface
    setPhotoFeedback("Loading photo for adjustment...", "info");
    const reader = new FileReader();
    reader.onload = function (evt) {
      const img = new Image();
      img.onload = function () {
        cropSourceImage = img;
        openPhotoCropModal();
      };
      img.onerror = function () {
        setPhotoFeedback("Selected image could not be decoded. Please choose a valid image file.", "error");
        showToast("Malformed or corrupt image file.", "error");
        pendingFile = null;
        updatePersonalInfoSaveButtonState();
        e.target.value = "";
      };
      img.src = evt.target.result;
    };
    reader.onerror = function () {
      setPhotoFeedback("Failed to read image file from device.", "error");
      showToast("File reading error.", "error");
      pendingFile = null;
      updatePersonalInfoSaveButtonState();
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function openPhotoCropModal() {
    const modal = document.getElementById("modal-pro-crop");
    if (!modal) return;

    if (!cropCanvas) initCropCanvas();

    resetCropState();

    const cropStep = document.getElementById("pro-crop-step-crop");
    const prevStep = document.getElementById("pro-crop-step-preview");
    if (cropStep) cropStep.style.display = "block";
    if (prevStep) prevStep.style.display = "none";

    const titleEl = document.getElementById("modal-pro-crop-title");
    const descEl = document.getElementById("modal-pro-crop-desc");
    if (titleEl) titleEl.textContent = "Adjust Profile Photo";
    if (descEl) descEl.textContent = "Reposition, zoom, and crop your professional headshot.";

    modal.style.display = "flex";
    drawCropCanvas();
    setPhotoFeedback("", "");
  }

  function closePhotoCropModal() {
    const modal = document.getElementById("modal-pro-crop");
    if (modal) modal.style.display = "none";

    cropSourceImage = null;
    croppedBlob = null;
    croppedDataUrl = null;
    pendingFile = null;
    updatePersonalInfoSaveButtonState();

    const fileInput = document.getElementById("pro-photo-file-input");
    if (fileInput) fileInput.value = "";

    // Keep currently saved photo in preview
    const previewImg = document.getElementById("pro-settings-photo-preview");
    if (previewImg) previewImg.src = savedPhotoBlobUrl || getValidProCachedAvatar() || DEFAULT_AVATAR;

    setPhotoFeedback("", "");
  }

  function proceedToCropPreview() {
    if (!cropSourceImage || !cropCanvas) return;

    const outCanvas = document.createElement("canvas");
    outCanvas.width = 512;
    outCanvas.height = 512;
    const outCtx = outCanvas.getContext("2d");
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";

    const cx = cropCanvas.width / 2;
    const cy = cropCanvas.height / 2;
    const R = 130;
    const scale = 512 / (2 * R);

    outCtx.save();
    outCtx.translate(256, 256);
    outCtx.scale(scale, scale);
    outCtx.translate(cropState.panX, cropState.panY);
    outCtx.rotate((cropState.rotation * Math.PI) / 180);
    outCtx.scale(cropState.zoom, cropState.zoom);
    outCtx.drawImage(
      cropSourceImage,
      -cropSourceImage.width / 2,
      -cropSourceImage.height / 2
    );
    outCtx.restore();

    croppedDataUrl = outCanvas.toDataURL("image/jpeg", 0.92);
    outCanvas.toBlob(function (blob) {
      croppedBlob = blob;

      const previewImg = document.getElementById("pro-crop-preview-result");
      if (previewImg) previewImg.src = croppedDataUrl;

      const metaEl = document.getElementById("pro-crop-preview-meta");
      if (metaEl && blob) {
        metaEl.textContent = `512 × 512 px · JPEG (${Math.round(blob.size / 1024)} KB)`;
      }

      const cropStep = document.getElementById("pro-crop-step-crop");
      const prevStep = document.getElementById("pro-crop-step-preview");
      if (cropStep) cropStep.style.display = "none";
      if (prevStep) prevStep.style.display = "block";

      const titleEl = document.getElementById("modal-pro-crop-title");
      const descEl = document.getElementById("modal-pro-crop-desc");
      if (titleEl) titleEl.textContent = "Confirm Profile Photo";
      if (descEl) descEl.textContent = "Review your cropped photo before saving permanently.";
    }, "image/jpeg", 0.92);
  }

  function backToCropStep() {
    const cropStep = document.getElementById("pro-crop-step-crop");
    const prevStep = document.getElementById("pro-crop-step-preview");
    if (cropStep) cropStep.style.display = "block";
    if (prevStep) prevStep.style.display = "none";

    const titleEl = document.getElementById("modal-pro-crop-title");
    const descEl = document.getElementById("modal-pro-crop-desc");
    if (titleEl) titleEl.textContent = "Adjust Profile Photo";
    if (descEl) descEl.textContent = "Reposition, zoom, and crop your professional headshot.";

    drawCropCanvas();
  }

  async function confirmAndSaveCroppedPhoto() {
    if (isPhotoOperating) return;
    if (!croppedBlob && !pendingFile) {
      setPhotoFeedback("Please select an image file first.", "error");
      showToast("Please choose an image file to upload.", "warning");
      return;
    }

    const token = getCleanToken();
    if (!token) {
      showToast("Authentication required. Please log in.", "error");
      executeLogout();
      return;
    }

    const modalSaveBtn = document.getElementById("pro-crop-confirm-save-btn");
    const cardSaveBtn = document.getElementById("pro-photo-save-btn");
    const originalModalSaveHtml = modalSaveBtn ? modalSaveBtn.innerHTML : "Confirm & Save";
    const originalCardSaveHtml = cardSaveBtn ? cardSaveBtn.innerHTML : "Save Photo";

    if (modalSaveBtn) {
      modalSaveBtn.disabled = true;
      modalSaveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving Photo...</span>`;
    }
    if (cardSaveBtn) {
      cardSaveBtn.disabled = true;
      cardSaveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving...</span>`;
    }

    setPhotoOperatingState(true);
    setPhotoFeedback("Uploading photo...", "info");

    const formData = new FormData();
    const fileToUpload = croppedBlob || pendingFile;
    const fileName = (pendingFile && pendingFile.name)
      ? (croppedBlob ? pendingFile.name.replace(/\.[^/.]+$/, ".jpg") : pendingFile.name)
      : "profile-photo.jpg";
    formData.append("file", fileToUpload, fileName);

    try {
      const response = await fetch(`${API_BASE_URL}/api/professional/profile/photo`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (response.status === 401 || response.status === 403) {
        setPhotoOperatingState(false);
        if (modalSaveBtn) {
          modalSaveBtn.disabled = false;
          modalSaveBtn.innerHTML = originalModalSaveHtml;
        }
        if (cardSaveBtn) {
          cardSaveBtn.disabled = false;
          cardSaveBtn.innerHTML = originalCardSaveHtml;
        }
        showToast("Session expired or unauthorized for professional settings.", "error");
        executeLogout();
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        // Close modal first
        const modal = document.getElementById("modal-pro-crop");
        if (modal) modal.style.display = "none";

        cropSourceImage = null;
        croppedBlob = null;
        croppedDataUrl = null;
        pendingFile = null;

        const fileInput = document.getElementById("pro-photo-file-input");
        if (fileInput) fileInput.value = "";

        // Reload persisted photo from backend with cache-buster
        await loadSavedPhotoFromBackend(token, true);

        showPendingPhotoActions(false);
        setPhotoOperatingState(false);
        setPhotoFeedback("", ""); // Clear inline feedback; no misleading or permanent inline success banner
        showToast("Profile photo updated successfully.", "success");

        // Dispatch authoritative synchronization event
        dispatchAvatarSyncEvent(result.photoUrl || "/api/professional/profile/photo", Date.now());
        updatePersonalInfoSaveButtonState();
      } else {
        const errorMsg = result.error || result.message || `Upload failed (HTTP ${response.status}).`;
        setPhotoOperatingState(false);
        if (modalSaveBtn) {
          modalSaveBtn.disabled = false;
          modalSaveBtn.innerHTML = originalModalSaveHtml;
        }
        if (cardSaveBtn) {
          cardSaveBtn.disabled = false;
          cardSaveBtn.innerHTML = originalCardSaveHtml;
        }
        setPhotoFeedback(errorMsg, "error");
        showToast(errorMsg, "error");
      }
    } catch (err) {
      console.error("[BuildBid Pro] Photo upload network error:", err);
      setPhotoOperatingState(false);
      if (modalSaveBtn) {
        modalSaveBtn.disabled = false;
        modalSaveBtn.innerHTML = originalModalSaveHtml;
      }
      if (cardSaveBtn) {
        cardSaveBtn.disabled = false;
        cardSaveBtn.innerHTML = originalCardSaveHtml;
      }
      setPhotoFeedback("Network error connecting to backend. Your previous photo has been preserved.", "error");
      showToast("Unable to save photo due to network failure. Please retry.", "error");
    }
  }

  function cancelPhotoSelection() {
    closePhotoCropModal();
    const previewImg = document.getElementById("pro-settings-photo-preview");
    if (previewImg) previewImg.src = savedPhotoBlobUrl || getValidProCachedAvatar() || DEFAULT_AVATAR;
    pendingFile = null;
    croppedBlob = null;
    croppedDataUrl = null;
    const fileInput = document.getElementById("pro-photo-file-input");
    if (fileInput) fileInput.value = "";
    showPendingPhotoActions(false);
    setPhotoFeedback("", "");
    updatePersonalInfoSaveButtonState();
  }

  function triggerPhotoFileInput() {
    if (isPhotoOperating) return;
    const fileInput = document.getElementById("pro-photo-file-input");
    if (!fileInput) {
      console.error("[BuildBid Pro] Photo file input element not found in DOM.");
      setPhotoFeedback("Photo input component could not be found.", "error");
      showToast("Unable to open photo picker.", "error");
      return;
    }
    fileInput.value = "";
    try {
      fileInput.click();
    } catch (err) {
      console.error("[BuildBid Pro] Error triggering file input click:", err);
      setPhotoFeedback("Failed to open file picker.", "error");
      showToast("Could not open system file picker.", "error");
    }
  }

  // Expose modal and photo action handlers to window for inline onclick compatibility
  window.triggerPhotoFileInput = triggerPhotoFileInput;
  window.handlePhotoFileSelected = handlePhotoFileSelected;
  window.openPhotoCropModal = openPhotoCropModal;
  window.closePhotoCropModal = closePhotoCropModal;
  window.proceedToCropPreview = proceedToCropPreview;
  window.backToCropStep = backToCropStep;
  window.confirmAndSaveCroppedPhoto = confirmAndSaveCroppedPhoto;
  window.removeProfilePhoto = removeProfilePhoto;

  async function removeProfilePhoto() {
    if (isPhotoOperating || !hasSavedPhoto) return;

    const token = getCleanToken();
    if (!token) {
      showToast("Authentication required. Please log in.", "error");
      executeLogout();
      return;
    }

    if (!confirm("Are you sure you want to remove your professional profile photo?")) {
      return;
    }

    setPhotoOperatingState(true);
    setPhotoFeedback("Removing profile photo from server...", "info");

    try {
      const response = await fetch(`${API_BASE_URL}/api/professional/profile/photo`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.status === 401 || response.status === 403) {
        setPhotoOperatingState(false);
        showToast("Session expired or unauthorized.", "error");
        executeLogout();
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        if (savedPhotoBlobUrl) {
          URL.revokeObjectURL(savedPhotoBlobUrl);
          savedPhotoBlobUrl = null;
        }
        if (pendingBlobUrl) {
          URL.revokeObjectURL(pendingBlobUrl);
          pendingBlobUrl = null;
        }
        try {
          localStorage.removeItem("buildbid_pro_avatar_cache");
          localStorage.removeItem("buildbid_pro_avatar_cache_owner");
        } catch (e) {}
        pendingFile = null;
        croppedBlob = null;
        croppedDataUrl = null;
        hasSavedPhoto = false;

        const previewImg = document.getElementById("pro-settings-photo-preview");
        if (previewImg) previewImg.src = DEFAULT_AVATAR;

        const navAvatar = document.getElementById("pro-settings-nav-avatar");
        if (navAvatar) navAvatar.src = DEFAULT_AVATAR;

        ["side-avatar", "proHeroAvatar", "top-avatar", "proProfileTabAvatar", "settings-header-avatar"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.src = DEFAULT_AVATAR;
        });

        const removeBtn = document.getElementById("pro-photo-remove-btn");
        if (removeBtn) {
          removeBtn.disabled = true;
          removeBtn.classList.add("pro-settings-btn-disabled");
        }

        showPendingPhotoActions(false);
        setPhotoOperatingState(false);
        setPhotoFeedback("", "");
        showToast("Profile photo removed successfully.", "info");

        // Dispatch global synchronization event
        dispatchAvatarSyncEvent(null, Date.now());
        updatePersonalInfoSaveButtonState();
      } else {
        const errorMsg = result.error || result.message || "Failed to remove profile photo.";
        setPhotoOperatingState(false);
        setPhotoFeedback(errorMsg, "error");
        showToast(errorMsg, "error");
      }
    } catch (err) {
      console.error("[BuildBid Pro] Photo remove network error:", err);
      setPhotoOperatingState(false);
      setPhotoFeedback("Network error while removing photo. Please retry.", "error");
      showToast("Network failure while removing photo.", "error");
    }
  }

  function initProfilePhotoModule() {
    initCropCanvas();
    const fileInput = document.getElementById("pro-photo-file-input");
    const chooseBtn = document.getElementById("pro-photo-choose-btn");
    const badgeBtn = document.getElementById("pro-photo-badge-btn");
    const saveBtn = document.getElementById("pro-photo-save-btn");
    const cancelBtn = document.getElementById("pro-photo-cancel-btn");
    const removeBtn = document.getElementById("pro-photo-remove-btn");

    if (chooseBtn && !chooseBtn._proBound) {
      chooseBtn._proBound = true;
      chooseBtn.addEventListener("click", triggerPhotoFileInput);
    }
    if (badgeBtn && !badgeBtn._proBound) {
      badgeBtn._proBound = true;
      badgeBtn.addEventListener("click", triggerPhotoFileInput);
    }
    if (fileInput && !fileInput._proBound) {
      fileInput._proBound = true;
      fileInput.addEventListener("change", handlePhotoFileSelected);
    }
    if (saveBtn && !saveBtn._proBound) {
      saveBtn._proBound = true;
      saveBtn.addEventListener("click", confirmAndSaveCroppedPhoto);
    }
    if (cancelBtn && !cancelBtn._proBound) {
      cancelBtn._proBound = true;
      cancelBtn.addEventListener("click", cancelPhotoSelection);
    }
    if (removeBtn && !removeBtn._proBound) {
      removeBtn._proBound = true;
      removeBtn.addEventListener("click", removeProfilePhoto);
    }

    // In-document CustomEvent listener
    window.addEventListener("buildbid:avatar-sync", function (event) {
      const detail = event && event.detail ? event.detail : {};
      const photoUrl = detail.photoUrl;
      const token = getCleanToken();

      if (!photoUrl) {
        if (savedPhotoBlobUrl) {
          URL.revokeObjectURL(savedPhotoBlobUrl);
          savedPhotoBlobUrl = null;
        }
        hasSavedPhoto = false;
        const previewImg = document.getElementById("pro-settings-photo-preview");
        if (previewImg && !pendingBlobUrl) previewImg.src = DEFAULT_AVATAR;
        const navAvatar = document.getElementById("pro-settings-nav-avatar");
        if (navAvatar) navAvatar.src = DEFAULT_AVATAR;
        const removeBtn = document.getElementById("pro-photo-remove-btn");
        if (removeBtn) {
          removeBtn.disabled = true;
          removeBtn.classList.add("pro-settings-btn-disabled");
        }
      } else {
        if (token) {
          loadSavedPhotoFromBackend(token, true);
        }
      }
    });

    // Cross-tab synchronization listener
    window.addEventListener("storage", function (e) {
      if (e.key === "buildbid_avatar_sync_signal" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          window.dispatchEvent(new CustomEvent("buildbid:avatar-sync", { detail: data }));
        } catch (err) {}
      }
    });

    // Object URL garbage collection on unload
    window.addEventListener("beforeunload", function () {
      if (savedPhotoBlobUrl) {
        URL.revokeObjectURL(savedPhotoBlobUrl);
        savedPhotoBlobUrl = null;
      }
      if (pendingBlobUrl) {
        URL.revokeObjectURL(pendingBlobUrl);
        pendingBlobUrl = null;
      }
    });
  }

  // ============================================================
  // 5C. EMAIL CHANGE & OTP VERIFICATION MODULE (Phase 4)
  // ============================================================
  let pendingEmailChange = "";
  let emailResendCooldownInterval = null;
  let emailResendCooldownRemaining = 0;

  function setEmailChangeFeedback(message, type = "") {
    const feedback = document.getElementById("pro-email-otp-feedback");
    if (!feedback) return;
    if (!message) {
      feedback.style.display = "none";
      feedback.textContent = "";
      feedback.className = "pro-otp-feedback-box";
      return;
    }
    feedback.style.display = "flex";
    feedback.className = "pro-otp-feedback-box " + (type || "");
    const icon = type === "error"
      ? '<i class="fa-solid fa-circle-xmark"></i>'
      : (type === "success" ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-info"></i>');
    feedback.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
  }

  function setEmailChangeError(message) {
    const errorEl = document.getElementById("pro-email-change-error");
    if (!errorEl) return;
    if (!message) {
      errorEl.style.display = "none";
      errorEl.textContent = "";
    } else {
      errorEl.style.display = "block";
      errorEl.textContent = message;
    }
  }

  function openEmailChangeSubcard() {
    const changeSection = document.getElementById("pro-email-change-section");
    const otpSection = document.getElementById("pro-email-otp-section");
    const input = document.getElementById("pro-input-new-email");

    if (otpSection) otpSection.style.display = "none";
    if (changeSection) changeSection.style.display = "block";

    setEmailChangeError("");
    setEmailChangeFeedback("");

    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 60);
    }
  }

  function closeEmailChangeSubcard() {
    const changeSection = document.getElementById("pro-email-change-section");
    const otpSection = document.getElementById("pro-email-otp-section");
    if (changeSection) changeSection.style.display = "none";
    if (otpSection) otpSection.style.display = "none";

    setEmailChangeError("");
    setEmailChangeFeedback("");
    pendingEmailChange = "";
    clearOtpDigitInputs();
    stopEmailCooldownTimer();
  }

  function clearOtpDigitInputs() {
    const container = document.getElementById("pro-email-otp-digits-container");
    if (!container) return;
    const inputs = container.querySelectorAll(".pro-otp-digit-input");
    inputs.forEach(inp => {
      inp.value = "";
      inp.classList.remove("has-value");
    });
  }

  function getEnteredEmailOtp() {
    const container = document.getElementById("pro-email-otp-digits-container");
    if (!container) return "";
    const inputs = container.querySelectorAll(".pro-otp-digit-input");
    return Array.from(inputs).map(i => i.value.trim()).join("");
  }

  function stopEmailCooldownTimer() {
    if (emailResendCooldownInterval) {
      clearInterval(emailResendCooldownInterval);
      emailResendCooldownInterval = null;
    }
    emailResendCooldownRemaining = 0;
    const resendBtn = document.getElementById("pro-btn-resend-email-otp");
    const countdownSpan = document.getElementById("pro-email-resend-countdown");
    if (resendBtn && countdownSpan) {
      resendBtn.disabled = false;
      countdownSpan.textContent = "Resend Code";
    }
  }

  function startEmailCooldownTimer(seconds = 60) {
    stopEmailCooldownTimer();
    emailResendCooldownRemaining = seconds;

    const resendBtn = document.getElementById("pro-btn-resend-email-otp");
    const countdownSpan = document.getElementById("pro-email-resend-countdown");
    if (!resendBtn || !countdownSpan) return;

    resendBtn.disabled = true;
    countdownSpan.textContent = `Resend Code (${emailResendCooldownRemaining}s)`;

    emailResendCooldownInterval = setInterval(() => {
      emailResendCooldownRemaining--;
      if (emailResendCooldownRemaining <= 0) {
        stopEmailCooldownTimer();
      } else {
        countdownSpan.textContent = `Resend Code (${emailResendCooldownRemaining}s)`;
      }
    }, 1000);
  }

  async function handleSendEmailChangeOtp() {
    const token = getCleanToken();
    if (!token) {
      showToast("Session expired. Please log in again.", "warning");
      return;
    }

    const input = document.getElementById("pro-input-new-email");
    setEmailChangeError("");

    const newEmail = input ? input.value.trim().toLowerCase() : "";
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailChangeError("Please enter a valid email address.");
      if (input) input.focus();
      return;
    }

    const currentEmail = (currentProfile && currentProfile.email ? currentProfile.email : "").trim().toLowerCase();
    if (currentEmail && newEmail === currentEmail) {
      setEmailChangeError("New email cannot be the same as your current email.");
      if (input) input.focus();
      return;
    }

    const sendBtn = document.getElementById("pro-btn-send-email-change-otp");
    const originalHtml = sendBtn ? sendBtn.innerHTML : "";
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Checking Availability...</span>`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/verification/email/request-change`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ newEmail: newEmail })
      });

      const resJson = await response.json().catch(() => ({}));

      if (response.ok) {
        pendingEmailChange = newEmail;

        const changeSection = document.getElementById("pro-email-change-section");
        const otpSection = document.getElementById("pro-email-otp-section");
        const targetDisplay = document.getElementById("pro-email-otp-target-display");

        if (changeSection) changeSection.style.display = "none";
        if (otpSection) otpSection.style.display = "block";
        if (targetDisplay) targetDisplay.textContent = newEmail;

        clearOtpDigitInputs();
        setEmailChangeFeedback("");
        startEmailCooldownTimer(resJson.cooldownSeconds || 60);

        showToast(resJson.message || `Verification code sent to ${newEmail}`, "success");

        const firstDigit = document.querySelector("#pro-email-otp-digits-container .pro-otp-digit-input");
        if (firstDigit) {
          setTimeout(() => firstDigit.focus(), 60);
        }
      } else {
        const errorMsg = resJson.error || "Unable to request email change code. Please try again.";
        setEmailChangeError(errorMsg);
        showToast(errorMsg, "error");
      }
    } catch (err) {
      console.error("[BuildBid Pro] Email change request error:", err);
      setEmailChangeError("Network error. Please check your connection and retry.");
      showToast("Network error. Could not connect to verification server.", "error");
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalHtml;
      }
    }
  }

  async function handleVerifyEmailChangeOtp() {
    const token = getCleanToken();
    if (!token || !pendingEmailChange) {
      showToast("Please initiate email change request first.", "warning");
      return;
    }

    const otp = getEnteredEmailOtp();
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setEmailChangeFeedback("Please enter the complete 6-digit numeric verification code.", "error");
      const firstEmpty = Array.from(document.querySelectorAll("#pro-email-otp-digits-container .pro-otp-digit-input")).find(i => !i.value.trim());
      if (firstEmpty) firstEmpty.focus();
      return;
    }

    const verifyBtn = document.getElementById("pro-btn-verify-email-otp");
    const originalHtml = verifyBtn ? verifyBtn.innerHTML : "";
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Verifying Code...</span>`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/verification/email/verify-change`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          newEmail: pendingEmailChange,
          otp: otp
        })
      });

      const resJson = await response.json().catch(() => ({}));

      if (response.ok) {
        const confirmedEmail = resJson.email || pendingEmailChange;
        setEmailChangeFeedback(resJson.message || "Email updated and verified successfully!", "success");
        showToast("Email updated and verified successfully!", "success");

        // 1. Session token refresh if issued by backend
        if (resJson.token) {
          localStorage.setItem("token", resJson.token);
          localStorage.setItem("marketplaceToken", resJson.token);
          localStorage.setItem("authToken", resJson.token);
        }

        // 2. Update cached session objects
        try {
          const rawUser = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            parsed.email = confirmedEmail;
            parsed.emailVerified = true;
            localStorage.setItem("currentUser", JSON.stringify(parsed));
            localStorage.setItem("marketplaceUser", JSON.stringify(parsed));
          }
        } catch (e) {}

        // 3. Update in-memory state and UI elements
        if (currentProfile) {
          currentProfile.email = confirmedEmail;
          currentProfile.emailVerified = true;
        }

        const inputEmail = document.getElementById("pro-input-email");
        if (inputEmail) inputEmail.value = confirmedEmail;

        const verifyEmail = document.getElementById("verify-email-display");
        if (verifyEmail) verifyEmail.textContent = `Email: ${confirmedEmail}`;

        const badgeEmail = document.getElementById("badge-email-status");
        if (badgeEmail) {
          badgeEmail.className = "pro-settings-badge pro-settings-badge-verified";
          badgeEmail.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verified`;
        }

        // 4. Smooth teardown
        setTimeout(() => {
          closeEmailChangeSubcard();
          fetchVerificationStatus();
        }, 1400);

      } else {
        const errorMsg = resJson.error || "Verification code failed. Please check the code and try again.";
        setEmailChangeFeedback(errorMsg, "error");
        showToast(errorMsg, "error");
      }
    } catch (err) {
      console.error("[BuildBid Pro] Email OTP verification error:", err);
      setEmailChangeFeedback("Network error during verification. Please try again.", "error");
      showToast("Network error. Please check your connection.", "error");
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = originalHtml;
      }
    }
  }

  async function fetchVerificationStatus() {
    const token = getCleanToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/verification/status`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        const status = await response.json();
        if (currentProfile) {
          currentProfile.email = status.email || currentProfile.email;
          currentProfile.emailVerified = status.emailVerified;
          currentProfile.phoneVerified = status.phoneVerified;
        }

        const inputEmail = document.getElementById("pro-input-email");
        if (inputEmail && status.email) inputEmail.value = status.email;

        const verifyEmail = document.getElementById("verify-email-display");
        if (verifyEmail && status.email) verifyEmail.textContent = `Email: ${status.email}`;

        const badgeEmail = document.getElementById("badge-email-status");
        if (badgeEmail) {
          if (status.emailVerified) {
            badgeEmail.className = "pro-settings-badge pro-settings-badge-verified";
            badgeEmail.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verified`;
          } else {
            badgeEmail.className = "pro-settings-badge pro-settings-badge-pending";
            badgeEmail.innerHTML = `<i class="fa-solid fa-clock"></i> Verification Pending`;
          }
        }
      }
    } catch (e) {
      console.warn("[BuildBid Pro] Could not refresh verification status:", e);
    }
  }

  function initEmailChangeModule() {
    // 1. Open / Cancel buttons
    const openBtn = document.getElementById("pro-btn-open-email-change");
    if (openBtn) {
      openBtn.addEventListener("click", openEmailChangeSubcard);
    }

    const gotoLink = document.getElementById("pro-link-goto-email-change");
    if (gotoLink) {
      gotoLink.addEventListener("click", () => {
        switchSection("verification", true);
        setTimeout(openEmailChangeSubcard, 150);
      });
    }

    const cancelChangeBtn = document.getElementById("pro-btn-cancel-email-change");
    if (cancelChangeBtn) {
      cancelChangeBtn.addEventListener("click", closeEmailChangeSubcard);
    }

    const cancelOtpBtn = document.getElementById("pro-btn-cancel-email-otp");
    if (cancelOtpBtn) {
      cancelOtpBtn.addEventListener("click", closeEmailChangeSubcard);
    }

    // 2. Submit Request
    const sendOtpBtn = document.getElementById("pro-btn-send-email-change-otp");
    if (sendOtpBtn) {
      sendOtpBtn.addEventListener("click", handleSendEmailChangeOtp);
    }

    const newEmailInput = document.getElementById("pro-input-new-email");
    if (newEmailInput) {
      newEmailInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSendEmailChangeOtp();
        }
      });
      newEmailInput.addEventListener("input", () => {
        setEmailChangeError("");
      });
    }

    // 3. Resend OTP
    const resendBtn = document.getElementById("pro-btn-resend-email-otp");
    if (resendBtn) {
      resendBtn.addEventListener("click", () => {
        if (emailResendCooldownRemaining <= 0 && pendingEmailChange) {
          handleSendEmailChangeOtp();
        }
      });
    }

    // 4. Verify OTP button
    const verifyBtn = document.getElementById("pro-btn-verify-email-otp");
    if (verifyBtn) {
      verifyBtn.addEventListener("click", handleVerifyEmailChangeOtp);
    }

    // 5. 6-digit OTP Inputs interactive wiring
    const container = document.getElementById("pro-email-otp-digits-container");
    if (container) {
      const inputs = Array.from(container.querySelectorAll(".pro-otp-digit-input"));

      inputs.forEach((input, index) => {
        // Input: accept single digit, advance focus
        input.addEventListener("input", () => {
          const val = input.value.replace(/\D/g, "");
          input.value = val ? val[val.length - 1] : "";
          if (input.value) {
            input.classList.add("has-value");
            if (index < inputs.length - 1) {
              inputs[index + 1].focus();
            } else {
              // Automatically submit if all 6 filled
              const fullOtp = inputs.map(i => i.value).join("");
              if (fullOtp.length === 6) {
                handleVerifyEmailChangeOtp();
              }
            }
          } else {
            input.classList.remove("has-value");
          }
        });

        // Keydown: backspace & arrow navigation
        input.addEventListener("keydown", (e) => {
          if (e.key === "Backspace") {
            if (!input.value && index > 0) {
              inputs[index - 1].focus();
              inputs[index - 1].value = "";
              inputs[index - 1].classList.remove("has-value");
            } else {
              input.value = "";
              input.classList.remove("has-value");
            }
          } else if (e.key === "ArrowLeft" && index > 0) {
            inputs[index - 1].focus();
          } else if (e.key === "ArrowRight" && index < inputs.length - 1) {
            inputs[index + 1].focus();
          } else if (e.key === "Enter") {
            e.preventDefault();
            handleVerifyEmailChangeOtp();
          }
        });

        // Paste support: paste full 6-digit code
        input.addEventListener("paste", (e) => {
          e.preventDefault();
          const pastedData = (e.clipboardData || window.clipboardData).getData("text").trim();
          const digits = pastedData.replace(/\D/g, "");
          if (!digits) return;

          inputs.forEach((inp, idx) => {
            if (digits[idx]) {
              inp.value = digits[idx];
              inp.classList.add("has-value");
            }
          });

          const focusIdx = Math.min(digits.length, inputs.length - 1);
          inputs[focusIdx].focus();

          if (digits.length >= 6) {
            handleVerifyEmailChangeOtp();
          }
        });
      });
    }
  }

  // ============================================================
  // 5D. SECURITY & LOGIN MODULE (Phase 6: Password Change & Invalidation)
  // ============================================================
  async function fetchSecurityStatus() {
    const token = getCleanToken();
    if (!token) return;

    const lastChangedEl = document.getElementById("pro-settings-security-last-changed");
    const pwdStatusEl = document.getElementById("pro-settings-security-pwd-status");

    try {
      const response = await fetch(`${API_BASE_URL}/api/professional/security/status`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (lastChangedEl) {
          if (data.passwordUpdatedAt) {
            try {
              const d = new Date(data.passwordUpdatedAt);
              lastChangedEl.textContent = d.toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short"
              });
            } catch (e) {
              lastChangedEl.textContent = data.passwordUpdatedAt;
            }
          } else {
            lastChangedEl.textContent = "Never (Default active)";
          }
        }
        if (pwdStatusEl) {
          pwdStatusEl.textContent = data.hasPassword ? "Active & BCrypt Protected" : "Not Set";
        }
      } else {
        if (lastChangedEl) lastChangedEl.textContent = "Protected (JWT)";
      }
    } catch (err) {
      console.warn("[BuildBid Pro] Error fetching security status:", err);
      if (lastChangedEl) lastChangedEl.textContent = "Protected (JWT)";
    }
  }

  function initSecurityLoginModule() {
    // 1. Password Visibility Toggles
    const toggleBindings = [
      { toggleId: "pro-settings-security-toggle-current", inputId: "pro-settings-security-current-password" },
      { toggleId: "pro-settings-security-toggle-new", inputId: "pro-settings-security-new-password" },
      { toggleId: "pro-settings-security-toggle-confirm", inputId: "pro-settings-security-confirm-password" }
    ];

    toggleBindings.forEach(binding => {
      const btn = document.getElementById(binding.toggleId);
      const input = document.getElementById(binding.inputId);
      if (!btn || !input) return;

      btn.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.setAttribute("title", isPassword ? "Hide password" : "Show password");
        btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
        const icon = btn.querySelector("i");
        if (icon) {
          icon.className = isPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
        }
      });
    });

    // 2. Real-time Password Policy Rule Updates
    const curInput = document.getElementById("pro-settings-security-current-password");
    const newInput = document.getElementById("pro-settings-security-new-password");
    const confInput = document.getElementById("pro-settings-security-confirm-password");

    const ruleLength = document.getElementById("pro-rule-length");
    const ruleDiff = document.getElementById("pro-rule-diff");
    const ruleMatch = document.getElementById("pro-rule-match");

    function updatePolicyHints() {
      const curVal = curInput ? curInput.value : "";
      const newVal = newInput ? newInput.value : "";
      const confVal = confInput ? confInput.value : "";

      if (ruleLength) {
        const isLenOk = newVal.length >= 8 && newVal.length <= 100;
        ruleLength.className = "pro-settings-security-rule-item " + (newVal.length > 0 ? (isLenOk ? "valid" : "invalid") : "");
        const icon = ruleLength.querySelector("i");
        if (icon) icon.className = isLenOk ? "fa-solid fa-circle-check" : "fa-solid fa-circle-dot";
      }

      if (ruleDiff) {
        const isDiffOk = newVal.length > 0 && curVal.length > 0 && newVal !== curVal;
        const isDiffFailed = newVal.length > 0 && curVal.length > 0 && newVal === curVal;
        ruleDiff.className = "pro-settings-security-rule-item " + (isDiffFailed ? "invalid" : (isDiffOk ? "valid" : ""));
        const icon = ruleDiff.querySelector("i");
        if (icon) icon.className = isDiffOk ? "fa-solid fa-circle-check" : "fa-solid fa-circle-dot";
      }

      if (ruleMatch) {
        const isMatchOk = newVal.length > 0 && confVal.length > 0 && newVal === confVal;
        const isMatchFailed = confVal.length > 0 && newVal !== confVal;
        ruleMatch.className = "pro-settings-security-rule-item " + (isMatchFailed ? "invalid" : (isMatchOk ? "valid" : ""));
        const icon = ruleMatch.querySelector("i");
        if (icon) icon.className = isMatchOk ? "fa-solid fa-circle-check" : "fa-solid fa-circle-dot";
      }
    }

    [curInput, newInput, confInput].forEach(inp => {
      if (inp) {
        inp.addEventListener("input", () => {
          updatePolicyHints();
          clearSecurityFieldErrors();
        });
      }
    });

    // 3. Clear/Reset Button
    const resetBtn = document.getElementById("pro-settings-security-reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        resetPasswordForm();
      });
    }

    // 4. Form Submit: Change Password
    const form = document.getElementById("pro-settings-security-password-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await handlePasswordChangeSubmit();
      });
    }

    // 5. Revoke All Sessions Button
    const logoutAllBtn = document.getElementById("pro-settings-security-logout-all-btn");
    if (logoutAllBtn) {
      logoutAllBtn.addEventListener("click", async () => {
        await handleRevokeAllSessions();
      });
    }
  }

  function setSecurityFieldError(field, message) {
    const errorEl = document.getElementById(`pro-settings-security-${field}-error`);
    if (errorEl) {
      if (message) {
        errorEl.textContent = message;
        errorEl.style.display = "block";
      } else {
        errorEl.textContent = "";
        errorEl.style.display = "none";
      }
    }
  }

  function clearSecurityFieldErrors() {
    setSecurityFieldError("current", "");
    setSecurityFieldError("new", "");
    setSecurityFieldError("confirm", "");
    const feedbackBox = document.getElementById("pro-settings-security-feedback");
    if (feedbackBox) {
      feedbackBox.style.display = "none";
      feedbackBox.textContent = "";
      feedbackBox.className = "pro-settings-security-feedback";
    }
  }

  function resetPasswordForm() {
    const curInput = document.getElementById("pro-settings-security-current-password");
    const newInput = document.getElementById("pro-settings-security-new-password");
    const confInput = document.getElementById("pro-settings-security-confirm-password");
    if (curInput) curInput.value = "";
    if (newInput) newInput.value = "";
    if (confInput) confInput.value = "";

    clearSecurityFieldErrors();

    const rules = ["pro-rule-length", "pro-rule-diff", "pro-rule-match"];
    rules.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.className = "pro-settings-security-rule-item";
        const icon = el.querySelector("i");
        if (icon) icon.className = "fa-solid fa-circle-dot";
      }
    });
  }

  async function handlePasswordChangeSubmit() {
    const token = getCleanToken();
    if (!token) {
      showToast("Session expired. Please log in again.", "warning");
      executeLogout();
      return;
    }

    clearSecurityFieldErrors();

    const curInput = document.getElementById("pro-settings-security-current-password");
    const newInput = document.getElementById("pro-settings-security-new-password");
    const confInput = document.getElementById("pro-settings-security-confirm-password");
    const submitBtn = document.getElementById("pro-settings-security-submit-btn");
    const resetBtn = document.getElementById("pro-settings-security-reset-btn");
    const feedbackBox = document.getElementById("pro-settings-security-feedback");

    const curPwd = curInput ? curInput.value : "";
    const newPwd = newInput ? newInput.value : "";
    const confPwd = confInput ? confInput.value : "";

    // Client-side validations
    let hasError = false;

    if (!curPwd) {
      setSecurityFieldError("current", "Current password is required.");
      if (!hasError && curInput) curInput.focus();
      hasError = true;
    }

    if (!newPwd) {
      setSecurityFieldError("new", "New password is required.");
      if (!hasError && newInput) newInput.focus();
      hasError = true;
    } else if (newPwd.length < 8) {
      setSecurityFieldError("new", "New password must be at least 8 characters in length.");
      if (!hasError && newInput) newInput.focus();
      hasError = true;
    } else if (newPwd.length > 100) {
      setSecurityFieldError("new", "New password must not exceed 100 characters.");
      if (!hasError && newInput) newInput.focus();
      hasError = true;
    }

    if (!confPwd) {
      setSecurityFieldError("confirm", "Password confirmation is required.");
      if (!hasError && confInput) confInput.focus();
      hasError = true;
    } else if (newPwd && confPwd !== newPwd) {
      setSecurityFieldError("confirm", "New password and confirmation do not match.");
      if (!hasError && confInput) confInput.focus();
      hasError = true;
    }

    if (curPwd && newPwd && curPwd === newPwd) {
      setSecurityFieldError("new", "New password cannot be the same as your current password.");
      if (!hasError && newInput) newInput.focus();
      hasError = true;
    }

    if (hasError) return;

    // Loading state
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Updating Password...</span>`;
    }
    if (resetBtn) resetBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/api/professional/security/password`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          currentPassword: curPwd,
          newPassword: newPwd,
          confirmPassword: confPwd
        })
      });

      // Clear plaintext password fields from DOM immediately for security
      if (curInput) curInput.value = "";
      if (newInput) newInput.value = "";
      if (confInput) confInput.value = "";

      const resJson = await response.json().catch(() => ({}));

      if (response.ok) {
        if (feedbackBox) {
          feedbackBox.className = "pro-settings-security-feedback success";
          feedbackBox.innerHTML = `
            <i class="fa-solid fa-circle-check" style="font-size: 16px;"></i>
            <div>
              <strong>Password Changed Successfully!</strong>
              <div style="font-size: 12px; margin-top: 2px;">All previous sessions have been invalidated. Redirecting to login page...</div>
            </div>
          `;
          feedbackBox.style.display = "flex";
        }

        showToast("Password changed successfully. Please log in again.", "success");

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Password Changed</span>`;
        }

        // Refresh last changed display
        const lastChangedEl = document.getElementById("pro-settings-security-last-changed");
        if (lastChangedEl) {
          lastChangedEl.textContent = new Date().toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
          });
        }

        // Redirect to login after 2.5 seconds
        setTimeout(() => {
          executeLogout();
        }, 2500);

      } else {
        const errorMsg = resJson.error || resJson.message || "Failed to update password.";

        if (errorMsg.includes("Current password")) {
          setSecurityFieldError("current", errorMsg);
          if (curInput) curInput.focus();
        } else if (errorMsg.includes("confirmation")) {
          setSecurityFieldError("confirm", errorMsg);
          if (confInput) confInput.focus();
        } else if (errorMsg.includes("same as") || errorMsg.includes("characters")) {
          setSecurityFieldError("new", errorMsg);
          if (newInput) newInput.focus();
        }

        if (feedbackBox) {
          feedbackBox.className = "pro-settings-security-feedback error";
          feedbackBox.innerHTML = `
            <i class="fa-solid fa-circle-xmark" style="font-size: 16px;"></i>
            <span>${escapeHtml(errorMsg)}</span>
          `;
          feedbackBox.style.display = "flex";
        }

        showToast(errorMsg, "error");

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
        if (resetBtn) resetBtn.disabled = false;
      }

    } catch (err) {
      console.error("[BuildBid Pro] Password change network error:", err);
      const networkMsg = "Network error. Unable to contact authentication server.";
      if (feedbackBox) {
        feedbackBox.className = "pro-settings-security-feedback error";
        feedbackBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${networkMsg}</span>`;
        feedbackBox.style.display = "flex";
      }
      showToast(networkMsg, "error");

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
      if (resetBtn) resetBtn.disabled = false;
    }
  }

  async function handleRevokeAllSessions() {
    const token = getCleanToken();
    if (!token) {
      showToast("Session expired. Please log in again.", "warning");
      executeLogout();
      return;
    }

    const confirmed = window.confirm("Are you sure you want to revoke all active sessions across all devices? You will be signed out and required to log in again.");
    if (!confirmed) return;

    const logoutAllBtn = document.getElementById("pro-settings-security-logout-all-btn");
    const revokeFeedback = document.getElementById("pro-settings-security-revoke-feedback");
    const originalHtml = logoutAllBtn ? logoutAllBtn.innerHTML : "";

    if (logoutAllBtn) {
      logoutAllBtn.disabled = true;
      logoutAllBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Revoking Sessions...</span>`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/professional/security/logout-all`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        if (revokeFeedback) {
          revokeFeedback.className = "pro-settings-security-feedback success";
          revokeFeedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>All active sessions have been revoked. Redirecting to login...</span>`;
          revokeFeedback.style.display = "flex";
        }
        showToast("All sessions revoked. Redirecting to login...", "info");
        setTimeout(() => {
          executeLogout();
        }, 1500);
      } else {
        const resJson = await response.json().catch(() => ({}));
        const errorMsg = resJson.error || "Failed to revoke sessions. Please try again.";
        if (revokeFeedback) {
          revokeFeedback.className = "pro-settings-security-feedback error";
          revokeFeedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${escapeHtml(errorMsg)}</span>`;
          revokeFeedback.style.display = "flex";
        }
        showToast(errorMsg, "error");
        if (logoutAllBtn) {
          logoutAllBtn.disabled = false;
          logoutAllBtn.innerHTML = originalHtml;
        }
      }
    } catch (err) {
      console.error("[BuildBid Pro] Session revoke error:", err);
      showToast("Network error. Unable to revoke sessions.", "error");
      if (logoutAllBtn) {
        logoutAllBtn.disabled = false;
        logoutAllBtn.innerHTML = originalHtml;
      }
    }
  }

  // ============================================================
  // 5E. ACCOUNT ACTIVITY & HISTORY MODULE (Phase 7 Genuine Activity)
  // ============================================================
  let isFetchingActivity = false;

  function renderActivityLoading() {
    const container = document.getElementById("pro-activity-container");
    if (!container) return;
    container.innerHTML = `
      <div class="pro-activity-state pro-activity-loading">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <h4>Loading Account Activity</h4>
        <p>Fetching genuine verified activity records for your authenticated account...</p>
      </div>
    `;
  }

  function renderActivityEmpty() {
    const container = document.getElementById("pro-activity-container");
    const countBadge = document.getElementById("pro-activity-count-badge");
    if (countBadge) countBadge.textContent = "0 Recorded";
    if (!container) return;
    container.innerHTML = `
      <div class="pro-activity-state">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <h4>No Activity Records Found</h4>
        <p>No historical security or profile activities have been recorded for your account yet.</p>
      </div>
    `;
  }

  function renderActivityError(errMsg) {
    const container = document.getElementById("pro-activity-container");
    const countBadge = document.getElementById("pro-activity-count-badge");
    if (countBadge) countBadge.textContent = "Unavailable";
    if (!container) return;
    container.innerHTML = `
      <div class="pro-activity-state pro-activity-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h4>Unable to Load Account Activity</h4>
        <p>${escapeHtml(errMsg || "An error occurred while fetching your activity history.")}</p>
        <button type="button" class="pro-settings-btn pro-settings-btn-secondary" style="margin-top: 14px;" onclick="window.refreshAccountActivity()">
          <i class="fa-solid fa-rotate-right"></i> Try Again
        </button>
      </div>
    `;
  }

  function formatActivityTimestamp(ts) {
    if (!ts) return "Timestamp not available";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      return String(ts);
    }
  }

  function getActivityIconAndColor(type, cat) {
    switch (type) {
      case "PASSWORD_CHANGE":
        return { icon: "fa-key", iconClass: "pro-activity-icon-security" };
      case "SESSIONS_REVOKED":
        return { icon: "fa-arrow-right-from-bracket", iconClass: "pro-activity-icon-security" };
      case "PHOTO_UPLOADED":
        return { icon: "fa-camera", iconClass: "pro-activity-icon-profile" };
      case "PHOTO_DELETED":
        return { icon: "fa-trash-can", iconClass: "pro-activity-icon-profile" };
      case "EMAIL_VERIFIED":
        return { icon: "fa-envelope-circle-check", iconClass: "pro-activity-icon-verification" };
      case "PHONE_VERIFIED":
        return { icon: "fa-mobile-screen-button", iconClass: "pro-activity-icon-verification" };
      case "OTP_REQUEST":
        return { icon: "fa-shield-halved", iconClass: "pro-activity-icon-verification" };
      case "PROJECT_APPLICATION":
        return { icon: "fa-file-signature", iconClass: "pro-activity-icon-engagement" };
      case "DIRECT_INQUIRY":
        return { icon: "fa-comments", iconClass: "pro-activity-icon-engagement" };
      case "ACCOUNT_CREATION":
        return { icon: "fa-user-check", iconClass: "pro-activity-icon-account" };
      case "ACCOUNT_DEACTIVATED":
        return { icon: "fa-user-slash", iconClass: "pro-activity-icon-security" };
      default: {
        const c = (cat || "").toUpperCase();
        if (c === "SECURITY") return { icon: "fa-shield", iconClass: "pro-activity-icon-security" };
        if (c === "VERIFICATION") return { icon: "fa-circle-check", iconClass: "pro-activity-icon-verification" };
        if (c === "PROFILE") return { icon: "fa-user-pen", iconClass: "pro-activity-icon-profile" };
        if (c === "ENGAGEMENT") return { icon: "fa-briefcase", iconClass: "pro-activity-icon-engagement" };
        return { icon: "fa-clock-rotate-left", iconClass: "pro-activity-icon-default" };
      }
    }
  }

  function renderActivityItem(item) {
    const type = item.activityType || "ACTIVITY";
    const cat = item.category || "ACCOUNT";
    const { icon, iconClass } = getActivityIconAndColor(type, cat);
    const catClass = `pro-activity-cat-${cat.toLowerCase()}`;
    const timeFormatted = formatActivityTimestamp(item.timestamp);
    const status = item.status || "";
    const meta = item.metadata || {};

    let metaHtml = "";
    if (meta.target) {
      metaHtml += `<span class="pro-activity-meta-tag"><i class="fa-solid fa-bullseye"></i> Target: ${escapeHtml(meta.target)}</span>`;
    }
    if (meta.purpose) {
      metaHtml += `<span class="pro-activity-meta-tag"><i class="fa-solid fa-tag"></i> Purpose: ${escapeHtml(meta.purpose)}</span>`;
    }
    if (meta.service) {
      metaHtml += `<span class="pro-activity-meta-tag"><i class="fa-solid fa-briefcase"></i> Service: ${escapeHtml(meta.service)}</span>`;
    }
    if (meta.rate) {
      metaHtml += `<span class="pro-activity-meta-tag"><i class="fa-solid fa-indian-rupee-sign"></i> Proposed Rate: ₹${escapeHtml(meta.rate)}</span>`;
    }
    if (meta.file) {
      metaHtml += `<span class="pro-activity-meta-tag"><i class="fa-solid fa-image"></i> File: ${escapeHtml(meta.file)}</span>`;
    }
    if (status) {
      const statusClass = `pro-activity-status-${status.toLowerCase()}`;
      metaHtml += `<span class="pro-activity-status-tag ${statusClass}">${escapeHtml(status)}</span>`;
    }

    return `
      <article class="pro-activity-item" data-id="${escapeHtml(item.id || '')}">
        <div class="pro-activity-icon-wrap ${iconClass}">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div class="pro-activity-body">
          <div class="pro-activity-header-line">
            <div class="pro-activity-title-group">
              <h4 class="pro-activity-title">${escapeHtml(item.title || "Account Activity")}</h4>
              <span class="pro-activity-cat-tag ${catClass}">${escapeHtml(cat)}</span>
            </div>
            <time class="pro-activity-time" datetime="${escapeHtml(item.timestamp || '')}">
              <i class="fa-regular fa-clock"></i> ${escapeHtml(timeFormatted)}
            </time>
          </div>
          <p class="pro-activity-desc">${escapeHtml(item.description || "")}</p>
          ${metaHtml ? `<div class="pro-activity-meta-list">${metaHtml}</div>` : ""}
        </div>
      </article>
    `;
  }

  async function fetchAccountActivity(isManualRefresh = false) {
    if (isFetchingActivity) return;
    const token = getCleanToken();
    if (!token) return;

    const refreshBtn = document.getElementById("pro-btn-refresh-activity");
    const countBadge = document.getElementById("pro-activity-count-badge");
    const container = document.getElementById("pro-activity-container");

    isFetchingActivity = true;
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `<i class="fa-solid fa-rotate fa-spin"></i> Refreshing...`;
    }

    if (!container || container.children.length === 0 || isManualRefresh) {
      renderActivityLoading();
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/professional/activity`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.status === 401 || response.status === 403) {
        renderActivityError("Session expired or unauthorized. Please re-authenticate.");
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data.activities) ? data.activities : [];

      if (countBadge) {
        countBadge.textContent = `${list.length} Recorded`;
      }

      if (list.length === 0) {
        renderActivityEmpty();
      } else {
        if (container) {
          container.innerHTML = list.map(item => renderActivityItem(item)).join("");
        }
      }

      if (isManualRefresh) {
        showToast("Account activity refreshed successfully.", "success");
      }
    } catch (err) {
      console.error("[BuildBid Pro] Account activity fetch error:", err);
      renderActivityError("Unable to connect to the server to load activity history.");
      if (isManualRefresh) {
        showToast("Failed to refresh activity. Please try again.", "error");
      }
    } finally {
      isFetchingActivity = false;
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> Refresh`;
      }
    }
  }

  window.refreshAccountActivity = function () {
    fetchAccountActivity(true);
  };

  function initAccountActivityModule() {
    const refreshBtn = document.getElementById("pro-btn-refresh-activity");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        fetchAccountActivity(true);
      });
    }
  }

  // ============================================================
  // 5F. ACCOUNT DEACTIVATION / DELETION MODULE (Phase 8)
  // ============================================================
  let deactivationStatus = null;
  let isFetchingDeactivationStatus = false;
  let deleteResendCooldownTimer = null;
  let deleteResendCooldownRemaining = 0;
  let deleteExpiryTimer = null;
  let deleteExpiryRemaining = 0;
  let deletionAuthTicket = null;

  async function fetchDeactivationStatus(isManual = false) {
    if (isFetchingDeactivationStatus) return;
    const token = getCleanToken();
    if (!token) return;

    const refreshBtn = document.getElementById("pro-btn-refresh-deact-status");
    isFetchingDeactivationStatus = true;
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `<i class="fa-solid fa-rotate fa-spin"></i> Refreshing...`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/professional/account/status`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.status === 401 || response.status === 403) {
        console.warn("[BuildBid Pro] Account status check unauthorized or session expired.");
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      deactivationStatus = data;

      // 1. Update Status Pills in Section 6 Header
      const statusPill = document.getElementById("pro-deact-status-pill");
      const statusText = document.getElementById("pro-deact-status-text");
      if (statusPill && statusText) {
        if (data.canDeactivate === false) {
          statusPill.className = "pro-status-pill pro-status-pill-deactivated";
          statusPill.innerHTML = `<i class="fa-solid fa-pause"></i> <span>Account Paused</span>`;
        } else {
          statusPill.className = "pro-status-pill pro-status-pill-active";
          statusPill.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Account Active</span>`;
        }
      }

      const emailPill = document.getElementById("pro-deact-email-pill");
      const emailText = document.getElementById("pro-deact-email-text");
      if (emailPill && emailText) {
        if (data.emailVerified) {
          emailPill.className = "pro-status-pill pro-status-pill-active";
          emailPill.innerHTML = `<i class="fa-solid fa-envelope-circle-check"></i> <span>Email Verified</span>`;
        } else {
          emailPill.className = "pro-status-pill pro-status-pill-pending";
          emailPill.innerHTML = `<i class="fa-solid fa-envelope-open-text"></i> <span>Email Unverified</span>`;
        }
      }

      const phonePill = document.getElementById("pro-deact-phone-pill");
      const phoneText = document.getElementById("pro-deact-phone-text");
      if (phonePill && phoneText) {
        if (data.phoneVerified) {
          phonePill.className = "pro-status-pill pro-status-pill-active";
          phonePill.innerHTML = `<i class="fa-solid fa-phone"></i> <span>Mobile Verified</span>`;
        } else {
          phonePill.className = "pro-status-pill pro-status-pill-pending";
          phonePill.innerHTML = `<i class="fa-solid fa-phone-slash"></i> <span>Mobile Unverified</span>`;
        }
      }

      const servicesPill = document.getElementById("pro-deact-services-pill");
      const servicesText = document.getElementById("pro-deact-services-text");
      if (servicesPill && servicesText) {
        const count = data.activeServicesCount || 0;
        servicesPill.innerHTML = `<i class="fa-solid fa-briefcase"></i> <span>${count} Active Service${count === 1 ? "" : "s"}</span>`;
      }

      // 2. Update Modal Step 1 Prerequisites
      const s1EmailVal = document.getElementById("pro-del-s1-email-val");
      const s1EmailBadge = document.getElementById("pro-del-s1-email-badge");
      if (s1EmailVal && s1EmailBadge) {
        s1EmailVal.textContent = data.email || "No email registered";
        if (data.emailVerified) {
          s1EmailBadge.className = "pro-settings-badge pro-settings-badge-verified";
          s1EmailBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verified`;
        } else {
          s1EmailBadge.className = "pro-settings-badge pro-settings-badge-pending";
          s1EmailBadge.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Unverified`;
        }
      }

      const s1PhoneVal = document.getElementById("pro-del-s1-phone-val");
      const s1PhoneBadge = document.getElementById("pro-del-s1-phone-badge");
      if (s1PhoneVal && s1PhoneBadge) {
        s1PhoneVal.textContent = data.phone || "No mobile registered";
        if (data.phoneVerified) {
          s1PhoneBadge.className = "pro-settings-badge pro-settings-badge-verified";
          s1PhoneBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verified`;
        } else {
          s1PhoneBadge.className = "pro-settings-badge pro-settings-badge-pending";
          s1PhoneBadge.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Unverified`;
        }
      }

      const s1Feedback = document.getElementById("pro-del-s1-feedback");
      const btnGotoS2 = document.getElementById("pro-btn-goto-del-s2");
      if (!data.canDelete) {
        if (s1Feedback) {
          s1Feedback.className = "pro-settings-security-feedback error";
          s1Feedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${escapeHtml(data.verificationRequiredMessage || "Both your email address and mobile number must be verified before requesting permanent account deletion.")}</span>`;
          s1Feedback.style.display = "flex";
        }
        if (btnGotoS2) {
          btnGotoS2.disabled = true;
          btnGotoS2.style.opacity = "0.6";
          btnGotoS2.style.cursor = "not-allowed";
        }
      } else {
        if (s1Feedback) {
          s1Feedback.style.display = "none";
          s1Feedback.textContent = "";
        }
        if (btnGotoS2) {
          btnGotoS2.disabled = false;
          btnGotoS2.style.opacity = "1";
          btnGotoS2.style.cursor = "pointer";
        }
      }

      if (isManual) {
        showToast("Account lifecycle status refreshed.", "success");
      }

    } catch (err) {
      console.error("[BuildBid Pro] Account status fetch error:", err);
      const s1Feedback = document.getElementById("pro-del-s1-feedback");
      const btnGotoS2 = document.getElementById("pro-btn-goto-del-s2");
      if (s1Feedback) {
        s1Feedback.className = "pro-settings-security-feedback error";
        s1Feedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Unable to load account verification status. Please check your network connection and try again.</span>`;
        s1Feedback.style.display = "flex";
      }
      if (btnGotoS2) {
        btnGotoS2.disabled = true;
        btnGotoS2.style.opacity = "0.6";
        btnGotoS2.style.cursor = "not-allowed";
      }
      if (isManual) {
        showToast("Failed to refresh account status.", "error");
      }
    } finally {
      isFetchingDeactivationStatus = false;
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> <span>Refresh Status</span>`;
      }
    }
  }

  // --- Deactivation Modal Helpers ---
  function openDeactivateModal() {
    const modal = document.getElementById("modal-pro-deactivate");
    const pwdInput = document.getElementById("pro-deact-password");
    const fb = document.getElementById("pro-deact-feedback");
    if (pwdInput) pwdInput.value = "";
    if (fb) {
      fb.style.display = "none";
      fb.textContent = "";
    }
    if (modal) modal.classList.add("active");
    if (pwdInput) {
      setTimeout(() => pwdInput.focus(), 100);
    }
  }

  function closeDeactivateModal() {
    const modal = document.getElementById("modal-pro-deactivate");
    const pwdInput = document.getElementById("pro-deact-password");
    const fb = document.getElementById("pro-deact-feedback");
    if (pwdInput) pwdInput.value = "";
    if (fb) {
      fb.style.display = "none";
      fb.textContent = "";
    }
    if (modal) modal.classList.remove("active");
  }

  async function handleConfirmDeactivate() {
    const token = getCleanToken();
    if (!token) {
      showToast("Session expired. Please log in again.", "warning");
      executeLogout();
      return;
    }

    const pwdInput = document.getElementById("pro-deact-password");
    const fb = document.getElementById("pro-deact-feedback");
    const confirmBtn = document.getElementById("pro-btn-confirm-deactivate");
    const cancelBtn = document.getElementById("pro-btn-cancel-deactivate");
    const password = pwdInput ? pwdInput.value.trim() : "";

    if (!password) {
      if (fb) {
        fb.className = "pro-settings-security-feedback error";
        fb.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>Please enter your current account password to confirm.</span>`;
        fb.style.display = "flex";
      }
      if (pwdInput) pwdInput.focus();
      return;
    }

    const origBtnHtml = confirmBtn ? confirmBtn.innerHTML : "";
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Pausing Account...</span>`;
    }
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/api/professional/account/deactivate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          currentPassword: password,
          confirmation: "DEACTIVATE"
        })
      });

      const resJson = await response.json().catch(() => ({}));

      if (pwdInput) pwdInput.value = "";

      if (response.ok) {
        if (fb) {
          fb.className = "pro-settings-security-feedback success";
          fb.innerHTML = `
            <i class="fa-solid fa-circle-check" style="font-size: 16px;"></i>
            <div>
              <strong>Account Paused Successfully</strong>
              <div style="font-size: 11.5px; margin-top: 2px;">Your public profile and services are hidden. Redirecting to home...</div>
            </div>
          `;
          fb.style.display = "flex";
        }
        showToast("Account deactivated successfully. Active sessions revoked.", "info");

        // Clear stored tokens and sessions
        setTimeout(() => {
          executeLogout();
        }, 2200);

      } else {
        const errorMsg = resJson.error || resJson.message || "Failed to deactivate account.";
        if (fb) {
          fb.className = "pro-settings-security-feedback error";
          fb.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${escapeHtml(errorMsg)}</span>`;
          fb.style.display = "flex";
        }
        showToast(errorMsg, "error");
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = origBtnHtml;
        }
        if (cancelBtn) cancelBtn.disabled = false;
      }
    } catch (err) {
      console.error("[BuildBid Pro] Deactivate request network error:", err);
      const networkMsg = "Network error. Unable to communicate with authentication server.";
      if (fb) {
        fb.className = "pro-settings-security-feedback error";
        fb.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${networkMsg}</span>`;
        fb.style.display = "flex";
      }
      showToast(networkMsg, "error");
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = origBtnHtml;
      }
      if (cancelBtn) cancelBtn.disabled = false;
    }
  }

  // --- Multi-Step Deletion Flow ---
  function openDeleteModal() {
    fetchDeactivationStatus(false);
    setDeleteModalStep(1);
    deletionAuthTicket = null;
    stopDeletionTimers();

    const wordInput = document.getElementById("pro-del-confirm-word");
    const pwdInput = document.getElementById("pro-del-password");
    if (wordInput) wordInput.value = "";
    if (pwdInput) pwdInput.value = "";

    clearDeleteOtpInputs();

    const modal = document.getElementById("modal-pro-delete");
    if (modal) modal.classList.add("active");
  }

  function closeDeleteModal() {
    stopDeletionTimers();
    deletionAuthTicket = null;

    const wordInput = document.getElementById("pro-del-confirm-word");
    const pwdInput = document.getElementById("pro-del-password");
    if (wordInput) wordInput.value = "";
    if (pwdInput) pwdInput.value = "";

    clearDeleteOtpInputs();

    const modal = document.getElementById("modal-pro-delete");
    if (modal) modal.classList.remove("active");
  }

  function setDeleteModalStep(stepNumber) {
    const hint = document.getElementById("modal-pro-delete-step-hint");
    const hints = [
      "Step 1 of 4: Prerequisites & Notice",
      "Step 2 of 4: Explicit Intent & Password",
      "Step 3 of 4: Dual-Channel OTP Verification",
      "Step 4 of 4: Final Confirmation"
    ];
    if (hint && hints[stepNumber - 1]) {
      hint.textContent = hints[stepNumber - 1];
    }

    for (let i = 1; i <= 4; i++) {
      const bar = document.getElementById(`pro-del-step-bar-${i}`);
      if (bar) {
        if (i <= stepNumber) {
          bar.classList.add("active");
        } else {
          bar.classList.remove("active");
        }
      }

      const screen = document.getElementById(`pro-del-screen-${i}`);
      if (screen) {
        screen.style.display = (i === stepNumber) ? "block" : "none";
      }
    }

    if (stepNumber === 2) {
      const wordInput = document.getElementById("pro-del-confirm-word");
      if (wordInput) setTimeout(() => wordInput.focus(), 80);
    } else if (stepNumber === 3) {
      const firstDigit = document.querySelector("#pro-del-otp-digits-container .pro-otp-digit-input");
      if (firstDigit) setTimeout(() => firstDigit.focus(), 80);
    }
  }

  function clearDeleteOtpInputs() {
    const container = document.getElementById("pro-del-otp-digits-container");
    if (!container) return;
    const inputs = container.querySelectorAll(".pro-otp-digit-input");
    inputs.forEach(inp => {
      inp.value = "";
      inp.classList.remove("has-value");
    });
  }

  function getEnteredDeleteOtp() {
    const container = document.getElementById("pro-del-otp-digits-container");
    if (!container) return "";
    const inputs = container.querySelectorAll(".pro-otp-digit-input");
    return Array.from(inputs).map(i => i.value.trim()).join("");
  }

  function stopDeletionTimers() {
    if (deleteResendCooldownTimer) {
      clearInterval(deleteResendCooldownTimer);
      deleteResendCooldownTimer = null;
    }
    deleteResendCooldownRemaining = 0;

    if (deleteExpiryTimer) {
      clearInterval(deleteExpiryTimer);
      deleteExpiryTimer = null;
    }
    deleteExpiryRemaining = 0;

    const resendBtn = document.getElementById("pro-btn-resend-del-otp");
    const resendCountdown = document.getElementById("pro-del-resend-countdown");
    if (resendBtn && resendCountdown) {
      resendBtn.disabled = false;
      resendCountdown.textContent = "Resend Code";
    }
  }

  function startDeletionResendTimer(seconds = 60) {
    if (deleteResendCooldownTimer) clearInterval(deleteResendCooldownTimer);
    deleteResendCooldownRemaining = seconds;

    const resendBtn = document.getElementById("pro-btn-resend-del-otp");
    const resendCountdown = document.getElementById("pro-del-resend-countdown");
    if (!resendBtn || !resendCountdown) return;

    resendBtn.disabled = true;
    resendCountdown.textContent = `Resend (${deleteResendCooldownRemaining}s)`;

    deleteResendCooldownTimer = setInterval(() => {
      deleteResendCooldownRemaining--;
      if (deleteResendCooldownRemaining <= 0) {
        clearInterval(deleteResendCooldownTimer);
        deleteResendCooldownTimer = null;
        resendBtn.disabled = false;
        resendCountdown.textContent = "Resend Code";
      } else {
        resendCountdown.textContent = `Resend (${deleteResendCooldownRemaining}s)`;
      }
    }, 1000);
  }

  function startDeletionExpiryTimer(seconds = 600) {
    if (deleteExpiryTimer) clearInterval(deleteExpiryTimer);
    deleteExpiryRemaining = seconds;

    const expiryCount = document.getElementById("pro-del-expiry-count");
    if (!expiryCount) return;

    function renderTime(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    expiryCount.textContent = renderTime(deleteExpiryRemaining);

    deleteExpiryTimer = setInterval(() => {
      deleteExpiryRemaining--;
      if (deleteExpiryRemaining <= 0) {
        clearInterval(deleteExpiryTimer);
        deleteExpiryTimer = null;
        expiryCount.textContent = "00:00 (Expired)";
        const s3Feedback = document.getElementById("pro-del-s3-feedback");
        if (s3Feedback) {
          s3Feedback.className = "pro-otp-feedback-box error";
          s3Feedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Verification code expired. Please request a new code via Resend.</span>`;
          s3Feedback.style.display = "flex";
        }
      } else {
        expiryCount.textContent = renderTime(deleteExpiryRemaining);
      }
    }, 1000);
  }

  async function handleSendDeletionOtp() {
    const token = getCleanToken();
    if (!token) {
      showToast("Session expired. Please log in again.", "warning");
      executeLogout();
      return;
    }

    const wordInput = document.getElementById("pro-del-confirm-word");
    const pwdInput = document.getElementById("pro-del-password");
    const fbBox = document.getElementById("pro-del-s2-feedback");
    const btn = document.getElementById("pro-btn-send-del-otp");

    const word = wordInput ? wordInput.value.trim() : "";
    const password = pwdInput ? pwdInput.value.trim() : "";

    if (fbBox) {
      fbBox.style.display = "none";
      fbBox.textContent = "";
    }

    if (word !== "DELETE") {
      if (fbBox) {
        fbBox.className = "pro-settings-security-feedback error";
        fbBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>Please type exact uppercase "DELETE" to confirm intent.</span>`;
        fbBox.style.display = "flex";
      }
      if (wordInput) wordInput.focus();
      return;
    }

    if (!password) {
      if (fbBox) {
        fbBox.className = "pro-settings-security-feedback error";
        fbBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>Please enter your current account password.</span>`;
        fbBox.style.display = "flex";
      }
      if (pwdInput) pwdInput.focus();
      return;
    }

    const origBtnHtml = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Dispatching OTPs...</span>`;
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/api/professional/account/delete/start`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          currentPassword: password,
          confirmation: word
        })
      });

      const resJson = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const errorMsg = resJson.error || resJson.message || "Failed to initiate deletion verification.";
        if (fbBox) {
          fbBox.className = "pro-settings-security-feedback error";
          fbBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${escapeHtml(errorMsg)}</span>`;
          fbBox.style.display = "flex";
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origBtnHtml;
        }
        return;
      }

      // Success: advance to Screen 3
      if (resJson.maskedEmail) {
        const emailEl = document.getElementById("pro-del-masked-email");
        if (emailEl) emailEl.textContent = resJson.maskedEmail;
      }
      if (resJson.maskedPhone) {
        const phoneEl = document.getElementById("pro-del-masked-phone");
        if (phoneEl) phoneEl.textContent = resJson.maskedPhone;
      }

      setDeleteModalStep(3);
      clearDeleteOtpInputs();

      const s3Fb = document.getElementById("pro-del-s3-feedback");
      if (s3Fb) {
        s3Fb.className = "pro-otp-feedback-box success";
        s3Fb.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${escapeHtml(resJson.message || "Verification code dispatched to both channels.")}</span>`;
        s3Fb.style.display = "flex";
      }

      startDeletionResendTimer(resJson.resendCooldownSeconds || 60);
      startDeletionExpiryTimer(resJson.expiresInSeconds || 600);

      showToast("Verification code dispatched to verified email and mobile.", "success");

    } catch (err) {
      console.error("[BuildBid Pro] Deletion OTP dispatch network error:", err);
      const networkMsg = "Network error while requesting deletion OTP. Please try again.";
      if (fbBox) {
        fbBox.className = "pro-settings-security-feedback error";
        fbBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${networkMsg}</span>`;
        fbBox.style.display = "flex";
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origBtnHtml;
      }
    }
  }

  async function handleResendDeletionOtp() {
    const token = getCleanToken();
    if (!token) return;

    if (deleteResendCooldownRemaining > 0) return;

    const resendBtn = document.getElementById("pro-btn-resend-del-otp");
    const fbBox = document.getElementById("pro-del-s3-feedback");
    const verifyBtn = document.getElementById("pro-btn-verify-del-otp");

    if (resendBtn) {
      resendBtn.disabled = true;
      resendBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Resending...</span>`;
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/api/professional/account/delete/resend-otp`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      const resJson = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const errorMsg = resJson.error || resJson.message || "Failed to resend OTP.";
        if (fbBox) {
          fbBox.className = "pro-otp-feedback-box error";
          fbBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${escapeHtml(errorMsg)}</span>`;
          fbBox.style.display = "flex";
        }
        if (resendBtn) {
          resendBtn.disabled = false;
          resendBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> <span>Resend Code</span>`;
        }
        return;
      }

      clearDeleteOtpInputs();
      startDeletionResendTimer(resJson.resendCooldownSeconds || 60);
      startDeletionExpiryTimer(resJson.expiresInSeconds || 600);

      if (verifyBtn) verifyBtn.disabled = false;

      if (fbBox) {
        fbBox.className = "pro-otp-feedback-box success";
        fbBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${escapeHtml(resJson.message || "A new 6-digit OTP has been dispatched to both channels.")}</span>`;
        fbBox.style.display = "flex";
      }

      showToast("New deletion verification code sent.", "success");

      const firstDigit = document.querySelector("#pro-del-otp-digits-container .pro-otp-digit-input");
      if (firstDigit) firstDigit.focus();

    } catch (err) {
      console.error("[BuildBid Pro] Resend deletion OTP error:", err);
      if (fbBox) {
        fbBox.className = "pro-otp-feedback-box error";
        fbBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Network error while resending OTP.</span>`;
        fbBox.style.display = "flex";
      }
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> <span>Resend Code</span>`;
      }
    }
  }

  async function handleVerifyDeletionOtp() {
    const token = getCleanToken();
    if (!token) return;

    const otpCode = getEnteredDeleteOtp();
    const fbBox = document.getElementById("pro-del-s3-feedback");
    const btn = document.getElementById("pro-btn-verify-del-otp");

    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      if (fbBox) {
        fbBox.className = "pro-otp-feedback-box error";
        fbBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>Please enter the complete 6-digit verification code.</span>`;
        fbBox.style.display = "flex";
      }
      const firstEmpty = Array.from(document.querySelectorAll("#pro-del-otp-digits-container .pro-otp-digit-input")).find(i => !i.value.trim());
      if (firstEmpty) firstEmpty.focus();
      return;
    }

    const origBtnHtml = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Verifying Code...</span>`;
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/api/professional/account/delete/verify-otp`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ otp: otpCode })
      });

      const resJson = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const errorMsg = resJson.error || resJson.message || "Invalid or expired verification code.";
        if (fbBox) {
          fbBox.className = "pro-otp-feedback-box error";
          fbBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${escapeHtml(errorMsg)}</span>`;
          fbBox.style.display = "flex";
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origBtnHtml;
        }
        return;
      }

      const ticket = resJson.deletionTicket;
      if (!ticket) {
        if (fbBox) {
          fbBox.className = "pro-otp-feedback-box error";
          fbBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>Deletion ticket was not returned by server.</span>`;
          fbBox.style.display = "flex";
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origBtnHtml;
        }
        return;
      }

      deletionAuthTicket = ticket;
      stopDeletionTimers();

      setDeleteModalStep(4);

      const s4Feedback = document.getElementById("pro-del-s4-feedback");
      if (s4Feedback) {
        s4Feedback.className = "pro-settings-security-feedback success";
        s4Feedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${escapeHtml(resJson.message || "Dual-channel verification complete. Click below to permanently close your account.")}</span>`;
        s4Feedback.style.display = "flex";
      }

    } catch (err) {
      console.error("[BuildBid Pro] Verify deletion OTP network error:", err);
      if (fbBox) {
        fbBox.className = "pro-otp-feedback-box error";
        fbBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Network error during OTP verification.</span>`;
        fbBox.style.display = "flex";
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origBtnHtml;
      }
    }
  }

  async function handleFinalizePermanentDeletion() {
    const token = getCleanToken();
    if (!token) return;

    if (!deletionAuthTicket) {
      showToast("Security Check Failed: Missing deletion ticket.", "error");
      setDeleteModalStep(1);
      return;
    }

    const fbBox = document.getElementById("pro-del-s4-feedback");
    const finalizeBtn = document.getElementById("pro-btn-finalize-del");
    const cancelBtn = document.getElementById("pro-btn-cancel-del-final");

    if (finalizeBtn) {
      finalizeBtn.disabled = true;
      finalizeBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Permanently Deleting Account...</span>`;
    }
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      const resp = await fetch(`${API_BASE_URL}/api/professional/account/delete/confirm`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          deletionTicket: deletionAuthTicket,
          confirmation: "DELETE"
        })
      });

      const resJson = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const errorMsg = resJson.error || resJson.message || "Failed to finalize account deletion.";
        if (fbBox) {
          fbBox.className = "pro-settings-security-feedback error";
          fbBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${escapeHtml(errorMsg)}</span>`;
          fbBox.style.display = "flex";
        }
        showToast(errorMsg, "error");
        if (finalizeBtn) {
          finalizeBtn.disabled = false;
          finalizeBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> <span>Permanently Delete My Account Now</span>`;
        }
        if (cancelBtn) cancelBtn.disabled = false;
        return;
      }

      // Deletion Succeeded
      if (fbBox) {
        fbBox.className = "pro-settings-security-feedback success";
        fbBox.innerHTML = `
          <i class="fa-solid fa-circle-check" style="font-size: 18px;"></i>
          <div>
            <strong>Account Permanently Deleted</strong>
            <div style="font-size: 11.5px; margin-top: 3px;">All personal data and credentials have been erased. Signing you out...</div>
          </div>
        `;
        fbBox.style.display = "flex";
      }

      showToast("Professional account deleted successfully.", "info");

      // Invalidate client tokens and redirect to index.html
      localStorage.removeItem("token");
      localStorage.removeItem("marketplaceToken");
      localStorage.removeItem("authToken");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("marketplaceUser");
      localStorage.removeItem("customerUser");
      localStorage.removeItem("buildbid_user");
      localStorage.removeItem("buildbid_current_user");
      sessionStorage.clear();

      setTimeout(() => {
        window.location.replace("index.html");
      }, 2500);

    } catch (err) {
      console.error("[BuildBid Pro] Finalize deletion network error:", err);
      const networkMsg = "Network error during deletion confirmation. Please try again.";
      if (fbBox) {
        fbBox.className = "pro-settings-security-feedback error";
        fbBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${networkMsg}</span>`;
        fbBox.style.display = "flex";
      }
      showToast(networkMsg, "error");
      if (finalizeBtn) {
        finalizeBtn.disabled = false;
        finalizeBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> <span>Permanently Delete My Account Now</span>`;
      }
      if (cancelBtn) cancelBtn.disabled = false;
    }
  }

  function initDeactivationDeletionModule() {
    // 1. Refresh Status Button
    const refreshBtn = document.getElementById("pro-btn-refresh-deact-status");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => fetchDeactivationStatus(true));
    }

    // 2. Deactivation Modal Triggers & Password Toggle
    const openDeactBtn = document.getElementById("pro-btn-open-deactivate-modal");
    if (openDeactBtn) {
      openDeactBtn.addEventListener("click", openDeactivateModal);
    }

    const cancelDeactBtn = document.getElementById("pro-btn-cancel-deactivate");
    if (cancelDeactBtn) {
      cancelDeactBtn.addEventListener("click", closeDeactivateModal);
    }

    const confirmDeactBtn = document.getElementById("pro-btn-confirm-deactivate");
    if (confirmDeactBtn) {
      confirmDeactBtn.addEventListener("click", handleConfirmDeactivate);
    }

    const deactPwdToggle = document.getElementById("pro-deact-pwd-toggle");
    const deactPwdInput = document.getElementById("pro-deact-password");
    if (deactPwdToggle && deactPwdInput) {
      deactPwdToggle.addEventListener("click", () => {
        const isPwd = deactPwdInput.type === "password";
        deactPwdInput.type = isPwd ? "text" : "password";
        deactPwdToggle.setAttribute("title", isPwd ? "Hide password" : "Show password");
        const icon = deactPwdToggle.querySelector("i");
        if (icon) icon.className = isPwd ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
      });
    }

    // 3. Permanent Deletion Modal Triggers & Close
    const openDelBtn = document.getElementById("pro-btn-open-delete-modal");
    if (openDelBtn) {
      openDelBtn.addEventListener("click", openDeleteModal);
    }

    const closeDelModalBtn = document.getElementById("pro-btn-delete-modal-close");
    if (closeDelModalBtn) {
      closeDelModalBtn.addEventListener("click", closeDeleteModal);
    }

    // Screen 1: Proceed to Screen 2 or Cancel
    const cancelDelS1Btn = document.getElementById("pro-btn-cancel-del-s1");
    if (cancelDelS1Btn) {
      cancelDelS1Btn.addEventListener("click", closeDeleteModal);
    }

    const gotoDelS2Btn = document.getElementById("pro-btn-goto-del-s2");
    if (gotoDelS2Btn) {
      gotoDelS2Btn.addEventListener("click", () => {
        if (!deactivationStatus || !deactivationStatus.canDelete) {
          const s1Fb = document.getElementById("pro-del-s1-feedback");
          if (s1Fb) {
            s1Fb.className = "pro-settings-security-feedback error";
            s1Fb.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${escapeHtml((deactivationStatus && deactivationStatus.verificationRequiredMessage) || "Both email and mobile must be verified before deletion.")}</span>`;
            s1Fb.style.display = "flex";
          }
          return;
        }
        setDeleteModalStep(2);
      });
    }

    // Screen 2: Back to S1, Password Toggle, Send Deletion Code
    const backToS1Btn = document.getElementById("pro-btn-back-to-del-s1");
    if (backToS1Btn) {
      backToS1Btn.addEventListener("click", () => setDeleteModalStep(1));
    }

    const delPwdToggle = document.getElementById("pro-del-pwd-toggle");
    const delPwdInput = document.getElementById("pro-del-password");
    if (delPwdToggle && delPwdInput) {
      delPwdToggle.addEventListener("click", () => {
        const isPwd = delPwdInput.type === "password";
        delPwdInput.type = isPwd ? "text" : "password";
        delPwdToggle.setAttribute("title", isPwd ? "Hide password" : "Show password");
        const icon = delPwdToggle.querySelector("i");
        if (icon) icon.className = isPwd ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
      });
    }

    const sendDelOtpBtn = document.getElementById("pro-btn-send-del-otp");
    if (sendDelOtpBtn) {
      sendDelOtpBtn.addEventListener("click", handleSendDeletionOtp);
    }

    // Screen 3: Back to S2, Resend OTP, Verify OTP, Digit Inputs Wiring
    const backToS2Btn = document.getElementById("pro-btn-back-to-del-s2");
    if (backToS2Btn) {
      backToS2Btn.addEventListener("click", () => {
        stopDeletionTimers();
        setDeleteModalStep(2);
      });
    }

    const resendDelOtpBtn = document.getElementById("pro-btn-resend-del-otp");
    if (resendDelOtpBtn) {
      resendDelOtpBtn.addEventListener("click", handleResendDeletionOtp);
    }

    const verifyDelOtpBtn = document.getElementById("pro-btn-verify-del-otp");
    if (verifyDelOtpBtn) {
      verifyDelOtpBtn.addEventListener("click", handleVerifyDeletionOtp);
    }

    // Screen 3 OTP Digits Interactive Wiring
    const delOtpContainer = document.getElementById("pro-del-otp-digits-container");
    if (delOtpContainer) {
      const inputs = Array.from(delOtpContainer.querySelectorAll(".pro-otp-digit-input"));

      inputs.forEach((input, index) => {
        input.addEventListener("input", () => {
          const val = input.value.replace(/\D/g, "");
          input.value = val ? val[val.length - 1] : "";
          if (input.value) {
            input.classList.add("has-value");
            if (index < inputs.length - 1) {
              inputs[index + 1].focus();
            } else {
              const fullOtp = inputs.map(i => i.value).join("");
              if (fullOtp.length === 6) {
                handleVerifyDeletionOtp();
              }
            }
          } else {
            input.classList.remove("has-value");
          }
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Backspace") {
            if (!input.value && index > 0) {
              inputs[index - 1].focus();
              inputs[index - 1].value = "";
              inputs[index - 1].classList.remove("has-value");
            } else {
              input.value = "";
              input.classList.remove("has-value");
            }
          } else if (e.key === "ArrowLeft" && index > 0) {
            inputs[index - 1].focus();
          } else if (e.key === "ArrowRight" && index < inputs.length - 1) {
            inputs[index + 1].focus();
          } else if (e.key === "Enter") {
            e.preventDefault();
            handleVerifyDeletionOtp();
          }
        });

        input.addEventListener("paste", (e) => {
          e.preventDefault();
          const pastedData = (e.clipboardData || window.clipboardData).getData("text").trim();
          const digits = pastedData.replace(/\D/g, "");
          if (!digits) return;

          inputs.forEach((inp, idx) => {
            if (digits[idx]) {
              inp.value = digits[idx];
              inp.classList.add("has-value");
            }
          });

          const focusIdx = Math.min(digits.length, inputs.length - 1);
          inputs[focusIdx].focus();

          if (digits.length >= 6) {
            handleVerifyDeletionOtp();
          }
        });
      });
    }

    // Screen 4: Finalize or Cancel
    const cancelDelFinalBtn = document.getElementById("pro-btn-cancel-del-final");
    if (cancelDelFinalBtn) {
      cancelDelFinalBtn.addEventListener("click", closeDeleteModal);
    }

    const finalizeDelBtn = document.getElementById("pro-btn-finalize-del");
    if (finalizeDelBtn) {
      finalizeDelBtn.addEventListener("click", handleFinalizePermanentDeletion);
    }
  }

  // ============================================================
  // 6. SECTION NAVIGATION & TAB SWITCHING
  // ============================================================
  const ALL_SECTIONS = [
    "personal-info",
    "verification",
    "credentials",
    "security-login",
    "account-activity",
    "deactivation-deletion"
  ];

  function switchSection(sectionId, updateHash = true) {
    if (!ALL_SECTIONS.includes(sectionId)) {
      sectionId = "personal-info";
    }

    // Update Nav Buttons
    const buttons = document.querySelectorAll(".pro-settings-nav-btn");
    buttons.forEach(btn => {
      const match = btn.getAttribute("data-section") === sectionId;
      if (match) {
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        btn.focus();
      } else {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
      }
    });

    // Update Panels
    const panels = document.querySelectorAll(".pro-settings-panel");
    panels.forEach(panel => {
      if (panel.id === `sec-${sectionId}`) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });

    if (updateHash) {
      if (window.location.hash !== `#${sectionId}`) {
        window.location.hash = `#${sectionId}`;
      }
    }

    // Lazy load activity data when switching to account-activity tab
    if (sectionId === "account-activity") {
      fetchAccountActivity();
    }
    if (sectionId === "deactivation-deletion") {
      fetchDeactivationStatus();
    }

    // Scroll to top of main viewport on small screens
    if (window.innerWidth < 1024) {
      const mainEl = document.getElementById("pro-settings-main");
      if (mainEl) {
        mainEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function setupNavigationEvents() {
    // Click events on nav buttons
    const navButtons = document.querySelectorAll(".pro-settings-nav-btn");
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const sec = btn.getAttribute("data-section");
        if (sec) switchSection(sec, true);
      });
    });

    // Hash change event listener
    window.addEventListener("hashchange", () => {
      const hash = (window.location.hash || "").replace("#", "").trim();
      if (hash && ALL_SECTIONS.includes(hash)) {
        switchSection(hash, false);
      }
    });

    // Keyboard navigation (Arrow keys up/down)
    const tablist = document.querySelector(".pro-settings-sidebar");
    if (tablist) {
      tablist.addEventListener("keydown", (e) => {
        const activeBtn = document.activeElement;
        if (!activeBtn || !activeBtn.classList.contains("pro-settings-nav-btn")) return;

        const btnArray = Array.from(document.querySelectorAll(".pro-settings-nav-btn"));
        const currentIndex = btnArray.indexOf(activeBtn);
        if (currentIndex === -1) return;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % btnArray.length;
          btnArray[nextIndex].focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + btnArray.length) % btnArray.length;
          btnArray[prevIndex].focus();
        } else if (e.key === "Home") {
          e.preventDefault();
          btnArray[0].focus();
        } else if (e.key === "End") {
          e.preventDefault();
          btnArray[btnArray.length - 1].focus();
        }
      });
    }

    // Mobile menu toggle button
    const mobileBtn = document.getElementById("pro-settings-mobile-toggle");
    const sidebar = document.getElementById("pro-settings-sidebar");
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener("click", () => {
        if (sidebar.style.display === "block") {
          sidebar.style.display = "";
        } else {
          sidebar.style.display = "block";
        }
      });
    }
  }

  // ============================================================
  // 7. INITIALIZATION
  // ============================================================
  function initSettingsPage() {
    // 1. Guard check
    if (!enforceProfessionalAuthGuard()) return;

    // 2. Setup navigation
    setupNavigationEvents();

    // 2A. Setup Personal Information module
    initPersonalInformationModule();

    // 2B. Setup Profile Photo module
    initProfilePhotoModule();

    // 2C. Setup Email Change module
    initEmailChangeModule();

    // 2D. Setup Security & Login module (Phase 6)
    initSecurityLoginModule();

    // 2E. Setup Account Activity & History module (Phase 7)
    initAccountActivityModule();

    // 2F. Setup Account Deactivation / Deletion module (Phase 8)
    initDeactivationDeletionModule();

    // 3. Initial route determination
    const initialHash = (window.location.hash || "").replace("#", "").trim();
    if (initialHash && ALL_SECTIONS.includes(initialHash)) {
      switchSection(initialHash, false);
    } else {
      switchSection("personal-info", false);
    }

    // 4. Fetch authenticated profile data & verification status & security status & activity & deactivation status
    fetchProfessionalProfile().then(() => {
      fetchVerificationStatus();
      fetchSecurityStatus();
      fetchAccountActivity();
      fetchDeactivationStatus();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettingsPage);
  } else {
    initSettingsPage();
  }

})();
