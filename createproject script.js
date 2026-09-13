function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.location && window.location.origin && !window.location.origin.startsWith("file:")) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      if (window.location.port && window.location.port !== "8080") {
        return `${window.location.protocol}//${window.location.hostname}:8080`;
      }
      return window.location.origin;
    }
    return window.location.origin;
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
  commercialData: { category: "Office Space", totalArea: 0, floors: "", hvac: "Centralized AC", fireSafety: [], electricalLoad: "Standard", passengerLifts: 1, serviceLifts: 0, parkingType: "Basement", bays: 20 },
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

      recalculateDynamicEstimates();
      return;
    }
  } catch (error) {
    console.warn("Fetch existing error:", error);
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

function renderProjectSpecificSections(type) {
  const step2Box = document.getElementById("step2DynamicFields");
  const step3Box = document.getElementById("step3DynamicContainer");
  if (!step2Box || !step3Box) return;

  step2Box.innerHTML = "";
  step3Box.innerHTML = "";

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
              <input type="number" id="customFloorsInput" class="form-input" placeholder="Count" min="1" max="50" style="display:none; width: 110px;" oninput="handleCustomFloorInput(this.value)"/>
            </div>
          </div>

          <div class="field-group">
            <label>Basement Required? *</label>
            <select id="basementSelect" class="form-input" onchange="toggleBasement(this.value)">
              <option value="No">No</option><option value="Yes">Yes</option>
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
    `;
    generateFloorTabs(1);
  } else {
    step2Box.innerHTML = `<p>Please configure details for ${type}</p>`;
  }
}

function handleFloorSelectionChange(val) {
  const customInp = document.getElementById("customFloorsInput");
  if (val === "custom") {
    if (customInp) { customInp.style.display = "block"; customInp.value = 6; }
    generateFloorTabs(6);
  } else {
    if (customInp) { customInp.style.display = "none"; customInp.value = ""; }
    generateFloorTabs(parseInt(val) || 1);
  }
}

function handleCustomFloorInput(val) {
  let count = parseInt(val);
  if (isNaN(count) || count < 1) count = 1;
  generateFloorTabs(count);
}

function toggleBasement(val) {
  projectState.hasBasement = (val === "Yes");
  renderTabsAndPanes();
}

function generateFloorTabs(num) {
  num = parseInt(num) || 1;
  projectState.floorsCount = num;
  const floorNames = ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor", "5th Floor"];
  projectState.floorsData = [];
  for (let i = 0; i < num; i++) {
    projectState.floorsData.push({
      floorName: i < floorNames.length ? floorNames[i] : `${i}th Floor`,
      approxArea: 0,
      rooms: {},
      roomAreas: {},
      specialRequirements: ""
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

  projectState.floorsData.forEach((f, idx) => {
    const tabBtn = document.createElement("button");
    tabBtn.type = "button";
    tabBtn.className = `tab-btn ${idx === 0 ? "active" : ""}`;
    tabBtn.textContent = f.floorName;
    tabBtn.onclick = () => switchFloorTab(idx);
    tabBar.appendChild(tabBtn);

    const pane = document.createElement("div");
    pane.className = `floor-pane ${idx === 0 ? "active" : ""}`;
    pane.id = `floorPane-${idx}`;
    pane.innerHTML = `<p>Configure requirements for ${f.floorName}</p>`;
    panes.appendChild(pane);
  });
}

function switchFloorTab(idx) {
  document.querySelectorAll(".tab-btn").forEach((b, i) => b.classList.toggle("active", i === idx));
  document.querySelectorAll(".floor-pane").forEach((p, i) => p.classList.toggle("active", i === idx));
}

function recalculateDynamicEstimates() {
  const totalArea = parseFloat(document.getElementById("builtUpAreaInput")?.value) || 0;
  projectState.calculatedArea = totalArea;
  if (totalArea > 0) {
    const total = totalArea * 1600;
    document.getElementById("costRangeDisplay").innerText = `₹${(total*0.95/100000).toFixed(1)}L – ₹${(total*1.15/100000).toFixed(1)}L`;
    document.getElementById("lowerEstLabel").innerText = `₹${(total*0.95/100000).toFixed(1)}L`;
    document.getElementById("expectedEstLabel").innerText = `₹${(total/100000).toFixed(1)}L`;
    document.getElementById("higherEstLabel").innerText = `₹${(total*1.15/100000).toFixed(1)}L`;
  }
}

function validateCurrentStep(step) {
  if (step === 2) {
    const title = document.getElementById("projectTitleInput");
    if (!title || !title.value.trim()) { alert("Please enter Project Title"); return false; }
    const city = document.getElementById("cityInput");
    if (!city || !city.value.trim()) { alert("Please enter City"); return false; }
    const state = document.getElementById("stateSelect");
    if (!state || !state.value.trim()) { alert("Please select State"); return false; }
    const pin = document.getElementById("pincodeInput");
    if (!pin || !pin.value.trim()) { alert("Please enter Pincode"); return false; }
    const addr = document.getElementById("addressInput");
    if (!addr || !addr.value.trim()) { alert("Please enter Address"); return false; }
  }
  return true;
}

function goToStep(step) {
  if (step > currentStep && !validateCurrentStep(currentStep)) return;
  currentStep = step;
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`stepPane${i}`)?.classList.toggle("active", i === currentStep);
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
  document.getElementById("revTitle").textContent = document.getElementById("projectTitleInput")?.value || "Untitled";
  document.getElementById("revLocation").textContent = `${document.getElementById("cityInput")?.value || ''}, ${document.getElementById("stateSelect")?.value || ''}`;
  document.getElementById("revSize").textContent = `${projectState.calculatedArea} sq.ft.`;
  document.getElementById("revQuality").textContent = projectState.qualityTier;
}

/* =========================================================
   SUBMIT PROJECT TO CLOUD MYSQL (RENDER BACKEND)
   ========================================================= */
async function submitProject() {
  const token = getAuthToken();
  if (!token) {
    alert("Authentication required. Please login first.");
    window.location.href = "index.html";
    return;
  }

  const generatedProjectId = "PRJ-" + Date.now();
  const payload = {
    projectId: generatedProjectId,
    projectTitle: document.getElementById("projectTitleInput")?.value || "BuildBid Project",
    projectType: projectState.projectType,
    location: {
      city: document.getElementById("cityInput")?.value || "",
      state: document.getElementById("stateSelect")?.value || "",
      pincode: document.getElementById("pincodeInput")?.value || "",
      address: document.getElementById("addressInput")?.value || ""
    },
    totalArea: projectState.calculatedArea || parseFloat(document.getElementById("builtUpAreaInput")?.value) || 0,
    qualityTier: projectState.qualityTier || "Standard",
    estimatedCost: document.getElementById("costRangeDisplay")?.textContent || "",
    description: document.getElementById("ncDescription")?.value || "",
    budget: { min: 0, max: 0 },
    timeline: { startDate: "Flexible" }
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/customer/projects/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const respData = await res.json().catch(() => ({}));
      alert("Project successfully saved to Cloud MySQL Database!\nProject ID: " + (respData.projectId || generatedProjectId));
      window.location.href = "customer projects.html";
    } else {
      const errJson = await res.json().catch(() => ({ error: "Unknown server error" }));
      alert("Failed to save to database: " + (errJson.error || errJson.message || "Server error"));
    }
  } catch (e) {
    console.error("Network Error:", e);
    alert("Network Error: Could not connect to Render backend server.");
  }
}

function showToast(msg) { alert(msg); }
function updateLocationInfo() {}
function setLiveDatasetDate() {
  const now = new Date();
  const elem = document.getElementById("rateUpdateDate");
  if (elem) elem.textContent = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;
}
function syncUniversalUserProfile() {
  const u = JSON.parse(localStorage.getItem("currentUser") || localStorage.getItem("customerUser") || "null");
  if (u) {
    if (document.getElementById("navUserName")) document.getElementById("navUserName").textContent = u.name || "User";
    if (document.getElementById("navUserAvatar")) document.getElementById("navUserAvatar").textContent = (u.name || "U").substring(0, 2).toUpperCase();
  }
}
function initEventListeners() {}
function saveDraft() { alert("Draft Saved!"); }
function resetForm() { window.location.reload(); }
function shareProject() { alert("Link copied!"); }
