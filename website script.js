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
        requirement.scrollIntoView({
            behavior: "smooth"
        });
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


// ============================================================
// CLOSE LOGIN POPUP
// ============================================================

function closeAuth() {
    const auth = document.querySelector("#auth");

    if (auth) {
        auth.classList.remove("show-auth");
        document.body.style.overflow = "";
    }
}


// ============================================================
// SHOW LOGIN
// ============================================================

function showLogin() {
    const loginBox = document.querySelector("#loginFormBox");
    const signupBox = document.querySelector("#signupFormBox");
    const loginTab = document.querySelector("#loginTab");
    const signupTab = document.querySelector("#signupTab");

    if (loginBox && signupBox) {
        loginBox.classList.remove("hidden");
        signupBox.classList.add("hidden");
    }

    if (loginTab && signupTab) {
        loginTab.classList.add("active");
        signupTab.classList.remove("active");
    }
}


// ============================================================
// SHOW SIGNUP
// ============================================================

function showSignup() {
    const loginBox = document.querySelector("#loginFormBox");
    const signupBox = document.querySelector("#signupFormBox");
    const loginTab = document.querySelector("#loginTab");
    const signupTab = document.querySelector("#signupTab");

    if (loginBox && signupBox) {
        loginBox.classList.add("hidden");
        signupBox.classList.remove("hidden");
    }

    if (loginTab && signupTab) {
        loginTab.classList.remove("active");
        signupTab.classList.add("active");
    }
}


// ============================================================
// AUTH TOAST (MESSAGE)
// ============================================================

let authToastTimer = null;

function showAuthToast(
    title,
    message,
    type = "success",
    duration = 4000
) {
    const toast = document.getElementById("authToast");
    const titleElement = document.getElementById("authToastTitle");
    const messageElement = document.getElementById("authToastMessage");
    const iconElement = document.getElementById("authToastIcon");

    if (!toast) {
        console.warn("Auth toast element not found.");
        return;
    }

    if (authToastTimer) {
        clearTimeout(authToastTimer);
    }

    titleElement.textContent = title;
    messageElement.textContent = message;

    // Remove previous states
    toast.classList.remove(
        "success",
        "error",
        "warning",
        "show"
    );

    // Set type
    toast.classList.add(type);

    // Set icon
    if (type === "error") {
        iconElement.className = "fa-solid fa-circle-exclamation";
    } else if (type === "warning") {
        iconElement.className = "fa-solid fa-triangle-exclamation";
    } else {
        iconElement.className = "fa-solid fa-check";
    }

    // Force animation restart
    void toast.offsetWidth;

    toast.classList.add("show");

    authToastTimer = setTimeout(() => {
        hideAuthToast();
    }, duration);
}


function hideAuthToast() {
    const toast = document.getElementById("authToast");

    if (!toast) {
        return;
    }

    toast.classList.remove("show");
}


// Keep compatibility with your existing HTML
function showMessage(message) {
    showAuthToast(
        "Notice",
        message,
        "warning"
    );
}


// ============================================================
// SAFE JSON RESPONSE
// ============================================================

async function getResponseData(response) {
    try {
        return await response.json();
    }
    catch (error) {
        return {};
    }
}


// ============================================================
// REQUIREMENT FORM
// ============================================================

const requirementForm = document.querySelector("#requirementForm");

if (requirementForm) {
    requirementForm.addEventListener(
        "submit",
        function(event) {
            event.preventDefault();
            alert("Thank you! Your project requirement has been submitted successfully.");
            requirementForm.reset();
        }
    );
}


// ============================================================
// LOGIN FORM (WITH PROFESSIONAL ROLE MISMATCH VALIDATION)
// ============================================================

const loginForm = document.querySelector("#loginForm");

if (loginForm) {
    loginForm.addEventListener(
        "submit",
        async function(event) {
            event.preventDefault();

            const emailInput = loginForm.querySelector('input[name="email"]');
            const passwordInput = loginForm.querySelector('input[name="password"]');

            const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
            const password = passwordInput ? passwordInput.value : "";

            if (!email) {
                alert("Please enter your email address.");
                return;
            }

            if (!password) {
                alert("Please enter your password.");
                return;
            }

            try {
                const response = await fetch(
                    API_BASE_URL + "/api/auth/login",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    }
                );

                const data = await getResponseData(response);

                if (!response.ok) {
                    console.error("Login response error:", data);
                    showAuthToast(
                        "Login Failed",
                        data.message || data.error || "Please check your email and password.",
                        "error"
                    );
                    return;
                }

                if (data.token) {
                    localStorage.setItem("marketplaceToken", data.token);
                }

                // Fetch complete user profile from backend right after login
                try {
                    const profileResponse = await fetch(API_BASE_URL + "/api/me", {
                        method: "GET",
                        headers: { "Authorization": "Bearer " + data.token }
                    });

                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        
                        // ------------------------------------------------
                        // PROFESSIONAL ROLE MISMATCH VALIDATION ON LOGIN
                        // ------------------------------------------------
                        const selectedRoleInput = loginForm.querySelector('#selectedRole');
                        const chosenRole = selectedRoleInput ? selectedRoleInput.value.trim().toUpperCase() : "CUSTOMER";

                        const userRoles = profileData.roles || data.roles || [];
                        const hasMatchingRole = userRoles.some(r => r.toUpperCase() === chosenRole);

                        if (!hasMatchingRole && userRoles.length > 0) {
                            showAuthToast(
                                "Access Denied / Role Mismatch",
                                `This email is registered under a different role. Please switch to your correct account tab to login safely.`,
                                "error",
                                5000
                            );
                            return; // लॉगिन रोक दिया जाएगा!
                        }

                        // Save full synchronized user details for the dashboard
                        const loggedInCustomer = {
                            name: profileData.name || data.username || email.split('@')[0],
                            username: profileData.username || data.username || email.split('@')[0],
                            email: profileData.email || email,
                            phone: profileData.phone || "",
                            location: profileData.location || ""
                        };

                        localStorage.setItem("currentUser", JSON.stringify(loggedInCustomer));
                    } else {
                        // Fallback if /api/me fails
                        localStorage.setItem("currentUser", JSON.stringify({
                            name: data.username || email.split('@')[0],
                            username: data.username || email.split('@')[0],
                            email: email,
                            phone: "",
                            location: ""
                        }));
                    }
                } catch (error) {
                    console.error("Failed to fetch profile on login:", error);
                }

                // SUCCESS & REDIRECT TO DASHBOARD
                showAuthToast(
                    "Login Successful",
                    "Welcome back to BuildBid!",
                    "success"
                );

                loginForm.reset();

                setTimeout(() => {
                    closeAuth();
                    window.location.href = "customer dashboard.html";
                }, 1000);

            }
            catch (error) {
                console.error("Login error:", error);
                showAuthToast(
                    "Connection Error",
                    "Unable to connect to the backend server. Please try again.",
                    "error"
                );
            }
        }
    );
}


// ============================================================
// SIGNUP FORM
// ============================================================

const signupForm = document.querySelector("#signupForm");

if (signupForm) {
    signupForm.addEventListener(
        "submit",
        async function(event) {
            event.preventDefault();

            const nameInput = signupForm.querySelector('input[name="name"]');
            const usernameInput = signupForm.querySelector('input[name="username"]');
            const emailInput = signupForm.querySelector('input[name="email"]');
            const phoneInput = signupForm.querySelector('input[name="phone"]');
            const passwordInput = signupForm.querySelector('input[name="password"]');
            const roleInput = signupForm.querySelector("#signupSelectedRole");
            
            const locationInput = signupForm.querySelector('input[name="location"]') || 
                                  signupForm.querySelector('input[name="city"]') || 
                                  signupForm.querySelector('#signupLocation');

            const userLocation = locationInput && locationInput.value.trim() 
                                 ? locationInput.value.trim() 
                                 : "India";

            if (!nameInput || !usernameInput || !emailInput || !phoneInput || !passwordInput) {
                showAuthToast("Missing Information", "Please fill all required fields.", "error");
                return;
            }

            const name = nameInput.value.trim();
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim().toLowerCase();
            const phone = phoneInput.value.trim();
            const password = passwordInput.value;

            let selectedRole = roleInput ? roleInput.value : "CUSTOMER";
            selectedRole = selectedRole.trim().toUpperCase();

            const allowedRoles = ["CUSTOMER", "SELLER", "SERVICE_PROVIDER"];
            if (!allowedRoles.includes(selectedRole)) {
                selectedRole = "CUSTOMER";
            }

            const registerData = {
                name: name,
                username: username,
                email: email,
                phone: phone,
                location: userLocation,
                password: password,
                role: selectedRole.toLowerCase()
            };

            try {
                const response = await fetch(
                    API_BASE_URL + "/api/auth/register",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(registerData)
                    }
                );

                const data = await getResponseData(response);

                if (!response.ok) {
                    console.error("Signup response:", data);
                    let errorMessage = data.message || data.error || "Account creation failed.";
                    
                    if (data.errors && Array.isArray(data.errors)) {
                        errorMessage = data.errors.map(error => error.defaultMessage || error.message || "Invalid field").join("\n");
                    }

                    showAuthToast("Signup Failed", errorMessage, "error", 5000);
                    return;
                }

                if (data.token) {
                    localStorage.setItem("marketplaceToken", data.token);
                }

                localStorage.setItem(
                    "marketplaceUser",
                    JSON.stringify({
                        username: data.username,
                        roles: data.roles
                    })
                );

                const signedUpCustomer = {
                    name: name,
                    username: username,
                    email: email,
                    phone: phone,
                    location: userLocation
                };

                localStorage.setItem("currentUser", JSON.stringify(signedUpCustomer));

                showAuthToast(
                    "Account Created Successfully",
                    "Welcome to BuildBid! Redirecting to dashboard...",
                    "success",
                    2000
                );

                signupForm.reset();

                setTimeout(() => {
                    closeAuth();
                    window.location.href = "customer dashboard.html";
                }, 1200);

            }
            catch (error) {
                console.error("Signup error:", error);
                showAuthToast(
                    "Connection Error",
                    "Unable to connect to the backend. Please try again.",
                    "error",
                    5000
                );
            }
        }
    );
}


// ============================================================
// ESC KEY CLOSE AUTH MODAL
// ============================================================

document.addEventListener(
    "keydown",
    function(event) {
        if (event.key === "Escape") {
            closeAuth();
        }
    }
);


// ============================================================
// ROLE SELECTOR (UPDATED FOR 3 ROLES: Customer, Contractor, Service Provider)
// ============================================================

function selectRole(role) {
    const customerBtn = document.querySelector("#customerBtn");
    const contractorBtn = document.querySelector("#contractorBtn");
    const serviceProviderBtn = document.querySelector("#serviceProviderBtn");
    const roleInput = document.querySelector("#selectedRole");

    if (customerBtn) customerBtn.classList.remove("active");
    if (contractorBtn) contractorBtn.classList.remove("active");
    if (serviceProviderBtn) serviceProviderBtn.classList.remove("active");

    let normalizedRole = role.trim().toUpperCase();

    if (normalizedRole === "CUSTOMER" && customerBtn) {
        customerBtn.classList.add("active");
    } else if (normalizedRole === "SELLER" && contractorBtn) {
        contractorBtn.classList.add("active");
    } else if (normalizedRole === "SERVICE_PROVIDER" && serviceProviderBtn) {
        serviceProviderBtn.classList.add("active");
    }

    if (roleInput) {
        roleInput.value = normalizedRole;
    }
}


// ============================================================
// SIGNUP ROLE SELECTOR
// ============================================================

function selectSignupRole(element, role) {
    const buttons = document.querySelectorAll(".signup-role-btn");

    buttons.forEach(function(btn) {
        btn.classList.remove("active");
    });

    if (element) {
        element.classList.add("active");
    }

    const roleInput = document.querySelector("#signupSelectedRole");

    if (roleInput) {
        roleInput.value = role;
    }
}


// ============================================================
// PASSWORD EYE TOGGLE
// ============================================================

function togglePasswordVisibility(iconElement) {
    if (!iconElement) {
        return;
    }

    const wrapper = iconElement.closest(".buildbid-input-wrapper");
    const passwordInput = wrapper ? wrapper.querySelector("input") : null;

    if (!passwordInput) {
        return;
    }

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        iconElement.classList.remove("fa-eye-slash");
        iconElement.classList.add("fa-eye");
    }
    else {
        passwordInput.type = "password";
        iconElement.classList.remove("fa-eye");
        iconElement.classList.add("fa-eye-slash");
    }
}


// ============================================================
// PASSWORD EYE EVENT LISTENER
// ============================================================

document.addEventListener(
    "click",
    function(event) {
        if (event.target && event.target.classList.contains("password-toggle")) {
            togglePasswordVisibility(event.target);
        }
    }
);


// ============================================================
// GET CURRENT LOGGED-IN USER
// ============================================================

async function getCurrentUser() {
    const token = localStorage.getItem("marketplaceToken");

    if (!token) {
        return null;
    }

    try {
        const response = await fetch(
            API_BASE_URL + "/api/me",
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        if (!response.ok) {
            localStorage.removeItem("marketplaceToken");
            localStorage.removeItem("marketplaceUser");
            return null;
        }

        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error("Profile error:", error);
        return null;
    }
}


// ============================================================
// HEALTH CHECK
// ============================================================

async function checkBackend() {
    try {
        const response = await fetch(API_BASE_URL + "/api/health");
        const data = await response.json();
        console.log("Backend status:", data);
        return data;
    }
    catch (error) {
        console.error("Backend connection failed:", error);
        return null;
    }
}


// ============================================================
// DOM CONTENT LOADED EVENT
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {
        console.log("BuildBid frontend loaded.");
        console.log("Backend:", API_BASE_URL);
    }
);


// ============================================================
// FREE GPS LOCATION DETECTION (Using OpenStreetMap Nominatim)
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
                headers: {
                    'User-Agent': 'BuildBid-App'
                }
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
