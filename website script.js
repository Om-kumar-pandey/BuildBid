const API_BASE_URL = "https://buildbid-ap3j.onrender.com";


// ============================================================
// GET STARTED
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
// MESSAGE
// ============================================================

function showMessage(message) {
    alert(message);
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
            // USERNAME
            // ------------------------------------------------

            const usernameInput =
                loginForm.querySelector(
                    'input[name="username"]'
                ) ||
                loginForm.querySelector(
                    "#username"
                ) ||
                loginForm.querySelector(
                    "#loginUsername"
                ) ||
                loginForm.querySelector(
                    'input[type="email"]'
                );


            // ------------------------------------------------
            // PASSWORD
            // ------------------------------------------------

            const passwordInput =
                loginForm.querySelector(
                    'input[name="password"]'
                ) ||
                loginForm.querySelector(
                    "#password"
                ) ||
                loginForm.querySelector(
                    "#loginPassword"
                );


            if (!usernameInput || !passwordInput) {

                alert(
                    "Login username और password fields नहीं मिलीं."
                );

                return;
            }


            const username =
                usernameInput.value.trim();

            const password =
                passwordInput.value;


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (!username) {

                alert(
                    "Please enter your username."
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
            // LOGIN REQUEST
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

                            body: JSON.stringify({
                                username: username,
                                password: password
                            })
                        }
                    );


                const text =
                    await response.text();


                let data = {};

                try {
                    data = text
                        ? JSON.parse(text)
                        : {};
                }
                catch {
                    data = {};
                }


                // ------------------------------------------------
                // LOGIN ERROR
                // ------------------------------------------------

                if (!response.ok) {

                    alert(
                        data.message ||
                        data.error ||
                        "Login failed. Please check your username and password."
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
                // SAVE USER
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
                    "Unable to connect to the backend. Please check your Render service."
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
            // NAME
            // ------------------------------------------------

            const nameInput =
                signupForm.querySelector(
                    'input[name="name"]'
                ) ||
                signupForm.querySelector(
                    "#name"
                ) ||
                signupForm.querySelector(
                    "#signupName"
                );


            // ------------------------------------------------
            // USERNAME
            // ------------------------------------------------

            const usernameInput =
                signupForm.querySelector(
                    'input[name="username"]'
                ) ||
                signupForm.querySelector(
                    "#username"
                ) ||
                signupForm.querySelector(
                    "#signupUsername"
                );


            // ------------------------------------------------
            // EMAIL
            // ------------------------------------------------

            const emailInput =
                signupForm.querySelector(
                    'input[name="email"]'
                ) ||
                signupForm.querySelector(
                    "#email"
                ) ||
                signupForm.querySelector(
                    "#signupEmail"
                );


            // ------------------------------------------------
            // PHONE
            // ------------------------------------------------

            const phoneInput =
                signupForm.querySelector(
                    'input[name="phone"]'
                ) ||
                signupForm.querySelector(
                    "#phone"
                ) ||
                signupForm.querySelector(
                    "#signupPhone"
                ) ||
                signupForm.querySelector(
                    'input[type="tel"]'
                );


            // ------------------------------------------------
            // PASSWORD
            // ------------------------------------------------

            const passwordInput =
                signupForm.querySelector(
                    'input[name="password"]'
                ) ||
                signupForm.querySelector(
                    "#password"
                ) ||
                signupForm.querySelector(
                    "#signupPassword"
                );


            // ------------------------------------------------
            // CHECK REQUIRED FIELDS
            // ------------------------------------------------

            if (!nameInput) {

                alert(
                    "Signup name field नहीं मिली."
                );

                return;
            }


            if (!usernameInput) {

                alert(
                    "Signup username field नहीं मिली."
                );

                return;
            }


            if (!emailInput) {

                alert(
                    "Signup email field नहीं मिली."
                );

                return;
            }


            if (!phoneInput) {

                alert(
                    "Signup phone field नहीं मिली."
                );

                return;
            }


            if (!passwordInput) {

                alert(
                    "Signup password field नहीं मिली."
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
            // GET ROLE
            // ------------------------------------------------

            const roleInput =
                document.querySelector(
                    "#signupSelectedRole"
                );


            let role =
                roleInput
                    ? roleInput.value
                    : "CUSTOMER";


            role =
                role
                    .trim()
                    .toUpperCase();


            // ------------------------------------------------
            // CONVERT FRONTEND ROLE
            // TO BACKEND ROLE
            // ------------------------------------------------

            if (role === "CUSTOMER") {

                role = "CUSTOMER";

            }
            else if (
                role === "SELLER"
            ) {

                role = "SELLER";

            }
            else if (
                role === "CONTRACTOR"
            ) {

                role = "SERVICE_PROVIDER";

            }
            else if (
                role === "SERVICE PROVIDER"
            ) {

                role = "SERVICE_PROVIDER";

            }
            else if (
                role === "SERVICE_PROVIDER"
            ) {

                role = "SERVICE_PROVIDER";

            }
            else {

                role = "CUSTOMER";
            }


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (!name) {

                alert(
                    "Please enter your name."
                );

                return;
            }


            if (!username) {

                alert(
                    "Please enter a username."
                );

                return;
            }


            if (!email) {

                alert(
                    "Please enter your email."
                );

                return;
            }


            if (!phone) {

                alert(
                    "Please enter your phone number."
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
            // PASSWORD REQUIREMENT
            // Backend requires:
            // 13-17 characters
            // uppercase
            // lowercase
            // number
            // special character
            // ------------------------------------------------

            if (
                password.length < 13 ||
                password.length > 17
            ) {

                alert(
                    "Password must be 13-17 characters long."
                );

                return;
            }


            if (!/[A-Z]/.test(password)) {

                alert(
                    "Password must contain at least one uppercase letter."
                );

                return;
            }


            if (!/[a-z]/.test(password)) {

                alert(
                    "Password must contain at least one lowercase letter."
                );

                return;
            }


            if (!/[0-9]/.test(password)) {

                alert(
                    "Password must contain at least one number."
                );

                return;
            }


            if (!/[^A-Za-z0-9]/.test(password)) {

                alert(
                    "Password must contain at least one special character."
                );

                return;
            }


            // ------------------------------------------------
            // REGISTER REQUEST
            // ------------------------------------------------

            try {

                const response =
                    await fetch(
                        API_BASE_URL +
                        "/api/auth/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                name: name,

                                username: username,

                                email: email,

                                phone: phone,

                                password: password,

                                roles: [role]
                            })
                        }
                    );


                const text =
                    await response.text();


                let data = {};

                try {
                    data = text
                        ? JSON.parse(text)
                        : {};
                }
                catch {
                    data = {};
                }


                // ------------------------------------------------
                // REGISTER ERROR
                // ------------------------------------------------

                if (!response.ok) {

                    alert(
                        data.message ||
                        data.error ||
                        "Account creation failed."
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
                // SAVE USER
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


                alert(
                    "Account created successfully!"
                );


                signupForm.reset();

                closeAuth();

            }
            catch (error) {

                console.error(
                    "Signup error:",
                    error
                );


                alert(
                    "Unable to connect to the backend. Please check your Render service."
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

        if (event.key === "Escape") {

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


    if (role === "customer") {

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


    else if (role === "contractor") {

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


                    document
                        .querySelectorAll(
                            ".role-btn"
                        )
                        .forEach(
                            function(btn) {

                                btn.classList.remove(
                                    "active"
                                );
                            }
                        );


                    this.classList.add(
                        "active"
                    );
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