document.addEventListener('DOMContentLoaded', () => {
    let currentPage = 1;
    const itemsPerPage = 5;

    // 1. Load logged-in customer's First Name & Initials dynamically
    initUserSession();
    fetchDynamicNotifications();

    // 2. Fetch backend stats & bid records
    loadDashboardStats();
    loadProjectBids(currentPage, itemsPerPage);

    // 3. Search query filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterProjectsRealtime(e.target.value.trim().toLowerCase());
        });
    }
});

/**
 * Extracts and displays only FIRST NAME (e.g., 'Heman') and initials ('HK')
 */
async function initUserSession() {
    const userNameEl = document.getElementById('userName');
    const userInitialsEl = document.getElementById('userInitials');

    try {
        let user = JSON.parse(
            localStorage.getItem('currentUser') || 
            localStorage.getItem('user') || 
            localStorage.getItem('userData') || 
            sessionStorage.getItem('userData') || '{}'
        );

        const token = localStorage.getItem('token');
        if (token) {
            const res = await fetch('/api/user/profile', {
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
        const token = localStorage.getItem('token');
        const res = await fetch('/api/notifications/unread-count', {
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
 * Dynamic Summary Counters from Backend
 */
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/customer/bids-summary', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        });

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();

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
 * Dynamic Project Bids Loader
 */
async function loadProjectBids(page = 1, limit = 5) {
    const container = document.getElementById('bidsListContainer');
    container.innerHTML = `
        <div class="loader-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Fetching project bids from server...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/customer/project-bids?page=${page}&limit=${limit}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        });

        if (!response.ok) throw new Error('Bids API failed');
        const result = await response.json();

        if (result.data && result.data.length > 0) {
            renderBidsList(result.data);
            renderPagination(result.pagination || {
                currentPage: page,
                totalPages: Math.ceil((result.total || result.data.length) / limit),
                totalItems: result.total || result.data.length,
                startIndex: ((page - 1) * limit) + 1,
                endIndex: Math.min(page * limit, result.total || result.data.length)
            });
        } else {
            renderEmptyState('No project bids found.');
        }

    } catch {
        renderEmptyState('Failed to load bids from server. Please try again.');
    }
}

function renderBidsList(projects) {
    const container = document.getElementById('bidsListContainer');
    container.innerHTML = projects.map(item => {
        const status = item.status || 'Pending';
        const badgeClass = status.toLowerCase().includes('accept') ? 'status-accepted' :
                           status.toLowerCase().includes('shortlist') ? 'status-shortlisted' : 'status-pending';

        return `
            <div class="bid-item-row" data-title="${(item.title || '').toLowerCase()}">
                <div class="project-identity">
                    <img src="${item.imageUrl || 'https://via.placeholder.com/60?text=Project'}" 
                         alt="${item.title || 'Project'}" 
                         class="project-thumbnail">
                    <div class="project-details">
                        <h4>${item.title || 'Untitled Project'}</h4>
                        <div class="location-line"><i class="fa-solid fa-location-dot"></i> ${item.location || 'Location N/A'}</div>
                        <div class="spec-line">${item.area ? item.area + ' • ' : ''}${item.category || 'General'}</div>
                        <div class="posted-date">Posted on ${item.postedDate || 'Recent'}</div>
                    </div>
                </div>

                <div class="bids-count-cell">
                    <div class="count-num">${item.bidsCount ?? 0}</div>
                    <a href="project-bid-details.html?id=${item.id || item._id}" class="view-bids-link">View All Bids</a>
                </div>

                <div class="price-cell">
                    <div class="price-amount">${item.lowestBid || '₹ 0'}</div>
                    <span class="price-label">Lowest Bid</span>
                </div>

                <div class="price-cell">
                    <div class="price-amount">${item.highestBid || '₹ 0'}</div>
                    <span class="price-label">Highest Bid</span>
                </div>

                <div class="status-badge-cell">
                    <span class="status-pill ${badgeClass}">${status}</span>
                    <span class="status-subtext">${item.statusNote || ''}</span>
                </div>

                <div class="action-cell">
                    <a href="view-project.html?id=${item.id || item._id}" class="btn-view-project">View Project</a>
                    <button class="btn-more-dots" onclick="console.log('Action menu:', '${item.id}')">
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

    info.textContent = `Showing ${p.startIndex} to ${p.endIndex} of ${p.totalItems} projects`;

    let html = `<button class="page-btn" ${p.currentPage <= 1 ? 'disabled' : ''} onclick="loadProjectBids(${p.currentPage - 1})">Previous</button>`;
    for (let i = 1; i <= p.totalPages; i++) {
        html += `<button class="page-btn ${i === p.currentPage ? 'active' : ''}" onclick="loadProjectBids(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" ${p.currentPage >= p.totalPages ? 'disabled' : ''} onclick="loadProjectBids(${p.currentPage + 1})">Next &gt;</button>`;
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
}

function filterProjectsRealtime(query) {
    const rows = document.querySelectorAll('.bid-item-row');
    rows.forEach(row => {
        const match = (row.getAttribute('data-title') || '').includes(query);
        row.style.display = match ? 'grid' : 'none';
    });
}