// ================= GET STARTED =================

function goToRequirement() {

    const requirement = document.querySelector("#requirement");

    if (requirement) {

        requirement.scrollIntoView({
            behavior: "smooth"
        });

    }

}


// ================= LOGIN POPUP =================

function openAuth() {

    const auth = document.querySelector("#auth");

    if (auth) {

        auth.classList.add("show-auth");

        document.body.style.overflow = "hidden";

        showLogin();

    }

}


// ================= CLOSE LOGIN POPUP =================

function closeAuth() {

    const auth = document.querySelector("#auth");

    if (auth) {

        auth.classList.remove("show-auth");

        document.body.style.overflow = "";

    }

}


// ================= SHOW LOGIN =================

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


// ================= SHOW SIGNUP =================

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


// ================= MESSAGE =================

function showMessage(message) {

    alert(message);

}


// ================= REQUIREMENT FORM =================

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


// ================= LOGIN FORM =================

const loginForm =
    document.querySelector("#loginForm");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            alert(
                "Login successful! Database connection will be added later."
            );

            loginForm.reset();

            closeAuth();

        }
    );

}


// ================= SIGNUP FORM =================

const signupForm =
    document.querySelector("#signupForm");


if (signupForm) {

    signupForm.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            alert(
                "Account created successfully! Database connection will be added later."
            );

            signupForm.reset();

            closeAuth();

        }
    );

}


// ================= ESC KEY =================

document.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Escape") {

            closeAuth();

        }

    }
);