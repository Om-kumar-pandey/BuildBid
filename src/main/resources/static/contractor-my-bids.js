/**
 * =========================================================
 * BUILDBID - CONTRACTOR MY BIDS & CONTRACTS ENGINE (Phase 4.6B)
 * Bilingual English + Simple Hindi Terminology
 * State-Changing Contractor Decline Workflow
 * =========================================================
 */

function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.location) {
        if (window.location.origin && window.location.origin.startsWith("http")) {
            return window.location.origin;
        }
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

// Global cached states
let cachedActiveBids = [];
let cachedContracts = [];
let cachedHistoryBids = [];
let currentActiveTab = 'active'; // 'active' | 'contracts' | 'history'
let pendingDeclineAssignmentId = null;
let isSubmittingDecline = false;
let currentViewingAssignment = null;

// Safe helper functions
function safeText(val, fallback = 'Not specified — निर्दिष्ट नहीं') {
    if (val === null || val === undefined || String(val).trim() === '') return fallback;
    return String(val).trim();
}

function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return 'Not specified — निर्दिष्ट नहीं';
    return '₹ ' + Number(val).toLocaleString('en-IN');
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
 * Maps backend MyBid statuses to customer/contractor friendly bilingual labels
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
            return { label: rawStatus || 'Under Review — समीक्षा में', badgeClass: 'status-pending' };
    }
}

// User session initialization
function initUserSession() {
    const userNameEl = document.getElementById('top-nav-name');
    const userInitialsEl = document.getElementById('top-nav-avatar-text');

    try {
        let user = JSON.parse(
            localStorage.getItem('currentUser') || 
            localStorage.getItem('loggedInUser') || 
            sessionStorage.getItem('currentUser') || '{}'
        );
        const displayName = (user.name || user.companyName || user.username || '').trim();
        if (displayName) {
            const firstName = displayName.split(' ')[0];
            if (userNameEl) userNameEl.textContent = firstName.charAt(0).toUpperCase() + firstName.slice(1);
            if (userInitialsEl) {
                const words = displayName.split(' ').filter(Boolean);
                const initials = words.length > 1 ? (words[0][0] + words[words.length - 1][0]) : words[0][0];
                userInitialsEl.textContent = initials.toUpperCase();
            }
        }
    } catch (err) {
        console.warn('Session init warning:', err);
    }
}

// Tab Switching
function switchTab(tabKey) {
    currentActiveTab = tabKey;

    const tabBtnActive = document.getElementById('tabBtnActive');
    const tabBtnContracts = document.getElementById('tabBtnContracts');
    const tabBtnHistory = document.getElementById('tabBtnHistory');

    const viewActive = document.getElementById('viewActiveBids');
    const viewContracts = document.getElementById('viewContracts');
    const viewHistory = document.getElementById('viewHistory');

    if (tabBtnActive) tabBtnActive.classList.toggle('active', tabKey === 'active');
    if (tabBtnContracts) tabBtnContracts.classList.toggle('active', tabKey === 'contracts');
    if (tabBtnHistory) tabBtnHistory.classList.toggle('active', tabKey === 'history');

    if (viewActive) viewActive.style.display = (tabKey === 'active') ? 'block' : 'none';
    if (viewContracts) viewContracts.style.display = (tabKey === 'contracts') ? 'block' : 'none';
    if (viewHistory) viewHistory.style.display = (tabKey === 'history') ? 'block' : 'none';

    // Clear search filter when switching tabs
    const searchInput = document.getElementById('bidsSearchInput');
    if (searchInput) searchInput.value = '';

    if (tabKey === 'active' && cachedActiveBids.length === 0) {
        loadActiveBids();
    } else if (tabKey === 'contracts' && cachedContracts.length === 0) {
        loadContracts();
    } else if (tabKey === 'history' && cachedHistoryBids.length === 0) {
        loadBidHistory();
    }
}

function refreshCurrentTab() {
    if (currentActiveTab === 'active') {
        loadActiveBids();
    } else if (currentActiveTab === 'contracts') {
        loadContracts();
    } else if (currentActiveTab === 'history') {
        loadBidHistory();
    }
}

// =========================================================================
// 1. CONTRACTOR MY BIDS API (GET /api/contractor/my-bids)
// =========================================================================

async function loadActiveBids() {
    const container = document.getElementById('activeBidsContainer');
    if (!container) return;

    renderLoading(container, 'Loading your bids... — आपकी बोलियाँ लोड हो रही हैं...');

    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/contractor/my-bids`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.status === 401) {
            renderError(container, 401);
            return;
        }
        if (response.status === 403) {
            renderError(container, 403);
            return;
        }
        if (!response.ok) {
            renderError(container, response.status);
            return;
        }

        const data = await response.json();
        cachedActiveBids = Array.isArray(data) ? data : [];

        // Update badge and KPI stats
        const badge = document.getElementById('badgeActiveBids');
        if (badge) badge.textContent = cachedActiveBids.length;

        const statActive = document.getElementById('statActiveBids');
        if (statActive) statActive.textContent = cachedActiveBids.length;

        const underReviewCount = cachedActiveBids.filter(b => b.status === 'PENDING').length;
        const statUnderReview = document.getElementById('statUnderReview');
        if (statUnderReview) statUnderReview.textContent = underReviewCount;

        if (cachedActiveBids.length === 0) {
            renderEmpty(container, 'No Bids Found — कोई बोली नहीं मिली', 'You have not submitted any My Bids yet. — आपने अभी तक कोई बोली जमा नहीं की है।', 'fa-gavel');
        } else {
            renderBidsList(container, cachedActiveBids);
        }

    } catch (err) {
        console.error('Load active bids error:', err);
        renderError(container, 'network');
    }
}

// =========================================================================
// 2. CONTRACTOR MY CONTRACTS API (GET /api/contractor/my-bids/contracts)
// =========================================================================

async function loadContracts() {
    const container = document.getElementById('contractsContainer');
    if (!container) return;

    renderLoading(container, 'Loading your contracts... — आपके अनुबंध लोड हो रहे हैं...');

    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/contractor/my-bids/contracts`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.status === 401) {
            renderError(container, 401);
            return;
        }
        if (response.status === 403) {
            renderError(container, 403);
            return;
        }
        if (!response.ok) {
            renderError(container, response.status);
            return;
        }

        const data = await response.json();
        // Authoritative active assignment filter: assignmentStatus === 'ACTIVE' && isCurrent === true
        const contracts = (Array.isArray(data) ? data : []).filter(c => c.assignmentStatus === 'ACTIVE' && c.isCurrent);
        cachedContracts = contracts;

        // Update badge and stats
        const badge = document.getElementById('badgeContracts');
        if (badge) badge.textContent = cachedContracts.length;

        const statContracts = document.getElementById('statContracts');
        if (statContracts) statContracts.textContent = cachedContracts.length;

        if (cachedContracts.length === 0) {
            renderEmpty(container, 'No Active Contracts — कोई सक्रिय अनुबंध नहीं है', 'You currently have no active contracts. — आपके पास अभी कोई सक्रिय अनुबंध नहीं है।', 'fa-file-lines');
        } else {
            renderContractsList(container, cachedContracts);
        }

    } catch (err) {
        console.error('Load contracts error:', err);
        renderError(container, 'network');
    }
}

// =========================================================================
// 3. CONTRACTOR BID HISTORY API (GET /api/contractor/my-bids/history)
// =========================================================================

async function loadBidHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;

    renderLoading(container, 'Loading history... — इतिहास लोड हो रहा है...');

    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/contractor/my-bids/history`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.status === 401) {
            renderError(container, 401);
            return;
        }
        if (response.status === 403) {
            renderError(container, 403);
            return;
        }
        if (!response.ok) {
            renderError(container, response.status);
            return;
        }

        const data = await response.json();
        cachedHistoryBids = Array.isArray(data) ? data : [];

        // Update badge and total submission stats
        const badge = document.getElementById('badgeHistory');
        if (badge) badge.textContent = cachedHistoryBids.length;

        const statTotal = document.getElementById('statTotalSubmissions');
        if (statTotal) statTotal.textContent = cachedHistoryBids.length;

        if (cachedHistoryBids.length === 0) {
            renderEmpty(container, 'No Bid History Found — बोली का कोई इतिहास नहीं मिला', 'No My Bid history is available. — My Bid का कोई इतिहास उपलब्ध नहीं है।', 'fa-clock-rotate-left');
        } else {
            renderBidsList(container, cachedHistoryBids, true);
        }

    } catch (err) {
        console.error('Load history error:', err);
        renderError(container, 'network');
    }
}

// =========================================================================
// 4. RENDERING LISTS & CARDS
// =========================================================================

function renderBidsList(container, bids, isHistory = false) {
    container.innerHTML = bids.map(bid => {
        const statusInfo = mapBidStatus(bid.status);
        const projectTitle = safeText(bid.projectTitle, 'Project / प्रोजेक्ट #' + (bid.projectId || bid.id));

        // Security check: Only render customer contact if backend explicitly supplied it
        let customerContactMarkup = '';
        if (bid.customerContact && (bid.customerContact.phone || bid.customerContact.email || bid.customerContact.name)) {
            customerContactMarkup = `
                <div class="contact-authorized-card">
                    <div class="detail-cell">
                        <span class="detail-cell-label"><i class="fa-solid fa-user-check"></i> Customer Name — ग्राहक का नाम</span>
                        <span class="detail-cell-val">${safeText(bid.customerContact.name)}</span>
                    </div>
                    <div class="detail-cell">
                        <span class="detail-cell-label"><i class="fa-solid fa-phone"></i> Contact Phone — संपर्क फोन</span>
                        <span class="detail-cell-val">${safeText(bid.customerContact.phone)}</span>
                    </div>
                    <div class="detail-cell">
                        <span class="detail-cell-label"><i class="fa-solid fa-envelope"></i> Email Address — ईमेल पता</span>
                        <span class="detail-cell-val">${safeText(bid.customerContact.email)}</span>
                    </div>
                    <div class="detail-cell">
                        <span class="detail-cell-label"><i class="fa-solid fa-location-dot"></i> Customer Location — ग्राहक का स्थान</span>
                        <span class="detail-cell-val">${safeText(bid.customerContact.location)}</span>
                    </div>
                </div>
            `;
        } else {
            customerContactMarkup = `
                <div class="contact-locked-banner">
                    <i class="fa-solid fa-lock"></i>
                    <span>Customer contact unavailable — ग्राहक की संपर्क जानकारी उपलब्ध नहीं है</span>
                </div>
            `;
        }

        const workersLabel = bid.workersCount ? `${bid.workersCount} workers / कामगार` : 'Not specified — निर्दिष्ट नहीं';

        return `
            <div class="contractor-card" id="bidCard-${bid.id}" data-search="${(projectTitle).toLowerCase()}">
                <div class="card-main-body">
                    <div class="card-top-row">
                        <div class="card-project-info">
                            <div class="card-icon-avatar"><i class="fa-solid fa-briefcase"></i></div>
                            <div class="card-title-meta">
                                <h3>${projectTitle}</h3>
                                <div class="card-submeta">
                                    <span>Bid — बोली #${bid.id}</span>
                                    <span>•</span>
                                    <span>Project — प्रोजेक्ट #${bid.projectId || 'N/A'}</span>
                                    <span>•</span>
                                    <span>Submitted on — जमा करने की तारीख: ${formatDate(bid.submittedAt)}</span>
                                </div>
                            </div>
                        </div>
                        <span class="status-pill ${statusInfo.badgeClass}">${statusInfo.label}</span>
                    </div>

                    <div class="card-kpis-grid">
                        <div class="kpi-col">
                            <span class="kpi-col-label">My Bid Amount — बोली राशि</span>
                            <span class="kpi-col-val highlight-price">${formatCurrency(bid.bidAmount)}</span>
                        </div>
                        <div class="kpi-col">
                            <span class="kpi-col-label">Estimated Duration — अनुमानित अवधि</span>
                            <span class="kpi-col-val">${safeText(bid.estimatedDuration)}</span>
                        </div>
                        <div class="kpi-col">
                            <span class="kpi-col-label">Proposed Timeline — प्रस्तावित समय-सीमा</span>
                            <span class="kpi-col-val">${safeText(bid.proposedTimeline)}</span>
                        </div>
                        <div class="kpi-col">
                            <span class="kpi-col-label">Workers Count — कामगारों की संख्या</span>
                            <span class="kpi-col-val">${workersLabel}</span>
                        </div>
                    </div>

                    <div class="card-actions-bar">
                        <button type="button" class="btn-secondary" id="toggleDrawerBtn-${bid.id}" onclick="toggleBidDrawer('${bid.id}')">
                            <i class="fa-solid fa-chevron-down"></i> View Bid Details — बोली विवरण देखें
                        </button>
                    </div>
                </div>

                <!-- Collapsible Detailed Breakdown Drawer -->
                <div class="card-details-drawer" id="bidDrawer-${bid.id}" style="display: none;">
                    <!-- Financial Cost Breakdown -->
                    <div class="detail-section-block">
                        <div class="detail-section-title">
                            <i class="fa-solid fa-coins"></i> Financial Cost Breakdown — वित्तीय लागत विवरण
                        </div>
                        <div class="detail-grid-3col">
                            <div class="detail-cell">
                                <span class="detail-cell-label">Total Bid Amount — कुल बोली राशि</span>
                                <span class="detail-cell-val" style="font-weight: 700; color: #0284c7;">${formatCurrency(bid.bidAmount)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Material Cost — सामग्री लागत</span>
                                <span class="detail-cell-val">${formatCurrency(bid.materialCost)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Labour Cost — श्रम लागत</span>
                                <span class="detail-cell-val">${formatCurrency(bid.labourCost)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Equipment Cost — उपकरण लागत</span>
                                <span class="detail-cell-val">${formatCurrency(bid.equipmentCost)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Transport Cost — परिवहन लागत</span>
                                <span class="detail-cell-val">${formatCurrency(bid.transportCost)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Other Charges — अन्य शुल्क</span>
                                <span class="detail-cell-val">${formatCurrency(bid.otherCharges)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Scope and Execution Details -->
                    <div class="detail-section-block">
                        <div class="detail-section-title">
                            <i class="fa-solid fa-list-check"></i> Scope & Execution Details — काम का दायरा और विवरण
                        </div>
                        <div class="detail-grid-2col">
                            <div class="detail-cell full-width">
                                <span class="detail-cell-label">Scope of Work — काम का दायरा</span>
                                <span class="detail-cell-val">${safeText(bid.scopeOfWork)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Included Work — शामिल काम</span>
                                <span class="detail-cell-val">${safeText(bid.includedWork)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Excluded Work — शामिल नहीं किया गया काम</span>
                                <span class="detail-cell-val">${safeText(bid.excludedWork)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Commercial Terms & Warranty -->
                    <div class="detail-section-block">
                        <div class="detail-section-title">
                            <i class="fa-solid fa-file-contract"></i> Commercial Terms & Warranty — व्यावसायिक शर्तें और वारंटी
                        </div>
                        <div class="detail-grid-2col">
                            <div class="detail-cell">
                                <span class="detail-cell-label">Payment Terms — भुगतान की शर्तें</span>
                                <span class="detail-cell-val">${safeText(bid.paymentTerms)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Warranty — वारंटी</span>
                                <span class="detail-cell-val">${safeText(bid.warranty)}</span>
                            </div>
                            <div class="detail-cell full-width">
                                <span class="detail-cell-label">Remarks — अतिरिक्त जानकारी</span>
                                <span class="detail-cell-val">${safeText(bid.remarks)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Key Timestamps -->
                    <div class="detail-section-block">
                        <div class="detail-section-title">
                            <i class="fa-solid fa-calendar-days"></i> Key Timestamps — मुख्य समय रिकॉर्ड
                        </div>
                        <div class="detail-grid-3col">
                            <div class="detail-cell">
                                <span class="detail-cell-label">Submitted At — जमा करने की तारीख</span>
                                <span class="detail-cell-val">${formatDateTime(bid.submittedAt)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Rejected At — अस्वीकृति की तारीख</span>
                                <span class="detail-cell-val">${bid.rejectedAt ? formatDateTime(bid.rejectedAt) : 'N/A — लागू नहीं'}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Visible Until — तब तक दृश्यमान</span>
                                <span class="detail-cell-val">${bid.visibleUntil ? formatDateTime(bid.visibleUntil) : 'Active — सक्रिय'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Customer Contact Section (Protected) -->
                    <div class="detail-section-block">
                        <div class="detail-section-title">
                            <i class="fa-solid fa-address-card"></i> Customer Contact — ग्राहक संपर्क
                        </div>
                        ${customerContactMarkup}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderContractsList(container, contracts) {
    container.innerHTML = contracts.map(c => {
        const projectTitle = safeText(c.projectTitle, 'Project / प्रोजेक्ट #' + (c.projectId || 'N/A'));
        const isEligibleToDecline = (c.assignmentStatus === 'ACTIVE' && c.isCurrent === true);

        return `
            <div class="contractor-card" id="contractCard-${c.id}" data-search="${(projectTitle).toLowerCase()}">
                <div class="card-main-body">
                    <div class="card-top-row">
                        <div class="card-project-info">
                            <div class="card-icon-avatar" style="background:#dcfce7; color:#16a34a; border-color:#bbf7d0;">
                                <i class="fa-solid fa-file-contract"></i>
                            </div>
                            <div class="card-title-meta">
                                <h3>${projectTitle}</h3>
                                <div class="card-submeta">
                                    <span>Contract — अनुबंध #${c.id}</span>
                                    <span>•</span>
                                    <span>Accepted Bid — स्वीकृत बोली #${c.bidId || 'N/A'}</span>
                                    <span>•</span>
                                    <span>Accepted on — स्वीकृति की तारीख: ${formatDate(c.acceptedAt)}</span>
                                </div>
                            </div>
                        </div>
                        <span class="status-pill status-accepted">
                            <i class="fa-solid fa-circle-check"></i> Active Contract — सक्रिय अनुबंध
                        </span>
                    </div>

                    <div class="card-kpis-grid">
                        <div class="kpi-col">
                            <span class="kpi-col-label">Contract Amount — अनुबंध राशि</span>
                            <span class="kpi-col-val highlight-price">${formatCurrency(c.bidAmount)}</span>
                        </div>
                        <div class="kpi-col">
                            <span class="kpi-col-label">Assignment Status — आवंटन स्थिति</span>
                            <span class="kpi-col-val" style="color: #16a34a;">Active — सक्रिय</span>
                        </div>
                        <div class="kpi-col">
                            <span class="kpi-col-label">Accepted At — स्वीकृति की तारीख</span>
                            <span class="kpi-col-val">${formatDateTime(c.acceptedAt)}</span>
                        </div>
                        <div class="kpi-col">
                            <span class="kpi-col-label">Current State — वर्तमान स्थिति</span>
                            <span class="kpi-col-val">Active Assignment — सक्रिय आवंटन</span>
                        </div>
                    </div>

                    <div class="card-actions-bar">
                        ${isEligibleToDecline ? `
                            <button type="button" class="btn-danger-outline" onclick="openDeclineModal('${c.id}')">
                                <i class="fa-solid fa-ban"></i> Decline Assignment — काम करने से मना करें
                            </button>
                        ` : ''}
                        <button type="button" class="btn-primary" onclick="openAssignmentDetailsModal('${c.id}')">
                            <i class="fa-regular fa-file-lines"></i> View Assignment Details — कार्य आवंटन विवरण देखें
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleBidDrawer(bidId) {
    const drawer = document.getElementById(`bidDrawer-${bidId}`);
    const toggleBtn = document.getElementById(`toggleDrawerBtn-${bidId}`);
    if (!drawer || !toggleBtn) return;

    const isHidden = drawer.style.display === 'none';
    if (isHidden) {
        drawer.style.display = 'flex';
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Hide Bid Details — विवरण छिपाएं';
    } else {
        drawer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> View Bid Details — बोली विवरण देखें';
    }
}

// =========================================================================
// 5. ASSIGNMENT DETAILS MODAL & PROJECT HISTORY
// =========================================================================

/**
 * Loads assignment details via GET /api/contractor/my-bids/assignments/{assignmentId}
 * Displays details and Decline Assignment action if eligible
 */
async function openAssignmentDetailsModal(assignmentId) {
    if (!assignmentId) return;

    const overlay = document.getElementById('assignmentDetailsModalOverlay');
    const modalBody = document.getElementById('assignmentModalBody');
    const titleEl = document.getElementById('assignmentModalTitle');
    const assignIdEl = document.getElementById('modalAssignmentId');
    const bidIdEl = document.getElementById('modalBidId');
    const modalFooter = document.getElementById('assignmentModalFooter');

    if (overlay) {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    if (modalBody) {
        modalBody.innerHTML = `
            <div class="state-box">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h4>Loading assignment details... — कार्य आवंटन का विवरण लोड हो रहा है...</h4>
            </div>
        `;
    }

    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/contractor/my-bids/assignments/${encodeURIComponent(assignmentId)}`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.status === 401) {
            renderModalError('Session Expired — सत्र समाप्त हो गया', 'Your session has expired or is invalid. Please log in again. — आपका सत्र समाप्त हो गया है या मान्य नहीं है। कृपया फिर से लॉगिन करें।');
            return;
        }
        if (response.status === 403) {
            renderModalError('Access Denied — अनुमति नहीं है', 'You do not have permission to view this information. — आपको यह जानकारी देखने की अनुमति नहीं है।');
            return;
        }
        if (response.status === 404) {
            renderModalError('Information Not Found — जानकारी नहीं मिली', 'The requested My Bid information could not be found. — मांगी गई My Bid जानकारी नहीं मिली।');
            return;
        }
        if (!response.ok) {
            renderModalError('Server Error — सर्वर में समस्या', 'Server error occurred. Please try again later. — सर्वर में समस्या हुई। कृपया बाद में फिर प्रयास करें।');
            return;
        }

        const assignment = await response.json();
        currentViewingAssignment = assignment;

        if (titleEl) titleEl.textContent = safeText(assignment.projectTitle, 'Project / प्रोजेक्ट #' + (assignment.projectId || 'N/A'));
        if (assignIdEl) assignIdEl.textContent = '#' + assignment.id;
        if (bidIdEl) bidIdEl.textContent = '#' + (assignment.bidId || 'N/A');

        // Customer contact security: Display only if explicitly returned
        let customerContactHtml = '';
        if (assignment.customer && (assignment.customer.phone || assignment.customer.email || assignment.customer.name)) {
            customerContactHtml = `
                <div class="contact-authorized-card">
                    <div class="detail-cell">
                        <span class="detail-cell-label"><i class="fa-solid fa-user-check"></i> Customer Name — ग्राहक का नाम</span>
                        <span class="detail-cell-val">${safeText(assignment.customer.name)}</span>
                    </div>
                    <div class="detail-cell">
                        <span class="detail-cell-label"><i class="fa-solid fa-phone"></i> Contact Phone — संपर्क फोन</span>
                        <span class="detail-cell-val">${safeText(assignment.customer.phone)}</span>
                    </div>
                    <div class="detail-cell">
                        <span class="detail-cell-label"><i class="fa-solid fa-envelope"></i> Email Address — ईमेल पता</span>
                        <span class="detail-cell-val">${safeText(assignment.customer.email)}</span>
                    </div>
                    <div class="detail-cell">
                        <span class="detail-cell-label"><i class="fa-solid fa-location-dot"></i> Customer Location — ग्राहक का स्थान</span>
                        <span class="detail-cell-val">${safeText(assignment.customer.location)}</span>
                    </div>
                </div>
            `;
        } else {
            customerContactHtml = `
                <div class="contact-locked-banner">
                    <i class="fa-solid fa-lock"></i>
                    <span>Customer contact unavailable — ग्राहक की संपर्क जानकारी उपलब्ध नहीं है</span>
                </div>
            `;
        }

        const isEligibleToDecline = (assignment.assignmentStatus === 'ACTIVE' && assignment.isCurrent === true);

        if (modalBody) {
            modalBody.innerHTML = `
                <!-- Assignment Overview -->
                <div class="detail-section-block">
                    <div class="detail-section-title">
                        <i class="fa-solid fa-file-contract"></i> Contract Overview — अनुबंध अवलोकन
                    </div>
                    <div class="detail-grid-3col">
                        <div class="detail-cell">
                            <span class="detail-cell-label">Contract Amount — अनुबंध राशि</span>
                            <span class="detail-cell-val" style="font-weight: 700; color: #0284c7;">${formatCurrency(assignment.bidAmount)}</span>
                        </div>
                        <div class="detail-cell">
                            <span class="detail-cell-label">Assignment Status — आवंटन स्थिति</span>
                            <span class="detail-cell-val" style="color: #16a34a; font-weight: 600;">Active — सक्रिय</span>
                        </div>
                        <div class="detail-cell">
                            <span class="detail-cell-label">Accepted At — स्वीकृति की तारीख</span>
                            <span class="detail-cell-val">${formatDateTime(assignment.acceptedAt)}</span>
                        </div>
                    </div>
                </div>

                <!-- Authorized Customer Contact -->
                <div class="detail-section-block">
                    <div class="detail-section-title">
                        <i class="fa-solid fa-address-card"></i> Customer Contact Information — ग्राहक संपर्क विवरण
                    </div>
                    ${customerContactHtml}
                </div>

                <!-- Project Audit Trail Section -->
                <div class="detail-section-block" id="projectAuditSection">
                    <div class="detail-section-title" style="display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fa-solid fa-timeline"></i> Project Audit History — प्रोजेक्ट रिकॉर्ड इतिहास</span>
                        <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 11.5px;" onclick="loadProjectAuditHistory('${assignment.projectId}')">
                            <i class="fa-solid fa-arrows-rotate"></i> Load History — इतिहास देखें
                        </button>
                    </div>
                    <div id="projectAuditContainer">
                        <p style="font-size: 12.5px; color: #64748b; margin: 4px 0;">Click "Load History" to view immutable audit events for this project. — इस प्रोजेक्ट के रिकॉर्ड देखने के लिए "इतिहास देखें" पर क्लिक करें।</p>
                    </div>
                </div>
            `;
        }

        // Render modal footer with Decline Assignment button if eligible
        if (modalFooter) {
            modalFooter.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div>
                        ${isEligibleToDecline ? `
                            <button type="button" class="btn-danger-outline" onclick="openDeclineModal('${assignment.id}')">
                                <i class="fa-solid fa-ban"></i> Decline Assignment — काम करने से मना करें
                            </button>
                        ` : ''}
                    </div>
                    <button type="button" class="btn-modal-close" onclick="closeAssignmentModal()">Close — बंद करें</button>
                </div>
            `;
        }

    } catch (err) {
        console.error('Fetch assignment error:', err);
        renderModalError('Connection Failed — कनेक्शन नहीं हो पाया', 'Unable to reach the server. Please check your network connection. — सर्वर से कनेक्ट नहीं हो पाया। कृपया अपना इंटरनेट कनेक्शन जांचें।');
    }
}

async function loadProjectAuditHistory(projectId) {
    const container = document.getElementById('projectAuditContainer');
    if (!container || !projectId) return;

    container.innerHTML = '<p style="font-size: 12.5px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Loading audit history... — रिकॉर्ड इतिहास लोड हो रहा है...</p>';

    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/contractor/my-bids/projects/${encodeURIComponent(projectId)}/history`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            container.innerHTML = '<p style="font-size: 12.5px; color: #ef4444;">Unable to load project history. — प्रोजेक्ट इतिहास लोड नहीं हो पाया।</p>';
            return;
        }

        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) {
            container.innerHTML = '<p style="font-size: 12.5px; color: #64748b;">No project history recorded yet. — अभी तक कोई प्रोजेक्ट इतिहास दर्ज नहीं है।</p>';
            return;
        }

        container.innerHTML = `
            <div class="audit-trail-timeline">
                ${events.map(ev => `
                    <div class="audit-trail-item">
                        <div class="audit-dot"></div>
                        <div class="audit-info">
                            <span class="audit-event-type">${safeText(ev.eventType)} (${safeText(ev.actorRole)})</span>
                            <span class="audit-event-desc">${safeText(ev.eventDescription)}</span>
                            <span class="audit-event-time">${formatDateTime(ev.createdAt)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (err) {
        console.error('Load audit history error:', err);
        container.innerHTML = '<p style="font-size: 12.5px; color: #ef4444;">Network error while loading history. — इतिहास लोड करने में नेटवर्क त्रुटि हुई।</p>';
    }
}

function closeAssignmentModal() {
    const overlay = document.getElementById('assignmentDetailsModalOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    document.body.style.overflow = '';
    currentViewingAssignment = null;
}

// =========================================================================
// PHASE 4.6B: CONTRACTOR DECLINE ASSIGNMENT WORKFLOW
// =========================================================================

/**
 * Opens confirmation modal before declining an active assignment.
 * Only active and current assignments belonging to contractor are eligible.
 */
function openDeclineModal(assignmentId) {
    if (!assignmentId || isSubmittingDecline) return;

    let assignment = cachedContracts.find(c => String(c.id) === String(assignmentId));
    if (!assignment && currentViewingAssignment && String(currentViewingAssignment.id) === String(assignmentId)) {
        assignment = currentViewingAssignment;
    }

    if (!assignment || assignment.assignmentStatus !== 'ACTIVE' || !assignment.isCurrent) {
        console.warn('Assignment not eligible for decline:', assignmentId);
        return;
    }

    pendingDeclineAssignmentId = assignmentId;

    const titleEl = document.getElementById('declineProjectTitle');
    const amountEl = document.getElementById('declineBidAmount');
    const assignIdEl = document.getElementById('declineAssignmentId');
    const errorEl = document.getElementById('declineModalError');
    const confirmBtn = document.getElementById('btnConfirmDecline');
    const cancelBtn = document.getElementById('btnCancelDecline');
    const closeXBtn = document.getElementById('btnCancelDeclineX');
    const confirmTextEl = document.getElementById('btnConfirmDeclineText');
    const overlay = document.getElementById('declineConfirmModalOverlay');

    // Customer-generated text protection: project title is displayed raw, untranslated
    if (titleEl) titleEl.textContent = safeText(assignment.projectTitle, 'Project / प्रोजेक्ट #' + (assignment.projectId || 'N/A'));
    if (amountEl) amountEl.textContent = formatCurrency(assignment.bidAmount);
    if (assignIdEl) assignIdEl.textContent = '#' + assignment.id;

    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    if (confirmBtn) confirmBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    if (closeXBtn) closeXBtn.disabled = false;
    if (confirmTextEl) {
        confirmTextEl.innerHTML = '<i class="fa-solid fa-ban"></i> Confirm Decline — मना करने की पुष्टि करें';
    }

    if (overlay) {
        overlay.style.display = 'flex';
    }
}

/**
 * Closes the Decline confirmation modal without calling API.
 */
function closeDeclineModal() {
    if (isSubmittingDecline) return;

    const overlay = document.getElementById('declineConfirmModalOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    const errorEl = document.getElementById('declineModalError');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
    pendingDeclineAssignmentId = null;
}

/**
 * Submits decline request to POST /api/contractor/my-bids/assignments/{assignmentId}/decline
 * Exactly one state-changing API call.
 * No request body sent. Identity resolved from JWT.
 */
async function submitDeclineAssignment() {
    if (!pendingDeclineAssignmentId || isSubmittingDecline) return;

    const assignmentIdToDecline = pendingDeclineAssignmentId;
    isSubmittingDecline = true;

    const confirmBtn = document.getElementById('btnConfirmDecline');
    const confirmTextEl = document.getElementById('btnConfirmDeclineText');
    const cancelBtn = document.getElementById('btnCancelDecline');
    const closeXBtn = document.getElementById('btnCancelDeclineX');
    const errorEl = document.getElementById('declineModalError');

    if (confirmBtn) confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (closeXBtn) closeXBtn.disabled = true;

    if (confirmTextEl) {
        confirmTextEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Declining Assignment... — काम करने से मना किया जा रहा है...';
    }
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/contractor/my-bids/assignments/${encodeURIComponent(assignmentIdToDecline)}/decline`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.ok) {
            isSubmittingDecline = false;
            closeDeclineModal();

            // Close assignment modal if open so stale active state is not displayed
            closeAssignmentModal();

            // Show bilingual success banner
            showDeclineSuccessBanner();

            // Re-fetch latest backend state (Source of truth)
            await loadContracts();
            await loadActiveBids();

            return;
        }

        // Handle specific error status codes (Section 19)
        let errorMsg = '';
        if (response.status === 400) {
            errorMsg = 'Unable to decline assignment — कार्य आवंटन को रद्द नहीं किया जा सका\n\nThe assignment cannot be declined in its current state. — इस कार्य आवंटन को इसकी वर्तमान स्थिति में समाप्त नहीं किया जा सकता।';
        } else if (response.status === 401) {
            errorMsg = 'Session Expired — सत्र समाप्त हो गया\n\nYour session has expired or is invalid. Please log in again. — आपका सत्र समाप्त हो गया है या मान्य नहीं है। कृपया फिर से लॉगिन करें।';
        } else if (response.status === 403) {
            errorMsg = 'Access Denied — अनुमति नहीं है\n\nYou are not authorized to decline this assignment. — आपको इस कार्य आवंटन को समाप्त करने की अनुमति नहीं है।';
        } else if (response.status === 404) {
            errorMsg = 'Assignment Not Found — कार्य आवंटन नहीं मिला\n\nThe assignment could not be found. — कार्य आवंटन नहीं मिला।';
        } else if (response.status === 409) {
            errorMsg = 'Assignment Changed — कार्य आवंटन बदल गया है\n\nThis assignment has already changed. Refreshing the latest data. — यह कार्य आवंटन पहले ही बदल चुका है। नवीनतम जानकारी लोड की जा रही है।';
            // Re-fetch latest data on conflict; do NOT retry POST
            loadContracts();
            loadActiveBids();
        } else if (response.status >= 500) {
            errorMsg = 'Server Error — सर्वर में समस्या\n\nServer error occurred. Please try again later. — सर्वर में समस्या हुई। कृपया बाद में फिर प्रयास करें।';
        } else {
            errorMsg = 'Unable to decline assignment — कार्य आवंटन को रद्द नहीं किया जा सका\n\nPlease try again later. — कृपया बाद में फिर प्रयास करें।';
        }

        if (errorEl) {
            errorEl.textContent = errorMsg;
            errorEl.style.display = 'block';
        }

    } catch (err) {
        console.error('Decline assignment error:', err);
        if (errorEl) {
            errorEl.textContent = 'Connection Failed — कनेक्शन नहीं हो पाया\n\nUnable to reach the server. Please check your network connection. — सर्वर से कनेक्ट नहीं हो पाया। कृपया अपना इंटरनेट कनेक्शन जांचें।';
            errorEl.style.display = 'block';
        }
    } finally {
        isSubmittingDecline = false;
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (closeXBtn) closeXBtn.disabled = false;
        if (confirmTextEl) {
            confirmTextEl.innerHTML = '<i class="fa-solid fa-ban"></i> Confirm Decline — मना करने की पुष्टि करें';
        }
    }
}

function showDeclineSuccessBanner() {
    const banner = document.getElementById('declineSuccessBanner');
    if (banner) {
        banner.style.display = 'flex';
        setTimeout(() => {
            hideDeclineSuccessBanner();
        }, 8000);
    }
}

function hideDeclineSuccessBanner() {
    const banner = document.getElementById('declineSuccessBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

function renderModalError(title, msg) {
    const modalBody = document.getElementById('assignmentModalBody');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="state-box state-error">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h4>${title}</h4>
                <p>${msg}</p>
            </div>
        `;
    }
}

// Helpers for state rendering
function renderLoading(container, text) {
    container.innerHTML = `
        <div class="state-box">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <h4>${text}</h4>
        </div>
    `;
}

function renderEmpty(container, title, text, icon = 'fa-folder-open') {
    container.innerHTML = `
        <div class="state-box">
            <i class="fa-solid ${icon}"></i>
            <h4>${title}</h4>
            <p>${text}</p>
        </div>
    `;
}

function renderError(container, errorTypeOrStatus) {
    let title = 'Server Error — सर्वर में समस्या';
    let friendly = 'Server error occurred. Please try again later. — सर्वर में समस्या हुई। कृपया बाद में फिर प्रयास करें।';

    if (errorTypeOrStatus === 401) {
        title = 'Session Expired — सत्र समाप्त हो गया';
        friendly = 'Your session has expired or is invalid. Please log in again. — आपका सत्र समाप्त हो गया है या मान्य नहीं है। कृपया फिर से लॉगिन करें।';
    } else if (errorTypeOrStatus === 403) {
        title = 'Access Denied — अनुमति नहीं है';
        friendly = 'You do not have permission to view this information. — आपको यह जानकारी देखने की अनुमति नहीं है।';
    } else if (errorTypeOrStatus === 404) {
        title = 'Information Not Found — जानकारी नहीं मिली';
        friendly = 'The requested My Bid information could not be found. — मांगी गई My Bid जानकारी नहीं मिली।';
    } else if (errorTypeOrStatus === 409) {
        title = 'Information Changed — जानकारी बदल गई है';
        friendly = 'This information has changed. Refreshing the latest data. — यह जानकारी बदल गई है। नवीनतम जानकारी लोड की जा रही है।';
    } else if (errorTypeOrStatus === 'network') {
        title = 'Connection Failed — कनेक्शन नहीं हो पाया';
        friendly = 'Unable to reach the server. Please check your network connection. — सर्वर से कनेक्ट नहीं हो पाया। कृपया अपना इंटरनेट कनेक्शन जांचें।';
    }

    container.innerHTML = `
        <div class="state-box state-error">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h4>${title}</h4>
            <p>${friendly}</p>
        </div>
    `;
}

// Real-time search filter
function setupSearchFilter() {
    const searchInput = document.getElementById('bidsSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = (e.target.value || '').trim().toLowerCase();
        const activeContainer = currentActiveTab === 'active' 
            ? document.getElementById('activeBidsContainer')
            : currentActiveTab === 'contracts'
                ? document.getElementById('contractsContainer')
                : document.getElementById('historyContainer');

        if (!activeContainer) return;
        const cards = activeContainer.querySelectorAll('.contractor-card');
        cards.forEach(card => {
            const searchData = (card.getAttribute('data-search') || '').toLowerCase();
            const textContent = (card.textContent || '').toLowerCase();
            const match = !query || searchData.includes(query) || textContent.includes(query);
            card.style.display = match ? 'block' : 'none';
        });
    });
}

// Global Logout
function logoutUser() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("marketplaceToken");
    localStorage.removeItem("marketplaceUser");
    localStorage.removeItem("token");
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("token");
    window.location.href = "index.html";
}

// DOM ready bootstrapping
document.addEventListener('DOMContentLoaded', () => {
    initUserSession();
    setupSearchFilter();

    // Default: Load active bids tab
    loadActiveBids();

    // Assignment Details Modal background click
    const overlay = document.getElementById('assignmentDetailsModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeAssignmentModal();
            }
        });
    }

    // Decline Confirmation Modal background click
    const declineOverlay = document.getElementById('declineConfirmModalOverlay');
    if (declineOverlay) {
        declineOverlay.addEventListener('click', (e) => {
            if (e.target === declineOverlay && !isSubmittingDecline) {
                closeDeclineModal();
            }
        });
    }

    // Modal Escape key listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const declineModal = document.getElementById('declineConfirmModalOverlay');
            if (declineModal && declineModal.style.display !== 'none' && !isSubmittingDecline) {
                closeDeclineModal();
                return;
            }
            closeAssignmentModal();
        }
    });
});

// Window bindings
if (typeof window !== 'undefined') {
    window.switchTab = switchTab;
    window.refreshCurrentTab = refreshCurrentTab;
    window.toggleBidDrawer = toggleBidDrawer;
    window.openAssignmentDetailsModal = openAssignmentDetailsModal;
    window.loadProjectAuditHistory = loadProjectAuditHistory;
    window.closeAssignmentModal = closeAssignmentModal;
    window.openDeclineModal = openDeclineModal;
    window.closeDeclineModal = closeDeclineModal;
    window.submitDeclineAssignment = submitDeclineAssignment;
    window.hideDeclineSuccessBanner = hideDeclineSuccessBanner;
    window.logoutUser = logoutUser;
}
