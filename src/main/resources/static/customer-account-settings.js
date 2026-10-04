/**
 * BuildBid - Customer Account Settings Controller
 * File: customer-account-settings.js
 * Step 1: Personal Information Only
 */

(function () {
  "use strict";

  // ============================================================
  // 1. CONFIGURATION & STATE
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
  let toastTimer = null;
  let currentProfile = null;
  let pendingPhotoData = null;
  let isPhotoRemoved = false;
  let savedLocationsList = [];
  let deleteLocationTargetId = null;

  // ============================================================
  // 2. TOKEN & UTILITY HELPERS
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

  function calculateInitials(name) {
    if (!name || typeof name !== "string") return "BB";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "BB";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // ============================================================
  // 3. TOAST NOTIFICATION UTILITY
  // ============================================================
  function showToast(title, message, type = "success") {
    const toast = document.getElementById("custom-toast");
    const titleEl = document.getElementById("toast-title");
    const msgEl = document.getElementById("toast-message");
    const iconEl = document.getElementById("custom-toast-icon");

    if (!toast || !titleEl || !msgEl) return;

    if (toastTimer) clearTimeout(toastTimer);

    titleEl.textContent = title;
    msgEl.textContent = message;

    // Reset modifier classes
    toast.classList.remove("toast-error", "toast-success", "toast-info");

    if (type === "error") {
      toast.classList.add("toast-error");
      if (iconEl) {
        iconEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size: 16px;"></i>`;
      }
    } else if (type === "info") {
      toast.classList.add("toast-info");
      if (iconEl) {
        iconEl.innerHTML = `<i class="fa-solid fa-circle-info" style="font-size: 16px;"></i>`;
      }
    } else {
      toast.classList.add("toast-success");
      if (iconEl) {
        iconEl.innerHTML = `<i class="fa-solid fa-check" style="font-size: 16px;"></i>`;
      }
    }

    toast.classList.add("show");

    toastTimer = setTimeout(() => {
      hideToast();
    }, 4000);
  }

  function hideToast() {
    const toast = document.getElementById("custom-toast");
    if (toast) {
      toast.classList.remove("show");
    }
  }

  // ============================================================
  // 4. ROLE & AUTHENTICATION GUARD
  // ============================================================
  function enforceCustomerRoleGuard() {
    const token = getCleanToken();
    if (!token) {
      window.location.href = "index.html";
      return false;
    }

    const rawUser = localStorage.getItem("currentUser") || localStorage.getItem("customerUser");
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        const role = (parsed.role || (parsed.roles && parsed.roles[0]) || "").toString().replace("ROLE_", "").toUpperCase();
        if (role && role !== "CUSTOMER") {
          if (role === "CONTRACTOR") {
            window.location.href = "contractor-dashboard.html";
          } else if (role === "MATERIAL_SELLER" || role === "SELLER") {
            window.location.href = "seller index.html";
          } else {
            window.location.href = "index.html";
          }
          return false;
        }
      } catch (e) {
        console.warn("Role check parse warning:", e);
      }
    }
    return true;
  }

  // ============================================================
  // 5. LOAD PROFILE DATA FROM BACKEND
  // ============================================================
  async function fetchCustomerProfile() {
    const token = getCleanToken();
    if (!token) {
      window.location.href = "index.html";
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/profile`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.status === 401) {
        showToast("Session Expired", "Please login again to continue.", "error");
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
        return;
      }

      if (response.status === 403) {
        showToast("Access Denied", "Customer role required to view account settings.", "error");
        setTimeout(() => { window.location.href = "index.html"; }, 2000);
        return;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        showToast("Load Failed", errJson.error || "Could not retrieve customer profile.", "error");
        return;
      }

      const profile = await response.json();
      currentProfile = profile;
      populateProfileForm(profile);

    } catch (err) {
      console.error("Profile load network error:", err);
      showToast("Connection Error", "Unable to communicate with the BuildBid server.", "error");
    }
  }

  // ============================================================
  // 6. POPULATE FORM FIELDS
  // ============================================================
  function populateProfileForm(profile) {
    if (!profile) return;

    const fullNameInput = document.getElementById("fullNameInput");
    const usernameInput = document.getElementById("usernameInput");
    const emailInput = document.getElementById("emailInput");
    const phoneInput = document.getElementById("phoneInput");
    const aboutMeInput = document.getElementById("aboutMeInput");
    const addressInput = document.getElementById("addressInput");
    const cityInput = document.getElementById("cityInput");
    const stateInput = document.getElementById("stateInput");
    const pincodeInput = document.getElementById("pincodeInput");

    if (fullNameInput) fullNameInput.value = profile.fullName || "";
    if (usernameInput) usernameInput.value = profile.username || "";
    if (emailInput) emailInput.value = profile.email || "";
    if (phoneInput) phoneInput.value = profile.phone || "";
    if (aboutMeInput) aboutMeInput.value = profile.aboutMe || "";
    if (addressInput) addressInput.value = profile.address || "";
    if (cityInput) cityInput.value = profile.city || "";
    if (stateInput) stateInput.value = profile.state || "";
    if (pincodeInput) pincodeInput.value = profile.pincode || "";

    // Clear any pending changes
    pendingPhotoData = null;
    isPhotoRemoved = false;
    updatePhotoStatusText("");

    // Render photo
    renderPhotoDisplay(profile.profilePhoto, profile.fullName || profile.username || "Customer");

    // Render verification state
    updateVerificationBadges(profile);
  }

  // ============================================================
  // 7. PHOTO DISPLAY & ACTIONS
  // ============================================================
  function renderPhotoDisplay(photoUrl, name) {
    const previewImg = document.getElementById("settingsAvatarPreview");
    const initialsBadge = document.getElementById("settingsInitialsBadge");
    const removeBtn = document.getElementById("removePhotoBtn");

    if (photoUrl && photoUrl.trim() !== "") {
      if (previewImg) {
        previewImg.src = photoUrl;
        previewImg.classList.remove("hidden");
      }
      if (initialsBadge) {
        initialsBadge.classList.add("hidden");
      }
      if (removeBtn) {
        removeBtn.classList.remove("hidden");
      }
    } else {
      if (previewImg) {
        previewImg.src = "";
        previewImg.classList.add("hidden");
      }
      if (initialsBadge) {
        initialsBadge.textContent = calculateInitials(name);
        initialsBadge.classList.remove("hidden");
      }
      if (removeBtn) {
        removeBtn.classList.add("hidden");
      }
    }
  }

  function updatePhotoStatusText(text) {
    const indicator = document.getElementById("photoStatusText");
    if (!indicator) return;
    if (text) {
      indicator.textContent = text;
      indicator.classList.add("show");
    } else {
      indicator.textContent = "";
      indicator.classList.remove("show");
    }
  }

  function handlePhotoSelection(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    // MIME type check
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type.toLowerCase())) {
      showToast("Invalid File Type", "Please choose a JPG, JPEG, PNG, or WEBP image.", "error");
      event.target.value = "";
      return;
    }

    // Size limit: 5MB
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast("File Too Large", "Image size must not exceed 5MB.", "error");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      pendingPhotoData = e.target.result;
      isPhotoRemoved = false;

      const previewImg = document.getElementById("settingsAvatarPreview");
      const initialsBadge = document.getElementById("settingsInitialsBadge");
      const removeBtn = document.getElementById("removePhotoBtn");

      if (previewImg) {
        previewImg.src = pendingPhotoData;
        previewImg.classList.remove("hidden");
      }
      if (initialsBadge) {
        initialsBadge.classList.add("hidden");
      }
      if (removeBtn) {
        removeBtn.classList.remove("hidden");
      }

      updatePhotoStatusText("New photo selected. Click 'Save Changes' to upload.");
      showToast("Photo Selected", "New profile photo preview ready. Click Save Changes to commit.");
    };

    reader.readAsDataURL(file);
  }

  function handlePhotoRemoval() {
    pendingPhotoData = null;
    isPhotoRemoved = true;

    const fileInput = document.getElementById("profilePhotoFileInput");
    if (fileInput) fileInput.value = "";

    const nameInput = document.getElementById("fullNameInput");
    const name = nameInput ? nameInput.value : "Customer";

    renderPhotoDisplay(null, name);
    updatePhotoStatusText("Photo marked for removal. Click 'Save Changes' to commit.");
    showToast("Photo Removed", "Photo will be permanently removed when you save changes.", "info");
  }

  // ============================================================
  // 8. FORM SUBMISSION & SAVE HANDLER
  // ============================================================
  async function handleProfileSubmit(event) {
    event.preventDefault();

    const token = getCleanToken();
    if (!token) {
      window.location.href = "index.html";
      return;
    }

    const fullNameInput = document.getElementById("fullNameInput");
    const phoneInput = document.getElementById("phoneInput");
    const aboutMeInput = document.getElementById("aboutMeInput");
    const addressInput = document.getElementById("addressInput");
    const cityInput = document.getElementById("cityInput");
    const stateInput = document.getElementById("stateInput");
    const pincodeInput = document.getElementById("pincodeInput");
    const saveBtn = document.getElementById("saveProfileBtn");
    const fullNameError = document.getElementById("fullNameError");

    if (fullNameError) fullNameError.textContent = "";

    const fullName = fullNameInput ? fullNameInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const aboutMe = aboutMeInput ? aboutMeInput.value.trim() : "";
    const address = addressInput ? addressInput.value.trim() : "";
    const city = cityInput ? cityInput.value.trim() : "";
    const state = stateInput ? stateInput.value.trim() : "";
    const pincode = pincodeInput ? pincodeInput.value.trim() : "";

    // Validation: Full Name is mandatory
    if (!fullName) {
      if (fullNameError) fullNameError.textContent = "Full name is required.";
      showToast("Validation Error", "Full name is required.", "error");
      if (fullNameInput) fullNameInput.focus();
      return;
    }

    const originalBtnHtml = saveBtn ? saveBtn.innerHTML : "Save Changes";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    }

    try {
      // Step A: Handle photo removal if marked
      if (isPhotoRemoved) {
        const photoDelResponse = await fetch(`${API_BASE_URL}/api/customer/profile/photo`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!photoDelResponse.ok) {
          console.warn("Photo removal request returned non-OK status:", photoDelResponse.status);
        }
      }

      // Step B: Handle photo upload if new photo selected
      if (pendingPhotoData) {
        const photoUploadResponse = await fetch(`${API_BASE_URL}/api/customer/profile/photo`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ photo: pendingPhotoData })
        });
        if (!photoUploadResponse.ok) {
          const photoErr = await photoUploadResponse.json().catch(() => ({}));
          showToast("Photo Upload Error", photoErr.error || "Failed to upload photo.", "error");
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHtml;
          }
          return;
        }
      }

      // Step C: Update profile fields
      const updatePayload = {
        fullName: fullName,
        phone: phone,
        address: address,
        city: city,
        state: state,
        pincode: pincode,
        aboutMe: aboutMe
      };

      const response = await fetch(`${API_BASE_URL}/api/customer/profile`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        showToast("Update Failed", errJson.error || "Failed to save profile changes.", "error");
        return;
      }

      const updatedProfile = await response.json();
      currentProfile = updatedProfile;

      // Reset pending photo states
      pendingPhotoData = null;
      isPhotoRemoved = false;
      updatePhotoStatusText("");

      // Step D: Synchronize localStorage cached user object so Customer Dashboard updates live
      const rawUser = localStorage.getItem("currentUser") || localStorage.getItem("customerUser");
      let localUser = {};
      if (rawUser) {
        try { localUser = JSON.parse(rawUser); } catch (e) {}
      }

      localUser.name = updatedProfile.fullName || fullName;
      localUser.fullName = updatedProfile.fullName || fullName;
      localUser.phone = updatedProfile.phone || phone;
      localUser.location = updatedProfile.city || city || localUser.location;
      localUser.city = updatedProfile.city || city || localUser.city;

      if (updatedProfile.profilePhoto) {
        localUser.avatarUrl = updatedProfile.profilePhoto;
        localUser.profilePhotoUrl = updatedProfile.profilePhoto;
      } else {
        delete localUser.avatarUrl;
        delete localUser.profilePhotoUrl;
      }

      localStorage.setItem("currentUser", JSON.stringify(localUser));
      localStorage.setItem("customerUser", JSON.stringify(localUser));

      // Synchronize top navbar pill avatar and name immediately
      const navUserName = document.getElementById("navUserName");
      const navAvatar = document.getElementById("navAvatar");
      if (navUserName) {
        const firstName = (updatedProfile.fullName || fullName).split(" ")[0];
        navUserName.textContent = firstName.charAt(0).toUpperCase() + firstName.slice(1);
      }
      if (navAvatar) {
        const fallback = `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(updatedProfile.fullName || fullName)}`;
        navAvatar.src = updatedProfile.profilePhoto ? updatedProfile.profilePhoto : fallback;
      }

      // Re-render form with updated profile
      populateProfileForm(updatedProfile);

      showToast("Success", "Profile updated successfully! — प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई।", "success");

    } catch (err) {
      console.error("Save profile error:", err);
      showToast("Error", "An unexpected error occurred while saving your profile.", "error");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHtml;
      }
    }
  }

  // ============================================================
  // 9. DISCARD CHANGES HANDLER
  // ============================================================
  function handleDiscardChanges() {
    if (currentProfile) {
      populateProfileForm(currentProfile);
      showToast("Discarded", "All unsaved changes have been discarded.", "info");
    }
  }

  // ============================================================
  // 10. STEP 2: EMAIL & MOBILE VERIFICATION CONTROLLER
  // ============================================================
  let emailCooldownTimer = null;
  let phoneCooldownTimer = null;
  let isEmailChangeMode = false;
  let pendingNewEmail = "";
  let isPhoneChangeMode = false;
  let pendingNewPhone = "";

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
        const data = await response.json();
        if (currentProfile) {
          currentProfile.emailVerified = data.emailVerified;
          currentProfile.phoneVerified = data.phoneVerified;
          if (data.email) currentProfile.email = data.email;
          if (data.phone) currentProfile.phone = data.phone;
        }
        updateVerificationBadges(data);
      }
    } catch (err) {
      console.warn("Could not fetch verification status:", err);
    }
  }

  function updateVerificationBadges(data) {
    if (!data) return;

    const emailVerified = Boolean(data.emailVerified);
    const phoneVerified = Boolean(data.phoneVerified);
    const email = data.email || (currentProfile && currentProfile.email) || "";
    const phone = data.phone || (currentProfile && currentProfile.phone) || "";

    // 1. Personal Information Form Badges
    const personalEmailBadge = document.getElementById("personalInfoEmailBadge");
    if (personalEmailBadge) {
      personalEmailBadge.className = `status-pill-small ${emailVerified ? "verified" : "unverified"}`;
      personalEmailBadge.innerHTML = emailVerified
        ? `<i class="fa-solid fa-circle-check"></i> ✓ Verified`
        : `<i class="fa-solid fa-circle-exclamation"></i> Not Verified`;
    }

    const personalPhoneBadge = document.getElementById("personalInfoPhoneBadge");
    if (personalPhoneBadge) {
      personalPhoneBadge.className = `status-pill-small ${phoneVerified ? "verified" : "unverified"}`;
      personalPhoneBadge.innerHTML = phoneVerified
        ? `<i class="fa-solid fa-circle-check"></i> ✓ Verified`
        : `<i class="fa-solid fa-circle-exclamation"></i> Not Verified`;
    }

    // 2. Verification Panel Badges & Values
    const verifDisplayEmail = document.getElementById("verifDisplayEmail");
    if (verifDisplayEmail) {
      verifDisplayEmail.textContent = email || "No email address registered";
    }

    const emailMainBadge = document.getElementById("emailMainStatusBadge");
    if (emailMainBadge) {
      emailMainBadge.className = `verification-badge ${emailVerified ? "verified" : "unverified"}`;
      emailMainBadge.innerHTML = emailVerified
        ? `<i class="fa-solid fa-circle-check"></i> ✓ Verified`
        : `<i class="fa-solid fa-circle-exclamation"></i> Not Verified`;
    }

    const btnTriggerEmailVerify = document.getElementById("btnTriggerEmailVerify");
    if (btnTriggerEmailVerify) {
      if (emailVerified) {
        btnTriggerEmailVerify.classList.add("hidden");
      } else {
        btnTriggerEmailVerify.classList.remove("hidden");
      }
    }

    const verifDisplayPhone = document.getElementById("verifDisplayPhone");
    if (verifDisplayPhone) {
      verifDisplayPhone.textContent = phone || "No mobile number registered";
    }

    const phoneMainBadge = document.getElementById("phoneMainStatusBadge");
    if (phoneMainBadge) {
      phoneMainBadge.className = `verification-badge ${phoneVerified ? "verified" : "unverified"}`;
      phoneMainBadge.innerHTML = phoneVerified
        ? `<i class="fa-solid fa-circle-check"></i> ✓ Verified`
        : `<i class="fa-solid fa-circle-exclamation"></i> Not Verified`;
    }

    const btnTriggerPhoneVerify = document.getElementById("btnTriggerPhoneVerify");
    if (btnTriggerPhoneVerify) {
      if (phoneVerified) {
        btnTriggerPhoneVerify.classList.add("hidden");
      } else {
        btnTriggerPhoneVerify.classList.remove("hidden");
      }
    }

    // Sync localStorage so dashboard stays updated
    try {
      const rawUser = localStorage.getItem("currentUser") || localStorage.getItem("customerUser");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        parsed.emailVerified = emailVerified;
        parsed.phoneVerified = phoneVerified;
        localStorage.setItem("currentUser", JSON.stringify(parsed));
        localStorage.setItem("customerUser", JSON.stringify(parsed));
      }
    } catch (e) {}
  }

  function switchTab(sectionName) {
    const navPersonalInfo = document.querySelector('.settings-menu-item[data-section="personal-info"]');
    const navVerification = document.getElementById("navEmailMobileVerification");
    const navSecurity = document.getElementById("navSecurityLogin");
    const navConstructionPreferences = document.getElementById("navConstructionPreferences");
    const navSavedLocations = document.getElementById("navSavedLocations");
    const navRegionalPreferences = document.getElementById("navRegionalPreferences");
    const navDownloadData = document.getElementById("navDownloadData");
    const navAccountDeactivation = document.getElementById("navAccountDeactivation");

    const personalInfoPanel = document.getElementById("personal-info-panel");
    const verificationPanel = document.getElementById("verification-panel");
    const securityPanel = document.getElementById("security-panel");
    const constructionPreferencesPanel = document.getElementById("construction-preferences-panel");
    const savedLocationsPanel = document.getElementById("saved-locations-panel");
    const regionalPreferencesPanel = document.getElementById("regional-preferences-panel");
    const downloadDataPanel = document.getElementById("download-data-panel");
    const accountDeactivationPanel = document.getElementById("account-deactivation-panel");

    if (navPersonalInfo) navPersonalInfo.classList.remove("active");
    if (navVerification) navVerification.classList.remove("active");
    if (navSecurity) navSecurity.classList.remove("active");
    if (navConstructionPreferences) navConstructionPreferences.classList.remove("active");
    if (navSavedLocations) navSavedLocations.classList.remove("active");
    if (navRegionalPreferences) navRegionalPreferences.classList.remove("active");
    if (navDownloadData) navDownloadData.classList.remove("active");
    if (navAccountDeactivation) navAccountDeactivation.classList.remove("active");

    if (personalInfoPanel) personalInfoPanel.classList.add("hidden");
    if (verificationPanel) verificationPanel.classList.add("hidden");
    if (securityPanel) securityPanel.classList.add("hidden");
    if (constructionPreferencesPanel) constructionPreferencesPanel.classList.add("hidden");
    if (savedLocationsPanel) savedLocationsPanel.classList.add("hidden");
    if (regionalPreferencesPanel) regionalPreferencesPanel.classList.add("hidden");
    if (downloadDataPanel) downloadDataPanel.classList.add("hidden");
    if (accountDeactivationPanel) accountDeactivationPanel.classList.add("hidden");

    if (sectionName === "account-deactivation") {
      if (navAccountDeactivation) navAccountDeactivation.classList.add("active");
      if (accountDeactivationPanel) accountDeactivationPanel.classList.remove("hidden");
      try { history.replaceState(null, null, "#account-deactivation"); } catch (e) {}
      fetchAccountDeactivationStatus();
    } else if (sectionName === "download-data") {
      if (navDownloadData) navDownloadData.classList.add("active");
      if (downloadDataPanel) downloadDataPanel.classList.remove("hidden");
      try { history.replaceState(null, null, "#download-data"); } catch (e) {}
    } else if (sectionName === "regional-preferences") {
      if (navRegionalPreferences) navRegionalPreferences.classList.add("active");
      if (regionalPreferencesPanel) regionalPreferencesPanel.classList.remove("hidden");
      try { history.replaceState(null, null, "#regional-preferences"); } catch (e) {}
      fetchRegionalPreferences();
    } else if (sectionName === "saved-locations") {
      if (navSavedLocations) navSavedLocations.classList.add("active");
      if (savedLocationsPanel) savedLocationsPanel.classList.remove("hidden");
      try { history.replaceState(null, null, "#saved-locations"); } catch (e) {}
      fetchSavedLocations();
    } else if (sectionName === "construction-preferences") {
      if (navConstructionPreferences) navConstructionPreferences.classList.add("active");
      if (constructionPreferencesPanel) constructionPreferencesPanel.classList.remove("hidden");
      try { history.replaceState(null, null, "#construction-preferences"); } catch (e) {}
      fetchConstructionPreferences();
    } else if (sectionName === "security") {
      if (navSecurity) navSecurity.classList.add("active");
      if (securityPanel) securityPanel.classList.remove("hidden");
      try { history.replaceState(null, null, "#security"); } catch (e) {}
      fetchSecurityStatus();
    } else if (sectionName === "verification") {
      if (navVerification) navVerification.classList.add("active");
      if (verificationPanel) verificationPanel.classList.remove("hidden");
      try { history.replaceState(null, null, "#verification"); } catch (e) {}
      fetchVerificationStatus();
    } else {
      if (navPersonalInfo) navPersonalInfo.classList.add("active");
      if (personalInfoPanel) personalInfoPanel.classList.remove("hidden");
      try { history.replaceState(null, null, "#personal-info"); } catch (e) {}
    }
  }

  // OTP Digits input handler
  function setupOtpDigitInputs(containerId, onCompleteCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const inputs = container.querySelectorAll(".otp-digit-input");

    inputs.forEach((input, index) => {
      input.addEventListener("input", (e) => {
        const val = e.target.value.replace(/[^0-9]/g, "");
        e.target.value = val ? val.charAt(val.length - 1) : "";
        if (e.target.value) {
          input.classList.add("has-value");
          if (index < inputs.length - 1) {
            inputs[index + 1].focus();
          }
        } else {
          input.classList.remove("has-value");
        }

        const fullOtp = Array.from(inputs).map(i => i.value).join("");
        if (fullOtp.length === 6 && onCompleteCallback) {
          onCompleteCallback(fullOtp);
        }
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) {
          inputs[index - 1].focus();
        } else if (e.key === "Enter") {
          const fullOtp = Array.from(inputs).map(i => i.value).join("");
          if (fullOtp.length === 6 && onCompleteCallback) {
            onCompleteCallback(fullOtp);
          }
        }
      });

      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const clipboard = (e.clipboardData || window.clipboardData).getData("text") || "";
        const digits = clipboard.replace(/[^0-9]/g, "").slice(0, 6);
        if (digits) {
          digits.split("").forEach((d, idx) => {
            if (inputs[idx]) {
              inputs[idx].value = d;
              inputs[idx].classList.add("has-value");
            }
          });
          if (digits.length < inputs.length) {
            inputs[digits.length].focus();
          } else {
            inputs[inputs.length - 1].focus();
            if (onCompleteCallback) onCompleteCallback(digits);
          }
        }
      });
    });
  }

  function getOtpValue(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return "";
    const inputs = container.querySelectorAll(".otp-digit-input");
    return Array.from(inputs).map(i => i.value.trim()).join("");
  }

  function clearOtpInputs(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const inputs = container.querySelectorAll(".otp-digit-input");
    inputs.forEach(i => {
      i.value = "";
      i.classList.remove("has-value");
    });
  }

  // Cooldown timers
  function startEmailCooldown(seconds = 60) {
    const resendBtn = document.getElementById("btnResendEmailOtp");
    const countdownSpan = document.getElementById("emailResendCountdown");
    if (!resendBtn || !countdownSpan) return;

    if (emailCooldownTimer) clearInterval(emailCooldownTimer);

    let remaining = seconds;
    resendBtn.disabled = true;
    countdownSpan.textContent = `Resend Code (${remaining}s)`;

    emailCooldownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(emailCooldownTimer);
        emailCooldownTimer = null;
        resendBtn.disabled = false;
        countdownSpan.textContent = "Resend Code";
      } else {
        countdownSpan.textContent = `Resend Code (${remaining}s)`;
      }
    }, 1000);
  }

  function startPhoneCooldown(seconds = 60) {
    const resendBtn = document.getElementById("btnResendPhoneOtp");
    const countdownSpan = document.getElementById("phoneResendCountdown");
    if (!resendBtn || !countdownSpan) return;

    if (phoneCooldownTimer) clearInterval(phoneCooldownTimer);

    let remaining = seconds;
    resendBtn.disabled = true;
    countdownSpan.textContent = `Resend Code (${remaining}s)`;

    phoneCooldownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(phoneCooldownTimer);
        phoneCooldownTimer = null;
        resendBtn.disabled = false;
        countdownSpan.textContent = "Resend Code";
      } else {
        countdownSpan.textContent = `Resend Code (${remaining}s)`;
      }
    }, 1000);
  }

  function setOtpFeedback(elementId, message, type = "error") {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = `otp-feedback-box ${type}`;
    el.textContent = message;
  }

  function clearOtpFeedback(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = "otp-feedback-box";
    el.textContent = "";
  }

  // EMAIL OTP ACTION HANDLERS
  async function triggerSendEmailOtp() {
    const token = getCleanToken();
    if (!token) return;

    const emailOtpSection = document.getElementById("emailOtpSection");
    const emailChangeSection = document.getElementById("emailChangeSection");
    const emailOtpTargetDisplay = document.getElementById("emailOtpTargetDisplay");
    const email = (currentProfile && currentProfile.email) ? currentProfile.email : "";

    isEmailChangeMode = false;
    pendingNewEmail = "";

    if (emailChangeSection) emailChangeSection.classList.add("hidden");
    if (emailOtpSection) emailOtpSection.classList.remove("hidden");
    if (emailOtpTargetDisplay) emailOtpTargetDisplay.textContent = email;

    clearOtpInputs("emailOtpInputsContainer");
    clearOtpFeedback("emailOtpFeedback");

    try {
      const response = await fetch(`${API_BASE_URL}/api/verification/email/send-otp`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      const resJson = await response.json().catch(() => ({}));
      if (response.ok) {
        showToast("Code Sent", resJson.message || "Verification code sent to your email.", "success");
        startEmailCooldown(resJson.cooldownSeconds || 60);
        const firstInput = document.querySelector("#emailOtpInputsContainer .otp-digit-input");
        if (firstInput) firstInput.focus();
      } else {
        setOtpFeedback("emailOtpFeedback", resJson.error || "Failed to send verification code.", "error");
        showToast("Request Failed", resJson.error || "Could not send verification code.", "error");
      }
    } catch (err) {
      setOtpFeedback("emailOtpFeedback", "Network connection failed.", "error");
      showToast("Error", "Could not connect to server.", "error");
    }
  }

  async function submitEmailOtp() {
    const token = getCleanToken();
    if (!token) return;

    const otp = getOtpValue("emailOtpInputsContainer");
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setOtpFeedback("emailOtpFeedback", "Please enter the complete 6-digit numeric verification code.", "error");
      return;
    }

    const verifyBtn = document.getElementById("btnSubmitEmailOtp");
    const originalHtml = verifyBtn ? verifyBtn.innerHTML : "Verify Email OTP";
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`;
    }

    try {
      let url = `${API_BASE_URL}/api/verification/email/verify-otp`;
      let payload = { otp };

      if (isEmailChangeMode && pendingNewEmail) {
        url = `${API_BASE_URL}/api/verification/email/verify-change`;
        payload = { newEmail: pendingNewEmail, otp };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json().catch(() => ({}));
      if (response.ok) {
        setOtpFeedback("emailOtpFeedback", resJson.message || "Email verified successfully!", "success");
        showToast("Verified", isEmailChangeMode ? "Email changed & verified successfully!" : "Email verified successfully!", "success");

        if (isEmailChangeMode && pendingNewEmail) {
          if (currentProfile) currentProfile.email = pendingNewEmail;
          const emailInput = document.getElementById("emailInput");
          if (emailInput) emailInput.value = pendingNewEmail;
        }

        if (currentProfile) {
          currentProfile.emailVerified = true;
        }

        updateVerificationBadges({
          email: (currentProfile && currentProfile.email) || pendingNewEmail,
          emailVerified: true,
          phoneVerified: currentProfile ? currentProfile.phoneVerified : false
        });

        setTimeout(() => {
          const emailOtpSection = document.getElementById("emailOtpSection");
          if (emailOtpSection) emailOtpSection.classList.add("hidden");
          clearOtpInputs("emailOtpInputsContainer");
          clearOtpFeedback("emailOtpFeedback");
          isEmailChangeMode = false;
          pendingNewEmail = "";
        }, 1500);

      } else {
        setOtpFeedback("emailOtpFeedback", resJson.error || "Verification failed. Check the code and try again.", "error");
        showToast("Verification Error", resJson.error || "Invalid verification code.", "error");
      }
    } catch (err) {
      setOtpFeedback("emailOtpFeedback", "Network connection failed.", "error");
      showToast("Error", "Could not connect to server.", "error");
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = originalHtml;
      }
    }
  }

  async function submitEmailChangeRequest() {
    const token = getCleanToken();
    if (!token) return;

    const newEmailInput = document.getElementById("changeNewEmailInput");
    const errorEl = document.getElementById("changeNewEmailError");
    if (errorEl) errorEl.textContent = "";

    const newEmail = newEmailInput ? newEmailInput.value.trim().toLowerCase() : "";
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      if (errorEl) errorEl.textContent = "Please enter a valid email address.";
      return;
    }

    if (currentProfile && currentProfile.email && newEmail === currentProfile.email.toLowerCase()) {
      if (errorEl) errorEl.textContent = "New email cannot be the same as your current email.";
      return;
    }

    const sendBtn = document.getElementById("btnSubmitEmailChangeReq");
    const origHtml = sendBtn ? sendBtn.innerHTML : "Send Verification Code";
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Checking availability...`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/verification/email/request-change`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ newEmail })
      });

      const resJson = await response.json().catch(() => ({}));
      if (response.ok) {
        isEmailChangeMode = true;
        pendingNewEmail = newEmail;

        const emailChangeSection = document.getElementById("emailChangeSection");
        const emailOtpSection = document.getElementById("emailOtpSection");
        const emailOtpTargetDisplay = document.getElementById("emailOtpTargetDisplay");

        if (emailChangeSection) emailChangeSection.classList.add("hidden");
        if (emailOtpSection) emailOtpSection.classList.remove("hidden");
        if (emailOtpTargetDisplay) emailOtpTargetDisplay.textContent = newEmail;

        clearOtpInputs("emailOtpInputsContainer");
        clearOtpFeedback("emailOtpFeedback");
        startEmailCooldown(resJson.cooldownSeconds || 60);

        showToast("Code Sent", resJson.message || `Verification code sent to ${newEmail}`, "success");
        const firstInput = document.querySelector("#emailOtpInputsContainer .otp-digit-input");
        if (firstInput) firstInput.focus();

      } else {
        // EXACT DUPLICATE EMAIL MESSAGE REQUIREMENT: "This email already exists. Try another email."
        const errMsg = resJson.error || "Failed to initiate email change.";
        if (errorEl) errorEl.textContent = errMsg;
        showToast("Email Unavailable", errMsg, "error");
      }
    } catch (err) {
      if (errorEl) errorEl.textContent = "Network error. Please try again.";
      showToast("Error", "Could not connect to server.", "error");
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = origHtml;
      }
    }
  }

  // PHONE OTP ACTION HANDLERS
  async function triggerSendPhoneOtp() {
    const token = getCleanToken();
    if (!token) return;

    const phoneOtpSection = document.getElementById("phoneOtpSection");
    const phoneChangeSection = document.getElementById("phoneChangeSection");
    const phoneOtpTargetDisplay = document.getElementById("phoneOtpTargetDisplay");
    const phone = (currentProfile && currentProfile.phone) ? currentProfile.phone : "";

    isPhoneChangeMode = false;
    pendingNewPhone = "";

    if (phoneChangeSection) phoneChangeSection.classList.add("hidden");
    if (phoneOtpSection) phoneOtpSection.classList.remove("hidden");
    if (phoneOtpTargetDisplay) phoneOtpTargetDisplay.textContent = phone || "your mobile";

    clearOtpInputs("phoneOtpInputsContainer");
    clearOtpFeedback("phoneOtpFeedback");

    try {
      const response = await fetch(`${API_BASE_URL}/api/verification/phone/send-otp`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ phone })
      });

      const resJson = await response.json().catch(() => ({}));
      if (response.ok) {
        showToast("Code Sent", resJson.message || "Verification code sent to mobile.", "success");
        startPhoneCooldown(resJson.cooldownSeconds || 60);
        const firstInput = document.querySelector("#phoneOtpInputsContainer .otp-digit-input");
        if (firstInput) firstInput.focus();
      } else {
        setOtpFeedback("phoneOtpFeedback", resJson.error || "Failed to send mobile verification code.", "error");
        showToast("Request Failed", resJson.error || "Could not send code.", "error");
      }
    } catch (err) {
      setOtpFeedback("phoneOtpFeedback", "Network connection failed.", "error");
      showToast("Error", "Could not connect to server.", "error");
    }
  }

  async function submitPhoneOtp() {
    const token = getCleanToken();
    if (!token) return;

    const otp = getOtpValue("phoneOtpInputsContainer");
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setOtpFeedback("phoneOtpFeedback", "Please enter the complete 6-digit numeric verification code.", "error");
      return;
    }

    const verifyBtn = document.getElementById("btnSubmitPhoneOtp");
    const originalHtml = verifyBtn ? verifyBtn.innerHTML : "Verify Mobile OTP";
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`;
    }

    try {
      const targetPhone = (isPhoneChangeMode && pendingNewPhone)
        ? pendingNewPhone
        : (currentProfile && currentProfile.phone ? currentProfile.phone : "");

      const response = await fetch(`${API_BASE_URL}/api/verification/phone/verify-otp`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ phone: targetPhone, otp })
      });

      const resJson = await response.json().catch(() => ({}));
      if (response.ok) {
        setOtpFeedback("phoneOtpFeedback", resJson.message || "Mobile number verified successfully!", "success");
        showToast("Verified", "Mobile number verified successfully!", "success");

        if (targetPhone) {
          if (currentProfile) currentProfile.phone = targetPhone;
          const phoneInput = document.getElementById("phoneInput");
          if (phoneInput) phoneInput.value = targetPhone;
        }

        if (currentProfile) {
          currentProfile.phoneVerified = true;
        }

        updateVerificationBadges({
          email: currentProfile ? currentProfile.email : "",
          emailVerified: currentProfile ? currentProfile.emailVerified : false,
          phone: targetPhone,
          phoneVerified: true
        });

        setTimeout(() => {
          const phoneOtpSection = document.getElementById("phoneOtpSection");
          if (phoneOtpSection) phoneOtpSection.classList.add("hidden");
          clearOtpInputs("phoneOtpInputsContainer");
          clearOtpFeedback("phoneOtpFeedback");
          isPhoneChangeMode = false;
          pendingNewPhone = "";
        }, 1500);

      } else {
        setOtpFeedback("phoneOtpFeedback", resJson.error || "Verification failed. Check the code and try again.", "error");
        showToast("Verification Error", resJson.error || "Invalid verification code.", "error");
      }
    } catch (err) {
      setOtpFeedback("phoneOtpFeedback", "Network connection failed.", "error");
      showToast("Error", "Could not connect to server.", "error");
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = originalHtml;
      }
    }
  }

  async function submitPhoneChangeRequest() {
    const token = getCleanToken();
    if (!token) return;

    const newPhoneInput = document.getElementById("changeNewPhoneInput");
    const errorEl = document.getElementById("changeNewPhoneError");
    if (errorEl) errorEl.textContent = "";

    const newPhone = newPhoneInput ? newPhoneInput.value.trim() : "";
    const digitsOnly = newPhone.replace(/[^0-9]/g, "");
    if (!newPhone || digitsOnly.length < 10) {
      if (errorEl) errorEl.textContent = "Please enter a valid 10-digit mobile number.";
      return;
    }

    const sendBtn = document.getElementById("btnSubmitPhoneChangeReq");
    const origHtml = sendBtn ? sendBtn.innerHTML : "Send Verification Code";
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending code...`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/verification/phone/send-otp`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ phone: newPhone })
      });

      const resJson = await response.json().catch(() => ({}));
      if (response.ok) {
        isPhoneChangeMode = true;
        pendingNewPhone = newPhone;

        const phoneChangeSection = document.getElementById("phoneChangeSection");
        const phoneOtpSection = document.getElementById("phoneOtpSection");
        const phoneOtpTargetDisplay = document.getElementById("phoneOtpTargetDisplay");

        if (phoneChangeSection) phoneChangeSection.classList.add("hidden");
        if (phoneOtpSection) phoneOtpSection.classList.remove("hidden");
        if (phoneOtpTargetDisplay) phoneOtpTargetDisplay.textContent = newPhone;

        clearOtpInputs("phoneOtpInputsContainer");
        clearOtpFeedback("phoneOtpFeedback");
        startPhoneCooldown(resJson.cooldownSeconds || 60);

        showToast("Code Sent", resJson.message || `Verification code sent to ${newPhone}`, "success");
        const firstInput = document.querySelector("#phoneOtpInputsContainer .otp-digit-input");
        if (firstInput) firstInput.focus();

      } else {
        const errMsg = resJson.error || "Failed to initiate mobile change.";
        if (errorEl) errorEl.textContent = errMsg;
        showToast("Request Failed", errMsg, "error");
      }
    } catch (err) {
      if (errorEl) errorEl.textContent = "Network error. Please try again.";
      showToast("Error", "Could not connect to server.", "error");
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = origHtml;
      }
    }
  }

  // ============================================================
  // 11. STEP 3: SECURITY & LOGIN CONTROLLER
  // ============================================================

  function formatDateTimeString(dateStr) {
    if (!dateStr) return "Never changed since account registration";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Recently updated";
      return d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Recently updated";
    }
  }

  async function fetchSecurityStatus() {
    const token = getCleanToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/security/status`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        console.warn("Could not retrieve security status:", response.status);
        return;
      }

      const data = await response.json();

      // 1. Password Status
      const secPasswordStatusBadge = document.getElementById("secPasswordStatusBadge");
      const secPasswordLastChanged = document.getElementById("secPasswordLastChanged");
      if (secPasswordStatusBadge) {
        secPasswordStatusBadge.className = "status-pill-small verified";
        secPasswordStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Active &amp; Strong`;
      }
      if (secPasswordLastChanged) {
        if (data.passwordUpdatedAt) {
          secPasswordLastChanged.textContent = `Last changed: ${formatDateTimeString(data.passwordUpdatedAt)}`;
        } else {
          secPasswordLastChanged.textContent = "Active since account registration";
        }
      }

      // 2. Email Status
      const secEmailStatusBadge = document.getElementById("secEmailStatusBadge");
      const secEmailDisplay = document.getElementById("secEmailDisplay");
      if (secEmailStatusBadge) {
        secEmailStatusBadge.className = `status-pill-small ${data.emailVerified ? "verified" : "unverified"}`;
        secEmailStatusBadge.innerHTML = data.emailVerified
          ? `<i class="fa-solid fa-circle-check"></i> Verified`
          : `<i class="fa-solid fa-circle-exclamation"></i> Not Verified`;
      }
      if (secEmailDisplay) {
        secEmailDisplay.textContent = data.email || (currentProfile && currentProfile.email) || "No email on file";
      }

      // 3. Mobile Status
      const secPhoneStatusBadge = document.getElementById("secPhoneStatusBadge");
      const secPhoneDisplay = document.getElementById("secPhoneDisplay");
      if (secPhoneStatusBadge) {
        secPhoneStatusBadge.className = `status-pill-small ${data.phoneVerified ? "verified" : "unverified"}`;
        secPhoneStatusBadge.innerHTML = data.phoneVerified
          ? `<i class="fa-solid fa-circle-check"></i> Verified`
          : `<i class="fa-solid fa-circle-exclamation"></i> Not Verified`;
      }
      if (secPhoneDisplay) {
        secPhoneDisplay.textContent = data.phone || (currentProfile && currentProfile.phone) || "No mobile number on file";
      }

    } catch (err) {
      console.warn("Security status network error:", err);
    }
  }

  function setupPasswordToggleButtons() {
    const toggleButtons = document.querySelectorAll(".btn-toggle-password");
    toggleButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const targetInput = document.getElementById(targetId);
        if (!targetInput) return;

        const icon = btn.querySelector("i");
        if (targetInput.type === "password") {
          targetInput.type = "text";
          if (icon) {
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
          }
        } else {
          targetInput.type = "password";
          if (icon) {
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
          }
        }
      });
    });
  }

  function setupPasswordLiveValidation() {
    const currentInput = document.getElementById("currentPasswordInput");
    const newInput = document.getElementById("newPasswordInput");
    const confirmInput = document.getElementById("confirmPasswordInput");
    const strengthBox = document.getElementById("passwordStrengthBox");
    const strengthBar = document.getElementById("strengthBar");
    const strengthText = document.getElementById("strengthText");
    const ruleLength = document.getElementById("ruleLength");
    const ruleNotSame = document.getElementById("ruleNotSame");
    const ruleMatch = document.getElementById("ruleMatch");

    function updateLiveRules() {
      const curVal = currentInput ? currentInput.value : "";
      const newVal = newInput ? newInput.value : "";
      const confVal = confirmInput ? confirmInput.value : "";

      // Rule 1: Length >= 8
      if (newVal.length >= 8) {
        if (ruleLength) {
          ruleLength.classList.add("met");
          ruleLength.innerHTML = `<i class="fa-solid fa-circle-check"></i> At least 8 characters in length`;
        }
      } else {
        if (ruleLength) {
          ruleLength.classList.remove("met");
          ruleLength.innerHTML = `<i class="fa-solid fa-circle-dot"></i> At least 8 characters in length`;
        }
      }

      // Rule 2: Cannot be identical to current
      if (newVal && curVal && newVal === curVal) {
        if (ruleNotSame) {
          ruleNotSame.classList.remove("met");
          ruleNotSame.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> Cannot be identical to current password`;
        }
      } else if (newVal && curVal && newVal !== curVal) {
        if (ruleNotSame) {
          ruleNotSame.classList.add("met");
          ruleNotSame.innerHTML = `<i class="fa-solid fa-circle-check"></i> Cannot be identical to current password`;
        }
      } else {
        if (ruleNotSame) {
          ruleNotSame.classList.remove("met");
          ruleNotSame.innerHTML = `<i class="fa-solid fa-circle-dot"></i> Cannot be identical to current password`;
        }
      }

      // Rule 3: Confirmation match
      if (newVal && confVal && newVal === confVal) {
        if (ruleMatch) {
          ruleMatch.classList.add("met");
          ruleMatch.innerHTML = `<i class="fa-solid fa-circle-check"></i> New password and confirmation must match`;
        }
      } else if (newVal && confVal && newVal !== confVal) {
        if (ruleMatch) {
          ruleMatch.classList.remove("met");
          ruleMatch.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> New password and confirmation must match`;
        }
      } else {
        if (ruleMatch) {
          ruleMatch.classList.remove("met");
          ruleMatch.innerHTML = `<i class="fa-solid fa-circle-dot"></i> New password and confirmation must match`;
        }
      }

      // Password Strength (Informational UX Only)
      if (newVal.length > 0) {
        if (strengthBox) strengthBox.classList.remove("hidden");

        let score = 0;
        if (newVal.length >= 8) score++;
        if (/[A-Z]/.test(newVal)) score++;
        if (/[0-9]/.test(newVal) || /[^A-Za-z0-9]/.test(newVal)) score++;
        if (newVal.length >= 12) score++;

        if (strengthBar && strengthText) {
          strengthBar.className = "strength-bar";
          strengthText.className = "strength-text";

          if (score <= 1) {
            strengthBar.classList.add("weak");
            strengthText.classList.add("weak");
            strengthText.textContent = "Strength: Weak";
          } else if (score === 2 || score === 3) {
            strengthBar.classList.add("medium");
            strengthText.classList.add("medium");
            strengthText.textContent = "Strength: Moderate";
          } else {
            strengthBar.classList.add("strong");
            strengthText.classList.add("strong");
            strengthText.textContent = "Strength: Strong";
          }
        }
      } else {
        if (strengthBox) strengthBox.classList.add("hidden");
      }
    }

    if (newInput) newInput.addEventListener("input", updateLiveRules);
    if (confirmInput) confirmInput.addEventListener("input", updateLiveRules);
    if (currentInput) currentInput.addEventListener("input", updateLiveRules);
  }

  function resetPasswordFormFields() {
    const currentInput = document.getElementById("currentPasswordInput");
    const newInput = document.getElementById("newPasswordInput");
    const confirmInput = document.getElementById("confirmPasswordInput");
    const currentError = document.getElementById("currentPasswordError");
    const newError = document.getElementById("newPasswordError");
    const confirmError = document.getElementById("confirmPasswordError");
    const feedbackBox = document.getElementById("passwordFeedbackBox");
    const strengthBox = document.getElementById("passwordStrengthBox");
    const ruleLength = document.getElementById("ruleLength");
    const ruleNotSame = document.getElementById("ruleNotSame");
    const ruleMatch = document.getElementById("ruleMatch");

    if (currentInput) { currentInput.value = ""; currentInput.type = "password"; }
    if (newInput) { newInput.value = ""; newInput.type = "password"; }
    if (confirmInput) { confirmInput.value = ""; confirmInput.type = "password"; }

    if (currentError) currentError.textContent = "";
    if (newError) newError.textContent = "";
    if (confirmError) confirmError.textContent = "";

    if (feedbackBox) {
      feedbackBox.className = "security-feedback-box hidden";
      feedbackBox.textContent = "";
    }

    if (strengthBox) strengthBox.classList.add("hidden");

    if (ruleLength) {
      ruleLength.classList.remove("met");
      ruleLength.innerHTML = `<i class="fa-solid fa-circle-dot"></i> At least 8 characters in length`;
    }
    if (ruleNotSame) {
      ruleNotSame.classList.remove("met");
      ruleNotSame.innerHTML = `<i class="fa-solid fa-circle-dot"></i> Cannot be identical to current password`;
    }
    if (ruleMatch) {
      ruleMatch.classList.remove("met");
      ruleMatch.innerHTML = `<i class="fa-solid fa-circle-dot"></i> New password and confirmation must match`;
    }

    const toggleButtons = document.querySelectorAll(".btn-toggle-password i");
    toggleButtons.forEach(icon => {
      icon.className = "fa-regular fa-eye";
    });
  }

  function clearAllAuthDataAndRedirect() {
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
    window.location.href = "index.html";
  }

  async function handlePasswordChangeSubmit(e) {
    e.preventDefault();

    const token = getCleanToken();
    if (!token) {
      window.location.href = "index.html";
      return;
    }

    const currentInput = document.getElementById("currentPasswordInput");
    const newInput = document.getElementById("newPasswordInput");
    const confirmInput = document.getElementById("confirmPasswordInput");
    const currentError = document.getElementById("currentPasswordError");
    const newError = document.getElementById("newPasswordError");
    const confirmError = document.getElementById("confirmPasswordError");
    const feedbackBox = document.getElementById("passwordFeedbackBox");
    const submitBtn = document.getElementById("btnSubmitPasswordChange");

    if (currentError) currentError.textContent = "";
    if (newError) newError.textContent = "";
    if (confirmError) confirmError.textContent = "";
    if (feedbackBox) {
      feedbackBox.className = "security-feedback-box hidden";
      feedbackBox.textContent = "";
    }

    const curPwd = currentInput ? currentInput.value.trim() : "";
    const newPwd = newInput ? newInput.value.trim() : "";
    const confPwd = confirmInput ? confirmInput.value.trim() : "";

    // Client-side validations
    let hasError = false;

    if (!curPwd) {
      if (currentError) currentError.textContent = "Current password is required.";
      hasError = true;
    }

    if (!newPwd) {
      if (newError) newError.textContent = "New password is required.";
      hasError = true;
    } else if (newPwd.length < 8) {
      if (newError) newError.textContent = "Password must be at least 8 characters in length.";
      hasError = true;
    } else if (curPwd && newPwd === curPwd) {
      if (newError) newError.textContent = "New password cannot be the same as your current password.";
      hasError = true;
    }

    if (!confPwd) {
      if (confirmError) confirmError.textContent = "Please confirm your new password.";
      hasError = true;
    } else if (newPwd && confPwd !== newPwd) {
      if (confirmError) confirmError.textContent = "New password and confirmation do not match.";
      hasError = true;
    }

    if (hasError) {
      showToast("Validation Error", "Please review the password requirements.", "error");
      return;
    }

    const origBtnHtml = submitBtn ? submitBtn.innerHTML : "Update Password";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Updating Password...`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/security/password`, {
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

      // Clear password inputs from DOM immediately (Security requirement)
      if (currentInput) currentInput.value = "";
      if (newInput) newInput.value = "";
      if (confirmInput) confirmInput.value = "";

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.error || data.message || "Failed to change password.";
        if (feedbackBox) {
          feedbackBox.className = "security-feedback-box error";
          feedbackBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${errorMsg}`;
        }
        showToast("Password Change Failed", errorMsg, "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
        return;
      }

      // Success
      if (feedbackBox) {
        feedbackBox.className = "security-feedback-box success";
        feedbackBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> Password changed successfully! For your security, all active sessions have been invalidated. Redirecting to login...`;
      }
      showToast("Password Updated", "Password changed successfully. Please log in with your new password.", "success");

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> Changed Successfully`;
      }

      setTimeout(() => {
        clearAllAuthDataAndRedirect();
      }, 2000);

    } catch (err) {
      console.error("Password change network error:", err);
      if (feedbackBox) {
        feedbackBox.className = "security-feedback-box error";
        feedbackBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Network error: unable to communicate with server.`;
      }
      showToast("Connection Error", "Could not reach the BuildBid security service.", "error");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
    }
  }

  async function handleRevokeAllSessions() {
    const confirmed = window.confirm(
      "Are you sure you want to revoke all active sessions across all devices? You will be logged out immediately."
    );
    if (!confirmed) return;

    const token = getCleanToken();
    if (!token) {
      window.location.href = "index.html";
      return;
    }

    const revokeBtn = document.getElementById("btnRevokeAllSessions");
    const origHtml = revokeBtn ? revokeBtn.innerHTML : "Revoke All Sessions";
    if (revokeBtn) {
      revokeBtn.disabled = true;
      revokeBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Revoking Sessions...`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/security/logout-all`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        showToast("Revoke Failed", errJson.error || "Could not revoke active sessions.", "error");
        if (revokeBtn) {
          revokeBtn.disabled = false;
          revokeBtn.innerHTML = origHtml;
        }
        return;
      }

      showToast("Sessions Revoked", "All active sessions have been revoked. Logging out...", "info");
      setTimeout(() => {
        clearAllAuthDataAndRedirect();
      }, 1500);

    } catch (err) {
      console.error("Revoke sessions network error:", err);
      showToast("Connection Error", "Could not reach server to revoke sessions.", "error");
      if (revokeBtn) {
        revokeBtn.disabled = false;
        revokeBtn.innerHTML = origHtml;
      }
    }
  }

  // ============================================================
  // 12. STEP 4: CONSTRUCTION PREFERENCES CONTROLLER
  // ============================================================
  async function fetchConstructionPreferences() {
    const token = getCleanToken();
    if (!token) return;

    const feedbackBox = document.getElementById("preferencesFeedbackBox");
    if (feedbackBox) {
      feedbackBox.className = "security-feedback-box hidden";
      feedbackBox.textContent = "";
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/preferences/construction`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.status === 401) {
        showToast("Session Expired", "Please login again.", "error");
        return;
      }

      if (!response.ok) {
        console.warn("Could not fetch construction preferences:", response.status);
        return;
      }

      const data = await response.json();
      populateConstructionPreferences(data);

    } catch (err) {
      console.error("Fetch construction preferences network error:", err);
    }
  }

  function populateConstructionPreferences(data) {
    if (!data) return;

    const projectTypeSelect = document.getElementById("prefProjectType");
    const propertyTypeSelect = document.getElementById("prefPropertyType");
    const builtUpAreaInput = document.getElementById("prefBuiltUpArea");
    const floorsSelect = document.getElementById("prefFloors");
    const qualitySelect = document.getElementById("prefQuality");
    const budgetSelect = document.getElementById("prefBudget");

    if (projectTypeSelect) projectTypeSelect.value = data.preferredProjectType || "";
    if (propertyTypeSelect) propertyTypeSelect.value = data.preferredPropertyType || "";
    if (builtUpAreaInput) builtUpAreaInput.value = (data.preferredBuiltUpArea !== null && data.preferredBuiltUpArea !== undefined) ? data.preferredBuiltUpArea : "";
    if (floorsSelect) floorsSelect.value = data.preferredNumberOfFloors || "";
    if (qualitySelect) qualitySelect.value = data.preferredConstructionQuality || "";
    if (budgetSelect) budgetSelect.value = data.preferredBudgetRange || "";
  }

  async function handlePreferencesSubmit(e) {
    if (e) e.preventDefault();

    const token = getCleanToken();
    if (!token) {
      showToast("Authentication Required", "Please login to save preferences.", "error");
      return;
    }

    clearPreferenceFieldErrors();

    const projectTypeSelect = document.getElementById("prefProjectType");
    const propertyTypeSelect = document.getElementById("prefPropertyType");
    const builtUpAreaInput = document.getElementById("prefBuiltUpArea");
    const floorsSelect = document.getElementById("prefFloors");
    const qualitySelect = document.getElementById("prefQuality");
    const budgetSelect = document.getElementById("prefBudget");

    const preferredProjectType = (projectTypeSelect && projectTypeSelect.value.trim()) || null;
    const preferredPropertyType = (propertyTypeSelect && propertyTypeSelect.value.trim()) || null;
    const rawArea = builtUpAreaInput ? builtUpAreaInput.value.trim() : "";
    let preferredBuiltUpArea = null;

    if (rawArea) {
      const parsed = parseFloat(rawArea);
      if (isNaN(parsed) || parsed <= 0) {
        showPreferenceFieldError("prefBuiltUpAreaError", "Built-up area must be a positive number greater than 0.");
        return;
      }
      if (parsed > 10000000) {
        showPreferenceFieldError("prefBuiltUpAreaError", "Built-up area cannot exceed 10,000,000 sq ft.");
        return;
      }
      preferredBuiltUpArea = parsed;
    }

    const preferredNumberOfFloors = (floorsSelect && floorsSelect.value.trim()) || null;
    const preferredConstructionQuality = (qualitySelect && qualitySelect.value.trim()) || null;
    const preferredBudgetRange = (budgetSelect && budgetSelect.value.trim()) || null;

    const payload = {
      preferredProjectType,
      preferredPropertyType,
      preferredBuiltUpArea,
      preferredNumberOfFloors,
      preferredConstructionQuality,
      preferredBudgetRange
    };

    const saveBtn = document.getElementById("btnSavePreferences");
    const origHtml = saveBtn ? saveBtn.innerHTML : "";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    }

    const feedbackBox = document.getElementById("preferencesFeedbackBox");

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/preferences/construction`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = resJson.error || "Failed to save construction preferences.";
        if (feedbackBox) {
          feedbackBox.className = "security-feedback-box error";
          feedbackBox.textContent = errorMsg;
        }
        showToast("Save Failed", errorMsg, "error");
        return;
      }

      // Success
      populateConstructionPreferences(resJson);
      if (feedbackBox) {
        feedbackBox.className = "security-feedback-box success";
        feedbackBox.textContent = "Your construction preferences have been saved successfully.";
      }
      showToast("Preferences Saved", "Default construction preferences updated.", "success");

    } catch (err) {
      console.error("Save preferences network error:", err);
      if (feedbackBox) {
        feedbackBox.className = "security-feedback-box error";
        feedbackBox.textContent = "Network error. Could not reach BuildBid servers.";
      }
      showToast("Network Error", "Could not reach server to save preferences.", "error");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origHtml;
      }
    }
  }

  async function handlePreferencesReset() {
    const confirmed = confirm(
      "Are you sure you want to reset your construction preferences?\n\nThis will clear your default preference settings. Project-specific data will not be affected."
    );
    if (!confirmed) return;

    const token = getCleanToken();
    if (!token) return;

    const resetBtn = document.getElementById("btnResetPreferences");
    const origHtml = resetBtn ? resetBtn.innerHTML : "";
    if (resetBtn) {
      resetBtn.disabled = true;
      resetBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Resetting...`;
    }

    const feedbackBox = document.getElementById("preferencesFeedbackBox");

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/preferences/construction`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = resJson.error || "Failed to reset preferences.";
        showToast("Reset Failed", errorMsg, "error");
        return;
      }

      // Clear all fields
      populateConstructionPreferences({
        preferredProjectType: "",
        preferredPropertyType: "",
        preferredBuiltUpArea: null,
        preferredNumberOfFloors: "",
        preferredConstructionQuality: "",
        preferredBudgetRange: ""
      });

      clearPreferenceFieldErrors();

      if (feedbackBox) {
        feedbackBox.className = "security-feedback-box success";
        feedbackBox.textContent = "All construction preferences have been reset to default (unset).";
      }
      showToast("Preferences Reset", "Construction preferences have been reset.", "success");

    } catch (err) {
      console.error("Reset preferences network error:", err);
      showToast("Network Error", "Could not reach server to reset preferences.", "error");
    } finally {
      if (resetBtn) {
        resetBtn.disabled = false;
        resetBtn.innerHTML = origHtml;
      }
    }
  }

  function clearPreferenceFieldErrors() {
    ["prefProjectTypeError", "prefPropertyTypeError", "prefBuiltUpAreaError", "prefFloorsError", "prefQualityError", "prefBudgetError"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
    const feedbackBox = document.getElementById("preferencesFeedbackBox");
    if (feedbackBox) {
      feedbackBox.className = "security-feedback-box hidden";
      feedbackBox.textContent = "";
    }
  }

  function showPreferenceFieldError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message;
  }

  // ============================================================
  // 14. STEP 5: SAVED LOCATIONS HANDLERS
  // ============================================================
  function escapeHtml(unsafe) {
    if (unsafe == null) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getLocationIcon(label) {
    if (!label) return "fa-location-dot";
    const l = label.toLowerCase();
    if (l.includes("home") || l.includes("house") || l.includes("residence") || l.includes("flat") || l.includes("villa")) {
      return "fa-house";
    }
    if (l.includes("site") || l.includes("construct") || l.includes("plot") || l.includes("project")) {
      return "fa-person-digging";
    }
    if (l.includes("office") || l.includes("corporate") || l.includes("work") || l.includes("commercial")) {
      return "fa-building";
    }
    if (l.includes("farm") || l.includes("land") || l.includes("garden")) {
      return "fa-tree";
    }
    if (l.includes("warehouse") || l.includes("godown") || l.includes("factory") || l.includes("storage")) {
      return "fa-warehouse";
    }
    return "fa-location-dot";
  }

  async function fetchSavedLocations() {
    const token = getCleanToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/saved-locations`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "index.html";
          return;
        }
        showToast("Error", "Unable to load saved locations.", "error");
        return;
      }

      const locations = await response.json();
      savedLocationsList = Array.isArray(locations) ? locations : [];
      renderSavedLocations(savedLocationsList);
    } catch (err) {
      console.error("Fetch saved locations error:", err);
      showToast("Error", "Network error while loading saved locations.", "error");
    }
  }

  function renderSavedLocations(locations) {
    const listContainer = document.getElementById("savedLocationsListContainer");
    const emptyState = document.getElementById("savedLocationsEmptyState");
    const counterEl = document.getElementById("savedLocationsCounter");

    if (counterEl) {
      counterEl.textContent = locations.length;
    }

    if (!listContainer || !emptyState) return;

    if (!locations || locations.length === 0) {
      listContainer.innerHTML = "";
      listContainer.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    listContainer.classList.remove("hidden");

    listContainer.innerHTML = locations.map(loc => {
      const iconClass = getLocationIcon(loc.label);
      const isDefault = Boolean(loc.isDefault);
      const landmarkHtml = loc.landmark
        ? `<div class="location-landmark-info"><i class="fa-solid fa-map-pin"></i> Landmark: ${escapeHtml(loc.landmark)}</div>`
        : "";
      const address2Html = loc.addressLine2
        ? `<div class="location-street">${escapeHtml(loc.addressLine2)}</div>`
        : "";

      return `
        <div class="location-item-card ${isDefault ? 'is-default' : ''}" data-location-id="${loc.id}">
          <div>
            <div class="location-card-header">
              <div class="location-label-wrap">
                <div class="location-label-icon">
                  <i class="fa-solid ${iconClass}"></i>
                </div>
                <span class="location-label-title">${escapeHtml(loc.label)}</span>
              </div>
              ${isDefault ? '<span class="location-default-badge"><i class="fa-solid fa-circle-check"></i> Default</span>' : ''}
            </div>
            <div class="location-card-body">
              <div class="location-street">${escapeHtml(loc.addressLine1)}</div>
              ${address2Html}
              <div class="location-city-state">${escapeHtml(loc.city)}, ${escapeHtml(loc.state)} - <strong>${escapeHtml(loc.pincode)}</strong></div>
              ${landmarkHtml}
            </div>
          </div>
          <div class="location-card-footer">
            ${!isDefault ? `<button type="button" class="btn-location-action btn-set-default" data-action="default" data-id="${loc.id}"><i class="fa-solid fa-star"></i> Set as Default</button>` : ''}
            <button type="button" class="btn-location-action btn-edit-loc" data-action="edit" data-id="${loc.id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
            <button type="button" class="btn-location-action btn-action-danger-text btn-delete-loc" data-action="delete" data-id="${loc.id}" data-label="${escapeHtml(loc.label)}"><i class="fa-solid fa-trash-can"></i> Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function openAddLocationForm() {
    clearLocationFieldErrors();
    const formCard = document.getElementById("locationFormCard");
    const editIdInput = document.getElementById("locEditId");
    const formTitle = document.getElementById("locationFormTitle");
    const formDesc = document.getElementById("locationFormDesc");
    const formIcon = document.getElementById("locationFormIcon");
    const isDefaultCheckbox = document.getElementById("locIsDefault");

    if (editIdInput) editIdInput.value = "";
    const form = document.getElementById("savedLocationForm");
    if (form) form.reset();

    if (formTitle) formTitle.textContent = "Add New Location";
    if (formDesc) formDesc.textContent = "Enter details of your project site, residence, or commercial property.";
    if (formIcon) formIcon.className = "fa-solid fa-map-location-dot";

    if (isDefaultCheckbox) {
      if (savedLocationsList.length === 0) {
        isDefaultCheckbox.checked = true;
      } else {
        isDefaultCheckbox.checked = false;
      }
    }

    if (formCard) {
      formCard.classList.remove("hidden");
      formCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function openEditLocationForm(locationId) {
    const loc = savedLocationsList.find(item => String(item.id) === String(locationId));
    if (!loc) return;

    clearLocationFieldErrors();
    const formCard = document.getElementById("locationFormCard");
    const editIdInput = document.getElementById("locEditId");
    const formTitle = document.getElementById("locationFormTitle");
    const formDesc = document.getElementById("locationFormDesc");
    const formIcon = document.getElementById("locationFormIcon");

    if (editIdInput) editIdInput.value = loc.id;
    if (formTitle) formTitle.textContent = "Edit Saved Location";
    if (formDesc) formDesc.textContent = `Updating address for ${loc.label}`;
    if (formIcon) formIcon.className = `fa-solid ${getLocationIcon(loc.label)}`;

    const labelInput = document.getElementById("locLabel");
    const address1Input = document.getElementById("locAddress1");
    const address2Input = document.getElementById("locAddress2");
    const cityInput = document.getElementById("locCity");
    const stateInput = document.getElementById("locState");
    const pincodeInput = document.getElementById("locPincode");
    const landmarkInput = document.getElementById("locLandmark");
    const isDefaultCheckbox = document.getElementById("locIsDefault");

    if (labelInput) labelInput.value = loc.label || "";
    if (address1Input) address1Input.value = loc.addressLine1 || "";
    if (address2Input) address2Input.value = loc.addressLine2 || "";
    if (cityInput) cityInput.value = loc.city || "";
    if (stateInput) stateInput.value = loc.state || "";
    if (pincodeInput) pincodeInput.value = loc.pincode || "";
    if (landmarkInput) landmarkInput.value = loc.landmark || "";
    if (isDefaultCheckbox) isDefaultCheckbox.checked = Boolean(loc.isDefault);

    if (formCard) {
      formCard.classList.remove("hidden");
      formCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function closeLocationForm() {
    const formCard = document.getElementById("locationFormCard");
    if (formCard) formCard.classList.add("hidden");
    clearLocationFieldErrors();
    const form = document.getElementById("savedLocationForm");
    if (form) form.reset();
  }

  function clearLocationFieldErrors() {
    ["locLabelError", "locAddress1Error", "locAddress2Error", "locCityError", "locStateError", "locPincodeError", "locLandmarkError"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
    const feedbackBox = document.getElementById("locationFormFeedback");
    if (feedbackBox) {
      feedbackBox.className = "security-feedback-box hidden";
      feedbackBox.textContent = "";
    }
  }

  function showLocationFieldError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message;
  }

  async function handleLocationFormSubmit(e) {
    e.preventDefault();
    clearLocationFieldErrors();

    const editId = document.getElementById("locEditId").value;
    const label = (document.getElementById("locLabel").value || "").trim();
    const addressLine1 = (document.getElementById("locAddress1").value || "").trim();
    const addressLine2 = (document.getElementById("locAddress2").value || "").trim();
    const city = (document.getElementById("locCity").value || "").trim();
    const state = (document.getElementById("locState").value || "").trim();
    const pincode = (document.getElementById("locPincode").value || "").trim();
    const landmark = (document.getElementById("locLandmark").value || "").trim();
    const isDefault = document.getElementById("locIsDefault").checked;

    let hasError = false;

    if (!label) {
      showLocationFieldError("locLabelError", "Location label is required.");
      hasError = true;
    }
    if (!addressLine1) {
      showLocationFieldError("locAddress1Error", "Address line 1 is required.");
      hasError = true;
    }
    if (!city) {
      showLocationFieldError("locCityError", "City is required.");
      hasError = true;
    }
    if (!state) {
      showLocationFieldError("locStateError", "State is required.");
      hasError = true;
    }
    if (!pincode) {
      showLocationFieldError("locPincodeError", "PIN code is required.");
      hasError = true;
    } else if (!/^\d{6}$/.test(pincode)) {
      showLocationFieldError("locPincodeError", "PIN code must be exactly 6 numeric digits.");
      hasError = true;
    }

    if (hasError) return;

    const payload = {
      label,
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      pincode,
      landmark: landmark || null,
      isDefault
    };

    const token = getCleanToken();
    if (!token) return;

    const saveBtn = document.getElementById("btnSaveLocation");
    const origHtml = saveBtn ? saveBtn.innerHTML : "";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    }

    const feedbackBox = document.getElementById("locationFormFeedback");
    if (feedbackBox) {
      feedbackBox.className = "security-feedback-box hidden";
      feedbackBox.textContent = "";
    }

    try {
      const url = editId
        ? `${API_BASE_URL}/api/customer/saved-locations/${editId}`
        : `${API_BASE_URL}/api/customer/saved-locations`;
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = data.error || (editId ? "Failed to update location." : "Failed to create location.");
        if (feedbackBox) {
          feedbackBox.className = "security-feedback-box error";
          feedbackBox.textContent = errorMsg;
        }
        showToast("Error", errorMsg, "error");
        return;
      }

      showToast("Success", editId ? "Saved location updated successfully." : "New location saved successfully.", "success");
      closeLocationForm();
      await fetchSavedLocations();
    } catch (err) {
      console.error("Save location error:", err);
      if (feedbackBox) {
        feedbackBox.className = "security-feedback-box error";
        feedbackBox.textContent = "A network error occurred. Please try again.";
      }
      showToast("Error", "Network error while saving location.", "error");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origHtml;
      }
    }
  }

  async function handleSetDefaultLocation(locationId) {
    const token = getCleanToken();
    if (!token || !locationId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/customer/saved-locations/${locationId}/default`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("Error", data.error || "Failed to set default location.", "error");
        return;
      }

      showToast("Default Updated", "Primary saved location updated successfully.", "success");
      await fetchSavedLocations();
    } catch (err) {
      console.error("Set default location error:", err);
      showToast("Error", "Network error while setting default location.", "error");
    }
  }

  function openDeleteLocationModal(locationId, label) {
    deleteLocationTargetId = locationId;
    const labelEl = document.getElementById("deleteLocationTargetLabel");
    if (labelEl) labelEl.textContent = label || "this location";
    const modal = document.getElementById("deleteLocationModal");
    if (modal) modal.classList.remove("hidden");
  }

  function closeDeleteLocationModal() {
    deleteLocationTargetId = null;
    const modal = document.getElementById("deleteLocationModal");
    if (modal) modal.classList.add("hidden");
  }

  async function handleConfirmDeleteLocation() {
    if (!deleteLocationTargetId) return;
    const token = getCleanToken();
    if (!token) return;

    const confirmBtn = document.getElementById("btnConfirmDeleteLocation");
    const origHtml = confirmBtn ? confirmBtn.innerHTML : "";
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting...`;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/customer/saved-locations/${deleteLocationTargetId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("Error", data.error || "Failed to delete saved location.", "error");
        return;
      }

      showToast("Location Deleted", "Saved location removed successfully.", "success");
      closeDeleteLocationModal();
      await fetchSavedLocations();
    } catch (err) {
      console.error("Delete location error:", err);
      showToast("Error", "Network error while deleting saved location.", "error");
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = origHtml;
      }
    }
  }

  // ============================================================
  // 13. STEP 6: LANGUAGE & REGIONAL PREFERENCES
  // ============================================================
  async function fetchRegionalPreferences() {
    const token = getCleanToken();
    if (!token) return;

    const feedbackBox = document.getElementById("regionalPreferencesFeedback");
    if (feedbackBox) {
      feedbackBox.className = "security-feedback-box hidden";
      feedbackBox.textContent = "";
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/preferences/regional`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.status === 401) {
        showToast("Session Expired", "Please login again.", "error");
        return;
      }

      if (!response.ok) {
        console.warn("Could not fetch regional preferences:", response.status);
        return;
      }

      const data = await response.json();
      populateRegionalPreferences(data);

    } catch (err) {
      console.error("Fetch regional preferences network error:", err);
    }
  }

  function populateRegionalPreferences(data) {
    if (!data) return;

    const langSelect = document.getElementById("regPreferredLanguage");
    const tzSelect = document.getElementById("regTimeZone");
    const currSelect = document.getElementById("regCurrency");
    const areaSelect = document.getElementById("regAreaUnit");
    const dateSelect = document.getElementById("regDateFormat");
    const numSelect = document.getElementById("regNumberFormat");

    if (langSelect) langSelect.value = data.preferredLanguage || "English";
    if (tzSelect) tzSelect.value = data.timeZone || "Asia/Kolkata";
    if (currSelect) currSelect.value = data.currency || "INR";
    if (areaSelect) areaSelect.value = data.areaUnit || "sq ft";
    if (dateSelect) dateSelect.value = data.dateFormat || "DD/MM/YYYY";
    if (numSelect) numSelect.value = data.numberFormat || "Indian";
  }

  function clearRegionalFieldErrors() {
    const errIds = [
      "regPreferredLanguageError",
      "regTimeZoneError",
      "regCurrencyError",
      "regAreaUnitError",
      "regDateFormatError",
      "regNumberFormatError"
    ];
    errIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });

    const feedbackBox = document.getElementById("regionalPreferencesFeedback");
    if (feedbackBox) {
      feedbackBox.className = "security-feedback-box hidden";
      feedbackBox.textContent = "";
    }
  }

  async function handleRegionalPreferencesSubmit(e) {
    if (e) e.preventDefault();

    const token = getCleanToken();
    if (!token) {
      showToast("Authentication Required", "Please login to save preferences.", "error");
      return;
    }

    clearRegionalFieldErrors();

    const langSelect = document.getElementById("regPreferredLanguage");
    const tzSelect = document.getElementById("regTimeZone");
    const currSelect = document.getElementById("regCurrency");
    const areaSelect = document.getElementById("regAreaUnit");
    const dateSelect = document.getElementById("regDateFormat");
    const numSelect = document.getElementById("regNumberFormat");

    const preferredLanguage = (langSelect && langSelect.value.trim()) || "English";
    const timeZone = (tzSelect && tzSelect.value.trim()) || "Asia/Kolkata";
    const currency = (currSelect && currSelect.value.trim()) || "INR";
    const areaUnit = (areaSelect && areaSelect.value.trim()) || "sq ft";
    const dateFormat = (dateSelect && dateSelect.value.trim()) || "DD/MM/YYYY";
    const numberFormat = (numSelect && numSelect.value.trim()) || "Indian";

    // Frontend validation
    if (preferredLanguage !== "English" && preferredLanguage !== "Hindi") {
      const err = document.getElementById("regPreferredLanguageError");
      if (err) err.textContent = "Supported languages are English and Hindi.";
      return;
    }

    const payload = {
      preferredLanguage,
      timeZone,
      currency,
      areaUnit,
      dateFormat,
      numberFormat
    };

    const saveBtn = document.getElementById("btnSaveRegionalPreferences");
    const origHtml = saveBtn ? saveBtn.innerHTML : "";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    }

    const feedbackBox = document.getElementById("regionalPreferencesFeedback");

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/preferences/regional`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = resJson.error || "Failed to save regional preferences.";
        if (feedbackBox) {
          feedbackBox.className = "security-feedback-box error";
          feedbackBox.textContent = errorMsg;
        }
        showToast("Save Failed", errorMsg, "error");
        return;
      }

      // Authoritative update from server response
      populateRegionalPreferences(resJson);
      if (feedbackBox) {
        feedbackBox.className = "security-feedback-box success";
        feedbackBox.textContent = "Your language & regional preferences have been saved successfully.";
      }
      showToast("Preferences Saved", "Language & regional preferences updated.", "success");

    } catch (err) {
      console.error("Save regional preferences network error:", err);
      if (feedbackBox) {
        feedbackBox.className = "security-feedback-box error";
        feedbackBox.textContent = "Network error. Could not reach BuildBid servers.";
      }
      showToast("Network Error", "Could not reach server to save preferences.", "error");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origHtml;
      }
    }
  }

  async function handleRegionalPreferencesReset() {
    const confirmed = confirm(
      "Are you sure you want to reset your language and regional preferences?\n\nThis will reset your preferred language to English and regional display settings to system defaults. Your profile, projects, and saved locations will not be affected."
    );
    if (!confirmed) return;

    const token = getCleanToken();
    if (!token) return;

    const resetBtn = document.getElementById("btnResetRegionalPreferences");
    const origHtml = resetBtn ? resetBtn.innerHTML : "";
    if (resetBtn) {
      resetBtn.disabled = true;
      resetBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Resetting...`;
    }

    const feedbackBox = document.getElementById("regionalPreferencesFeedback");

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/preferences/regional/reset`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = resJson.error || "Failed to reset preferences.";
        showToast("Reset Failed", errorMsg, "error");
        return;
      }

      const resetData = resJson.preferences || resJson;
      populateRegionalPreferences(resetData);

      if (feedbackBox) {
        feedbackBox.className = "security-feedback-box success";
        feedbackBox.textContent = "Regional preferences have been reset to default values.";
      }
      showToast("Preferences Reset", "Default regional preferences restored.", "info");

    } catch (err) {
      console.error("Reset regional preferences error:", err);
      showToast("Network Error", "Could not connect to server to reset preferences.", "error");
    } finally {
      if (resetBtn) {
        resetBtn.disabled = false;
        resetBtn.innerHTML = origHtml;
      }
    }
  }

  // ============================================================
  // 17. STEP 7: DOWNLOAD MY DATA HANDLER
  // ============================================================
  async function handleDownloadMyData() {
    const btn = document.getElementById("btnDownloadMyData");
    const feedbackBox = document.getElementById("downloadDataFeedback");

    if (feedbackBox) {
      feedbackBox.classList.add("hidden");
      feedbackBox.textContent = "";
      feedbackBox.className = "security-feedback-box hidden";
    }

    const token = getCleanToken();
    if (!token) {
      showToast("Authentication Required", "Please log in to download your account data.", "error");
      return;
    }

    const originalBtnHtml = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing download...`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/customer/account/download-data`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        let errorMsg = "Unable to download account data. Please try again.";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch (e) {}

        if (feedbackBox) {
          feedbackBox.textContent = errorMsg;
          feedbackBox.className = "security-feedback-box error";
          feedbackBox.classList.remove("hidden");
        }
        showToast("Download Failed", errorMsg, "error");
        return;
      }

      // Extract filename from Content-Disposition header if present
      let filename = "";
      const disposition = response.headers.get("Content-Disposition");
      if (disposition && disposition.indexOf("filename=") !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }

      if (!filename) {
        const todayStr = new Date().toISOString().split("T")[0];
        filename = `buildbid-my-data-${todayStr}.json`;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      if (feedbackBox) {
        feedbackBox.textContent = "Your BuildBid account data has been downloaded successfully.";
        feedbackBox.className = "security-feedback-box success";
        feedbackBox.classList.remove("hidden");
      }
      showToast("Download Complete", "Your account data file has been downloaded successfully.", "success");

    } catch (err) {
      console.error("Data download error:", err);
      const genericMsg = "A network error occurred while preparing your download. Please try again.";
      if (feedbackBox) {
        feedbackBox.textContent = genericMsg;
        feedbackBox.className = "security-feedback-box error";
        feedbackBox.classList.remove("hidden");
      }
      showToast("Download Error", genericMsg, "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
      }
    }
  }

  // ============================================================
  // 15. SECTION 8: ACCOUNT DEACTIVATION / PERMANENT DELETION
  // ============================================================
  let deactStatusData = null;
  let deleteCurrentStep = 1;
  let deletionAuthTicket = null;
  let deleteExpiryInterval = null;
  let deleteResendInterval = null;

  async function fetchAccountDeactivationStatus() {
    const token = getToken();
    if (!token) return;

    const statePill = document.getElementById("deactAccountStatePill");
    const emailPill = document.getElementById("deactEmailStatusPill");
    const phonePill = document.getElementById("deactPhoneStatusPill");

    try {
      const resp = await fetch("/api/customer/account/status", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (!resp.ok) {
        throw new Error("Failed to load account status");
      }

      const data = await resp.json();
      deactStatusData = data;

      // Update pills
      if (statePill) {
        if (data.status === "ACTIVE") {
          statePill.className = "status-strip-pill active";
          statePill.innerHTML = '<i class="fa-solid fa-circle-check"></i> Active';
        } else if (data.status === "DEACTIVATED") {
          statePill.className = "status-strip-pill deactivated";
          statePill.innerHTML = '<i class="fa-solid fa-pause"></i> Deactivated';
        } else {
          statePill.className = "status-strip-pill deleted";
          statePill.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + (data.status || "Unknown");
        }
      }

      if (emailPill) {
        if (data.emailVerified) {
          emailPill.className = "status-strip-pill verified";
          emailPill.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verified';
        } else {
          emailPill.className = "status-strip-pill unverified";
          emailPill.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Unverified';
        }
      }

      if (phonePill) {
        if (data.phoneVerified) {
          phonePill.className = "status-strip-pill verified";
          phonePill.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verified';
        } else {
          phonePill.className = "status-strip-pill unverified";
          phonePill.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Unverified';
        }
      }

      // Sync Screen 1 modal status elements
      updateDeletionScreen1Status(data);

    } catch (err) {
      console.error("fetchAccountDeactivationStatus error:", err);
    }
  }

  function updateDeletionScreen1Status(data) {
    const s1EmailStatus = document.getElementById("screen1EmailStatus");
    const s1EmailBadge = document.getElementById("screen1EmailBadge");
    const s1PhoneStatus = document.getElementById("screen1PhoneStatus");
    const s1PhoneBadge = document.getElementById("screen1PhoneBadge");
    const btnProceed = document.getElementById("btnProceedToScreen2");
    const s1Feedback = document.getElementById("deleteScreen1Feedback");

    if (s1EmailStatus && s1EmailBadge) {
      if (data && data.emailVerified) {
        s1EmailStatus.textContent = data.email ? `${data.email} (Verified)` : "Verified";
        s1EmailBadge.className = "channel-badge verified";
        s1EmailBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verified';
      } else {
        s1EmailStatus.textContent = data && data.email ? `${data.email} (Unverified)` : "Unverified";
        s1EmailBadge.className = "channel-badge unverified";
        s1EmailBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Required';
      }
    }

    if (s1PhoneStatus && s1PhoneBadge) {
      if (data && data.phoneVerified) {
        s1PhoneStatus.textContent = data.phone ? `${data.phone} (Verified)` : "Verified";
        s1PhoneBadge.className = "channel-badge verified";
        s1PhoneBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verified';
      } else {
        s1PhoneStatus.textContent = data && data.phone ? `${data.phone} (Unverified)` : "Unverified";
        s1PhoneBadge.className = "channel-badge unverified";
        s1PhoneBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Required';
      }
    }

    if (btnProceed) {
      if (data && data.eligibleForDeletion) {
        btnProceed.disabled = false;
        if (s1Feedback) {
          s1Feedback.classList.add("hidden");
          s1Feedback.textContent = "";
        }
      } else {
        btnProceed.disabled = true;
        if (s1Feedback) {
          s1Feedback.textContent = "Permanent deletion requires having BOTH a verified email and a verified mobile number. Please complete verification in Step 2 before initiating deletion.";
          s1Feedback.className = "security-feedback-box error";
          s1Feedback.classList.remove("hidden");
        }
      }
    }
  }

  // Deactivation Modal
  function openDeactivateModal() {
    const modal = document.getElementById("deactivateAccountModal");
    const pwdInput = document.getElementById("deactivatePasswordInput");
    const fbBox = document.getElementById("deactivateFeedbackBox");
    const btn = document.getElementById("btnConfirmDeactivateAccount");

    if (pwdInput) pwdInput.value = "";
    if (fbBox) {
      fbBox.classList.add("hidden");
      fbBox.textContent = "";
      fbBox.className = "security-feedback-box hidden";
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-pause"></i> Deactivate Account';
    }
    if (modal) modal.classList.remove("hidden");
  }

  function closeDeactivateModal() {
    const modal = document.getElementById("deactivateAccountModal");
    if (modal) modal.classList.add("hidden");
  }

  async function handleConfirmDeactivateAccount() {
    const token = getToken();
    if (!token) return;

    const pwdInput = document.getElementById("deactivatePasswordInput");
    const fbBox = document.getElementById("deactivateFeedbackBox");
    const btn = document.getElementById("btnConfirmDeactivateAccount");

    const password = pwdInput ? pwdInput.value.trim() : "";
    if (!password) {
      if (fbBox) {
        fbBox.textContent = "Please enter your current account password to confirm deactivation.";
        fbBox.className = "security-feedback-box error";
        fbBox.classList.remove("hidden");
      }
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deactivating...';
      }

      const resp = await fetch("/api/customer/account/deactivate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ currentPassword: password })
      });

      const data = await resp.json();

      if (!resp.ok) {
        const errorMsg = data && data.message ? data.message : "Failed to deactivate account.";
        if (fbBox) {
          fbBox.textContent = errorMsg;
          fbBox.className = "security-feedback-box error";
          fbBox.classList.remove("hidden");
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-pause"></i> Deactivate Account';
        }
        return;
      }

      if (fbBox) {
        fbBox.textContent = data.message || "Account deactivated successfully. Logging out...";
        fbBox.className = "security-feedback-box success";
        fbBox.classList.remove("hidden");
      }
      showToast("Account Deactivated", "Your account has been deactivated. Logging out now...", "info");

      // Invalidate frontend auth and redirect
      setTimeout(() => {
        try {
          localStorage.removeItem("jwt_token");
          localStorage.removeItem("token");
          localStorage.removeItem("authToken");
          localStorage.removeItem("currentUser");
          localStorage.removeItem("customerUser");
          sessionStorage.clear();
        } catch (e) {}
        window.location.href = "index.html";
      }, 2000);

    } catch (err) {
      console.error("handleConfirmDeactivateAccount error:", err);
      if (fbBox) {
        fbBox.textContent = "A network error occurred. Please check your connection and try again.";
        fbBox.className = "security-feedback-box error";
        fbBox.classList.remove("hidden");
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-pause"></i> Deactivate Account';
      }
    }
  }

  // Multi-Step Permanent Deletion Modal
  function setDeleteModalStep(step) {
    deleteCurrentStep = step;

    const modalTitle = document.getElementById("deleteModalTitle");
    const modalSubtitle = document.getElementById("deleteModalSubtitle");

    const stepTitles = {
      1: { title: "Permanent Account Deletion", subtitle: "Step 1 of 4: Prerequisites & Notice" },
      2: { title: "Permanent Account Deletion", subtitle: "Step 2 of 4: Password & Explicit Confirmation" },
      3: { title: "Dual-Channel OTP Verification", subtitle: "Step 3 of 4: Enter 6-digit verification code" },
      4: { title: "Permanent Account Deletion", subtitle: "Step 4 of 4: Final Confirmation" }
    };

    if (modalTitle) modalTitle.textContent = stepTitles[step].title;
    if (modalSubtitle) modalSubtitle.textContent = stepTitles[step].subtitle;

    // Step indicators
    for (let i = 1; i <= 4; i++) {
      const ind = document.getElementById(`stepInd${i}`);
      if (ind) {
        ind.classList.remove("active", "completed");
        if (i < step) {
          ind.classList.add("completed");
        } else if (i === step) {
          ind.classList.add("active");
        }
      }
    }

    // Screens
    for (let i = 1; i <= 4; i++) {
      const screen = document.getElementById(`deleteScreen${i}`);
      const footer = document.getElementById(`screen${i}Footer`);
      if (screen) {
        if (i === step) screen.classList.remove("hidden");
        else screen.classList.add("hidden");
      }
      if (footer) {
        if (i === step) footer.classList.remove("hidden");
        else footer.classList.add("hidden");
      }
    }
  }

  function openPermanentDeleteModal() {
    const modal = document.getElementById("permanentDeleteModal");
    if (!modal) return;

    // Reset fields
    const pwdInput = document.getElementById("deleteCurrentPasswordInput");
    const wordInput = document.getElementById("deleteConfirmWordInput");
    if (pwdInput) pwdInput.value = "";
    if (wordInput) wordInput.value = "";

    clearOtpInputs("deleteOtpDigitsContainer");

    // Hide feedbacks
    ["deleteScreen1Feedback", "deleteScreen2Feedback", "deleteScreen3Feedback", "deleteScreen4Feedback"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("hidden");
        el.textContent = "";
        el.className = "security-feedback-box hidden";
      }
    });

    stopDeletionTimers();
    deletionAuthTicket = null;

    setDeleteModalStep(1);
    modal.classList.remove("hidden");

    // Refresh status
    fetchAccountDeactivationStatus();
  }

  function closePermanentDeleteModal() {
    const modal = document.getElementById("permanentDeleteModal");
    if (modal) modal.classList.add("hidden");
    stopDeletionTimers();
    deletionAuthTicket = null;
  }

  function stopDeletionTimers() {
    if (deleteExpiryInterval) {
      clearInterval(deleteExpiryInterval);
      deleteExpiryInterval = null;
    }
    if (deleteResendInterval) {
      clearInterval(deleteResendInterval);
      deleteResendInterval = null;
    }
  }

  function startDeletionResendTimer(cooldownSeconds = 60) {
    if (deleteResendInterval) clearInterval(deleteResendInterval);

    const resendBtn = document.getElementById("btnResendDeletionOtp");
    let remaining = cooldownSeconds;

    if (resendBtn) {
      resendBtn.disabled = true;
      resendBtn.innerHTML = `Resend OTP (<span id="deleteResendCountdown">${remaining}</span>s)`;
    }

    deleteResendInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(deleteResendInterval);
        deleteResendInterval = null;
        if (resendBtn) {
          resendBtn.disabled = false;
          resendBtn.textContent = "Resend OTP";
        }
      } else {
        if (resendBtn) {
          resendBtn.innerHTML = `Resend OTP (<span id="deleteResendCountdown">${remaining}</span>s)`;
        }
      }
    }, 1000);
  }

  function startDeletionExpiryTimer(durationSeconds = 600) {
    if (deleteExpiryInterval) clearInterval(deleteExpiryInterval);

    const countStrong = document.getElementById("deleteExpiryCount");
    const fbBox = document.getElementById("deleteScreen3Feedback");
    const verifyBtn = document.getElementById("btnVerifyDeletionOtp");
    let remaining = durationSeconds;

    function formatTime(s) {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }

    if (countStrong) countStrong.textContent = formatTime(remaining);

    deleteExpiryInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(deleteExpiryInterval);
        deleteExpiryInterval = null;
        if (countStrong) countStrong.textContent = "00:00 (Expired)";
        if (verifyBtn) verifyBtn.disabled = true;
        if (fbBox) {
          fbBox.textContent = "Verification OTP has expired. Please click Resend OTP to request a new code.";
          fbBox.className = "security-feedback-box error";
          fbBox.classList.remove("hidden");
        }
      } else {
        if (countStrong) countStrong.textContent = formatTime(remaining);
      }
    }, 1000);
  }

  async function handleSendDeletionOtp() {
    const token = getToken();
    if (!token) return;

    const pwdInput = document.getElementById("deleteCurrentPasswordInput");
    const wordInput = document.getElementById("deleteConfirmWordInput");
    const fbBox = document.getElementById("deleteScreen2Feedback");
    const btn = document.getElementById("btnSendDeletionOtp");

    const password = pwdInput ? pwdInput.value.trim() : "";
    const word = wordInput ? wordInput.value.trim() : "";

    if (word !== "DELETE") {
      if (fbBox) {
        fbBox.textContent = 'Please type exact uppercase "DELETE" to confirm.';
        fbBox.className = "security-feedback-box error";
        fbBox.classList.remove("hidden");
      }
      return;
    }

    if (!password) {
      if (fbBox) {
        fbBox.textContent = "Please enter your current account password.";
        fbBox.className = "security-feedback-box error";
        fbBox.classList.remove("hidden");
      }
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching OTPs...';
      }
      if (fbBox) fbBox.classList.add("hidden");

      const resp = await fetch("/api/customer/account/delete/start", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          confirmText: word,
          currentPassword: password
        })
      });

      const data = await resp.json();

      if (!resp.ok) {
        const errorMsg = data && data.message ? data.message : "Failed to initiate deletion verification.";
        if (fbBox) {
          fbBox.textContent = errorMsg;
          fbBox.className = "security-feedback-box error";
          fbBox.classList.remove("hidden");
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Deletion OTP';
        }
        return;
      }

      // Success: move to Screen 3
      setDeleteModalStep(3);

      // Setup digit inputs
      setupOtpDigitInputs("deleteOtpDigitsContainer", (otpCode) => {
        if (otpCode.length === 6) {
          handleVerifyDeletionOtp();
        }
      });

      clearOtpInputs("deleteOtpDigitsContainer");
      const firstDigit = document.querySelector("#deleteOtpDigitsContainer .otp-digit-input");
      if (firstDigit) firstDigit.focus();

      // Start timers
      startDeletionResendTimer(60);
      startDeletionExpiryTimer(600);

      const s3Feedback = document.getElementById("deleteScreen3Feedback");
      if (s3Feedback) {
        s3Feedback.textContent = data.message || "A 6-digit verification code has been dispatched to both your verified email and mobile number.";
        s3Feedback.className = "security-feedback-box success";
        s3Feedback.classList.remove("hidden");
      }

    } catch (err) {
      console.error("handleSendDeletionOtp error:", err);
      if (fbBox) {
        fbBox.textContent = "A network error occurred. Please try again.";
        fbBox.className = "security-feedback-box error";
        fbBox.classList.remove("hidden");
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Deletion OTP';
      }
    }
  }

  async function handleResendDeletionOtp() {
    const token = getToken();
    if (!token) return;

    const resendBtn = document.getElementById("btnResendDeletionOtp");
    const fbBox = document.getElementById("deleteScreen3Feedback");
    const verifyBtn = document.getElementById("btnVerifyDeletionOtp");

    try {
      if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resending...';
      }

      const resp = await fetch("/api/customer/account/delete/resend-otp", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      const data = await resp.json();

      if (!resp.ok) {
        const errorMsg = data && data.message ? data.message : "Failed to resend OTP.";
        if (fbBox) {
          fbBox.textContent = errorMsg;
          fbBox.className = "security-feedback-box error";
          fbBox.classList.remove("hidden");
        }
        if (resendBtn) {
          resendBtn.disabled = false;
          resendBtn.textContent = "Resend OTP";
        }
        return;
      }

      // Reset digit boxes
      clearOtpInputs("deleteOtpDigitsContainer");
      const firstDigit = document.querySelector("#deleteOtpDigitsContainer .otp-digit-input");
      if (firstDigit) firstDigit.focus();

      if (verifyBtn) verifyBtn.disabled = false;

      // Restart timers
      startDeletionResendTimer(60);
      startDeletionExpiryTimer(600);

      if (fbBox) {
        fbBox.textContent = data.message || "A new 6-digit OTP has been dispatched to both your email and mobile.";
        fbBox.className = "security-feedback-box success";
        fbBox.classList.remove("hidden");
      }

    } catch (err) {
      console.error("handleResendDeletionOtp error:", err);
      if (fbBox) {
        fbBox.textContent = "Failed to resend OTP due to a network error.";
        fbBox.className = "security-feedback-box error";
        fbBox.classList.remove("hidden");
      }
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend OTP";
      }
    }
  }

  async function handleVerifyDeletionOtp() {
    const token = getToken();
    if (!token) return;

    const otpCode = getOtpValue("deleteOtpDigitsContainer");
    const fbBox = document.getElementById("deleteScreen3Feedback");
    const btn = document.getElementById("btnVerifyDeletionOtp");

    if (otpCode.length !== 6) {
      if (fbBox) {
        fbBox.textContent = "Please enter the complete 6-digit verification code.";
        fbBox.className = "security-feedback-box error";
        fbBox.classList.remove("hidden");
      }
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
      }

      const resp = await fetch("/api/customer/account/delete/verify-otp", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ otp: otpCode })
      });

      const data = await resp.json();

      if (!resp.ok) {
        const errorMsg = data && data.message ? data.message : "Invalid or expired verification code.";
        if (fbBox) {
          fbBox.textContent = errorMsg;
          fbBox.className = "security-feedback-box error";
          fbBox.classList.remove("hidden");
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify OTP &amp; Authorize';
        }
        return;
      }

      // Success: store ticket and advance to Screen 4
      deletionAuthTicket = data.authorizationTicket;
      stopDeletionTimers();

      setDeleteModalStep(4);

      const s4Feedback = document.getElementById("deleteScreen4Feedback");
      if (s4Feedback) {
        s4Feedback.textContent = data.message || "OTP verified successfully. You may now permanently finalize deletion.";
        s4Feedback.className = "security-feedback-box success";
        s4Feedback.classList.remove("hidden");
      }

    } catch (err) {
      console.error("handleVerifyDeletionOtp error:", err);
      if (fbBox) {
        fbBox.textContent = "Verification failed due to a network error. Please try again.";
        fbBox.className = "security-feedback-box error";
        fbBox.classList.remove("hidden");
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify OTP &amp; Authorize';
      }
    }
  }

  async function handleFinalizePermanentDeletion() {
    const token = getToken();
    if (!token) return;

    if (!deletionAuthTicket) {
      showToast("Security Check Failed", "Missing authorization ticket. Please verify OTP first.", "error");
      setDeleteModalStep(1);
      return;
    }

    const fbBox = document.getElementById("deleteScreen4Feedback");
    const btn = document.getElementById("btnFinalizePermanentDeletion");

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Permanently Deleting Account...';
      }

      const resp = await fetch("/api/customer/account/delete/confirm", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          confirmText: "DELETE",
          authorizationTicket: deletionAuthTicket
        })
      });

      const data = await resp.json();

      if (!resp.ok) {
        const errorMsg = data && data.message ? data.message : "Permanent deletion could not be executed.";
        if (fbBox) {
          fbBox.textContent = errorMsg;
          fbBox.className = "security-feedback-box error";
          fbBox.classList.remove("hidden");
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Permanently Delete My Account Now';
        }
        return;
      }

      // Success! Account is deleted!
      if (fbBox) {
        fbBox.textContent = data.message || "Account permanently deleted. Logging out...";
        fbBox.className = "security-feedback-box success";
        fbBox.classList.remove("hidden");
      }

      showToast("Account Deleted", "Your BuildBid account has been permanently removed.", "success");

      // Invalidate all client-side auth tokens and user data
      setTimeout(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {}
        window.location.href = "index.html";
      }, 2500);

    } catch (err) {
      console.error("handleFinalizePermanentDeletion error:", err);
      if (fbBox) {
        fbBox.textContent = "Failed to finalize deletion due to a network error.";
        fbBox.className = "security-feedback-box error";
        fbBox.classList.remove("hidden");
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Permanently Delete My Account Now';
      }
    }
  }

  function initAccountDeactivationAndDeletionHandlers() {
    // Buttons to open modals
    const btnOpenDeactivate = document.getElementById("btnOpenDeactivateModal");
    if (btnOpenDeactivate) {
      btnOpenDeactivate.addEventListener("click", openDeactivateModal);
    }

    const btnOpenDelete = document.getElementById("btnOpenDeleteModal");
    if (btnOpenDelete) {
      btnOpenDelete.addEventListener("click", openPermanentDeleteModal);
    }

    // Deactivation modal buttons
    const btnCloseDeact = document.getElementById("btnCloseDeactivateModal");
    if (btnCloseDeact) {
      btnCloseDeact.addEventListener("click", closeDeactivateModal);
    }

    const btnCancelDeact = document.getElementById("btnCancelDeactivateAccount");
    if (btnCancelDeact) {
      btnCancelDeact.addEventListener("click", closeDeactivateModal);
    }

    const btnConfirmDeact = document.getElementById("btnConfirmDeactivateAccount");
    if (btnConfirmDeact) {
      btnConfirmDeact.addEventListener("click", handleConfirmDeactivateAccount);
    }

    // Permanent Deletion modal buttons
    const btnCloseDelete = document.getElementById("btnCloseDeleteModal");
    if (btnCloseDelete) {
      btnCloseDelete.addEventListener("click", closePermanentDeleteModal);
    }

    const cancelButtons = document.querySelectorAll(".btn-cancel-delete");
    cancelButtons.forEach(btn => {
      btn.addEventListener("click", closePermanentDeleteModal);
    });

    const btnProceedS2 = document.getElementById("btnProceedToScreen2");
    if (btnProceedS2) {
      btnProceedS2.addEventListener("click", () => setDeleteModalStep(2));
    }

    const btnBackS1 = document.getElementById("btnBackToScreen1");
    if (btnBackS1) {
      btnBackS1.addEventListener("click", () => setDeleteModalStep(1));
    }

    const btnSendOtp = document.getElementById("btnSendDeletionOtp");
    if (btnSendOtp) {
      btnSendOtp.addEventListener("click", handleSendDeletionOtp);
    }

    const btnResendOtp = document.getElementById("btnResendDeletionOtp");
    if (btnResendOtp) {
      btnResendOtp.addEventListener("click", handleResendDeletionOtp);
    }

    const btnVerifyOtp = document.getElementById("btnVerifyDeletionOtp");
    if (btnVerifyOtp) {
      btnVerifyOtp.addEventListener("click", handleVerifyDeletionOtp);
    }

    const btnFinalizeDelete = document.getElementById("btnFinalizePermanentDeletion");
    if (btnFinalizeDelete) {
      btnFinalizeDelete.addEventListener("click", handleFinalizePermanentDeletion);
    }
  }

  // ============================================================
  // 14. UPCOMING SECTIONS CLICK HANDLER
  // ============================================================
  function setupUpcomingMenuHandlers() {
    const upcomingLinks = document.querySelectorAll(".settings-menu-item.upcoming");
    upcomingLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const sectionName = link.getAttribute("data-section-name") || "This section";
        showToast("Coming Soon", `${sectionName} will be available in the upcoming update.`, "info");
      });
    });
  }

  // ============================================================
  // 13. INITIALIZATION ON DOMContentLoaded
  // ============================================================
  document.addEventListener("DOMContentLoaded", () => {
    // 1. Role Guard
    if (!enforceCustomerRoleGuard()) return;

    // 2. Fetch and render initial profile data
    fetchCustomerProfile();

    // 3. Tab switching between Personal Info, Verification & Security
    const navPersonalInfo = document.querySelector('.settings-menu-item[data-section="personal-info"]');
    if (navPersonalInfo) {
      navPersonalInfo.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("personal-info");
      });
    }

    const navVerification = document.getElementById("navEmailMobileVerification");
    if (navVerification) {
      navVerification.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("verification");
      });
    }

    const navSecurity = document.getElementById("navSecurityLogin");
    if (navSecurity) {
      navSecurity.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("security");
      });
    }

    const navConstructionPreferences = document.getElementById("navConstructionPreferences");
    if (navConstructionPreferences) {
      navConstructionPreferences.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("construction-preferences");
      });
    }

    const navSavedLocations = document.getElementById("navSavedLocations");
    if (navSavedLocations) {
      navSavedLocations.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("saved-locations");
      });
    }

    const navRegionalPreferences = document.getElementById("navRegionalPreferences");
    if (navRegionalPreferences) {
      navRegionalPreferences.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("regional-preferences");
      });
    }

    const navDownloadData = document.getElementById("navDownloadData");
    if (navDownloadData) {
      navDownloadData.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("download-data");
      });
    }

    const navAccountDeactivation = document.getElementById("navAccountDeactivation");
    if (navAccountDeactivation) {
      navAccountDeactivation.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("account-deactivation");
      });
    }

    const linkDeactGoToVerif = document.getElementById("linkDeactGoToVerif");
    if (linkDeactGoToVerif) {
      linkDeactGoToVerif.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("verification");
      });
    }

    const linkGoToEmailVerif = document.getElementById("linkGoToEmailVerif");
    if (linkGoToEmailVerif) {
      linkGoToEmailVerif.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("verification");
      });
    }

    const linkGoToPhoneVerif = document.getElementById("linkGoToPhoneVerif");
    if (linkGoToPhoneVerif) {
      linkGoToPhoneVerif.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("verification");
      });
    }

    // Hash deep linking
    if (window.location.hash === "#verification") {
      switchTab("verification");
    } else if (window.location.hash === "#security") {
      switchTab("security");
    } else if (window.location.hash === "#construction-preferences") {
      switchTab("construction-preferences");
    } else if (window.location.hash === "#saved-locations") {
      switchTab("saved-locations");
    } else if (window.location.hash === "#regional-preferences") {
      switchTab("regional-preferences");
    } else if (window.location.hash === "#download-data") {
      switchTab("download-data");
    } else if (window.location.hash === "#account-deactivation") {
      switchTab("account-deactivation");
    }

    // 4. Photo trigger & file change
    const uploadTriggerBtn = document.getElementById("uploadPhotoBtn");
    const fileInput = document.getElementById("profilePhotoFileInput");
    if (uploadTriggerBtn && fileInput) {
      uploadTriggerBtn.addEventListener("click", () => {
        fileInput.click();
      });
      fileInput.addEventListener("change", handlePhotoSelection);
    }

    // 5. Photo removal button
    const removePhotoBtn = document.getElementById("removePhotoBtn");
    if (removePhotoBtn) {
      removePhotoBtn.addEventListener("click", handlePhotoRemoval);
    }

    // 6. Form submission
    const form = document.getElementById("personalInfoForm");
    if (form) {
      form.addEventListener("submit", handleProfileSubmit);
    }

    // 7. Discard changes button
    const discardBtn = document.getElementById("discardChangesBtn");
    if (discardBtn) {
      discardBtn.addEventListener("click", handleDiscardChanges);
    }

    // 8. Toast close button
    const toastCloseBtn = document.getElementById("toastCloseBtn");
    if (toastCloseBtn) {
      toastCloseBtn.addEventListener("click", hideToast);
    }

    // 9. Setup OTP Digits Inputs
    setupOtpDigitInputs("emailOtpInputsContainer", () => submitEmailOtp());
    setupOtpDigitInputs("phoneOtpInputsContainer", () => submitPhoneOtp());

    // 10. Email Verification Buttons
    const btnTriggerEmailVerify = document.getElementById("btnTriggerEmailVerify");
    if (btnTriggerEmailVerify) {
      btnTriggerEmailVerify.addEventListener("click", triggerSendEmailOtp);
    }

    const btnSubmitEmailOtp = document.getElementById("btnSubmitEmailOtp");
    if (btnSubmitEmailOtp) {
      btnSubmitEmailOtp.addEventListener("click", submitEmailOtp);
    }

    const btnResendEmailOtp = document.getElementById("btnResendEmailOtp");
    if (btnResendEmailOtp) {
      btnResendEmailOtp.addEventListener("click", triggerSendEmailOtp);
    }

    const btnCancelEmailOtp = document.getElementById("btnCancelEmailOtp");
    if (btnCancelEmailOtp) {
      btnCancelEmailOtp.addEventListener("click", () => {
        const sec = document.getElementById("emailOtpSection");
        if (sec) sec.classList.add("hidden");
        clearOtpInputs("emailOtpInputsContainer");
        clearOtpFeedback("emailOtpFeedback");
      });
    }

    const btnTriggerEmailChange = document.getElementById("btnTriggerEmailChange");
    if (btnTriggerEmailChange) {
      btnTriggerEmailChange.addEventListener("click", () => {
        const chgSec = document.getElementById("emailChangeSection");
        const otpSec = document.getElementById("emailOtpSection");
        if (otpSec) otpSec.classList.add("hidden");
        if (chgSec) chgSec.classList.remove("hidden");
        const inp = document.getElementById("changeNewEmailInput");
        if (inp) { inp.value = ""; inp.focus(); }
        const err = document.getElementById("changeNewEmailError");
        if (err) err.textContent = "";
      });
    }

    const btnSubmitEmailChangeReq = document.getElementById("btnSubmitEmailChangeReq");
    if (btnSubmitEmailChangeReq) {
      btnSubmitEmailChangeReq.addEventListener("click", submitEmailChangeRequest);
    }

    const btnCancelEmailChange = document.getElementById("btnCancelEmailChange");
    if (btnCancelEmailChange) {
      btnCancelEmailChange.addEventListener("click", () => {
        const chgSec = document.getElementById("emailChangeSection");
        if (chgSec) chgSec.classList.add("hidden");
      });
    }

    // 11. Phone Verification Buttons
    const btnTriggerPhoneVerify = document.getElementById("btnTriggerPhoneVerify");
    if (btnTriggerPhoneVerify) {
      btnTriggerPhoneVerify.addEventListener("click", triggerSendPhoneOtp);
    }

    const btnSubmitPhoneOtp = document.getElementById("btnSubmitPhoneOtp");
    if (btnSubmitPhoneOtp) {
      btnSubmitPhoneOtp.addEventListener("click", submitPhoneOtp);
    }

    const btnResendPhoneOtp = document.getElementById("btnResendPhoneOtp");
    if (btnResendPhoneOtp) {
      btnResendPhoneOtp.addEventListener("click", triggerSendPhoneOtp);
    }

    const btnCancelPhoneOtp = document.getElementById("btnCancelPhoneOtp");
    if (btnCancelPhoneOtp) {
      btnCancelPhoneOtp.addEventListener("click", () => {
        const sec = document.getElementById("phoneOtpSection");
        if (sec) sec.classList.add("hidden");
        clearOtpInputs("phoneOtpInputsContainer");
        clearOtpFeedback("phoneOtpFeedback");
      });
    }

    const btnTriggerPhoneChange = document.getElementById("btnTriggerPhoneChange");
    if (btnTriggerPhoneChange) {
      btnTriggerPhoneChange.addEventListener("click", () => {
        const chgSec = document.getElementById("phoneChangeSection");
        const otpSec = document.getElementById("phoneOtpSection");
        if (otpSec) otpSec.classList.add("hidden");
        if (chgSec) chgSec.classList.remove("hidden");
        const inp = document.getElementById("changeNewPhoneInput");
        if (inp) { inp.value = ""; inp.focus(); }
        const err = document.getElementById("changeNewPhoneError");
        if (err) err.textContent = "";
      });
    }

    const btnSubmitPhoneChangeReq = document.getElementById("btnSubmitPhoneChangeReq");
    if (btnSubmitPhoneChangeReq) {
      btnSubmitPhoneChangeReq.addEventListener("click", submitPhoneChangeRequest);
    }

    // 12. Step 3: Security & Login Handlers
    setupPasswordToggleButtons();
    setupPasswordLiveValidation();

    const changePasswordForm = document.getElementById("changePasswordForm");
    if (changePasswordForm) {
      changePasswordForm.addEventListener("submit", handlePasswordChangeSubmit);
    }

    const btnCancelPasswordChange = document.getElementById("btnCancelPasswordChange");
    if (btnCancelPasswordChange) {
      btnCancelPasswordChange.addEventListener("click", (e) => {
        e.preventDefault();
        resetPasswordFormFields();
      });
    }

    const btnRevokeAllSessions = document.getElementById("btnRevokeAllSessions");
    if (btnRevokeAllSessions) {
      btnRevokeAllSessions.addEventListener("click", handleRevokeAllSessions);
    }

    // 13. Step 4: Construction Preferences Handlers
    const constructionPreferencesForm = document.getElementById("constructionPreferencesForm");
    if (constructionPreferencesForm) {
      constructionPreferencesForm.addEventListener("submit", handlePreferencesSubmit);
    }

    const btnResetPreferences = document.getElementById("btnResetPreferences");
    if (btnResetPreferences) {
      btnResetPreferences.addEventListener("click", handlePreferencesReset);
    }

    // 15. Step 5: Saved Locations Event Listeners
    const btnOpenAddLocationForm = document.getElementById("btnOpenAddLocationForm");
    if (btnOpenAddLocationForm) {
      btnOpenAddLocationForm.addEventListener("click", openAddLocationForm);
    }

    const btnEmptyAddLocation = document.getElementById("btnEmptyAddLocation");
    if (btnEmptyAddLocation) {
      btnEmptyAddLocation.addEventListener("click", openAddLocationForm);
    }

    const btnCloseLocForm = document.getElementById("btnCloseLocForm");
    if (btnCloseLocForm) {
      btnCloseLocForm.addEventListener("click", closeLocationForm);
    }

    const btnCancelLocationForm = document.getElementById("btnCancelLocationForm");
    if (btnCancelLocationForm) {
      btnCancelLocationForm.addEventListener("click", closeLocationForm);
    }

    const presetPills = document.querySelectorAll(".loc-pill-btn");
    presetPills.forEach(pill => {
      pill.addEventListener("click", () => {
        const val = pill.getAttribute("data-preset");
        const locLabelInput = document.getElementById("locLabel");
        if (locLabelInput && val) {
          locLabelInput.value = val;
          locLabelInput.focus();
        }
      });
    });

    const savedLocationForm = document.getElementById("savedLocationForm");
    if (savedLocationForm) {
      savedLocationForm.addEventListener("submit", handleLocationFormSubmit);
    }

    const listContainer = document.getElementById("savedLocationsListContainer");
    if (listContainer) {
      listContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("button.btn-location-action");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");

        if (action === "default") {
          handleSetDefaultLocation(id);
        } else if (action === "edit") {
          openEditLocationForm(id);
        } else if (action === "delete") {
          const label = btn.getAttribute("data-label") || "this location";
          openDeleteLocationModal(id, label);
        }
      });
    }

    const btnConfirmDelete = document.getElementById("btnConfirmDeleteLocation");
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener("click", handleConfirmDeleteLocation);
    }

    const btnCancelDelete = document.getElementById("btnCancelDeleteLocation");
    if (btnCancelDelete) {
      btnCancelDelete.addEventListener("click", closeDeleteLocationModal);
    }

    const btnCancelDeleteX = document.getElementById("btnCancelDeleteModalX");
    if (btnCancelDeleteX) {
      btnCancelDeleteX.addEventListener("click", closeDeleteLocationModal);
    }

    // 16. Step 6: Language & Regional Preferences Handlers
    const regionalPreferencesForm = document.getElementById("regionalPreferencesForm");
    if (regionalPreferencesForm) {
      regionalPreferencesForm.addEventListener("submit", handleRegionalPreferencesSubmit);
    }

    const btnResetRegionalPreferences = document.getElementById("btnResetRegionalPreferences");
    if (btnResetRegionalPreferences) {
      btnResetRegionalPreferences.addEventListener("click", handleRegionalPreferencesReset);
    }

    // 17. Step 7: Download My Data Handler
    const btnDownloadMyData = document.getElementById("btnDownloadMyData");
    if (btnDownloadMyData) {
      btnDownloadMyData.addEventListener("click", handleDownloadMyData);
    }

    // 18. Step 8: Account Deactivation / Deletion Handlers
    initAccountDeactivationAndDeletionHandlers();

    // 19. Upcoming menu clicks
    setupUpcomingMenuHandlers();
  });

})();
