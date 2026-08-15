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
// ================= ROLE SELECTOR SWITCH =================

function selectRole(role) {
    const customerBtn = document.querySelector("#customerBtn");
    const contractorBtn = document.querySelector("#contractorBtn");
    const roleInput = document.querySelector("#selectedRole");

    if (role === 'customer') {
        customerBtn.classList.add("active");
        contractorBtn.classList.remove("active");
        if (roleInput) roleInput.value = "customer";
    } else if (role === 'contractor') {
        contractorBtn.classList.add("active");
        customerBtn.classList.remove("active");
        if (roleInput) roleInput.value = "contractor";
    }
}
// Role selection tabs functionality
document.querySelectorAll('.role-btn').forEach(button => {
    button.addEventListener('click', function(e) {
        // Prevent default form submission on button click
        e.preventDefault();
        
        // Remove active class from all role buttons
        document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
        
        // Add active class to the clicked button
        this.classList.add('active');
    });
});
// ================= SHOW SIGNUP =================
function showSignup() {
    const loginBox = document.querySelector("#loginFormBox");
    const signupBox = document.querySelector("#signupFormBox");

    if (loginBox && signupBox) {
        loginBox.classList.add("hidden");
        signupBox.classList.remove("hidden");
    }
}

// ================= SHOW LOGIN =================
function showLogin() {
    const loginBox = document.querySelector("#loginFormBox");
    const signupBox = document.querySelector("#signupFormBox");

    if (loginBox && signupBox) {
        loginBox.classList.remove("hidden");
        signupBox.classList.add("hidden");
    }
}
// ================= SIGNUP ROLE SELECTOR =================

function selectSignupRole(element, role) {
    // Remove active class from all signup role buttons
    const buttons = document.querySelectorAll(".signup-role-btn");
    buttons.forEach(btn => btn.classList.remove("active"));

    // Add active class to the selected button
    element.classList.add("active");

    // Set value in hidden input field
    const roleInput = document.querySelector("#signupSelectedRole");
    if (roleInput) {
        roleInput.value = role;
    }
}