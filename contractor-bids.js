/**
 * ============================================================================
 * BUILDBID - CONTRACTOR DASHBOARD -> BIDS MODULE
 * Dynamic, Authoritative Bid Management & History Engine
 * ============================================================================
 */

(function () {
  'use strict';

  // Base API configuration
  function getApiBaseUrl() {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8080';
      }
    }
    return 'https://buildbid-ap3j.onrender.com';
  }

  const API_BASE_URL = getApiBaseUrl();

  // Authentication token retrieval
  function getCleanToken() {
    let token = localStorage.getItem('token') ||
                localStorage.getItem('authToken') ||
                localStorage.getItem('marketplaceToken') ||
                sessionStorage.getItem('token') || '';
    if (!token) return '';
    token = String(token).trim();
    let changed = true;
    while (changed) {
      changed = false;
      if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
        token = token.slice(1, -1).trim();
        changed = true;
      }
      if (token.startsWith('Bearer ')) {
        token = token.substring(7).trim();
        changed = true;
      }
    }
    return token;
  }

  // Current logged in contractor validation
  function getLoggedInContractor() {
    const rawData = localStorage.getItem('currentUser') ||
                    localStorage.getItem('loggedInUser') ||
                    sessionStorage.getItem('currentUser');

    if (!rawData) {
      alert('Please log in with a contractor account to access your bids.');
      window.location.href = 'index.html';
      return null;
    }

    try {
      const user = JSON.parse(rawData);
      const userRole = (user.role || (user.roles && user.roles[0]) || '').toUpperCase();
      if (userRole && userRole !== 'CONTRACTOR') {
        alert('Access Denied: The Bids Management module is reserved for Contractors only.');
        window.location.href = 'index.html';
        return null;
      }
      return user;
    } catch (e) {
      console.error('Error parsing logged-in user:', e);
      window.location.href = 'index.html';
      return null;
    }
  }

  // Global State
  let allBids = [];
  let currentStatusFilter = 'ALL';
  let currentSearchQuery = '';
  let currentSortOrder = 'NEWEST';
  let bidToWithdraw = null;
  let toastTimer = null;

  // Exact Date & Time Formatter - Preserving Full Seconds
  function formatExactDate(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  function formatExactTime(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return '₹ --';
    return '₹' + Number(val).toLocaleString('en-IN');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Toast System
  function showToast(title, message, isError = false) {
    const toast = document.getElementById('toastNotification');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    if (!toast || !toastTitle || !toastMessage || !toastIcon) return;

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    if (isError) {
      toast.classList.add('toast-error');
      toastIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else {
      toast.classList.remove('toast-error');
      toastIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    }

    toast.style.display = 'flex';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      hideToast();
    }, 4500);
  }

  function hideToast() {
    const toast = document.getElementById('toastNotification');
    if (toast) toast.style.display = 'none';
  }

  window.hideToast = hideToast;

  // Initialize UI Profile
  function initProfileUI(contractor) {
    if (!contractor) return;
    const nameEl = document.getElementById('contractorNameDisplay');
    const roleEl = document.getElementById('contractorRoleDisplay');
    const avatarEl = document.getElementById('contractorAvatar');

    if (nameEl) nameEl.textContent = contractor.name || contractor.username || 'Contractor';
    if (roleEl) roleEl.textContent = 'Registered Contractor';
    if (avatarEl) {
      const initial = (contractor.name || contractor.username || 'C').charAt(0).toUpperCase();
      avatarEl.textContent = initial;
    }

    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out?')) {
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authToken');
          localStorage.removeItem('marketplaceToken');
          sessionStorage.clear();
          window.location.href = 'index.html';
        }
      });
    }
  }

  // Fetch Real Bids from Backend API
  async function loadContractorBids() {
    const container = document.getElementById('bidsContainer');
    if (!container) return;

    // Show skeleton loaders
    renderSkeletonLoaders(container);

    const token = getCleanToken();
    if (!token) {
      showErrorState(container, 'Authentication required. Please sign in to view your submitted bids.');
      return;
    }

    try {
      // Primary contractor bids endpoint with history=true to include rejected bids
      const url = `${API_BASE_URL}/api/contractor/my-bids?history=true`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          showErrorState(container, 'Your session has expired or you do not have permission. Please log in again.');
          return;
        }
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      allBids = Array.isArray(data) ? data : [];

      // Calculate statistics and render
      updateStatistics(allBids);
      renderBids();

    } catch (err) {
      console.error('Failed to load contractor bids:', err);
      showErrorState(container, 'Unable to load your bids right now. Please check your connection and try again.');
    }
  }

  window.loadContractorBids = loadContractorBids;

  // Statistics Calculation
  function updateStatistics(bids) {
    let total = bids.length;
    let pending = 0;
    let accepted = 0;
    let rejected = 0;

    bids.forEach(b => {
      const status = (b.status || '').toUpperCase();
      if (status === 'ACCEPTED') {
        accepted++;
      } else if (status === 'REJECTED' || status === 'NOT_SELECTED') {
        rejected++;
      } else if (status === 'PENDING' || status === 'SUBMITTED') {
        pending++;
      }
    });

    const elTotal = document.getElementById('kpiTotalBids');
    const elPending = document.getElementById('kpiPendingBids');
    const elAccepted = document.getElementById('kpiAcceptedBids');
    const elRejected = document.getElementById('kpiRejectedBids');

    if (elTotal) elTotal.textContent = total;
    if (elPending) elPending.textContent = pending;
    if (elAccepted) elAccepted.textContent = accepted;
    if (elRejected) elRejected.textContent = rejected;

    // Tab counts
    const tabAll = document.getElementById('countTabAll');
    const tabPending = document.getElementById('countTabPending');
    const tabAccepted = document.getElementById('countTabAccepted');
    const tabRejected = document.getElementById('countTabRejected');

    if (tabAll) tabAll.textContent = total;
    if (tabPending) tabPending.textContent = pending;
    if (tabAccepted) tabAccepted.textContent = accepted;
    if (tabRejected) tabRejected.textContent = rejected;

    const navBidsBadge = document.getElementById('nav-badge-bids');
    if (navBidsBadge) navBidsBadge.textContent = total;
  }

  // Filtering, Searching, and Sorting
  function getFilteredAndSortedBids() {
    let result = [...allBids];

    // Status filter
    if (currentStatusFilter !== 'ALL') {
      result = result.filter(b => {
        const status = (b.status || '').toUpperCase();
        if (currentStatusFilter === 'PENDING') {
          return status === 'PENDING' || status === 'SUBMITTED';
        }
        if (currentStatusFilter === 'ACCEPTED') {
          return status === 'ACCEPTED';
        }
        if (currentStatusFilter === 'REJECTED') {
          return status === 'REJECTED' || status === 'NOT_SELECTED';
        }
        return status === currentStatusFilter;
      });
    }

    // Search query filter
    if (currentSearchQuery.trim()) {
      const query = currentSearchQuery.trim().toLowerCase();
      result = result.filter(b => {
        const title = (b.projectTitle || '').toLowerCase();
        const customId = (b.projectCustomId || '').toLowerCase();
        const loc = (b.projectLocation || '').toLowerCase();
        const type = (b.projectType || '').toLowerCase();
        const scope = (b.scopeOfWork || '').toLowerCase();
        return title.includes(query) || customId.includes(query) || loc.includes(query) || type.includes(query) || scope.includes(query);
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (currentSortOrder === 'NEWEST') {
        const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return timeB - timeA;
      }
      if (currentSortOrder === 'OLDEST') {
        const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return timeA - timeB;
      }
      if (currentSortOrder === 'HIGHEST') {
        const amtA = Number(a.bidAmount) || 0;
        const amtB = Number(b.bidAmount) || 0;
        return amtB - amtA;
      }
      if (currentSortOrder === 'LOWEST') {
        const amtA = Number(a.bidAmount) || 0;
        const amtB = Number(b.bidAmount) || 0;
        return amtA - amtB;
      }
      return 0;
    });

    return result;
  }

  // Render Bid Cards into Container
  function renderBids() {
    const container = document.getElementById('bidsContainer');
    if (!container) return;

    const filtered = getFilteredAndSortedBids();

    if (filtered.length === 0) {
      if (allBids.length === 0) {
        // Absolute empty state
        container.innerHTML = `
          <div class="bids-empty-state">
            <div class="empty-icon"><i class="fa-solid fa-file-signature"></i></div>
            <h3 class="empty-title">No Bids Submitted Yet</h3>
            <p class="empty-description">
              You have not submitted bids on any construction projects yet. Browse available client requirements to prepare and submit competitive proposals.
            </p>
            <a href="contractor-projects.html" class="btn btn-primary">
              <i class="fa-solid fa-magnifying-glass"></i> Browse Construction Projects
            </a>
          </div>
        `;
      } else {
        // Empty due to filter/search
        container.innerHTML = `
          <div class="bids-empty-state">
            <div class="empty-icon"><i class="fa-solid fa-filter-circle-xmark"></i></div>
            <h3 class="empty-title">No Matching Bids Found</h3>
            <p class="empty-description">
              No bids matched your current search and filter criteria. Try clearing search keywords or selecting "All" status.
            </p>
            <button type="button" class="btn btn-secondary" onclick="resetFilters()">
              <i class="fa-solid fa-rotate-left"></i> Reset Search &amp; Filters
            </button>
          </div>
        `;
      }
      return;
    }

    container.innerHTML = filtered.map(bid => renderSingleBidCard(bid)).join('');
  }

  // Render Single Bid Card
  function renderSingleBidCard(bid) {
    const rawStatus = (bid.status || 'PENDING').toUpperCase();
    const isRejected = (rawStatus === 'REJECTED' || rawStatus === 'NOT_SELECTED');
    const isAccepted = (rawStatus === 'ACCEPTED');
    const isPending = (rawStatus === 'PENDING' || rawStatus === 'SUBMITTED');

    // Status badge classes and labels
    let statusBadgeClass = 'status-pending';
    let statusBadgeLabel = 'Pending Review';
    let statusIcon = '<i class="fa-solid fa-hourglass-half"></i>';

    if (isAccepted) {
      statusBadgeClass = 'status-accepted';
      statusBadgeLabel = 'Accepted';
      statusIcon = '<i class="fa-solid fa-circle-check"></i>';
    } else if (isRejected) {
      statusBadgeClass = 'status-rejected';
      statusBadgeLabel = 'Rejected';
      statusIcon = '<i class="fa-solid fa-circle-xmark"></i>';
    } else if (rawStatus === 'WITHDRAWN') {
      statusBadgeClass = 'status-withdrawn';
      statusBadgeLabel = 'Withdrawn';
      statusIcon = '<i class="fa-solid fa-ban"></i>';
    }

    // Exact Submission Date & Time
    const submissionDate = formatExactDate(bid.submittedAt);
    const submissionTime = formatExactTime(bid.submittedAt);

    // Exact Updated Date & Time (if present)
    const hasBeenUpdated = !!bid.updatedAt;
    const updatedDate = hasBeenUpdated ? formatExactDate(bid.updatedAt) : '';
    const updatedTime = hasBeenUpdated ? formatExactTime(bid.updatedAt) : '';

    // Customer contact strip (ONLY when bid is accepted)
    let customerContactHtml = '';
    if (isAccepted && bid.customerContact) {
      customerContactHtml = `
        <div class="customer-contact-strip">
          <span class="contact-label"><i class="fa-solid fa-user-check"></i> Client Contact:</span>
          ${bid.customerContact.name ? `<span class="contact-info-item"><i class="fa-solid fa-user"></i> ${escapeHtml(bid.customerContact.name)}</span>` : ''}
          ${bid.customerContact.phone ? `<span class="contact-info-item"><i class="fa-solid fa-phone"></i> ${escapeHtml(bid.customerContact.phone)}</span>` : ''}
          ${bid.customerContact.email ? `<span class="contact-info-item"><i class="fa-solid fa-envelope"></i> ${escapeHtml(bid.customerContact.email)}</span>` : ''}
          ${bid.customerContact.location ? `<span class="contact-info-item"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(bid.customerContact.location)}</span>` : ''}
        </div>
      `;
    }

    // Action buttons based on status
    let actionButtons = `
      <a href="contractor-project-details.html?id=${bid.projectId || ''}" class="btn btn-outline">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> View Project
      </a>
    `;

    if (isPending) {
      actionButtons += `
        <button type="button" class="btn btn-outline-brand" onclick="openEditBidModal(${bid.id})">
          <i class="fa-solid fa-pen-to-square"></i> Edit Bid
        </button>
        <button type="button" class="btn btn-danger-outline" onclick="openWithdrawBidModal(${bid.id})">
          <i class="fa-solid fa-trash-can"></i> Withdraw
        </button>
      `;
    }

    // Bid Card HTML with exact timestamp formatting and rejected stamp
    return `
      <article class="bid-card ${isRejected ? 'is-rejected' : ''} ${isAccepted ? 'is-accepted' : ''} ${isPending ? 'is-pending' : ''}" data-bid-id="${bid.id}">
        ${isRejected ? '<div class="stamp-rejected">REJECTED</div>' : ''}

        <div class="card-header-row">
          <div class="card-title-group">
            ${bid.projectCustomId ? `<span class="project-id-badge"><i class="fa-solid fa-hashtag"></i> ${escapeHtml(bid.projectCustomId)}</span>` : ''}
            <h3 class="bid-project-title">${escapeHtml(bid.projectTitle || 'Construction Project')}</h3>
            ${bid.projectType ? `<span class="bid-project-type-tag"><i class="fa-solid fa-building"></i> ${escapeHtml(bid.projectType)}</span>` : ''}
          </div>
          <div class="status-badge ${statusBadgeClass}">
            ${statusIcon} ${statusBadgeLabel}
          </div>
        </div>

        <div class="project-specs-strip">
          ${bid.projectLocation ? `<div class="spec-item"><i class="fa-solid fa-location-dot"></i> <span>${escapeHtml(bid.projectLocation)}</span></div>` : ''}
          ${bid.projectArea ? `<div class="spec-item"><i class="fa-solid fa-ruler-combined"></i> <span>${escapeHtml(bid.projectArea)}</span></div>` : ''}
          ${bid.projectFloors ? `<div class="spec-item"><i class="fa-solid fa-layer-group"></i> <span>${escapeHtml(String(bid.projectFloors))} Floors</span></div>` : ''}
          ${bid.estimatedDuration ? `<div class="spec-item"><i class="fa-solid fa-calendar-check"></i> <span>${escapeHtml(bid.estimatedDuration)}</span></div>` : ''}
        </div>

        <div class="bid-financial-summary">
          <div class="financial-block">
            <span class="label">Your Submitted Bid</span>
            <span class="amount-highlight">${formatCurrency(bid.bidAmount)}</span>
          </div>
          <div class="financial-block">
            <span class="label">Proposed Duration</span>
            <span class="value-highlight">${escapeHtml(bid.estimatedDuration || '--')}</span>
          </div>
          ${bid.workersCount ? `
          <div class="financial-block">
            <span class="label">Workers Assigned</span>
            <span class="value-highlight">${bid.workersCount} Workers</span>
          </div>` : ''}
        </div>

        ${bid.scopeOfWork ? `
        <div class="bid-proposal-snippet">
          <span class="snippet-label">Proposal &amp; Scope of Work:</span>
          <div class="snippet-content">${escapeHtml(bid.scopeOfWork)}</div>
        </div>` : ''}

        ${(bid.descriptionEn || bid.descriptionHi) ? `
        <div class="bid-proposal-snippet">
          <span class="snippet-label">Quotation Description — विवरण:</span>
          ${bid.descriptionEn ? `<div class="snippet-content" style="margin-bottom: 4px;"><strong>English:</strong> ${escapeHtml(bid.descriptionEn)}</div>` : ''}
          ${bid.descriptionHi ? `<div class="snippet-content"><strong>Hindi:</strong> ${escapeHtml(bid.descriptionHi)}</div>` : ''}
        </div>` : ''}

        ${customerContactHtml}

        <!-- Authoritative Exact Submission & Update Timestamps -->
        <div class="bid-timestamps-row">
          <div class="timestamp-item">
            <span class="ts-label"><i class="fa-solid fa-paper-plane text-brand-blue"></i> Submitted On</span>
            <span class="ts-date">${submissionDate}</span>
            <span class="ts-time">${submissionTime}</span>
          </div>
          ${hasBeenUpdated ? `
          <div class="timestamp-item updated">
            <span class="ts-label"><i class="fa-solid fa-clock-rotate-left"></i> Last Edited</span>
            <span class="ts-date">${updatedDate}</span>
            <span class="ts-time">${updatedTime}</span>
          </div>` : ''}
        </div>

        <div class="bid-actions-row">
          ${actionButtons}
        </div>
      </article>
    `;
  }

  // Skeleton Loaders
  function renderSkeletonLoaders(container) {
    container.innerHTML = `
      <div class="skeleton-card">
        <div class="skeleton-line" style="width: 30%; height: 20px;"></div>
        <div class="skeleton-line" style="width: 75%; height: 26px;"></div>
        <div class="skeleton-line" style="width: 50%;"></div>
        <div class="skeleton-line" style="width: 100%; height: 60px; margin-top: 15px;"></div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton-line" style="width: 25%; height: 20px;"></div>
        <div class="skeleton-line" style="width: 65%; height: 26px;"></div>
        <div class="skeleton-line" style="width: 45%;"></div>
        <div class="skeleton-line" style="width: 100%; height: 60px; margin-top: 15px;"></div>
      </div>
    `;
  }

  // Error State Display
  function showErrorState(container, msg) {
    container.innerHTML = `
      <div class="bids-error-state">
        <div class="error-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
        <h3 class="error-title">Unable to Load Bids</h3>
        <p class="error-desc">${escapeHtml(msg)}</p>
        <button type="button" class="btn btn-primary" onclick="loadContractorBids()">
          <i class="fa-solid fa-rotate"></i> Retry
        </button>
      </div>
    `;
  }

  // Search, Tab Filter & Sort Event Handlers
  window.handleSearchInput = function () {
    const input = document.getElementById('bidsSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (!input) return;

    currentSearchQuery = input.value;
    if (clearBtn) {
      clearBtn.style.display = currentSearchQuery.length > 0 ? 'block' : 'none';
    }
    renderBids();
  };

  window.clearSearch = function () {
    const input = document.getElementById('bidsSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (input) input.value = '';
    currentSearchQuery = '';
    if (clearBtn) clearBtn.style.display = 'none';
    renderBids();
  };

  window.filterByStatus = function (status) {
    currentStatusFilter = status;
    const tabBtns = document.querySelectorAll('#statusTabs .tab-btn');
    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-status') === status) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    renderBids();
  };

  window.handleSortChange = function () {
    const select = document.getElementById('bidsSortSelect');
    if (select) {
      currentSortOrder = select.value;
      renderBids();
    }
  };

  window.resetFilters = function () {
    clearSearch();
    filterByStatus('ALL');
    const sortSelect = document.getElementById('bidsSortSelect');
    if (sortSelect) {
      sortSelect.value = 'NEWEST';
      currentSortOrder = 'NEWEST';
    }
    renderBids();
  };

  // Edit Modal Operations
  window.openEditBidModal = function (bidId) {
    const bid = allBids.find(b => b.id === bidId);
    if (!bid) {
      showToast('Error', 'Bid record not found.', true);
      return;
    }

    const modal = document.getElementById('editBidModal');
    if (!modal) return;

    // Populate Fields
    document.getElementById('editBidId').value = bid.id;
    document.getElementById('editModalProjectTitle').textContent = `Project: ${bid.projectTitle || '--'}`;
    document.getElementById('editBidOriginalTimestamp').textContent = `${formatExactDate(bid.submittedAt)} at ${formatExactTime(bid.submittedAt)}`;

    document.getElementById('editBidAmount').value = bid.bidAmount || '';
    document.getElementById('editBidDuration').value = bid.estimatedDuration || '';
    document.getElementById('editBidTimeline').value = bid.proposedTimeline || '';
    document.getElementById('editBidWorkers').value = bid.workersCount || '';
    document.getElementById('editBidScope').value = bid.scopeOfWork || '';
    document.getElementById('editBidIncluded').value = bid.includedWork || '';
    document.getElementById('editBidExcluded').value = bid.excludedWork || '';
    document.getElementById('editBidPaymentTerms').value = bid.paymentTerms || '';
    document.getElementById('editBidWarranty').value = bid.warranty || '';
    document.getElementById('editBidRemarks').value = bid.remarks || '';

    modal.style.display = 'flex';
  };

  window.closeEditBidModal = function () {
    const modal = document.getElementById('editBidModal');
    if (modal) modal.style.display = 'none';
  };

  // Save / Update Bid
  window.handleSaveEditedBid = async function (e) {
    e.preventDefault();
    const bidId = document.getElementById('editBidId').value;
    const btnSave = document.getElementById('btnSaveBid');

    if (!bidId) return;

    const payload = {
      bidAmount: parseFloat(document.getElementById('editBidAmount').value),
      estimatedDuration: document.getElementById('editBidDuration').value.trim(),
      proposedTimeline: document.getElementById('editBidTimeline').value.trim(),
      workersCount: document.getElementById('editBidWorkers').value ? parseInt(document.getElementById('editBidWorkers').value, 10) : null,
      scopeOfWork: document.getElementById('editBidScope').value.trim(),
      includedWork: document.getElementById('editBidIncluded').value.trim(),
      excludedWork: document.getElementById('editBidExcluded').value.trim(),
      paymentTerms: document.getElementById('editBidPaymentTerms').value.trim(),
      warranty: document.getElementById('editBidWarranty').value.trim(),
      remarks: document.getElementById('editBidRemarks').value.trim()
    };

    if (isNaN(payload.bidAmount) || payload.bidAmount <= 0) {
      showToast('Validation Error', 'Please enter a valid bid amount greater than zero.', true);
      return;
    }

    const token = getCleanToken();
    if (!token) {
      showToast('Auth Error', 'Your session has expired. Please log in again.', true);
      return;
    }

    const originalBtnText = btnSave.innerHTML;
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Updates...';

    try {
      const url = `${API_BASE_URL}/api/contractor/my-bids/${bidId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const updatedDto = await response.json();

      // Update in local cache
      const index = allBids.findIndex(b => b.id == bidId);
      if (index !== -1) {
        allBids[index] = updatedDto;
      }

      closeEditBidModal();
      updateStatistics(allBids);
      renderBids();
      showToast('Bid Updated', 'Your bid has been successfully updated and synchronized.');

    } catch (err) {
      console.error('Failed to update bid:', err);
      showToast('Update Failed', err.message || 'Unable to update bid. Please try again.', true);
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = originalBtnText;
    }
  };

  // Withdraw / Delete Modal Operations
  window.openWithdrawBidModal = function (bidId) {
    const bid = allBids.find(b => b.id === bidId);
    if (!bid) return;

    bidToWithdraw = bid;
    document.getElementById('withdrawBidAmount').textContent = formatCurrency(bid.bidAmount);
    document.getElementById('withdrawBidProject').textContent = bid.projectTitle || 'Project';

    const modal = document.getElementById('withdrawBidModal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeWithdrawBidModal = function () {
    const modal = document.getElementById('withdrawBidModal');
    if (modal) modal.style.display = 'none';
    bidToWithdraw = null;
  };

  // Confirm Withdraw
  window.confirmWithdrawBid = async function () {
    if (!bidToWithdraw) return;

    const btnConfirm = document.getElementById('btnConfirmWithdraw');
    const originalBtnText = btnConfirm.innerHTML;
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Withdrawing...';

    const token = getCleanToken();
    try {
      const url = `${API_BASE_URL}/api/contractor/my-bids/${bidToWithdraw.id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      // Remove from active list
      allBids = allBids.filter(b => b.id !== bidToWithdraw.id);

      closeWithdrawBidModal();
      updateStatistics(allBids);
      renderBids();
      showToast('Bid Withdrawn', 'Your bid has been safely withdrawn from the project.');

    } catch (err) {
      console.error('Failed to withdraw bid:', err);
      showToast('Withdrawal Failed', err.message || 'Could not withdraw bid.', true);
    } finally {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = originalBtnText;
    }
  };

  // Close modals on Escape key or backdrop click
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditBidModal();
      closeWithdrawBidModal();
    }
  });

  window.addEventListener('click', (e) => {
    const editModal = document.getElementById('editBidModal');
    const withdrawModal = document.getElementById('withdrawBidModal');
    if (e.target === editModal) closeEditBidModal();
    if (e.target === withdrawModal) closeWithdrawBidModal();
  });

  // DOMContentLoaded Entrypoint
  document.addEventListener('DOMContentLoaded', () => {
    const contractor = getLoggedInContractor();
    if (!contractor) return;

    initProfileUI(contractor);
    loadContractorBids();
  });

})();
