// ============================================================
// BUILD BID - FRONTEND JAVASCRIPT (PRODUCTION READY)
// BACKEND: SPRING BOOT + MYSQL + JWT
// ============================================================

function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.location) {
        // Sirf local development ke waqt localhost use karein
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            return "http://localhost:8080";
        }
    }
    // GitHub Pages ya live domain par hamesha Render backend call karein
    return "https://buildbid-ap3j.onrender.com";
}

const API_BASE_URL = getApiBaseUrl();

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

function resolvePath(fileName) {
    return encodeURI(fileName);
}

// ============================================================
// UI & NAVIGATION HELPERS
// ============================================================
function goToRequirement() {
    const requirement = document.querySelector("#requirement");
    if (requirement) {
        requirement.scrollIntoView({ behavior: "smooth" });
    }
}

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

let authToastTimer = null;

function showAuthToast(title, message, type = "success", duration = 4500) {
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

function getInitials(name) {
    if (!name || typeof name !== "string") return "BB";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateNavbarAuthState() {
    const token = getCleanToken();
    const userJson = localStorage.getItem("marketplaceUser");
    const customerJson = localStorage.getItem("currentUser");

    const navLoginBtn = document.getElementById("navLoginBtn");
    const navStartBtn = document.getElementById("navStartBtn");
    const userAvatarBtn = document.getElementById("userAvatarBtn");
    const userInitials = document.getElementById("userInitials");

    if (token && (userJson || customerJson)) {
        const user = userJson ? JSON.parse(userJson) : {};
        const customer = customerJson ? JSON.parse(customerJson) : {};
        const displayName = customer.name || user.username || "User";

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

function navigateToDashboard() {
    const userJson = localStorage.getItem("marketplaceUser");
    const currentJson = localStorage.getItem("currentUser");

    if (!userJson && !currentJson) {
        openAuth();
        return;
    }

    const user = userJson ? JSON.parse(userJson) : {};
    const currentUser = currentJson ? JSON.parse(currentJson) : {};

    let role = "CUSTOMER";

    if (currentUser.role) {
        role = currentUser.role.replace("ROLE_", "").toUpperCase();
    } else if (user.roles && user.roles.length > 0) {
        const primaryRole = user.roles[0];
        role = (typeof primaryRole === "string" ? primaryRole : primaryRole.name || "")
            .replace("ROLE_", "")
            .toUpperCase();
    }

    console.log("Navigating to dashboard for role:", role);

    if (role === "CONTRACTOR") {
        window.location.href = resolvePath("contractor-dashboard.html");
    } else if (role === "MATERIAL_SELLER" || role === "SELLER") {
        window.location.href = resolvePath("material seller dashboard.html");
    } else if (role === "PROFESSIONAL" || role === "SERVICE_PROVIDER") {
        window.location.href = resolvePath("professional dashboard.html");
    } else {
        window.location.href = resolvePath("customer dashboard.html");
    }
}

function isUserLoggedIn() {
    return !!getCleanToken();
}

function handleProtectedAction(actionType) {
    if (!isUserLoggedIn()) {
        if (actionType === "POST_PROJECT") {
            sessionStorage.setItem("pendingRedirect", resolvePath("create project.html"));
        }
        showAuthToast("Login Required", "Please login or create an account to access this feature.", "warning", 4000);
        openAuth();
        return;
    }

    switch (actionType) {
        case "POST_PROJECT":
            window.location.href = resolvePath("create project.html");
            break;
        case "FIND_CONTRACTORS":
            window.location.href = resolvePath("contactor.html");
            break;
        case "BUY_MATERIALS":
            window.location.href = resolvePath("material seller dashboard.html");
            break;
        case "HIRE_PROFESSIONALS":
            window.location.href = resolvePath("hire-professionals.html");
            break;
        default:
            window.location.href = resolvePath("create project.html");
    }
}

// ============================================================
// ROLE SELECTION HANDLERS
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
// LOGIN FORM HANDLER
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
            showAuthToast("Missing Info", "Please enter your email and password.", "error");
            return;
        }

        const selectedRoleInput = loginForm.querySelector('#selectedRole');
        const chosenRole = selectedRoleInput ? selectedRoleInput.value.trim().toUpperCase() : "CUSTOMER";

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : "Login";

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;
        }

        try {
            const response = await fetch(API_BASE_URL + "/api/auth/login", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ 
                    email: email, 
                    username: email, 
                    password: password, 
                    role: chosenRole 
                })
            });

            const data = await getResponseData(response);

            if (!response.ok) {
                const errorMessage = data.error || data.message || "Invalid email or password.";
                showAuthToast("Login Failed", errorMessage, "error", 5000);
                return;
            }

            const token = data.token || data.accessToken || data.jwt || "";
            if (token) {
                localStorage.setItem("marketplaceToken", token);
                localStorage.setItem("token", token);
            }

            const backendRoles = (data.roles && data.roles.length > 0) ? Array.from(data.roles) : [chosenRole];
            const primaryRole = (typeof backendRoles[0] === 'string' ? backendRoles[0] : backendRoles[0].name || chosenRole)
                .replace("ROLE_", "").toUpperCase();

            localStorage.setItem("marketplaceUser", JSON.stringify({
                username: data.username || email.split('@')[0],
                roles: backendRoles
            }));

            const loggedInUser = {
                name: data.name || data.username || email.split('@')[0],
                username: data.username || email.split('@')[0],
                email: data.email || email,
                phone: data.phone || "",
                location: data.location || "",
                role: primaryRole
            };
            localStorage.setItem("currentUser", JSON.stringify(loggedInUser));

            showAuthToast("Login Successful", `Welcome back, ${loggedInUser.name}!`, "success");

            loginForm.reset();
            closeAuth();
            updateNavbarAuthState();

            const pendingUrl = sessionStorage.getItem("pendingRedirect");
            if (pendingUrl) {
                sessionStorage.removeItem("pendingRedirect");
                setTimeout(() => { window.location.href = pendingUrl; }, 600);
            } else {
                setTimeout(() => { navigateToDashboard(); }, 600);
            }
        } catch (error) {
            console.error("Login error:", error);
            showAuthToast("Connection Error", "Unable to connect to the backend server.", "error");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    });
}

// ============================================================
// SIGNUP FORM HANDLER (WITH AUTO LOGIN ON SUCCESS)
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

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : "Create Account";

        if (!nameInput || !emailInput || !passwordInput) {
            showAuthToast("Missing Information", "Please fill all required fields.", "error");
            return;
        }

        const name = nameInput.value.trim();
        const username = usernameInput && usernameInput.value.trim() ? usernameInput.value.trim() : emailInput.value.trim().split("@")[0];
        const email = emailInput.value.trim().toLowerCase();
        const phone = phoneInput ? phoneInput.value.trim() : "";
        const password = passwordInput.value;
        const userLocation = locationInput && locationInput.value.trim() ? locationInput.value.trim() : "India";

        let selectedRole = roleInput ? roleInput.value.trim().toUpperCase() : "CUSTOMER";

        const registerData = {
            name: name,
            username: username,
            email: email,
            phone: phone,
            location: userLocation,
            password: password,
            role: selectedRole.toLowerCase(),
            category: selectedRole === "PROFESSIONAL" 
                    ? (profSelect ? profSelect.value : null) 
                    : (selectedRole === "MATERIAL_SELLER" ? (sellerSelect ? sellerSelect.value : null) : null)
        };

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...`;
        }

        try {
            // 1. Send Registration Request to Render Backend
            const response = await fetch(API_BASE_URL + "/api/auth/register", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
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

            // 2. Obtain Token (If register endpoint doesn't return one, do auto-login)
            let token = data.token || data.accessToken || "";

            if (!token) {
                try {
                    const loginRes = await fetch(API_BASE_URL + "/api/auth/login", {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({ 
                            email: email, 
                            username: email,
                            password: password, 
                            role: selectedRole 
                        })
                    });
                    if (loginRes.ok) {
                        const loginData = await loginRes.json();
                        token = loginData.token || loginData.accessToken || "";
                    }
                } catch (autoLoginErr) {
                    console.warn("Auto-login error:", autoLoginErr);
                }
            }

            if (token) {
                localStorage.setItem("marketplaceToken", token);
                localStorage.setItem("token", token);
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

            showAuthToast("Account Created", `Welcome to BuildBid, ${name}!`, "success", 2500);

            signupForm.reset();
            closeAuth();
            updateNavbarAuthState();

            const pendingUrl = sessionStorage.getItem("pendingRedirect");
            if (pendingUrl) {
                sessionStorage.removeItem("pendingRedirect");
                setTimeout(() => { window.location.href = pendingUrl; }, 700);
            } else {
                setTimeout(() => { navigateToDashboard(); }, 700);
            }
        } catch (error) {
            console.error("Signup error:", error);
            showAuthToast("Connection Error", "Unable to connect to backend server.", "error", 5000);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    });
}

// ============================================================
// PASSWORD VISIBILITY & MODAL CLOSE HANDLERS
// ============================================================
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeAuth();
        closeVideoModal();
    }
});

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

document.addEventListener("DOMContentLoaded", function() {
    updateNavbarAuthState();
});

// ============================================================
// GEOLOCATION DETECTION
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
                locationInput.placeholder = "City, State (e.g. Greater Noida, Uttar Pradesh)";
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            locationInput.placeholder = "City, State (e.g. Greater Noida, Uttar Pradesh)";
        }
    }, (error) => {
        console.error("Geolocation error:", error);
        locationInput.placeholder = "City, State (e.g. Greater Noida, Uttar Pradesh)";
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
