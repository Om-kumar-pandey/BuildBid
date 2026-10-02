function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.location) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
  }
  return "https://buildbid-ap3j.onrender.com";
}

const BACKEND_URL = getApiBaseUrl();

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

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("marketplaceToken") || "";
  if (!token) {
    sessionStorage.setItem("pendingRedirect", "create project.html");
    window.location.href = "index.html";
    return;
  }
  syncUniversalUserProfile();
  initEventListeners();
  setLiveDatasetDate();

  const urlParams = new URLSearchParams(window.location.search);
  const existingProjectId = urlParams.get("projectId") || urlParams.get("id");

  if (existingProjectId) {
    await fetchExistingProjectData(existingProjectId);
  } else {
    renderProjectSpecificSections("New Construction");
    recalculateDynamicEstimates();
  }
});

let currentStep = 1;
const projectState = {
  projectType: "New Construction",
  title: "",
  city: "",
  state: "",
  pincode: "",
  address: "",
  calculatedArea: 0,
  qualityTier: "Standard",
  hasBasement: false,
  basementData: { approxArea: 0, rooms: {}, roomAreas: {}, features: [], specialRequirements: "" },
  floorsCount: 1,
  floorsData: [],
  scopeOfWork: [],
  materialResponsibility: {},
  siteReadiness: {},
  renovationAreas: {},
  renovScope: [],
  extensionData: { type: "Vertical", area: 0, rooms: {}, auditDone: "No", roofType: "RCC Slab", staircase: "Internal Staircase", spaceAvailable: "Backyard", excavationAccess: "Easy access" },
  interiorRooms: {},
  interiorScope: [],
  interiorPreferences: { theme: "Modern Minimalist", woodwork: "Factory-made Modular", condition: "Builder Finished" },
  commercialData: { category: "Showroom", totalArea: 0, floors: "", hvac: "Centralized AC", fireSafety: [], electricalLoad: "Standard", passengerLifts: 1, serviceLifts: 0, parkingType: "Basement", bays: 20 },
  industrialData: { purpose: "General Warehouse", structuralType: "PEB", totalArea: 0, clearHeight: 10, flooringType: "VDF", loadCapacity: 5, eotCrane: "No", loadingDocks: 4, fireSafety: [] },
  otherData: { customCategory: "Demolition", description: "", deliverables: [], approximateSize: 0, unit: "sq.ft." }
};

const ROOM_TYPES = [
  "Bedrooms", "Bathrooms", "Living Room", "Dining Room", 
  "Kitchen", "Pooja Room", "Study Room", "Store Room", "Balcony", "Parking", "Utility/Wash Area"
];

const BASEMENT_ROOM_TYPES = [
  "Parking Space", "Store Room", "Gym / Fitness Area", "Home Theatre", 
  "Multi-purpose Hall", "Powder Room / Toilet", "Pantry / Bar Area", "Servant / Driver Room"
];

const BASEMENT_FEATURES = [
  "Box-type Waterproofing",
  "RCC Retaining Shear Walls",
  "Drainage Sump & Submersible Pump",
  "Mechanical Exhaust / Ventilation Shaft",
  "Emergency Egress / Secondary Exit",
  "Sewage Lifting / Ejector Pump"
];

/* =========================================================
   BACKEND FETCH ENGINE
   ========================================================= */
function getAuthToken() {
  return getCleanToken();
}

async function fetchProjectConfiguration(projectType) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/projects/config?type=${encodeURIComponent(projectType)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
    });
    if (response.ok) return await response.json();
  } catch (error) {
    console.warn("Backend unavailable:", error);
  }
  return null;
}

async function fetchExistingProjectData(projectId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/customer/projects/${projectId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
    });

    if (response.ok) {
      const project = await response.json();
      projectState.projectType = project.projectType || "New Construction";
      projectState.title = project.projectTitle || "";
      projectState.calculatedArea = project.totalArea || 0;
      projectState.qualityTier = project.qualityTier || "Standard";

      if (project.location) {
        projectState.city = project.location.city || "";
        projectState.state = project.location.state || "";
        projectState.pincode = project.location.pincode || "";
        projectState.address = project.location.address || "";
        if (document.getElementById("cityInput")) document.getElementById("cityInput").value = projectState.city;
        if (document.getElementById("stateSelect")) document.getElementById("stateSelect").value = projectState.state;
        if (document.getElementById("pincodeInput")) document.getElementById("pincodeInput").value = projectState.pincode;
        if (document.getElementById("addressInput")) document.getElementById("addressInput").value = projectState.address;
        updateLocationInfo();
      }

      if (document.getElementById("projectTitleInput")) {
        document.getElementById("projectTitleInput").value = projectState.title;
      }

      document.querySelectorAll(".type-card").forEach(c => {
        const text = c.querySelector("h4")?.textContent.trim();
        c.classList.toggle("selected", text === projectState.projectType);
      });

      renderProjectSpecificSections(projectState.projectType);

      if (document.getElementById("builtUpAreaInput")) {
        document.getElementById("builtUpAreaInput").value = projectState.calculatedArea || "";
      }

      if (project.hasBasement !== undefined) {
        projectState.hasBasement = project.hasBasement;
        const bSelect = document.getElementById("basementSelect");
        if (bSelect) {
          bSelect.value = projectState.hasBasement ? "Yes" : "No";
          toggleBasement(projectState.hasBasement ? "Yes" : "No");
        }
      }

      if (project.floors) {
        projectState.floorsData = project.floors;
        projectState.floorsCount = project.floors.length || 1;
        renderTabsAndPanes();
      }

      if (project.commercial) {
        try {
          projectState.commercialData = typeof project.commercial === "string" ? JSON.parse(project.commercial) : project.commercial;
        } catch (e) {
          console.warn("Could not parse existing commercial data:", e);
        }
      }

      recalculateDynamicEstimates();
      return;
    }
  } catch (error) {
    console.warn("Local storage check fallback:", error);
  }

  const localList = JSON.parse(localStorage.getItem("allListedProjects") || "[]");
  const localProj = localList.find(p => p.id === projectId);
  if (localProj) {
    projectState.projectType = localProj.category;
    renderProjectSpecificSections(localProj.category);
    recalculateDynamicEstimates();
  }
}

async function selectProjectType(type, elem) {
  projectState.projectType = type;
  document.querySelectorAll(".type-card").forEach(c => c.classList.remove("selected"));
  if (elem) elem.classList.add("selected");

  await fetchProjectConfiguration(type);
  renderProjectSpecificSections(type);
  recalculateDynamicEstimates();
}

/* =========================================================
   DYNAMIC FORM ENGINE
   ========================================================= */
function renderProjectSpecificSections(type) {
  const step2Box = document.getElementById("step2DynamicFields");
  const step3Box = document.getElementById("step3DynamicContainer");
  if (!step2Box || !step3Box) return;

  step2Box.innerHTML = "";
  step3Box.innerHTML = "";

  /* 1. NEW CONSTRUCTION */
  if (type === "New Construction") {
    step2Box.innerHTML = `
      <div class="form-grid-2">
        <div class="field-group">
          <label>Construction Purpose *</label>
          <select id="ncPurpose" class="form-input">
            <option>Residential House</option><option>Villa</option><option>Duplex</option><option>Farmhouse</option><option>Rental Property</option><option>Other</option>
          </select>
        </div>
        <div class="field-group">
          <label>Plot Area (sq.ft.)</label>
          <input type="number" id="plotAreaInput" class="form-input" placeholder="e.g. 3000">
        </div>
        <div class="field-group">
          <label>Plot Dimensions (Length x Width ft)</label>
          <div class="input-inline-grid">
            <input type="number" class="form-input" placeholder="Length (ft)">
            <input type="number" class="form-input" placeholder="Width (ft)">
          </div>
        </div>
        <div class="field-group">
          <label>Plot Facing</label>
          <select id="ncPlotFacing" class="form-input">
            <option>North</option><option>East</option><option>West</option><option>South</option><option>North-East</option><option>North-West</option><option>South-East</option><option>South-West</option>
          </select>
        </div>
        <div class="field-group">
          <label>Road Width (ft)</label>
          <input type="number" class="form-input" placeholder="e.g. 30">
        </div>
        <div class="field-group">
          <label>Corner Plot?</label>
          <select id="ncCornerPlot" class="form-input">
            <option value="No">No</option><option value="Yes">Yes</option>
          </select>
        </div>
      </div>
      <div class="field-group full-width mt-3">
        <label>Project Description (Optional)</label>
        <textarea id="ncDescription" rows="3" class="form-input" placeholder="Describe what you want to build (Optional)..."></textarea>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-layer-group"></i> Construction Scale</div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Total Built-up Area (sq.ft.) *</label>
            <input type="number" id="builtUpAreaInput" class="form-input" placeholder="e.g. 2400" oninput="recalculateDynamicEstimates()">
          </div>

          <div class="field-group">
            <label>Number of Floors *</label>
            <div class="floor-selection-container" style="display: flex; gap: 8px;">
              <select id="numFloorsSelect" class="form-input" onchange="handleFloorSelectionChange(this.value)">
                <option value="1">Ground Floor Only</option>
                <option value="2">G + 1 Floor</option>
                <option value="3">G + 2 Floors</option>
                <option value="4">G + 3 Floors</option>
                <option value="5">G + 4 Floors</option>
                <option value="custom">Custom (Specify)</option>
              </select>
              <input 
                type="number" 
                id="customFloorsInput" 
                class="form-input" 
                placeholder="Count" 
                min="1" 
                max="50" 
                style="display:none; width: 110px;" 
                oninput="handleCustomFloorInput(this.value)"
              />
            </div>
          </div>

          <div class="field-group">
            <label>Basement Required? *</label>
            <select id="basementSelect" class="form-input" onchange="toggleBasement(this.value)">
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-stairs"></i> Floor-wise Detailed Requirements</div>
        <div class="floor-tab-bar" id="floorTabBar"></div>
        <div id="floorPanesContainer"></div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-screwdriver-wrench"></i> Scope of Work Categories</div>
        <div class="room-pill-grid">
          ${["Site Preparation", "Excavation & Foundation", "RCC Structural Frame", "Brickwork & Plastering", "Electrical Piping & Wiring", "Plumbing & Sanitary", "Waterproofing", "Flooring & Tiling", "Doors & Windows", "Painting & Finishing"].map(item => `
            <label class="checkbox-pill">
              <input type="checkbox" onchange="toggleGenericCheckbox('scopeOfWork', '${item}', this.checked)">
              <span>${item}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-faucet-drip"></i> Site Readiness & Utilities</div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Current Site Condition</label>
            <select class="form-input"><option>Plain Empty Land</option><option>Old Structure to Demolish</option><option>Needs Leveling/Clearing</option></select>
          </div>
          <div class="field-group">
            <label>Water Connection Available?</label>
            <select class="form-input"><option>Yes, Available on site</option><option>No, Need Borewell / Tanker</option></select>
          </div>
          <div class="field-group">
            <label>Electricity Source</label>
            <select class="form-input"><option>Temporary Meter Available</option><option>Nearby pole available</option><option>Generator required</option></select>
          </div>
          <div class="field-group">
            <label>Heavy Vehicle Access (Transit Mixers/JCB)</label>
            <select class="form-input"><option>Direct Wide Road Access</option><option>Narrow Road (Manual handling needed)</option></select>
          </div>
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-compass-drafting"></i> Design, Quality & Plans</div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Architectural Plans Available?</label>
            <select class="form-input"><option>Yes, I have complete drawings</option><option>Partial (2D plan only)</option><option>No, need contractor assistance</option></select>
          </div>
          <div class="field-group">
            <label>Construction Quality Tier *</label>
            <select id="ncQualitySelect" class="form-input" onchange="updateTier(this.value)">
              <option value="Standard">Standard Finish (Ultratech, Primary Steel, Vitrified Tiles)</option>
              <option value="Basic">Basic Quality (Standard materials)</option>
              <option value="Premium">Premium / Luxury (Italian Marble, Automation, Branded Fittings)</option>
            </select>
          </div>
        </div>
      </div>
    `;
    generateFloorTabs(1);
  }

  /* 2. RENOVATION */
  else if (type === "Renovation") {
    step2Box.innerHTML = `
      <div class="form-grid-2">
        <div class="field-group">
          <label>Property Type *</label>
          <select id="renovPropertyType" class="form-input">
            <option>Apartment</option><option>Independent House</option><option>Villa</option><option>Commercial Space</option><option>Other</option>
          </select>
        </div>
        <div class="field-group">
          <label>Property Age (Years)</label>
          <input type="number" id="renovAge" class="form-input" placeholder="e.g. 15">
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-vector-square"></i> Areas to Renovate *</div>
        <p class="helper-text" style="margin-bottom:10px;">Select at least one area to renovate and specify its dimensions.</p>
        <div class="room-pill-grid" id="renovationAreaCheckboxes">
          ${["Kitchen", "Bathroom(s)", "Living Room", "Bedroom(s)", "Exterior", "Entire Property"].map(area => `
            <label class="checkbox-pill">
              <input type="checkbox" onchange="toggleRenovationAreaTab('${area}', this.checked)">
              <span>${area}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div id="renovationDynamicAreaTabsContainer" class="mt-3"></div>
      
      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-paint-roller"></i> Renovation Requirements</div>
        <div class="room-pill-grid">
          ${["Wall Putty & Repainting", "Tile Overlap/Replacement", "Plumbing Fixture Upgrade", "False Ceiling & Profile Lights", "Dampness / Seelan Treatment", "Door & Window Replacement", "Cabinetry / Wardrobes"].map(req => `
            <label class="checkbox-pill">
              <input type="checkbox" onchange="toggleGenericCheckbox('renovScope', '${req}', this.checked)">
              <span>${req}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-swatchbook"></i> Material Sourcing & Finish</div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Desired Finish Quality *</label>
            <select class="form-input" onchange="updateTier(this.value)">
              <option value="Standard">Standard Finish</option><option value="Basic">Basic Quality</option><option value="Premium">Premium / Luxury</option>
            </select>
          </div>
          <div class="field-group">
            <label>Material Sourcing</label>
            <select class="form-input">
              <option>Contractor to provide all materials</option><option>I will provide materials</option><option>Mix of both</option>
            </select>
          </div>
        </div>
      </div>
    `;
    projectState.renovationAreas = {};
  }

  /* 3. HOME EXTENSION */
  else if (type === "Home Extension") {
    step2Box.innerHTML = `
      <div class="form-grid-2">
        <div class="field-group">
          <label>Existing Property Type *</label>
          <select id="extExistingType" class="form-input">
            <option>Independent House</option><option>Villa</option><option>Farmhouse</option><option>Commercial</option>
          </select>
        </div>
        <div class="field-group">
          <label>Current Floors *</label>
          <select id="extCurrentFloors" class="form-input">
            <option>Ground only</option><option>G+1</option><option>G+2</option>
          </select>
        </div>
        <div class="field-group">
          <label>Age of Existing Property (Years)</label>
          <input type="number" class="form-input" placeholder="e.g. 10">
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-arrows-up-down-left-right"></i> Direction of Extension *</div>
        <div class="input-inline-grid">
          <label class="checkbox-pill"><input type="radio" name="extDirection" value="Vertical" checked onchange="toggleExtensionDirection('Vertical')"> <span>Vertical (Adding a floor)</span></label>
          <label class="checkbox-pill"><input type="radio" name="extDirection" value="Horizontal" onchange="toggleExtensionDirection('Horizontal')"> <span>Horizontal (Expanding footprint)</span></label>
        </div>
        <div class="field-group mt-3">
          <label>New Built-up Area to Add (sq.ft.) *</label>
          <input type="number" id="builtUpAreaInput" class="form-input" placeholder="e.g. 1100" oninput="recalculateDynamicEstimates()">
        </div>
      </div>
      <div id="extensionDynamicSection" class="spec-section mt-3"></div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-door-closed"></i> Rooms to Add in Extension</div>
        <div class="room-counter-grid">
          ${["Bedrooms", "Bathrooms", "Living Room", "Balcony", "Kitchenette"].map(r => `
            <div class="room-counter-item">
              <span>${r}</span>
              <div class="qty-control">
                <button type="button" class="qty-btn" onclick="adjustExtensionRoom('${r}', -1)">-</button>
                <span class="qty-val" id="qty-ext-${r}">0</span>
                <button type="button" class="qty-btn" onclick="adjustExtensionRoom('${r}', 1)">+</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-link"></i> Structural Tie-in & Requirements</div>
        <div class="room-pill-grid">
          ${["Roof Waterproofing Tie-in", "Plumbing Stack Extension", "Electrical Panel Upgrade", "New Staircase Construction", "Balcony Railings"].map(item => `
            <label class="checkbox-pill"><input type="checkbox"> <span>${item}</span></label>
          `).join('')}
        </div>
      </div>
    `;
    toggleExtensionDirection("Vertical");
  }

  /* 4. INTERIOR */
  else if (type === "Interior") {
    step2Box.innerHTML = `
      <div class="form-grid-2">
        <div class="field-group">
          <label>Property Type *</label>
          <select class="form-input"><option>Apartment</option><option>Independent House</option><option>Villa</option><option>Commercial Office</option><option>Retail Shop</option></select>
        </div>
        <div class="field-group">
          <label>Current Condition *</label>
          <select class="form-input"><option>Bare Shell (No flooring/wiring)</option><option>Builder Finished</option><option>Old/Furnished (Requires dismantling)</option></select>
        </div>
        <div class="field-group">
          <label>Carpet Area (sq.ft.) *</label>
          <input type="number" id="builtUpAreaInput" class="form-input" placeholder="e.g. 1450" oninput="recalculateDynamicEstimates()">
        </div>
        <div class="field-group">
          <label>Ceiling Height (ft)</label>
          <input type="number" class="form-input" placeholder="e.g. 10">
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-palette"></i> Design Vision & Preference</div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Preferred Theme</label>
            <select class="form-input">
              <option>Modern Minimalist</option><option>Contemporary</option><option>Traditional / Classic</option><option>Industrial</option><option>Bohemian</option>
            </select>
          </div>
          <div class="field-group">
            <label>Woodwork Preference *</label>
            <select class="form-input">
              <option>Factory-made Modular</option><option>On-site Custom Carpentry</option><option>Mix of both</option>
            </select>
          </div>
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-list-check"></i> Comprehensive Interior Requirements</div>
        <div class="room-pill-grid">
          ${["Full False Ceiling (POP/Gypsum)", "Profile LED & Ambient Lighting", "Modular Kitchen with Island", "Full Height Sliding Wardrobes", "TV Unit & Console", "Shoe Rack & Foyer Design", "Bathroom Vanity Cabinets", "Wall Paneling / Fluted Panels", "Wallpaper / Texture Paint"].map(item => `
            <label class="checkbox-pill">
              <input type="checkbox" onchange="toggleGenericCheckbox('interiorScope', '${item}', this.checked)">
              <span>${item}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-couch"></i> Room-Specific Scope (Select to customize)</div>
        <div class="room-pill-grid">
          ${["Living Room", "Master Bedroom", "Kitchen", "Kids Bedroom", "Guest Bedroom", "Dining Space"].map(r => `
            <label class="checkbox-pill">
              <input type="checkbox" onchange="toggleInteriorRoomAccordion('${r}', this.checked)">
              <span>${r}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div id="interiorRoomsContainer" class="mt-3"></div>
    `;
    projectState.interiorRooms = {};
  }

  /* 5. COMMERCIAL */
  else if (type === "Commercial") {
    step2Box.innerHTML = `
      <div class="form-grid-2">
        <div class="field-group">
          <label>Commercial Category *</label>
          <select id="commCategory" class="form-input" onchange="projectState.commercialData.category = this.value">
            <option>Office Space</option><option>Retail / Mall</option><option selected>Showroom</option><option>Hospital / Clinic</option><option>Hotel / Hospitality</option><option>Educational Institution</option>
          </select>
        </div>
        <div class="field-group">
          <label>Zoning & Approvals *</label>
          <select id="commZoning" class="form-input" onchange="projectState.commercialData.zoning = this.value"><option>Fully Approved (RERA/Local body)</option><option>Land converted for commercial use</option><option>Approval pending</option></select>
        </div>
        <div class="field-group">
          <label>Plot Area (sq.ft.)</label>
          <input type="number" id="plotAreaInput" class="form-input" placeholder="e.g. 12000" oninput="projectState.commercialData.plotArea = parseFloat(this.value)||0">
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-building"></i> Commercial Scale & Floor Plates</div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Total Built-up Area (sq.ft.) *</label>
            <input type="number" id="builtUpAreaInput" class="form-input" placeholder="e.g. 35000" oninput="recalculateDynamicEstimates(); if (projectState.commercialData) projectState.commercialData.totalArea = parseFloat(this.value)||0;">
          </div>
          <div class="field-group">
            <label>Number of Floors (e.g., 2B+G+5)</label>
            <input type="text" id="commFloors" class="form-input" placeholder="e.g. B+G+4" oninput="projectState.commercialData.floors = this.value">
          </div>
          <div class="field-group">
            <label>Typical Floor Plate Area (sq.ft.)</label>
            <input type="number" id="commFloorPlate" class="form-input" placeholder="e.g. 7000" oninput="projectState.commercialData.floorPlateArea = parseFloat(this.value)||0">
          </div>
          <div class="field-group">
            <label>Ceiling Height (ft)</label>
            <input type="number" id="commCeilingHeight" class="form-input" placeholder="e.g. 12" oninput="projectState.commercialData.ceilingHeight = parseFloat(this.value)||0">
          </div>
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-gears"></i> Specialized Infrastructure & Requirements</div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>HVAC System *</label>
            <select id="commHvac" class="form-input" onchange="projectState.commercialData.hvac = this.value"><option>Centralized Chillers</option><option>VRV/VRF System</option><option>Split AC Provision</option><option>None</option></select>
          </div>
          <div class="field-group">
            <label>Electrical Load</label>
            <select id="commElectricalLoad" class="form-input" onchange="projectState.commercialData.electricalLoad = this.value"><option>Heavy Duty (Substation/HT Panel)</option><option>Standard Commercial Load</option></select>
          </div>
          <div class="field-group">
            <label>Passenger Lifts Count</label>
            <input type="number" id="commPassengerLifts" class="form-input" value="${projectState.commercialData.passengerLifts !== undefined ? projectState.commercialData.passengerLifts : 2}" min="0" oninput="projectState.commercialData.passengerLifts = parseInt(this.value)||0">
          </div>
          <div class="field-group">
            <label>Service / Stretcher Lifts Count</label>
            <input type="number" id="commServiceLifts" class="form-input" value="${projectState.commercialData.serviceLifts !== undefined ? projectState.commercialData.serviceLifts : 1}" min="0" oninput="projectState.commercialData.serviceLifts = parseInt(this.value)||0">
          </div>
        </div>
        <label class="mt-2 block" style="font-size:12px; font-weight:700; color:#334155;">Fire Fighting & Commercial Safety (NOC Standards):</label>
        <div class="room-pill-grid mt-1" id="commFireSafetyContainer">
          ${["Sprinklers System", "Smoke Detectors", "Fire Hydrant System", "Fire Escape Staircase", "Commercial Power Backup (DG Set)", "Multi-stall Restrooms", "Glass Facade / Structural Glazing"].map(req => `
            <label class="checkbox-pill"><input type="checkbox" checked onchange="toggleCommFireSafety('${req}', this.checked)"> <span>${req}</span></label>
          `).join('')}
        </div>
      </div>
    `;

    const commCatEl = document.getElementById("commCategory");
    if (commCatEl) {
      commCatEl.value = projectState.commercialData.category || "Showroom";
    }
    const commHvacEl = document.getElementById("commHvac");
    if (commHvacEl && projectState.commercialData.hvac) {
      commHvacEl.value = projectState.commercialData.hvac;
    }
    const commElectEl = document.getElementById("commElectricalLoad");
    if (commElectEl && projectState.commercialData.electricalLoad) {
      commElectEl.value = projectState.commercialData.electricalLoad;
    }
  }

  /* 6. INDUSTRIAL */
  else if (type === "Industrial") {
    step2Box.innerHTML = `
      <div class="form-grid-2">
        <div class="field-group">
          <label>Facility Purpose *</label>
          <select class="form-input">
            <option>General Warehouse</option><option>Manufacturing Factory</option><option>Cold Storage</option><option>Logistics Hub</option><option>Assembly Plant</option>
          </select>
        </div>
        <div class="field-group">
          <label>Zoning & Compliance *</label>
          <select class="form-input"><option>Approved Industrial Zone</option><option>Non-Agricultural (NA) Land</option><option>Pending Approval</option></select>
        </div>
        <div class="field-group">
          <label>Total Plot Area (sq.ft.)</label>
          <input type="number" class="form-input" placeholder="e.g. 50000">
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-industry"></i> Structure & Scale</div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Total Built-up Area (sq.ft.) *</label>
            <input type="number" id="builtUpAreaInput" class="form-input" placeholder="e.g. 40000" oninput="recalculateDynamicEstimates()">
          </div>
          <div class="field-group">
            <label>Structural Type *</label>
            <select id="indStructuralType" class="form-input" onchange="recalculateDynamicEstimates()">
              <option value="PEB">PEB (Pre-Engineered Steel)</option><option value="RCC">RCC (Concrete Structure)</option><option value="Hybrid">Hybrid (PEB + RCC)</option>
            </select>
          </div>
          <div class="field-group">
            <label>Clear Height / Eaves Height (Meters)</label>
            <input type="number" class="form-input" placeholder="e.g. 10">
          </div>
          <div class="field-group">
            <label>Max Column-free Span (Meters)</label>
            <input type="number" class="form-input" placeholder="e.g. 24">
          </div>
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-truck-ramp-box"></i> Industrial Requirements</div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Flooring Type *</label>
            <select class="form-input"><option>VDF / Tremix Heavy Flooring</option><option>Epoxy Coated</option><option>Standard Concrete</option></select>
          </div>
          <div class="field-group">
            <label>Floor Load Capacity (Tonnes / sq.m)</label>
            <input type="number" class="form-input" placeholder="e.g. 6">
          </div>
          <div class="field-group">
            <label>Number of Loading Docks</label>
            <input type="number" class="form-input" value="4">
          </div>
          <div class="field-group">
            <label>EOT Overhead Crane Capacity</label>
            <select class="form-input"><option>None</option><option>5 Tonnes</option><option>10 Tonnes</option><option>Over 15 Tonnes</option></select>
          </div>
        </div>
        <label class="mt-2 block" style="font-size:12px; font-weight:700; color:#334155;">Industrial Utility & Safety Features:</label>
        <div class="room-pill-grid mt-1">
          ${["Motorized Rolling Shutters", "Hydraulic Dock Levelers", "Turbo Ridge Roof Ventilators", "Roof PUF Insulation", "High-capacity Stormwater Yard", "Heavy Truck Weighbridge", "3-Phase Heavy HT Power"].map(req => `
            <label class="checkbox-pill"><input type="checkbox" checked> <span>${req}</span></label>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* 7. OTHER */
  else if (type === "Other") {
    step2Box.innerHTML = `
      <div class="form-grid-2">
        <div class="field-group">
          <label>Custom Category *</label>
          <select id="otherCategorySelect" class="form-input" onchange="toggleCustomOtherField(this.value)">
            <option>Demolition</option><option>Boundary Wall</option><option>Landscaping & Pools</option><option>Waterproofing</option><option>Structural Repair</option><option>Solar Installation</option><option value="Completely Custom">Completely Custom</option>
          </select>
        </div>
        <div class="field-group" id="customSpecifyBox" style="display:none;">
          <label>Specify Category *</label>
          <input type="text" id="customSpecifyInput" class="form-input" placeholder="Type category...">
        </div>
        <div class="field-group">
          <label>Property Type</label>
          <select class="form-input"><option>Residential</option><option>Commercial</option><option>Open Land</option><option>Industrial</option></select>
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-pen-fancy"></i> Scope of Work & Deliverables</div>
        <div class="field-group full-width">
          <label>Detailed Project Description *</label>
          <textarea id="otherDetailedDesc" rows="4" class="form-input" placeholder="Please describe exactly what you need built, fixed, cleared or installed..."></textarea>
        </div>
        <div class="form-grid-2 mt-2">
          <div class="field-group">
            <label>Approximate Size / Quantity</label>
            <input type="number" id="otherSizeValue" class="form-input" placeholder="e.g. 500">
          </div>
          <div class="field-group">
            <label>Unit</label>
            <select class="form-input"><option>running feet</option><option>sq.ft.</option><option>cubic meters</option><option>acres</option><option>units</option></select>
          </div>
        </div>
      </div>
      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-helmet-safety"></i> Equipment & Responsibility</div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Material Responsibility</label>
            <select class="form-input"><option>Contractor to provide all materials</option><option>Customer will provide</option></select>
          </div>
          <div class="field-group">
            <label>Specialized Equipment</label>
            <select class="form-input"><option>JCB / Excavator</option><option>Cranes</option><option>Scaffolding</option><option>Not Sure</option></select>
          </div>
        </div>
      </div>
    `;
  }
}

function toggleCommFireSafety(item, checked) {
  if (!projectState.commercialData.fireSafety) projectState.commercialData.fireSafety = [];
  if (checked) {
    if (!projectState.commercialData.fireSafety.includes(item)) projectState.commercialData.fireSafety.push(item);
  } else {
    projectState.commercialData.fireSafety = projectState.commercialData.fireSafety.filter(f => f !== item);
  }
}

function syncCommercialState() {
  if (projectState.projectType !== "Commercial") return;
  const comm = projectState.commercialData = projectState.commercialData || {};

  const catEl = document.getElementById("commCategory");
  if (catEl) comm.category = catEl.value;

  const zoningEl = document.getElementById("commZoning");
  if (zoningEl) comm.zoning = zoningEl.value;

  const plotEl = document.getElementById("plotAreaInput");
  if (plotEl && plotEl.value) comm.plotArea = parseFloat(plotEl.value) || 0;

  const builtUpEl = document.getElementById("builtUpAreaInput");
  if (builtUpEl && builtUpEl.value) comm.totalArea = parseFloat(builtUpEl.value) || 0;

  const floorsEl = document.getElementById("commFloors");
  if (floorsEl) comm.floors = floorsEl.value;

  const floorPlateEl = document.getElementById("commFloorPlate");
  if (floorPlateEl && floorPlateEl.value) comm.floorPlateArea = parseFloat(floorPlateEl.value) || 0;

  const ceilingEl = document.getElementById("commCeilingHeight");
  if (ceilingEl && ceilingEl.value) comm.ceilingHeight = parseFloat(ceilingEl.value) || 0;

  const hvacEl = document.getElementById("commHvac");
  if (hvacEl) comm.hvac = hvacEl.value;

  const electEl = document.getElementById("commElectricalLoad");
  if (electEl) comm.electricalLoad = electEl.value;

  const passLiftsEl = document.getElementById("commPassengerLifts");
  if (passLiftsEl) comm.passengerLifts = parseInt(passLiftsEl.value) || 0;

  const servLiftsEl = document.getElementById("commServiceLifts");
  if (servLiftsEl) comm.serviceLifts = parseInt(servLiftsEl.value) || 0;

  const checkedSafety = document.querySelectorAll("#commFireSafetyContainer input[type='checkbox']:checked");
  if (checkedSafety && checkedSafety.length > 0) {
    comm.fireSafety = Array.from(checkedSafety).map(cb => cb.nextElementSibling?.textContent?.trim() || cb.value).filter(Boolean);
  }
}

/* =========================================================
   SUB-MODULES & DYNAMIC INDIVIDUAL ROOM AREAS
   ========================================================= */
function handleFloorSelectionChange(val) {
  const customInp = document.getElementById("customFloorsInput");
  if (val === "custom") {
    if (customInp) {
      customInp.style.display = "block";
      customInp.value = 6;
      customInp.focus();
    }
    generateFloorTabs(6);
  } else {
    if (customInp) {
      customInp.style.display = "none";
      customInp.value = "";
    }
    generateFloorTabs(parseInt(val) || 1);
  }
  recalculateDynamicEstimates();
}

function handleCustomFloorInput(val) {
  let count = parseInt(val);
  if (isNaN(count) || count < 1) count = 1;
  if (count > 50) count = 50;
  generateFloorTabs(count);
  recalculateDynamicEstimates();
}

function toggleBasement(val) {
  projectState.hasBasement = (val === "Yes" || val === true);
  renderTabsAndPanes();
  recalculateDynamicEstimates();
}

function generateFloorTabs(num) {
  num = parseInt(num) || 1;
  projectState.floorsCount = num;

  const floorNames = [
    "Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", 
    "4th Floor", "5th Floor", "6th Floor", "7th Floor", 
    "8th Floor", "9th Floor", "10th Floor"
  ];

  const oldData = [...projectState.floorsData];
  projectState.floorsData = [];

  for (let i = 0; i < num; i++) {
    const fName = i < floorNames.length ? floorNames[i] : `${i}th Floor`;
    const existing = oldData[i] || {};
    projectState.floorsData.push({
      floorName: fName,
      approxArea: existing.approxArea || 0,
      rooms: existing.rooms || {},
      roomAreas: existing.roomAreas || {},
      specialRequirements: existing.specialRequirements || ""
    });
  }

  renderTabsAndPanes();
}

function renderTabsAndPanes() {
  const tabBar = document.getElementById("floorTabBar");
  const panes = document.getElementById("floorPanesContainer");
  if (!tabBar || !panes) return;

  tabBar.innerHTML = "";
  panes.innerHTML = "";

  let allTabs = [];

  if (projectState.hasBasement) {
    allTabs.push({ type: "basement", name: "Basement", data: projectState.basementData });
  }

  projectState.floorsData.forEach((f, idx) => {
    allTabs.push({ type: "floor", index: idx, name: f.floorName, data: f });
  });

  allTabs.forEach((tab, i) => {
    const tabBtn = document.createElement("button");
    tabBtn.type = "button";
    tabBtn.className = `tab-btn ${i === 0 ? "active" : ""}`;
    tabBtn.textContent = tab.name;
    tabBtn.onclick = () => switchFloorTab(i);
    tabBar.appendChild(tabBtn);

    const pane = document.createElement("div");
    pane.className = `floor-pane ${i === 0 ? "active" : ""}`;
    pane.id = `floorPane-${i}`;

    if (tab.type === "basement") {
      pane.innerHTML = `
        <div class="field-group mt-2">
          <label>Approx. Basement Area (sq.ft.)</label>
          <input type="number" class="form-input" placeholder="e.g. 1000" value="${tab.data.approxArea || ''}" oninput="projectState.basementData.approxArea = parseFloat(this.value)||0; recalculateDynamicEstimates();">
        </div>

        <label class="mt-2 block" style="font-size:12px; font-weight:700; color:#334155;">Basement Spaces & Facilities:</label>
        <div class="room-counter-grid">
          ${BASEMENT_ROOM_TYPES.map(room => `
            <div class="room-counter-item">
              <span>${room}</span>
              <div class="qty-control">
                <button type="button" class="qty-btn" onclick="adjustBasementRoomQty('${room}', -1)">-</button>
                <span class="qty-val" id="qty-basement-${room.replace(/[^a-zA-Z]/g, '')}">${tab.data.rooms[room] || 0}</span>
                <button type="button" class="qty-btn" onclick="adjustBasementRoomQty('${room}', 1)">+</button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Dynamic Basement Room Individual Area Inputs Container -->
        <div id="basementRoomAreaContainer"></div>

        <label class="mt-3 block" style="font-size:12px; font-weight:700; color:#334155;">Critical Basement Civil Scope & Provisions:</label>
        <div class="room-pill-grid mt-1">
          ${BASEMENT_FEATURES.map(feat => `
            <label class="checkbox-pill">
              <input type="checkbox" ${(projectState.basementData.features || []).includes(feat) ? 'checked' : ''} onchange="toggleBasementFeature('${feat}', this.checked)">
              <span>${feat}</span>
            </label>
          `).join('')}
        </div>

        <div class="field-group mt-3">
          <label>Additional Basement Specifications (e.g. clear headroom, ramp slope, moisture treatment)</label>
          <textarea class="form-input" rows="2" placeholder="e.g. Minimum 9ft clear ceiling height, heavy waterproofing" oninput="projectState.basementData.specialRequirements = this.value">${tab.data.specialRequirements || ''}</textarea>
        </div>
      `;
    } else {
      const idx = tab.index;
      pane.innerHTML = `
        <div class="field-group mt-2">
          <label>Approx. Area for ${tab.name} (sq.ft.)</label>
          <input type="number" class="form-input" placeholder="e.g. 1200" value="${tab.data.approxArea || ''}" oninput="projectState.floorsData[${idx}].approxArea = parseFloat(this.value)||0">
        </div>
        <label class="mt-2 block" style="font-size:12px; font-weight:700; color:#334155;">Rooms Required on ${tab.name}:</label>
        <div class="room-counter-grid">
          ${ROOM_TYPES.map(room => `
            <div class="room-counter-item">
              <span>${room}</span>
              <div class="qty-control">
                <button type="button" class="qty-btn" onclick="adjustRoomQty(${idx}, '${room}', -1)">-</button>
                <span class="qty-val" id="qty-${idx}-${room.replace(/[^a-zA-Z]/g, '')}">${tab.data.rooms[room] || 0}</span>
                <button type="button" class="qty-btn" onclick="adjustRoomQty(${idx}, '${room}', 1)">+</button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Dynamic Floor Room Individual Area Inputs Container -->
        <div id="roomAreaContainer-${idx}"></div>

        <div class="field-group mt-2">
          <label>Special Requirements for ${tab.name}</label>
          <textarea class="form-input" rows="2" placeholder="e.g. Attached bath in bedroom, island counter in kitchen" oninput="projectState.floorsData[${idx}].specialRequirements = this.value">${tab.data.specialRequirements || ''}</textarea>
        </div>
      `;
    }

    panes.appendChild(pane);
  });

  // Re-render any existing room area fields
  if (projectState.hasBasement) renderBasementIndividualRoomAreas();
  projectState.floorsData.forEach((_, idx) => renderFloorIndividualRoomAreas(idx));
}

function switchFloorTab(idx) {
  document.querySelectorAll(".tab-btn").forEach((b, i) => b.classList.toggle("active", i === idx));
  document.querySelectorAll(".floor-pane").forEach((p, i) => p.classList.toggle("active", i === idx));
}

// Adjust Room Quantity on Floors
function adjustRoomQty(floorIndex, roomName, delta) {
  const floor = projectState.floorsData[floorIndex];
  if (!floor) return;
  const current = floor.rooms[roomName] || 0;
  const next = Math.max(0, current + delta);
  floor.rooms[roomName] = next;

  const el = document.getElementById(`qty-${floorIndex}-${roomName.replace(/[^a-zA-Z]/g, '')}`);
  if (el) el.textContent = next;

  if (!floor.roomAreas) floor.roomAreas = {};

  // Clean-up deleted rooms from state
  for (let i = next + 1; i <= current; i++) {
    delete floor.roomAreas[`${roomName}_${i}`];
  }

  renderFloorIndividualRoomAreas(floorIndex);
}

// Render dynamic area input boxes for each selected room on standard floors
function renderFloorIndividualRoomAreas(floorIndex) {
  const container = document.getElementById(`roomAreaContainer-${floorIndex}`);
  if (!container) return;

  const floor = projectState.floorsData[floorIndex];
  if (!floor) return;

  const activeRooms = Object.entries(floor.rooms).filter(([_, count]) => count > 0);

  if (activeRooms.length === 0) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <div class="room-breakdown-wrapper">
      <div class="room-breakdown-title">
        <i class="fa-solid fa-ruler-combined" style="color: #0284c7;"></i> Specify Individual Room Dimensions (sq.ft.):
      </div>
      <div class="room-breakdown-grid">
  `;

  activeRooms.forEach(([roomName, count]) => {
    for (let i = 1; i <= count; i++) {
      const fieldKey = `${roomName}_${i}`;
      const label = count === 1 ? `${roomName} Area` : `${roomName} ${i} Area`;
      const val = (floor.roomAreas && floor.roomAreas[fieldKey]) || "";

      html += `
        <div class="room-individual-item">
          <label>${label} (sq.ft.)</label>
          <input 
            type="number" 
            placeholder="e.g. 150" 
            value="${val}" 
            oninput="saveFloorRoomArea(${floorIndex}, '${fieldKey}', this.value)"
          />
        </div>
      `;
    }
  });

  html += `</div></div>`;
  container.innerHTML = html;
}

function saveFloorRoomArea(floorIndex, fieldKey, val) {
  const floor = projectState.floorsData[floorIndex];
  if (!floor) return;
  if (!floor.roomAreas) floor.roomAreas = {};
  floor.roomAreas[fieldKey] = parseFloat(val) || 0;
}

// Adjust Room Quantity on Basement
function adjustBasementRoomQty(roomName, delta) {
  const current = projectState.basementData.rooms[roomName] || 0;
  const next = Math.max(0, current + delta);
  projectState.basementData.rooms[roomName] = next;

  const el = document.getElementById(`qty-basement-${roomName.replace(/[^a-zA-Z]/g, '')}`);
  if (el) el.textContent = next;

  if (!projectState.basementData.roomAreas) projectState.basementData.roomAreas = {};

  for (let i = next + 1; i <= current; i++) {
    delete projectState.basementData.roomAreas[`${roomName}_${i}`];
  }

  renderBasementIndividualRoomAreas();
}

// Render dynamic area input boxes for each selected room in basement
function renderBasementIndividualRoomAreas() {
  const container = document.getElementById("basementRoomAreaContainer");
  if (!container) return;

  const activeRooms = Object.entries(projectState.basementData.rooms).filter(([_, count]) => count > 0);

  if (activeRooms.length === 0) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <div class="room-breakdown-wrapper">
      <div class="room-breakdown-title">
        <i class="fa-solid fa-ruler-combined" style="color: #0284c7;"></i> Specify Individual Basement Space Dimensions (sq.ft.):
      </div>
      <div class="room-breakdown-grid">
  `;

  activeRooms.forEach(([roomName, count]) => {
    for (let i = 1; i <= count; i++) {
      const fieldKey = `${roomName}_${i}`;
      const label = count === 1 ? `${roomName} Area` : `${roomName} ${i} Area`;
      const val = (projectState.basementData.roomAreas && projectState.basementData.roomAreas[fieldKey]) || "";

      html += `
        <div class="room-individual-item">
          <label>${label} (sq.ft.)</label>
          <input 
            type="number" 
            placeholder="e.g. 180" 
            value="${val}" 
            oninput="saveBasementRoomArea('${fieldKey}', this.value)"
          />
        </div>
      `;
    }
  });

  html += `</div></div>`;
  container.innerHTML = html;
}

function saveBasementRoomArea(fieldKey, val) {
  if (!projectState.basementData.roomAreas) projectState.basementData.roomAreas = {};
  projectState.basementData.roomAreas[fieldKey] = parseFloat(val) || 0;
}

function toggleBasementFeature(featureName, isChecked) {
  if (!projectState.basementData.features) projectState.basementData.features = [];
  if (isChecked) {
    if (!projectState.basementData.features.includes(featureName)) {
      projectState.basementData.features.push(featureName);
    }
  } else {
    projectState.basementData.features = projectState.basementData.features.filter(f => f !== featureName);
  }
}

/* Renovation Helpers */
function toggleRenovationAreaTab(areaName, isChecked) {
  const container = document.getElementById("renovationDynamicAreaTabsContainer");
  if (!container) return;
  const areaId = `renov-tab-${areaName.replace(/[^a-zA-Z]/g, '')}`;

  if (isChecked) {
    projectState.renovationAreas[areaName] = { squareFootage: 0, workRequired: [], specificNotes: "" };
    const div = document.createElement("div");
    div.id = areaId;
    div.className = "dynamic-room-card";
    div.innerHTML = `
      <div class="room-header"><i class="fa-solid fa-toolbox"></i> ${areaName} Specifications</div>
      <div class="field-group">
        <label>Approx. Area to Renovate (sq.ft.) *</label>
        <input type="number" id="area-input-${areaName.replace(/[^a-zA-Z]/g, '')}" class="form-input renov-sqft-input" placeholder="e.g. 200" oninput="updateRenovationAreaSize('${areaName}', this.value)">
      </div>
      <label class="mt-2 block" style="font-size:12px; font-weight:700; color:#334155;">Scope of Work for ${areaName}:</label>
      <div class="room-pill-grid mt-1">
        ${["Demolition", "Civil Work", "Plumbing", "Electrical", "Flooring", "Painting", "Carpentry"].map(work => `
          <label class="checkbox-pill"><input type="checkbox" onchange="toggleRenovWork('${areaName}', '${work}', this.checked)"> <span>${work}</span></label>
        `).join('')}
      </div>
      <div class="field-group mt-2">
        <label>Specific Requirements for ${areaName}</label>
        <textarea class="form-input" rows="2" placeholder="e.g. Knock down wall, install island counter" oninput="projectState.renovationAreas['${areaName}'].specificNotes = this.value"></textarea>
      </div>
    `;
    container.appendChild(div);
  } else {
    delete projectState.renovationAreas[areaName];
    document.getElementById(areaId)?.remove();
    recalculateDynamicEstimates();
  }
}

function updateRenovationAreaSize(areaName, val) {
  if (projectState.renovationAreas[areaName]) {
    projectState.renovationAreas[areaName].squareFootage = parseFloat(val) || 0;
  }
  recalculateDynamicEstimates();
}

function toggleRenovWork(areaName, work, checked) {
  const area = projectState.renovationAreas[areaName];
  if (!area) return;
  if (checked) area.workRequired.push(work);
  else area.workRequired = area.workRequired.filter(w => w !== work);
}

function toggleExtensionDirection(dir) {
  projectState.extensionData.type = dir;
  const container = document.getElementById("extensionDynamicSection");
  if (!container) return;

  if (dir === "Vertical") {
    container.innerHTML = `
      <div class="room-header"><i class="fa-solid fa-arrow-up"></i> Vertical Extension Specifics</div>
      <div class="form-grid-2">
        <div class="field-group">
          <label>Structural Audit Done?</label>
          <select class="form-input"><option>No, need contractor to check</option><option>Yes, have report</option></select>
        </div>
        <div class="field-group">
          <label>Current Roof Type</label>
          <select class="form-input"><option>RCC Slab</option><option>Pitched Roof</option><option>Temporary / Sheet</option></select>
        </div>
        <div class="field-group">
          <label>Staircase Required?</label>
          <select class="form-input"><option>External Staircase</option><option>Internal Staircase</option><option>Existing is sufficient</option></select>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="room-header"><i class="fa-solid fa-arrow-right"></i> Horizontal Extension Specifics</div>
      <div class="form-grid-2">
        <div class="field-group">
          <label>Space Available</label>
          <select class="form-input"><option>Backyard</option><option>Front yard</option><option>Side of house</option></select>
        </div>
        <div class="field-group">
          <label>Excavation Access</label>
          <select class="form-input"><option>Easy access for JCB/Machinery</option><option>Narrow access, manual labor only</option></select>
        </div>
      </div>
    `;
  }
}

function adjustExtensionRoom(r, delta) {
  const cur = projectState.extensionData.rooms[r] || 0;
  const nxt = Math.max(0, cur + delta);
  projectState.extensionData.rooms[r] = nxt;
  const el = document.getElementById(`qty-ext-${r}`);
  if (el) el.textContent = nxt;
}

function toggleInteriorRoomAccordion(roomName, isChecked) {
  const container = document.getElementById("interiorRoomsContainer");
  if (!container) return;
  const id = `interior-${roomName.replace(/[^a-zA-Z]/g, '')}`;

  if (isChecked) {
    projectState.interiorRooms[roomName] = { scope: [], notes: "" };
    const div = document.createElement("div");
    div.id = id;
    div.className = "dynamic-room-card";
    div.innerHTML = `
      <div class="room-header"><i class="fa-solid fa-couch"></i> ${roomName} Scope</div>
      <div class="room-pill-grid">
        ${["False Ceiling", "Flooring", "Wall Painting/Wallpaper", "Electrical & Lighting", "Modular Storage"].map(s => `
          <label class="checkbox-pill"><input type="checkbox" onchange="toggleInteriorScope('${roomName}', '${s}', this.checked)"> <span>${s}</span></label>
        `).join('')}
      </div>
      <div class="field-group mt-2">
        <label>Room Notes</label>
        <textarea class="form-input" rows="2" placeholder="Specific requirements for ${roomName}..." oninput="projectState.interiorRooms['${roomName}'].notes = this.value"></textarea>
      </div>
    `;
    container.appendChild(div);
  } else {
    delete projectState.interiorRooms[roomName];
    document.getElementById(id)?.remove();
  }
}

function toggleInteriorScope(room, scopeItem, checked) {
  const r = projectState.interiorRooms[room];
  if (!r) return;
  if (checked) r.scope.push(scopeItem);
  else r.scope = r.scope.filter(s => s !== scopeItem);
}

function toggleGenericCheckbox(stateKey, item, checked) {
  if (!Array.isArray(projectState[stateKey])) projectState[stateKey] = [];
  if (checked) projectState[stateKey].push(item);
  else projectState[stateKey] = projectState[stateKey].filter(i => i !== item);
}

function toggleCustomOtherField(val) {
  const el = document.getElementById("customSpecifyBox");
  if (el) el.style.display = val === "Completely Custom" ? "block" : "none";
}

function updateTier(tier) {
  projectState.qualityTier = tier;
  recalculateDynamicEstimates();
}

/* =========================================================
   SERVER-AUTHORITATIVE COST ESTIMATION ENGINE (STEP 4)
   ========================================================= */

// Currency formatters (Intl.NumberFormat 'en-IN')
const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

function formatINR(val) {
  if (val === null || val === undefined || isNaN(Number(val))) return "--";
  return inrFormatter.format(Math.round(Number(val)));
}

function formatINRCompact(val) {
  if (val === null || val === undefined || isNaN(Number(val))) return "--";
  const num = Number(val);
  if (num >= 10000000) {
    return (num / 10000000).toFixed(2) + " Cr";
  } else if (num >= 100000) {
    return (num / 100000).toFixed(2) + " L";
  }
  return inrFormatter.format(Math.round(num));
}

let estimateDebounceTimer = null;
let estimateAbortController = null;
let currentEstimateResponse = null;
let isCalculatingEstimate = false;

// Project type normalization for API
function mapProjectTypeForApi(uiType) {
  if (!uiType) return "NEW_CONSTRUCTION";
  const t = uiType.trim();
  if (t === "New Construction") return "NEW_CONSTRUCTION";
  if (t === "Commercial" || t === "Commercial Construction") return "COMMERCIAL_CONSTRUCTION";
  if (t === "Industrial" || t === "Industrial / Warehouse") return "INDUSTRIAL_WAREHOUSE";
  return null;
}

const FROZEN_PROJECT_TYPES = [
  "Renovation",
  "Renovation & Remodeling",
  "Home Extension",
  "Interior",
  "Interior & Finishing",
  "Other"
];

function recalculateDynamicEstimates() {
  const type = projectState.projectType;

  const rangeDisplay = document.getElementById("costRangeDisplay");
  const disclaimer = document.getElementById("estDisclaimer");
  const lowerEst = document.getElementById("lowerEstLabel");
  const expectedEst = document.getElementById("expectedEstLabel");
  const higherEst = document.getElementById("higherEstLabel");
  const rangeFill = document.getElementById("rangeFillBar");
  const breakdownList = document.getElementById("costBreakdownList");
  const viewBtn = document.getElementById("viewDetailedEstimateBtn");

  // 1. Frozen project types -> display clear existing-style unavailable state without calling API
  if (FROZEN_PROJECT_TYPES.includes(type)) {
    if (rangeDisplay) rangeDisplay.innerText = "Custom Evaluation";
    if (disclaimer) disclaimer.innerText = `*Cost estimation for ${type} is evaluated individually by contractors during bidding.`;
    if (lowerEst) lowerEst.innerText = "Quote";
    if (expectedEst) expectedEst.innerText = "Custom";
    if (higherEst) higherEst.innerText = "Quote";
    if (rangeFill) {
      rangeFill.style.width = "0%";
      rangeFill.style.left = "0%";
    }
    if (breakdownList) {
      breakdownList.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 10px; background: #f8fafc; border-radius: 6px; font-size: 11.5px; color: #64748b; text-align: center;">
          <i class="fa-solid fa-clipboard-list" style="margin-right: 6px; color: #0284c7;"></i>
          Estimates for <b>${type}</b> are custom quoted based on specific site requirements.
        </div>
      `;
    }
    if (viewBtn) viewBtn.style.display = "none";
    currentEstimateResponse = null;
    return;
  }

  // 2. Active project types: Built-up area check (Area of ONE typical floor)
  let typicalFloorArea = 0;
  if (type === "Commercial") {
    const floorPlate = parseFloat(document.getElementById("commFloorPlate")?.value);
    const builtUp = parseFloat(document.getElementById("builtUpAreaInput")?.value);
    typicalFloorArea = floorPlate > 0 ? floorPlate : (builtUp || 0);
  } else {
    typicalFloorArea = parseFloat(document.getElementById("builtUpAreaInput")?.value) || 0;
  }

  projectState.calculatedArea = typicalFloorArea;

  if (typicalFloorArea <= 0) {
    if (rangeDisplay) rangeDisplay.innerText = "Enter Area Details";
    if (disclaimer) disclaimer.innerText = "*Provide building size to calculate indicative estimate.";
    if (lowerEst) lowerEst.innerText = "₹--";
    if (expectedEst) expectedEst.innerText = "₹--";
    if (higherEst) higherEst.innerText = "₹--";
    if (rangeFill) {
      rangeFill.style.width = "0%";
      rangeFill.style.left = "0%";
    }
    if (breakdownList) {
      breakdownList.innerHTML = `
        <div>Material Cost: <b>--</b></div>
        <div>Labour Cost: <b>--</b></div>
        <div>Transportation: <b>--</b></div>
        <div>Machinery: <b>--</b></div>
        <div>Structural: <b>--</b></div>
        <div>Basement: <b>--</b></div>
        <div>Contingency: <b>--</b></div>
      `;
    }
    if (viewBtn) viewBtn.style.display = "none";
    currentEstimateResponse = null;
    return;
  }

  // 3. Location parameters
  const stateVal = document.getElementById("stateSelect")?.value?.trim() || projectState.state || "";
  const cityVal = document.getElementById("cityInput")?.value?.trim() || projectState.city || "";
  const pincodeVal = document.getElementById("pincodeInput")?.value?.trim() || projectState.pincode || "";

  if (!stateVal) {
    if (rangeDisplay) rangeDisplay.innerText = "Select State in Step 2";
    if (disclaimer) disclaimer.innerText = "*State is required to resolve local construction rates.";
    if (lowerEst) lowerEst.innerText = "₹--";
    if (expectedEst) expectedEst.innerText = "₹--";
    if (higherEst) higherEst.innerText = "₹--";
    if (rangeFill) {
      rangeFill.style.width = "0%";
      rangeFill.style.left = "0%";
    }
    if (viewBtn) viewBtn.style.display = "none";
    currentEstimateResponse = null;
    return;
  }

  // 4. Floor count
  let numFloors = 1;
  if (type === "New Construction") {
    const floorSelect = document.getElementById("numFloorsSelect");
    if (floorSelect && floorSelect.value === "custom") {
      numFloors = parseInt(document.getElementById("customFloorsInput")?.value) || 1;
    } else if (floorSelect) {
      numFloors = parseInt(floorSelect.value) || 1;
    } else {
      numFloors = projectState.floorsCount || 1;
    }
  } else if (type === "Commercial") {
    const commFloorsVal = document.getElementById("commFloors")?.value || "";
    const match = commFloorsVal.match(/\d+/);
    numFloors = match ? parseInt(match[0]) : 1;
  } else {
    numFloors = 1;
  }
  if (numFloors < 1) numFloors = 1;

  // 5. Basement area (separate from above-ground floors)
  let basementArea = 0;
  if (projectState.hasBasement && projectState.basementData && projectState.basementData.approxArea > 0) {
    basementArea = parseFloat(projectState.basementData.approxArea) || 0;
  }

  // 6. Quality tier
  const qualityTier = "STANDARD";

  const apiProjectType = mapProjectTypeForApi(type) || "NEW_CONSTRUCTION";

  // Build payload
  const requestPayload = {
    projectType: apiProjectType,
    state: stateVal,
    city: cityVal || null,
    district: null,
    pincode: pincodeVal || null,
    builtUpAreaSqFt: typicalFloorArea,
    basementAreaSqFt: basementArea,
    numberOfFloors: numFloors,
    qualityTier: qualityTier
  };

  // Show small non-intrusive loading indicator
  if (rangeDisplay && !isCalculatingEstimate) {
    rangeDisplay.innerHTML = `<span class="calc-loading-indicator"><i class="fa-solid fa-circle-notch fa-spin"></i> Calculating...</span>`;
  }

  // Debounce API calls (300ms) to prevent flooding during typing
  if (estimateDebounceTimer) clearTimeout(estimateDebounceTimer);

  estimateDebounceTimer = setTimeout(async () => {
    if (estimateAbortController) {
      estimateAbortController.abort();
    }
    estimateAbortController = new AbortController();
    isCalculatingEstimate = true;

    try {
      const token = getCleanToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let res = await fetch(`${BACKEND_URL}/api/cost-estimator/calculate`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestPayload),
        signal: estimateAbortController.signal
      });

      // Fallback to public endpoint if protected route returned 401/403 or unauthenticated
      if ((res.status === 401 || res.status === 403) || (!token && !res.ok)) {
        res = await fetch(`${BACKEND_URL}/api/public/cost-estimator/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
          signal: estimateAbortController.signal
        });
      }

      const data = await res.json().catch(() => null);

      if (res.ok && data && data.success) {
        applyEstimatorResponse(data);
      } else {
        handleEstimatorError(res.status, data);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      console.error("Cost Estimator network failure:", err);
      handleEstimatorNetworkError();
    } finally {
      isCalculatingEstimate = false;
    }
  }, 300);
}

function applyEstimatorResponse(data) {
  currentEstimateResponse = data;

  const low = Number(data.total?.low || 0);
  const avg = Number(data.total?.average || 0);
  const high = Number(data.total?.high || 0);

  // Update Range Display
  const rangeDisplay = document.getElementById("costRangeDisplay");
  if (rangeDisplay) {
    rangeDisplay.innerText = `₹${formatINR(low)} – ₹${formatINR(high)}`;
  }

  const disclaimer = document.getElementById("estDisclaimer");
  if (disclaimer) {
    disclaimer.innerText = `*Indicative estimate based on verified construction rates for ${data.location?.city || data.location?.state || 'your area'}.`;
  }

  // Update Labels
  const lowerEst = document.getElementById("lowerEstLabel");
  const expectedEst = document.getElementById("expectedEstLabel");
  const higherEst = document.getElementById("higherEstLabel");
  if (lowerEst) lowerEst.innerText = `₹${formatINRCompact(low)}`;
  if (expectedEst) expectedEst.innerText = `₹${formatINRCompact(avg)}`;
  if (higherEst) higherEst.innerText = `₹${formatINRCompact(high)}`;

  // Update Range Bar safely
  const rangeFill = document.getElementById("rangeFillBar");
  if (rangeFill) {
    let avgPercent = 50;
    if (high > low) {
      avgPercent = Math.min(100, Math.max(0, ((avg - low) / (high - low)) * 100));
    }
    rangeFill.style.left = "0%";
    rangeFill.style.width = `${avgPercent.toFixed(1)}%`;
  }

  // Update Breakdown List
  const breakdownList = document.getElementById("costBreakdownList");
  if (breakdownList && data.breakdown) {
    const b = data.breakdown;
    const matVal = b.material ? `₹${formatINRCompact(b.material.average)}` : "--";
    const labVal = b.labour ? `₹${formatINRCompact(b.labour.average)}` : "--";
    const transVal = b.transportation ? `₹${formatINRCompact(b.transportation.average)}` : "--";
    const machVal = b.machinery ? `₹${formatINRCompact(b.machinery.average)}` : "--";
    const structVal = b.structural ? `₹${formatINRCompact(b.structural.average)}` : "--";
    const baseVal = (b.basement && Number(b.basement.average) > 0) ? `₹${formatINRCompact(b.basement.average)}` : "Not included";
    const contVal = b.contingency ? `₹${formatINRCompact(b.contingency.average)}` : "--";

    breakdownList.innerHTML = `
      <div>Material Cost: <b>${matVal}</b></div>
      <div>Labour Cost: <b>${labVal}</b></div>
      <div>Transportation: <b>${transVal}</b></div>
      <div>Machinery: <b>${machVal}</b></div>
      <div>Structural: <b>${structVal}</b></div>
      <div>Basement: <b>${baseVal}</b></div>
      <div>Contingency: <b>${contVal}</b></div>
    `;
  }

  // Update Location Info
  const locElem = document.getElementById("locInfo");
  if (locElem && data.location) {
    const locParts = [];
    if (data.location.city) locParts.push(data.location.city);
    if (data.location.state) locParts.push(data.location.state);
    let locStr = locParts.join(", ") || "Location set";
    if (data.location.resolutionTier) {
      const tierMap = {
        "CITY": "City Rates",
        "DISTRICT": "District Rates",
        "STATE_DEFAULT": "State Average",
        "NATIONAL_DEFAULT": "National Benchmark"
      };
      locStr += ` (${tierMap[data.location.resolutionTier] || data.location.resolutionTier})`;
    }
    locElem.textContent = locStr;
  }

  // Update Rate Date with truthful wording
  const rateDateElem = document.getElementById("rateUpdateDate");
  if (rateDateElem) {
    let sourceDateStr = "";
    if (data.sources && data.sources.length > 0) {
      const dates = data.sources.map(s => s.rateDate).filter(Boolean).sort().reverse();
      if (dates.length > 0) {
        const d = new Date(dates[0]);
        if (!isNaN(d.getTime())) {
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          sourceDateStr = `${months[d.getMonth()]} ${d.getFullYear()}`;
        }
      }
    }
    rateDateElem.textContent = sourceDateStr ? `Source data dated ${sourceDateStr}` : "Reference rate schedule";
  }

  const dataStatusElem = document.getElementById("rateDataStatus");
  if (dataStatusElem) {
    dataStatusElem.textContent = "Verified Benchmark";
  }

  // Show detailed CTA button
  const viewBtn = document.getElementById("viewDetailedEstimateBtn");
  if (viewBtn) {
    viewBtn.style.display = "block";
  }
}

function handleEstimatorError(status, data) {
  currentEstimateResponse = null;

  const rangeDisplay = document.getElementById("costRangeDisplay");
  const disclaimer = document.getElementById("estDisclaimer");
  const lowerEst = document.getElementById("lowerEstLabel");
  const expectedEst = document.getElementById("expectedEstLabel");
  const higherEst = document.getElementById("higherEstLabel");
  const rangeFill = document.getElementById("rangeFillBar");
  const viewBtn = document.getElementById("viewDetailedEstimateBtn");

  if (lowerEst) lowerEst.innerText = "₹--";
  if (expectedEst) expectedEst.innerText = "₹--";
  if (higherEst) higherEst.innerText = "₹--";
  if (rangeFill) {
    rangeFill.style.width = "0%";
    rangeFill.style.left = "0%";
  }
  if (viewBtn) viewBtn.style.display = "none";

  if (status === 404 || (data && data.errorCode === "RATES_UNAVAILABLE")) {
    if (rangeDisplay) rangeDisplay.innerText = "Estimate Unavailable";
    if (disclaimer) disclaimer.innerText = "Cost estimation data is currently unavailable for the selected location/project type.";
  } else if (status === 400) {
    if (rangeDisplay) rangeDisplay.innerText = "Validation Issue";
    if (disclaimer) disclaimer.innerText = data?.message || "Please check your area and location inputs.";
  } else {
    if (rangeDisplay) rangeDisplay.innerText = "Calculation Error";
    if (disclaimer) disclaimer.innerText = "Unable to calculate cost estimate at this time. Please try again.";
  }
}

function handleEstimatorNetworkError() {
  currentEstimateResponse = null;

  const rangeDisplay = document.getElementById("costRangeDisplay");
  const disclaimer = document.getElementById("estDisclaimer");
  const lowerEst = document.getElementById("lowerEstLabel");
  const expectedEst = document.getElementById("expectedEstLabel");
  const higherEst = document.getElementById("higherEstLabel");
  const rangeFill = document.getElementById("rangeFillBar");
  const viewBtn = document.getElementById("viewDetailedEstimateBtn");

  if (rangeDisplay) rangeDisplay.innerText = "Connection Failed";
  if (disclaimer) disclaimer.innerText = "Unable to calculate the estimate right now. Please try again.";
  if (lowerEst) lowerEst.innerText = "₹--";
  if (expectedEst) expectedEst.innerText = "₹--";
  if (higherEst) higherEst.innerText = "₹--";
  if (rangeFill) {
    rangeFill.style.width = "0%";
    rangeFill.style.left = "0%";
  }
  if (viewBtn) viewBtn.style.display = "none";
}

/* =========================================================
   DETAILED COST ESTIMATE MODAL & BOQ DISPLAY
   ========================================================= */
function openDetailedEstimateModal() {
  if (!currentEstimateResponse) return;
  const modal = document.getElementById("detailedEstimateModal");
  const content = document.getElementById("detailedModalContent");
  if (!modal || !content) return;

  renderDetailedEstimateContent(currentEstimateResponse, content);
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeDetailedEstimateModal() {
  const modal = document.getElementById("detailedEstimateModal");
  if (modal) modal.classList.remove("active");
  document.body.style.overflow = "";
}

function handleModalOverlayClick(e) {
  if (e.target && e.target.id === "detailedEstimateModal") {
    closeDetailedEstimateModal();
  }
}

function renderDetailedEstimateContent(data, container) {
  const totalLow = formatINR(data.total?.low);
  const totalAvg = formatINR(data.total?.average);
  const totalHigh = formatINR(data.total?.high);

  const typicalArea = data.area?.typicalFloorAreaSqFt || 0;
  const aboveGroundArea = data.area?.totalAboveGroundAreaSqFt || 0;
  const basementArea = data.area?.basementAreaSqFt || 0;
  const totalArea = data.area?.totalConstructedAreaSqFt || 0;

  // 1. Overall Cost Summary
  let html = `
    <!-- Overall Summary -->
    <div class="modal-section">
      <div class="modal-section-title"><i class="fa-solid fa-chart-pie" style="color:#0284c7;"></i> Total Estimated Cost Summary</div>
      <div class="summary-cards-grid">
        <div class="summary-metric-card">
          <div class="metric-label">Lower Estimate</div>
          <div class="metric-val">₹${totalLow}</div>
        </div>
        <div class="summary-metric-card highlight">
          <div class="metric-label">Expected Average</div>
          <div class="metric-val">₹${totalAvg}</div>
        </div>
        <div class="summary-metric-card">
          <div class="metric-label">Higher Estimate</div>
          <div class="metric-val">₹${totalHigh}</div>
        </div>
      </div>
    </div>

    <!-- Area Dimensions -->
    <div class="modal-section">
      <div class="modal-section-title"><i class="fa-solid fa-vector-square" style="color:#0284c7;"></i> Construction Area Metrics</div>
      <div class="summary-cards-grid">
        <div class="summary-metric-card">
          <div class="metric-label">Typical Floor Area</div>
          <div class="metric-val" style="font-size:16px;">${typicalArea} <small style="font-size:11px; font-weight:normal;">sq.ft.</small></div>
        </div>
        <div class="summary-metric-card">
          <div class="metric-label">Total Above-Ground</div>
          <div class="metric-val" style="font-size:16px;">${aboveGroundArea} <small style="font-size:11px; font-weight:normal;">sq.ft.</small></div>
        </div>
        <div class="summary-metric-card">
          <div class="metric-label">Basement Area</div>
          <div class="metric-val" style="font-size:16px;">${basementArea > 0 ? basementArea + ' sq.ft.' : 'Not included'}</div>
        </div>
        <div class="summary-metric-card highlight">
          <div class="metric-label">Total Constructed Area</div>
          <div class="metric-val" style="font-size:16px;">${totalArea} <small style="font-size:11px; font-weight:normal;">sq.ft.</small></div>
        </div>
      </div>
    </div>
  `;

  // 2. Floor-by-Floor Dynamic Breakdown (Iterates dynamic list)
  if (data.floors && data.floors.length > 0) {
    html += `
      <div class="modal-section">
        <div class="modal-section-title"><i class="fa-solid fa-stairs" style="color:#0284c7;"></i> Floor-Wise Dynamic Cost Breakdown</div>
        <div class="modal-table-wrap">
          <table class="modal-data-table">
            <thead>
              <tr>
                <th>Floor Name</th>
                <th>Floor Area</th>
                <th>Lower Est.</th>
                <th>Expected Average</th>
                <th>Higher Est.</th>
                <th>Vertical Factor</th>
              </tr>
            </thead>
            <tbody>
    `;

    data.floors.forEach(f => {
      const factorDisplay = f.escalationFactor ? Number(f.escalationFactor).toFixed(4) : "1.0000";
      html += `
        <tr>
          <td><b>${f.floorName || 'Floor ' + f.floorNumber}</b></td>
          <td>${f.areaSqFt} sq.ft.</td>
          <td>₹${formatINR(f.low)}</td>
          <td><b>₹${formatINR(f.average)}</b></td>
          <td>₹${formatINR(f.high)}</td>
          <td><span style="font-size:11px; color:#64748b;">${factorDisplay}x</span></td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 3. Basement Details
  html += `
    <div class="modal-section">
      <div class="modal-section-title"><i class="fa-solid fa-dungeon" style="color:#0284c7;"></i> Basement Specifications & Cost</div>
  `;
  if (data.basement && Number(data.basement.areaSqFt) > 0) {
    html += `
      <div class="summary-cards-grid" style="margin-bottom:12px;">
        <div class="summary-metric-card">
          <div class="metric-label">Basement Area</div>
          <div class="metric-val" style="font-size:16px;">${data.basement.areaSqFt} sq.ft.</div>
        </div>
        <div class="summary-metric-card highlight">
          <div class="metric-label">Total Basement Cost</div>
          <div class="metric-val" style="font-size:16px;">₹${formatINR(data.basement.average)}</div>
        </div>
      </div>
      <div class="modal-table-wrap">
        <table class="modal-data-table">
          <thead>
            <tr>
              <th>Basement Phase</th>
              <th>Lower Est.</th>
              <th>Average Cost</th>
              <th>Higher Est.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Excavation & Earthwork</td>
              <td>₹${formatINR(data.basement.excavationCost?.low)}</td>
              <td><b>₹${formatINR(data.basement.excavationCost?.average)}</b></td>
              <td>₹${formatINR(data.basement.excavationCost?.high)}</td>
            </tr>
            <tr>
              <td>Box Waterproofing & Damp Treatment</td>
              <td>₹${formatINR(data.basement.waterproofingCost?.low)}</td>
              <td><b>₹${formatINR(data.basement.waterproofingCost?.average)}</b></td>
              <td>₹${formatINR(data.basement.waterproofingCost?.high)}</td>
            </tr>
            <tr>
              <td>RCC Retaining Structure & Slabs</td>
              <td>₹${formatINR(data.basement.structuralCost?.low)}</td>
              <td><b>₹${formatINR(data.basement.structuralCost?.average)}</b></td>
              <td>₹${formatINR(data.basement.structuralCost?.high)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  } else {
    html += `
      <p style="font-size:12.5px; color:#64748b; margin:0;">Basement: Not included in this project estimate.</p>
    `;
  }
  html += `</div>`;

  // 4. Category Cost Breakdown
  if (data.breakdown) {
    const b = data.breakdown;
    html += `
      <div class="modal-section">
        <div class="modal-section-title"><i class="fa-solid fa-layer-group" style="color:#0284c7;"></i> Category Cost Breakdown</div>
        <div class="modal-table-wrap">
          <table class="modal-data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Lower Est.</th>
                <th>Expected Average</th>
                <th>Higher Est.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Material Cost</b></td>
                <td>₹${formatINR(b.material?.low)}</td>
                <td><b>₹${formatINR(b.material?.average)}</b></td>
                <td>₹${formatINR(b.material?.high)}</td>
              </tr>
              <tr>
                <td><b>Labour Cost</b></td>
                <td>₹${formatINR(b.labour?.low)}</td>
                <td><b>₹${formatINR(b.labour?.average)}</b></td>
                <td>₹${formatINR(b.labour?.high)}</td>
              </tr>
              <tr>
                <td><b>Transportation</b></td>
                <td>₹${formatINR(b.transportation?.low)}</td>
                <td><b>₹${formatINR(b.transportation?.average)}</b></td>
                <td>₹${formatINR(b.transportation?.high)}</td>
              </tr>
              <tr>
                <td><b>Machinery & Equipment</b></td>
                <td>₹${formatINR(b.machinery?.low)}</td>
                <td><b>₹${formatINR(b.machinery?.average)}</b></td>
                <td>₹${formatINR(b.machinery?.high)}</td>
              </tr>
              <tr>
                <td><b>Structural / MEP</b></td>
                <td>₹${formatINR(b.structural?.low)}</td>
                <td><b>₹${formatINR(b.structural?.average)}</b></td>
                <td>₹${formatINR(b.structural?.high)}</td>
              </tr>
              <tr>
                <td><b>Basement</b></td>
                <td>${b.basement && Number(b.basement.average) > 0 ? '₹' + formatINR(b.basement.low) : '--'}</td>
                <td><b>${b.basement && Number(b.basement.average) > 0 ? '₹' + formatINR(b.basement.average) : 'Not included'}</b></td>
                <td>${b.basement && Number(b.basement.average) > 0 ? '₹' + formatINR(b.basement.high) : '--'}</td>
              </tr>
              <tr>
                <td><b>Contingency (${b.contingency?.percentage || 3}%)</b></td>
                <td>₹${formatINR(b.contingency?.low)}</td>
                <td><b>₹${formatINR(b.contingency?.average)}</b></td>
                <td>₹${formatINR(b.contingency?.high)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 5. Component BOQ Items with full Provenance
  if (data.componentItems && data.componentItems.length > 0) {
    html += `
      <div class="modal-section">
        <div class="modal-section-title"><i class="fa-solid fa-list-check" style="color:#0284c7;"></i> Component-Level Bill of Quantities (BOQ) & Reference Provenance</div>
        <div class="modal-table-wrap">
          <table class="modal-data-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit Rate (Avg)</th>
                <th>Total Cost (Avg)</th>
                <th>Rate Date</th>
                <th>Geographic Tier</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
    `;

    data.componentItems.forEach(item => {
      html += `
        <tr>
          <td><b>${item.componentName}</b></td>
          <td><span style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${item.category}</span></td>
          <td>${item.quantity} ${item.unit}</td>
          <td>₹${formatINR(item.averageRate)}</td>
          <td><b>₹${formatINR(item.averageCost)}</b></td>
          <td><span style="color:#64748b;">${item.rateDate || '--'}</span></td>
          <td><span style="font-size:10.5px; font-weight:600; color:#0284c7;">${item.geographicTier || '--'}</span></td>
          <td><small style="color:#64748b;">${item.source || '--'}</small></td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 6. Structural Benchmark Sanity Check
  if (data.benchmarkCheck) {
    const bm = data.benchmarkCheck;
    const isAligned = bm.status === "ALIGNED";
    html += `
      <div class="modal-section">
        <div class="modal-section-title"><i class="fa-solid fa-scale-balanced" style="color:#0284c7;"></i> Structural Plinth Area Benchmark Check</div>
        <div class="benchmark-box ${isAligned ? 'aligned' : 'divergent'}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <b>Benchmark Status: <span style="text-decoration:underline;">${bm.status}</span></b>
            <span>Divergence: <b>${bm.divergencePercentage || 0}%</b></span>
          </div>
          <p style="margin:0 0 6px 0;">${bm.message || ''}</p>
          <div style="font-size:11.5px; opacity:0.9;">
            Structural Plinth Benchmark Total: <b>₹${formatINR(bm.benchmarkTotal?.average)}</b> (₹${formatINR(bm.benchmarkPerSqFt?.average)}/sq.ft.) |
            Component BOQ Total: <b>₹${formatINR(bm.componentEstimate?.average)}</b>
          </div>
        </div>
      </div>
    `;
  }

  // 7. Warnings
  if (data.warnings && data.warnings.length > 0) {
    html += `
      <div class="modal-section">
        <div class="modal-section-title"><i class="fa-solid fa-triangle-exclamation" style="color:#dc2626;"></i> Estimation Notes & Warnings</div>
        <div class="estimate-warnings-box">
          <ul style="margin:0; padding-left:18px;">
            ${data.warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

/* =========================================================
   STEPPER FLOW & STEP VALIDATION
   ========================================================= */
function markInvalidField(element, message) {
  if (!element) return;
  element.style.borderColor = "#ef4444";
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.focus();

  const clearBorder = () => {
    element.style.borderColor = "";
    element.removeEventListener("input", clearBorder);
    element.removeEventListener("change", clearBorder);
  };
  element.addEventListener("input", clearBorder);
  element.addEventListener("change", clearBorder);

  showToast(message || "Please fill the required details *", "error");
}

function validateCurrentStep(step) {
  if (step === 1) {
    if (!projectState.projectType) {
      showToast("Please select a project type to continue.", "error");
      return false;
    }
    return true;
  }

  if (step === 2) {
    const title = document.getElementById("projectTitleInput");
    if (!title || !title.value.trim()) {
      markInvalidField(title, "Please enter Project Title *");
      return false;
    }

    const city = document.getElementById("cityInput");
    if (!city || !city.value.trim()) {
      markInvalidField(city, "Please enter City / District *");
      return false;
    }

    const state = document.getElementById("stateSelect");
    if (!state || !state.value.trim()) {
      markInvalidField(state, "Please select State / UT *");
      return false;
    }

    const pin = document.getElementById("pincodeInput");
    if (!pin || !pin.value.trim() || pin.value.trim().length < 6) {
      markInvalidField(pin, "Please enter a valid 6-digit PIN Code *");
      return false;
    }

    const addr = document.getElementById("addressInput");
    if (!addr || !addr.value.trim()) {
      markInvalidField(addr, "Please enter Complete Site Address *");
      return false;
    }

    if (projectState.projectType === "Other") {
      const otherCat = document.getElementById("otherCategorySelect")?.value;
      if (otherCat === "Completely Custom") {
        const customInput = document.getElementById("customSpecifyInput");
        if (!customInput || !customInput.value.trim()) {
          markInvalidField(customInput, "Please specify your custom category *");
          return false;
        }
      }
    }
    return true;
  }

  if (step === 3) {
    const type = projectState.projectType;

    if (type === "Renovation") {
      const activeAreas = Object.keys(projectState.renovationAreas);
      if (activeAreas.length === 0) {
        showToast("Please select at least one Area to Renovate *", "error");
        const container = document.getElementById("renovationAreaCheckboxes");
        if (container) container.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }

      for (const areaName of activeAreas) {
        const areaData = projectState.renovationAreas[areaName];
        if (!areaData || !areaData.squareFootage || areaData.squareFootage <= 0) {
          const inputEl = document.getElementById(`area-input-${areaName.replace(/[^a-zA-Z]/g, '')}`);
          markInvalidField(inputEl, `Please enter area (sq.ft.) for ${areaName} *`);
          return false;
        }
      }
      return true;
    }

    if (type === "Other") {
      const desc = document.getElementById("otherDetailedDesc");
      if (!desc || !desc.value.trim()) {
        markInvalidField(desc, "Please describe your project scope & deliverables *");
        return false;
      }
      return true;
    }

    const area = document.getElementById("builtUpAreaInput");
    if (area && (!area.value.trim() || parseFloat(area.value) <= 0)) {
      markInvalidField(area, "Please enter Total Built-up / Carpet Area in sq.ft. *");
      return false;
    }

    if (type === "New Construction") {
      const floorSelect = document.getElementById("numFloorsSelect");
      const customFloor = document.getElementById("customFloorsInput");
      if (floorSelect && floorSelect.value === "custom") {
        if (!customFloor || !customFloor.value.trim() || parseInt(customFloor.value) < 1) {
          markInvalidField(customFloor, "Please enter valid number of floors *");
          return false;
        }
      }
    }

    return true;
  }

  if (step === 4) {
    const minBudget = parseFloat(document.getElementById("budgetMin")?.value) || 0;
    const maxBudget = parseFloat(document.getElementById("budgetMax")?.value) || 0;

    if (minBudget > 0 && maxBudget > 0 && minBudget > maxBudget) {
      showToast("Maximum budget cannot be less than Minimum budget.", "error");
      return false;
    }
    return true;
  }

  return true;
}

function goToStep(step) {
  if (step > currentStep) {
    const isValid = validateCurrentStep(currentStep);
    if (!isValid) return;
  }

  currentStep = step;

  for (let i = 1; i <= 5; i++) {
    const pane = document.getElementById(`stepPane${i}`);
    if (pane) pane.classList.toggle("active", i === currentStep);
  }

  document.querySelectorAll(".step-node").forEach(n => {
    const s = parseInt(n.dataset.step);
    n.classList.toggle("active", s === currentStep);
    n.classList.toggle("completed", s < currentStep);
  });

  if (currentStep === 5) populateReview();
  window.scrollTo({ top: 80, behavior: "smooth" });
}

function populateReview() {
  document.getElementById("revType").textContent = projectState.projectType;
  document.getElementById("revTitle").textContent = document.getElementById("projectTitleInput")?.value || "Untitled Project";
  document.getElementById("revLocation").textContent = `${document.getElementById("cityInput")?.value || ''}, ${document.getElementById("stateSelect")?.value || ''}`;
  document.getElementById("revSize").textContent = `${projectState.calculatedArea} sq.ft.`;
  document.getElementById("revQuality").textContent = projectState.qualityTier;

  const type = projectState.projectType;
  let summary = "";

  if (type === "New Construction") {
    const floorsSummary = projectState.floorsData.map(f => `${f.floorName} (${Object.values(f.rooms).reduce((a,b)=>a+b, 0)} rooms)`).join(', ');
    const basementSummary = projectState.hasBasement ? "Includes Basement, " : "";
    summary = basementSummary + floorsSummary;
  } else if (type === "Renovation") {
    summary = Object.keys(projectState.renovationAreas).join(', ');
  } else if (type === "Home Extension") {
    summary = `${projectState.extensionData.type} Extension`;
  } else if (type === "Interior") {
    summary = Object.keys(projectState.interiorRooms).join(', ');
  } else if (type === "Commercial") {
    syncCommercialState();
    summary = `${projectState.commercialData.category || 'Commercial'} Space`;
  } else {
    summary = "Requirements specified";
  }

  document.getElementById("revBreakdown").textContent = summary || "Scope Configured";
}

/* =========================================================
   SUBMIT PROJECT & STORAGE
   ========================================================= */
async function submitProject() {
  const token = getAuthToken();
  if (!token) {
    alert("Authentication required. Please login as a customer to post a project.");
    window.location.href = "index.html";
    return;
  }

  const generatedProjectId = "PRJ-" + Date.now();
  const payload = {
    projectId: generatedProjectId,
    projectTitle: document.getElementById("projectTitleInput")?.value || projectState.title || "BuildBid Project",
    projectType: projectState.projectType,
    location: {
      city: document.getElementById("cityInput")?.value || projectState.city || "",
      state: document.getElementById("stateSelect")?.value || projectState.state || "",
      pincode: document.getElementById("pincodeInput")?.value || projectState.pincode || "",
      address: document.getElementById("addressInput")?.value || projectState.address || ""
    },
    totalArea: projectState.calculatedArea || parseFloat(document.getElementById("builtUpAreaInput")?.value) || 0,
    plotArea: parseFloat(document.getElementById("plotAreaInput")?.value) || 0,
    floors: parseInt(document.getElementById("numFloorsSelect")?.value) || projectState.floorsCount || 1,
    qualityTier: projectState.qualityTier || "Standard",
    estimatedCost: (currentEstimateResponse && currentEstimateResponse.total) ? (`₹${formatINR(currentEstimateResponse.total.low)} – ₹${formatINR(currentEstimateResponse.total.high)}`) : (document.getElementById("costRangeDisplay")?.textContent || ""),
    description: document.getElementById("ncDescription")?.value || document.getElementById("otherDetailedDesc")?.value || document.getElementById("otherDesc")?.value || "",
    paymentPreference: document.getElementById("paymentPref")?.value || "Milestone Based",
    privacyPreference: document.getElementById("privacyPref")?.value || "Public to verified contractors",
    budget: {
      min: parseFloat(document.getElementById("budgetMin")?.value) || 0,
      max: parseFloat(document.getElementById("budgetMax")?.value) || 0
    },
    timeline: {
      startDate: document.getElementById("targetStartDate")?.value || "Flexible"
    }
  };

  if (projectState.projectType === "New Construction") {
    payload.hasBasement = projectState.hasBasement;
    payload.basementDetails = projectState.hasBasement ? projectState.basementData : null;
    payload.floors = projectState.floorsData;
    payload.scopeOfWork = projectState.scopeOfWork;
    payload.purpose = document.getElementById("ncPurpose")?.value || "";
    payload.plotFacing = document.getElementById("ncPlotFacing")?.value || "";
    payload.cornerPlot = document.getElementById("ncCornerPlot")?.value || "No";
  } else if (projectState.projectType === "Renovation") {
    payload.renovationAreas = Object.entries(projectState.renovationAreas).map(([k, v]) => ({ areaName: k, ...v }));
    payload.renovScope = projectState.renovScope;
    payload.propertyType = document.getElementById("renovPropertyType")?.value || "";
    payload.propertyAge = document.getElementById("renovAge")?.value || "";
  } else if (projectState.projectType === "Home Extension") {
    payload.extensionDetails = projectState.extensionData;
    payload.existingType = document.getElementById("extExistingType")?.value || "";
  } else if (projectState.projectType === "Interior") {
    payload.rooms = projectState.interiorRooms;
    payload.scope = projectState.interiorScope;
    payload.interiorPreferences = projectState.interiorPreferences;
  } else if (projectState.projectType === "Commercial") {
    syncCommercialState();
    payload.commercial = projectState.commercialData;
  } else if (projectState.projectType === "Industrial") {
    payload.industrial = projectState.industrialData;
  } else if (projectState.projectType === "Other") {
    payload.custom = projectState.otherData;
  }

  try {
    let res = await fetch(`${BACKEND_URL}/api/customer/projects/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (!res.ok && res.status === 404) {
      res = await fetch(`${BACKEND_URL}/api/projects/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      const respData = await res.json().catch(() => null);
      const confirmedProjectId = respData && (respData.projectId || (respData.id ? `PRJ-${respData.id}` : null));
      if (confirmedProjectId) {
        payload.id = confirmedProjectId;
        payload.projectId = confirmedProjectId;
        if (respData && respData.estimatedCost) {
          payload.estimatedCost = respData.estimatedCost;
        }
        saveLocalProject(payload);
        alert("Project posted and saved to Cloud MySQL successfully!\nProject ID: " + confirmedProjectId);
        window.location.href = "customer projects.html";
      } else {
        console.error("Invalid response from server (missing persisted project ID):", respData);
        alert("Server Error: Project submission could not be verified by Cloud MySQL.");
      }
    } else {
      const errText = await res.text();
      console.error("Backend Error Status:", res.status);
      console.error("Backend Error Response Body:", errText);
      alert("Server Error (" + res.status + "): " + (errText || "Could not save project."));
    }
  } catch (e) {
    console.error("Network/Fetch Error:", e);
    alert("Network Error: Could not connect to the backend server.");
  }
}

function saveLocalProject(p) {
  const customerList = JSON.parse(localStorage.getItem("customerProjects") || "[]");
  const globalProjects = JSON.parse(localStorage.getItem("allListedProjects") || "[]");

  const projectRecord = {
    id: p.id || p.projectId || ("PRJ-" + Date.now()),
    projectId: p.projectId || p.id || ("PRJ-" + Date.now()),
    title: p.projectTitle,
    category: p.projectType,
    customerName: JSON.parse(localStorage.getItem("currentUser") || "{}").name || "Customer",
    location: `${p.location.city || 'Greater Noida'}, ${p.location.state || 'UP'}`,
    address: p.location.address || "Complete site address provided",
    pincode: p.location.pincode,
    totalArea: p.totalArea,
    qualityTier: p.qualityTier,
    budgetRange: `₹${(p.budget.min/100000).toFixed(1)}L - ₹${(p.budget.max/100000).toFixed(1)}L`,
    targetDate: p.timeline.startDate,
    status: "OPEN FOR BIDS",
    postedDate: "Just now",
    hasBasement: p.hasBasement || false,
    basementDetails: p.basementDetails || null,
    floors: p.floors || [],
    scopeOfWork: p.scopeOfWork || [],
    renovationAreas: p.renovationAreas || [],
    renovScope: p.renovScope || [],
    extensionDetails: p.extensionDetails || {},
    interiorRooms: p.rooms || {},
    interiorScope: p.scope || [],
    interiorPreferences: p.interiorPreferences || {},
    commercial: p.commercial || {},
    industrial: p.industrial || {},
    customDetails: p.custom || {}
  };

  customerList.unshift(projectRecord);
  globalProjects.unshift(projectRecord);

  localStorage.setItem("customerProjects", JSON.stringify(customerList));
  localStorage.setItem("allListedProjects", JSON.stringify(globalProjects));
}

/* =========================================================
   UTILITIES & TOASTS
   ========================================================= */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast-msg ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function updateLocationInfo() {
  const city = document.getElementById("cityInput")?.value.trim();
  const state = document.getElementById("stateSelect")?.value;
  const locElem = document.getElementById("locInfo");
  if (locElem) locElem.textContent = city && state ? `${city}, ${state}` : (city || state || "Enter location in Step 2");
  recalculateDynamicEstimates();
}

function setLiveDatasetDate() {
  const elem = document.getElementById("rateUpdateDate");
  if (elem) elem.textContent = "Verified reference rates";
}

function syncUniversalUserProfile() {
  const u = JSON.parse(localStorage.getItem("currentUser") || localStorage.getItem("customerUser") || "null");
  if (u) {
    const nameEl = document.getElementById("navUserName");
    const avatarEl = document.getElementById("navUserAvatar");
    if (nameEl) nameEl.textContent = (u.name || u.fullName || "User").split(" ")[0];
    if (avatarEl) avatarEl.textContent = (u.name || u.fullName || "U").substring(0, 2).toUpperCase();
  }
}

function initEventListeners() {}
function saveDraft() { localStorage.setItem("projectDraft", JSON.stringify(projectState)); alert("Draft Saved!"); }
function resetForm() { window.location.reload(); }
function shareProject() { navigator.clipboard?.writeText(window.location.href); alert("Estimate link copied!"); }
