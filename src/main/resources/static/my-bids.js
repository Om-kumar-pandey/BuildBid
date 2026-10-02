function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.location) {
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            return "http://localhost:8080";
        }
    }
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

// Local project type images mapping
const PROJECT_LOCAL_IMAGES = {
    new_construction: "NEW CONSTRUCTION.png",
    renovation: "RENOVATION.png",
    home_extension: "HOME EXTENSION.png",
    finishing: "INTERIOR DESIGN.png",
    commercial: "COMMERCIAL CONSTRUCTION.png",
    industrial_warehouse: "INDUSTRIRAL AND WAREHOUSE.png",
    home_maintenance: "HOME MAINTENANCE.png",
    landscaping_gardening: "LANDSCAPING AND GARDENING.png",
    others: "OTHERS.png",
    default: "hero-building.jpg"
};

function getLocalProjectImage(projectType) {
    const norm = String(projectType || "").trim().toLowerCase();
    if (!norm) return PROJECT_LOCAL_IMAGES.default;

    if (norm.includes("new") || (norm.includes("construct") && !norm.includes("commercial") && !norm.includes("indust"))) {
        return PROJECT_LOCAL_IMAGES.new_construction;
    }
    if (norm.includes("renov") || norm.includes("remodel")) {
        return PROJECT_LOCAL_IMAGES.renovation;
    }
    if (norm.includes("extens")) {
        return PROJECT_LOCAL_IMAGES.home_extension;
    }
    if (norm.includes("finish") || norm.includes("interior") || norm.includes("design")) {
        return PROJECT_LOCAL_IMAGES.finishing;
    }
    if (norm.includes("commercial") || norm.includes("showroom") || norm.includes("office") || norm.includes("retail")) {
        return PROJECT_LOCAL_IMAGES.commercial;
    }
    if (norm.includes("indust") || norm.includes("warehouse") || norm.includes("factory")) {
        return PROJECT_LOCAL_IMAGES.industrial_warehouse;
    }
    if (norm.includes("maint") || norm.includes("repair")) {
        return PROJECT_LOCAL_IMAGES.home_maintenance;
    }
    if (norm.includes("landscap") || norm.includes("garden")) {
        return PROJECT_LOCAL_IMAGES.landscaping_gardening;
    }
    if (norm.includes("other") || norm.includes("custom")) {
        return PROJECT_LOCAL_IMAGES.others;
    }
    return PROJECT_LOCAL_IMAGES.default;
}

function formatArea(area) {
    if (area === null || area === undefined || area === '') return '';
    if (typeof area === 'number') {
        const numStr = Number.isInteger(area) ? area.toString() : area.toFixed(1);
        return `${numStr} sq ft`;
    }
    const str = String(area).trim();
    if (!str) return '';
    return str.toLowerCase().includes('sq') ? str : `${str} sq ft`;
}

function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return 'Not provided — उपलब्ध नहीं';
    return '₹ ' + Number(val).toLocaleString('en-IN');
}

function safeText(val, fallback = 'Not provided — उपलब्ध नहीं') {
    if (val === null || val === undefined || String(val).trim() === '') return fallback;
    return String(val).trim();
}

function formatDate(dateStr) {
    if (!dateStr) return 'Not available — उपलब्ध नहीं';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return String(dateStr);
    }
}

function formatDateTime(dateStr) {
    if (!dateStr) return 'Not available — उपलब्ध नहीं';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return String(dateStr);
    }
}

/**
 * Status mapping for Phase-3 My Bid lifecycle
 * PENDING -> Under Review — समीक्षा में
 * ACCEPTED -> Accepted — स्वीकृत
 * NOT_SELECTED -> Not Selected — चयनित नहीं
 * ASSIGNMENT_DECLINED -> Contractor Declined — ठेकेदार ने काम करने से मना किया
 * WITHDRAWN -> Withdrawn — वापस ली गई
 */
function mapBidStatus(rawStatus) {
    const s = String(rawStatus || '').toUpperCase().trim();
    switch (s) {
        case 'PENDING':
            return { label: 'Under Review — समीक्षा में', badgeClass: 'status-pending' };
        case 'ACCEPTED':
            return { label: 'Accepted — स्वीकृत', badgeClass: 'status-accepted' };
        case 'NOT_SELECTED':
            return { label: 'Not Selected — चयनित नहीं', badgeClass: 'status-not-selected' };
        case 'ASSIGNMENT_DECLINED':
            return { label: 'Contractor Declined — ठेकेदार ने काम करने से मना किया', badgeClass: 'status-declined' };
        case 'WITHDRAWN':
            return { label: 'Withdrawn — वापस ली गई', badgeClass: 'status-withdrawn' };
        default:
            return { label: 'Under Review — समीक्षा में', badgeClass: 'status-pending' };
    }
}

// Global cached states
let cachedProjects = null;
let isFetchingBids = false;
let currentOpenProjectId = null;
let currentProjectBids = [];
let currentProjectAssignment = null;
let pendingAcceptBidId = null;
let isSubmittingAccept = false;
let pendingRevokeAssignmentId = null;
let isSubmittingRevoke = false;
let pendingReassignBidId = null;
let isSubmittingReassign = false;

document.addEventListener('DOMContentLoaded', () => {
    let currentPage = 1;
    const itemsPerPage = 5;

    // 1. Load logged-in customer's First Name & Initials dynamically
    initUserSession();
    fetchDynamicNotifications();

    // 2. Fetch backend stats & bid records from Phase-3 APIs
    loadDashboardStats();
    loadProjectBids(currentPage, itemsPerPage);

    // 3. Search query filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterProjectsRealtime(e.target.value.trim().toLowerCase());
        });
    }

    // 4. Modal Event Listeners
    const closeBtn = document.getElementById('bidsModalCloseBtn');
    const secondaryCloseBtn = document.getElementById('bidsModalSecondaryCloseBtn');
    const overlay = document.getElementById('bidsModalOverlay');

    if (closeBtn) closeBtn.addEventListener('click', closeProjectBidsModal);
    if (secondaryCloseBtn) secondaryCloseBtn.addEventListener('click', closeProjectBidsModal);

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeProjectBidsModal();
            }
        });
    }

    // 5. Phase 4.3: Accept Bid Confirmation Modal Listeners
    const cancelAcceptBtn = document.getElementById('btnCancelAccept');
    const confirmAcceptBtn = document.getElementById('btnConfirmAccept');
    const acceptOverlay = document.getElementById('acceptConfirmModalOverlay');

    if (cancelAcceptBtn) {
        cancelAcceptBtn.addEventListener('click', closeAcceptConfirmation);
    }
    if (confirmAcceptBtn) {
        confirmAcceptBtn.addEventListener('click', submitAcceptBid);
    }
    if (acceptOverlay) {
        acceptOverlay.addEventListener('click', (e) => {
            if (e.target === acceptOverlay && !isSubmittingAccept) {
                closeAcceptConfirmation();
            }
        });
    }

    // 6. Phase 4.4: Revoke Confirmation Modal Listeners
    const cancelRevokeBtn = document.getElementById('btnCancelRevoke');
    const confirmRevokeBtn = document.getElementById('btnConfirmRevoke');
    const revokeOverlay = document.getElementById('revokeConfirmModalOverlay');

    if (cancelRevokeBtn) {
        cancelRevokeBtn.addEventListener('click', closeRevokeConfirmation);
    }
    if (confirmRevokeBtn) {
        confirmRevokeBtn.addEventListener('click', submitRevokeAcceptance);
    }
    if (revokeOverlay) {
        revokeOverlay.addEventListener('click', (e) => {
            if (e.target === revokeOverlay && !isSubmittingRevoke) {
                closeRevokeConfirmation();
            }
        });
    }

    // 7. Phase 4.5: Reassign Contractor Confirmation Modal Listeners
    const cancelReassignBtn = document.getElementById('btnCancelReassign');
    const confirmReassignBtn = document.getElementById('btnConfirmReassign');
    const reassignOverlay = document.getElementById('reassignConfirmModalOverlay');

    if (cancelReassignBtn) {
        cancelReassignBtn.addEventListener('click', closeReassignConfirmation);
    }
    if (confirmReassignBtn) {
        confirmReassignBtn.addEventListener('click', submitReassignBid);
    }
    if (reassignOverlay) {
        reassignOverlay.addEventListener('click', (e) => {
            if (e.target === reassignOverlay && !isSubmittingReassign) {
                closeReassignConfirmation();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (reassignOverlay && reassignOverlay.style.display !== 'none' && !isSubmittingReassign) {
                closeReassignConfirmation();
                return;
            }
            if (revokeOverlay && revokeOverlay.style.display !== 'none' && !isSubmittingRevoke) {
                closeRevokeConfirmation();
                return;
            }
            if (acceptOverlay && acceptOverlay.style.display !== 'none' && !isSubmittingAccept) {
                closeAcceptConfirmation();
                return;
            }
            if (overlay && overlay.style.display !== 'none') {
                closeProjectBidsModal();
            }
        }
    });
});

/**
 * Extracts and displays only FIRST NAME (e.g., 'Heman') and initials ('HK')
 */
async function initUserSession() {
    const userNameEl = document.getElementById('navUserName') || document.getElementById('userName');
    const userInitialsEl = document.getElementById('navUserAvatar') || document.getElementById('userInitials');

    try {
        let user = JSON.parse(
            localStorage.getItem('currentUser') || 
            localStorage.getItem('user') || 
            localStorage.getItem('userData') || 
            sessionStorage.getItem('userData') || '{}'
        );

        const token = getCleanToken();
        if (token) {
            const res = await fetch(API_BASE_URL + '/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) user = await res.json();
        }

        const fullName = user.name || user.fullName || user.username || 'Customer';
        
        // Extract First Name only (e.g. "Heman Kumar" -> "Heman")
        const nameParts = fullName.trim().split(' ').filter(Boolean);
        const firstName = nameParts[0] || 'Customer';

        // Extract 2-letter Initials from full name
        const initials = nameParts.length > 1 
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : firstName.slice(0, 2).toUpperCase();

        if (userNameEl) userNameEl.textContent = firstName;
        if (userInitialsEl) userInitialsEl.textContent = initials;

    } catch (err) {
        console.error('Session load error:', err);
        if (userNameEl) userNameEl.textContent = 'Customer';
        if (userInitialsEl) userInitialsEl.textContent = 'C';
    }
}

/**
 * Dynamic Notifications Counter
 */
async function fetchDynamicNotifications() {
    const badge = document.getElementById('notificationCount');
    if (!badge) return;

    try {
        const token = getCleanToken();
        const res = await fetch(API_BASE_URL + '/api/notifications/unread-count', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (res.ok) {
            const data = await res.json();
            const count = data.unreadCount ?? data.count ?? 0;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch {
        badge.style.display = 'none';
    }
}

/**
 * Dynamic Summary Counters from Phase-3 Backend: GET /api/customer/my-bids/summary
 */
async function loadDashboardStats() {
    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/customer/my-bids/summary`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();

        // Map Phase-3 response fields
        document.getElementById('statTotalProjects').textContent = data.totalProjects ?? 0;
        document.getElementById('statTotalBids').textContent = data.totalBids ?? 0;
        document.getElementById('statPendingReview').textContent = data.pendingReview ?? 0;
        document.getElementById('statAccepted').textContent = data.bidsAccepted ?? 0;
        document.getElementById('statCompleted').textContent = data.completedProjects ?? 0;

    } catch {
        // Fallback zeroes on failure
        ['statTotalProjects', 'statTotalBids', 'statPendingReview', 'statAccepted', 'statCompleted'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
    }
}

/**
 * Dynamic Customer Project Bids Loader from Phase-3 Backend: GET /api/customer/my-bids/projects
 */
async function loadProjectBids(page = 1, limit = 5, forceRefresh = false) {
    const container = document.getElementById('bidsListContainer');

    if (!cachedProjects || forceRefresh) {
        if (container) {
            container.innerHTML = `
                <div class="loader-state">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <p>Loading your bids... — आपकी बोलियाँ लोड हो रही हैं...</p>
                </div>
            `;
        }

        try {
            const token = getCleanToken();
            const response = await fetch(`${API_BASE_URL}/api/customer/my-bids/projects`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.status === 401) {
                renderEmptyState('Session Expired — सत्र समाप्त हो गया<br><small>Your session has expired or is invalid. Please log in again. — आपका सत्र समाप्त हो गया है या मान्य नहीं है। कृपया फिर से लॉगिन करें।</small>');
                return;
            }
            if (response.status === 403) {
                renderEmptyState('Access Denied — अनुमति नहीं है<br><small>You do not have permission to view this information. — आपको यह जानकारी देखने की अनुमति नहीं है।</small>');
                return;
            }
            if (!response.ok) {
                renderEmptyState('Server Error — सर्वर में समस्या<br><small>Server error occurred. Please try again later. — सर्वर में समस्या हुई। कृपया बाद में फिर प्रयास करें।</small>');
                return;
            }

            const data = await response.json();
            cachedProjects = Array.isArray(data) ? data : [];

            const totalProjectsElement = document.getElementById('statTotalProjects');
            if (totalProjectsElement) {
                totalProjectsElement.textContent = cachedProjects.length;
            }

        } catch (err) {
            console.error('Project bids load error:', err);
            renderEmptyState('Connection Failed — कनेक्शन नहीं हो पाया<br><small>Unable to reach the server. Please check your network connection. — सर्वर से कनेक्ट नहीं हो पाया। कृपया अपना इंटरनेट कनेक्शन जांचें।</small>');
            return;
        }
    }

    if (cachedProjects && cachedProjects.length > 0) {
        const totalItems = cachedProjects.length;
        const totalPages = Math.ceil(totalItems / limit) || 1;
        const validPage = Math.max(1, Math.min(page, totalPages));
        const startIndex = (validPage - 1) * limit;
        const endIndex = Math.min(startIndex + limit, totalItems);
        const pageItems = cachedProjects.slice(startIndex, endIndex);

        renderBidsList(pageItems);
        renderPagination({
            currentPage: validPage,
            totalPages: totalPages,
            totalItems: totalItems,
            startIndex: startIndex + 1,
            endIndex: endIndex
        });
    } else {
        renderEmptyState('No Projects Found — कोई प्रोजेक्ट नहीं मिला<br><small>You have not posted any projects yet. — आपने अभी तक कोई प्रोजेक्ट पोस्ट नहीं किया है।</small>');
    }
}

function renderBidsList(projects) {
    const container = document.getElementById('bidsListContainer');
    if (!container) return;

    container.innerHTML = projects.map(item => {
        // Frontend field mapping layer
        const project = {
            id: item.id,
            projectId: item.projectId,
            title: item.projectTitle || item.title || 'Untitled Project',
            category: item.projectType || item.category || 'General',
            location: item.location || 'Location N/A',
            area: formatArea(item.totalArea || item.area),
            displayStatus: item.projectStatus || item.status || 'PENDING',
            bidsCount: item.totalBids ?? item.bidsCount ?? 0,
            hasActiveAssignment: Boolean(item.hasActiveAssignment),
            imageUrl: getLocalProjectImage(item.projectType || item.category),
            contractorNote: item.statusNote || (item.hasActiveAssignment ? 'Active Contractor Selected — सक्रिय ठेकेदार चुना गया' : ''),
            postedDate: item.postedDate || 'Recent',
            description: item.description || ''
        };

        const statusMap = mapBidStatus(project.displayStatus);
        const displayStatusText = project.hasActiveAssignment ? 'Accepted — स्वीकृत' : statusMap.label;
        const badgeClass = project.hasActiveAssignment ? 'status-accepted' : statusMap.badgeClass;

        return `
            <div class="bid-item-row" data-title="${project.title.toLowerCase()}">
                <div class="project-identity">
                    <img src="${project.imageUrl}" 
                         alt="${project.title}" 
                         class="project-thumbnail"
                         onerror="this.src='hero-building.jpg'">
                    <div class="project-details">
                        <h4>${project.title}</h4>
                        <div class="location-line"><i class="fa-solid fa-location-dot"></i> ${project.location}</div>
                        <div class="spec-line">${project.projectId ? project.projectId + ' • ' : ''}${project.area ? project.area + ' • ' : ''}${project.category}</div>
                        ${project.description ? `<p class="project-description-text">${project.description}</p>` : ''}
                        <div class="posted-date">Submitted Date — जमा करने की तारीख: ${project.postedDate}</div>
                    </div>
                </div>

                <div class="bids-count-cell">
                    <div class="count-num">${project.bidsCount}</div>
                    <a href="javascript:void(0)" class="view-bids-link" onclick="openProjectBidsModal('${project.id}')">View All Bids — सभी बोलियाँ देखें</a>
                </div>

                <div class="price-cell">
                    <div class="price-amount">—</div>
                    <span class="price-label">Lowest Bid — न्यूनतम बोली</span>
                </div>

                <div class="price-cell">
                    <div class="price-amount">—</div>
                    <span class="price-label">Highest Bid — अधिकतम बोली</span>
                </div>

                <div class="status-badge-cell">
                    <span class="status-pill ${badgeClass}">${displayStatusText}</span>
                    <span class="status-subtext">${project.contractorNote}</span>
                </div>

                <div class="action-cell">
                    <a href="javascript:void(0)" class="btn-view-project" onclick="openProjectBidsModal('${project.id}')">View Details — विवरण देखें</a>
                    <button class="btn-more-dots" onclick="console.log('Action menu:', '${project.id}')">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderPagination(p) {
    const info = document.getElementById('paginationInfo');
    const controls = document.getElementById('paginationControls');
    if (!info || !controls) return;

    info.textContent = `Showing ${p.startIndex} to ${p.endIndex} of ${p.totalItems} projects — ${p.totalItems} में से ${p.startIndex}-${p.endIndex} प्रोजेक्ट`;

    let html = `<button class="page-btn" ${p.currentPage <= 1 ? 'disabled' : ''} onclick="loadProjectBids(${p.currentPage - 1})">Previous — पिछला</button>`;
    for (let i = 1; i <= p.totalPages; i++) {
        html += `<button class="page-btn ${i === p.currentPage ? 'active' : ''}" onclick="loadProjectBids(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" ${p.currentPage >= p.totalPages ? 'disabled' : ''} onclick="loadProjectBids(${p.currentPage + 1})">Next — अगला &gt;</button>`;
    controls.innerHTML = html;
}

function renderEmptyState(msg) {
    const container = document.getElementById('bidsListContainer');
    if (container) {
        container.innerHTML = `
            <div class="loader-state">
                <i class="fa-regular fa-folder-open" style="color: #94a3b8;"></i>
                <p>${msg}</p>
            </div>`;
    }
    const info = document.getElementById('paginationInfo');
    if (info) info.textContent = 'Showing 0 of 0 projects — 0 प्रोजेक्ट';
    const controls = document.getElementById('paginationControls');
    if (controls) controls.innerHTML = '';
}

function filterProjectsRealtime(query) {
    const rows = document.querySelectorAll('.bid-item-row');
    rows.forEach(row => {
        const match = (row.getAttribute('data-title') || '').includes(query);
        row.style.display = match ? 'grid' : 'none';
    });
}

// =========================================================================
// PHASE 4.2: IN-PAGE BIDS COMPARISON & DETAILS MODAL
// =========================================================================

/**
 * Opens project bids comparison modal and fetches bids via GET /api/customer/my-bids/projects/{projectId}/bids
 */
async function openProjectBidsModal(projectId) {
    if (!projectId) return;

    // Duplicate click protection while already fetching this project
    if (isFetchingBids && currentOpenProjectId === projectId) return;

    currentOpenProjectId = projectId;
    const project = cachedProjects ? cachedProjects.find(p => String(p.id) === String(projectId)) : null;

    // Populate modal header information
    const titleEl = document.getElementById('bidsModalTitle');
    const locEl = document.getElementById('bidsModalLocation');
    const areaEl = document.getElementById('bidsModalArea');
    const catEl = document.getElementById('bidsModalCategory');
    const modalBody = document.getElementById('bidsModalBody');
    const overlay = document.getElementById('bidsModalOverlay');
    const footerInfo = document.getElementById('bidsModalFooterInfo');

    if (titleEl) titleEl.textContent = project ? (project.projectTitle || project.title || 'Project Bids — प्रोजेक्ट की बोलियाँ') : 'Project Bids — प्रोजेक्ट की बोलियाँ';
    if (locEl) locEl.textContent = project ? (project.location || 'Location N/A') : '-';
    if (areaEl) areaEl.textContent = project ? formatArea(project.totalArea || project.area) : '-';
    if (catEl) catEl.textContent = project ? (project.projectType || project.category || 'General') : '-';
    if (footerInfo) footerInfo.textContent = project && project.projectId ? `Project ID: ${project.projectId}` : '';

    // Show modal overlay and loading state
    if (overlay) {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background page scroll
    }

    if (modalBody) {
        modalBody.innerHTML = `
            <div class="modal-loader-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Loading your bids... — आपकी बोलियाँ लोड हो रही हैं...</p>
            </div>
        `;
    }

    isFetchingBids = true;

    try {
        const token = getCleanToken();
        const [bidsRes, assignmentRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/customer/my-bids/projects/${encodeURIComponent(projectId)}/bids`, {
                method: 'GET',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            }),
            fetch(`${API_BASE_URL}/api/customer/my-bids/projects/${encodeURIComponent(projectId)}/assignment`, {
                method: 'GET',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
        ]);

        if (assignmentRes.ok) {
            try {
                const assignmentData = await assignmentRes.json();
                if (assignmentData && assignmentData.id && assignmentData.isCurrent && assignmentData.assignmentStatus === 'ACTIVE') {
                    currentProjectAssignment = assignmentData;
                } else {
                    currentProjectAssignment = null;
                }
            } catch {
                currentProjectAssignment = null;
            }
        } else {
            currentProjectAssignment = null;
        }

        if (bidsRes.status === 401) {
            renderModalError('Session Expired — सत्र समाप्त हो गया\nYour session has expired or is invalid. Please log in again. — आपका सत्र समाप्त हो गया है या मान्य नहीं है। कृपया फिर से लॉगिन करें।');
            return;
        }
        if (bidsRes.status === 403) {
            renderModalError('Access Denied — अनुमति नहीं है\nYou do not have permission to view this information. — आपको यह जानकारी देखने की अनुमति नहीं है।');
            return;
        }
        if (bidsRes.status === 404) {
            renderModalError('Information Not Found — जानकारी नहीं मिली\nThe requested My Bid information could not be found. — मांगी गई My Bid जानकारी नहीं मिली।');
            return;
        }
        if (!bidsRes.ok) {
            renderModalError('Server Error — सर्वर में समस्या\nServer error occurred. Please try again later. — सर्वर में समस्या हुई। कृपया बाद में फिर प्रयास करें।');
            return;
        }

        const bids = await bidsRes.json();
        currentProjectBids = Array.isArray(bids) ? bids : [];

        if (currentProjectBids.length === 0) {
            renderModalEmpty();
        } else {
            renderModalBidsList(currentProjectBids);
        }

    } catch (err) {
        console.error('Bids fetch error:', err);
        renderModalError('Connection Failed — कनेक्शन नहीं हो पाया\nUnable to reach the server. Please check your network connection. — सर्वर से कनेक्ट नहीं हो पाया। कृपया अपना इंटरनेट कनेक्शन जांचें।');
    } finally {
        isFetchingBids = false;
    }
}

/**
 * Refreshes project bids from backend and re-renders modal
 */
async function refreshProjectBids(projectId, successMessage = null) {
    if (!projectId) return;

    try {
        const token = getCleanToken();
        const [bidsRes, assignmentRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/customer/my-bids/projects/${encodeURIComponent(projectId)}/bids`, {
                method: 'GET',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            }),
            fetch(`${API_BASE_URL}/api/customer/my-bids/projects/${encodeURIComponent(projectId)}/assignment`, {
                method: 'GET',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
        ]);

        if (assignmentRes.ok) {
            try {
                const assignmentData = await assignmentRes.json();
                if (assignmentData && assignmentData.id && assignmentData.isCurrent && assignmentData.assignmentStatus === 'ACTIVE') {
                    currentProjectAssignment = assignmentData;
                } else {
                    currentProjectAssignment = null;
                }
            } catch {
                currentProjectAssignment = null;
            }
        } else {
            currentProjectAssignment = null;
        }

        if (bidsRes.ok) {
            const bids = await bidsRes.json();
            currentProjectBids = Array.isArray(bids) ? bids : [];
            if (currentProjectBids.length === 0) {
                renderModalEmpty();
            } else {
                renderModalBidsList(currentProjectBids, successMessage);
            }
        }
    } catch (err) {
        console.error('Refresh bids error:', err);
    }
}

/**
 * Closes the project bids modal and cleans up state
 */
function closeProjectBidsModal() {
    closeAcceptConfirmation();
    closeRevokeConfirmation();
    closeReassignConfirmation();
    const overlay = document.getElementById('bidsModalOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    document.body.style.overflow = ''; // Restore background scrolling
    currentOpenProjectId = null;
    currentProjectBids = [];
    currentProjectAssignment = null;
}

/**
 * Renders empty state when project has 0 submitted bids
 */
function renderModalEmpty() {
    const modalBody = document.getElementById('bidsModalBody');
    const footerInfo = document.getElementById('bidsModalFooterInfo');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="modal-empty-state">
                <i class="fa-regular fa-folder-open"></i>
                <h4>No Bids Found — कोई बोली नहीं मिली</h4>
                <p>You have not submitted any My Bids yet. — आपने अभी तक कोई बोली जमा नहीं की है।</p>
            </div>
        `;
    }
    if (footerInfo) footerInfo.textContent = '0 Bids — 0 बोलियाँ';
}

/**
 * Renders error message inside the modal dialog
 */
function renderModalError(msg) {
    const modalBody = document.getElementById('bidsModalBody');
    const footerInfo = document.getElementById('bidsModalFooterInfo');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="modal-error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h4>Error — त्रुटि</h4>
                <p style="white-space: pre-line;">${msg}</p>
            </div>
        `;
    }
    if (footerInfo) footerInfo.textContent = '';
}

/**
 * Renders the list of submitted bids with comparison KPIs and expandable details
 */
function renderModalBidsList(bids, successMessage = null) {
    const modalBody = document.getElementById('bidsModalBody');
    const footerInfo = document.getElementById('bidsModalFooterInfo');
    if (!modalBody) return;

    if (footerInfo) {
        footerInfo.textContent = `Showing ${bids.length} submitted bid${bids.length === 1 ? '' : 's'} — ${bids.length} बोलियाँ`;
    }

    let successBannerHtml = '';
    if (successMessage) {
        successBannerHtml = `
            <div class="assignment-success-banner" id="assignmentSuccessBanner">
                <i class="fa-solid fa-circle-check"></i>
                <div>
                    <strong>Accepted Bid — स्वीकृत बोली</strong>
                    <span>${successMessage}</span>
                </div>
            </div>
        `;
    }

    modalBody.innerHTML = `
        ${successBannerHtml}
        <div class="modal-bids-list">
            ${bids.map(bid => {
                const statusInfo = mapBidStatus(bid.status);
                const contractorInitial = (bid.contractorName || 'C').charAt(0).toUpperCase();

                // Contractor Contact Information Protection:
                // Only render contact details if the backend explicitly supplied authorized contact information
                let contactMarkup = '';
                if (bid.contractorContact && (bid.contractorContact.phone || bid.contractorContact.email)) {
                    contactMarkup = `
                        <div class="contact-authorized-card">
                            <div class="detail-item">
                                <span class="detail-label"><i class="fa-solid fa-user-check"></i> Contractor Contact — ठेकेदार संपर्क</span>
                                <span class="detail-val">${safeText(bid.contractorContact.name, bid.contractorName)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label"><i class="fa-solid fa-phone"></i> Phone — फोन</span>
                                <span class="detail-val">${safeText(bid.contractorContact.phone)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label"><i class="fa-solid fa-envelope"></i> Email — ईमेल</span>
                                <span class="detail-val">${safeText(bid.contractorContact.email)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label"><i class="fa-solid fa-location-dot"></i> Location — स्थान</span>
                                <span class="detail-val">${safeText(bid.contractorContact.location)}</span>
                            </div>
                        </div>
                    `;
                } else {
                    contactMarkup = `
                        <div class="contact-locked-banner">
                            <i class="fa-solid fa-lock"></i>
                            <span>Contractor Contact — ठेकेदार संपर्क: Details are available after contractor assignment. — कार्य आवंटन के बाद संपर्क विवरण उपलब्ध होगा।</span>
                        </div>
                    `;
                }

                const hasActiveAssignment = Boolean(
                    currentProjectAssignment &&
                    currentProjectAssignment.id &&
                    currentProjectAssignment.isCurrent &&
                    currentProjectAssignment.assignmentStatus === 'ACTIVE'
                );

                const isReopenedProject = !hasActiveAssignment && bids.some(b => 
                    b.status === 'NOT_SELECTED' || 
                    b.status === 'ASSIGNMENT_DECLINED' || 
                    Boolean(b.rejectedAt)
                );

                const canAccept = !hasActiveAssignment && !isReopenedProject && (bid.status === 'PENDING');
                const canReassign = !hasActiveAssignment && isReopenedProject && (bid.status === 'NOT_SELECTED' || bid.status === 'PENDING');

                const isCurrentAcceptedBid = (
                    bid.status === 'ACCEPTED' &&
                    hasActiveAssignment &&
                    String(currentProjectAssignment.bidId) === String(bid.id)
                );
                const canRevoke = isCurrentAcceptedBid;

                return `
                    <div class="bid-card" id="bidCard-${bid.id}">
                        <div class="bid-card-summary">
                            <div class="bid-card-header">
                                <div class="bid-contractor-meta">
                                    <div class="bid-avatar">${contractorInitial}</div>
                                    <div class="bid-contractor-info">
                                        <h3>${safeText(bid.contractorName, 'Contractor #' + (bid.contractorId || bid.id))}</h3>
                                        <div class="bid-submitted-date">
                                            Submitted Date — जमा करने की तारीख: ${formatDate(bid.submittedAt)}
                                            ${bid.status === 'ACCEPTED' ? ' • <span class="contractor-selected-tag"><i class="fa-solid fa-circle-check"></i> Accepted Bid — स्वीकृत बोली</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                                <span class="status-pill ${statusInfo.badgeClass}">${statusInfo.label}</span>
                            </div>

                            <div class="bid-card-kpis">
                                <div class="bid-kpi-item">
                                    <span class="bid-kpi-label">Bid Amount — बोली राशि</span>
                                    <span class="bid-kpi-val highlight-amount">${formatCurrency(bid.bidAmount)}</span>
                                </div>
                                <div class="bid-kpi-item">
                                    <span class="bid-kpi-label">Estimated Duration — अनुमानित अवधि</span>
                                    <span class="bid-kpi-val">${safeText(bid.estimatedDuration, 'Not specified — निर्दिष्ट नहीं')}</span>
                                </div>
                                <div class="bid-kpi-item">
                                    <span class="bid-kpi-label">Proposed Timeline — प्रस्तावित समय-सीमा</span>
                                    <span class="bid-kpi-val">${safeText(bid.proposedTimeline, 'Not specified — निर्दिष्ट नहीं')}</span>
                                </div>
                                <div class="bid-kpi-item">
                                    <span class="bid-kpi-label">Workers Count — कामगारों की संख्या</span>
                                    <span class="bid-kpi-val">${bid.workersCount ? bid.workersCount + ' workers — कामगार' : 'Not specified — निर्दिष्ट नहीं'}</span>
                                </div>
                            </div>

                            <div class="bid-card-actions">
                                ${canAccept ? `
                                    <button type="button" class="btn-accept-bid" onclick="openAcceptConfirmation('${bid.id}')">
                                        <i class="fa-solid fa-check"></i> Accept Bid — बोली स्वीकार करें
                                    </button>
                                ` : ''}
                                ${canReassign ? `
                                    <button type="button" class="btn-reassign-bid" onclick="openReassignConfirmation('${bid.id}')">
                                        <i class="fa-solid fa-arrows-rotate"></i> Reassign Contractor — दूसरे ठेकेदार को आवंटित करें
                                    </button>
                                ` : ''}
                                ${canRevoke ? `
                                    <button type="button" class="btn-revoke-acceptance" onclick="openRevokeConfirmation('${currentProjectAssignment.id}')">
                                        <i class="fa-solid fa-arrow-rotate-left"></i> Take Back Acceptance — स्वीकृति वापस लें
                                    </button>
                                ` : ''}
                                <button type="button" class="btn-toggle-details" id="toggleBtn-${bid.id}" onclick="toggleBidDetails('${bid.id}')">
                                    <i class="fa-solid fa-chevron-down"></i> View Details — विवरण देखें
                                </button>
                            </div>
                        </div>

                        <!-- Collapsible Detailed Breakdown Drawer -->
                        <div class="bid-card-details" id="bidDetails-${bid.id}" style="display: none;">
                            <!-- Financial Breakdown -->
                            <div class="bid-details-section">
                                <div class="details-section-title">
                                    <i class="fa-solid fa-coins"></i> Financial Cost Breakdown — वित्तीय लागत विवरण
                                </div>
                                <div class="details-grid">
                                    <div class="detail-item">
                                        <span class="detail-label">Bid Amount — बोली राशि</span>
                                        <span class="detail-val" style="font-weight: 700; color: #0284c7;">${formatCurrency(bid.bidAmount)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Material Cost — सामग्री लागत</span>
                                        <span class="detail-val">${formatCurrency(bid.materialCost)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Labour Cost — श्रम लागत</span>
                                        <span class="detail-val">${formatCurrency(bid.labourCost)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Equipment Cost — उपकरण लागत</span>
                                        <span class="detail-val">${formatCurrency(bid.equipmentCost)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Transport Cost — परिवहन लागत</span>
                                        <span class="detail-val">${formatCurrency(bid.transportCost)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Other Charges — अन्य शुल्क</span>
                                        <span class="detail-val">${formatCurrency(bid.otherCharges)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Scope and Project Work Information -->
                            <div class="bid-details-section">
                                <div class="details-section-title">
                                    <i class="fa-solid fa-list-check"></i> Scope of Work — काम का दायरा
                                </div>
                                <div class="details-grid-2col">
                                    <div class="detail-item full-width">
                                        <span class="detail-label">Scope of Work — काम का दायरा</span>
                                        <span class="detail-val">${safeText(bid.scopeOfWork)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Included Work — शामिल कार्य</span>
                                        <span class="detail-val">${safeText(bid.includedWork)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Excluded Work — गैर-शामिल कार्य</span>
                                        <span class="detail-val">${safeText(bid.excludedWork)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Estimated Duration — अनुमानित अवधि</span>
                                        <span class="detail-val">${safeText(bid.estimatedDuration)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Proposed Timeline — प्रस्तावित समय-सीमा</span>
                                        <span class="detail-val">${safeText(bid.proposedTimeline)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Workers Count — कामगारों की संख्या</span>
                                        <span class="detail-val">${safeText(bid.workersCount)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Commercial Terms -->
                            <div class="bid-details-section">
                                <div class="details-section-title">
                                    <i class="fa-solid fa-file-contract"></i> Payment Terms — भुगतान की शर्तें &amp; Warranty — वारंटी
                                </div>
                                <div class="details-grid-2col">
                                    <div class="detail-item">
                                        <span class="detail-label">Payment Terms — भुगतान की शर्तें</span>
                                        <span class="detail-val">${safeText(bid.paymentTerms)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Warranty — वारंटी</span>
                                        <span class="detail-val">${safeText(bid.warranty)}</span>
                                    </div>
                                    <div class="detail-item full-width">
                                        <span class="detail-label">Remarks — अतिरिक्त जानकारी</span>
                                        <span class="detail-val">${safeText(bid.remarks)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Dates & Timeline Records -->
                            <div class="bid-details-section">
                                <div class="details-section-title">
                                    <i class="fa-solid fa-calendar-days"></i> Dates — महत्वपूर्ण तारीखें
                                </div>
                                <div class="details-grid">
                                    <div class="detail-item">
                                        <span class="detail-label">Submitted Date — जमा करने की तारीख</span>
                                        <span class="detail-val">${formatDateTime(bid.submittedAt)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Rejected Date — अस्वीकृति की तारीख</span>
                                        <span class="detail-val">${bid.rejectedAt ? formatDateTime(bid.rejectedAt) : 'N/A — उपलब्ध नहीं'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Visible Until — दृश्यता अवधि</span>
                                        <span class="detail-val">${bid.visibleUntil ? formatDateTime(bid.visibleUntil) : 'N/A — उपलब्ध नहीं'}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Contractor Contact Section (Protected) -->
                            <div class="bid-details-section">
                                <div class="details-section-title">
                                    <i class="fa-solid fa-address-card"></i> Contractor Contact — ठेकेदार संपर्क
                                </div>
                                ${contactMarkup}
                            </div>

                            ${canRevoke ? `
                                <div class="assignment-info-bar">
                                    <div class="assignment-info-label">
                                        <i class="fa-solid fa-circle-check"></i>
                                        <span>Active Contractor Selected — सक्रिय ठेकेदार चुना गया (Assignment #${currentProjectAssignment.id})</span>
                                    </div>
                                    <button type="button" class="btn-revoke-acceptance" onclick="openRevokeConfirmation('${currentProjectAssignment.id}')">
                                        <i class="fa-solid fa-arrow-rotate-left"></i> Take Back Acceptance — स्वीकृति वापस लें
                                    </button>
                                </div>
                            ` : ''}

                            ${canAccept ? `
                                <div style="display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 14px; border-top: 1px solid #f1f5f9;">
                                    <button type="button" class="btn-accept-bid" onclick="openAcceptConfirmation('${bid.id}')">
                                        <i class="fa-solid fa-check"></i> Accept Bid — बोली स्वीकार करें
                                    </button>
                                </div>
                            ` : ''}

                            ${canReassign ? `
                                <div style="display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 14px; border-top: 1px solid #f1f5f9;">
                                    <button type="button" class="btn-reassign-bid" onclick="openReassignConfirmation('${bid.id}')">
                                        <i class="fa-solid fa-arrows-rotate"></i> Reassign Contractor — दूसरे ठेकेदार को आवंटित करें
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Toggles expanded breakdown drawer for a specific bid card
 */
function toggleBidDetails(bidId) {
    const detailsEl = document.getElementById(`bidDetails-${bidId}`);
    const toggleBtn = document.getElementById(`toggleBtn-${bidId}`);
    if (!detailsEl || !toggleBtn) return;

    const isHidden = detailsEl.style.display === 'none';
    if (isHidden) {
        detailsEl.style.display = 'flex';
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Hide Details — विवरण छुपाएं';
    } else {
        detailsEl.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> View Details — विवरण देखें';
    }
}

// =========================================================================
// PHASE 4.3: CUSTOMER BID ACCEPTANCE & ASSIGNMENT FLOW
// =========================================================================

/**
 * Opens the Accept Bid confirmation dialog
 */
function openAcceptConfirmation(bidId) {
    if (!bidId) return;
    if (isSubmittingAccept) return;

    const bid = currentProjectBids.find(b => String(b.id) === String(bidId));
    if (!bid) {
        console.warn('Bid not found in current project bids:', bidId);
        return;
    }

    pendingAcceptBidId = bidId;

    const contractorEl = document.getElementById('confirmContractorName');
    const amountEl = document.getElementById('confirmBidAmount');
    const timelineEl = document.getElementById('confirmTimeline');
    const errorEl = document.getElementById('acceptConfirmError');
    const confirmBtn = document.getElementById('btnConfirmAccept');
    const confirmTextEl = document.getElementById('btnConfirmAcceptText');
    const cancelBtn = document.getElementById('btnCancelAccept');
    const overlay = document.getElementById('acceptConfirmModalOverlay');

    if (contractorEl) contractorEl.textContent = safeText(bid.contractorName, 'Contractor #' + (bid.contractorId || bid.id));
    if (amountEl) amountEl.textContent = formatCurrency(bid.bidAmount);
    if (timelineEl) timelineEl.textContent = safeText(bid.proposedTimeline || bid.estimatedDuration, 'Not specified — निर्दिष्ट नहीं');

    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    if (confirmBtn) confirmBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    if (confirmTextEl) confirmTextEl.innerHTML = '<i class="fa-solid fa-check"></i> Confirm &amp; Accept — पुष्टि करें और स्वीकार करें';

    if (overlay) {
        overlay.style.display = 'flex';
    }
}

/**
 * Closes the Accept Bid confirmation dialog
 */
function closeAcceptConfirmation() {
    if (isSubmittingAccept) return;

    const overlay = document.getElementById('acceptConfirmModalOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    const errorEl = document.getElementById('acceptConfirmError');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
    pendingAcceptBidId = null;
}

/**
 * Submits bid acceptance to POST /api/customer/my-bids/bids/{bidId}/accept
 */
async function submitAcceptBid() {
    if (!pendingAcceptBidId || isSubmittingAccept) return;

    const bidIdToAccept = pendingAcceptBidId;
    isSubmittingAccept = true;

    const confirmBtn = document.getElementById('btnConfirmAccept');
    const confirmTextEl = document.getElementById('btnConfirmAcceptText');
    const cancelBtn = document.getElementById('btnCancelAccept');
    const errorEl = document.getElementById('acceptConfirmError');

    if (confirmBtn) confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (confirmTextEl) {
        confirmTextEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Accepting bid... — बोली स्वीकार की जा रही है...';
    }
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/customer/my-bids/bids/${encodeURIComponent(bidIdToAccept)}/accept`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.ok) {
            isSubmittingAccept = false;
            closeAcceptConfirmation();

            const successNote = 'Contractor has been successfully selected for this project. — इस प्रोजेक्ट के लिए ठेकेदार का सफलतापूर्वक चयन कर लिया गया है।';
            await refreshProjectBids(currentOpenProjectId, successNote);

            loadProjectBids(1, 5, true);
            loadDashboardStats();

            return;
        }

        let errorMsg = '';
        try {
            const errData = await response.json();
            if (errData && errData.error) {
                errorMsg = errData.error;
            }
        } catch {
            // No JSON body
        }

        if (response.status === 400) {
            errorMsg = errorMsg || 'Invalid state or this bid cannot be accepted. — अमान्य स्थिति या इस बोली को स्वीकार नहीं किया जा सकता।';
        } else if (response.status === 401) {
            errorMsg = 'Session Expired — सत्र समाप्त हो गया\nYour session has expired or is invalid. Please log in again. — आपका सत्र समाप्त हो गया है या मान्य नहीं है। कृपया फिर से लॉगिन करें।';
        } else if (response.status === 403) {
            errorMsg = 'Access Denied — अनुमति नहीं है\nYou do not have permission to view this information. — आपको यह जानकारी देखने की अनुमति नहीं है।';
        } else if (response.status === 404) {
            errorMsg = 'Information Not Found — जानकारी नहीं मिली\nThe requested My Bid information could not be found. — मांगी गई My Bid जानकारी नहीं मिली।';
        } else if (response.status === 409) {
            errorMsg = 'Information Changed — जानकारी बदल गई है\nThis information has changed. Refreshing the latest data. — यह जानकारी बदल गई है। नवीनतम जानकारी लोड की जा रही है।';
            if (currentOpenProjectId) {
                refreshProjectBids(currentOpenProjectId);
            }
            loadProjectBids(1, 5, true);
        } else if (response.status >= 500) {
            errorMsg = 'Server Error — सर्वर में समस्या\nServer error occurred. Please try again later. — सर्वर में समस्या हुई। कृपया बाद में फिर प्रयास करें।';
        } else {
            errorMsg = errorMsg || 'Unable to accept bid. Please try again. — बोली स्वीकार करने में असमर्थ। कृपया पुन: प्रयास करें।';
        }

        if (errorEl) {
            errorEl.textContent = errorMsg;
            errorEl.style.display = 'block';
        }

    } catch (err) {
        console.error('Accept bid error:', err);
        if (errorEl) {
            errorEl.textContent = 'Connection Failed — कनेक्शन नहीं हो पाया\nUnable to reach the server. Please check your network connection. — सर्वर से कनेक्ट नहीं हो पाया। कृपया अपना इंटरनेट कनेक्शन जांचें।';
            errorEl.style.display = 'block';
        }
    } finally {
        isSubmittingAccept = false;
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (confirmTextEl) {
            confirmTextEl.innerHTML = '<i class="fa-solid fa-check"></i> Confirm &amp; Accept — पुष्टि करें और स्वीकार करें';
        }
    }
}

// =========================================================================
// PHASE 4.4: CUSTOMER TAKE BACK ACCEPTANCE / WITHDRAW ASSIGNMENT FLOW
// =========================================================================

/**
 * Opens the Take Back Acceptance confirmation dialog
 */
function openRevokeConfirmation(assignmentId) {
    if (!assignmentId) return;
    if (isSubmittingRevoke) return;

    if (!currentProjectAssignment || String(currentProjectAssignment.id) !== String(assignmentId)) {
        console.warn('Assignment mismatch or missing:', assignmentId);
        return;
    }

    pendingRevokeAssignmentId = assignmentId;

    const acceptedBid = currentProjectBids.find(b => String(b.id) === String(currentProjectAssignment.bidId));

    const contractorEl = document.getElementById('revokeContractorName');
    const amountEl = document.getElementById('revokeBidAmount');
    const assignmentEl = document.getElementById('revokeAssignmentId');
    const errorEl = document.getElementById('revokeConfirmError');
    const confirmBtn = document.getElementById('btnConfirmRevoke');
    const confirmTextEl = document.getElementById('btnConfirmRevokeText');
    const cancelBtn = document.getElementById('btnCancelRevoke');
    const overlay = document.getElementById('revokeConfirmModalOverlay');

    const contractorName = acceptedBid 
        ? safeText(acceptedBid.contractorName, 'Contractor #' + (acceptedBid.contractorId || bid.id))
        : (currentProjectAssignment.contractor ? safeText(currentProjectAssignment.contractor.name) : 'Selected Contractor — चयनित ठेकेदार');

    const bidAmount = acceptedBid 
        ? formatCurrency(acceptedBid.bidAmount)
        : (currentProjectAssignment.bidAmount ? formatCurrency(currentProjectAssignment.bidAmount) : '—');

    if (contractorEl) contractorEl.textContent = contractorName;
    if (amountEl) amountEl.textContent = bidAmount;
    if (assignmentEl) assignmentEl.textContent = '#' + assignmentId;

    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    if (confirmBtn) confirmBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    if (confirmTextEl) confirmTextEl.innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i> Confirm &amp; Withdraw — पुष्टि करें और वापस लें';

    if (overlay) {
        overlay.style.display = 'flex';
    }
}

/**
 * Closes the Take Back Acceptance confirmation dialog
 */
function closeRevokeConfirmation() {
    if (isSubmittingRevoke) return;

    const overlay = document.getElementById('revokeConfirmModalOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    const errorEl = document.getElementById('revokeConfirmError');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
    pendingRevokeAssignmentId = null;
}

/**
 * Submits acceptance withdrawal to POST /api/customer/my-bids/assignments/{assignmentId}/revoke
 */
async function submitRevokeAcceptance() {
    if (!pendingRevokeAssignmentId || isSubmittingRevoke) return;

    const assignmentIdToRevoke = pendingRevokeAssignmentId;
    isSubmittingRevoke = true;

    const confirmBtn = document.getElementById('btnConfirmRevoke');
    const confirmTextEl = document.getElementById('btnConfirmRevokeText');
    const cancelBtn = document.getElementById('btnCancelRevoke');
    const errorEl = document.getElementById('revokeConfirmError');

    if (confirmBtn) confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (confirmTextEl) {
        confirmTextEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Withdrawing acceptance... — स्वीकृति वापस ली जा रही है...';
    }
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/customer/my-bids/assignments/${encodeURIComponent(assignmentIdToRevoke)}/revoke`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.ok) {
            isSubmittingRevoke = false;
            closeRevokeConfirmation();

            const successNote = 'Acceptance withdrawn successfully. Project reopened for My Bid selection. — स्वीकृति सफलतापूर्वक वापस ली गई। प्रोजेक्ट My Bid चयन के लिए फिर से खुल गया है।';
            await refreshProjectBids(currentOpenProjectId, successNote);

            loadProjectBids(1, 5, true);
            loadDashboardStats();

            return;
        }

        let errorMsg = '';
        try {
            const errData = await response.json();
            if (errData && errData.error) {
                errorMsg = errData.error;
            }
        } catch {
            // No JSON body
        }

        if (response.status === 400) {
            errorMsg = errorMsg || 'This assignment cannot be withdrawn in its current state. — इस आवंटन को वर्तमान स्थिति में वापस नहीं लिया जा सकता।';
        } else if (response.status === 401) {
            errorMsg = 'Session Expired — सत्र समाप्त हो गया\nYour session has expired or is invalid. Please log in again. — आपका सत्र समाप्त हो गया है या मान्य नहीं है। कृपया फिर से लॉगिन करें।';
        } else if (response.status === 403) {
            errorMsg = 'Access Denied — अनुमति नहीं है\nYou do not have permission to view this information. — आपको यह जानकारी देखने की अनुमति नहीं है।';
        } else if (response.status === 404) {
            errorMsg = 'Information Not Found — जानकारी नहीं मिली\nThe requested My Bid information could not be found. — मांगी गई My Bid जानकारी नहीं मिली।';
        } else if (response.status === 409) {
            errorMsg = 'Information Changed — जानकारी बदल गई है\nThis information has changed. Refreshing the latest data. — यह जानकारी बदल गई है। नवीनतम जानकारी लोड की जा रही है।';
            if (currentOpenProjectId) {
                refreshProjectBids(currentOpenProjectId);
            }
            loadProjectBids(1, 5, true);
        } else if (response.status >= 500) {
            errorMsg = 'Server Error — सर्वर में समस्या\nServer error occurred. Please try again later. — सर्वर में समस्या हुई। कृपया बाद में फिर प्रयास करें।';
        } else {
            errorMsg = errorMsg || 'Unable to withdraw acceptance. Please try again. — स्वीकृति वापस लेने में असमर्थ। कृपया पुन: प्रयास करें।';
        }

        if (errorEl) {
            errorEl.textContent = errorMsg;
            errorEl.style.display = 'block';
        }

    } catch (err) {
        console.error('Revoke acceptance error:', err);
        if (errorEl) {
            errorEl.textContent = 'Connection Failed — कनेक्शन नहीं हो पाया\nUnable to reach the server. Please check your network connection. — सर्वर से कनेक्ट नहीं हो पाया। कृपया अपना इंटरनेट कनेक्शन जांचें।';
            errorEl.style.display = 'block';
        }
    } finally {
        isSubmittingRevoke = false;
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (confirmTextEl) {
            confirmTextEl.innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i> Confirm &amp; Withdraw — पुष्टि करें और वापस लें';
        }
    }
}

// =========================================================================
// PHASE 4.5: CUSTOMER REASSIGN CONTRACTOR USING EXISTING BID
// =========================================================================

/**
 * Opens the Reassign Contractor confirmation dialog
 */
function openReassignConfirmation(bidId) {
    if (!bidId) return;
    if (isSubmittingReassign) return;

    const bid = currentProjectBids.find(b => String(b.id) === String(bidId));
    if (!bid) {
        console.warn('Bid not found in current project bids:', bidId);
        return;
    }

    pendingReassignBidId = bidId;

    const contractorEl = document.getElementById('reassignContractorName');
    const amountEl = document.getElementById('reassignBidAmount');
    const durationEl = document.getElementById('reassignDuration');
    const timelineEl = document.getElementById('reassignTimeline');
    const errorEl = document.getElementById('reassignConfirmError');
    const confirmBtn = document.getElementById('btnConfirmReassign');
    const confirmTextEl = document.getElementById('btnConfirmReassignText');
    const cancelBtn = document.getElementById('btnCancelReassign');
    const overlay = document.getElementById('reassignConfirmModalOverlay');

    if (contractorEl) contractorEl.textContent = safeText(bid.contractorName, 'Contractor #' + (bid.contractorId || bid.id));
    if (amountEl) amountEl.textContent = formatCurrency(bid.bidAmount);
    if (durationEl) durationEl.textContent = safeText(bid.estimatedDuration, 'Not specified — निर्दिष्ट नहीं');
    if (timelineEl) timelineEl.textContent = safeText(bid.proposedTimeline, 'Not specified — निर्दिष्ट नहीं');

    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    if (confirmBtn) confirmBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    if (confirmTextEl) confirmTextEl.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Confirm Reassignment — पुन: आवंटन की पुष्टि करें';

    if (overlay) {
        overlay.style.display = 'flex';
    }
}

/**
 * Closes the Reassign Contractor confirmation dialog
 */
function closeReassignConfirmation() {
    if (isSubmittingReassign) return;

    const overlay = document.getElementById('reassignConfirmModalOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    const errorEl = document.getElementById('reassignConfirmError');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
    pendingReassignBidId = null;
}

/**
 * Submits contractor reassignment to POST /api/customer/my-bids/bids/{bidId}/reassign
 */
async function submitReassignBid() {
    if (!pendingReassignBidId || isSubmittingReassign) return;

    const bidIdToReassign = pendingReassignBidId;
    isSubmittingReassign = true;

    const confirmBtn = document.getElementById('btnConfirmReassign');
    const confirmTextEl = document.getElementById('btnConfirmReassignText');
    const cancelBtn = document.getElementById('btnCancelReassign');
    const errorEl = document.getElementById('reassignConfirmError');

    if (confirmBtn) confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (confirmTextEl) {
        confirmTextEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reassigning contractor... — ठेकेदार को पुनः आवंटित किया जा रहा है...';
    }
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/customer/my-bids/bids/${encodeURIComponent(bidIdToReassign)}/reassign`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.ok) {
            isSubmittingReassign = false;
            closeReassignConfirmation();

            const successNote = 'Contractor reassigned successfully. New active assignment created using this existing bid. — ठेकेदार को सफलतापूर्वक पुनः आवंटित किया गया। इस मौजूदा बोली का उपयोग करके नया सक्रिय आवंटन बनाया गया।';
            await refreshProjectBids(currentOpenProjectId, successNote);

            loadProjectBids(1, 5, true);
            loadDashboardStats();

            return;
        }

        let errorMsg = '';
        try {
            const errData = await response.json();
            if (errData && errData.error) {
                errorMsg = errData.error;
            }
        } catch {
            // No JSON body
        }

        if (response.status === 400) {
            errorMsg = errorMsg || 'This bid cannot be used for reassignment in its current state. — इस बोली का उपयोग वर्तमान स्थिति में पुन: आवंटन के लिए नहीं किया जा सकता।';
        } else if (response.status === 401) {
            errorMsg = 'Session Expired — सत्र समाप्त हो गया\nYour session has expired or is invalid. Please log in again. — आपका सत्र समाप्त हो गया है या मान्य नहीं है। कृपया फिर से लॉगिन करें।';
        } else if (response.status === 403) {
            errorMsg = 'Access Denied — अनुमति नहीं है\nYou do not have permission to view this information. — आपको यह जानकारी देखने की अनुमति नहीं है।';
        } else if (response.status === 404) {
            errorMsg = 'Information Not Found — जानकारी नहीं मिली\nThe requested My Bid information could not be found. — मांगी गई My Bid जानकारी नहीं मिली।';
        } else if (response.status === 409) {
            errorMsg = 'Information Changed — जानकारी बदल गई है\nThis information has changed. Refreshing the latest data. — यह जानकारी बदल गई है। नवीनतम जानकारी लोड की जा रही है।';
            if (currentOpenProjectId) {
                refreshProjectBids(currentOpenProjectId);
            }
            loadProjectBids(1, 5, true);
        } else if (response.status >= 500) {
            errorMsg = 'Server Error — सर्वर में समस्या\nServer error occurred. Please try again later. — सर्वर में समस्या हुई। कृपया बाद में फिर प्रयास करें।';
        } else {
            errorMsg = errorMsg || 'Unable to reassign contractor. Please try again. — ठेकेदार को पुन: आवंटित करने में असमर्थ। कृपया पुन: प्रयास करें।';
        }

        if (errorEl) {
            errorEl.textContent = errorMsg;
            errorEl.style.display = 'block';
        }

    } catch (err) {
        console.error('Reassign bid error:', err);
        if (errorEl) {
            errorEl.textContent = 'Connection Failed — कनेक्शन नहीं हो पाया\nUnable to reach the server. Please check your network connection. — सर्वर से कनेक्ट नहीं हो पाया। कृपया अपना इंटरनेट कनेक्शन जांचें।';
            errorEl.style.display = 'block';
        }
    } finally {
        isSubmittingReassign = false;
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (confirmTextEl) {
            confirmTextEl.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Confirm Reassignment — पुन: आवंटन की पुष्टि करें';
        }
    }
}

// Global window bindings for onclick handlers
if (typeof window !== 'undefined') {
    window.openAcceptConfirmation = openAcceptConfirmation;
    window.closeAcceptConfirmation = closeAcceptConfirmation;
    window.submitAcceptBid = submitAcceptBid;
    window.openRevokeConfirmation = openRevokeConfirmation;
    window.closeRevokeConfirmation = closeRevokeConfirmation;
    window.submitRevokeAcceptance = submitRevokeAcceptance;
    window.openReassignConfirmation = openReassignConfirmation;
    window.closeReassignConfirmation = closeReassignConfirmation;
    window.submitReassignBid = submitReassignBid;
    window.toggleBidDetails = toggleBidDetails;
    window.openProjectBidsModal = openProjectBidsModal;
    window.closeProjectBidsModal = closeProjectBidsModal;
    window.loadProjectBids = loadProjectBids;
}
