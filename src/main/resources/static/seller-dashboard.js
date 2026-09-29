/* ==========================================================================
   BuildBid — Material Seller Dashboard Interactions (seller-dashboard.js)
   DYNAMIC AUTHENTICATION, PROFILE & REAL PROJECT REQUIREMENTS INTEGRATION
   ========================================================================== */

// Tailwind CSS Theme Extension Configuration
if (typeof tailwind !== 'undefined') {
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    buildblue: {
                        50: '#eff6ff',
                        100: '#dbeafe',
                        500: '#3b82f6',
                        600: '#2563eb',
                        700: '#1d4ed8',
                        800: '#1e40af',
                        900: '#1e3a8a',
                    },
                    buildslate: {
                        850: '#151f32',
                        900: '#0f172a'
                    }
                },
                fontFamily: {
                    sans: ['Inter', 'sans-serif'],
                }
            }
        }
    };
}

/* ==========================================================================
   CORE UTILITIES & AUTHENTICATION STORAGE
   ========================================================================== */

function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.location) {
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            return "http://localhost:8080";
        }
    }
    return "https://buildbid-ap3j.onrender.com";
}

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

function getAuthenticatedSellerRole(currentUser, marketplaceUser) {
    let role = "";
    if (currentUser && currentUser.role) {
        role = String(currentUser.role).replace("ROLE_", "").toUpperCase();
    } else if (currentUser && Array.isArray(currentUser.roles) && currentUser.roles.length > 0) {
        const primary = currentUser.roles[0];
        role = String(typeof primary === "string" ? primary : primary.name || primary.authority || "")
            .replace("ROLE_", "")
            .toUpperCase();
    } else if (marketplaceUser && Array.isArray(marketplaceUser.roles) && marketplaceUser.roles.length > 0) {
        const primary = marketplaceUser.roles[0];
        role = String(typeof primary === "string" ? primary : primary.name || primary.authority || "")
            .replace("ROLE_", "")
            .toUpperCase();
    } else if (marketplaceUser && marketplaceUser.role) {
        role = String(marketplaceUser.role).replace("ROLE_", "").toUpperCase();
    }
    return role;
}

function isSellerRole(role) {
    return role === "MATERIAL_SELLER" || role === "SELLER";
}

function logoutSeller() {
    localStorage.removeItem("marketplaceToken");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("marketplaceUser");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("customerUser");
    localStorage.removeItem("buildbid_user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("pendingRedirect");
    sessionStorage.removeItem("userData");
    window.location.href = "index.html";
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJs(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return "Recently posted";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "Recently posted";
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 60) return diffMins <= 5 ? "Just now" : `Posted ${diffMins} mins ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `Posted ${diffHrs} hrs ago`;
        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays === 1) return "Posted 1 day ago";
        return `Posted ${diffDays} days ago`;
    } catch (e) {
        return "Recently posted";
    }
}

/* ==========================================================================
   DYNAMIC DATA BINDING: SELLER IDENTITY & PROFILE
   ========================================================================== */

function bindSellerProfile(profile) {
    if (!profile) return;

    const displayName = profile.name || profile.fullName || profile.username || "";
    const ownerName = profile.fullName || profile.name || "";
    const location = profile.location || "";
    const email = profile.email || "";
    const phone = profile.phone || "";

    // Calculate avatar initials
    let initials = "";
    if (displayName) {
        const parts = displayName.trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            initials = (parts[0][0] + parts[1][0]).toUpperCase();
        } else if (parts.length === 1 && parts[0].length >= 2) {
            initials = parts[0].substring(0, 2).toUpperCase();
        } else if (parts.length === 1) {
            initials = parts[0][0].toUpperCase();
        }
    }

    // Top Header
    const navAvatar = document.getElementById("seller-nav-avatar");
    if (navAvatar && initials) navAvatar.innerText = initials;

    const navName = document.getElementById("seller-nav-name");
    if (navName && displayName) navName.innerText = displayName;

    const navLocation = document.getElementById("seller-nav-location");
    if (navLocation && location) {
        navLocation.innerText = location + " • Material Seller";
    }

    // Dashboard Banner Greeting
    const bannerGreeting = document.getElementById("seller-banner-greeting");
    if (bannerGreeting && displayName) {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        bannerGreeting.innerText = `${timeGreeting}, ${displayName}`;
    }

    const bannerRegion = document.getElementById("seller-banner-region");
    if (bannerRegion && location) {
        bannerRegion.innerText = `Verified Supplier Portal • ${location} Region`;
    }

    // Profile & Business Tab
    const profileAvatar = document.getElementById("seller-profile-avatar");
    if (profileAvatar && initials) profileAvatar.innerText = initials;

    const profileName = document.getElementById("seller-profile-name");
    if (profileName && displayName) profileName.innerText = displayName;

    const ownerElem = document.getElementById("seller-owner-name");
    if (ownerElem && ownerName) ownerElem.innerText = ownerName;

    const addressElem = document.getElementById("seller-office-address");
    if (addressElem && location) addressElem.innerText = location;

    const phoneElem = document.getElementById("seller-phone");
    if (phoneElem && phone) phoneElem.innerText = phone;

    const emailElem = document.getElementById("seller-email");
    if (emailElem && email) emailElem.innerText = email;
}

/* ==========================================================================
   DYNAMIC DATA BINDING: CUSTOMER PROJECT REQUIREMENTS
   ========================================================================== */

function renderIncomingRequirements(projects) {
    if (!Array.isArray(projects) || projects.length === 0) return;

    const listContainer = document.getElementById("incoming-requirements-list");
    const tbody = document.getElementById("material-requests-tbody");
    const countLabel = document.getElementById("requirements-count-label");
    const bannerReqCount = document.getElementById("seller-banner-req-count");
    const navReqBadge = document.getElementById("nav-requests-badge");

    const totalCount = projects.length;
    if (countLabel) countLabel.innerText = totalCount;
    if (bannerReqCount) bannerReqCount.innerText = `${totalCount} active customer material requirements`;
    if (navReqBadge) navReqBadge.innerText = totalCount;

    // Render Dashboard Home incoming requirements (limit to 5 in summary)
    if (listContainer) {
        listContainer.innerHTML = "";
        const displayProjects = projects.slice(0, 5);
        displayProjects.forEach(p => {
            listContainer.appendChild(createRequirementCard(p));
        });
    }

    // Render Material Requests Tab Table (full list)
    if (tbody) {
        tbody.innerHTML = "";
        projects.forEach(p => {
            tbody.appendChild(createRequirementRow(p));
        });
    }
}

function createRequirementCard(p) {
    const div = document.createElement("div");
    div.className = "bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4";

    const pId = p.projectId || ("PRJ-" + (p.id || "1000"));
    const title = p.projectTitle || p.title || "Customer Material Requirement";
    const type = p.projectType || p.type || "General Construction";
    
    const locParts = [p.city, p.state].filter(Boolean);
    const locStr = locParts.length > 0 ? locParts.join(", ") : (p.location || "Regional Site");

    const targetDate = p.targetStartDate || p.timeline || "Required Soon";
    const status = p.status || "OPEN";
    const statusClass = (status === "OPEN" || status === "New")
        ? "bg-emerald-100 text-emerald-700"
        : "bg-blue-100 text-blue-700";

    const timeAgo = formatTimeAgo(p.createdAt);

    div.innerHTML = `
        <div class="space-y-1.5">
            <div class="flex items-center space-x-2">
                <span class="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-md font-bold">${escapeHtml(pId)}</span>
                <span class="${statusClass} text-[10px] px-2 py-0.5 rounded-full font-semibold">${escapeHtml(status)}</span>
                <span class="text-xs text-slate-500">• ${escapeHtml(timeAgo)}</span>
            </div>
            <h3 class="font-bold text-slate-800 text-base">${escapeHtml(title)}</h3>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span><i class="fa-solid fa-layer-group mr-1 text-blue-500"></i><strong>${escapeHtml(type)}</strong></span>
                <span><i class="fa-solid fa-location-dot mr-1 text-red-500"></i>${escapeHtml(locStr)}</span>
                <span><i class="fa-solid fa-calendar mr-1 text-amber-500"></i>Required by: ${escapeHtml(targetDate)}</span>
            </div>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
            <button onclick="viewRequirementDetail('${escapeJs(pId)}')" class="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all">View</button>
            <button onclick="openQuotationModal('${escapeJs(pId)}', '${escapeJs(title)}', 1, 'Lot')" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all">Send Quote</button>
        </div>
    `;
    return div;
}

function createRequirementRow(p) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition-all";

    const pId = p.projectId || ("PRJ-" + (p.id || "1000"));
    const title = p.projectTitle || p.title || "Customer Project";
    const type = p.projectType || p.type || "General Construction";
    const scope = p.scopeOfWork || p.description || type;
    
    const locParts = [p.city, p.state].filter(Boolean);
    const locStr = locParts.length > 0 ? locParts.join(", ") : (p.location || "NCR");

    const targetDate = p.targetStartDate || p.timeline || "Required Soon";
    const status = p.status || "OPEN";
    const statusClass = (status === "OPEN" || status === "New")
        ? "bg-emerald-100 text-emerald-700"
        : "bg-blue-100 text-blue-700";

    const truncatedScope = scope.length > 48 ? scope.substring(0, 48) + "..." : scope;

    tr.innerHTML = `
        <td class="p-4 font-medium">
            <span class="text-blue-600 font-bold block">${escapeHtml(pId)}</span>
            <span class="text-[11px] text-slate-400">${escapeHtml(title)}</span>
        </td>
        <td class="p-4">
            <span class="font-bold text-slate-800">${escapeHtml(type)}</span>
            <span class="block text-slate-500 text-[11px]">${escapeHtml(truncatedScope)}</span>
        </td>
        <td class="p-4 font-bold text-slate-800">1 Site Lot</td>
        <td class="p-4"><i class="fa-solid fa-location-dot text-red-500 mr-1"></i>${escapeHtml(locStr)}</td>
        <td class="p-4 text-amber-600 font-semibold">${escapeHtml(targetDate)}</td>
        <td class="p-4"><span class="${statusClass} px-2.5 py-1 rounded-full text-[10px] font-bold">${escapeHtml(status)}</span></td>
        <td class="p-4 text-right space-x-2">
            <button onclick="viewRequirementDetail('${escapeJs(pId)}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">View</button>
            <button onclick="openQuotationModal('${escapeJs(pId)}', '${escapeJs(title)}', 1, 'Lot')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">Send Quote</button>
        </td>
    `;
    return tr;
}

/* ==========================================================================
   DASHBOARD INITIALIZATION & AUTH GUARD (PHASE 2 & 3 & 4 & 5)
   ========================================================================== */

async function initSellerDashboard() {
    const token = getCleanToken();

    // 1. Initial token existence guard
    if (!token) {
        console.warn("Seller Dashboard: No authentication token found. Redirecting to login...");
        if (document.body) document.body.style.display = "none";
        window.location.replace("index.html");
        return;
    }

    // 2. Initial client-side role guard
    let currentUser = {};
    let marketplaceUser = {};
    try {
        currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        marketplaceUser = JSON.parse(localStorage.getItem("marketplaceUser") || "{}");
    } catch (e) {}

    const localRole = getAuthenticatedSellerRole(currentUser, marketplaceUser);
    if (localRole && !isSellerRole(localRole)) {
        console.warn(`Seller Dashboard: Role '${localRole}' is not authorized. Redirecting to index.html...`);
        if (document.body) document.body.style.display = "none";
        window.location.replace("index.html");
        return;
    }

    // Pre-populate with cached user details while API loads
    if (currentUser.name || currentUser.username) {
        bindSellerProfile(currentUser);
    } else if (marketplaceUser.name || marketplaceUser.username) {
        bindSellerProfile(marketplaceUser);
    }

    // 3. Authoritative verification with GET /api/me
    const API_BASE_URL = getApiBaseUrl();
    try {
        const meResponse = await fetch(API_BASE_URL + "/api/me", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (meResponse.status === 401 || meResponse.status === 403) {
            console.warn("Seller Dashboard: /api/me unauthorized or expired. Redirecting...");
            logoutSeller();
            return;
        }

        if (meResponse.ok) {
            const profile = await meResponse.json();

            // Verify backend roles from profile
            if (profile.roles) {
                let rolesList = Array.isArray(profile.roles) ? profile.roles : Object.keys(profile.roles);
                const hasValidSellerRole = rolesList.some(r => {
                    const rStr = String(typeof r === "string" ? r : r.name || r.authority || "")
                        .replace("ROLE_", "")
                        .toUpperCase();
                    return isSellerRole(rStr);
                });

                if (!hasValidSellerRole) {
                    console.warn("Seller Dashboard: User does not hold MATERIAL_SELLER or SELLER role.");
                    logoutSeller();
                    return;
                }
            }

            // Bind real seller profile data
            bindSellerProfile(profile);
        }
    } catch (err) {
        console.error("Seller Dashboard: Network error contacting /api/me:", err);
    }

    // 4. Fetch dynamic customer project requirements using GET /api/projects
    try {
        const projResponse = await fetch(API_BASE_URL + "/api/projects", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (projResponse.ok) {
            const projects = await projResponse.json();
            if (Array.isArray(projects) && projects.length > 0) {
                renderIncomingRequirements(projects);
            }
        }
    } catch (err) {
        console.warn("Seller Dashboard: Could not load dynamic projects from /api/projects, preserving fallback:", err);
    }

    // 5. Fetch dynamic seller inventory
    await loadSellerInventory();

    // 6. Check URL hash for tab navigation (e.g. #inventory)
    if (window.location.hash) {
        const hashTab = window.location.hash.replace("#", "").trim();
        if (hashTab) switchTab(hashTab);
    }
}

// Execute dashboard initialization as soon as DOM is ready or immediately
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSellerDashboard);
} else {
    initSellerDashboard();
}

/* ==========================================================================
   DYNAMIC DATA BINDING: SELLER MATERIAL INVENTORY
   ========================================================================== */

async function loadSellerInventory() {
    const token = getCleanToken();
    if (!token) return;

    const API_BASE_URL = getApiBaseUrl();
    try {
        const response = await fetch(API_BASE_URL + "/api/seller/materials", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            const materials = await response.json();
            if (Array.isArray(materials) && materials.length > 0) {
                renderSellerMaterials(materials);
            }
        }
    } catch (err) {
        console.warn("Seller Dashboard: Could not load dynamic materials from /api/seller/materials:", err);
    }
}

function renderSellerMaterials(materials) {
    const tbody = document.getElementById("inventory-table-body");
    if (!tbody || !Array.isArray(materials) || materials.length === 0) return;

    tbody.innerHTML = "";

    materials.forEach(mat => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 transition-all";

        const materialName = mat.materialName || "Construction Material";
        const category = mat.category || "General";
        const brand = mat.brand ? ` • ${mat.brand}` : "";
        const specs = mat.specifications ? ` (${mat.specifications})` : "";
        const currentStock = mat.currentStock != null ? Number(mat.currentStock).toLocaleString("en-IN") : "0";
        const reservedStock = mat.reservedStock != null ? Number(mat.reservedStock).toLocaleString("en-IN") : "0";
        const availableStock = mat.availableStock != null ? Number(mat.availableStock).toLocaleString("en-IN") : currentStock;
        
        let unitDisplay = mat.unit || "";
        if (unitDisplay.includes("—")) {
            unitDisplay = unitDisplay.split("—")[0].trim();
        }
        
        const price = mat.unitPrice != null ? "₹" + Number(mat.unitPrice).toLocaleString("en-IN") : "₹0";
        
        const status = mat.stockStatus || "IN_STOCK";
        let statusBadge = '<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold">In Stock — स्टॉक उपलब्ध</span>';
        if (status === "LOW_STOCK") {
            statusBadge = '<span class="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse">Low Stock — कम स्टॉक</span>';
        } else if (status === "OUT_OF_STOCK") {
            statusBadge = '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Out of Stock — स्टॉक खत्म</span>';
        }

        tr.innerHTML = `
            <td class="p-4">
                <span class="font-bold text-slate-800 block">${escapeHtml(materialName)}${escapeHtml(specs)}</span>
                <span class="text-[11px] text-slate-400">Category: ${escapeHtml(category)}${escapeHtml(brand)}</span>
            </td>
            <td class="p-4 font-bold text-slate-900">${escapeHtml(currentStock)} ${escapeHtml(unitDisplay)}</td>
            <td class="p-4 text-amber-600 font-semibold">${escapeHtml(reservedStock)} ${escapeHtml(unitDisplay)}</td>
            <td class="p-4 font-bold text-emerald-600">${escapeHtml(availableStock)} ${escapeHtml(unitDisplay)}</td>
            <td class="p-4 font-bold">${escapeHtml(price)} / ${escapeHtml(unitDisplay)}</td>
            <td class="p-4">${statusBadge}</td>
            <td class="p-4 text-right space-x-2">
                <button onclick="window.location.href='add-material.html'" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">Add More</button>
                <button onclick="showToast('Material stock is active')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">Restock</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


/* ==========================================================================
   ORIGINAL STATIC DASHBOARD INTERACTION METHODS (PRESERVED 100%)
   ========================================================================== */

/**
 * Switch active dashboard tabs and sync sidebar navigation states
 * @param {string} tabId - Identifier of the tab to activate
 */
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    // Remove active style from all nav links
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
        el.classList.add('text-slate-300', 'hover:bg-slate-800', 'hover:text-white');
    });
    
    // Show selected tab
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }

    // Activate nav link
    const targetNav = document.getElementById('nav-' + tabId);
    if (targetNav) {
        targetNav.classList.remove('text-slate-300', 'hover:bg-slate-800', 'hover:text-white');
        targetNav.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
    }
}

/**
 * Toggle visibility of top header notifications dropdown
 */
function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

/**
 * Open specified modal by modal element ID
 * @param {string} modalId 
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

/**
 * Close specified modal by modal element ID
 * @param {string} modalId 
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

/**
 * Populate and launch quotation modal with requirement context
 * @param {string} reqId 
 * @param {string} material 
 * @param {number} qty 
 * @param {string} unit 
 */
function openQuotationModal(reqId, material, qty, unit) {
    const reqIdElem = document.getElementById('quoteModalReqId');
    const matElem = document.getElementById('qMaterialName');
    const qtyElem = document.getElementById('qQty');
    const unitElem = document.getElementById('qUnit');

    if (reqIdElem) reqIdElem.innerText = 'Responding to ' + reqId + ' — ' + material;
    if (matElem) matElem.value = material;
    if (qtyElem) qtyElem.value = qty;
    if (unitElem) unitElem.value = unit;

    calculateQuote();
    openModal('quotationModal');
}

/**
 * Recalculate quotation line totals, GST, transport, and final total
 */
function calculateQuote() {
    const qtyInput = document.getElementById('qQty');
    const unitPriceInput = document.getElementById('qUnitPrice');
    const transportInput = document.getElementById('qTransport');
    const gstInput = document.getElementById('qGst');
    const totalElem = document.getElementById('qFinalTotal');

    const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
    const unitPrice = parseFloat(unitPriceInput ? unitPriceInput.value : 0) || 0;
    const transport = parseFloat(transportInput ? transportInput.value : 0) || 0;
    
    const subtotal = qty * unitPrice;
    const gst = subtotal * 0.18;
    const total = subtotal + gst + transport;
    
    if (gstInput) {
        gstInput.value = '₹' + gst.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }
    if (totalElem) {
        totalElem.innerText = '₹' + total.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }
}

/**
 * Show notification toast and navigate to material requests view
 * @param {string} reqId 
 */
function viewRequirementDetail(reqId) {
    showToast('Loading details for requirement ' + reqId);
    switchTab('requests');
}

/**
 * Show notification toast and navigate to orders view
 * @param {string} orderId 
 */
function openOrderDetail(orderId) {
    showToast('Opening fulfillment details for ' + orderId);
    switchTab('orders');
}

/**
 * Display toast message overlay temporarily
 * @param {string} message 
 */
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    if (toast && toastMsg) {
        toastMsg.innerText = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('button')) {
        const dropdown = document.getElementById('notifications-dropdown');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    }
};
