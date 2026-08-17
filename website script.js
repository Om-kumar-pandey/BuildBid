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
// MESSAGE
// ============================================================

function showMessage(message) {

    alert(message);

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
            // GET EMAIL
            // ------------------------------------------------

            const emailInput =
                loginForm.querySelector(
                    'input[name="email"]'
                );


            // ------------------------------------------------
            // GET PASSWORD
            // ------------------------------------------------

            const passwordInput =
                loginForm.querySelector(
                    'input[name="password"]'
                );


            // ------------------------------------------------
            // CHECK INPUTS EXIST
            // ------------------------------------------------

            if (!emailInput) {

                alert(
                    "Login email field not found."
                );

                return;

            }


            if (!passwordInput) {

                alert(
                    "Login password field not found."
                );

                return;

            }


            // ------------------------------------------------
            // GET VALUES
            // ------------------------------------------------

            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            const password =
                passwordInput.value;


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (!email) {

                alert(
                    "Please enter your email."
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
            // SEND LOGIN REQUEST
            // ------------------------------------------------

            try {

                const response =
                    await fetch(
                        API_BASE_URL +
                        "/api/auth/login",
                        {
                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    email:
                                        email,

                                    password:
                                        password

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
                        "Login response:",
                        data
                    );


                    alert(

                        data.message ||

                        data.error ||

                        "Login failed. Please check your email and password."

                    );


                    return;

                }


                // ------------------------------------------------
                // JWT
                // ------------------------------------------------

                if (data.token) {

                    localStorage.setItem(
                        "marketplaceToken",
                        data.token
                    );

                }


                // ------------------------------------------------
                // USER DATA
                // ------------------------------------------------

                localStorage.setItem(

                    "marketplaceUser",

                    JSON.stringify({

                        username:
                            data.username,

                        roles:
                            data.roles

                    })

                );


                // ------------------------------------------------
                // SUCCESS
                // ------------------------------------------------

                alert(
                    "Login successful!"
                );


                loginForm.reset();


                closeAuth();

            }


            catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                alert(
                    "Unable to connect to the backend."
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


            const emailInput =
                signupForm.querySelector(
                    'input[name="email"]'
                );


            const passwordInput =
                signupForm.querySelector(
                    'input[name="password"]'
                );


            const roleInput =
                signupForm.querySelector(
                    "#signupSelectedRole"
                );


            // ------------------------------------------------
            // CHECK INPUTS
            // ------------------------------------------------

            if (!nameInput) {

                alert(
                    "Signup name field not found."
                );

                return;

            }


            if (!emailInput) {

                alert(
                    "Signup email field not found."
                );

                return;

            }


            if (!passwordInput) {

                alert(
                    "Signup password field not found."
                );

                return;

            }


            if (!roleInput) {

                alert(
                    "Signup role field not found."
                );

                return;

            }


            // ------------------------------------------------
            // GET VALUES
            // ------------------------------------------------

            const name =
                nameInput.value.trim();


            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            const password =
                passwordInput.value;


            let selectedRole =
                roleInput.value
                    .trim()
                    .toUpperCase();


            // ------------------------------------------------
            // BASIC VALIDATION
            // ------------------------------------------------

            if (!name) {

                alert(
                    "Please enter your name."
                );

                return;

            }


            if (!email) {

                alert(
                    "Please enter your email."
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
            // FRONTEND ROLE VALIDATION
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
            // MAP FRONTEND ROLE TO BACKEND ROLE
            // ------------------------------------------------

            let backendRole;


            if (
                selectedRole ===
                "CUSTOMER"
            ) {

                backendRole =
                    "customer";

            }


            else if (
                selectedRole ===
                "SELLER"
            ) {

                backendRole =
                    "contractor";

            }


            else if (
                selectedRole ===
                "SERVICE_PROVIDER"
            ) {

                backendRole =
                    "professional";

            }


            else {

                backendRole =
                    "customer";

            }


            // ------------------------------------------------
            // REGISTER REQUEST
            // ------------------------------------------------

            const registerData = {

                name:
                    name,

                email:
                    email,

                password:
                    password,

                role:
                    backendRole

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
                        Array.isArray(
                            data.errors
                        )
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


                    alert(
                        errorMessage
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
                // SAVE USER DATA
                // ------------------------------------------------

                localStorage.setItem(

                    "marketplaceUser",

                    JSON.stringify({

                        username:
                            data.username,

                        roles:
                            data.roles

                    })

                );


                // ------------------------------------------------
                // SUCCESS
                // ------------------------------------------------

                alert(
                    "Account created successfully!"
                );


                signupForm.reset();


                // Reset role back to CUSTOMER

                roleInput.value =
                    "CUSTOMER";


                document
                    .querySelectorAll(
                        ".signup-role-btn"
                    )
                    .forEach(
                        function(button, index) {

                            button.classList.toggle(
                                "active",
                                index === 0
                            );

                        }
                    );


                closeAuth();

            }


            catch (error) {

                console.error(
                    "Signup error:",
                    error
                );


                alert(
                    "Unable to connect to the backend."
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
