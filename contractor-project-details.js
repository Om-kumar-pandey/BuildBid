/**
 * BuildBid - Dedicated Contractor Project Details Engine
 * Connects directly to authoritative GET /api/contractor/projects/{id}
 * 
 * STRICT COMPLIANCE RULES:
 * 1. Zero raw JSON rendered to contractor.
 * 2. ABSOLUTELY NO ESTIMATED COST / ESTIMATOR OUTPUT rendered anywhere.
 * 3. Customer private identity (phone, email, full street address) is never exposed.
 * 4. All structured data parsed safely with graceful fallbacks.
 */

function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.location) {
        if (
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
        ) {
            return "http://localhost:8080";
        }
    }

    return "https://buildbid-ap3j.onrender.com";
}

const API_BASE_URL = getApiBaseUrl();

function getCleanToken() {
  let token = localStorage.getItem("token") ||
              localStorage.getItem("marketplaceToken") ||
              localStorage.getItem("authToken") ||
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

let activeProjectData = null;

// 1. Session Setup
function setupContractorSession() {
  const nameElem = document.getElementById("top-nav-name");
  const avatarText = document.getElementById("top-nav-avatar-text");

  const rawData = localStorage.getItem("currentUser") ||
                  localStorage.getItem("loggedInUser") ||
                  sessionStorage.getItem("currentUser") ||
                  localStorage.getItem("marketplaceUser");

  if (!rawData) {
    const token = getCleanToken();
    if (!token) {
      alert("Authentication required. Please login as a contractor.");
      window.location.href = "index.html";
      return null;
    }
    if (nameElem) nameElem.textContent = "Contractor";
    if (avatarText) avatarText.textContent = "C";
    return { name: "Contractor", username: "contractor" };
  }

  try {
    const user = JSON.parse(rawData);
    const displayName = user.name || user.companyName || user.username || "Contractor";
    const initials = displayName
      .split(" ")
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "C";

    if (nameElem) nameElem.textContent = displayName;
    if (avatarText) avatarText.textContent = initials;

    return user;
  } catch (e) {
    if (nameElem) nameElem.textContent = "Contractor";
    if (avatarText) avatarText.textContent = "C";
    return { name: "Contractor", username: "contractor" };
  }
}

// 2. Main Page Controller
document.addEventListener("DOMContentLoaded", async () => {
  setupContractorSession();

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id") || urlParams.get("projectId");

  if (!projectId) {
    showErrorState("No Project Selected", "Please select a project from the Live Customer Projects dashboard.");
    return;
  }

  await loadProjectDetails(projectId);
});

// 3. Authoritative Backend Fetch
async function loadProjectDetails(projectId) {
  showLoadingState(true);

  const token = getCleanToken();

  try {
    const res = await fetch(`${API_BASE_URL}/api/contractor/projects/${encodeURIComponent(projectId)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }
    });

    if (res.status === 401) {
      showErrorState("Authentication Required", "Your contractor session has expired. Please log in again to view project details.");
      return;
    }

    if (res.status === 403) {
      showErrorState("Access Restricted", "This section is reserved exclusively for verified BuildBid contractors.");
      return;
    }

    if (res.status === 404) {
      showErrorState("Project Not Found", `Project #${projectId} does not exist or has been closed.`);
      return;
    }

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    activeProjectData = data;
    renderCompleteProjectView(data);

  } catch (err) {
    console.error("Authoritative API fetch error:", err);
    showErrorState("Connection Error", "Unable to retrieve project specifications from the server. Please check your connection and retry.");
  } finally {
    showLoadingState(false);
  }
}

// 4. Render Master View
function renderCompleteProjectView(p) {
  const pId = p.projectId || (p.id ? `PRJ-${p.id}` : "PRJ-UNKNOWN");
  const details = p.details || {};

  // Update Breadcrumb
  const breadcrumbId = document.getElementById("breadcrumb-project-id");
  if (breadcrumbId) breadcrumbId.textContent = pId;

  // SECTION 1: HERO HEADER
  renderHeroHeader(p, details, pId);

  // SECTION 2: OVERVIEW QUICK METRICS
  renderOverviewMetrics(p, details);

  // SECTION 3: SITE & PLOT PARAMETERS
  renderSiteParameters(p, details);

  // SECTION 4: FLOOR-BY-FLOOR REQUIREMENTS
  renderFloorRequirements(p, details);

  // SECTION 5: BASEMENT ENGINEERING & SPACES (Conditional)
  renderBasementEngineering(p, details);

  // SECTION 6: CATEGORY-SPECIFIC REQUIREMENTS (Conditional per project type)
  renderCategorySpecificDetails(p, details);

  // SECTION 7: SCOPE OF WORK CHECKLIST
  renderScopeOfWork(p, details);

  // SECTION 8: CUSTOMER DESCRIPTION
  renderCustomerDescription(p);

  // SECTION 9 & 10: COMMERCIAL SIDEBAR (STRICTLY NO ESTIMATED COST)
  renderCommercialSidebar(p, details, pId);

  // Reveal main content
  const content = document.getElementById("project-details-content");
  if (content) content.style.display = "block";
}

// SECTION 1: HERO HEADER
function renderHeroHeader(p, details, pId) {
  const title = p.projectTitle || p.title || "BuildBid Project";
  const category = p.projectType || p.type || "New Construction";
  const status = (p.status === "OPEN" || !p.status) ? "Open for Bidding" : p.status;
  const quality = p.qualityTier || "Standard";
  const location = p.location || (p.city ? `${p.city}, ${p.state || ""}` : "Location Not Specified");
  const dateStr = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : (p.postedDate || "Recent");

  const areaVal = p.builtUpArea || p.totalArea || details.totalArea;
  const scaleText = areaVal ? `${Number(areaVal).toLocaleString("en-IN")} sq.ft.` : (p.plotArea ? `${p.plotArea} sq.ft. (Plot)` : "Area on quotation");

  const elTitle = document.getElementById("hero-title");
  if (elTitle) elTitle.textContent = title;

  const elStatus = document.getElementById("hero-status");
  if (elStatus) elStatus.textContent = status;

  const elId = document.getElementById("hero-project-id");
  if (elId) elId.textContent = pId;

  const elCategory = document.getElementById("hero-category");
  if (elCategory) elCategory.textContent = category;

  const elTier = document.getElementById("hero-tier");
  if (elTier) elTier.textContent = `${quality} Quality`;

  const elLoc = document.getElementById("hero-location");
  if (elLoc) elLoc.textContent = location;

  const elDate = document.getElementById("hero-date");
  if (elDate) elDate.textContent = dateStr;

  const elScale = document.getElementById("hero-scale");
  if (elScale) elScale.textContent = scaleText;

  // Stated Customer Budget (Customer's own stated expectation only)
  const budgetFormatted = formatCustomerBudget(p);
  const elBudget = document.getElementById("hero-budget");
  if (elBudget) elBudget.textContent = budgetFormatted;

  const elPayPref = document.getElementById("hero-payment-pref");
  if (elPayPref) {
    elPayPref.textContent = p.paymentPreference ? `Payment: ${p.paymentPreference}` : "Payment Preference: Milestone Based";
  }
}

// SECTION 2: OVERVIEW QUICK METRICS
function renderOverviewMetrics(p, details) {
  const container = document.getElementById("overview-metrics-container");
  if (!container) return;

  const tiles = [];

  // Built-up Area
  const builtUp = p.builtUpArea || p.totalArea || details.totalArea;
  if (builtUp) {
    tiles.push({
      icon: "fa-solid fa-ruler-combined",
      color: "blue",
      label: "Built-up Area",
      value: `${Number(builtUp).toLocaleString("en-IN")} sq.ft.`
    });
  }

  // Plot Area
  const plot = p.plotArea || details.plotArea;
  if (plot) {
    tiles.push({
      icon: "fa-solid fa-vector-square",
      color: "green",
      label: "Plot Area",
      value: `${Number(plot).toLocaleString("en-IN")} sq.ft.`
    });
  }

  // Floor Count
  let floorText = "1 Floor";
  const parsedFloors = parseFloorsData(p, details);
  if (Array.isArray(parsedFloors) && parsedFloors.length > 0) {
    floorText = `${parsedFloors.length} Floor${parsedFloors.length > 1 ? "s" : ""}`;
  } else if (p.floors) {
    const rawF = String(p.floors).trim();
    if (!rawF.startsWith("[") && !rawF.startsWith("{")) {
      floorText = rawF.includes("Floor") ? rawF : `${rawF} Floors`;
    }
  }
  tiles.push({
    icon: "fa-solid fa-layer-group",
    color: "purple",
    label: "Construction Floors",
    value: floorText
  });

  // Quality Tier
  tiles.push({
    icon: "fa-solid fa-medal",
    color: "amber",
    label: "Quality Specification",
    value: p.qualityTier || "Standard Finish"
  });

  // Construction Purpose (if specified)
  const purpose = details.purpose || p.purpose;
  if (purpose) {
    tiles.push({
      icon: "fa-solid fa-house-chimney",
      color: "slate",
      label: "Building Purpose",
      value: purpose
    });
  }

  // Basement presence flag
  const hasBasement = details.hasBasement === true || p.hasBasement === true || Boolean(details.basementDetails);
  tiles.push({
    icon: "fa-solid fa-dungeon",
    color: hasBasement ? "green" : "slate",
    label: "Basement Floor",
    value: hasBasement ? "Required" : "None"
  });

  container.innerHTML = tiles.map(t => `
    <div class="metric-tile">
      <div class="metric-tile-icon ${t.color}">
        <i class="${t.icon}"></i>
      </div>
      <div class="metric-tile-content">
        <span class="metric-label">${escapeHTML(t.label)}</span>
        <span class="metric-value">${escapeHTML(t.value)}</span>
      </div>
    </div>
  `).join("");
}

// SECTION 3: SITE & PLOT PARAMETERS
function renderSiteParameters(p, details) {
  const container = document.getElementById("site-specs-container");
  if (!container) return;

  const items = [];

  // City & State
  if (p.city || p.state) {
    items.push({ label: "City & State", val: `${p.city || ""}${p.city && p.state ? ", " : ""}${p.state || ""}` });
  }

  // PIN Code
  if (p.pincode) {
    items.push({ label: "Postal PIN Code", val: p.pincode });
  }

  // Plot Facing
  if (details.plotFacing || p.plotFacing) {
    items.push({ label: "Plot Orientation / Facing", val: details.plotFacing || p.plotFacing });
  }

  // Corner Plot
  if (details.cornerPlot || p.cornerPlot) {
    items.push({ label: "Corner Plot Property", val: details.cornerPlot || p.cornerPlot });
  }

  // Project Category
  items.push({ label: "Category", val: p.projectType || p.type || "General Construction" });

  if (items.length === 0) {
    document.getElementById("site-specs-card").style.display = "none";
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="spec-attr-item">
      <span class="attr-label">${escapeHTML(item.label)}</span>
      <span class="attr-val">${escapeHTML(item.val)}</span>
    </div>
  `).join("");
}

// SECTION 4: FLOOR-BY-FLOOR REQUIREMENTS
function renderFloorRequirements(p, details) {
  const card = document.getElementById("floor-requirements-card");
  const tabsBar = document.getElementById("detail-floor-tabs-bar");
  const panesContainer = document.getElementById("detail-floor-panes-container");
  const countBadge = document.getElementById("floor-count-badge");

  if (!card || !tabsBar || !panesContainer) return;

  const floorsList = parseFloorsData(p, details);

  if (!floorsList || !Array.isArray(floorsList) || floorsList.length === 0) {
    // If no floor breakdown array is available, check for a simple count
    const simpleFloorCount = p.floors || details.floors;
    if (simpleFloorCount && typeof simpleFloorCount !== "object" && !String(simpleFloorCount).startsWith("[")) {
      tabsBar.style.display = "none";
      countBadge.textContent = `${simpleFloorCount} Floor${Number(simpleFloorCount) > 1 ? "s" : ""}`;
      panesContainer.innerHTML = `
        <div class="floor-summary-row">
          <span class="fl-title"><i class="fa-solid fa-stairs" style="color:var(--primary); margin-right:8px;"></i> Total Building Levels</span>
          <span class="fl-area">${escapeHTML(String(simpleFloorCount))} Floors</span>
        </div>
        <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Detailed room-by-room breakdown not specified by customer. Floor count provided above.</p>
      `;
      return;
    }

    card.style.display = "none";
    return;
  }

  card.style.display = "block";
  countBadge.textContent = `${floorsList.length} Floor${floorsList.length > 1 ? "s" : ""}`;
  tabsBar.innerHTML = "";
  panesContainer.innerHTML = "";

  floorsList.forEach((floor, idx) => {
    const floorName = floor.floorName || getFloorOrdinalName(idx);
    const approxArea = floor.approxArea ? `${Number(floor.approxArea).toLocaleString("en-IN")} sq.ft.` : "Area per layout";
    const rooms = safeJsonObject(floor.rooms);
    const roomAreas = safeJsonRoomAreas(floor.roomAreas);
    const specialReqs = typeof floor.specialRequirements === "string" ? floor.specialRequirements : "";

    // Tab Button
    const tabBtn = document.createElement("button");
    tabBtn.type = "button";
    tabBtn.className = `floor-tab-btn ${idx === 0 ? "active" : ""}`;
    tabBtn.innerHTML = `<i class="fa-solid fa-stairs"></i> ${escapeHTML(floorName)}`;
    tabBtn.onclick = () => switchFloorTab(idx);
    tabsBar.appendChild(tabBtn);

    // Tab Pane
    const pane = document.createElement("div");
    pane.className = `floor-pane ${idx === 0 ? "active" : ""}`;
    pane.id = `detailFloorPane-${idx}`;

    let paneHtml = `
      <div class="floor-summary-row">
        <span class="fl-title"><i class="fa-solid fa-layer-group" style="color:var(--primary); margin-right:6px;"></i> ${escapeHTML(floorName)}</span>
        <span class="fl-area">${escapeHTML(approxArea)}</span>
      </div>
    `;

    // Filter active rooms (count > 0)
    const activeRooms = Object.entries(rooms).filter(([_, count]) => Number(count) > 0);

    if (activeRooms.length > 0) {
      paneHtml += `
        <div class="subheading-row"><i class="fa-solid fa-door-open"></i> Room Spaces Required</div>
        <div class="room-breakdown-grid">
      `;

      activeRooms.forEach(([rName, count]) => {
        const iconClass = getRoomIconClass(rName);
        paneHtml += `
          <div class="room-card">
            <div class="room-card-info">
              <i class="${iconClass}"></i>
              <span class="room-card-name">${escapeHTML(rName)}</span>
            </div>
            <span class="room-card-badge">${count}</span>
          </div>
        `;
      });

      paneHtml += `</div>`;
    }

    // Individual room dimensions (if customer entered them)
    const dimEntries = Object.entries(roomAreas).filter(([_, area]) => Number(area) > 0);
    if (dimEntries.length > 0) {
      paneHtml += `
        <div class="subheading-row" style="margin-top:1.25rem;"><i class="fa-solid fa-ruler-combined"></i> Specified Space Dimensions</div>
        <div class="room-dim-list">
      `;

      dimEntries.forEach(([key, area]) => {
        const readableLabel = key.replace(/_/g, " ");
        paneHtml += `
          <div class="room-dim-chip">
            <span>${escapeHTML(readableLabel)}</span>
            <strong>${Number(area).toLocaleString("en-IN")} sq.ft.</strong>
          </div>
        `;
      });

      paneHtml += `</div>`;
    }

    // Special floor requirements/notes
    if (specialReqs.trim()) {
      paneHtml += `
        <div class="floor-notes-box">
          <strong><i class="fa-solid fa-pen-to-square"></i> Special Requirements for ${escapeHTML(floorName)}:</strong>
          <span>${escapeHTML(specialReqs)}</span>
        </div>
      `;
    }

    if (activeRooms.length === 0 && dimEntries.length === 0 && !specialReqs.trim()) {
      paneHtml += `<p style="font-size:0.85rem; color:var(--slate-500); margin:0.75rem 0;">No specific room counters added for this floor.</p>`;
    }

    pane.innerHTML = paneHtml;
    panesContainer.appendChild(pane);
  });
}

function switchFloorTab(index) {
  document.querySelectorAll(".floor-tab-btn").forEach((b, i) => b.classList.toggle("active", i === index));
  document.querySelectorAll(".floor-pane").forEach((p, i) => p.classList.toggle("active", i === index));
}

// SECTION 5: BASEMENT ENGINEERING & SPACES (Conditional)
function renderBasementEngineering(p, details) {
  const card = document.getElementById("basement-details-card");
  const container = document.getElementById("basement-details-container");
  if (!card || !container) return;

  const hasBasement = details.hasBasement === true || p.hasBasement === true || Boolean(details.basementDetails);

  if (!hasBasement) {
    card.style.display = "none";
    return;
  }

  const rawBData = details.basementDetails || p.basementDetails || {};
  const bData = (typeof rawBData === "object" && rawBData !== null && !Array.isArray(rawBData))
    ? rawBData
    : (safeJsonParse(rawBData, null) || {});
  const approxArea = bData.approxArea ? `${Number(bData.approxArea).toLocaleString("en-IN")} sq.ft.` : "Area per layout";
  const rooms = safeJsonObject(bData.rooms);
  const roomAreas = safeJsonRoomAreas(bData.roomAreas);
  const features = Array.isArray(bData.features) ? bData.features : parseGenericList(bData.features);
  const specialReqs = typeof bData.specialRequirements === "string" ? bData.specialRequirements : "";

  card.style.display = "block";

  let html = `
    <div class="basement-overview-row">
      <span><i class="fa-solid fa-water-ladder" style="color:#059669; margin-right:8px;"></i> Basement Civil Specification</span>
      <strong>Approx. Basement Scale: ${escapeHTML(approxArea)}</strong>
    </div>
  `;

  // Basement rooms / spaces
  const activeSpaces = Object.entries(rooms).filter(([_, count]) => Number(count) > 0);
  if (activeSpaces.length > 0) {
    html += `
      <div class="subheading-row"><i class="fa-solid fa-warehouse"></i> Basement Spaces & Dedicated Facilities</div>
      <div class="room-breakdown-grid">
    `;

    activeSpaces.forEach(([spaceName, count]) => {
      html += `
        <div class="room-card">
          <div class="room-card-info">
            <i class="fa-solid fa-dungeon"></i>
            <span class="room-card-name">${escapeHTML(spaceName)}</span>
          </div>
          <span class="room-card-badge">${count}</span>
        </div>
      `;
    });

    html += `</div>`;
  }

  // Basement individual dimensions
  const dimEntries = Object.entries(roomAreas).filter(([_, area]) => Number(area) > 0);
  if (dimEntries.length > 0) {
    html += `
      <div class="subheading-row" style="margin-top:1.25rem;"><i class="fa-solid fa-ruler"></i> Basement Space Dimensions</div>
      <div class="room-dim-list">
    `;

    dimEntries.forEach(([key, area]) => {
      const readableLabel = key.replace(/_/g, " ");
      html += `
        <div class="room-dim-chip">
          <span>${escapeHTML(readableLabel)}</span>
          <strong>${Number(area).toLocaleString("en-IN")} sq.ft.</strong>
        </div>
      `;
    });

    html += `</div>`;
  }

  // Civil Provisions & Waterproofing Scope
  if (Array.isArray(features) && features.length > 0) {
    html += `
      <div class="subheading-row" style="margin-top:1.25rem;"><i class="fa-solid fa-shield-halved"></i> Critical Basement Civil & Waterproofing Scope</div>
      <div class="civil-features-grid">
    `;

    features.forEach(feat => {
      html += `
        <div class="civil-feature-pill">
          <i class="fa-solid fa-circle-check"></i>
          <span>${escapeHTML(feat)}</span>
        </div>
      `;
    });

    html += `</div>`;
  }

  // Special basement requirements
  if (specialReqs.trim()) {
    html += `
      <div class="floor-notes-box" style="background:#f0fdf4; border-color:#bbf7d0; color:#166534; margin-top:1.25rem;">
        <strong><i class="fa-solid fa-circle-info"></i> Specific Basement Requirements:</strong>
        <span>${escapeHTML(specialReqs)}</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

// SECTION 6: CATEGORY-SPECIFIC REQUIREMENTS
function renderCategorySpecificDetails(p, details) {
  const card = document.getElementById("category-specific-card");
  const titleElem = document.getElementById("category-card-title");
  const container = document.getElementById("category-specific-container");
  if (!card || !container) return;

  const projectType = p.projectType || p.type || "New Construction";

  // 1. RENOVATION
  if (projectType === "Renovation" || details.renovationAreas || p.renovationAreas) {
    const rawAreas = details.renovationAreas || p.renovationAreas;
    const areasList = parseGenericList(rawAreas);
    const renovScope = parseGenericList(details.renovScope || p.renovScope);

    if (areasList.length > 0 || renovScope.length > 0 || details.propertyType) {
      card.style.display = "block";
      if (titleElem) titleElem.innerHTML = `<i class="fa-solid fa-paint-roller" style="color:var(--primary); margin-right:8px;"></i> Renovation Specifications`;

      let html = "";

      if (details.propertyType || details.propertyAge) {
        html += `
          <div class="spec-attributes-grid" style="margin-bottom:1.25rem;">
            ${details.propertyType ? `<div class="spec-attr-item"><span class="attr-label">Property Type</span><span class="attr-val">${escapeHTML(details.propertyType)}</span></div>` : ""}
            ${details.propertyAge ? `<div class="spec-attr-item"><span class="attr-label">Property Age</span><span class="attr-val">${escapeHTML(details.propertyAge)} Years</span></div>` : ""}
          </div>
        `;
      }

      if (areasList.length > 0) {
        html += `<div class="subheading-row"><i class="fa-solid fa-vector-square"></i> Areas to Renovate</div>`;
        areasList.forEach(a => {
          const areaName = a.areaName || a.name || "Designated Area";
          const sqft = a.squareFootage ? `${Number(a.squareFootage).toLocaleString("en-IN")} sq.ft.` : "";
          const work = Array.isArray(a.workRequired) ? a.workRequired : [];
          const notes = a.specificNotes || "";

          html += `
            <div class="renov-area-card">
              <div class="renov-area-header">
                <span>${escapeHTML(areaName)}</span>
                ${sqft ? `<span class="area-pill">${escapeHTML(sqft)}</span>` : ""}
              </div>
              ${work.length > 0 ? `
                <div class="scope-pills-row">
                  ${work.map(w => `<span class="scope-mini-pill"><i class="fa-solid fa-check"></i> ${escapeHTML(w)}</span>`).join("")}
                </div>
              ` : ""}
              ${notes.trim() ? `<p style="font-size:0.82rem; color:var(--slate-600); margin:0.6rem 0 0;"><strong>Notes:</strong> ${escapeHTML(notes)}</p>` : ""}
            </div>
          `;
        });
      }

      if (renovScope.length > 0) {
        html += `
          <div class="subheading-row" style="margin-top:1.25rem;"><i class="fa-solid fa-toolbox"></i> Renovation Requirements Checklist</div>
          <div class="scope-pills-row">
            ${renovScope.map(r => `<span class="scope-mini-pill" style="padding:0.4rem 0.8rem; font-size:0.82rem;"><i class="fa-solid fa-check" style="color:var(--primary);"></i> ${escapeHTML(String(r))}</span>`).join("")}
          </div>
        `;
      }

      container.innerHTML = html;
      return;
    }
  }

  // 2. COMMERCIAL
  if (projectType === "Commercial" || details.commercial || p.commercial) {
    const comm = safeJsonParse(details.commercial || p.commercial, {}) || details.commercial || {};

    if (Object.keys(comm).length > 0) {
      card.style.display = "block";
      if (titleElem) titleElem.innerHTML = `<i class="fa-solid fa-building" style="color:var(--primary); margin-right:8px;"></i> Commercial Infrastructure & Compliance`;

      const fireSafety = Array.isArray(comm.fireSafety) ? comm.fireSafety : [];

      let html = `
        <div class="spec-attributes-grid">
          ${comm.category ? `<div class="spec-attr-item"><span class="attr-label">Commercial Category</span><span class="attr-val">${escapeHTML(comm.category)}</span></div>` : ""}
          ${comm.zoning ? `<div class="spec-attr-item"><span class="attr-label">Zoning & Approvals</span><span class="attr-val">${escapeHTML(comm.zoning)}</span></div>` : ""}
          ${comm.floors ? `<div class="spec-attr-item"><span class="attr-label">Floors Structure</span><span class="attr-val">${escapeHTML(comm.floors)}</span></div>` : ""}
          ${comm.floorPlateArea ? `<div class="spec-attr-item"><span class="attr-label">Floor Plate Area</span><span class="attr-val">${Number(comm.floorPlateArea).toLocaleString("en-IN")} sq.ft.</span></div>` : ""}
          ${comm.ceilingHeight ? `<div class="spec-attr-item"><span class="attr-label">Ceiling Height</span><span class="attr-val">${comm.ceilingHeight} ft</span></div>` : ""}
          ${comm.hvac ? `<div class="spec-attr-item"><span class="attr-label">HVAC System</span><span class="attr-val">${escapeHTML(comm.hvac)}</span></div>` : ""}
          ${comm.electricalLoad ? `<div class="spec-attr-item"><span class="attr-label">Electrical Load</span><span class="attr-val">${escapeHTML(comm.electricalLoad)}</span></div>` : ""}
          ${comm.passengerLifts !== undefined ? `<div class="spec-attr-item"><span class="attr-label">Passenger Lifts</span><span class="attr-val">${comm.passengerLifts}</span></div>` : ""}
          ${comm.serviceLifts !== undefined ? `<div class="spec-attr-item"><span class="attr-label">Service Lifts</span><span class="attr-val">${comm.serviceLifts}</span></div>` : ""}
        </div>
      `;

      if (fireSafety.length > 0) {
        html += `
          <div class="subheading-row" style="margin-top:1.25rem;"><i class="fa-solid fa-fire-extinguisher"></i> Fire Safety & Commercial Compliance</div>
          <div class="civil-features-grid">
            ${fireSafety.map(fs => `<div class="civil-feature-pill"><i class="fa-solid fa-circle-check"></i> <span>${escapeHTML(fs)}</span></div>`).join("")}
          </div>
        `;
      }

      container.innerHTML = html;
      return;
    }
  }

  // 3. HOME EXTENSION
  if (projectType === "Home Extension" || details.extensionDetails || p.extensionDetails) {
    const ext = safeJsonParse(details.extensionDetails || p.extensionDetails, {}) || details.extensionDetails || {};

    if (Object.keys(ext).length > 0 || details.existingType) {
      card.style.display = "block";
      if (titleElem) titleElem.innerHTML = `<i class="fa-solid fa-house-chimney-crack" style="color:var(--primary); margin-right:8px;"></i> Extension Parameters`;

      const rooms = safeJsonObject(ext.rooms);
      const activeRooms = Object.entries(rooms).filter(([_, count]) => Number(count) > 0);

      let html = `
        <div class="spec-attributes-grid" style="margin-bottom:1.25rem;">
          ${details.existingType ? `<div class="spec-attr-item"><span class="attr-label">Existing Property Type</span><span class="attr-val">${escapeHTML(details.existingType)}</span></div>` : ""}
          ${ext.type ? `<div class="spec-attr-item"><span class="attr-label">Extension Direction</span><span class="attr-val">${escapeHTML(ext.type)} Extension</span></div>` : ""}
        </div>
      `;

      if (activeRooms.length > 0) {
        html += `
          <div class="subheading-row"><i class="fa-solid fa-door-open"></i> Rooms to Add in Extension</div>
          <div class="room-breakdown-grid">
            ${activeRooms.map(([r, c]) => `
              <div class="room-card">
                <div class="room-card-info">
                  <i class="fa-solid fa-plus-circle"></i>
                  <span class="room-card-name">${escapeHTML(r)}</span>
                </div>
                <span class="room-card-badge">${c}</span>
              </div>
            `).join("")}
          </div>
        `;
      }

      container.innerHTML = html;
      return;
    }
  }

  // 4. INTERIOR / FINISHING
  if (projectType === "Interior" || details.rooms || p.interiorRooms) {
    const rooms = safeJsonObject(details.rooms || p.interiorRooms);
    const scope = parseGenericList(details.scope || p.interiorScope);

    if (Object.keys(rooms).length > 0 || scope.length > 0) {
      card.style.display = "block";
      if (titleElem) titleElem.innerHTML = `<i class="fa-solid fa-couch" style="color:var(--primary); margin-right:8px;"></i> Interior & Finishing Scope`;

      let html = "";

      if (scope.length > 0) {
        html += `
          <div class="subheading-row"><i class="fa-solid fa-list-check"></i> Comprehensive Interior Requirements</div>
          <div class="scope-badges-grid" style="margin-bottom:1.25rem;">
            ${scope.map(s => `<div class="scope-badge-item"><i class="fa-solid fa-check-double"></i> <span>${escapeHTML(String(s))}</span></div>`).join("")}
          </div>
        `;
      }

      const roomEntries = Object.entries(rooms);
      if (roomEntries.length > 0) {
        html += `<div class="subheading-row"><i class="fa-solid fa-door-closed"></i> Room-Specific Scope</div>`;
        roomEntries.forEach(([rName, rData]) => {
          const rScope = Array.isArray(rData.scope) ? rData.scope : [];
          const rNotes = rData.notes || "";

          html += `
            <div class="renov-area-card">
              <div class="renov-area-header"><span>${escapeHTML(rName)}</span></div>
              ${rScope.length > 0 ? `
                <div class="scope-pills-row">
                  ${rScope.map(rs => `<span class="scope-mini-pill"><i class="fa-solid fa-check"></i> ${escapeHTML(rs)}</span>`).join("")}
                </div>
              ` : ""}
              ${rNotes ? `<p style="font-size:0.82rem; color:var(--slate-600); margin-top:0.5rem;"><strong>Notes:</strong> ${escapeHTML(rNotes)}</p>` : ""}
            </div>
          `;
        });
      }

      container.innerHTML = html;
      return;
    }
  }

  // Hide card if no category-specific data applies
  card.style.display = "none";
}

// SECTION 7: SCOPE OF WORK CHECKLIST
function renderScopeOfWork(p, details) {
  const card = document.getElementById("scope-of-work-card");
  const container = document.getElementById("scope-badges-container");
  if (!card || !container) return;

  const rawScope = details.scopeOfWork || p.scopeOfWork;
  const scopeList = parseGenericList(rawScope);

  if (!scopeList || scopeList.length === 0) {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";
  container.innerHTML = scopeList.map(item => `
    <div class="scope-badge-item">
      <i class="fa-solid fa-circle-check"></i>
      <span>${escapeHTML(String(item))}</span>
    </div>
  `).join("");
}

// SECTION 8: CUSTOMER DESCRIPTION
function renderCustomerDescription(p) {
  const descElem = document.getElementById("detail-description-text");
  if (!descElem) return;

  const text = (p.description || "").trim();
  if (text) {
    descElem.textContent = text;
  } else {
    descElem.textContent = "No specific custom notes provided by the customer for this project.";
  }
}

// SECTIONS 9 & 10: COMMERCIAL SIDEBAR (STRICTLY NO ESTIMATED COST)
function renderCommercialSidebar(p, details, pId) {
  // Budget
  const budgetFormatted = formatCustomerBudget(p);
  const elSideBudget = document.getElementById("side-budget-val");
  if (elSideBudget) elSideBudget.textContent = budgetFormatted;

  const elSideRangePill = document.getElementById("side-budget-range-pill");
  if (elSideRangePill) {
    elSideRangePill.textContent = (p.budgetMin && p.budgetMax) ? "Min - Max Stated" : "Customer Expected";
  }

  // Payment Preference
  const elSidePay = document.getElementById("side-payment-pref");
  if (elSidePay) {
    elSidePay.textContent = p.paymentPreference || "Milestone Based";
  }

  // Privacy Preference
  const elSidePriv = document.getElementById("side-privacy-pref");
  if (elSidePriv) {
    elSidePriv.textContent = p.privacyPreference || "Verified Contractors";
  }

  // Target Start Date / Timeline
  const elSideStart = document.getElementById("side-target-start");
  if (elSideStart) {
    elSideStart.textContent = p.targetStartDate || p.timeline || "Flexible / On Agreement";
  }

  // Status
  const elSideStatus = document.getElementById("side-status-val");
  if (elSideStatus) {
    elSideStatus.textContent = (p.status === "OPEN" || !p.status) ? "Open for Bidding" : p.status;
  }

  // Date Posted
  const elSideDate = document.getElementById("side-posted-date");
  if (elSideDate) {
    elSideDate.textContent = p.createdAt
      ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : (p.postedDate || "Recent");
  }

  // Locality Summary
  const elSideLoc = document.getElementById("side-location-summary");
  if (elSideLoc) {
    const locSummary = p.city ? `${p.city}, ${p.state || ""}${p.pincode ? ` (${p.pincode})` : ""}` : (p.location || "Location on request");
    elSideLoc.textContent = locSummary;
  }
}

// 5. Navigation Action to Bid Builder
function handleBidNavigation() {
  if (!activeProjectData) {
    alert("Project details not loaded.");
    return;
  }
  const pId = activeProjectData.projectId || (activeProjectData.id ? `PRJ-${activeProjectData.id}` : "");
  if (!pId) {
    alert("Project ID is missing.");
    return;
  }
  sessionStorage.setItem("selectedProjectId", pId);
  window.location.href = `contractor-bid-builder.html?projectId=${encodeURIComponent(pId)}`;
}

// 6. Safe Parsing Helpers
function getFloorOrdinalName(idx) {
  if (idx === 0) return "Ground Floor";
  const j = idx % 10, k = idx % 100;
  let suffix = "th";
  if (j === 1 && k !== 11) suffix = "st";
  else if (j === 2 && k !== 12) suffix = "nd";
  else if (j === 3 && k !== 13) suffix = "rd";
  return `${idx}${suffix} Floor`;
}

function safeJsonObject(val) {
  if (!val) return {};
  if (typeof val === "object" && !Array.isArray(val)) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      } catch (e) {
        return {};
      }
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const obj = {};
          parsed.forEach(item => {
            if (typeof item === "string") {
              obj[item] = 1;
            } else if (item && typeof item === "object") {
              const name = item.name || item.roomName || item.room;
              const count = item.count || item.qty || 1;
              if (name) obj[name] = count;
            }
          });
          return obj;
        }
      } catch (e) {
        return {};
      }
    }
  }
  if (Array.isArray(val)) {
    const obj = {};
    val.forEach(item => {
      if (typeof item === "string") {
        obj[item] = 1;
      } else if (item && typeof item === "object") {
        const name = item.name || item.roomName || item.room;
        const count = item.count || item.qty || 1;
        if (name) obj[name] = count;
      }
    });
    return obj;
  }
  return {};
}

function safeJsonRoomAreas(val) {
  if (!val) return {};
  if (typeof val === "object" && !Array.isArray(val)) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      } catch (e) {
        return {};
      }
    }
  }
  return {};
}

function parseFloorsData(p, details) {
  let floors = details.floors || p.floors;
  if (typeof floors === "string") {
    const trimmed = floors.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        floors = JSON.parse(trimmed);
      } catch (e) {
        // Not valid JSON string
      }
    }
  }

  if (Array.isArray(floors)) return floors;
  if (floors && typeof floors === "object") {
    return Object.values(floors);
  }

  return null;
}

function parseGenericList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  const parsed = safeJsonParse(val, null);
  if (Array.isArray(parsed)) return parsed;
  if (typeof val === "string" && val.includes(",")) {
    return val.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [val];
}

function safeJsonParse(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") return val;
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (!trimmed) return fallback;
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
}

function formatCustomerBudget(p) {
  if (p.budgetMin && p.budgetMax) {
    return `₹${formatIndianCurrency(p.budgetMin)} - ₹${formatIndianCurrency(p.budgetMax)}`;
  }
  if (p.budget) {
    const raw = String(p.budget).trim();
    if (raw.includes("-")) {
      const parts = raw.split("-").map(s => Number(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0) {
        return `₹${formatIndianCurrency(parts[0])} - ₹${formatIndianCurrency(parts[1])}`;
      }
    }
    return raw.startsWith("₹") ? raw : `₹${raw}`;
  }
  return "Negotiable";
}

function formatIndianCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const n = Number(num);
  if (n >= 10000000) {
    return `${(n / 10000000).toFixed(2)} Cr`;
  }
  if (n >= 100000) {
    return `${(n / 100000).toFixed(1)} Lakh`;
  }
  return n.toLocaleString("en-IN");
}

function getRoomIconClass(name) {
  const lower = String(name).toLowerCase();
  if (lower.includes("bed")) return "fa-solid fa-bed";
  if (lower.includes("bath") || lower.includes("toilet") || lower.includes("powder")) return "fa-solid fa-bath";
  if (lower.includes("kitchen")) return "fa-solid fa-kitchen-set";
  if (lower.includes("living")) return "fa-solid fa-couch";
  if (lower.includes("dining")) return "fa-solid fa-utensils";
  if (lower.includes("pooja")) return "fa-solid fa-om";
  if (lower.includes("study")) return "fa-solid fa-book-open";
  if (lower.includes("store")) return "fa-solid fa-boxes-packing";
  if (lower.includes("balcony")) return "fa-solid fa-cloud-sun";
  if (lower.includes("park")) return "fa-solid fa-square-parking";
  if (lower.includes("gym") || lower.includes("fitness")) return "fa-solid fa-dumbbell";
  if (lower.includes("theatre")) return "fa-solid fa-film";
  if (lower.includes("hall")) return "fa-solid fa-people-roof";
  return "fa-solid fa-door-open";
}

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

function showLoadingState(isLoading) {
  const loader = document.getElementById("details-loading-state");
  if (loader) loader.style.display = isLoading ? "block" : "none";
}

function showErrorState(title, desc) {
  showLoadingState(false);
  const errorBox = document.getElementById("details-error-state");
  const titleEl = document.getElementById("error-title");
  const descEl = document.getElementById("error-desc");
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;
  if (errorBox) errorBox.style.display = "block";
}

function logoutUser() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("marketplaceToken");
  localStorage.removeItem("marketplaceUser");
  localStorage.removeItem("token");
  localStorage.removeItem("buildbid_current_user");
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("token");
  window.location.href = "index.html";
}
