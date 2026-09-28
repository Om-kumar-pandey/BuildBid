/**
 * BuildBid - Dedicated Customer Profile Edit Controller
 * File: customer-profile-edit.js
 * Strictly separated JavaScript logic for Customer Profile Edit
 */

(function () {
    "use strict";

    // ============================================================
    // 1. CONFIGURATION & TOKEN HELPERS
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
    let toastTimeout = null;
    let pendingPhotoData = null;
    let isPhotoRemoved = false;
    let currentUserProfile = null;

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
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // ============================================================
    // 2. TOAST NOTIFICATION UTILITY
    // ============================================================
    function showNotification(title, message, isError = false) {
        const toast = document.getElementById("statusToast");
        const titleEl = document.getElementById("toastTitle");
        const msgEl = document.getElementById("toastMessage");
        const iconEl = document.getElementById("toastIcon");

        if (!toast || !titleEl || !msgEl) return;

        if (toastTimeout) clearTimeout(toastTimeout);

        titleEl.textContent = title;
        msgEl.textContent = message;

        if (isError) {
            toast.classList.add("error");
            if (iconEl) iconEl.className = "fa-solid fa-triangle-exclamation";
        } else {
            toast.classList.remove("error");
            if (iconEl) iconEl.className = "fa-solid fa-check";
        }

        toast.classList.add("show");

        toastTimeout = setTimeout(() => {
            hideNotification();
        }, 4000);
    }

    function hideNotification() {
        const toast = document.getElementById("statusToast");
        if (toast) {
            toast.classList.remove("show");
        }
    }

    // ============================================================
    // 3. AUTHENTICATION & ROLE GUARDS
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
                console.warn("Failed to parse cached user for role check:", e);
            }
        }
        return true;
    }

    // ============================================================
    // 4. LOAD PROFILE FROM BACKEND
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
                showNotification("Session Expired", "Please login again.", true);
                setTimeout(() => { window.location.href = "index.html"; }, 1500);
                return;
            }

            if (response.status === 403) {
                showNotification("Access Denied", "Customer role is required to access this page.", true);
                setTimeout(() => { window.location.href = "index.html"; }, 2000);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const msg = errorData.error || "Failed to load customer profile.";
                showNotification("Error", msg, true);
                return;
            }

            const profile = await response.json();
            currentUserProfile = profile;
            populateFormWithProfile(profile);

        } catch (error) {
            console.error("Profile load error:", error);
            showNotification("Connection Error", "Could not connect to the backend server.", true);
        }
    }

    // ============================================================
    // 5. POPULATE FORM FIELDS
    // ============================================================
    function populateFormWithProfile(profile) {
        if (!profile) return;

        const fullNameInput = document.getElementById("fullNameInput");
        const emailInput = document.getElementById("emailInput");
        const phoneInput = document.getElementById("phoneInput");
        const addressInput = document.getElementById("addressInput");
        const cityInput = document.getElementById("cityInput");
        const stateInput = document.getElementById("stateInput");
        const pincodeInput = document.getElementById("pincodeInput");
        const aboutMeInput = document.getElementById("aboutMeInput");
        const languageSelect = document.getElementById("preferredLanguageSelect");

        if (fullNameInput) fullNameInput.value = profile.fullName || "";
        if (emailInput) emailInput.value = profile.email || "";
        if (phoneInput) phoneInput.value = profile.phone || "";
        if (addressInput) addressInput.value = profile.address || "";
        if (cityInput) cityInput.value = profile.city || "";
        if (stateInput) stateInput.value = profile.state || "";
        if (pincodeInput) pincodeInput.value = profile.pincode || "";
        if (aboutMeInput) aboutMeInput.value = profile.aboutMe || "";

        if (languageSelect && profile.preferredLanguage) {
            languageSelect.value = profile.preferredLanguage;
        }

        renderPhotoDisplay(profile.profilePhoto, profile.fullName || profile.username || "Customer");
    }

    // ============================================================
    // 6. PHOTO DISPLAY & PREVIEW HANDLERS
    // ============================================================
    function renderPhotoDisplay(photoUrl, name) {
        const previewImg = document.getElementById("photoPreviewImg");
        const initialsBadge = document.getElementById("photoInitialsBadge");
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

    function handleFileSelection(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        // Validation 1: Allowed MIME types
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            showNotification("Invalid File Format", "Please select a JPG, JPEG, PNG, or WEBP image.", true);
            event.target.value = "";
            return;
        }

        // Validation 2: Maximum file size 5MB
        const maxBytes = 5 * 1024 * 1024;
        if (file.size > maxBytes) {
            showNotification("File Too Large", "Image size must not exceed 5MB.", true);
            event.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            pendingPhotoData = e.target.result;
            isPhotoRemoved = false;

            const previewImg = document.getElementById("photoPreviewImg");
            const initialsBadge = document.getElementById("photoInitialsBadge");
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

            showNotification("Photo Selected", "Click 'Save Changes' to update your profile photo.");
        };

        reader.readAsDataURL(file);
    }

    function handleRemovePhoto() {
        pendingPhotoData = null;
        isPhotoRemoved = true;

        const fileInput = document.getElementById("profilePhotoFileInput");
        if (fileInput) fileInput.value = "";

        const nameInput = document.getElementById("fullNameInput");
        const currentName = nameInput ? nameInput.value : "Customer";

        renderPhotoDisplay(null, currentName);
        showNotification("Photo Removed", "Photo will be permanently removed once you save changes.");
    }

    // ============================================================
    // 7. FORM SUBMISSION & SAVE HANDLER
    // ============================================================
    async function handleFormSubmit(event) {
        event.preventDefault();

        const token = getCleanToken();
        if (!token) {
            window.location.href = "index.html";
            return;
        }

        const fullNameInput = document.getElementById("fullNameInput");
        const phoneInput = document.getElementById("phoneInput");
        const addressInput = document.getElementById("addressInput");
        const cityInput = document.getElementById("cityInput");
        const stateInput = document.getElementById("stateInput");
        const pincodeInput = document.getElementById("pincodeInput");
        const aboutMeInput = document.getElementById("aboutMeInput");
        const languageSelect = document.getElementById("preferredLanguageSelect");
        const saveBtn = document.getElementById("saveProfileBtn");

        const fullName = fullNameInput ? fullNameInput.value.trim() : "";
        const phone = phoneInput ? phoneInput.value.trim() : "";
        const address = addressInput ? addressInput.value.trim() : "";
        const city = cityInput ? cityInput.value.trim() : "";
        const state = stateInput ? stateInput.value.trim() : "";
        const pincode = pincodeInput ? pincodeInput.value.trim() : "";
        const aboutMe = aboutMeInput ? aboutMeInput.value.trim() : "";
        const preferredLanguage = languageSelect ? languageSelect.value : "English, Hindi";

        // Field validation
        const fullNameError = document.getElementById("fullNameError");
        const phoneError = document.getElementById("phoneError");
        if (fullNameError) fullNameError.textContent = "";
        if (phoneError) phoneError.textContent = "";

        if (!fullName) {
            if (fullNameError) fullNameError.textContent = "Full Name is required.";
            showNotification("Validation Error", "Full Name is required.", true);
            if (fullNameInput) fullNameInput.focus();
            return;
        }

        if (!phone) {
            if (phoneError) phoneError.textContent = "Phone number is required.";
            showNotification("Validation Error", "Phone number is required.", true);
            if (phoneInput) phoneInput.focus();
            return;
        }

        // Disable button & indicate loading
        const originalBtnHtml = saveBtn ? saveBtn.innerHTML : "Save Changes";
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
        }

        try {
            // Step A: Handle photo removal if requested
            if (isPhotoRemoved) {
                await fetch(`${API_BASE_URL}/api/customer/profile/photo`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
            }

            // Step B: Handle photo upload if a new photo was selected
            if (pendingPhotoData) {
                await fetch(`${API_BASE_URL}/api/customer/profile/photo`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ photo: pendingPhotoData })
                });
            }

            // Step C: Update profile fields
            const updatePayload = {
                fullName: fullName,
                phone: phone,
                address: address,
                city: city,
                state: state,
                pincode: pincode,
                aboutMe: aboutMe,
                preferredLanguage: preferredLanguage
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
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.error || "Failed to update profile. Please try again.";
                showNotification("Update Failed", errMsg, true);
                return;
            }

            const savedProfile = await response.json();

            // Step D: Update localStorage cached user object so dashboard syncs immediately
            const rawUser = localStorage.getItem("currentUser") || localStorage.getItem("customerUser");
            let localUser = {};
            if (rawUser) {
                try { localUser = JSON.parse(rawUser); } catch (e) {}
            }
            localUser.name = savedProfile.fullName || fullName;
            localUser.fullName = savedProfile.fullName || fullName;
            localUser.phone = savedProfile.phone || phone;
            localUser.location = savedProfile.city || city || localUser.location;
            if (savedProfile.profilePhoto) {
                localUser.avatarUrl = savedProfile.profilePhoto;
                localUser.profilePhotoUrl = savedProfile.profilePhoto;
            } else if (isPhotoRemoved) {
                delete localUser.avatarUrl;
                delete localUser.profilePhotoUrl;
            }

            localStorage.setItem("currentUser", JSON.stringify(localUser));
            localStorage.setItem("customerUser", JSON.stringify(localUser));

            showNotification("Success", "Profile updated successfully!");

            // Return to dashboard after brief toast display
            setTimeout(() => {
                window.location.href = "customer dashboard.html";
            }, 1200);

        } catch (error) {
            console.error("Save profile error:", error);
            showNotification("Error", "An unexpected error occurred while saving your profile.", true);
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnHtml;
            }
        }
    }

    // ============================================================
    // 8. EVENT LISTENERS INITIALIZATION
    // ============================================================
    document.addEventListener("DOMContentLoaded", () => {
        if (!enforceCustomerRoleGuard()) return;

        // Fetch and display initial profile data
        fetchCustomerProfile();

        // Photo upload trigger button
        const uploadTriggerBtn = document.getElementById("uploadPhotoTriggerBtn");
        const fileInput = document.getElementById("profilePhotoFileInput");
        if (uploadTriggerBtn && fileInput) {
            uploadTriggerBtn.addEventListener("click", () => {
                fileInput.click();
            });
            fileInput.addEventListener("change", handleFileSelection);
        }

        // Photo remove button
        const removePhotoBtn = document.getElementById("removePhotoBtn");
        if (removePhotoBtn) {
            removePhotoBtn.addEventListener("click", handleRemovePhoto);
        }

        // Form submit
        const profileForm = document.getElementById("customerProfileForm");
        if (profileForm) {
            profileForm.addEventListener("submit", handleFormSubmit);
        }

        // Cancel buttons
        const cancelBtn = document.getElementById("cancelEditBtn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                window.location.href = "customer dashboard.html";
            });
        }

        // Toast close button
        const toastCloseBtn = document.getElementById("toastCloseBtn");
        if (toastCloseBtn) {
            toastCloseBtn.addEventListener("click", hideNotification);
        }
    });

})();
