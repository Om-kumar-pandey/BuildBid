/**
 * =========================================================
 * BUILDBID — DEDICATED CONTRACTOR MY CONTRACTS MODULE
 * Displays only officially awarded projects & allocated contracts
 * Bilingual English + Simple Hindi Terminology
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

// Global cached state
let cachedContracts = [];
let pendingDeclineAssignmentId = null;
let isSubmittingDecline = false;

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

// User session initialization
function initUserSession() {
    const userNameEl = document.getElementById('top-nav-name');
    const userInitialsEl = document.getElementById('top-nav-avatar-text');
    const userBadgeEl = document.getElementById('top-nav-badge');

    try {
        let user = JSON.parse(
            localStorage.getItem('currentUser') || 
            localStorage.getItem('loggedInUser') || 
            sessionStorage.getItem('currentUser') || '{}'
        );
        const displayName = (user.name || user.companyName || user.username || '').trim();
        if (displayName) {
            if (userNameEl) userNameEl.textContent = displayName;
            if (userInitialsEl) {
                const words = displayName.split(' ').filter(Boolean);
                const initials = words.length > 1 ? (words[0][0] + words[words.length - 1][0]) : words[0][0];
                userInitialsEl.textContent = initials.toUpperCase();
            }
        }
        if (userBadgeEl) userBadgeEl.textContent = 'Contractor';
    } catch (err) {
        console.warn('Session init warning:', err);
    }

    syncContractorBadges();
}

function syncContractorBadges() {
    const cachedProjects = sessionStorage.getItem('contractor_badge_projects');
    const cachedBids = sessionStorage.getItem('contractor_badge_bids');
    const cachedContractsCount = sessionStorage.getItem('contractor_badge_contracts');
    const cachedNotifs = sessionStorage.getItem('contractor_badge_notifications');

    const elProjects = document.getElementById('nav-badge-projects');
    const elBids = document.getElementById('nav-badge-bids');
    const elContracts = document.getElementById('nav-badge-contracts');
    const elNotifs = document.getElementById('nav-badge-notifications');

    if (elProjects && cachedProjects !== null) elProjects.textContent = cachedProjects;
    if (elBids && cachedBids !== null) elBids.textContent = cachedBids;
    if (elContracts && cachedContractsCount !== null) elContracts.textContent = cachedContractsCount;
    if (elNotifs && cachedNotifs !== null) elNotifs.textContent = cachedNotifs;

    const token = getCleanToken();
    if (!token) return;

    const authHeaders = {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json'
    };

    fetch(`${API_BASE_URL}/api/contractor/projects`, { headers: authHeaders })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (Array.isArray(data)) {
                if (elProjects) elProjects.textContent = data.length;
                sessionStorage.setItem('contractor_badge_projects', data.length);
            }
        })
        .catch(() => {});

    fetch(`${API_BASE_URL}/api/contractor/my-bids?history=true`, { headers: authHeaders })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (Array.isArray(data)) {
                if (elBids) elBids.textContent = data.length;
                sessionStorage.setItem('contractor_badge_bids', data.length);
            }
        })
        .catch(() => {});

    fetch(`${API_BASE_URL}/api/contractor/my-bids/contracts`, { headers: authHeaders })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (Array.isArray(data)) {
                const activeContracts = data.filter(c => c && c.assignmentStatus === 'ACTIVE' && c.isCurrent);
                if (elContracts) elContracts.textContent = activeContracts.length;
                sessionStorage.setItem('contractor_badge_contracts', activeContracts.length);
            }
        })
        .catch(() => {});

    fetch(`${API_BASE_URL}/api/notifications`, { headers: authHeaders })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (data && typeof data.unreadCount === 'number') {
                if (elNotifs) elNotifs.textContent = data.unreadCount;
                sessionStorage.setItem('contractor_badge_notifications', data.unreadCount);
                const dot = document.getElementById('notif-indicator');
                if (dot) dot.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
            }
        })
        .catch(() => {});
}

// =========================================================================
// AUTHORITATIVE CONTRACTS LOADING & DATA INTEGRATION
// =========================================================================

async function loadContracts() {
    const container = document.getElementById('contractsContainer');
    if (!container) return;

    // Distinct Loading State
    container.innerHTML = `
        <div class="state-box" style="padding: 40px; text-align: center; color: #64748b;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 28px; color: #0284c7; margin-bottom: 12px;"></i>
            <h4 style="font-size: 15px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0;">Loading awarded contracts... — आवंटित अनुबंध लोड हो रहे हैं...</h4>
            <p style="font-size: 13px; margin: 0;">Retrieving officially awarded projects from BuildBid backend.</p>
        </div>
    `;

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
        const rawList = Array.isArray(data) ? data : [];

        // STRICT CORE RULE: Only projects where backend confirms project was actually awarded/assigned
        // (assignmentStatus === 'ACTIVE' && isCurrent === true).
        // Pending bids, rejected bids, under review bids NEVER appear as contracts.
        const activeContracts = rawList.filter(c => c && c.assignmentStatus === 'ACTIVE' && c.isCurrent === true);

        // Prevent duplicate contract cards for the same awarded project
        const seenIds = new Set();
        cachedContracts = [];
        for (const item of activeContracts) {
            const key = item.id ? String(item.id) : (item.projectId ? `prj_${item.projectId}` : null);
            if (key && !seenIds.has(key)) {
                seenIds.add(key);
                cachedContracts.push(item);
            }
        }

        // Update KPI statistics on top strip
        updateContractMetrics(cachedContracts);

        // Update sidebar badge
        const elContracts = document.getElementById('nav-badge-contracts');
        if (elContracts) elContracts.textContent = cachedContracts.length;
        sessionStorage.setItem('contractor_badge_contracts', cachedContracts.length);

        if (cachedContracts.length === 0) {
            renderEmptyState(container);
        } else {
            renderContractsList(container, cachedContracts);
        }

    } catch (err) {
        console.error('Failed to load contracts:', err);
        renderError(container, 'network');
    }
}

function refreshContracts() {
    loadContracts();
}

function updateContractMetrics(contracts) {
    const elCount = document.getElementById('statAwardedContracts');
    const elValue = document.getElementById('statTotalContractValue');
    const elActive = document.getElementById('statActiveAllocations');

    if (elCount) elCount.textContent = contracts.length;
    if (elActive) elActive.textContent = contracts.length;

    if (elValue) {
        const totalVal = contracts.reduce((sum, c) => {
            const val = (c && typeof c.bidAmount === 'number') ? c.bidAmount : 0;
            return sum + val;
        }, 0);
        elValue.textContent = '₹ ' + totalVal.toLocaleString('en-IN');
    }
}

// =========================================================================
// RENDERING AWARDED CONTRACT CARDS & EMPTY STATE
// =========================================================================

function renderEmptyState(container) {
    container.innerHTML = `
        <div class="contract-empty-state-box">
            <div class="contract-empty-icon">
                <i class="fa-solid fa-file-signature"></i>
            </div>
            <h3>No Contracts Found — कोई अनुबंध नहीं मिला</h3>
            <p>
                You don't have any awarded projects yet. When a customer accepts your bid and the project is officially allocated to you, the complete project and customer details will appear here.
            </p>
            <p style="font-size: 12.5px; color: #94a3b8; margin-top: -6px;">
                जब कोई ग्राहक आपकी बोली स्वीकार कर लेगा और प्रोजेक्ट आपको आधिकारिक रूप से सौंप दिया जाएगा, तो प्रोजेक्ट और ग्राहक का पूरा विवरण यहाँ दिखाई देगा।
            </p>
            <a href="contractor-projects.html" class="btn-view-projects" id="btnEmptyViewProjects">
                <i class="fa-solid fa-briefcase"></i> View Projects — प्रोजेक्ट्स देखें
            </a>
        </div>
    `;
}

function renderContractsList(container, contracts) {
    container.innerHTML = contracts.map(c => {
        const projectTitle = safeText(c.projectTitle, 'Awarded Project #' + (c.projectCustomId || c.projectId || c.id));
        const contractRefId = 'CTR-' + (c.id || 'N/A');
        const projectDisplayId = c.projectCustomId || (c.projectId ? ('PRJ-' + c.projectId) : 'N/A');
        const awardedDate = formatDate(c.acceptedAt);

        // Site address compilation
        let siteAddress = c.siteAddress || '';
        const locationParts = [c.city, c.state, c.pincode].filter(Boolean);
        if (locationParts.length > 0) {
            const locStr = locationParts.join(', ');
            siteAddress = siteAddress ? `${siteAddress}, ${locStr}` : locStr;
        }
        if (!siteAddress) siteAddress = safeText(c.location, 'Project Site Location Provided Upon Inspection');

        // Customer details
        const custName = safeText(c.customer?.name, 'Authorized Client');
        const custPhoneRaw = (c.customer?.phone || '').trim();
        const isPlaceholder = ['n/a', 'na', 'none', 'null', 'undefined', 'not specified'].includes(custPhoneRaw.toLowerCase());
        const cleanDigits = custPhoneRaw.replace(/[^0-9]/g, '');
        const isValidPhone = !isPlaceholder && cleanDigits.length >= 7 && cleanDigits.length <= 15;
        const cleanPhone = isValidPhone ? encodeURIComponent(custPhoneRaw.replace(/[^0-9+]/g, '')) : '';
        const custPhone = isValidPhone ? custPhoneRaw : (isPlaceholder ? '' : custPhoneRaw);
        const custEmail = (c.customer?.email || '').trim();
        const custInitials = custName.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'C';

        // Area formatting
        const areaVal = c.builtUpArea || c.plotArea || c.totalArea;
        const areaLabel = areaVal ? `${areaVal} sq.ft.` : 'Not specified — निर्दिष्ट नहीं';

        // Search attribute
        const searchTerms = [
            projectTitle,
            contractRefId,
            projectDisplayId,
            custName,
            custPhone,
            custEmail,
            siteAddress,
            c.projectType
        ].filter(Boolean).join(' ').toLowerCase();

        return `
            <div class="contract-card-awarded" id="contractCard-${c.id}" data-search="${searchTerms}">
                <!-- Card Header -->
                <div class="contract-header-row">
                    <div class="contract-project-heading">
                        <div class="contract-avatar-icon">
                            <i class="fa-solid fa-file-contract"></i>
                        </div>
                        <div class="contract-title-group">
                            <h3>${projectTitle}</h3>
                            <div class="contract-meta-pills">
                                <span>Contract: <strong>${contractRefId}</strong></span>
                                <span>•</span>
                                <span>Project ID: <strong>${projectDisplayId}</strong></span>
                                <span>•</span>
                                <span>Awarded on: <strong>${awardedDate}</strong></span>
                            </div>
                        </div>
                    </div>
                    <span class="contract-status-badge">
                        <i class="fa-solid fa-circle-check"></i> Awarded & Active — आधिकारिक आवंटित
                    </span>
                </div>

                <!-- Main Body Grid: Specifications & Scope vs Customer Info & Actions -->
                <div class="contract-body-grid">
                    <!-- Left: Technical Project Specifications & Scope -->
                    <div class="contract-main-specs">
                        <!-- Financial Ribbon -->
                        <div class="contract-metrics-row">
                            <div class="contract-metric-item">
                                <span class="contract-metric-label">Awarded Contract Value — अनुबंध राशि</span>
                                <strong class="contract-metric-value highlight-value">${formatCurrency(c.bidAmount)}</strong>
                            </div>
                            <div class="contract-metric-item">
                                <span class="contract-metric-label">Target Completion — प्रस्तावित समय-सीमा</span>
                                <strong class="contract-metric-value">${safeText(c.estimatedDuration || c.proposedTimeline || c.timeline)}</strong>
                            </div>
                            <div class="contract-metric-item">
                                <span class="contract-metric-label">Target Start Date — प्रारंभ तिथि</span>
                                <strong class="contract-metric-value">${safeText(c.targetStartDate)}</strong>
                            </div>
                            <div class="contract-metric-item">
                                <span class="contract-metric-label">Workers Count — कामगारों की संख्या</span>
                                <strong class="contract-metric-value">${c.workersCount ? c.workersCount + ' Workers / कामगार' : 'As per requirement'}</strong>
                            </div>
                        </div>

                        <!-- Technical Specs Grid -->
                        <div class="contract-specs-grid">
                            <div class="spec-cell">
                                <span class="spec-cell-label"><i class="fa-solid fa-layer-group"></i> Project Type — प्रोजेक्ट प्रकार</span>
                                <span class="spec-cell-val">${safeText(c.projectType)}</span>
                            </div>
                            <div class="spec-cell">
                                <span class="spec-cell-label"><i class="fa-solid fa-ruler-combined"></i> Plot / Built-up Area — क्षेत्रफल</span>
                                <span class="spec-cell-val">${areaLabel}</span>
                            </div>
                            <div class="spec-cell">
                                <span class="spec-cell-label"><i class="fa-solid fa-building"></i> Number of Floors — मंजिलों की संख्या</span>
                                <span class="spec-cell-val">${safeText(c.floors)}</span>
                            </div>
                            <div class="spec-cell">
                                <span class="spec-cell-label"><i class="fa-solid fa-award"></i> Quality Tier — गुणवत्ता स्तर</span>
                                <span class="spec-cell-val">${safeText(c.qualityTier)}</span>
                            </div>
                        </div>

                        <!-- Site Location Details -->
                        <div class="spec-cell full-width">
                            <span class="spec-cell-label"><i class="fa-solid fa-location-dot"></i> Construction Location & Address — निर्माण स्थल पता</span>
                            <span class="spec-cell-val" style="color: #0f172a;">${siteAddress}</span>
                        </div>

                        <!-- Agreed Scope of Work Preview -->
                        <div class="contract-desc-box">
                            <div class="contract-desc-label">
                                <i class="fa-solid fa-list-check"></i> Agreed Scope of Work — सहमत कार्य का दायरा
                            </div>
                            <p class="contract-desc-text">${safeText(c.scopeOfWork || c.description, 'Complete civil construction and structural work as per agreed contract specifications.')}</p>
                        </div>
                    </div>

                    <!-- Right: Customer Contact Information & Prominent Actions -->
                    <div class="customer-sidebar-card">
                        <div class="customer-card-header">
                            <div class="customer-avatar">${custInitials}</div>
                            <div class="customer-identity">
                                <h4>${custName}</h4>
                                <span><i class="fa-solid fa-shield-check"></i> Project Owner / ग्राहक</span>
                            </div>
                        </div>

                        <div class="customer-contact-list">
                            <div class="contact-row-item">
                                <i class="fa-solid fa-phone"></i>
                                <div class="contact-row-content">
                                    <span class="contact-row-label">Contact Phone — संपर्क फोन</span>
                                    <span class="contact-row-value">${isValidPhone ? custPhone : '<span style="color:#94a3b8; font-weight:normal;">' + (custPhone ? 'Invalid format (' + custPhone + ')' : 'Not available') + '</span>'}</span>
                                </div>
                            </div>
                            <div class="contact-row-item">
                                <i class="fa-solid fa-envelope"></i>
                                <div class="contact-row-content">
                                    <span class="contact-row-label">Email Address — ईमेल</span>
                                    <span class="contact-row-value">${custEmail ? custEmail : '<span style="color:#94a3b8; font-weight:normal;">Not available</span>'}</span>
                                </div>
                            </div>
                            <div class="contact-row-item">
                                <i class="fa-solid fa-location-dot"></i>
                                <div class="contact-row-content">
                                    <span class="contact-row-label">Client Site Address — स्थल पता</span>
                                    <span class="contact-row-value" style="font-size: 11.5px;">${siteAddress}</span>
                                </div>
                            </div>
                            <div class="contact-row-item">
                                <i class="fa-solid fa-headset"></i>
                                <div class="contact-row-content">
                                    <span class="contact-row-label">Preferred Contact — संपर्क का माध्यम</span>
                                    <span class="contact-row-value">Direct Phone / Call</span>
                                </div>
                            </div>
                        </div>

                        <!-- Prominent Contractor Action Buttons -->
                        <div class="customer-actions-group">
                            ${isValidPhone ? `
                                <a href="tel:${cleanPhone}" class="btn-action-call" id="btnCallCustomer-${c.id}" title="Call ${custName} directly: ${custPhone}">
                                    <i class="fa-solid fa-phone"></i> Call Customer — कॉल करें
                                </a>
                            ` : `
                                <button type="button" class="btn-action-call btn-disabled" title="${custPhone ? 'Invalid phone number format provided in client profile' : 'Phone number not provided in client profile'}" disabled>
                                    <i class="fa-solid fa-phone-slash"></i> Phone Unavailable — फोन उपलब्ध नहीं
                                </button>
                            `}

                            <button type="button" class="btn-action-message" id="btnMessageCustomer-${c.id}" onclick="openMessageCustomerModal('${c.id}')">
                                <i class="fa-regular fa-comment-dots"></i> Message Customer — संदेश भेजें
                            </button>

                            <a href="contractor-project-details.html?id=${c.projectId}" class="btn-action-view-details" id="btnViewProject-${c.id}" title="View complete awarded project details">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> View Project Details — पूरा विवरण देखें
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Footer Bar with Breakdown Toggle & Decline Option -->
                <div class="contract-footer-bar">
                    <button type="button" class="btn-secondary" id="toggleDrawerBtn-${c.id}" onclick="toggleContractDrawer('${c.id}')">
                        <i class="fa-solid fa-chevron-down"></i> Contract Terms & Financial Breakdown — शर्तें और लागत विवरण
                    </button>

                    <button type="button" class="btn-danger-outline" onclick="openDeclineModal('${c.id}')">
                        <i class="fa-solid fa-ban"></i> Decline Assignment — कार्य आवंटन अस्वीकार करें
                    </button>
                </div>

                <!-- Collapsible Detailed Breakdown Drawer -->
                <div class="card-details-drawer" id="contractDrawer-${c.id}" style="display: none; padding: 20px 22px; background: #fafbfc; border-top: 1px solid #e2e8f0; flex-direction: column; gap: 16px;">
                    <!-- Financial Cost Breakdown -->
                    <div class="detail-section-block">
                        <div class="detail-section-title">
                            <i class="fa-solid fa-coins"></i> Financial Cost Breakdown — वित्तीय लागत विवरण
                        </div>
                        <div class="detail-grid-3col">
                            <div class="detail-cell">
                                <span class="detail-cell-label">Total Contract Value — कुल अनुबंध मूल्य</span>
                                <span class="detail-cell-val" style="font-weight: 700; color: #0284c7;">${formatCurrency(c.bidAmount)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Material Cost — सामग्री लागत</span>
                                <span class="detail-cell-val">${formatCurrency(c.materialCost)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Labour Cost — श्रम लागत</span>
                                <span class="detail-cell-val">${formatCurrency(c.labourCost)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Equipment Cost — उपकरण लागत</span>
                                <span class="detail-cell-val">${formatCurrency(c.equipmentCost)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Transport Cost — परिवहन लागत</span>
                                <span class="detail-cell-val">${formatCurrency(c.transportCost)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Other Charges — अन्य शुल्क</span>
                                <span class="detail-cell-val">${formatCurrency(c.otherCharges)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Work Inclusions and Exclusions -->
                    <div class="detail-section-block">
                        <div class="detail-section-title">
                            <i class="fa-solid fa-clipboard-check"></i> Execution Terms & Inclusions — काम का दायरा और शर्तें
                        </div>
                        <div class="detail-grid-2col">
                            <div class="detail-cell">
                                <span class="detail-cell-label">Included Work — शामिल काम</span>
                                <span class="detail-cell-val">${safeText(c.includedWork, 'As per agreed civil construction standards')}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Excluded Work — शामिल नहीं किया गया काम</span>
                                <span class="detail-cell-val">${safeText(c.excludedWork, 'None specified')}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Payment Terms — भुगतान की शर्तें</span>
                                <span class="detail-cell-val">${safeText(c.paymentTerms, 'Milestone-based progress billing')}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Warranty / Guarantee — वारंटी</span>
                                <span class="detail-cell-val">${safeText(c.warranty, 'Standard 1-year structural warranty')}</span>
                            </div>
                            ${c.remarks ? `
                            <div class="detail-cell full-width">
                                <span class="detail-cell-label">Remarks / Special Terms — अतिरिक्त विवरण</span>
                                <span class="detail-cell-val">${safeText(c.remarks)}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Contract Timestamps & History -->
                    <div class="detail-section-block">
                        <div class="detail-section-title">
                            <i class="fa-solid fa-clock-rotate-left"></i> Contract Audit & History — अनुबंध का रिकॉर्ड
                        </div>
                        <div class="detail-grid-3col">
                            <div class="detail-cell">
                                <span class="detail-cell-label">Bid Submitted At — बोली जमा की गई</span>
                                <span class="detail-cell-val">${c.submittedAt ? formatDateTime(c.submittedAt) : 'N/A'}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Contract Officially Awarded — अनुबंध स्वीकृत हुआ</span>
                                <span class="detail-cell-val" style="color: #16a34a; font-weight: 700;">${formatDateTime(c.acceptedAt)}</span>
                            </div>
                            <div class="detail-cell">
                                <span class="detail-cell-label">Current Contract State — वर्तमान स्थिति</span>
                                <span class="detail-cell-val" style="color: #16a34a; font-weight: 700;">Active Allocation — सक्रिय आवंटन</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleContractDrawer(contractId) {
    const drawer = document.getElementById(`contractDrawer-${contractId}`);
    const toggleBtn = document.getElementById(`toggleDrawerBtn-${contractId}`);
    if (!drawer || !toggleBtn) return;

    const isHidden = drawer.style.display === 'none';
    if (isHidden) {
        drawer.style.display = 'flex';
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Hide Terms & Financial Breakdown — विवरण छिपाएं';
    } else {
        drawer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Contract Terms & Financial Breakdown — शर्तें और लागत विवरण';
    }
}

// =========================================================================
// CUSTOMER MESSAGING MODAL
// =========================================================================

function openMessageCustomerModal(contractId) {
    const contract = cachedContracts.find(c => String(c.id) === String(contractId));
    const overlay = document.getElementById('messageCustomerModalOverlay');
    const modalBody = document.getElementById('messageCustomerModalBody');
    const titleEl = document.getElementById('messageCustomerTitle');

    if (!overlay || !modalBody) return;

    const custName = safeText(contract?.customer?.name, 'Customer');
    const custPhoneRaw = (contract?.customer?.phone || '').trim();
    const isPlaceholder = ['n/a', 'na', 'none', 'null', 'undefined', 'not specified'].includes(custPhoneRaw.toLowerCase());
    const cleanDigits = custPhoneRaw.replace(/[^0-9]/g, '');
    const isValidPhone = !isPlaceholder && cleanDigits.length >= 7 && cleanDigits.length <= 15;
    const cleanPhone = isValidPhone ? encodeURIComponent(custPhoneRaw.replace(/[^0-9+]/g, '')) : '';
    const custPhone = isValidPhone ? custPhoneRaw : (isPlaceholder ? '' : custPhoneRaw);
    const custEmail = (contract?.customer?.email || '').trim();

    if (titleEl) {
        titleEl.textContent = `Connect with ${custName}`;
    }

    modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: grid; place-items: center; font-weight: 700;">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 15px; color: #0f172a;">${custName}</h4>
                        <span style="font-size: 12px; color: #64748b;">Project Owner • Contract #${contract?.id || ''}</span>
                    </div>
                </div>
            </div>

            <!-- Direct Contact Options -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <h5 style="margin: 0; font-size: 13px; color: #475569; font-weight: 600;">Authorized Contact Channels:</h5>

                ${isValidPhone ? `
                    <a href="tel:${cleanPhone}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; text-decoration: none; color: #166534; font-weight: 600; font-size: 13.5px;">
                        <span><i class="fa-solid fa-phone" style="margin-right: 8px;"></i> Call on ${custPhone}</span>
                        <span style="font-size: 12px; background: #16a34a; color: #ffffff; padding: 3px 8px; border-radius: 6px;">Dial</span>
                    </a>
                ` : `
                    <div style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #64748b; font-size: 12.5px;">
                        <i class="fa-solid fa-phone-slash" style="margin-right: 6px;"></i> ${custPhone ? 'Invalid phone number format provided in customer profile' : 'Phone number is not provided in customer profile'}
                    </div>
                `}

                ${custEmail ? `
                    <a href="mailto:${custEmail}?subject=${encodeURIComponent('BuildBid Contract #' + (contract?.id || '') + ' - ' + (contract?.projectTitle || ''))}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; text-decoration: none; color: #0369a1; font-weight: 600; font-size: 13.5px;">
                        <span><i class="fa-solid fa-envelope" style="margin-right: 8px;"></i> Email: ${custEmail}</span>
                        <span style="font-size: 12px; background: #0284c7; color: #ffffff; padding: 3px 8px; border-radius: 6px;">Write</span>
                    </a>
                ` : ''}
            </div>

            <!-- Status Notice regarding In-App Direct Chat -->
            <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 14px; display: flex; gap: 10px; align-items: flex-start;">
                <i class="fa-solid fa-circle-info" style="color: #d97706; margin-top: 2px;"></i>
                <div style="font-size: 12px; color: #92400e; line-height: 1.4;">
                    <strong>In-App Chat Integration:</strong>
                    <br />
                    Direct in-app instant chat is currently under deployment. For active communication on this awarded contract, please connect with the client directly via phone or email above.
                </div>
            </div>
        </div>
    `;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeMessageCustomerModal() {
    const overlay = document.getElementById('messageCustomerModalOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

// =========================================================================
// CONTRACT DETAILS MODAL & PROJECT AUDIT TRAIL
// =========================================================================

function closeContractDetailsModal() {
    const overlay = document.getElementById('contractDetailsModalOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

// =========================================================================
// STATE-CHANGING CONTRACT DECLINE WORKFLOW
// =========================================================================

function openDeclineModal(assignmentId) {
    if (!assignmentId) return;
    pendingDeclineAssignmentId = assignmentId;

    const overlay = document.getElementById('declineConfirmModalOverlay');
    const projTitleEl = document.getElementById('declineProjectTitle');
    const bidAmountEl = document.getElementById('declineBidAmount');
    const assignIdEl = document.getElementById('declineAssignmentId');
    const errorBox = document.getElementById('declineModalError');

    const contract = cachedContracts.find(c => String(c.id) === String(assignmentId));

    if (projTitleEl) {
        projTitleEl.textContent = contract ? safeText(contract.projectTitle, 'Project #' + contract.projectId) : `Assignment #${assignmentId}`;
    }
    if (bidAmountEl) {
        bidAmountEl.textContent = contract ? formatCurrency(contract.bidAmount) : '—';
    }
    if (assignIdEl) {
        assignIdEl.textContent = '#' + assignmentId;
    }
    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }

    if (overlay) {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeDeclineModal() {
    if (isSubmittingDecline) return;
    const overlay = document.getElementById('declineConfirmModalOverlay');
    if (overlay) overlay.style.display = 'none';
    pendingDeclineAssignmentId = null;
    document.body.style.overflow = '';
}

async function submitDeclineAssignment() {
    if (!pendingDeclineAssignmentId || isSubmittingDecline) return;

    const confirmBtn = document.getElementById('btnConfirmDecline');
    const cancelBtn = document.getElementById('btnCancelDecline');
    const confirmBtnText = document.getElementById('btnConfirmDeclineText');
    const errorBox = document.getElementById('declineModalError');

    isSubmittingDecline = true;
    if (confirmBtn) confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (confirmBtnText) {
        confirmBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Declining... — प्रक्रिया जारी है...';
    }
    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }

    try {
        const token = getCleanToken();
        const response = await fetch(`${API_BASE_URL}/api/contractor/my-bids/assignments/${encodeURIComponent(pendingDeclineAssignmentId)}/decline`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            closeDeclineModal();
            showDeclineSuccessBanner();
            loadContracts();
            return;
        }

        let errMessage = 'Unable to decline assignment. Please try again. — कार्य आवंटन अस्वीकार नहीं हो पाया।';
        try {
            const errData = await response.json();
            if (errData && errData.error) errMessage = errData.error;
        } catch (_) {}

        if (errorBox) {
            errorBox.textContent = errMessage;
            errorBox.style.display = 'block';
        }
    } catch (err) {
        console.error('Decline error:', err);
        if (errorBox) {
            errorBox.textContent = 'Connection error. Please check your network. — कनेक्शन त्रुटि। कृपया इंटरनेट जांचें।';
            errorBox.style.display = 'block';
        }
    } finally {
        isSubmittingDecline = false;
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (confirmBtnText) {
            confirmBtnText.innerHTML = '<i class="fa-solid fa-ban"></i> Confirm Decline — मना करने की पुष्टि करें';
        }
    }
}

function showDeclineSuccessBanner() {
    const banner = document.getElementById('declineSuccessBanner');
    if (!banner) return;
    banner.style.display = 'flex';
    setTimeout(() => {
        hideDeclineSuccessBanner();
    }, 6000);
}

function hideDeclineSuccessBanner() {
    const banner = document.getElementById('declineSuccessBanner');
    if (banner) banner.style.display = 'none';
}

// =========================================================================
// ERROR AND STATE RENDERING
// =========================================================================

function renderError(container, status) {
    let title = 'Unable to Load Contracts — अनुबंध लोड नहीं हो पाए';
    let message = 'An unexpected server error occurred. Please try again. — सर्वर में समस्या हुई। कृपया बाद में प्रयास करें।';
    let icon = 'fa-triangle-exclamation';

    if (status === 401) {
        title = 'Session Expired — सत्र समाप्त हो गया';
        message = 'Your session has expired. Please log in again to view your contracts. — आपका सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।';
        icon = 'fa-lock';
    } else if (status === 403) {
        title = 'Access Denied — अनुमति नहीं है';
        message = 'Contractor privileges are required to view this page. — इस पृष्ठ को देखने के लिए ठेकेदार की अनुमति आवश्यक है।';
        icon = 'fa-ban';
    } else if (status === 'network') {
        title = 'Connection Failed — नेटवर्क त्रुटि';
        message = 'Unable to connect to BuildBid server. Please check your internet connection. — सर्वर से कनेक्शन नहीं हो पाया।';
        icon = 'fa-wifi';
    }

    container.innerHTML = `
        <div class="state-box" style="padding: 50px 20px; text-align: center;">
            <i class="fa-solid ${icon}" style="font-size: 36px; color: #ef4444; margin-bottom: 14px;"></i>
            <h3 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">${title}</h3>
            <p style="font-size: 13.5px; color: #64748b; max-width: 460px; margin: 0 auto 16px auto;">${message}</p>
            <button type="button" class="btn-refresh-data" onclick="loadContracts()" style="margin: 0 auto;">
                <i class="fa-solid fa-arrows-rotate"></i> Retry — पुनः प्रयास करें
            </button>
        </div>
    `;
}

// Live Search Filter
function setupSearchFilter() {
    const searchInput = document.getElementById('contractsSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = (e.target.value || '').trim().toLowerCase();
        const container = document.getElementById('contractsContainer');
        if (!container) return;

        const cards = container.querySelectorAll('.contract-card-awarded');
        let matchedCount = 0;

        cards.forEach(card => {
            const searchData = (card.getAttribute('data-search') || '').toLowerCase();
            const textContent = (card.textContent || '').toLowerCase();
            const match = !query || searchData.includes(query) || textContent.includes(query);
            card.style.display = match ? 'block' : 'none';
            if (match) matchedCount++;
        });

        // If filtering leaves 0 matches, show inline helper
        let noMatchEl = document.getElementById('noSearchMatchHelper');
        if (cards.length > 0 && matchedCount === 0) {
            if (!noMatchEl) {
                noMatchEl = document.createElement('div');
                noMatchEl.id = 'noSearchMatchHelper';
                noMatchEl.style.cssText = 'padding: 40px; text-align: center; color: #64748b;';
                noMatchEl.innerHTML = `
                    <i class="fa-solid fa-magnifying-glass" style="font-size: 26px; color: #94a3b8; margin-bottom: 10px;"></i>
                    <h4 style="margin: 0 0 4px 0; color: #1e293b;">No matching contracts found</h4>
                    <p style="margin: 0; font-size: 13px;">No awarded contract matched "${safeText(query)}". Try another search keyword.</p>
                `;
                container.appendChild(noMatchEl);
            } else {
                noMatchEl.style.display = 'block';
            }
        } else if (noMatchEl) {
            noMatchEl.style.display = 'none';
        }
    });
}

// Global Logout
function logoutUser() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("marketplaceToken");
    localStorage.removeItem("marketplaceUser");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("customerUser");
    localStorage.removeItem("buildbid_user");
    localStorage.removeItem("buildbid_current_user");
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("pendingRedirect");
    sessionStorage.removeItem("userData");
    sessionStorage.clear();
    showLogoutToast(() => {
        window.location.href = "index.html";
    });
}

function showLogoutToast(callback, customTitle, customMessage) {
    let toast = document.getElementById("custom-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "custom-toast";
        toast.className = "toast-card";
        toast.innerHTML = `
            <div class="toast-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"></path>
                </svg>
            </div>
            <div class="toast-body">
                <h4 id="toast-title" class="toast-title">Logout Successful</h4>
                <p id="toast-message" class="toast-message">You have logged out successfully. — सफलतापूर्वक लॉगआउट किया गया।</p>
            </div>
            <button class="toast-close" type="button" aria-label="Close notification">&times;</button>
        `;
        toast.style.cssText = "position:fixed;top:25px;right:25px;z-index:999999;min-width:280px;max-width:380px;display:flex;align-items:center;gap:12px;padding:12px 16px;background:#ffffff;border:1px solid #e2e8f0;border-radius:13px;box-shadow:0 18px 40px rgba(15,23,42,0.13),0 3px 9px rgba(15,23,42,0.05);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);opacity:0;transform:translateY(-20px);pointer-events:none;font-family:'Inter',system-ui,sans-serif;";
        const iconEl = toast.querySelector(".toast-icon");
        if (iconEl) iconEl.style.cssText = "width:38px;height:38px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#ecfdf5;color:#10b981;border-radius:8px;";
        const titleEl = toast.querySelector(".toast-title");
        if (titleEl) titleEl.style.cssText = "margin:0;color:#1e293b;font-size:14px;font-weight:700;";
        const msgEl = toast.querySelector(".toast-message");
        if (msgEl) msgEl.style.cssText = "margin:2px 0 0 0;color:#64748b;font-size:12px;";
        const closeEl = toast.querySelector(".toast-close");
        if (closeEl) closeEl.style.cssText = "background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer;";
        document.body.appendChild(toast);
    }

    const titleEl = document.getElementById("toast-title");
    if (titleEl) titleEl.innerText = customTitle || "Logout Successful";
    const msgEl = document.getElementById("toast-message");
    if (msgEl) msgEl.innerText = customMessage || "You have logged out successfully. — सफलतापूर्वक लॉगआउट किया गया।";

    void toast.offsetHeight;
    toast.classList.add("show");
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
    toast.style.pointerEvents = "auto";

    let navigated = false;
    const navigateOnce = () => {
        if (navigated) return;
        navigated = true;
        toast.classList.remove("show");
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-20px)";
        toast.style.pointerEvents = "none";
        if (typeof callback === "function") callback();
        else window.location.href = "index.html";
    };

    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            navigateOnce();
        };
    }

    setTimeout(navigateOnce, 1200);
}

// DOM Ready initialization
document.addEventListener('DOMContentLoaded', () => {
    initUserSession();
    setupSearchFilter();

    // Load Authoritative Contracts
    loadContracts();

    // Modal Background Click Handlers
    const msgOverlay = document.getElementById('messageCustomerModalOverlay');
    if (msgOverlay) {
        msgOverlay.addEventListener('click', (e) => {
            if (e.target === msgOverlay) closeMessageCustomerModal();
        });
    }

    const contractModalOverlay = document.getElementById('contractDetailsModalOverlay');
    if (contractModalOverlay) {
        contractModalOverlay.addEventListener('click', (e) => {
            if (e.target === contractModalOverlay) closeContractDetailsModal();
        });
    }

    const declineOverlay = document.getElementById('declineConfirmModalOverlay');
    if (declineOverlay) {
        declineOverlay.addEventListener('click', (e) => {
            if (e.target === declineOverlay && !isSubmittingDecline) {
                closeDeclineModal();
            }
        });
    }

    // Escape Key Listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMessageCustomerModal();
            closeContractDetailsModal();
            if (!isSubmittingDecline) closeDeclineModal();
        }
    });
});

// Window Bindings
if (typeof window !== 'undefined') {
    window.loadContracts = loadContracts;
    window.refreshContracts = refreshContracts;
    window.toggleContractDrawer = toggleContractDrawer;
    window.openMessageCustomerModal = openMessageCustomerModal;
    window.closeMessageCustomerModal = closeMessageCustomerModal;
    window.closeContractDetailsModal = closeContractDetailsModal;
    window.openDeclineModal = openDeclineModal;
    window.closeDeclineModal = closeDeclineModal;
    window.submitDeclineAssignment = submitDeclineAssignment;
    window.hideDeclineSuccessBanner = hideDeclineSuccessBanner;
    window.logoutUser = logoutUser;
}
