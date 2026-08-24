// ============================================================
// BUILD BID - FRONTEND JAVASCRIPT
// BACKEND: SPRING BOOT + MYSQL + JWT
// ============================================================

const API_BASE_URL = "https://buildbid-ap3j.onrender.com";


// ============================================================
// GET STARTED / REQUIREMENT
// ============================================================

function goToRequirement() {

    const requirement =
        document.querySelector("#requirement");

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

    const auth =
        document.querySelector("#auth");

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

    const auth =
        document.querySelector("#auth");

    if (auth) {

        auth.classList.remove("show-auth");

        document.body.style.overflow = "";

    }

}


// ============================================================
// SHOW LOGIN
// ============================================================

function showLogin() {

    const loginBox =
        document.querySelector("#loginFormBox");

    const signupBox =
        document.querySelector("#signupFormBox");

    const loginTab =
        document.querySelector("#loginTab");

    const signupTab =
        document.querySelector("#signupTab");


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

    const loginBox =
        document.querySelector("#loginFormBox");

    const signupBox =
        document.querySelector("#signupFormBox");

    const loginTab =
        document.querySelector("#loginTab");

    const signupTab =
        document.querySelector("#signupTab");


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
    const titleElement =
        document.getElementById("authToastTitle");
    const messageElement =
        document.getElementById("authToastMessage");
    const iconElement =
        document.getElementById("authToastIcon");

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
        iconElement.className =
            "fa-solid fa-circle-exclamation";
    } else if (type === "warning") {
        iconElement.className =
            "fa-solid fa-triangle-exclamation";
    } else {
        iconElement.className =
            "fa-solid fa-check";
    }

    // Force animation restart
    void toast.offsetWidth;

    toast.classList.add("show");

    authToastTimer = setTimeout(() => {
        hideAuthToast();
    }, duration);
}


function hideAuthToast() {
    const toast =
        document.getElementById("authToast");

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

const requirementForm =
    document.querySelector("#requirementForm");


if (requirementForm) {

    requirementForm.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            alert(
                "Thank you! Your project requirement has been submitted successfully."
            );

            requirementForm.reset();

        }
    );

}

// ============================================================
// LOGIN FORM
// ============================================================

const loginForm =
    document.querySelector("#loginForm");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            // ------------------------------------------------
            // GET EMAIL & PASSWORD
            // ------------------------------------------------

            const emailInput =
                loginForm.querySelector(
                    'input[name="email"]'
                );


            const passwordInput =
                loginForm.querySelector(
                    'input[name="password"]'
                );


            const email =
                emailInput
                    ? emailInput.value.trim().toLowerCase()
                    : "";


            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (!email) {

                alert(
                    "Please enter your email address."
                );

                return;

            }


            if (!password) {

                alert(
                    "Please enter your password."
                );

                return;

            }


            // ------------------------------------------------
            // SEND LOGIN REQUEST (SENDING EMAIL)
            // ------------------------------------------------

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


                const data =
                    await getResponseData(
                        response
                    );


                // ------------------------------------------------
                // LOGIN FAILED
                // ------------------------------------------------

                if (!response.ok) {

                    console.error(
                        "Login response error:",
                        data
                    );


                   showAuthToast(
    "Login Failed",
    data.message ||
    data.error ||
    "Please check your email and password.",
    "error"
);

return;


                    return;

                }


 // ------------------------------------------------
// SAVE JWT & USER INFO
// ------------------------------------------------

if (data.token) {
    localStorage.setItem("marketplaceToken", data.token);
}

// User details save karein Dashboard ke liye
localStorage.setItem(
    "marketplaceUser",
    JSON.stringify({
        username: data.username,
        roles: data.roles
    })
);

// Fetch profile data from backend OR save available details
try {
    const userProfile = await fetch(API_BASE_URL + "/api/me", {
        headers: { "Authorization": "Bearer " + data.token }
    }).then(res => res.json()).catch(() => null);

    const currentUserObj = {
        name: (userProfile && userProfile.name) ? userProfile.name : (data.name || data.username || email.split('@')[0]),
        email: (userProfile && userProfile.email) ? userProfile.email : email,
        phone: (userProfile && userProfile.phone) ? userProfile.phone : "+91 98765 43210",
        location: (userProfile && userProfile.city) ? `${userProfile.city}, India` : "Varanasi, Uttar Pradesh, India"
    };

    localStorage.setItem("currentUser", JSON.stringify(currentUserObj));
} catch(error){
    console.error("erroe occured:",error);
} 


            

// ------------------------------------------------
// SUCCESS & REDIRECT TO DASHBOARD
// ------------------------------------------------

showAuthToast(
    "Login Successful",
    "Welcome back to BuildBid!",
    "success"
);

loginForm.reset();

// 1 second baad directly Customer Dashboard open ho jayega
setTimeout(() => {
    closeAuth();
    window.location.href = "customer dashboard.html";
}, 1000);

// ------------------------------------------------
// LOGIN SUCCESS HANDLER
// ------------------------------------------------
const userEmail = email.trim().toLowerCase();

// Pehle check karein kya is email ka data browser me saved hai
const savedProfile = JSON.parse(localStorage.getItem("user_profile_" + userEmail)) || {};

const loggedInCustomer = {
  name: data.name || data.username || savedProfile.name || userEmail.split('@')[0],
  username: data.username || savedProfile.username || userEmail.split('@')[0],
  email: userEmail,
  phone: data.phone || savedProfile.phone || "",       // <-- Koi hardcoded number nahi
  location: data.location || savedProfile.location || "" // <-- Koi hardcoded Varanasi nahi
};

// Set as active user
localStorage.setItem("currentUser", JSON.stringify(loggedInCustomer));

// Dashboard par redirect
setTimeout(() => {
  if (typeof closeAuth === "function") closeAuth();
  window.location.href = "customer%20dashboard.html";
}, 1000);
                

            }


            catch (error) {

                console.error(
                    "Login error:",
                    error
                );


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

const signupForm =
    document.querySelector("#signupForm");


if (signupForm) {

    signupForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            // ------------------------------------------------
            // GET INPUTS
            // ------------------------------------------------

            const nameInput =
                signupForm.querySelector(
                    'input[name="name"]'
                );


            const usernameInput =
                signupForm.querySelector(
                    'input[name="username"]'
                );


            const emailInput =
                signupForm.querySelector(
                    'input[name="email"]'
                );


            const phoneInput =
                signupForm.querySelector(
                    'input[name="phone"]'
                );


            const passwordInput =
                signupForm.querySelector(
                    'input[name="password"]'
                );


            const roleInput =
                signupForm.querySelector(
                    "#signupSelectedRole"
                );
            const locationInput = signupForm.querySelector('input[name="location"]') || 
                      signupForm.querySelector('input[name="city"]') || 
                      signupForm.querySelector('#signupLocation');

const userLocation = locationInput && locationInput.value.trim() 
                     ? locationInput.value.trim() 
                     : "India";

            // ------------------------------------------------
            // CHECK REQUIRED FIELDS
            // ------------------------------------------------

            if (!nameInput) {

                alert(
                    "Signup name field not found."
                );

                return;

            }


            if (!usernameInput) {

                alert(
                    "Signup username field not found."
                );

                return;

            }


            if (!emailInput) {

                alert(
                    "Signup email field not found."
                );

                return;

            }


            if (!phoneInput) {

                alert(
                    "Signup phone field not found."
                );

                return;

            }


            if (!passwordInput) {

                alert(
                    "Signup password field not found."
                );

                return;

            }


            // ------------------------------------------------
            // GET VALUES
            // ------------------------------------------------

            const name =
                nameInput.value.trim();


            const username =
                usernameInput.value.trim();


            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            const phone =
                phoneInput.value.trim();


            const password =
                passwordInput.value;

            
            // ------------------------------------------------
            // ROLE
            // ------------------------------------------------

            let selectedRole =
                roleInput
                    ? roleInput.value
                    : "CUSTOMER";


            selectedRole =
                selectedRole
                    .trim()
                    .toUpperCase();


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (!name) {

                showAuthToast(
    "Missing Information",
    "Please enter your name.",
    "error"
);

                return;

            }


            if (!username) {

                showAuthToast(
    "Missing Information",
    "Please enter your username.",
    "error"
);

                return;

            }


            if (!email) {

                showAuthToast(
    "Missing Information",
    "Please enter your email.",
    "error"
);

                return;

            }


            if (!phone) {

               showAuthToast(
    "Missing Information",
    "Please enter your phone number.",
    "error"
);

                return;

            }


            if (!password) {

                showAuthToast(
    "Missing Information",
    "Please enter your password.",
    "error"
);

                return;

            }


            // ------------------------------------------------
            // ROLE VALIDATION
            // ------------------------------------------------

            const allowedRoles = [

                "CUSTOMER",

                "SELLER",

                "SERVICE_PROVIDER"

            ];


            if (
                !allowedRoles.includes(
                    selectedRole
                )
            ) {

                selectedRole =
                    "CUSTOMER";

            }


            // ------------------------------------------------
            // CREATE BACKEND REQUEST
            // ------------------------------------------------

            const registerData = {

                name:
                    name,

                username:
                    username,

                email:
                    email,

                phone:
                    phone,

                password:
                    password,

                role:
                    
                        selectedRole.toLowerCase()
                    

            };


            console.log(
                "Register request:",
                registerData
            );


            // ------------------------------------------------
            // SEND REGISTER REQUEST
            // ------------------------------------------------

            try {

                const response =
                    await fetch(
                        API_BASE_URL +
                        "/api/auth/register",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    registerData
                                )

                        }
                    );


                const data =
                    await getResponseData(
                        response
                    );


                // ------------------------------------------------
                // SIGNUP FAILED
                // ------------------------------------------------

                if (!response.ok) {

                    console.error(
                        "Signup response:",
                        data
                    );


                    let errorMessage =
                        "Account creation failed.";


                    if (data.message) {

                        errorMessage =
                            data.message;

                    }

                    else if (data.error) {

                        errorMessage =
                            data.error;

                    }

                    else if (
                        data.errors &&
                        Array.isArray(data.errors)
                    ) {

                        errorMessage =
                            data.errors
                                .map(
                                    error =>
                                        error.defaultMessage ||
                                        error.message ||
                                        "Invalid field"
                                )
                                .join("\n");

                    }


                    showAuthToast(
    "Signup Failed",
    errorMessage,
    "error",
    5000
);

return;

                }


                // ------------------------------------------------
                // SAVE JWT
                // ------------------------------------------------

                if (data.token) {

                    localStorage.setItem(
                        "marketplaceToken",
                        data.token
                    );

                }


// ------------------------------------------------
// SAVE USER DATA FOR DASHBOARD
// ------------------------------------------------

localStorage.setItem(
    "marketplaceUser",
    JSON.stringify({
        username: data.username,
        roles: data.roles
    })
);

// Signup Form Submit hone par:
const phoneInput = signupForm.querySelector('input[name="phone"]');
const locationInput = signupForm.querySelector('input[name="location"]') || signupForm.querySelector('input[name="city"]');

const signedUpCustomer = {
    name: name,
    username: username,
    email: email,
    phone: phoneInput ? phoneInput.value.trim() : "",
    location: locationInput ? locationInput.value.trim() : ""
};

// LocalStorage me save karein
localStorage.setItem("currentUser", JSON.stringify(signedUpCustomer));
// ------------------------------------------------
// SUCCESS & REDIRECT
// ------------------------------------------------

showAuthToast(
    "Account Created Successfully",
    "Welcome to BuildBid! Redirecting to dashboard...",
    "success",
    2000
);

signupForm.reset();

// Signup ke baad seedha Customer Dashboard par bhejein
setTimeout(() => {
    closeAuth();
    window.location.href = "customer dashboard.html";
}, 1200);

 // ------------------------------------------------
// SIGNUP SUCCESS HANDLER
// ------------------------------------------------
const userProfileData = {
  name: name,
  username: username,
  email: email.toLowerCase(),
  phone: phone,
  location: userLocation || ""
};

// 1. Current user set karein
localStorage.setItem("currentUser", JSON.stringify(userProfileData));

// 2. Email ke sath permanent save karein (taaki next time login par mil sake)
localStorage.setItem("user_profile_" + email.toLowerCase(), JSON.stringify(userProfileData));               

}     

            catch (error) {

                console.error(
                    "Signup error:",
                    error
                );


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
// ESC KEY
// ============================================================

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key ===
            "Escape"
        ) {

            closeAuth();

        }

    }
);


// ============================================================
// ROLE SELECTOR
// ============================================================

function selectRole(role) {

    const customerBtn =
        document.querySelector(
            "#customerBtn"
        );


    const contractorBtn =
        document.querySelector(
            "#contractorBtn"
        );


    const roleInput =
        document.querySelector(
            "#selectedRole"
        );


    if (
        role ===
        "customer"
    ) {

        if (customerBtn) {

            customerBtn.classList.add(
                "active"
            );

        }


        if (contractorBtn) {

            contractorBtn.classList.remove(
                "active"
            );

        }


        if (roleInput) {

            roleInput.value =
                "customer";

        }

    }


    else if (
        role ===
        "contractor"
    ) {

        if (contractorBtn) {

            contractorBtn.classList.add(
                "active"
            );

        }


        if (customerBtn) {

            customerBtn.classList.remove(
                "active"
            );

        }


        if (roleInput) {

            roleInput.value =
                "contractor";

        }

    }

}


// ============================================================
// ROLE BUTTONS
// ============================================================

document
    .querySelectorAll(".role-btn")
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    // यहाँ तुम्हारा role button वाला code होगा

                }
            );

        }
    );






// ============================================================
// SIGNUP ROLE SELECTOR
// ============================================================

function selectSignupRole(
    element,
    role
) {

    const buttons =
        document.querySelectorAll(
            ".signup-role-btn"
        );


    buttons.forEach(
        function(btn) {

            btn.classList.remove(
                "active"
            );

        }
    );


    if (element) {

        element.classList.add(
            "active"
        );

    }


    const roleInput =
        document.querySelector(
            "#signupSelectedRole"
        );


    if (roleInput) {

        roleInput.value =
            role;

    }

}


// ============================================================
// PASSWORD EYE TOGGLE
// ============================================================

function togglePasswordVisibility(
    iconElement
) {

    if (!iconElement) {

        return;

    }


    const wrapper =
        iconElement.closest(
            ".buildbid-input-wrapper"
        );


    const passwordInput =
        wrapper
            ? wrapper.querySelector(
                "input"
            )
            : null;


    if (!passwordInput) {

        return;

    }


    if (
        passwordInput.type ===
        "password"
    ) {

        passwordInput.type =
            "text";


        iconElement.classList.remove(
            "fa-eye-slash"
        );


        iconElement.classList.add(
            "fa-eye"
        );

    }


    else {

        passwordInput.type =
            "password";


        iconElement.classList.remove(
            "fa-eye"
        );


        iconElement.classList.add(
            "fa-eye-slash"
        );

    }

}


// ============================================================
// PASSWORD EYE EVENT
// ============================================================

document.addEventListener(
    "click",
    function(event) {

        if (
            event.target &&
            event.target.classList.contains(
                "password-toggle"
            )
        ) {

            togglePasswordVisibility(
                event.target
            );

        }

    }
);


// ============================================================
// GET CURRENT LOGGED-IN USER
// ============================================================

async function getCurrentUser() {

    const token =
        localStorage.getItem(
            "marketplaceToken"
        );


    if (!token) {

        return null;

    }


    try {

        const response =
            await fetch(
                API_BASE_URL +
                "/api/me",
                {
                    method: "GET",

                    headers: {

                        "Authorization":
                            "Bearer " + token

                    }

                }
            );


        if (!response.ok) {

            localStorage.removeItem(
                "marketplaceToken"
            );

            localStorage.removeItem(
                "marketplaceUser"
            );

            return null;

        }


        const data =
            await response.json();


        return data;

    }


    catch (error) {

        console.error(
            "Profile error:",
            error
        );


        return null;

    }

}


// ============================================================
// HEALTH CHECK
// ============================================================

async function checkBackend() {

    try {

        const response =
            await fetch(
                API_BASE_URL +
                "/api/health"
            );


        const data =
            await response.json();


        console.log(
            "Backend status:",
            data
        );


        return data;

    }


    catch (error) {

        console.error(
            "Backend connection failed:",
            error
        );


        return null;

    }

}


// ============================================================
// OPTIONAL BACKEND CHECK
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "BuildBid frontend loaded."
        );

        console.log(
            "Backend:",
            API_BASE_URL
        );

    }
);
