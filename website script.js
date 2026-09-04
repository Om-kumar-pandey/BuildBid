// ============================================================
// BUILD BID - FRONTEND JAVASCRIPT
// BACKEND: SPRING BOOT + MYSQL + JWT
// ============================================================

const API_BASE_URL = "https://buildbid-ap3j.onrender.com";

// ============================================================
// GET STARTED / REQUIREMENT
// ============================================================
function goToRequirement() {
    const requirement = document.querySelector("#requirement");
    if (requirement) {
        requirement.scrollIntoView({ behavior: "smooth" });
    }
}

// ============================================================
// LOGIN POPUP
// ============================================================
function openAuth() {
    const auth = document.querySelector("#auth");
    if (auth) {
        auth.classList.add("show-auth");
        document.body.style.overflow = "hidden";
        showLogin();
    }
}

function closeAuth() {
    const auth = document.querySelector("#auth");
    if (auth) {
        auth.classList.remove("show-auth");
        document.body.style.overflow = "";
    }
}

function showLogin() {
    const loginBox = document.querySelector("#loginFormBox");
    const signupBox = document.querySelector("#signupFormBox");
    if (loginBox && signupBox) {
        loginBox.classList.remove("hidden");
        signupBox.classList.add("hidden");
    }
}

function showSignup() {
    const loginBox = document.querySelector("#loginFormBox");
    const signupBox = document.querySelector("#signupFormBox");
    if (loginBox && signupBox) {
        loginBox.classList.add("hidden");
        signupBox.classList.remove("hidden");
    }
}

// ============================================================
// AUTH TOAST (MESSAGE)
// ============================================================
let authToastTimer = null;

function showAuthToast(title, message, type = "success", duration = 4000) {
    const toast = document.getElementById("authToast");
    const titleElement = document.getElementById("authToastTitle");
    const messageElement = document.getElementById("authToastMessage");
    const iconElement = document.getElementById("authToastIcon");

    if (!toast) return;

    if (authToastTimer) clearTimeout(authToastTimer);

    titleElement.textContent = title;
    messageElement.textContent = message;

    toast.classList.remove("success", "error", "warning", "show");
    toast.classList.add(type);

    if (type === "error") {
        iconElement.className = "fa-solid fa-circle-exclamation";
    } else if (type === "warning") {
        iconElement.className = "fa-solid fa-triangle-exclamation";
    } else {
        iconElement.className = "fa-solid fa-check";
    }

    void toast.offsetWidth;
    toast.classList.add("show");

    authToastTimer = setTimeout(() => {
        hideAuthToast();
    }, duration);
}

function hideAuthToast() {
    const toast = document.getElementById("authToast");
    if (toast) toast.classList.remove("show");
}

function showMessage(message) {
    showAuthToast("Notice", message, "warning");
}

async function getResponseData(response) {
    try {
        return await response.json();
    } catch (error) {
        return {};
    }
}

// ============================================================
// USER AVATAR & NAVBAR AUTH STATE HANDLERS
// ============================================================
function getInitials(name) {
    if (!name || typeof name !== "string") return "BB";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateNavbarAuthState() {
    const token = localStorage.getItem("marketplaceToken");
    const userJson = localStorage.getItem("marketplaceUser");
    const customerJson = localStorage.getItem("currentUser");

    const navLoginBtn = document.getElementById("navLoginBtn");
    const navStartBtn = document.getElementById("navStartBtn");
    const userAvatarBtn = document.getElementById("userAvatarBtn");
    const userInitials = document.getElementById("userInitials");

    if (token && userJson) {
        const user = JSON.parse(userJson);
        const customer = customerJson ? JSON.parse(customerJson) : null;
        const displayName = (customer && customer.name) ? customer.name : (user.username || "User");

        if (navLoginBtn) navLoginBtn.classList.add("hidden");
        if (navStartBtn) navStartBtn.classList.add("hidden");
        if (userAvatarBtn) userAvatarBtn.classList.remove("hidden");
        if (userInitials) userInitials.textContent = getInitials(displayName);
    } else {
        if (navLoginBtn) navLoginBtn.classList.remove("hidden");
        if (navStartBtn) navStartBtn.classList.remove("hidden");
        if (userAvatarBtn) userAvatarBtn.classList.add("hidden");
    }
}

// Role-based navigation to appropriate dashboard
function navigateToDashboard() {
    const userJson = localStorage.getItem("marketplaceUser");
    if (!userJson) {
        openAuth();
        return;
    }

    const user = JSON.parse(userJson);
    let role = "CUSTOMER";

    if (user.roles && user.roles.length > 0) {
        role = user.roles[0].replace("ROLE_", "").toUpperCase();
    }

    if (role === "CONTRACTOR" || role === "SELLER") {
        window.location.href = "contractor dashboard.html";
    } else if (role === "MATERIAL_SELLER") {
        window.location.href = "material seller dashboard.html";
    } else if (role === "PROFESSIONAL" || role === "SERVICE_PROVIDER") {
        window.location.href = "professional dashboard.html";
    } else {
        window.location.href = "customer dashboard.html";
    }
}

function isUserLoggedIn() {
    return !!localStorage.getItem("marketplaceToken");
}

function handleProtectedAction(actionType) {
    if (!isUserLoggedIn()) {
        if (actionType === "POST_PROJECT") {
            sessionStorage.setItem("pendingRedirect", "create project.html");
        }
        showAuthToast("Login Required", "Please login or create an account to access this feature.", "warning", 4000);
        openAuth();
        return;
    }

    switch (actionType) {
        case "POST_PROJECT":
            window.location.href = "create project.html";
            break;
        case "FIND_CONTRACTORS":
            showMessage("Contractor marketplace coming soon!");
            break;
        case "BUY_MATERIALS":
            showMessage("Materials marketplace coming soon!");
            break;
        case "HIRE_PROFESSIONALS":
            showMessage("Professional hiring coming soon!");
            break;
        default:
            window.location.href = "create project.html";
    }
}

// ============================================================
// ROLE SELECTOR HANDLERS (4 ROLES)
// ============================================================
function selectRole(role) {
    const buttons = {
        CUSTOMER: document.querySelector("#loginCustomerBtn"),
        CONTRACTOR: document.querySelector("#loginContractorBtn"),
        MATERIAL_SELLER: document.querySelector("#loginMaterialSellerBtn"),
        PROFESSIONAL: document.querySelector("#loginProfessionalBtn")
    };

    Object.values(buttons).forEach(btn => {
        if (btn) btn.classList.remove("active");
    });

    const normalizedRole = role.trim().toUpperCase();
    if (buttons[normalizedRole]) {
        buttons[normalizedRole].classList.add("active");
    }

    const roleInput = document.querySelector("#selectedRole");
    if (roleInput) {
        roleInput.value = normalizedRole;
    }
}

function selectSignupRole(element, role) {
    const buttons = document.querySelectorAll(".signup-role-btn");
    buttons.forEach(btn => btn.classList.remove("active"));

    if (element) element.classList.add("active");

    const roleInput = document.querySelector("#signupSelectedRole");
    if (roleInput) {
        roleInput.value = role;
    }

    toggleSignupCategoryFields(role);
}

function toggleSignupCategoryFields(role) {
    const profBox = document.getElementById("professionalCategoryField");
    const sellerBox = document.getElementById("sellerCategoryField");
    const profSelect = document.getElementById("professionalCategorySelect");
    const sellerSelect = document.getElementById("sellerCategorySelect");

    if (!profBox || !sellerBox) return;

    if (role === "PROFESSIONAL") {
        profBox.classList.remove("hidden");
        sellerBox.classList.add("hidden");
        if (profSelect) profSelect.required = true;
        if (sellerSelect) {
            sellerSelect.required = false;
            sellerSelect.value = "";
        }
    } else if (role === "MATERIAL_SELLER") {
        sellerBox.classList.remove("hidden");
        profBox.classList.add("hidden");
        if (sellerSelect) sellerSelect.required = true;
        if (profSelect) {
            profSelect.required = false;
            profSelect.value = "";
        }
    } else {
        // CUSTOMER or CONTRACTOR
        profBox.classList.add("hidden");
        sellerBox.classList.add("hidden");
        if (profSelect) {
            profSelect.required = false;
            profSelect.value = "";
        }
        if (sellerSelect) {
            sellerSelect.required = false;
            sellerSelect.value = "";
        }
    }
}

// ============================================================
// LOGIN FORM (WITH ROLE MISMATCH CHECK & REDIRECT FLOW)
// ============================================================
const loginForm = document.querySelector("#loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const emailInput = loginForm.querySelector('input[name="email"]');
        const passwordInput = loginForm.querySelector('input[name="password"]');

        const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
        const password = passwordInput ? passwordInput.value : "";

        if (!email || !password) {
            alert("Please fill all required fields.");
            return;
        }

        try {
            const response = await fetch(API_BASE_URL + "/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await getResponseData(response);

            if (!response.ok) {
                showAuthToast("Login Failed", data.message || data.error || "Please check your credentials.", "error");
                return;
            }

            if (data.token) {
                localStorage.setItem("marketplaceToken", data.token);
            }

            // Fetch complete user profile from backend
            let userProfile = null;
            try {
                const profileResponse = await fetch(API_BASE_URL + "/api/me", {
                    method: "GET",
                    headers: { "Authorization": "Bearer " + data.token }
                });
                if (profileResponse.ok) {
                    userProfile = await profileResponse.json();
                }
            } catch (error) {
                console.error("Failed to fetch profile on login:", error);
            }

            const userRoles = (userProfile && userProfile.roles) || data.roles || [];
            const selectedRoleInput = loginForm.querySelector('#selectedRole');
            const chosenRole = selectedRoleInput ? selectedRoleInput.value.trim().toUpperCase() : "CUSTOMER";

            // Map old roles if backend still has them
            const roleAliases = {
                "SELLER": ["CONTRACTOR", "SELLER"],
                "SERVICE_PROVIDER": ["PROFESSIONAL", "SERVICE_PROVIDER"]
            };

            const hasMatchingRole = userRoles.some(r => {
                const clean = r.replace("ROLE_", "").toUpperCase();
                return clean === chosenRole || (roleAliases[chosenRole] && roleAliases[chosenRole].includes(clean));
            });

            if (!hasMatchingRole && userRoles.length > 0) {
                showAuthToast(
                    "Role Mismatch",
                    `This email is registered under a different role. Please select your correct role tab to login.`,
                    "error",
                    5000
                );
                return;
            }

            // Store User Data
            localStorage.setItem("marketplaceUser", JSON.stringify({
                username: data.username || (userProfile && userProfile.username) || email.split('@')[0],
                roles: userRoles.length > 0 ? userRoles : [chosenRole]
            }));

            const loggedInUser = {
                name: (userProfile && userProfile.name) || data.name || data.username || email.split('@')[0],
                username: (userProfile && userProfile.username) || data.username || email.split('@')[0],
                email: (userProfile && userProfile.email) || email,
                phone: (userProfile && userProfile.phone) || "",
                location: (userProfile && userProfile.location) || ""
            };
            localStorage.setItem("currentUser", JSON.stringify(loggedInUser));

            showAuthToast("Login Successful", `Welcome back, ${loggedInUser.name}!`, "success");

            loginForm.reset();
            closeAuth();
            updateNavbarAuthState();

            const pendingUrl = sessionStorage.getItem("pendingRedirect");
            if (pendingUrl) {
                sessionStorage.removeItem("pendingRedirect");
                setTimeout(() => { window.location.href = pendingUrl; }, 800);
            }
        } catch (error) {
            console.error("Login error:", error);
            showAuthToast("Connection Error", "Unable to connect to the server. Please try again.", "error");
        }
    });
}

// ============================================================
// SIGNUP FORM (WITH 4-ROLE & DYNAMIC CATEGORIES)
// ============================================================
const signupForm = document.querySelector("#signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const nameInput = signupForm.querySelector('input[name="name"]');
        const usernameInput = signupForm.querySelector('input[name="username"]');
        const emailInput = signupForm.querySelector('input[name="email"]');
        const phoneInput = signupForm.querySelector('input[name="phone"]');
        const passwordInput = signupForm.querySelector('input[name="password"]');
        const roleInput = signupForm.querySelector("#signupSelectedRole");
        const locationInput = signupForm.querySelector('#signupLocation');

        const profSelect = document.getElementById("professionalCategorySelect");
        const sellerSelect = document.getElementById("sellerCategorySelect");

        if (!nameInput || !usernameInput || !emailInput || !phoneInput || !passwordInput) {
            showAuthToast("Missing Information", "Please fill all required fields.", "error");
            return;
        }

        const name = nameInput.value.trim();
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value;
        const userLocation = locationInput && locationInput.value.trim() ? locationInput.value.trim() : "India";

        let selectedRole = roleInput ? roleInput.value.trim().toUpperCase() : "CUSTOMER";

        const allowedRoles = ["CUSTOMER", "CONTRACTOR", "MATERIAL_SELLER", "PROFESSIONAL"];
        if (!allowedRoles.includes(selectedRole)) {
            selectedRole = "CUSTOMER";
        }

        // Validate dynamic category choices
        if (selectedRole === "PROFESSIONAL" && (!profSelect || !profSelect.value)) {
            showAuthToast("Selection Required", "Please select your profession / specialization.", "error");
            return;
        }

        if (selectedRole === "MATERIAL_SELLER" && (!sellerSelect || !sellerSelect.value)) {
            showAuthToast("Selection Required", "Please select the primary material supplied.", "error");
            return;
        }

        const registerData = {
            name: name,
            username: username,
            email: email,
            phone: phone,
            location: userLocation,
            password: password,
            role: selectedRole.toLowerCase(),
            category: selectedRole === "PROFESSIONAL" 
                        ? profSelect.value 
                        : (selectedRole === "MATERIAL_SELLER" ? sellerSelect.value : null)
        };

        try {
            const response = await fetch(API_BASE_URL + "/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registerData)
            });

            const data = await getResponseData(response);

            if (!response.ok) {
                let errorMessage = data.message || data.error || "Account creation failed.";
                if (data.errors && Array.isArray(data.errors)) {
                    errorMessage = data.errors.map(err => err.defaultMessage || err.message || "Invalid field").join("\n");
                }
                showAuthToast("Signup Failed", errorMessage, "error", 5000);
                return;
            }

            if (data.token) {
                localStorage.setItem("marketplaceToken", data.token);
            }

            localStorage.setItem("marketplaceUser", JSON.stringify({
                username: data.username || username,
                roles: data.roles && data.roles.length > 0 ? data.roles : [selectedRole]
            }));

            const signedUpCustomer = {
                name: name,
                username: username,
                email: email,
                phone: phone,
                location: userLocation,
                role: selectedRole,
                category: registerData.category
            };

            localStorage.setItem("currentUser", JSON.stringify(signedUpCustomer));

            showAuthToast("Account Created", `Welcome to BuildBid, ${name}!`, "success", 3000);

            signupForm.reset();
            closeAuth();
            updateNavbarAuthState();

            const pendingUrl = sessionStorage.getItem("pendingRedirect");
            if (pendingUrl) {
                sessionStorage.removeItem("pendingRedirect");
                setTimeout(() => { window.location.href = pendingUrl; }, 800);
            }
        } catch (error) {
            console.error("Signup error:", error);
            showAuthToast("Connection Error", "Unable to connect to the backend. Please try again.", "error", 5000);
        }
    });
}

// ============================================================
// ESC KEY CLOSE AUTH MODAL
// ============================================================
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeAuth();
    }
});

// ============================================================
// PASSWORD EYE TOGGLE
// ============================================================
function togglePasswordVisibility(iconElement) {
    if (!iconElement) return;
    const wrapper = iconElement.closest(".buildbid-input-wrapper");
    const passwordInput = wrapper ? wrapper.querySelector("input") : null;

    if (!passwordInput) return;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        iconElement.classList.remove("fa-eye-slash");
        iconElement.classList.add("fa-eye");
    } else {
        passwordInput.type = "password";
        iconElement.classList.remove("fa-eye");
        iconElement.classList.add("fa-eye-slash");
    }
}

document.addEventListener("click", function(event) {
    if (event.target && event.target.classList.contains("password-toggle")) {
        togglePasswordVisibility(event.target);
    }
});

// ============================================================
// GET CURRENT LOGGED-IN USER & INITIAL CHECK
// ============================================================
async function getCurrentUser() {
    const token = localStorage.getItem("marketplaceToken");
    if (!token) return null;

    try {
        const response = await fetch(API_BASE_URL + "/api/me", {
            method: "GET",
            headers: { "Authorization": "Bearer " + token }
        });

        if (!response.ok) {
            localStorage.removeItem("marketplaceToken");
            localStorage.removeItem("marketplaceUser");
            localStorage.removeItem("currentUser");
            updateNavbarAuthState();
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Profile error:", error);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", function() {
    console.log("BuildBid frontend loaded.");
    updateNavbarAuthState();
});

// ============================================================
// FREE GPS LOCATION DETECTION
// ============================================================
function detectUserLocation() {
    const locationInput = document.getElementById("signupLocation");
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    locationInput.value = "";
    locationInput.placeholder = "Detecting precise GPS coordinates...";

    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        locationInput.placeholder = "Fetching address from OpenStreetMap...";

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
                headers: { 'User-Agent': 'BuildBid-App' }
            });
            const data = await response.json();

            if (data && data.display_name) {
                locationInput.value = data.display_name;
            } else {
                alert("Could not determine address from coordinates.");
                locationInput.placeholder = "City, State (e.g. Lucknow, Uttar Pradesh)";
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            alert("Failed to fetch address. Please type it manually.");
            locationInput.placeholder = "City, State (e.g. Lucknow, Uttar Pradesh)";
        }
    }, (error) => {
        console.error("Geolocation error:", error);
        alert("Location permission denied or unavailable.");
        locationInput.placeholder = "City, State (e.g. Lucknow, Uttar Pradesh)";
    }, {
        timeout: 10000
    });
}

// ============================================================
// VIDEO MODAL HANDLERS
// ============================================================
function openVideoModal() {
    const modal = document.getElementById("videoModal");
    const video = document.getElementById("buildBidVideo");
    if (modal && video) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
        video.play().catch(() => {});
    }
}

function closeVideoModal() {
    const modal = document.getElementById("videoModal");
    const video = document.getElementById("buildBidVideo");
    if (modal && video) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
        video.pause();
        video.currentTime = 0;
    }
}

document.addEventListener("click", function(event) {
    const modal = document.getElementById("videoModal");
    if (event.target === modal) {
        closeVideoModal();
    }
});

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeVideoModal();
    }
});