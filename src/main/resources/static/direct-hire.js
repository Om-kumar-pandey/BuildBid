/**
 * BUILDBID — DIRECT HIRE DYNAMIC ENGINE
 * Single common workflow for Customer, Contractor, and Professional.
 * Reuses existing Master Catalog & Professional Services data.
 */

// ============================================================
// 1. CONFIGURATION & SESSION UTILITIES
// ============================================================

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

// Current user detection
function getCurrentUser() {
  const storageKeys = ["currentUser", "customerUser", "loggedInUser", "marketplaceUser", "userData"];
  for (const key of storageKeys) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key));
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (e) {}
  }
  return null;
}

// ============================================================
// 2. STATE MANAGEMENT
// ============================================================

let masterCatalog = [];
let selectedCategoryId = null;
let selectedMasterServiceId = null;
let selectedMasterServiceTitle = "";
let selectedMasterServiceTitleHi = "";
let currentSearchResults = [];
let currentSortOrder = "default"; // "default", "low-to-high", "high-to-low"

// ============================================================
// 3. INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  setupUserHeader();
  setupEventListeners();
  await loadMasterCatalog();

  // If URL contains pre-selected service query param, apply it
  const urlParams = new URLSearchParams(window.location.search);
  const paramServiceId = urlParams.get("serviceId");
  const paramLoc = urlParams.get("location");

  if (paramLoc) {
    const locInput = document.getElementById("location-input");
    if (locInput) locInput.value = paramLoc;
  }

  if (paramServiceId && masterCatalog.length > 0) {
    preselectServiceById(parseInt(paramServiceId, 10));
  }
});

// Configure navbar user identity & Back button based on role
function setupUserHeader() {
  const user = getCurrentUser();
  const userPill = document.getElementById("user-role-pill");
  const backBtn = document.getElementById("back-to-dashboard-btn");

  if (user) {
    const roleRaw = (user.role || (user.roles && user.roles[0]) || "").toString().replace("ROLE_", "").toUpperCase();
    const displayName = user.name || user.fullName || user.username || "User";

    if (userPill) {
      let roleBadge = "Customer";
      let roleColor = "bg-blue-50 text-blue-700 border-blue-200";

      if (roleRaw === "CONTRACTOR") {
        roleBadge = "Contractor";
        roleColor = "bg-orange-50 text-orange-700 border-orange-200";
      } else if (roleRaw === "PROFESSIONAL" || roleRaw === "SERVICE_PROVIDER") {
        roleBadge = "Professional";
        roleColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
      }

      userPill.innerHTML = `
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${roleColor}">
          <i class="fa-solid fa-circle-user mr-1.5"></i>
          <span>${escapeHTML(displayName)}</span>
          <span class="ml-1.5 text-[10px] uppercase font-bold opacity-75">(${roleBadge})</span>
        </span>
      `;
    }

    if (backBtn) {
      backBtn.onclick = () => {
        if (roleRaw === "CONTRACTOR") {
          window.location.href = "contractor-dashboard.html";
        } else if (roleRaw === "PROFESSIONAL" || roleRaw === "SERVICE_PROVIDER") {
          window.location.href = "professional dashboard.html";
        } else {
          window.location.href = "customer dashboard.html";
        }
      };
    }
  } else {
    if (userPill) {
      userPill.innerHTML = `
        <a href="index.html" class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
          <i class="fa-solid fa-arrow-right-to-bracket mr-1.5"></i> Login / Register
        </a>
      `;
    }
    if (backBtn) {
      backBtn.onclick = () => window.location.href = "index.html";
    }
  }
}

// Bind UI event listeners
function setupEventListeners() {
  // Auto location GPS button
  const autoLocBtn = document.getElementById("btn-auto-location");
  if (autoLocBtn) {
    autoLocBtn.addEventListener("click", handleAutoLocation);
  }

  // Clear location button
  const clearLocBtn = document.getElementById("btn-clear-location");
  if (clearLocBtn) {
    clearLocBtn.addEventListener("click", () => {
      const input = document.getElementById("location-input");
      if (input) {
        input.value = "";
        input.focus();
      }
    });
  }

  // Proceed button
  const proceedBtn = document.getElementById("btn-proceed-search");
  if (proceedBtn) {
    proceedBtn.addEventListener("click", handleProceedSearch);
  }

  // Sort dropdown
  const sortSelect = document.getElementById("sort-by-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSortOrder = e.target.value;
      sortAndRenderResults();
    });
  }

  // Close modals on Escape key or backdrop click
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModals();
  });
}

// ============================================================
// 4. LOAD MASTER CATALOG (STEP 1: SOURCE OF TRUTH)
// ============================================================

async function loadMasterCatalog() {
  const catContainer = document.getElementById("categories-grid");
  const loadingIndicator = document.getElementById("catalog-loading");

  try {
    const res = await fetch(`${API_BASE_URL}/api/public/master-catalog`);
    if (!res.ok) throw new Error("Catalog fetch failed with status: " + res.status);

    masterCatalog = await res.json();

    if (loadingIndicator) loadingIndicator.classList.add("hidden");
    renderCategories();

    // Default select first category (e.g. Labour & Construction Trades)
    if (masterCatalog && masterCatalog.length > 0) {
      selectCategory(masterCatalog[0].id);
    }
  } catch (err) {
    console.error("Failed to load master catalog:", err);
    if (loadingIndicator) {
      loadingIndicator.innerHTML = `
        <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-700">
          <i class="fa-solid fa-triangle-exclamation text-lg mb-1 block"></i>
          <span>Could not load service catalog. Please check server connection.</span>
          <button onclick="loadMasterCatalog()" class="mt-2 block mx-auto px-3 py-1 bg-white border border-rose-300 rounded text-rose-700 font-semibold hover:bg-rose-100">Retry</button>
        </div>
      `;
    }
  }
}

function renderCategories() {
  const container = document.getElementById("categories-grid");
  if (!container) return;

  container.innerHTML = masterCatalog.map(cat => `
    <div onclick="selectCategory(${cat.id})" id="cat-card-${cat.id}" class="category-chip p-3 rounded-xl bg-white flex items-center space-x-3 transition">
      <div class="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-base flex-shrink-0">
        <i class="fa-solid ${cat.icon || 'fa-toolbox'}"></i>
      </div>
      <div class="overflow-hidden text-left">
        <h3 class="text-xs font-bold text-slate-900 truncate">${escapeHTML(cat.nameEn)}</h3>
        <p class="text-[11px] text-slate-500 truncate">${escapeHTML(cat.nameHi || '')}</p>
        <span class="text-[10px] text-orange-600 font-semibold mt-0.5 block">${(cat.services || []).length} Services</span>
      </div>
    </div>
  `).join("");
}

function selectCategory(categoryId) {
  selectedCategoryId = categoryId;
  const category = masterCatalog.find(c => c.id === categoryId);
  if (!category) return;

  // Highlight active category
  document.querySelectorAll(".category-chip").forEach(el => el.classList.remove("active"));
  const activeCard = document.getElementById(`cat-card-${categoryId}`);
  if (activeCard) activeCard.classList.add("active");

  // Render services belonging to this category
  renderServicesForCategory(category);
}

function renderServicesForCategory(category) {
  const container = document.getElementById("services-chips-container");
  const countBadge = document.getElementById("category-services-count");
  if (!container) return;

  const services = category.services || [];

  if (countBadge) {
    countBadge.textContent = `${services.length} Available`;
  }

  if (services.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-4 text-center text-xs text-slate-400">
        No active services currently in this category.
      </div>
    `;
    return;
  }

  container.innerHTML = services.map(srv => {
    const isSelected = selectedMasterServiceId === srv.id;
    return `
      <button type="button" onclick="selectMasterService(${srv.id}, '${escapeAttribute(srv.titleEn)}', '${escapeAttribute(srv.titleHi || '')}')"
              id="srv-chip-${srv.id}"
              class="service-chip px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 bg-white ${isSelected ? 'active' : 'text-slate-700'}">
        <i class="fa-solid fa-check text-[10px] ${isSelected ? 'inline' : 'hidden'}" id="srv-check-${srv.id}"></i>
        <span class="font-bold">${escapeHTML(srv.titleEn)}</span>
        ${srv.titleHi ? `<span class="text-[11px] opacity-75 font-normal">/ ${escapeHTML(srv.titleHi)}</span>` : ''}
      </button>
    `;
  }).join("");

  // If nothing is selected yet, or selected service belongs to another category, preselect the first
  if (!selectedMasterServiceId || !services.some(s => s.id === selectedMasterServiceId)) {
    if (services.length > 0) {
      selectMasterService(services[0].id, services[0].titleEn, services[0].titleHi || "");
    }
  }
}

function selectMasterService(serviceId, titleEn, titleHi) {
  selectedMasterServiceId = serviceId;
  selectedMasterServiceTitle = titleEn;
  selectedMasterServiceTitleHi = titleHi;

  // Update chip styles
  document.querySelectorAll(".service-chip").forEach(el => {
    el.classList.remove("active");
    const check = el.querySelector(".fa-check");
    if (check) check.classList.add("hidden");
  });

  const activeChip = document.getElementById(`srv-chip-${serviceId}`);
  if (activeChip) {
    activeChip.classList.add("active");
    const check = activeChip.querySelector(".fa-check");
    if (check) check.classList.remove("hidden");
  }

  // Update selection banner display
  const banner = document.getElementById("selected-service-summary");
  if (banner) {
    banner.innerHTML = `
      <div class="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
        <i class="fa-solid fa-toolbox mr-1.5 text-orange-600"></i>
        <span>Selected: <strong>${escapeHTML(titleEn)}</strong> ${titleHi ? `<span class="opacity-80 font-normal">(${escapeHTML(titleHi)})</span>` : ''}</span>
      </div>
    `;
  }
}

function preselectServiceById(serviceId) {
  for (const cat of masterCatalog) {
    const srv = (cat.services || []).find(s => s.id === serviceId);
    if (srv) {
      selectCategory(cat.id);
      selectMasterService(srv.id, srv.titleEn, srv.titleHi || "");
      break;
    }
  }
}

// ============================================================
// 5. LOCATION LOGIC (OPTION A: GPS / OPTION B: MANUAL)
// ============================================================

function handleAutoLocation() {
  const locationInput = document.getElementById("location-input");
  const autoBtn = document.getElementById("btn-auto-location");
  if (!locationInput) return;

  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by your browser.", "error");
    return;
  }

  if (autoBtn) {
    autoBtn.disabled = true;
    autoBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Detecting GPS...`;
  }
  locationInput.placeholder = "Detecting precise coordinates...";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      locationInput.placeholder = "Resolving city with OpenStreetMap...";

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
          headers: { 'User-Agent': 'BuildBid-DirectHire/1.0' }
        });
        const data = await response.json();

        let resolvedLocation = "";
        if (data && data.address) {
          const addr = data.address;
          const cityOrDistrict = addr.city || addr.town || addr.county || addr.state_district || "";
          const state = addr.state || "";
          if (cityOrDistrict && state) {
            resolvedLocation = `${cityOrDistrict}, ${state}`;
          } else if (cityOrDistrict) {
            resolvedLocation = cityOrDistrict;
          } else if (data.display_name) {
            resolvedLocation = data.display_name.split(",").slice(0, 3).join(",").trim();
          }
        }

        if (resolvedLocation) {
          locationInput.value = resolvedLocation;
          showToast(`📍 Location detected: ${resolvedLocation}`, "success");
        } else {
          locationInput.placeholder = "e.g. Noida, Delhi, Lucknow";
          showToast("Could not determine precise locality. Please enter city manually.", "info");
        }
      } catch (err) {
        console.error("Geocoding reverse error:", err);
        locationInput.placeholder = "e.g. Noida, Delhi, Lucknow";
        showToast("Network error getting address from GPS. Please type your city.", "error");
      } finally {
        if (autoBtn) {
          autoBtn.disabled = false;
          autoBtn.innerHTML = `<i class="fa-solid fa-location-crosshairs text-orange-600 mr-1.5"></i> <span>Auto Detect Current Location</span>`;
        }
      }
    },
    (err) => {
      console.warn("Geolocation permission error:", err);
      if (autoBtn) {
        autoBtn.disabled = false;
        autoBtn.innerHTML = `<i class="fa-solid fa-location-crosshairs text-orange-600 mr-1.5"></i> <span>Auto Detect Current Location</span>`;
      }
      locationInput.placeholder = "e.g. Noida, Delhi, Lucknow";
      showToast("Location permission was denied or unavailable. Please type your city manually.", "info");
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

function setQuickLocation(city) {
  const locInput = document.getElementById("location-input");
  if (locInput) {
    locInput.value = city;
    showToast(`Location set to: ${city}`, "info");
  }
}

// ============================================================
// 6. PROCEED SEARCH ACTION
// ============================================================

async function handleProceedSearch() {
  if (!selectedMasterServiceId) {
    showToast("Please select a service or trade first — कृपया पहले सेवा चुनें।", "error");
    const srvSection = document.getElementById("services-selection-section");
    if (srvSection) srvSection.scrollIntoView({ behavior: "smooth" });
    return;
  }

  const locationInput = document.getElementById("location-input");
  const locationQuery = locationInput ? locationInput.value.trim() : "";

  // Smooth scroll down to results section
  const resultsSection = document.getElementById("results-section");
  if (resultsSection) {
    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }

  const grid = document.getElementById("results-grid");
  const countBar = document.getElementById("results-summary-bar");
  const loadingIndicator = document.getElementById("search-loading");

  if (loadingIndicator) loadingIndicator.classList.remove("hidden");
  if (grid) grid.innerHTML = "";
  if (countBar) countBar.innerHTML = "";

  // Query Backend Direct Hire Search API
  try {
    let url = `${API_BASE_URL}/api/public/direct-hire/search?masterServiceId=${selectedMasterServiceId}`;
    if (locationQuery) {
      url += `&location=${encodeURIComponent(locationQuery)}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Search API responded with status: " + res.status);

    const data = await res.json();
    currentSearchResults = Array.isArray(data) ? data : [];

    if (loadingIndicator) loadingIndicator.classList.add("hidden");
    sortAndRenderResults();
  } catch (err) {
    console.error("Direct hire search error:", err);
    if (loadingIndicator) loadingIndicator.classList.add("hidden");
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-rose-200 p-8 shadow-sm">
          <i class="fa-solid fa-circle-exclamation text-3xl text-rose-500 mb-3 block"></i>
          <h3 class="text-sm font-bold text-slate-900">Search Error Connecting to BuildBid Server</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">Unable to retrieve professional services from backend. Please verify network connectivity and try again.</p>
          <button onclick="handleProceedSearch()" class="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition">
            <i class="fa-solid fa-rotate-right mr-1.5"></i> Try Again
          </button>
        </div>
      `;
    }
  }
}

// ============================================================
// 7. RENDER PROFESSIONAL SERVICE CARDS
// ============================================================

function sortAndRenderResults() {
  const grid = document.getElementById("results-grid");
  const countBar = document.getElementById("results-summary-bar");
  const locationInput = document.getElementById("location-input");
  const locationQuery = locationInput ? locationInput.value.trim() : "";

  if (!grid) return;

  // Sorting
  let sorted = [...currentSearchResults];
  if (currentSortOrder === "low-to-high") {
    sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (currentSortOrder === "high-to-low") {
    sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  }

  // Summary bar update
  if (countBar) {
    const locText = locationQuery ? `in <strong>"${escapeHTML(locationQuery)}"</strong>` : `across <strong>all registered locations</strong>`;
    countBar.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <span class="text-xs font-medium text-slate-600">Showing</span>
          <span class="text-sm font-extrabold text-slate-900 px-1.5">${sorted.length}</span>
          <span class="text-xs text-slate-600">verified professionals for <strong>"${escapeHTML(selectedMasterServiceTitle)}"</strong> ${locText}</span>
        </div>
        <div class="flex items-center space-x-2">
          ${locationQuery ? `
            <button onclick="clearLocationAndReSearch()" class="text-[11px] font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition border border-orange-200">
              <i class="fa-solid fa-xmark mr-1"></i> Clear Location Filter
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Empty state handling
  if (sorted.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div class="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-3.5 text-2xl">
          <i class="fa-solid fa-user-slash"></i>
        </div>
        <h3 class="text-base font-bold text-slate-900">No professionals found for "${escapeHTML(selectedMasterServiceTitle)}" ${locationQuery ? `in "${escapeHTML(locationQuery)}"` : ''}</h3>
        <p class="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
          Currently, no active service providers have registered with this specific trade in this area.
          Try clearing the location to see all available professionals or select another service.
        </p>
        <div class="mt-5 flex items-center justify-center space-x-3">
          ${locationQuery ? `
            <button onclick="clearLocationAndReSearch()" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition shadow-sm">
              <i class="fa-solid fa-earth-asia mr-1.5"></i> Show All Locations / सभी स्थान दिखाएं
            </button>
          ` : ''}
          <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition">
            <i class="fa-solid fa-arrow-up mr-1.5"></i> Change Service Trade
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Render Result Cards
  grid.innerHTML = sorted.map(srv => {
    const proName = srv.professionalName || 'Verified Professional';
    const proLocation = srv.professionalLocation || 'Location On Request';
    const title = srv.serviceTitleEn || srv.serviceName || selectedMasterServiceTitle;
    const titleHi = srv.serviceTitleHi ? `<span class="text-xs text-slate-500 font-normal">/ ${escapeHTML(srv.serviceTitleHi)}</span>` : '';
    const priceFormatted = typeof srv.price === 'number' ? `₹${Number(srv.price).toLocaleString('en-IN')}` : `₹${srv.price}`;
    const unit = srv.pricingUnit || 'Per Visit';
    const duration = srv.turnaroundTime || '1-3 Days';
    const mode = srv.serviceMode || 'ON_SITE';
    const radius = srv.serviceAreaRadiusKm || 25;
    const desc = srv.shortDescription || srv.detailedDescription || 'Professional construction service scope.';
    const isVerifiedExpert = srv.verificationStatus === 'VERIFIED';
    const avatar = srv.profilePhotoUrl;

    // Badging
    const badgeHtml = isVerifiedExpert
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><i class="fa-solid fa-shield-check text-blue-600 mr-1"></i> Verified Expert</span>`
      : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> Active Trade</span>`;

    // Initials fallback
    const initials = proName.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "P";

    return `
      <div class="pro-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
        <!-- Card Header: Provider Identity & Badge -->
        <div>
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-3">
              ${avatar ? `
                <img src="${escapeAttribute(avatar)}" alt="${escapeAttribute(proName)}" class="w-10 h-10 rounded-xl object-cover border border-slate-200">
              ` : `
                <div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                  ${initials}
                </div>
              `}
              <div class="overflow-hidden">
                <h4 class="text-sm font-bold text-slate-900 truncate">${escapeHTML(proName)}</h4>
                <p class="text-[11px] text-slate-500 truncate flex items-center mt-0.5">
                  <i class="fa-solid fa-location-dot text-slate-400 mr-1 text-[10px]"></i>
                  <span>${escapeHTML(proLocation)}</span>
                </p>
              </div>
            </div>
            ${badgeHtml}
          </div>

          <!-- Service Title & Authoritative Price -->
          <div class="mt-3.5 pt-3 border-t border-slate-100">
            <div class="flex items-baseline justify-between">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-orange-600">${escapeHTML(srv.serviceName || selectedMasterServiceTitle)}</span>
                <h3 class="text-sm font-bold text-slate-900">${escapeHTML(title)} ${titleHi}</h3>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="text-lg font-extrabold text-orange-600">${priceFormatted}</span>
                <span class="text-xs text-slate-500 font-normal"> / ${escapeHTML(unit)}</span>
              </div>
            </div>
            <p class="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">${escapeHTML(desc)}</p>
          </div>

          <!-- Specs: Turnaround, Mode, Coverage -->
          <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
            <div class="flex items-center space-x-1.5">
              <i class="fa-regular fa-clock text-slate-400"></i>
              <span>Turnaround: <strong>${escapeHTML(duration)}</strong></span>
            </div>
            <div class="flex items-center space-x-1.5">
              <i class="fa-solid fa-cube text-slate-400"></i>
              <span>Mode: <strong>${escapeHTML(mode)}</strong></span>
            </div>
            <div class="flex items-center space-x-1.5 col-span-2">
              <i class="fa-solid fa-location-crosshairs text-slate-400"></i>
              <span>Coverage: <strong>Within ${radius} km radius</strong></span>
            </div>
          </div>
        </div>

        <!-- Consumer Action Buttons -->
        <div class="pt-3 border-t border-slate-100 flex items-center space-x-2">
          <button type="button" onclick="openServiceScopeModal(${srv.serviceId})" class="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition text-center">
            <i class="fa-regular fa-file-lines mr-1 text-slate-500"></i> View Service Scope
          </button>
          <button type="button" onclick="openHireModal(${srv.serviceId})" class="flex-1 py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition text-center shadow-sm hover:shadow">
            <i class="fa-solid fa-handshake mr-1"></i> Direct Hire
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function clearLocationAndReSearch() {
  const locInput = document.getElementById("location-input");
  if (locInput) locInput.value = "";
  handleProceedSearch();
}

// ============================================================
// 8. SERVICE DETAILS MODAL (VIEW SERVICE)
// ============================================================

function openServiceScopeModal(serviceId) {
  const srv = currentSearchResults.find(s => s.serviceId === serviceId);
  if (!srv) return;

  const modal = document.getElementById("service-scope-modal");
  const content = document.getElementById("modal-scope-content");
  if (!modal || !content) return;

  const proName = srv.professionalName || 'Verified Professional';
  const proLocation = srv.professionalLocation || 'Location On Request';
  const title = srv.serviceTitleEn || srv.serviceName || selectedMasterServiceTitle;
  const titleHi = srv.serviceTitleHi ? `/ ${srv.serviceTitleHi}` : '';
  const priceFormatted = typeof srv.price === 'number' ? `₹${Number(srv.price).toLocaleString('en-IN')}` : `₹${srv.price}`;
  const unit = srv.pricingUnit || 'Per Visit';

  content.innerHTML = `
    <!-- Modal Header -->
    <div class="flex items-start justify-between pb-4 border-b border-slate-100">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-orange-600">${escapeHTML(srv.serviceName || 'Construction Service')}</span>
        <h3 class="text-base font-bold text-slate-900">${escapeHTML(title)} <span class="text-slate-500 text-xs font-normal">${escapeHTML(titleHi)}</span></h3>
        <p class="text-xs text-slate-500 mt-0.5">Offered by <strong>${escapeHTML(proName)}</strong> • 📍 ${escapeHTML(proLocation)}</p>
      </div>
      <div class="text-right">
        <span class="text-xl font-extrabold text-orange-600">${priceFormatted}</span>
        <span class="text-xs text-slate-500 font-normal block">/ ${escapeHTML(unit)}</span>
      </div>
    </div>

    <!-- Description -->
    <div class="space-y-3.5 mt-4 text-xs">
      <div>
        <h4 class="font-bold text-slate-900 mb-1">Service Scope & Description:</h4>
        <p class="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
          ${escapeHTML(srv.detailedDescription || srv.shortDescription || 'Professional trade execution adhering to BuildBid standard site guidelines.')}
        </p>
      </div>

      <!-- Turnaround & Operational Mode -->
      <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-bold">Estimated Turnaround</span>
          <span class="font-bold text-slate-900 text-xs"><i class="fa-regular fa-clock mr-1 text-orange-600"></i> ${escapeHTML(srv.turnaroundTime || '1-3 Days')}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-bold">Working Mode</span>
          <span class="font-bold text-slate-900 text-xs"><i class="fa-solid fa-cube mr-1 text-orange-600"></i> ${escapeHTML(srv.serviceMode || 'ON_SITE')}</span>
        </div>
      </div>

      <!-- What's Included / Not Included -->
      ${srv.whatsIncluded ? `
        <div>
          <h4 class="font-bold text-slate-900 mb-1 flex items-center text-emerald-700">
            <i class="fa-solid fa-circle-check mr-1.5 text-xs"></i> What's Included in This Rate:
          </h4>
          <p class="text-slate-600 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg whitespace-pre-line">${escapeHTML(srv.whatsIncluded)}</p>
        </div>
      ` : ''}

      ${srv.whatsNotIncluded ? `
        <div>
          <h4 class="font-bold text-slate-900 mb-1 flex items-center text-rose-700">
            <i class="fa-solid fa-circle-xmark mr-1.5 text-xs"></i> Not Included (Requires Separate Billing/Materials):
          </h4>
          <p class="text-slate-600 bg-rose-50/50 border border-rose-100 p-2.5 rounded-lg whitespace-pre-line">${escapeHTML(srv.whatsNotIncluded)}</p>
        </div>
      ` : ''}

      <!-- Qualification (if verified) -->
      ${srv.qualificationTitle ? `
        <div class="bg-blue-50/60 border border-blue-200 p-3 rounded-xl text-blue-900">
          <div class="flex items-center space-x-2">
            <i class="fa-solid fa-certificate text-blue-600 text-sm"></i>
            <div>
              <span class="text-[10px] uppercase font-bold tracking-wider text-blue-700 block">Verified Qualification</span>
              <span class="font-bold text-xs">${escapeHTML(srv.qualificationTitle)}</span>
              ${srv.issuingAuthority ? `<span class="text-[11px] text-blue-700 block mt-0.5">Authority: ${escapeHTML(srv.issuingAuthority)}</span>` : ''}
            </div>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Modal Footer -->
    <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
      <button onclick="closeModals()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition">
        Close / बंद करें
      </button>
      <button onclick="closeModals(); openHireModal(${srv.serviceId});" class="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-sm">
        <i class="fa-solid fa-handshake mr-1.5"></i> Direct Hire This Professional
      </button>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

// ============================================================
// 9. DIRECT HIRE CONFIRMATION MODAL (PHASE 1 PREVIEW)
// ============================================================

function openHireModal(serviceId) {
  const srv = currentSearchResults.find(s => s.serviceId === serviceId);
  if (!srv) return;

  const modal = document.getElementById("hire-confirmation-modal");
  const content = document.getElementById("modal-hire-content");
  if (!modal || !content) return;

  const proName = srv.professionalName || 'Verified Professional';
  const proLocation = srv.professionalLocation || 'Location On Request';
  const title = srv.serviceTitleEn || srv.serviceName || selectedMasterServiceTitle;
  const priceFormatted = typeof srv.price === 'number' ? `₹${Number(srv.price).toLocaleString('en-IN')}` : `₹${srv.price}`;
  const unit = srv.pricingUnit || 'Per Visit';

  content.innerHTML = `
    <!-- Header -->
    <div class="text-center pb-4 border-b border-slate-100">
      <div class="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-2.5 text-xl">
        <i class="fa-solid fa-handshake"></i>
      </div>
      <h3 class="text-base font-bold text-slate-900">Direct Hire Request</h3>
      <p class="text-xs text-slate-500 mt-0.5">Direct hiring from registered BuildBid Professional</p>
    </div>

    <!-- Provider & Rate Summary -->
    <div class="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
      <div class="flex justify-between items-center">
        <span class="text-slate-500">Service:</span>
        <span class="font-bold text-slate-900">${escapeHTML(title)}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-slate-500">Professional:</span>
        <span class="font-bold text-slate-900">${escapeHTML(proName)}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-slate-500">Location:</span>
        <span class="font-bold text-slate-900">📍 ${escapeHTML(proLocation)}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-slate-500">Turnaround:</span>
        <span class="font-bold text-slate-900">${escapeHTML(srv.turnaroundTime || '1-3 Days')}</span>
      </div>
      <div class="flex justify-between items-center pt-2 border-t border-slate-200">
        <span class="font-bold text-slate-700">Published Rate:</span>
        <span class="text-base font-extrabold text-orange-600">${priceFormatted} <span class="text-xs text-slate-500 font-normal">/ ${escapeHTML(unit)}</span></span>
      </div>
    </div>

    <!-- Phase 1 Notice Box -->
    <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
      <div class="flex items-start space-x-2">
        <i class="fa-solid fa-circle-info text-amber-600 mt-0.5 flex-shrink-0"></i>
        <div>
          <span class="font-bold block text-amber-950">Direct Hire — Phase 1 Ready</span>
          <span>
            You have selected <strong>${escapeHTML(proName)}</strong> at their published rate of <strong>${priceFormatted} / ${escapeHTML(unit)}</strong>.
            The complete booking & contract dispatch pipeline will be enabled in Phase 2.
          </span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="mt-6 flex items-center space-x-3">
      <button onclick="closeModals()" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition">
        Cancel / वापस जाएं
      </button>
      <button onclick="handleConfirmDirectHire('${escapeAttribute(proName)}', '${escapeAttribute(title)}')" class="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-sm">
        <i class="fa-solid fa-check mr-1.5"></i> Confirm Selection
      </button>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function handleConfirmDirectHire(proName, serviceTitle) {
  closeModals();
  showToast(`Direct Hire selection confirmed for ${proName} (${serviceTitle})! Dispatch flow activated.`, "success");
}

function closeModals() {
  const scopeModal = document.getElementById("service-scope-modal");
  const hireModal = document.getElementById("hire-confirmation-modal");
  if (scopeModal) {
    scopeModal.classList.add("hidden");
    scopeModal.classList.remove("flex");
  }
  if (hireModal) {
    hireModal.classList.add("hidden");
    hireModal.classList.remove("flex");
  }
}

// ============================================================
// 10. TOAST NOTIFICATION UTILITY
// ============================================================

let toastTimer = null;
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-message");
  const toastIcon = document.getElementById("toast-icon");
  if (!toast || !toastMsg) return;

  if (toastTimer) clearTimeout(toastTimer);

  toastMsg.textContent = message;

  if (toastIcon) {
    if (type === "success") {
      toastIcon.className = "fa-solid fa-circle-check text-emerald-500 mr-2 text-sm";
    } else if (type === "error") {
      toastIcon.className = "fa-solid fa-circle-exclamation text-rose-500 mr-2 text-sm";
    } else {
      toastIcon.className = "fa-solid fa-circle-info text-blue-500 mr-2 text-sm";
    }
  }

  toast.classList.remove("hidden", "translate-y-4", "opacity-0");
  toast.classList.add("translate-y-0", "opacity-100");

  toastTimer = setTimeout(() => {
    toast.classList.add("translate-y-4", "opacity-0");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 4000);
}

// Escaping utilities for safe HTML rendering
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(str) {
  if (!str) return "";
  return String(str)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "\\'");
}
