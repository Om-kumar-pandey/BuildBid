// ============================================================
// BACKEND CONFIGURATION
// ============================================================

const API_BASE_URL = "http://localhost:8080";


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
            // GET LOGIN INPUTS
            // ------------------------------------------------

            const emailInput =
                loginForm.querySelector(
                    'input[type="email"]'
                );

            const passwordInput =
                loginForm.querySelector(
                    'input[type="password"]'
                );


            if (!emailInput || !passwordInput) {

                alert(
                    "Login form fields not found."
                );

                return;

            }


            const email =
                emailInput.value.trim().toLowerCase();

            const password =
                passwordInput.value;


            // ------------------------------------------------
            // BASIC VALIDATION
            // ------------------------------------------------

            if (!email || !password) {

                alert(
                    "Please enter email and password."
                );

                return;

            }


            // ------------------------------------------------
            // CONNECT TO BACKEND
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

                                email: email,

                                password: password

                            })
                        }
                    );


                const data =
                    await response.json();


                // ------------------------------------------------
                // LOGIN FAILED
                // ------------------------------------------------

                if (!response.ok) {

                    alert(
                        data.message ||
                        data.error ||
                        "Login failed. Please check your email and password."
                    );

                    return;

                }


                // ------------------------------------------------
                // SAVE JWT TOKEN
                // ------------------------------------------------

                if (data.token) {

                    localStorage.setItem(
                        "marketplaceToken",
                        data.token
                    );

                }


                // ------------------------------------------------
                // SAVE USER INFORMATION
                // ------------------------------------------------

                localStorage.setItem(
                    "marketplaceUser",
                    JSON.stringify({
                        username: data.username,
                        roles: data.roles
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
                    "Unable to connect to the backend. Make sure the Spring Boot server is running."
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
            // GET SIGNUP INPUTS
            // ------------------------------------------------

            const nameInput =
                signupForm.querySelector(
                    'input[name="name"], input[type="text"]'
                );


            const emailInput =
                signupForm.querySelector(
                    'input[type="email"]'
                );


            const passwordInput =
                signupForm.querySelector(
                    'input[type="password"]'
                );


            const roleInput =
                document.querySelector(
                    "#signupSelectedRole"
                );


            if (
                !nameInput ||
                !emailInput ||
                !passwordInput
            ) {

                alert(
                    "Signup form fields not found."
                );

                return;

            }


            const name =
                nameInput.value.trim();

            const email =
                emailInput.value.trim().toLowerCase();

            const password =
                passwordInput.value;


            const role =
                roleInput
                    ? roleInput.value
                    : "customer";


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
            // CONNECT TO BACKEND
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

                                email: email,

                                password: password,

                                role: role

                            })
                        }
                    );


                const data =
                    await response.json();


                // ------------------------------------------------
                // SIGNUP FAILED
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
                // SAVE JWT TOKEN
                // ------------------------------------------------

                if (data.token) {

                    localStorage.setItem(
                        "marketplaceToken",
                        data.token
                    );

                }


                // ------------------------------------------------
                // SAVE USER INFORMATION
                // ------------------------------------------------

                localStorage.setItem(
                    "marketplaceUser",
                    JSON.stringify({
                        username: data.username,
                        roles: data.roles
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
                    "Unable to connect to the backend. Make sure the Spring Boot server is running."
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