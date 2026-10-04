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
        window.location.href = resolvePath("seller-dashboard.html");
    } else if (role === "PROFESSIONAL" || role === "SERVICE_PROVIDER") {
        window.location.href = resolvePath("professional dashboard.html");
    } else {
        window.location.href = resolvePath("customer dashboard.html");
    }
}

function isUserLoggedIn() {
    return !!getCleanToken();
}

function getCurrentUserRole() {
    if (!isUserLoggedIn()) return null;
    try {
        const currentJson = localStorage.getItem("currentUser");
        if (currentJson) {
            const currentUser = JSON.parse(currentJson);
            if (currentUser && currentUser.role) {
                let r = currentUser.role.replace("ROLE_", "").trim().toUpperCase();
                if (r === "SELLER") r = "MATERIAL_SELLER";
                if (r === "SERVICE_PROVIDER") r = "PROFESSIONAL";
                return r;
            }
        }
        const userJson = localStorage.getItem("marketplaceUser");
        if (userJson) {
            const user = JSON.parse(userJson);
            if (user && user.roles && user.roles.length > 0) {
                const primary = user.roles[0];
                let rName = typeof primary === "string" ? primary : primary.name || "";
                rName = rName.replace("ROLE_", "").trim().toUpperCase();
                if (rName === "SELLER") rName = "MATERIAL_SELLER";
                if (rName === "SERVICE_PROVIDER") rName = "PROFESSIONAL";
                return rName;
            }
        }
    } catch (e) {
        console.error("Error reading user role:", e);
    }
    return "CUSTOMER";
}

// ============================================================
// BUILDBID FEATURE SHOWCASE - 22 FEATURES CATALOG
// ============================================================
const BUILDBID_FEATURES = [
    // ----------------- 1. CUSTOMER FEATURES -----------------
    {
        id: "customer-post-project",
        category: "CUSTOMER",
        roleBadge: "CUSTOMER",
        roleClass: "badge-customer",
        icon: "fa-solid fa-house-chimney",
        titleEn: "Post Your Project",
        titleHi: "अपना प्रोजेक्ट पोस्ट करें",
        descEn: "Share your construction requirements, project type, location, area and other important details to start your construction journey on BuildBid.",
        descHi: "अपनी construction requirements, project type, location, area और अन्य जरूरी details साझा करके BuildBid पर अपनी construction journey शुरू करें।",
        buttonText: "Post Project →",
        targetUrl: "create project.html",
        allowedRoles: ["CUSTOMER"],
        cardTheme: "customer-card"
    },
    {
        id: "customer-cost-estimator",
        category: "CUSTOMER",
        roleBadge: "CUSTOMER",
        roleClass: "badge-customer",
        icon: "fa-solid fa-calculator",
        titleEn: "Construction Cost Estimator",
        titleHi: "निर्माण लागत का अनुमान",
        descEn: "Get an approximate construction cost based on your project location, built-up area, floors, construction requirements and current material and labour rates.",
        descHi: "अपने project की location, built-up area, floors, construction requirements तथा current material और labour rates के आधार पर अनुमानित construction cost जानें।",
        buttonText: "Estimate Cost →",
        targetUrl: "create project.html",
        allowedRoles: ["CUSTOMER"],
        cardTheme: "customer-card"
    },
    {
        id: "customer-buy-materials",
        category: "CUSTOMER",
        roleBadge: "CUSTOMER • CONTRACTOR • PRO",
        roleClass: "badge-cross-role",
        icon: "fa-solid fa-cubes-stacked",
        titleEn: "Buy Construction Materials",
        titleHi: "निर्माण सामग्री खरीदें",
        descEn: "Find and purchase construction materials from BuildBid material sellers for your projects and construction work. Customers, contractors and professionals can all purchase materials according to their requirements.",
        descHi: "अपने projects और construction work के लिए BuildBid material sellers से construction materials खोजें और खरीदें। Customer, Contractor और Professional — तीनों अपनी जरूरत के अनुसार materials खरीद सकते हैं।",
        buttonText: "Explore Materials →",
        targetUrl: "buy material.html",
        allowedRoles: ["CUSTOMER", "CONTRACTOR", "PROFESSIONAL"],
        cardTheme: "material-card"
    },
    {
        id: "customer-hire-professionals",
        category: "CUSTOMER",
        roleBadge: "CUSTOMER • CONTRACTOR • PRO",
        roleClass: "badge-cross-role",
        icon: "fa-solid fa-user-doctor",
        titleEn: "Hire Professionals",
        titleHi: "प्रोफेशनल्स को हायर करें",
        descEn: "Find skilled professionals such as engineers, electricians, plumbers, painters, masons and other service providers for your construction requirements. Customers, contractors and professionals can all hire suitable experts when needed.",
        descHi: "अपनी construction requirements के लिए engineers, electricians, plumbers, painters, masons और अन्य skilled professionals खोजें। Customer, Contractor और Professional — तीनों जरूरत के अनुसार suitable experts को hire कर सकते हैं।",
        buttonText: "Hire Now →",
        targetUrl: "direct-hire.html",
        allowedRoles: ["CUSTOMER", "CONTRACTOR", "PROFESSIONAL"],
        cardTheme: "hiring-card"
    },
    {
        id: "customer-compare-bids",
        category: "CUSTOMER",
        roleBadge: "CUSTOMER",
        roleClass: "badge-customer",
        icon: "fa-solid fa-scale-balanced",
        titleEn: "Compare Project Bids",
        titleHi: "प्रोजेक्ट बिड्स की तुलना करें",
        descEn: "Receive contractor quotations for your project and compare available bids to make a better and more informed construction decision.",
        descHi: "अपने project के लिए contractor quotations प्राप्त करें और available bids की तुलना करके बेहतर और informed construction decision लें।",
        buttonText: "Compare Bids →",
        targetUrl: "customer projects.html",
        allowedRoles: ["CUSTOMER"],
        cardTheme: "customer-card"
    },
    {
        id: "customer-manage-project",
        category: "CUSTOMER",
        roleBadge: "CUSTOMER",
        roleClass: "badge-customer",
        icon: "fa-solid fa-list-check",
        titleEn: "Manage Your Project",
        titleHi: "अपने प्रोजेक्ट को मैनेज करें",
        descEn: "Keep track of your construction project, project activities, milestones and important progress from one place.",
        descHi: "अपने construction project की activities, milestones और important progress को एक ही जगह से track और manage करें।",
        buttonText: "Manage Project →",
        targetUrl: "customer dashboard.html",
        allowedRoles: ["CUSTOMER"],
        cardTheme: "customer-card"
    },

    // ----------------- 2. CONTRACTOR FEATURES -----------------
    {
        id: "contractor-find-projects",
        category: "CONTRACTOR",
        roleBadge: "CONTRACTOR",
        roleClass: "badge-contractor",
        icon: "fa-solid fa-magnifying-glass-location",
        titleEn: "Find Construction Projects",
        titleHi: "कंस्ट्रक्शन प्रोजेक्ट्स खोजें",
        descEn: "Discover construction projects that match your skills, experience, location and expertise, and find new opportunities to grow your contracting business.",
        descHi: "अपनी skills, experience, location और expertise के अनुसार construction projects खोजें और अपने contracting business को बढ़ाने के लिए नई opportunities पाएं।",
        buttonText: "Find Projects →",
        targetUrl: "contractor-projects.html",
        allowedRoles: ["CONTRACTOR"],
        cardTheme: "contractor-card"
    },
    {
        id: "contractor-submit-bids",
        category: "CONTRACTOR",
        roleBadge: "CONTRACTOR",
        roleClass: "badge-contractor",
        icon: "fa-solid fa-file-signature",
        titleEn: "Submit Project Bids",
        titleHi: "प्रोजेक्ट बिड्स सबमिट करें",
        descEn: "Submit competitive quotations and bids for suitable construction projects and present your services to potential customers.",
        descHi: "Suitable construction projects के लिए competitive quotations और bids submit करें और potential customers तक अपनी services पहुंचाएं।",
        buttonText: "Submit Bid →",
        targetUrl: "contractor-projects.html",
        allowedRoles: ["CONTRACTOR"],
        cardTheme: "contractor-card"
    },
    {
        id: "contractor-manage-projects",
        category: "CONTRACTOR",
        roleBadge: "CONTRACTOR",
        roleClass: "badge-contractor",
        icon: "fa-solid fa-diagram-project",
        titleEn: "Manage Your Projects",
        titleHi: "अपने प्रोजेक्ट्स को मैनेज करें",
        descEn: "Manage your accepted construction projects, track project progress and keep your project activities organized from one place.",
        descHi: "अपने accepted construction projects को manage करें, project progress track करें और project activities को एक ही जगह से व्यवस्थित रखें।",
        buttonText: "Manage Projects →",
        targetUrl: "contractor-dashboard.html",
        allowedRoles: ["CONTRACTOR"],
        cardTheme: "contractor-card"
    },
    {
        id: "contractor-buy-materials",
        category: "CONTRACTOR",
        roleBadge: "CONTRACTOR",
        roleClass: "badge-contractor",
        icon: "fa-solid fa-truck-ramp-box",
        titleEn: "Buy Construction Materials",
        titleHi: "निर्माण सामग्री खरीदें",
        descEn: "Purchase construction materials required for your projects directly through BuildBid. Contractors can browse available materials and place material orders according to their project requirements.",
        descHi: "अपने projects के लिए आवश्यक construction materials BuildBid के माध्यम से खरीदें। Contractors available materials देख सकते हैं और अपनी project requirements के अनुसार orders कर सकते हैं।",
        buttonText: "Buy Materials →",
        targetUrl: "buy material.html",
        allowedRoles: ["CONTRACTOR", "CUSTOMER", "PROFESSIONAL"],
        cardTheme: "material-card"
    },
    {
        id: "contractor-hire-professionals",
        category: "CONTRACTOR",
        roleBadge: "CONTRACTOR",
        roleClass: "badge-contractor",
        icon: "fa-solid fa-users-gear",
        titleEn: "Hire Professionals",
        titleHi: "प्रोफेशनल्स को हायर करें",
        descEn: "Find and hire skilled professionals required for your construction projects, including engineers, electricians, plumbers, painters and other specialists.",
        descHi: "अपने construction projects के लिए engineers, electricians, plumbers, painters और अन्य skilled specialists को खोजें और hire करें।",
        buttonText: "Hire Professionals →",
        targetUrl: "direct-hire.html",
        allowedRoles: ["CONTRACTOR", "CUSTOMER", "PROFESSIONAL"],
        cardTheme: "hiring-card"
    },

    // ----------------- 3. MATERIAL SELLER FEATURES -----------------
    {
        id: "seller-add-inventory",
        category: "MATERIAL_SELLER",
        roleBadge: "MATERIAL SELLER",
        roleClass: "badge-seller",
        isProminent: true,
        spotlightText: "Seller Spotlight",
        icon: "fa-solid fa-boxes-stacked",
        titleEn: "Add & Manage Your Inventory",
        titleHi: "अपनी दुकान का पूरा इन्वेंटरी जोड़ें",
        descEn: "Add the construction materials available in your shop to your BuildBid inventory. Add important details such as material name, category, available quantity, pricing and other relevant information so customers, contractors and professionals can discover the materials you sell and place orders.",
        descHi: "अपनी दुकान में उपलब्ध सभी construction materials को अपने BuildBid inventory में जोड़ें। Material का नाम, category, available quantity, price और अन्य जरूरी details add करें, ताकि customers, contractors और professionals आपके available materials को आसानी से खोज सकें और order कर सकें।",
        buttonText: "Add Inventory →",
        targetUrl: "add-material.html",
        allowedRoles: ["MATERIAL_SELLER", "SELLER"],
        cardTheme: "material-card is-spotlight"
    },
    {
        id: "seller-generate-invoices",
        category: "MATERIAL_SELLER",
        roleBadge: "MATERIAL SELLER",
        roleClass: "badge-seller",
        icon: "fa-solid fa-file-invoice-dollar",
        titleEn: "Generate Invoices",
        titleHi: "इनवॉयस जनरेट करें",
        descEn: "Generate professional invoices for your material orders and sales, making it easier to manage transactions and provide clear order details to buyers.",
        descHi: "अपने material orders और sales के लिए professional invoices generate करें, जिससे transactions और buyers के order details को आसानी से manage किया जा सके।",
        buttonText: "Generate Invoice →",
        targetUrl: "seller-dashboard.html#invoices",
        allowedRoles: ["MATERIAL_SELLER", "SELLER"],
        cardTheme: "material-card"
    },
    {
        id: "seller-check-requests",
        category: "MATERIAL_SELLER",
        roleBadge: "MATERIAL SELLER",
        roleClass: "badge-seller",
        icon: "fa-solid fa-clipboard-question",
        titleEn: "Check Material Requests",
        titleHi: "मटेरियल रिक्वेस्ट देखें",
        descEn: "View and manage material requests submitted by customers, contractors and professionals who are looking for specific construction materials.",
        descHi: "उन customers, contractors और professionals की material requests देखें और manage करें जिन्हें specific construction materials की आवश्यकता है।",
        buttonText: "View Requests →",
        targetUrl: "seller-dashboard.html#requests",
        allowedRoles: ["MATERIAL_SELLER", "SELLER"],
        cardTheme: "material-card"
    },
    {
        id: "seller-manage-orders",
        category: "MATERIAL_SELLER",
        roleBadge: "MATERIAL SELLER",
        roleClass: "badge-seller",
        icon: "fa-solid fa-box-open",
        titleEn: "Manage Material Orders",
        titleHi: "मटेरियल ऑर्डर्स मैनेज करें",
        descEn: "View and manage incoming material orders, track order-related activities and keep your material sales organized from one place.",
        descHi: "आने वाले material orders को देखें और manage करें, order-related activities को track करें और अपनी material sales को एक ही जगह व्यवस्थित रखें।",
        buttonText: "Manage Orders →",
        targetUrl: "seller-dashboard.html#orders",
        allowedRoles: ["MATERIAL_SELLER", "SELLER"],
        cardTheme: "material-card"
    },

    // ----------------- 4. PROFESSIONAL FEATURES -----------------
    {
        id: "pro-find-work",
        category: "PROFESSIONAL",
        roleBadge: "PROFESSIONAL",
        roleClass: "badge-pro",
        icon: "fa-solid fa-briefcase",
        titleEn: "Find Work Leads",
        titleHi: "काम के लीड्स खोजें",
        descEn: "Discover relevant construction work opportunities and potential leads based on your professional services, skills, expertise and location.",
        descHi: "अपनी professional services, skills, expertise और location के अनुसार relevant construction work opportunities और potential leads खोजें।",
        buttonText: "Find Work →",
        targetUrl: "professional dashboard.html",
        allowedRoles: ["PROFESSIONAL", "SERVICE_PROVIDER"],
        cardTheme: "hiring-card"
    },
    {
        id: "pro-service-requests",
        category: "PROFESSIONAL",
        roleBadge: "PROFESSIONAL",
        roleClass: "badge-pro",
        icon: "fa-solid fa-bell-concierge",
        titleEn: "Service Requests",
        titleHi: "सर्विस रिक्वेस्ट",
        descEn: "Receive and manage service requests from customers, contractors and other BuildBid users who need your professional expertise.",
        descHi: "अपनी professional expertise की जरूरत वाले customers, contractors और अन्य BuildBid users से आने वाली service requests प्राप्त करें और manage करें।",
        buttonText: "View Requests →",
        targetUrl: "professional dashboard.html",
        allowedRoles: ["PROFESSIONAL", "SERVICE_PROVIDER"],
        cardTheme: "hiring-card"
    },
    {
        id: "pro-schedule-calendar",
        category: "PROFESSIONAL",
        roleBadge: "PROFESSIONAL",
        roleClass: "badge-pro",
        icon: "fa-regular fa-calendar-days",
        titleEn: "Schedule & Calendar",
        titleHi: "शेड्यूल और कैलेंडर",
        descEn: "Organize your work schedule, manage appointments and keep track of upcoming service activities so you can manage your professional work efficiently.",
        descHi: "अपने work schedule को व्यवस्थित करें, appointments manage करें और upcoming service activities को track करें, ताकि अपने professional work को efficiently manage कर सकें।",
        buttonText: "Open Calendar →",
        targetUrl: "professional dashboard.html",
        allowedRoles: ["PROFESSIONAL", "SERVICE_PROVIDER"],
        cardTheme: "hiring-card"
    },
    {
        id: "pro-service-catalog",
        category: "PROFESSIONAL",
        roleBadge: "PROFESSIONAL",
        roleClass: "badge-pro",
        isProminent: true,
        spotlightText: "Pro Catalog",
        icon: "fa-solid fa-book-open-reader",
        titleEn: "My Service Catalog",
        titleHi: "मेरा सर्विस कैटलॉग",
        descEn: "Create and manage your professional service catalog by adding the services you offer, pricing, pricing units and other important service details. Keep your service listings updated and available for BuildBid users.",
        descHi: "अपनी professional service catalog बनाएं और manage करें। अपनी services, pricing, pricing units और अन्य जरूरी service details जोड़ें। अपनी service listings को updated रखें ताकि BuildBid users आपकी services देख सकें।",
        buttonText: "Manage Services →",
        targetUrl: "add-new-service.html",
        allowedRoles: ["PROFESSIONAL", "SERVICE_PROVIDER"],
        cardTheme: "hiring-card is-spotlight-pro"
    },
    {
        id: "pro-direct-hire",
        category: "PROFESSIONAL",
        roleBadge: "PROFESSIONAL",
        roleClass: "badge-pro",
        icon: "fa-solid fa-handshake-angle",
        titleEn: "Direct Hire",
        titleHi: "सीधे हायर हों",
        descEn: "Get directly hired for the professional services you offer by BuildBid users who are looking for skilled and suitable service providers.",
        descHi: "अपनी professional services के लिए उन BuildBid users से सीधे hire होने का अवसर पाएं जिन्हें skilled और suitable service providers की जरूरत है।",
        buttonText: "View Hiring →",
        targetUrl: "professional dashboard.html",
        allowedRoles: ["PROFESSIONAL", "SERVICE_PROVIDER"],
        cardTheme: "hiring-card"
    },
    {
        id: "pro-manage-pricing",
        category: "PROFESSIONAL",
        roleBadge: "PROFESSIONAL",
        roleClass: "badge-pro",
        icon: "fa-solid fa-tags",
        titleEn: "Manage Service Pricing",
        titleHi: "सर्विस प्राइसिंग मैनेज करें",
        descEn: "Set and manage the pricing and pricing units for the professional services you offer, helping users understand your service charges clearly.",
        descHi: "अपनी professional services की pricing और pricing units तय करें और manage करें, ताकि users आपकी service charges को आसानी से समझ सकें।",
        buttonText: "Manage Pricing →",
        targetUrl: "add-new-service.html",
        allowedRoles: ["PROFESSIONAL", "SERVICE_PROVIDER"],
        cardTheme: "hiring-card"
    },
    {
        id: "pro-manage-active",
        category: "PROFESSIONAL",
        roleBadge: "PROFESSIONAL",
        roleClass: "badge-pro",
        icon: "fa-solid fa-toggle-on",
        titleEn: "Manage Active Services",
        titleHi: "एक्टिव सर्विसेज मैनेज करें",
        descEn: "Control which professional services are currently available to BuildBid users and keep your service listings accurate and up to date.",
        descHi: "Control करें कि आपकी कौन-कौन सी professional services अभी BuildBid users के लिए available हैं और अपनी service listings को accurate तथा updated रखें।",
        buttonText: "Manage Services →",
        targetUrl: "professional dashboard.html",
        allowedRoles: ["PROFESSIONAL", "SERVICE_PROVIDER"],
        cardTheme: "hiring-card"
    }
];

// ============================================================
// FEATURE CARD CLICK & ROLE SECURITY HANDLER
// ============================================================
function handleFeatureCardClick(featureId) {
    const feature = BUILDBID_FEATURES.find(f => f.id === featureId);
    if (!feature) return;

    // 1. Not Logged In State
    if (!isUserLoggedIn()) {
        sessionStorage.setItem("pendingRedirect", resolvePath(feature.targetUrl));
        sessionStorage.setItem("pendingFeatureTitle", feature.titleEn);
        sessionStorage.setItem("pendingRequiredRoles", JSON.stringify(feature.allowedRoles));

        showAuthToast(
            "Login Required",
            `Please login or create an account to access "${feature.titleEn}".`,
            "warning",
            4500
        );
        openAuth();
        return;
    }

    // 2. Logged-in State: Role verification
    const currentRole = getCurrentUserRole();

    // Special constraint: Material Sellers cannot buy materials as a buyer
    if (feature.id.includes("buy-materials") && (currentRole === "MATERIAL_SELLER" || currentRole === "SELLER")) {
        showAuthToast(
            "Action Not Allowed",
            "Material sellers cannot purchase materials as a buyer.",
            "warning",
            5000
        );
        return;
    }

    // Role check
    const isAllowed = feature.allowedRoles.includes(currentRole);

    if (!isAllowed) {
        const roleLabels = {
            CUSTOMER: "Customer",
            CONTRACTOR: "Contractor",
            MATERIAL_SELLER: "Material Seller",
            SELLER: "Material Seller",
            PROFESSIONAL: "Professional",
            SERVICE_PROVIDER: "Professional"
        };
        const userRoleLabel = roleLabels[currentRole] || currentRole;
        const requiredRoleLabels = feature.allowedRoles.map(r => roleLabels[r] || r).join(" or ");

        showAuthToast(
            "Access Restricted",
            `This feature requires a ${requiredRoleLabels} account. You are currently logged in as a ${userRoleLabel}.`,
            "warning",
            5000
        );
        return;
    }

    // Authorized: Navigate to the target page
    window.location.href = resolvePath(feature.targetUrl);
}

// Protected action for homepage legacy buttons (e.g. CTA banners)
function handleProtectedAction(actionType) {
    if (!isUserLoggedIn()) {
        let redirectTarget = "create project.html";
        let reqRoles = ["CUSTOMER"];
        if (actionType === "POST_PROJECT") {
            redirectTarget = "create project.html";
            reqRoles = ["CUSTOMER"];
        } else if (actionType === "FIND_CONTRACTORS") {
            redirectTarget = "contactor.html";
            reqRoles = ["CUSTOMER"];
        } else if (actionType === "BUY_MATERIALS") {
            redirectTarget = "buy material.html";
            reqRoles = ["CUSTOMER", "CONTRACTOR", "PROFESSIONAL"];
        } else if (actionType === "HIRE_PROFESSIONALS") {
            redirectTarget = "direct-hire.html";
            reqRoles = ["CUSTOMER", "CONTRACTOR", "PROFESSIONAL"];
        }

        sessionStorage.setItem("pendingRedirect", resolvePath(redirectTarget));
        sessionStorage.setItem("pendingRequiredRoles", JSON.stringify(reqRoles));
        showAuthToast("Login Required", "Please login or create an account to access this feature.", "warning", 4000);
        openAuth();
        return;
    }

    const userRole = getCurrentUserRole();

    switch (actionType) {
        case "POST_PROJECT":
            if (userRole !== "CUSTOMER") {
                showAuthToast("Access Denied", "Only Customer accounts can post projects.", "warning", 5000);
                return;
            }
            window.location.href = resolvePath("create project.html");
            break;
        case "FIND_CONTRACTORS":
            window.location.href = resolvePath("contactor.html");
            break;
        case "BUY_MATERIALS":
            if (userRole === "MATERIAL_SELLER" || userRole === "SELLER") {
                showAuthToast("Action Not Allowed", "Material sellers cannot purchase materials as a buyer.", "warning", 5000);
                return;
            }
            window.location.href = resolvePath("buy material.html");
            break;
        case "HIRE_PROFESSIONALS":
            window.location.href = resolvePath("direct-hire.html");
            break;
        default:
            window.location.href = resolvePath("create project.html");
    }
}

// ============================================================
// HOMEPAGE FEATURE SHOWCASE - 1 SECOND AUTO-ROTATION CAROUSEL
// ============================================================
let featureCarouselState = {
    currentIndex: 0,
    intervalId: null,
    isPaused: false,
    isAnimating: false,
    rotationIntervalMs: 1000 // Exact 1-second auto-rotation per specification
};

function getVisibleCardCount() {
    const width = window.innerWidth;
    if (width <= 768) return 1;
    if (width <= 1024) return 2;
    return 4; // Exactly 4 cards visible at any time on desktop
}

function computeCardWidth() {
    const viewport = document.getElementById("serviceGridViewport");
    if (!viewport) return 280;
    const visibleCount = getVisibleCardCount();
    const gap = 18;
    const totalGap = (visibleCount - 1) * gap;
    return (viewport.clientWidth - totalGap) / visibleCount;
}

function renderFeatureCardHtml(feature, isIncoming = false) {
    const prominentBadge = feature.isProminent
        ? `<span class="service-spotlight-badge"><i class="fa-solid fa-star"></i> ${feature.spotlightText || "Featured"}</span>`
        : "";

    return `
        <div class="service-card ${feature.cardTheme} ${isIncoming ? 'incoming-card' : ''}" 
             data-feature-id="${feature.id}" 
             onclick="handleFeatureCardClick('${feature.id}')">
            <div class="service-card-header">
                <span class="service-role-badge ${feature.roleClass}">
                    <i class="fa-solid fa-shield-halved"></i> ${feature.roleBadge}
                </span>
                ${prominentBadge}
            </div>

            <div class="service-card-body">
                <div class="service-icon-wrap">
                    <i class="${feature.icon}"></i>
                </div>

                <h3 class="service-title-en">${feature.titleEn}</h3>
                <h4 class="service-title-hi">${feature.titleHi}</h4>

                <div class="service-card-divider"></div>

                <p class="service-desc-en">${feature.descEn}</p>
                <p class="service-desc-hi">${feature.descHi}</p>
            </div>

            <div class="service-card-footer">
                <button type="button" class="service-action-btn" onclick="event.stopPropagation(); handleFeatureCardClick('${feature.id}')">
                    <span>${feature.buttonText}</span>
                    <i class="fa-solid fa-arrow-right btn-arrow"></i>
                </button>
            </div>
        </div>
    `;
}

function renderCarouselCards(startIndex) {
    const track = document.getElementById("serviceTrack");
    if (!track) return;

    const visibleCount = getVisibleCardCount();
    const totalToRender = visibleCount + 1; // 4 visible cards + 1 incoming card
    const totalFeatures = BUILDBID_FEATURES.length;

    let html = "";
    for (let i = 0; i < totalToRender; i++) {
        const featureIdx = (startIndex + i) % totalFeatures;
        const feature = BUILDBID_FEATURES[featureIdx];
        html += renderFeatureCardHtml(feature, i === visibleCount);
    }

    track.innerHTML = html;

    const cardWidth = computeCardWidth();
    const cards = track.querySelectorAll(".service-card");
    cards.forEach(card => {
        card.style.flex = `0 0 ${cardWidth}px`;
        card.style.width = `${cardWidth}px`;
        card.style.maxWidth = `${cardWidth}px`;
    });
}

function rotateNextCard() {
    if (featureCarouselState.isPaused || featureCarouselState.isAnimating) return;

    const track = document.getElementById("serviceTrack");
    if (!track) return;

    featureCarouselState.isAnimating = true;

    const cardWidth = computeCardWidth();
    const gap = 18;
    const shiftDistance = cardWidth + gap;

    track.style.transition = "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
    track.style.transform = `translateX(-${shiftDistance}px)`;

    setTimeout(() => {
        featureCarouselState.currentIndex = (featureCarouselState.currentIndex + 1) % BUILDBID_FEATURES.length;
        renderCarouselCards(featureCarouselState.currentIndex);
        track.style.transition = "none";
        track.style.transform = "translateX(0)";
        void track.offsetWidth; // Force synchronous layout reflow
        featureCarouselState.isAnimating = false;
    }, 400);
}


function startFeatureAutoRotation() {
    stopFeatureAutoRotation();
    featureCarouselState.intervalId = setInterval(() => {
        rotateNextCard();
    }, featureCarouselState.rotationIntervalMs);
}

function stopFeatureAutoRotation() {
    if (featureCarouselState.intervalId) {
        clearInterval(featureCarouselState.intervalId);
        featureCarouselState.intervalId = null;
    }
}

function setupCarouselEventListeners() {
    const container = document.getElementById("serviceCarouselContainer");

    if (container) {
        container.addEventListener("mouseenter", () => {
            featureCarouselState.isPaused = true;
        });

        container.addEventListener("mouseleave", () => {
            featureCarouselState.isPaused = false;
        });
    }

    // Page visibility listener
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopFeatureAutoRotation();
        } else if (!featureCarouselState.isPaused) {
            startFeatureAutoRotation();
        }
    });

    // Window resize handler
    let resizeTimer = null;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderCarouselCards(featureCarouselState.currentIndex);
        }, 120);
    });
}

function initFeatureShowcase() {
    const track = document.getElementById("serviceTrack");
    if (!track) return;

    // Render cards and start auto-rotation
    renderCarouselCards(featureCarouselState.currentIndex);
    setupCarouselEventListeners();
    startFeatureAutoRotation();
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
            const pendingRolesJson = sessionStorage.getItem("pendingRequiredRoles");
            const pendingTitle = sessionStorage.getItem("pendingFeatureTitle");

            sessionStorage.removeItem("pendingRedirect");
            sessionStorage.removeItem("pendingRequiredRoles");
            sessionStorage.removeItem("pendingFeatureTitle");

            if (pendingUrl) {
                let isAllowed = true;
                if (pendingRolesJson) {
                    try {
                        const requiredRoles = JSON.parse(pendingRolesJson);
                        if (Array.isArray(requiredRoles) && requiredRoles.length > 0) {
                            isAllowed = requiredRoles.includes(primaryRole);
                        }
                    } catch (e) {
                        isAllowed = true;
                    }
                }

                if (pendingUrl.includes("buy material") && (primaryRole === "MATERIAL_SELLER" || primaryRole === "SELLER")) {
                    isAllowed = false;
                }

                if (isAllowed) {
                    setTimeout(() => { window.location.href = pendingUrl; }, 600);
                } else {
                    showAuthToast(
                        "Role Mismatch",
                        `Your logged-in role (${primaryRole}) is not authorized for "${pendingTitle || 'that feature'}". Redirecting to your dashboard.`,
                        "warning",
                        5000
                    );
                    setTimeout(() => { navigateToDashboard(); }, 1200);
                }
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
    initFeatureShowcase();
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
