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
   DYNAMIC DATA BINDING: CUSTOMER PROJECT REQUIREMENTS & BUY MATERIAL REQUESTS
   ========================================================================== */

window.cachedMaterialRequests = window.cachedMaterialRequests || {};

function renderIncomingRequirements(projects = [], materialRequests = []) {
    // Cache material requests by business requestId or database id
    if (Array.isArray(materialRequests)) {
        materialRequests.forEach(mr => {
            const key = mr.requestId || ("MR-" + mr.id);
            window.cachedMaterialRequests[key] = mr;
        });
    }

    const listContainer = document.getElementById("incoming-requirements-list");
    const tbody = document.getElementById("material-requests-tbody");
    const countLabel = document.getElementById("requirements-count-label");
    const bannerReqCount = document.getElementById("seller-banner-req-count");
    const navReqBadge = document.getElementById("nav-requests-badge");

    const totalCount = (Array.isArray(projects) ? projects.length : 0) + (Array.isArray(materialRequests) ? materialRequests.length : 0);
    if (countLabel) countLabel.innerText = totalCount;
    if (bannerReqCount) bannerReqCount.innerText = `${totalCount} active customer material requirements`;
    if (navReqBadge) navReqBadge.innerText = totalCount;

    // Render Dashboard Home incoming requirements (limit to 5 in summary)
    if (listContainer) {
        listContainer.innerHTML = "";
        let displayedCount = 0;
        if (Array.isArray(materialRequests)) {
            materialRequests.slice(0, 5).forEach(mr => {
                listContainer.appendChild(createMaterialRequestCard(mr));
                displayedCount++;
            });
        }
        if (Array.isArray(projects) && displayedCount < 5) {
            projects.slice(0, 5 - displayedCount).forEach(p => {
                listContainer.appendChild(createRequirementCard(p));
            });
        }
    }

    // Render Material Requests Tab Table (full list)
    if (tbody) {
        tbody.innerHTML = "";
        // Render Buy Material requests first (direct buyer orders)
        if (Array.isArray(materialRequests)) {
            materialRequests.forEach(mr => {
                tbody.appendChild(createMaterialRequestRow(mr));
            });
        }
        // Then render project material requirements
        if (Array.isArray(projects)) {
            projects.forEach(p => {
                tbody.appendChild(createRequirementRow(p));
            });
        }
    }
}

function createMaterialRequestCard(mr) {
    const div = document.createElement("div");
    div.className = "bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4";

    const rId = mr.requestId || ("MR-" + mr.id);
    const buyerRole = (mr.buyerRole || "BUYER").toUpperCase();
    const items = mr.items || [];
    const firstItem = items[0] || {};
    const title = mr.materialSummary || firstItem.materialName || "Material Requirement";
    const locStr = [mr.city, mr.state].filter(Boolean).join(", ") || mr.state || "Regional Site";
    const timeAgo = formatTimeAgo(mr.createdAt);
    const status = mr.status || "NEW";
    const statusClass = (status === "NEW" || status === "Open")
        ? "bg-emerald-100 text-emerald-700"
        : "bg-blue-100 text-blue-700";

    const scope = (mr.requestScope || "STATE").toUpperCase();
    let scopeBadge = "";
    if (scope === "ALL_INDIA") {
        scopeBadge = `<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">All India</span>`;
    } else if (scope === "LOCAL") {
        scopeBadge = `<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">Local (${mr.localRadius || 25} km)</span>`;
    } else {
        scopeBadge = `<span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">State: ${escapeHtml(mr.state || '')}</span>`;
    }

    div.innerHTML = `
        <div class="space-y-1.5">
            <div class="flex items-center space-x-2">
                <span class="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-md font-bold">${escapeHtml(rId)}</span>
                <span class="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold">${escapeHtml(buyerRole)}</span>
                <span class="${statusClass} text-[10px] px-2 py-0.5 rounded-full font-semibold">${escapeHtml(status)}</span>
                ${scopeBadge}
                <span class="text-xs text-slate-500">• ${escapeHtml(timeAgo)}</span>
            </div>
            <h3 class="font-bold text-slate-800 text-base">${escapeHtml(title)}</h3>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span><i class="fa-solid fa-boxes-stacked mr-1 text-blue-500"></i><strong>${items.length} ${items.length === 1 ? 'Material' : 'Materials'}</strong></span>
                <span><i class="fa-solid fa-location-dot mr-1 text-red-500"></i>${escapeHtml(locStr)} (PIN: ${escapeHtml(mr.pinCode || '')})</span>
            </div>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
            <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all">View</button>
            <button onclick="openQuotationModal('${escapeJs(rId)}', '${escapeJs(firstItem.materialName || title)}', ${firstItem.quantity || 1}, '${escapeJs(firstItem.unit || 'Units')}')" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all">Send Quote</button>
        </div>
    `;
    return div;
}

function createMaterialRequestRow(mr) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition-all";

    const rId = mr.requestId || ("MR-" + mr.id);
    const buyerRole = (mr.buyerRole || "BUYER").toUpperCase();
    const items = mr.items || [];
    const firstItem = items[0] || {};
    
    // Materials summary
    let matSummary = mr.materialSummary || firstItem.materialName || "Material";
    let specText = "";
    if (items.length === 1) {
        const parts = [];
        if (firstItem.brand) parts.push("Brand: " + firstItem.brand);
        if (firstItem.specification) parts.push(firstItem.specification);
        specText = parts.join(" • ") || firstItem.category || "";
    } else {
        specText = `${items.length} materials requested in single order`;
    }

    let qtyStr = "";
    if (items.length === 1) {
        qtyStr = `${firstItem.quantity} ${firstItem.unit || ''}`;
    } else {
        qtyStr = `${items.length} Items`;
    }

    const locStr = [mr.city, mr.state].filter(Boolean).join(", ") || mr.state || "Regional Site";
    const status = mr.status || "NEW";
    const statusClass = (status === "NEW" || status === "Open")
        ? "bg-emerald-100 text-emerald-700"
        : "bg-blue-100 text-blue-700";

    let scopeBadge = "";
    const scope = (mr.requestScope || "STATE").toUpperCase();
    if (scope === "ALL_INDIA") {
        scopeBadge = `<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">All India</span>`;
    } else if (scope === "LOCAL") {
        scopeBadge = `<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">Local (${mr.localRadius || 25} km)</span>`;
    } else {
        scopeBadge = `<span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">State: ${escapeHtml(mr.state || '')}</span>`;
    }

    tr.innerHTML = `
        <td class="p-4 font-medium">
            <span class="text-blue-600 font-bold block">${escapeHtml(rId)}</span>
            <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">${escapeHtml(buyerRole)}</span>
        </td>
        <td class="p-4">
            <span class="font-bold text-slate-800">${escapeHtml(matSummary)}</span>
            <span class="block text-slate-500 text-[11px]">${escapeHtml(specText)}</span>
        </td>
        <td class="p-4 font-bold text-slate-800">${escapeHtml(qtyStr)}</td>
        <td class="p-4">
            <i class="fa-solid fa-location-dot text-red-500 mr-1"></i>${escapeHtml(locStr)}
            <span class="block text-slate-400 text-[10px]">PIN: ${escapeHtml(mr.pinCode || '')}</span>
        </td>
        <td class="p-4">${scopeBadge}</td>
        <td class="p-4"><span class="${statusClass} px-2.5 py-1 rounded-full text-[10px] font-bold">${escapeHtml(status)}</span></td>
        <td class="p-4 text-right space-x-2">
            <button onclick="openMaterialRequestModal('${escapeJs(rId)}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all">View</button>
            <button onclick="openQuotationModal('${escapeJs(rId)}', '${escapeJs(firstItem.materialName || matSummary)}', ${firstItem.quantity || 1}, '${escapeJs(firstItem.unit || 'Units')}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">Send Quote</button>
        </td>
    `;
    return tr;
}

function openMaterialRequestModal(requestId) {
    const mr = window.cachedMaterialRequests[requestId];
    if (!mr) {
        showToast('Request details not found for ' + requestId);
        return;
    }

    const titleEl = document.getElementById('detailModalTitle');
    const statusEl = document.getElementById('detailModalStatus');
    const subEl = document.getElementById('detailModalSubtitle');
    const roleEl = document.getElementById('detailModalBuyerRole');
    const scopeEl = document.getElementById('detailModalScope');
    const stateEl = document.getElementById('detailModalState');
    const pinEl = document.getElementById('detailModalPin');
    const addrEl = document.getElementById('detailModalAddress');

    if (titleEl) titleEl.innerText = 'Material Request #' + (mr.requestId || mr.id);
    if (statusEl) statusEl.innerText = mr.status || 'NEW';
    if (subEl) subEl.innerText = (mr.buyerRole || 'BUYER') + ' Direct Material Request';
    if (roleEl) roleEl.innerText = mr.buyerRole || 'CUSTOMER';

    let scopeLabel = mr.requestScope || 'STATE';
    if (scopeLabel === 'LOCAL' && mr.localRadius) {
        scopeLabel += ` (${mr.localRadius} km)`;
    }
    if (scopeEl) scopeEl.innerText = scopeLabel;
    if (stateEl) stateEl.innerText = mr.state || '-';
    if (pinEl) pinEl.innerText = mr.pinCode || '-';
    if (addrEl) {
        const fullAddr = [mr.deliveryAddress, mr.city, mr.state, mr.pinCode ? 'PIN: ' + mr.pinCode : ''].filter(Boolean).join(', ');
        addrEl.innerText = fullAddr || 'Delivery Address Not Specified';
    }

    const itemsContainer = document.getElementById('detailModalItemsList');
    if (itemsContainer) {
        itemsContainer.innerHTML = '';
        const items = mr.items || [];
        const countEl = document.getElementById('detailModalItemCount');
        if (countEl) countEl.innerText = `${items.length} ${items.length === 1 ? 'Material' : 'Materials'}`;

        items.forEach((it, idx) => {
            const itemCard = document.createElement('div');
            itemCard.className = 'p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1';
            
            const matName = it.materialName || it.customMaterial || 'Material';
            const brandStr = it.brand || it.customBrand ? `Brand: ${it.brand || it.customBrand}` : '';
            const specStr = it.specification || it.customSpecification ? `Spec: ${it.specification || it.customSpecification}` : '';
            const notesStr = it.notes ? `Note: ${it.notes}` : '';
            const detailsArr = [brandStr, specStr, notesStr].filter(Boolean);

            itemCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-800 text-sm">${idx + 1}. ${escapeHtml(matName)}</span>
                    <span class="font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                        ${escapeHtml(String(it.quantity))} ${escapeHtml(it.unit || '')}
                    </span>
                </div>
                <div class="text-[11px] text-slate-500">
                    <span class="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded mr-2 text-[10px] font-semibold">${escapeHtml(it.category || 'General')}</span>
                    ${detailsArr.length > 0 ? detailsArr.map(escapeHtml).join(' • ') : ''}
                </div>
            `;
            itemsContainer.appendChild(itemCard);
        });
    }

    const notesContainer = document.getElementById('detailModalNotesContainer');
    const notesElem = document.getElementById('detailModalNotes');
    if (notesContainer && notesElem) {
        if (mr.specialNotes && mr.specialNotes.trim()) {
            notesElem.innerText = mr.specialNotes;
            notesContainer.classList.remove('hidden');
        } else {
            notesContainer.classList.add('hidden');
        }
    }

    const quoteBtn = document.getElementById('detailModalQuoteBtn');
    if (quoteBtn) {
        quoteBtn.onclick = function() {
            closeModal('materialRequestDetailModal');
            const items = mr.items || [];
            const firstItem = items[0] || {};
            openQuotationModal(
                mr.requestId || ('MR-' + mr.id),
                firstItem.materialName || mr.materialSummary || 'Requested Material',
                firstItem.quantity || 1,
                firstItem.unit || 'Units'
            );
        };
    }

    openModal('materialRequestDetailModal');
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

    // 4. Fetch dynamic customer project requirements and Buy Material requests
    await refreshSellerRequests();

    // 5. Fetch dynamic seller inventory
    await loadSellerInventory();

    // 6. Check URL hash or query params (e.g. #invoices, ?from=invoice)
    const urlParams = new URLSearchParams(window.location.search);
    const shouldOpenInvoice = urlParams.get("openInvoice") === "true" || window.location.hash === "#invoices";
    const lastAdded = sessionStorage.getItem("lastAddedMaterial");

    if (shouldOpenInvoice) {
        switchTab("invoices");
        openModal("createInvoiceModal");
        await loadInvoiceMaterials(lastAdded);
        if (lastAdded) {
            sessionStorage.removeItem("lastAddedMaterial");
            showToast("Newly added material ready for invoice: " + lastAdded);
        }
    } else {
        if (window.location.hash) {
            const hashTab = window.location.hash.replace("#", "").trim();
            if (hashTab) switchTab(hashTab);
        }
        // Pre-fetch invoice materials
        loadInvoiceMaterials();
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
    if (!token) {
        updateInventoryLowStockBadge();
        renderLowStockAlerts();
        return;
    }

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
            if (Array.isArray(materials)) {
                renderSellerMaterials(materials);
                updateInventoryLowStockBadge(materials);
                renderLowStockAlerts(materials);
            }
        }
    } catch (err) {
        console.warn("Seller Dashboard: Could not load dynamic materials from /api/seller/materials:", err);
    }
}

function updateInventoryLowStockBadge(materials) {
    const badge = document.getElementById("nav-inventory-badge") ||
                  document.querySelector('#nav-inventory span.bg-red-500\\/20');
    if (!badge) return;

    if (Array.isArray(materials)) {
        // Count ONLY materials where stockStatus is strictly "LOW_STOCK"
        // "OUT_OF_STOCK" and "IN_STOCK" are logically separate and must NOT be counted
        const lowCount = materials.filter(m => m && m.stockStatus === "LOW_STOCK").length;
        badge.textContent = `${lowCount} Low`;
    } else {
        const lowRows = document.querySelectorAll('#inventory-table-body tr');
        let lowCount = 0;
        lowRows.forEach(row => {
            const statusCell = row.children[5];
            if (statusCell && statusCell.textContent.includes("Low Stock")) {
                lowCount++;
            }
        });
        badge.textContent = `${lowCount} Low`;
    }
}

function renderLowStockAlerts(materials) {
    const container = document.getElementById("low-stock-alerts-container");
    const badge = document.getElementById("low-stock-alerts-badge");
    if (!container) return;

    let lowStockMaterials = [];

    if (Array.isArray(materials)) {
        // Filter ONLY materials where stockStatus is strictly "LOW_STOCK"
        // "OUT_OF_STOCK" and "IN_STOCK" are logically separate and must NOT be shown
        lowStockMaterials = materials.filter(m => m && m.stockStatus === "LOW_STOCK");
    } else {
        // Fallback for static/offline DOM inspection
        const rows = document.querySelectorAll('#inventory-table-body tr');
        rows.forEach(row => {
            const statusCell = row.children[5];
            if (statusCell && statusCell.textContent.includes("Low Stock")) {
                const nameSpan = row.querySelector('td:first-child span.font-bold');
                const stockCell = row.children[3] || row.children[1];
                const editBtn = row.querySelector('button[onclick*="openEditMaterialModal"]');
                let id = "3";
                if (editBtn) {
                    const m = editBtn.getAttribute("onclick").match(/openEditMaterialModal\(['"]?([^'")]+)/);
                    if (m) id = m[1];
                }
                lowStockMaterials.push({
                    id: id,
                    materialName: nameSpan ? nameSpan.textContent.trim() : "Low Stock Material",
                    availableStock: stockCell ? stockCell.textContent.trim() : "Low",
                    unit: ""
                });
            }
        });
    }

    if (badge) {
        badge.textContent = `${lowStockMaterials.length} item${lowStockMaterials.length === 1 ? '' : 's'}`;
    }

    container.innerHTML = "";

    if (lowStockMaterials.length === 0) {
        container.innerHTML = `
            <div class="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center text-slate-400">
                <p class="font-medium text-slate-500">No Low Stock Items</p>
                <p class="text-[11px] text-slate-400 mt-0.5">कोई लो स्टॉक आइटम नहीं</p>
            </div>
        `;
        return;
    }

    lowStockMaterials.forEach(mat => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "p-3 bg-white border border-red-100 rounded-lg flex items-center justify-between";

        const materialName = mat.materialName || "Material";
        let stockText = "";
        if (typeof mat.availableStock === "string") {
            stockText = mat.availableStock;
        } else {
            const currentNum = mat.currentStock != null ? Number(mat.currentStock) : 0;
            const reservedNum = mat.reservedStock != null ? Number(mat.reservedStock) : 0;
            const availNum = mat.availableStock != null ? Number(mat.availableStock) : (currentNum - reservedNum);
            let unitDisplay = mat.unit || "";
            if (unitDisplay.includes("—")) {
                unitDisplay = unitDisplay.split("—")[0].trim();
            }
            stockText = `${availNum.toLocaleString("en-IN")} ${unitDisplay}`.trim();
        }

        itemDiv.innerHTML = `
            <div>
                <p class="font-bold text-slate-800">${escapeHtml(materialName)}</p>
                <p class="text-red-600 text-[11px]">Stock: ${escapeHtml(stockText)}</p>
            </div>
            <button onclick="openEditMaterialModal('${escapeJs(String(mat.id))}')" class="px-2.5 py-1.5 bg-red-600 text-white rounded-md text-[11px] font-semibold hover:bg-red-700 transition-all">Restock</button>
        `;
        container.appendChild(itemDiv);
    });
}

function renderSellerMaterials(materials) {
    const tbody = document.getElementById("inventory-table-body");
    if (!tbody || !Array.isArray(materials)) return;

    tbody.innerHTML = "";

    if (materials.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">No materials in catalog yet — कोई सामग्री नहीं मिली</td></tr>`;
        return;
    }

    materials.forEach(mat => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 transition-all";

        const materialName = mat.materialName || "Construction Material";
        const category = mat.category || "General";
        const brand = mat.brand ? ` • ${mat.brand}` : "";
        const specs = mat.specifications ? ` (${mat.specifications})` : "";
        const currentNum = mat.currentStock != null ? Number(mat.currentStock) : 0;
        const reservedNum = mat.reservedStock != null ? Number(mat.reservedStock) : 0;
        const availNum = mat.availableStock != null ? Number(mat.availableStock) : (currentNum - reservedNum);

        const currentStock = currentNum.toLocaleString("en-IN");
        const reservedStock = reservedNum.toLocaleString("en-IN");
        const availableStock = availNum.toLocaleString("en-IN");
        
        let unitDisplay = mat.unit || "";
        if (unitDisplay.includes("—")) {
            unitDisplay = unitDisplay.split("—")[0].trim();
        }
        
        const price = mat.unitPrice != null ? "₹" + Number(mat.unitPrice).toLocaleString("en-IN") : "₹0";
        
        const status = mat.stockStatus || "IN_STOCK";
        let statusBadge = '<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold">In Stock — स्टॉक उपलब्ध</span>';
        if (status === "LOW_STOCK") {
            statusBadge = '<span class="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse">Low Stock — लो स्टॉक</span>';
        } else if (status === "OUT_OF_STOCK") {
            statusBadge = '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Out of Stock — आउट ऑफ स्टॉक</span>';
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
            <td class="p-4 text-right space-x-1.5">
                <button onclick="openEditMaterialModal('${escapeJs(String(mat.id))}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm">Update</button>
                <button onclick="openDeleteMaterialModal('${escapeJs(String(mat.id))}', '${escapeJs(String(materialName))}')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-lg font-semibold transition-all shadow-sm" title="Delete Material — सामग्री हटाएं"><i class="fa-solid fa-trash text-xs"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}




/* ==========================================================================
   EDIT MATERIAL MODAL & INVENTORY UPDATE SYSTEM
   ========================================================================== */

async function openEditMaterialModal(materialId) {
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    try {
        let mat = null;
        if (token) {
            try {
                // Fetch authoritative record from backend
                const response = await fetch(API_BASE_URL + "/api/seller/materials/" + encodeURIComponent(materialId), {
                    method: "GET",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    mat = await response.json();
                } else if (response.status === 403) {
                    showToast("Forbidden: You are not authorized to edit this material.", "error");
                    return;
                }
            } catch (fetchErr) {
                console.warn("Seller Dashboard: Network error fetching material details, using local fallback:", fetchErr);
            }
        }

        // Fallback for static demo rows if backend has no record with that ID yet
        if (!mat) {
            const defaultRows = {
                "1": { id: 1, materialName: "TMT Steel Rebars Fe 500", category: "TMT Steel", currentStock: 145, reservedStock: 10, availableStock: 135, unit: "Tons", unitPrice: 54000, brand: "Tata Tiscon", specifications: "Fe 500D Grade, ISI Certified", description: "" },
                "2": { id: 2, materialName: "OPC Cement 53 Grade", category: "Cement", currentStock: 1250, reservedStock: 500, availableStock: 750, unit: "Bags", unitPrice: 370, brand: "UltraTech", specifications: "Grade 53 High Strength", description: "" },
                "3": { id: 3, materialName: "River Sand (Coarse Plastering)", category: "Sand & Aggregate", currentStock: 18, reservedStock: 0, availableStock: 18, unit: "Tons", unitPrice: 1850, brand: "", specifications: "Screened coarse sand", description: "" }
            };
            mat = defaultRows[String(materialId)];
            if (!mat) {
                showToast("Could not load material details", "error");
                return;
            }
        }

        // Populate Form Fields
        const idElem = document.getElementById("editMaterialId");
        const nameElem = document.getElementById("editMaterialName");
        const catElem = document.getElementById("editCategory");
        const curStockElem = document.getElementById("editCurrentStock");
        const resStockElem = document.getElementById("editReservedStock");
        const unitElem = document.getElementById("editUnit");
        const priceElem = document.getElementById("editUnitPrice");
        const brandElem = document.getElementById("editBrand");
        const specsElem = document.getElementById("editSpecifications");
        const descElem = document.getElementById("editDescription");

        if (idElem) idElem.value = mat.id || materialId;
        if (nameElem) nameElem.value = mat.materialName || "";
        if (catElem) catElem.value = mat.category || "";
        if (curStockElem) curStockElem.value = mat.currentStock != null ? mat.currentStock : 0;
        if (resStockElem) resStockElem.value = mat.reservedStock != null ? mat.reservedStock : 0;
        if (unitElem) unitElem.value = mat.unit || "";
        if (priceElem) priceElem.value = mat.unitPrice != null ? mat.unitPrice : 0;
        if (brandElem) brandElem.value = mat.brand || "";
        if (specsElem) specsElem.value = mat.specifications || "";
        if (descElem) descElem.value = mat.description || "";

        calculateEditAvailableStock();
        openModal("editMaterialModal");
    } catch (err) {
        console.error("Seller Dashboard: Error loading material for edit:", err);
        showToast("Network error loading material details", "error");
    }
}

function calculateEditAvailableStock() {
    const curElem = document.getElementById("editCurrentStock");
    const resElem = document.getElementById("editReservedStock");
    const availElem = document.getElementById("editAvailableStock");
    const unitElem = document.getElementById("editUnit");
    const warnElem = document.getElementById("editStockWarning");
    const saveBtn = document.getElementById("saveEditBtn");

    const current = parseFloat(curElem ? curElem.value : 0) || 0;
    const reserved = parseFloat(resElem ? resElem.value : 0) || 0;
    const available = current - reserved;
    const cleanUnit = (unitElem && unitElem.value) ? unitElem.value.split("—")[0].trim() : "";

    if (reserved > current) {
        if (warnElem) warnElem.classList.remove("hidden");
        if (availElem) {
            availElem.value = available.toLocaleString("en-IN") + " " + cleanUnit + " (Invalid)";
            availElem.classList.remove("text-emerald-600");
            availElem.classList.add("text-red-600");
        }
        if (saveBtn) saveBtn.disabled = true;
    } else {
        if (warnElem) warnElem.classList.add("hidden");
        if (availElem) {
            availElem.value = Math.max(0, available).toLocaleString("en-IN") + (cleanUnit ? " " + cleanUnit : "");
            availElem.classList.remove("text-red-600");
            availElem.classList.add("text-emerald-600");
        }
        if (saveBtn) saveBtn.disabled = false;
    }
}

async function saveMaterialEdit(event) {
    if (event) event.preventDefault();

    const idElem = document.getElementById("editMaterialId");
    const curStockElem = document.getElementById("editCurrentStock");
    const resStockElem = document.getElementById("editReservedStock");
    const priceElem = document.getElementById("editUnitPrice");
    const brandElem = document.getElementById("editBrand");
    const specsElem = document.getElementById("editSpecifications");
    const descElem = document.getElementById("editDescription");
    const saveBtn = document.getElementById("saveEditBtn");

    const id = idElem ? idElem.value : "";
    const currentStock = parseFloat(curStockElem ? curStockElem.value : 0);
    const reservedStock = parseFloat(resStockElem ? resStockElem.value : 0);
    const unitPrice = parseFloat(priceElem ? priceElem.value : 0);

    if (isNaN(currentStock) || currentStock < 0) {
        showToast("Please enter a valid Current Stock (>= 0)", "error");
        return;
    }
    if (isNaN(reservedStock) || reservedStock < 0) {
        showToast("Please enter a valid Reserved Stock (>= 0)", "error");
        return;
    }
    if (reservedStock > currentStock) {
        showToast("Reserved Stock cannot be greater than Current Stock. आरक्षित स्टॉक वर्तमान स्टॉक से अधिक नहीं हो सकता।", "error");
        return;
    }
    if (isNaN(unitPrice) || unitPrice <= 0) {
        showToast("Please enter a valid selling price (> 0)", "error");
        return;
    }

    const payload = {
        currentStock: currentStock,
        reservedStock: reservedStock,
        unitPrice: unitPrice,
        brand: brandElem ? brandElem.value.trim() : "",
        specifications: specsElem ? specsElem.value.trim() : "",
        description: descElem ? descElem.value.trim() : ""
    };

    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Saving...</span>';
    }

    try {
        const response = await fetch(API_BASE_URL + "/api/seller/materials/" + encodeURIComponent(id), {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            closeModal("editMaterialModal");
            showToast("Material updated successfully — सामग्री सफलतापूर्वक अपडेट की गई");
            // Refresh Inventory Catalog table immediately
            await loadSellerInventory();
            // Refresh Invoice Entry materials dropdown
            loadInvoiceMaterials();
        } else {
            showToast(data.error || data.message || "Failed to update material", "error");
        }
    } catch (err) {
        console.error("Seller Dashboard: Error saving material edit:", err);
        showToast("Network error updating material. Please try again.", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i><span>Save Changes — सुरक्षित करें</span>';
        }
    }
}

async function markCurrentMaterialOutOfStock() {
    const idElem = document.getElementById("editMaterialId");
    const id = idElem ? idElem.value : "";
    if (!id) {
        showToast("Material ID not found", "error");
        return;
    }

    const btn = document.getElementById("markOutOfStockBtn");
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Updating...</span>';
    }

    try {
        let updated = false;
        if (token) {
            const response = await fetch(API_BASE_URL + "/api/seller/materials/" + encodeURIComponent(id) + "/out-of-stock", {
                method: "PATCH",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                updated = true;
            } else if (response.status === 403) {
                showToast("Forbidden: You cannot modify another seller's material.", "error");
                return;
            } else {
                const data = await response.json().catch(() => ({}));
                showToast(data.error || data.message || "Failed to mark item as out of stock", "error");
                return;
            }
        } else {
            // Local fallback for offline/preview mode
            updated = true;
            const row = document.querySelector(`button[onclick*="openEditMaterialModal('${id}')"]`)?.closest("tr");
            if (row && row.children[5]) {
                row.children[5].innerHTML = '<span class="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Out of Stock — आउट ऑफ स्टॉक</span>';
            }
            updateInventoryLowStockBadge();
            renderLowStockAlerts();
        }

        if (updated) {
            closeModal("editMaterialModal");
            showToast("Item Out of Stock — आइटम आउट ऑफ स्टॉक");
            // Refresh inventory catalog dynamically without manual browser refresh
            await loadSellerInventory();
            if (typeof loadInvoiceMaterials === "function") {
                loadInvoiceMaterials();
            }
        }
    } catch (err) {
        console.error("Seller Dashboard: Error marking material out of stock:", err);
        showToast("Network error updating stock status. Please try again.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-ban mr-2"></i><span>Item Out of Stock — आइटम आउट ऑफ स्टॉक</span>';
        }
    }
}

/* ==========================================================================
   DELETE MATERIAL SYSTEM
   ========================================================================== */

function openDeleteMaterialModal(materialId, materialName) {
    const idElem = document.getElementById("deleteTargetMaterialId");
    const nameElem = document.getElementById("deleteTargetMaterialName");
    if (idElem) idElem.value = materialId || "";
    if (nameElem) nameElem.textContent = materialName || "Selected Material";
    openModal("deleteMaterialModal");
}

async function confirmDeleteMaterial() {
    const idElem = document.getElementById("deleteTargetMaterialId");
    const materialId = idElem ? idElem.value : "";
    if (!materialId) {
        closeModal("deleteMaterialModal");
        return;
    }

    const deleteBtn = document.getElementById("confirmDeleteMaterialBtn");
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i><span>Deleting...</span>';
    }

    try {
        if (token) {
            const response = await fetch(API_BASE_URL + "/api/seller/materials/" + encodeURIComponent(materialId), {
                method: "DELETE",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                closeModal("deleteMaterialModal");
                showToast("Material deleted successfully. सामग्री सफलतापूर्वक हटाई गई।");
                await loadSellerInventory();
                if (typeof loadInvoiceMaterials === "function") {
                    loadInvoiceMaterials();
                }
            } else if (response.status === 403) {
                closeModal("deleteMaterialModal");
                showToast("Forbidden: You are not authorized to delete another seller's material.", "error");
            } else if (response.status === 404) {
                closeModal("deleteMaterialModal");
                showToast("Material not found with ID: " + materialId, "error");
                await loadSellerInventory();
            } else {
                const data = await response.json().catch(() => ({}));
                closeModal("deleteMaterialModal");
                showToast(data.error || data.message || "Failed to delete material", "error");
            }
        } else {
            // Local preview fallback if session token missing
            closeModal("deleteMaterialModal");
            showToast("Material deleted successfully. सामग्री सफलतापूर्वक हटाई गई।");
            const row = document.querySelector(`button[onclick*="openDeleteMaterialModal('${materialId}'"]`)?.closest("tr");
            if (row) {
                row.remove();
                updateInventoryLowStockBadge();
                renderLowStockAlerts();
            }
        }
    } catch (err) {
        console.error("Seller Dashboard: Error deleting material:", err);
        closeModal("deleteMaterialModal");
        showToast("Network error deleting material. Please try again.", "error");
    } finally {
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash mr-1.5"></i><span>Delete — हटाएं</span>';
        }
    }
}

/* ==========================================================================
   DYNAMIC DATA BINDING: INVOICE ENTRY MATERIAL SELECTION
   ========================================================================== */

async function loadInvoiceMaterials(preselectName) {
    const select = document.getElementById("invoiceMaterialSelect");
    if (!select) return;

    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();

    try {
        let materials = [];
        if (token) {
            const res = await fetch(API_BASE_URL + "/api/seller/materials", {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            });
            if (res.ok) {
                materials = await res.json();
            }
        }

        select.innerHTML = '<option value="">-- Select Material from Inventory Catalog --</option>';

        if (Array.isArray(materials) && materials.length > 0) {
            materials.forEach(mat => {
                const opt = document.createElement("option");
                opt.value = mat.materialName || "";
                opt.textContent = `${mat.materialName || "Material"} (${mat.category || "General"}) — ₹${Number(mat.unitPrice || 0).toLocaleString("en-IN")} / ${mat.unit || "unit"}`;
                opt.dataset.unit = mat.unit || "";
                opt.dataset.price = mat.unitPrice != null ? mat.unitPrice : "0";
                opt.dataset.brand = mat.brand || "";
                opt.dataset.category = mat.category || "";
                opt.dataset.stock = mat.availableStock != null ? mat.availableStock : mat.currentStock;
                select.appendChild(opt);
            });
        } else {
            const defaultOptions = [
                { name: "TMT Steel Rebars Fe 500", category: "Steel", price: 54000, unit: "Tons" },
                { name: "OPC Cement 53 Grade", category: "Cement", price: 370, unit: "Bags" },
                { name: "River Sand (Coarse Plastering)", category: "Sand", price: 1850, unit: "Tons" }
            ];
            defaultOptions.forEach(mat => {
                const opt = document.createElement("option");
                opt.value = mat.name;
                opt.textContent = `${mat.name} (${mat.category}) — ₹${mat.price.toLocaleString("en-IN")} / ${mat.unit}`;
                opt.dataset.unit = mat.unit;
                opt.dataset.price = mat.price;
                select.appendChild(opt);
            });
        }

        if (preselectName) {
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === preselectName || select.options[i].text.includes(preselectName)) {
                    select.selectedIndex = i;
                    onInvoiceMaterialChange(select);
                    break;
                }
            }
        }
    } catch (err) {
        console.warn("Seller Dashboard: Could not load dynamic materials for invoice:", err);
    }
}

function onInvoiceMaterialChange(select) {
    if (!select) return;
    const selectedOption = select.options[select.selectedIndex];
    const unitInput = document.getElementById("invoiceUnit");
    const unitPriceInput = document.getElementById("invoiceUnitPrice");

    if (!selectedOption || !selectedOption.value) {
        if (unitInput) unitInput.value = "";
        if (unitPriceInput) unitPriceInput.value = "";
        calculateInvoiceTotal();
        return;
    }

    const unit = selectedOption.dataset.unit || "";
    const cleanUnit = unit.includes("—") ? unit.split("—")[0].trim() : unit;
    const price = selectedOption.dataset.price || "0";

    if (unitInput) unitInput.value = cleanUnit;
    if (unitPriceInput) unitPriceInput.value = price;

    calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
    const qtyInput = document.getElementById("invoiceQty");
    const priceInput = document.getElementById("invoiceUnitPrice");
    const totalElem = document.getElementById("invoiceCalculatedTotal");

    const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
    const price = parseFloat(priceInput ? priceInput.value : 0) || 0;
    const subtotal = qty * price;
    const gst = subtotal * 0.18;
    const grandTotal = subtotal + gst;

    if (totalElem) {
        totalElem.innerText = "₹" + Math.round(grandTotal).toLocaleString("en-IN");
    }
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

    if (tabId === 'requests' && typeof refreshSellerRequests === 'function') {
        refreshSellerRequests();
    }
}

/**
 * Fetch and refresh both Buy Material requests and Customer Project requirements
 */
async function refreshSellerRequests() {
    const token = getCleanToken();
    const API_BASE_URL = getApiBaseUrl();
    if (!token) return;

    let fetchedProjects = [];
    let fetchedMaterialRequests = [];

    try {
        const mrResponse = await fetch(API_BASE_URL + "/api/material-requests/seller", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });
        if (mrResponse.ok) {
            fetchedMaterialRequests = await mrResponse.json();
        }
    } catch (err) {
        console.warn("Seller Dashboard: Could not reload /api/material-requests/seller:", err);
    }

    try {
        const projResponse = await fetch(API_BASE_URL + "/api/projects", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });
        if (projResponse.ok) {
            fetchedProjects = await projResponse.json();
        }
    } catch (err) {
        console.warn("Seller Dashboard: Could not reload /api/projects:", err);
    }

    if (fetchedProjects.length > 0 || fetchedMaterialRequests.length > 0) {
        renderIncomingRequirements(fetchedProjects, fetchedMaterialRequests);
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
        if (modalId === 'createInvoiceModal' && typeof loadInvoiceMaterials === 'function') {
            loadInvoiceMaterials();
        }
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
