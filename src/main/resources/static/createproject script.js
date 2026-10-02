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

const BILINGUAL_STRINGS = {
  // Room Types
  "Bedrooms": "बेडरूम",
  "Bathrooms": "बाथरूम",
  "Living Room": "लिविंग रूम",
  "Dining Room": "डाइनिंग रूम",
  "Kitchen": "किचन",
  "Pooja Room": "पूजा कमरा",
  "Study Room": "स्टडी रूम",
  "Store Room": "स्टोर रूम",
  "Balcony": "बालकनी",
  "Parking": "पार्किंग",
  "Utility/Wash Area": "यूटिलिटी / वॉश एरिया",
  "Master Bedroom": "मास्टर बेडरूम",
  "Compact Bedroom": "छोटा बेडरूम",
  "Compact Bathroom": "छोटा बाथरूम",

  // Basement Room Types
  "Parking Space": "पार्किंग स्पेस",
  "Gym / Fitness Area": "जिम / फिटनेस",
  "Home Theatre": "होम थिएटर",
  "Multi-purpose Hall": "मल्टी-पर्पस हॉल",
  "Powder Room / Toilet": "टॉयलेट / वॉशरूम",
  "Pantry / Bar Area": "पेंट्री / बार",
  "Servant / Driver Room": "ड्राइवर / सर्वेंट रूम",

  // Floor Names
  "Ground Floor": "ग्राउंड फ्लोर",
  "1st Floor": "फर्स्ट फ्लोर",
  "2nd Floor": "सेकंड फ्लोर",
  "3rd Floor": "थर्ड फ्लोर",
  "4th Floor": "फोर्थ फ्लोर",
  "5th Floor": "फिफ्थ फ्लोर",
  "6th Floor": "सिक्स्थ फ्लोर",
  "7th Floor": "सेवंथ फ्लोर",
  "8th Floor": "एइट्थ फ्लोर",
  "9th Floor": "नाइन्थ फ्लोर",
  "10th Floor": "टेंथ फ्लोर",
  "Basement": "बेसमेंट",

  // Basement Features
  "Box-type Waterproofing": "बॉक्स वॉटरप्रूफिंग",
  "RCC Retaining Shear Walls": "आरसीसी रिटेनिंग दीवारें",
  "Drainage Sump & Submersible Pump": "ड्रेनेज सम्प व पम्प",
  "Mechanical Exhaust / Ventilation Shaft": "वेंटिलेशन शाफ्ट",
  "Emergency Egress / Secondary Exit": "आपातकालीन निकास",
  "Sewage Lifting / Ejector Pump": "सीवेज इजेक्टर पम्प",

  // Scope of Work
  "Site Preparation": "साइट तैयारी",
  "Excavation & Foundation": "खुदाई व नींव",
  "RCC Structural Frame": "आरसीसी ढांचा",
  "Brickwork & Plastering": "चिनाई व प्लास्टर",
  "Electrical Piping & Wiring": "इलेक्ट्रिकल वायरिंग",
  "Plumbing & Sanitary": "प्लंबिंग व सेनेटरी",
  "Waterproofing": "वॉटरप्रूफिंग",
  "Flooring & Tiling": "फ्लोरिंग व टाइल्स",
  "Doors & Windows": "दरवाजे व खिड़कियां",
  "Painting & Finishing": "पेंटिंग व फिनिशिंग"
};

/* =========================================================
   STANDARD ROOM PLANNING BENCHMARKS & ALLOWANCES
   Authoritative frontend client mirrors StandardRoomPlanningConfig.java
   ========================================================= */
const STANDARD_ROOM_BENCHMARKS = {
  "Bedrooms": { lengthFt: 10, widthFt: 12, areaSqFt: 120, label: "Std: 10×12 ft (~120 sq.ft.)" },
  "Master Bedroom": { lengthFt: 12, widthFt: 14, areaSqFt: 168, label: "Std: 12×14 ft (~168 sq.ft.)" },
  "Compact Bedroom": { lengthFt: 10, widthFt: 10, areaSqFt: 100, label: "Std: 10×10 ft (~100 sq.ft.)" },
  "Bathrooms": { lengthFt: 6, widthFt: 8, areaSqFt: 48, label: "Std: 6×8 ft (~48 sq.ft.)" },
  "Compact Bathroom": { lengthFt: 5, widthFt: 7, areaSqFt: 35, label: "Std: 5×7 ft (~35 sq.ft.)" },
  "Living Room": { lengthFt: 14, widthFt: 16, areaSqFt: 224, label: "Std: 14×16 ft (~224 sq.ft.)" },
  "Dining Room": { lengthFt: 10, widthFt: 12, areaSqFt: 120, label: "Std: 10×12 ft (~120 sq.ft.)" },
  "Kitchen": { lengthFt: 8, widthFt: 10, areaSqFt: 80, label: "Std: 8×10 ft (~80 sq.ft.)" },
  "Study Room": { lengthFt: 8, widthFt: 10, areaSqFt: 80, label: "Std: 8×10 ft (~80 sq.ft.)" },
  "Pooja Room": { lengthFt: 4, widthFt: 5, areaSqFt: 20, label: "Std: 4×5 ft (~20 sq.ft.)" },
  "Store Room": { lengthFt: 6, widthFt: 8, areaSqFt: 48, label: "Std: 6×8 ft (~48 sq.ft.)" },
  "Utility/Wash Area": { lengthFt: 5, widthFt: 7, areaSqFt: 35, label: "Std: 5×7 ft (~35 sq.ft.)" },
  "Balcony": { lengthFt: 5, widthFt: 8, areaSqFt: 40, label: "Std: 5×8 ft (~40 sq.ft.)" },
  "Parking": { lengthFt: 10, widthFt: 15, areaSqFt: 150, label: "Std: 10×15 ft (~150 sq.ft.)" }
};

let PLANNING_ALLOWANCE_RATIO = 0.20; // 20% circulation and structural wall allowance

async function syncRoomStandardsFromBackend() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/cost-estimator/room-standards`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.standards) {
        Object.entries(data.standards).forEach(([k, v]) => {
          if (v && v.areaSqFt) {
            STANDARD_ROOM_BENCHMARKS[k] = {
              lengthFt: v.lengthFt || (STANDARD_ROOM_BENCHMARKS[k]?.lengthFt || 10),
              widthFt: v.widthFt || (STANDARD_ROOM_BENCHMARKS[k]?.widthFt || 12),
              areaSqFt: v.areaSqFt,
              label: `Std: ${v.lengthFt || 10}×${v.widthFt || 12} ft (~${v.areaSqFt} sq.ft.)`
            };
          }
        });
      }
      if (data && data.planningAllowanceRatio) {
        PLANNING_ALLOWANCE_RATIO = parseFloat(data.planningAllowanceRatio) || 0.20;
      }
    }
  } catch (err) {
    // Non-fatal, fallback to default benchmarks
  }
}
syncRoomStandardsFromBackend();

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
        const text = c.dataset.type || c.querySelector("h4")?.childNodes[0]?.textContent?.trim() || c.querySelector("h4")?.textContent.trim();
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
          <label>Construction Purpose * <span class="hi-sub">निर्माण का उद्देश्य</span></label>
          <select id="ncPurpose" class="form-input">
            <option value="Residential House">Residential House / आवासीय मकान</option>
            <option value="Villa">Villa / विला</option>
            <option value="Duplex">Duplex / डुप्लेक्स</option>
            <option value="Farmhouse">Farmhouse / फार्महाउस</option>
            <option value="Rental Property">Rental Property / किराए का मकान</option>
            <option value="Other">Other / अन्य</option>
          </select>
        </div>
        <div class="field-group">
          <label>Plot Area (sq.ft.) <span class="hi-sub">प्लॉट का क्षेत्रफल</span></label>
          <input type="number" id="plotAreaInput" class="form-input" placeholder="e.g. 3000 / उदा. 3000">
        </div>
        <div class="field-group">
          <label>Plot Dimensions (Length x Width ft) <span class="hi-sub">प्लॉट का नाप (लंबाई x चौड़ाई फीट)</span></label>
          <div class="input-inline-grid">
            <input type="number" class="form-input" placeholder="Length / लंबाई (ft)">
            <input type="number" class="form-input" placeholder="Width / चौड़ाई (ft)">
          </div>
        </div>
        <div class="field-group">
          <label>Plot Facing <span class="hi-sub">प्लॉट की दिशा (मुखाभिमुख)</span></label>
          <select id="ncPlotFacing" class="form-input">
            <option value="North">North / उत्तर</option>
            <option value="East">East / पूर्व</option>
            <option value="West">West / पश्चिम</option>
            <option value="South">South / दक्षिण</option>
            <option value="North-East">North-East / उत्तर-पूर्व (ईशान)</option>
            <option value="North-West">North-West / उत्तर-पश्चिम (वायव्य)</option>
            <option value="South-East">South-East / दक्षिण-पूर्व (आग्नेय)</option>
            <option value="South-West">South-West / दक्षिण-पश्चिम (नैऋत्य)</option>
          </select>
        </div>
        <div class="field-group">
          <label>Road Width (ft) <span class="hi-sub">सामने सड़क की चौड़ाई (फीट)</span></label>
          <input type="number" class="form-input" placeholder="e.g. 30 / उदा. 30">
        </div>
        <div class="field-group">
          <label>Corner Plot? <span class="hi-sub">क्या यह कॉर्नर प्लॉट है?</span></label>
          <select id="ncCornerPlot" class="form-input">
            <option value="No">No / नहीं</option>
            <option value="Yes">Yes / हाँ</option>
          </select>
        </div>
      </div>
      <div class="field-group full-width mt-3">
        <label>Project Description (Optional) <span class="hi-sub">प्रोजेक्ट का विवरण (वैकल्पिक)</span></label>
        <textarea id="ncDescription" rows="3" class="form-input" placeholder="Describe what you want to build (Optional) / आप क्या बनवाना चाहते हैं यहाँ लिख सकते हैं..."></textarea>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-layer-group"></i> Construction Scale <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">निर्माण पैमाना</span></div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Total Built-up Area (sq.ft.) * <span class="hi-sub">कुल बिल्ट-अप एरिया</span></label>
            <input type="number" id="builtUpAreaInput" class="form-input" placeholder="e.g. 2400 / उदा. 2400" oninput="handleTotalAreaChange(this.value)">
          </div>

          <div class="field-group">
            <label>Number of Floors * <span class="hi-sub">मंज़िलों की संख्या</span></label>
            <div class="floor-selection-container" style="display: flex; gap: 8px;">
              <select id="numFloorsSelect" class="form-input" onchange="handleFloorSelectionChange(this.value)">
                <option value="1">Ground Floor Only / सिर्फ ग्राउंड फ्लोर</option>
                <option value="2">G + 1 Floor / ग्राउंड + 1 मंज़िल</option>
                <option value="3">G + 2 Floors / ग्राउंड + 2 मंज़िल</option>
                <option value="4">G + 3 Floors / ग्राउंड + 3 मंज़िल</option>
                <option value="5">G + 4 Floors / ग्राउंड + 4 मंज़िल</option>
                <option value="custom">Custom (Specify) / अन्य (दर्ज करें)</option>
              </select>
              <input 
                type="number" 
                id="customFloorsInput" 
                class="form-input" 
                placeholder="Count / संख्या" 
                min="1" 
                max="50" 
                style="display:none; width: 130px;" 
                oninput="handleCustomFloorInput(this.value)"
              />
            </div>
          </div>

          <div class="field-group">
            <label>Basement Required? * <span class="hi-sub">बेसमेंट चाहिए?</span></label>
            <select id="basementSelect" class="form-input" onchange="toggleBasement(this.value)">
              <option value="No">No / नहीं</option>
              <option value="Yes">Yes / हाँ</option>
            </select>
          </div>
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-stairs"></i> Floor-wise Detailed Requirements <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">मंज़िल-वार विस्तृत आवश्यकताएं</span></div>
        <div id="projectAreaEnvelopeSummary" class="mb-3"></div>
        <div class="floor-tab-bar" id="floorTabBar"></div>
        <div id="floorPanesContainer"></div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-screwdriver-wrench"></i> Scope of Work Categories <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">कार्य का दायरा / स्कोप</span></div>
        <div class="room-pill-grid">
          ${["Site Preparation", "Excavation & Foundation", "RCC Structural Frame", "Brickwork & Plastering", "Electrical Piping & Wiring", "Plumbing & Sanitary", "Waterproofing", "Flooring & Tiling", "Doors & Windows", "Painting & Finishing"].map(item => {
            const hiScope = BILINGUAL_STRINGS[item] || "";
            return `
            <label class="checkbox-pill">
              <input type="checkbox" onchange="toggleGenericCheckbox('scopeOfWork', '${item}', this.checked)">
              <span>${item} ${hiScope ? `<span class="hi-sub" style="font-size:11px;">(${hiScope})</span>` : ''}</span>
            </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-faucet-drip"></i> Site Readiness & Utilities <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">साइट की स्थिति व सुविधाएं</span></div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Current Site Condition <span class="hi-sub">साइट की वर्तमान स्थिति</span></label>
            <select class="form-input">
              <option value="Plain Empty Land">Plain Empty Land / खाली समतल ज़मीन</option>
              <option value="Old Structure to Demolish">Old Structure to Demolish / पुराना ढांचा गिराना है</option>
              <option value="Needs Leveling/Clearing">Needs Leveling/Clearing / सफाई या समतल करना ज़रूरी</option>
            </select>
          </div>
          <div class="field-group">
            <label>Water Connection Available? <span class="hi-sub">पानी की सुविधा उपलब्ध है?</span></label>
            <select class="form-input">
              <option value="Yes, Available on site">Yes, Available on site / हाँ, साइट पर उपलब्ध है</option>
              <option value="No, Need Borewell / Tanker">No, Need Borewell / Tanker / नहीं, बोरवेल या टैंकर चाहिए</option>
            </select>
          </div>
          <div class="field-group">
            <label>Electricity Source <span class="hi-sub">बिजली का स्रोत</span></label>
            <select class="form-input">
              <option value="Temporary Meter Available">Temporary Meter Available / अस्थाई मीटर उपलब्ध है</option>
              <option value="Nearby pole available">Nearby pole available / पास में खंभा उपलब्ध है</option>
              <option value="Generator required">Generator required / जनरेटर की आवश्यकता होगी</option>
            </select>
          </div>
          <div class="field-group">
            <label>Heavy Vehicle Access (Transit Mixers/JCB) <span class="hi-sub">भारी वाहनों की पहुंच (ट्रांजिट मिक्सर/JCB)</span></label>
            <select class="form-input">
              <option value="Direct Wide Road Access">Direct Wide Road Access / चौड़ी सड़क, सीधा प्रवेश</option>
              <option value="Narrow Road (Manual handling needed)">Narrow Road (Manual handling needed) / संकरी गली, मैन्युअल ढुलाई ज़रूरी</option>
            </select>
          </div>
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-compass-drafting"></i> Design, Quality & Plans <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">नक्शा, निर्माण गुणवत्ता व योजना</span></div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Architectural Plans Available? <span class="hi-sub">आर्किटेक्चरल ड्रॉइंग उपलब्ध है?</span></label>
            <select class="form-input">
              <option value="Yes, I have complete drawings">Yes, I have complete drawings / हाँ, पूरा नक्शा तैयार है</option>
              <option value="Partial (2D plan only)">Partial (2D plan only) / केवल 2D प्लान उपलब्ध है</option>
              <option value="No, need contractor assistance">No, need contractor assistance / नहीं, ठेकेदार/आर्किटेक्ट की मदद चाहिए</option>
            </select>
          </div>
          <div class="field-group">
            <label>Construction Quality Tier * <span class="hi-sub">निर्माण गुणवत्ता स्तर</span></label>
            <select id="ncQualitySelect" class="form-input" onchange="updateTier(this.value)">
              <option value="Standard">Standard Finish (Ultratech, Primary Steel, Vitrified Tiles) / स्टैंडर्ड फिनिश</option>
              <option value="Basic">Basic Quality (Standard materials) / बेसिक क्वालिटी</option>
              <option value="Premium">Premium / Luxury (Italian Marble, Automation, Branded Fittings) / प्रीमियम / लक्ज़री</option>
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
          <label>Property Type * <span class="hi-sub">प्रॉपर्टी का प्रकार</span></label>
          <select id="renovPropertyType" class="form-input">
            <option value="Apartment">Apartment / अपार्टमेंट</option>
            <option value="Independent House">Independent House / स्वतंत्र मकान</option>
            <option value="Villa">Villa / विला</option>
            <option value="Commercial Space">Commercial Space / व्यावसायिक स्थल</option>
            <option value="Other">Other / अन्य</option>
          </select>
        </div>
        <div class="field-group">
          <label>Property Age (Years) <span class="hi-sub">प्रॉपर्टी की उम्र (वर्ष)</span></label>
          <input type="number" id="renovAge" class="form-input" placeholder="e.g. 15 / उदा. 15">
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-vector-square"></i> Areas to Renovate * <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">रेनोवेशन के क्षेत्र</span></div>
        <p class="helper-text" style="margin-bottom:10px;">Select at least one area to renovate and specify its dimensions. <span class="hi-sub">(कम से कम एक क्षेत्र चुनें और नाप दर्ज करें।)</span></p>
        <div class="room-pill-grid" id="renovationAreaCheckboxes">
          ${[
            { en: "Kitchen", hi: "किचन" },
            { en: "Bathroom(s)", hi: "बाथरूम" },
            { en: "Living Room", hi: "लिविंग रूम" },
            { en: "Bedroom(s)", hi: "बेडरूम" },
            { en: "Exterior", hi: "बाहरी हिस्सा" },
            { en: "Entire Property", hi: "पूरी प्रॉपर्टी" }
          ].map(area => `
            <label class="checkbox-pill">
              <input type="checkbox" onchange="toggleRenovationAreaTab('${area.en}', this.checked)">
              <span>${area.en} <span class="hi-sub" style="font-size:11px;">(${area.hi})</span></span>
            </label>
          `).join('')}
        </div>
      </div>
      <div id="renovationDynamicAreaTabsContainer" class="mt-3"></div>
      
      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-paint-roller"></i> Renovation Requirements <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">रेनोवेशन कार्य आवश्यकताएं</span></div>
        <div class="room-pill-grid">
          ${[
            { en: "Wall Putty & Repainting", hi: "पुट्टी व पुताई" },
            { en: "Tile Overlap/Replacement", hi: "टाइल्स बदलना" },
            { en: "Plumbing Fixture Upgrade", hi: "प्लंबिंग अपग्रेड" },
            { en: "False Ceiling & Profile Lights", hi: "फॉल्स सीलिंग व लाइट्स" },
            { en: "Dampness / Seelan Treatment", hi: "सीलन उपचार" },
            { en: "Door & Window Replacement", hi: "दरवाजे व खिड़की" },
            { en: "Cabinetry / Wardrobes", hi: "अलमारी व कैबिनेट" }
          ].map(req => `
            <label class="checkbox-pill">
              <input type="checkbox" onchange="toggleGenericCheckbox('renovScope', '${req.en}', this.checked)">
              <span>${req.en} <span class="hi-sub" style="font-size:11px;">(${req.hi})</span></span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-swatchbook"></i> Material Sourcing & Finish <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">सामग्री व फिनिश व्यवस्था</span></div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Desired Finish Quality * <span class="hi-sub">फिनिश क्वालिटी</span></label>
            <select class="form-input" onchange="updateTier(this.value)">
              <option value="Standard">Standard Finish / स्टैंडर्ड फिनिश</option>
              <option value="Basic">Basic Quality / बेसिक क्वालिटी</option>
              <option value="Premium">Premium / Luxury / प्रीमियम लक्ज़री</option>
            </select>
          </div>
          <div class="field-group">
            <label>Material Sourcing <span class="hi-sub">सामग्री व्यवस्था</span></label>
            <select class="form-input">
              <option value="Contractor to provide all materials">Contractor to provide all materials / ठेकेदार लाएगा</option>
              <option value="I will provide materials">I will provide materials / ग्राहक खुद लाएगा</option>
              <option value="Mix of both">Mix of both / दोनों मिलकर</option>
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
          <label>Existing Property Type * <span class="hi-sub">वर्तमान प्रॉपर्टी प्रकार</span></label>
          <select id="extExistingType" class="form-input">
            <option value="Independent House">Independent House / स्वतंत्र मकान</option>
            <option value="Villa">Villa / विला</option>
            <option value="Farmhouse">Farmhouse / फार्महाउस</option>
            <option value="Commercial">Commercial / व्यावसायिक</option>
          </select>
        </div>
        <div class="field-group">
          <label>Current Floors * <span class="hi-sub">वर्तमान मंज़िलें</span></label>
          <select id="extCurrentFloors" class="form-input">
            <option value="Ground only">Ground only / सिर्फ ग्राउंड</option>
            <option value="G+1">G+1 / ग्राउंड + 1</option>
            <option value="G+2">G+2 / ग्राउंड + 2</option>
          </select>
        </div>
        <div class="field-group">
          <label>Age of Existing Property (Years) <span class="hi-sub">मकान की उम्र (वर्ष)</span></label>
          <input type="number" class="form-input" placeholder="e.g. 10 / उदा. 10">
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-arrows-up-down-left-right"></i> Direction of Extension * <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">विस्तार की दिशा</span></div>
        <div class="input-inline-grid">
          <label class="checkbox-pill"><input type="radio" name="extDirection" value="Vertical" checked onchange="toggleExtensionDirection('Vertical')"> <span>Vertical (Adding a floor) <span class="hi-sub">(ऊपर मंज़िल बढ़ाना)</span></span></label>
          <label class="checkbox-pill"><input type="radio" name="extDirection" value="Horizontal" onchange="toggleExtensionDirection('Horizontal')"> <span>Horizontal (Expanding footprint) <span class="hi-sub">(ज़मीन पर आगे बढ़ाना)</span></span></label>
        </div>
        <div class="field-group mt-3">
          <label>New Built-up Area to Add (sq.ft.) * <span class="hi-sub">नया बिल्ट-अप एरिया</span></label>
          <input type="number" id="builtUpAreaInput" class="form-input" placeholder="e.g. 1100 / उदा. 1100" oninput="recalculateDynamicEstimates()">
        </div>
      </div>
      <div id="extensionDynamicSection" class="spec-section mt-3"></div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-door-closed"></i> Rooms to Add in Extension <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">जोड़े जाने वाले कमरे</span></div>
        <div class="room-counter-grid">
          ${["Bedrooms", "Bathrooms", "Living Room", "Balcony", "Kitchenette"].map(r => {
            const hiR = BILINGUAL_STRINGS[r] || (r === "Kitchenette" ? "छोटा किचन" : "");
            return `
            <div class="room-counter-item">
              <span>${r}${hiR ? ` <span class="hi-sub">(${hiR})</span>` : ''}</span>
              <div class="qty-control">
                <button type="button" class="qty-btn" onclick="adjustExtensionRoom('${r}', -1)">-</button>
                <span class="qty-val" id="qty-ext-${r}">0</span>
                <button type="button" class="qty-btn" onclick="adjustExtensionRoom('${r}', 1)">+</button>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-link"></i> Structural Tie-in & Requirements <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">संरचनात्मक आवश्यकताएं</span></div>
        <div class="room-pill-grid">
          ${[
            { en: "Roof Waterproofing Tie-in", hi: "छत वॉटरप्रूफिंग" },
            { en: "Plumbing Stack Extension", hi: "प्लंबिंग विस्तार" },
            { en: "Electrical Panel Upgrade", hi: "इलेक्ट्रिकल पैनल अपग्रेड" },
            { en: "New Staircase Construction", hi: "नई सीढ़ी निर्माण" },
            { en: "Balcony Railings", hi: "बालकनी रेलिंग" }
          ].map(item => `
            <label class="checkbox-pill"><input type="checkbox"> <span>${item.en} <span class="hi-sub" style="font-size:11px;">(${item.hi})</span></span></label>
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
          <label>Property Type * <span class="hi-sub">प्रॉपर्टी प्रकार</span></label>
          <select class="form-input">
            <option value="Apartment">Apartment / अपार्टमेंट</option>
            <option value="Independent House">Independent House / स्वतंत्र मकान</option>
            <option value="Villa">Villa / विला</option>
            <option value="Commercial Office">Commercial Office / कार्यालय</option>
            <option value="Retail Shop">Retail Shop / दुकान</option>
          </select>
        </div>
        <div class="field-group">
          <label>Current Condition * <span class="hi-sub">वर्तमान स्थिति</span></label>
          <select class="form-input">
            <option value="Bare Shell (No flooring/wiring)">Bare Shell (No flooring/wiring) / खाली ढांचा</option>
            <option value="Builder Finished">Builder Finished / बिल्डर फिनिश्ड</option>
            <option value="Old/Furnished (Requires dismantling)">Old/Furnished (Requires dismantling) / पुराना फर्निश</option>
          </select>
        </div>
        <div class="field-group">
          <label>Carpet Area (sq.ft.) * <span class="hi-sub">कारपेट एरिया</span></label>
          <input type="number" id="builtUpAreaInput" class="form-input" placeholder="e.g. 1450 / उदा. 1450" oninput="recalculateDynamicEstimates()">
        </div>
        <div class="field-group">
          <label>Ceiling Height (ft) <span class="hi-sub">छत की ऊंचाई (फीट)</span></label>
          <input type="number" class="form-input" placeholder="e.g. 10 / उदा. 10">
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-palette"></i> Design Vision & Preference <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">डिज़ाइन पसंद व थीम</span></div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Preferred Theme <span class="hi-sub">पसंदीदा थीम</span></label>
            <select class="form-input">
              <option value="Modern Minimalist">Modern Minimalist / मॉडर्न मिनिमलिस्ट</option>
              <option value="Contemporary">Contemporary / कंटेम्परेरी</option>
              <option value="Traditional / Classic">Traditional / Classic / पारंपरिक</option>
              <option value="Industrial">Industrial / इंडस्ट्रियल</option>
              <option value="Bohemian">Bohemian / बोहेमियन</option>
            </select>
          </div>
          <div class="field-group">
            <label>Woodwork Preference * <span class="hi-sub">वुडवर्क प्राथमिकता</span></label>
            <select class="form-input">
              <option value="Factory-made Modular">Factory-made Modular / फैक्ट्री मेड मॉड्युलर</option>
              <option value="On-site Custom Carpentry">On-site Custom Carpentry / साइट पर कारपेंट्री</option>
              <option value="Mix of both">Mix of both / दोनों का मिश्रण</option>
            </select>
          </div>
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-list-check"></i> Comprehensive Interior Requirements <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">विस्तृत इंटीरियर आवश्यकताएं</span></div>
        <div class="room-pill-grid">
          ${[
            { en: "Full False Ceiling (POP/Gypsum)", hi: "फॉल्स सीलिंग" },
            { en: "Profile LED & Ambient Lighting", hi: "एलईडी व लाइटिंग" },
            { en: "Modular Kitchen with Island", hi: "मॉड्युलर किचन" },
            { en: "Full Height Sliding Wardrobes", hi: "स्लाइडिंग अलमारी" },
            { en: "TV Unit & Console", hi: "टीवी यूनिट" },
            { en: "Shoe Rack & Foyer Design", hi: "शू रैक व फोयर" },
            { en: "Bathroom Vanity Cabinets", hi: "बाथरूम वैनिटी" },
            { en: "Wall Paneling / Fluted Panels", hi: "वॉल पैनलिंग" },
            { en: "Wallpaper / Texture Paint", hi: "वॉलपेपर व पेंट" }
          ].map(item => `
            <label class="checkbox-pill">
              <input type="checkbox" onchange="toggleGenericCheckbox('interiorScope', '${item.en}', this.checked)">
              <span>${item.en} <span class="hi-sub" style="font-size:11px;">(${item.hi})</span></span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-couch"></i> Room-Specific Scope (Select to customize) <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">कमरे-वार कार्य</span></div>
        <div class="room-pill-grid">
          ${["Living Room", "Master Bedroom", "Kitchen", "Kids Bedroom", "Guest Bedroom", "Dining Space"].map(r => {
            const hiR = BILINGUAL_STRINGS[r] || (r === "Kids Bedroom" ? "बच्चों का कमरा" : (r === "Guest Bedroom" ? "गेस्ट रूम" : "डाइनिंग"));
            return `
            <label class="checkbox-pill">
              <input type="checkbox" onchange="toggleInteriorRoomAccordion('${r}', this.checked)">
              <span>${r} <span class="hi-sub" style="font-size:11px;">(${hiR})</span></span>
            </label>
            `;
          }).join('')}
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
          <label>Commercial Category * <span class="hi-sub">कमर्शियल श्रेणी</span></label>
          <select id="commCategory" class="form-input" onchange="projectState.commercialData.category = this.value">
            <option value="Office Space">Office Space / ऑफिस</option>
            <option value="Retail / Mall">Retail / Mall / रिटेल मॉल</option>
            <option value="Showroom" selected>Showroom / शोरूम</option>
            <option value="Hospital / Clinic">Hospital / Clinic / अस्पताल</option>
            <option value="Hotel / Hospitality">Hotel / Hospitality / होटल</option>
            <option value="Educational Institution">Educational Institution / शिक्षण संस्थान</option>
          </select>
        </div>
        <div class="field-group">
          <label>Zoning & Approvals * <span class="hi-sub">ज़ोनिंग व अनुमतियां</span></label>
          <select id="commZoning" class="form-input" onchange="projectState.commercialData.zoning = this.value">
            <option value="Fully Approved (RERA/Local body)">Fully Approved (RERA/Local body) / पूर्णतः स्वीकृत</option>
            <option value="Land converted for commercial use">Land converted for commercial use / गैर-कृषि व्यवसायिक भूमि</option>
            <option value="Approval pending">Approval pending / प्रक्रियाधीन</option>
          </select>
        </div>
        <div class="field-group">
          <label>Plot Area (sq.ft.) <span class="hi-sub">प्लॉट क्षेत्रफल</span></label>
          <input type="number" id="plotAreaInput" class="form-input" placeholder="e.g. 12000 / उदा. 12000" oninput="projectState.commercialData.plotArea = parseFloat(this.value)||0">
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-building"></i> Commercial Scale & Floor Plates <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">पैमाना व फ्लोर प्लेट</span></div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Total Built-up Area (sq.ft.) * <span class="hi-sub">कुल बिल्ट-अप एरिया</span></label>
            <input type="number" id="builtUpAreaInput" class="form-input" placeholder="e.g. 35000 / उदा. 35000" oninput="recalculateDynamicEstimates(); if (projectState.commercialData) projectState.commercialData.totalArea = parseFloat(this.value)||0;">
          </div>
          <div class="field-group">
            <label>Number of Floors (e.g., 2B+G+5) <span class="hi-sub">मंज़िलों की संख्या</span></label>
            <input type="text" id="commFloors" class="form-input" placeholder="e.g. B+G+4 / उदा. B+G+4" oninput="projectState.commercialData.floors = this.value">
          </div>
          <div class="field-group">
            <label>Typical Floor Plate Area (sq.ft.) <span class="hi-sub">प्रति मंज़िल प्लेट क्षेत्रफल</span></label>
            <input type="number" id="commFloorPlate" class="form-input" placeholder="e.g. 7000 / उदा. 7000" oninput="projectState.commercialData.floorPlateArea = parseFloat(this.value)||0">
          </div>
          <div class="field-group">
            <label>Ceiling Height (ft) <span class="hi-sub">छत की ऊंचाई (फीट)</span></label>
            <input type="number" id="commCeilingHeight" class="form-input" placeholder="e.g. 12 / उदा. 12" oninput="projectState.commercialData.ceilingHeight = parseFloat(this.value)||0">
          </div>
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-gears"></i> Specialized Infrastructure & Requirements <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">इन्फ्रास्ट्रक्चर व सुविधाएं</span></div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>HVAC System * <span class="hi-sub">एचवीएसी सिस्टम</span></label>
            <select id="commHvac" class="form-input" onchange="projectState.commercialData.hvac = this.value">
              <option value="Centralized Chillers">Centralized Chillers / सेंट्रलाइज्ड चिलर</option>
              <option value="VRV/VRF System">VRV/VRF System / वीआरवी/वीआरएफ</option>
              <option value="Split AC Provision">Split AC Provision / स्प्लिट एसी</option>
              <option value="None">None / कोई नहीं</option>
            </select>
          </div>
          <div class="field-group">
            <label>Electrical Load <span class="hi-sub">इलेक्ट्रिकल लोड</span></label>
            <select id="commElectricalLoad" class="form-input" onchange="projectState.commercialData.electricalLoad = this.value">
              <option value="Heavy Duty (Substation/HT Panel)">Heavy Duty (Substation/HT Panel) / सबस्टेशन / एचटी</option>
              <option value="Standard Commercial Load">Standard Commercial Load / सामान्य कमर्शियल</option>
            </select>
          </div>
          <div class="field-group">
            <label>Passenger Lifts Count <span class="hi-sub">पैसेंजर लिफ्ट संख्या</span></label>
            <input type="number" id="commPassengerLifts" class="form-input" value="${projectState.commercialData.passengerLifts !== undefined ? projectState.commercialData.passengerLifts : 2}" min="0" oninput="projectState.commercialData.passengerLifts = parseInt(this.value)||0">
          </div>
          <div class="field-group">
            <label>Service / Stretcher Lifts Count <span class="hi-sub">सर्विस लिफ्ट संख्या</span></label>
            <input type="number" id="commServiceLifts" class="form-input" value="${projectState.commercialData.serviceLifts !== undefined ? projectState.commercialData.serviceLifts : 1}" min="0" oninput="projectState.commercialData.serviceLifts = parseInt(this.value)||0">
          </div>
        </div>
        <label class="mt-2 block" style="font-size:12px; font-weight:700; color:#334155;">Fire Fighting & Commercial Safety (NOC Standards) <span class="hi-sub" style="font-size:11.5px; font-weight:600; color:#64748b;">(अग्निशमन व सुरक्षा मानक)</span>:</label>
        <div class="room-pill-grid mt-1" id="commFireSafetyContainer">
          ${[
            { en: "Sprinklers System", hi: "स्प्रिंकलर सिस्टम" },
            { en: "Smoke Detectors", hi: "स्मोक डिटेक्टर" },
            { en: "Fire Hydrant System", hi: "फायर हाइड्रेंट" },
            { en: "Fire Escape Staircase", hi: "इमरजेंसी सीढ़ी" },
            { en: "Commercial Power Backup (DG Set)", hi: "डीजी सेट बैकअप" },
            { en: "Multi-stall Restrooms", hi: "शौचालय ब्लॉक" },
            { en: "Glass Facade / Structural Glazing", hi: "ग्लास फसाड" }
          ].map(req => `
            <label class="checkbox-pill"><input type="checkbox" checked onchange="toggleCommFireSafety('${req.en}', this.checked)"> <span>${req.en} <span class="hi-sub" style="font-size:11px;">(${req.hi})</span></span></label>
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
          <label>Facility Purpose * <span class="hi-sub">उपयोग का उद्देश्य</span></label>
          <select class="form-input">
            <option value="General Warehouse">General Warehouse / सामान्य गोदाम</option>
            <option value="Manufacturing Factory">Manufacturing Factory / निर्माण फैक्ट्री</option>
            <option value="Cold Storage">Cold Storage / कोल्ड स्टोरेज</option>
            <option value="Logistics Hub">Logistics Hub / लॉजिस्टिक्स हब</option>
            <option value="Assembly Plant">Assembly Plant / असेंबली प्लांट</option>
          </select>
        </div>
        <div class="field-group">
          <label>Zoning & Compliance * <span class="hi-sub">ज़ोनिंग व अनुमति</span></label>
          <select class="form-input">
            <option value="Approved Industrial Zone">Approved Industrial Zone / स्वीकृत औद्योगिक क्षेत्र</option>
            <option value="Non-Agricultural (NA) Land">Non-Agricultural (NA) Land / गैर-कृषि भूमि</option>
            <option value="Pending Approval">Pending Approval / प्रक्रियाधीन</option>
          </select>
        </div>
        <div class="field-group">
          <label>Total Plot Area (sq.ft.) <span class="hi-sub">कुल प्लॉट क्षेत्रफल</span></label>
          <input type="number" class="form-input" placeholder="e.g. 50000 / उदा. 50000">
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-industry"></i> Structure & Scale <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">ढांचा व पैमाना</span></div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Total Built-up Area (sq.ft.) * <span class="hi-sub">कुल बिल्ट-अप एरिया</span></label>
            <input type="number" id="builtUpAreaInput" class="form-input" placeholder="e.g. 40000 / उदा. 40000" oninput="recalculateDynamicEstimates()">
          </div>
          <div class="field-group">
            <label>Structural Type * <span class="hi-sub">स्ट्रक्चरल प्रकार</span></label>
            <select id="indStructuralType" class="form-input" onchange="recalculateDynamicEstimates()">
              <option value="PEB">PEB (Pre-Engineered Steel) / पीईबी स्टील</option>
              <option value="RCC">RCC (Concrete Structure) / आरसीसी कंक्रीट</option>
              <option value="Hybrid">Hybrid (PEB + RCC) / हाइब्रिड</option>
            </select>
          </div>
          <div class="field-group">
            <label>Clear Height / Eaves Height (Meters) <span class="hi-sub">क्लीयर ऊंचाई (मीटर)</span></label>
            <input type="number" class="form-input" placeholder="e.g. 10 / उदा. 10">
          </div>
          <div class="field-group">
            <label>Max Column-free Span (Meters) <span class="hi-sub">कॉलम-मुक्त स्पैन (मीटर)</span></label>
            <input type="number" class="form-input" placeholder="e.g. 24 / उदा. 24">
          </div>
        </div>
      </div>

      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-truck-ramp-box"></i> Industrial Requirements <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">औद्योगिक आवश्यकताएं</span></div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Flooring Type * <span class="hi-sub">फ्लोरिंग प्रकार</span></label>
            <select class="form-input">
              <option value="VDF / Tremix Heavy Flooring">VDF / Tremix Heavy Flooring / वीडीएफ ट्रेमिक्स</option>
              <option value="Epoxy Coated">Epoxy Coated / इपॉक्सी कोटेड</option>
              <option value="Standard Concrete">Standard Concrete / सामान्य कंक्रीट</option>
            </select>
          </div>
          <div class="field-group">
            <label>Floor Load Capacity (Tonnes / sq.m) <span class="hi-sub">फ्लोर लोड क्षमता (टन/वर्ग मी.)</span></label>
            <input type="number" class="form-input" placeholder="e.g. 6 / उदा. 6">
          </div>
          <div class="field-group">
            <label>Number of Loading Docks <span class="hi-sub">लोडिंग डॉक्स की संख्या</span></label>
            <input type="number" class="form-input" value="4">
          </div>
          <div class="field-group">
            <label>EOT Overhead Crane Capacity <span class="hi-sub">क्रेन क्षमता</span></label>
            <select class="form-input">
              <option value="None">None / कोई नहीं</option>
              <option value="5 Tonnes">5 Tonnes / 5 टन</option>
              <option value="10 Tonnes">10 Tonnes / 10 टन</option>
              <option value="Over 15 Tonnes">Over 15 Tonnes / 15 टन से अधिक</option>
            </select>
          </div>
        </div>
        <label class="mt-2 block" style="font-size:12px; font-weight:700; color:#334155;">Industrial Utility & Safety Features <span class="hi-sub" style="font-size:11.5px; font-weight:600; color:#64748b;">(औद्योगिक सुरक्षा व उपयोगिता)</span>:</label>
        <div class="room-pill-grid mt-1">
          ${[
            { en: "Motorized Rolling Shutters", hi: "मोटराइज्ड रोलिंग शटर" },
            { en: "Hydraulic Dock Levelers", hi: "हाइड्रोलिक डॉक लेवेलर" },
            { en: "Turbo Ridge Roof Ventilators", hi: "टर्बो वेंटिलेटर" },
            { en: "Roof PUF Insulation", hi: "पफ इंसुलेशन" },
            { en: "High-capacity Stormwater Yard", hi: "ड्रेनेज यार्ड" },
            { en: "Heavy Truck Weighbridge", hi: "ट्रक वे-ब्रिज" },
            { en: "3-Phase Heavy HT Power", hi: "3-फेज भारी बिजली" }
          ].map(req => `
            <label class="checkbox-pill"><input type="checkbox" checked> <span>${req.en} <span class="hi-sub" style="font-size:11px;">(${req.hi})</span></span></label>
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
          <label>Custom Category * <span class="hi-sub">कस्टम श्रेणी</span></label>
          <select id="otherCategorySelect" class="form-input" onchange="toggleCustomOtherField(this.value)">
            <option value="Demolition">Demolition / तोड़-फोड़</option>
            <option value="Boundary Wall">Boundary Wall / बाउंड्री वॉल</option>
            <option value="Landscaping & Pools">Landscaping & Pools / लैंडस्केपिंग व पूल</option>
            <option value="Waterproofing">Waterproofing / वॉटरप्रूफिंग</option>
            <option value="Structural Repair">Structural Repair / स्ट्रक्चरल मरम्मत</option>
            <option value="Solar Installation">Solar Installation / सोलर इंस्टॉलेशन</option>
            <option value="Completely Custom">Completely Custom / अन्य विशेष कार्य</option>
          </select>
        </div>
        <div class="field-group" id="customSpecifyBox" style="display:none;">
          <label>Specify Category * <span class="hi-sub">श्रेणी का नाम दर्ज करें</span></label>
          <input type="text" id="customSpecifyInput" class="form-input" placeholder="Type category / श्रेणी लिखें...">
        </div>
        <div class="field-group">
          <label>Property Type <span class="hi-sub">प्रॉपर्टी प्रकार</span></label>
          <select class="form-input">
            <option value="Residential">Residential / आवासीय</option>
            <option value="Commercial">Commercial / व्यावसायिक</option>
            <option value="Open Land">Open Land / खुली ज़मीन</option>
            <option value="Industrial">Industrial / औद्योगिक</option>
          </select>
        </div>
      </div>
    `;

    step3Box.innerHTML = `
      <div class="spec-section">
        <div class="room-header"><i class="fa-solid fa-pen-fancy"></i> Scope of Work & Deliverables <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">कार्य का दायरा व विवरण</span></div>
        <div class="field-group full-width">
          <label>Detailed Project Description * <span class="hi-sub">प्रोजेक्ट का विस्तृत विवरण</span></label>
          <textarea id="otherDetailedDesc" rows="4" class="form-input" placeholder="Please describe exactly what you need built, fixed, cleared or installed / आपको क्या बनवाना या ठीक करवाना है, यहाँ विस्तार से लिखें..."></textarea>
        </div>
        <div class="form-grid-2 mt-2">
          <div class="field-group">
            <label>Approximate Size / Quantity <span class="hi-sub">अनुमानित आकार / मात्रा</span></label>
            <input type="number" id="otherSizeValue" class="form-input" placeholder="e.g. 500 / उदा. 500">
          </div>
          <div class="field-group">
            <label>Unit <span class="hi-sub">इकाई</span></label>
            <select class="form-input">
              <option value="running feet">running feet / रनिंग फीट</option>
              <option value="sq.ft.">sq.ft. / वर्ग फीट</option>
              <option value="cubic meters">cubic meters / घन मीटर</option>
              <option value="acres">acres / एकड़</option>
              <option value="units">units / नग</option>
            </select>
          </div>
        </div>
      </div>
      <div class="spec-section mt-3">
        <div class="room-header"><i class="fa-solid fa-helmet-safety"></i> Equipment & Responsibility <span class="hi-sub" style="font-size:13px; font-weight:600; color:#64748b;">मशीनरी व ज़िम्मेदारी</span></div>
        <div class="form-grid-2">
          <div class="field-group">
            <label>Material Responsibility <span class="hi-sub">सामग्री ज़िम्मेदारी</span></label>
            <select class="form-input">
              <option value="Contractor to provide all materials">Contractor to provide all materials / ठेकेदार लाएगा</option>
              <option value="Customer will provide">Customer will provide / ग्राहक लाएगा</option>
            </select>
          </div>
          <div class="field-group">
            <label>Specialized Equipment <span class="hi-sub">विशेष उपकरण</span></label>
            <select class="form-input">
              <option value="JCB / Excavator">JCB / Excavator / जेसीबी या क्रेन</option>
              <option value="Cranes">Cranes / क्रेन</option>
              <option value="Scaffolding">Scaffolding / पाड़ / मचान</option>
              <option value="Not Sure">Not Sure / निश्चित नहीं</option>
            </select>
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
      floorIndex: i,
      floorName: fName,
      approxArea: existing.approxArea || 0,
      declaredAreaSqFt: existing.declaredAreaSqFt || existing.approxArea || 0,
      copyMode: existing.copyMode || "MANUAL",
      sourceFloor: existing.sourceFloor || null,
      rooms: existing.rooms ? JSON.parse(JSON.stringify(existing.rooms)) : {},
      roomAreas: existing.roomAreas ? JSON.parse(JSON.stringify(existing.roomAreas)) : {},
      customDimensions: existing.customDimensions ? JSON.parse(JSON.stringify(existing.customDimensions)) : {},
      specialRequirements: existing.specialRequirements || ""
    });
  }

  renderTabsAndPanes();
  updateProjectAreaEnvelopeSummary();
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
    const hiName = BILINGUAL_STRINGS[tab.name] || (tab.name.includes("Floor") ? tab.name.replace("Floor", "फ्लोर") : "");
    tabBtn.innerHTML = `${tab.name}${hiName ? ` <span class="hi-sub" style="font-size:11px; font-weight:600; display:block; line-height:1.2;">${hiName}</span>` : ''}`;
    tabBtn.onclick = () => switchFloorTab(i);
    tabBar.appendChild(tabBtn);

    const pane = document.createElement("div");
    pane.className = `floor-pane ${i === 0 ? "active" : ""}`;
    pane.id = `floorPane-${i}`;

    if (tab.type === "basement") {
      pane.innerHTML = `
        <div class="field-group mt-2">
          <label>Approx. Basement Area (sq.ft.) * <span class="hi-sub">अनुमानित बेसमेंट क्षेत्रफल</span> <span style="font-size:11px; color:#e11d48; font-weight:600;">(Mandatory when Basement is Yes / बेसमेंट होने पर अनिवार्य)</span></label>
          <input type="number" class="form-input" placeholder="e.g. 1000 / उदा. 1000" value="${tab.data.approxArea || ''}" oninput="handleBasementAreaChange(this.value)">
        </div>

        <label class="mt-2 block" style="font-size:12px; font-weight:700; color:#334155;">Basement Spaces & Facilities <span class="hi-sub" style="font-size:11.5px; font-weight:600; color:#64748b;">(बेसमेंट के उपयोग व कमरे)</span>:</label>
        <div class="room-counter-grid">
          ${BASEMENT_ROOM_TYPES.map(room => {
            const hiRoom = BILINGUAL_STRINGS[room] || "";
            return `
            <div class="room-counter-item">
              <div class="room-label-group">
                <span class="room-title">${room}${hiRoom ? ` <span class="hi-sub">${hiRoom}</span>` : ''}</span>
              </div>
              <div class="qty-control">
                <button type="button" class="qty-btn" onclick="adjustBasementRoomQty('${room}', -1)">-</button>
                <span class="qty-val" id="qty-basement-${room.replace(/[^a-zA-Z]/g, '')}">${tab.data.rooms[room] || 0}</span>
                <button type="button" class="qty-btn" onclick="adjustBasementRoomQty('${room}', 1)">+</button>
              </div>
            </div>
            `;
          }).join('')}
        </div>

        <!-- Dynamic Basement Room Individual Area Inputs Container -->
        <div id="basementRoomAreaContainer"></div>

        <label class="mt-3 block" style="font-size:12px; font-weight:700; color:#334155;">Critical Basement Civil Scope & Provisions <span class="hi-sub" style="font-size:11.5px; font-weight:600; color:#64748b;">(बेसमेंट निर्माण कार्य व सुविधाएं)</span>:</label>
        <div class="room-pill-grid mt-1">
          ${BASEMENT_FEATURES.map(feat => {
            const hiFeat = BILINGUAL_STRINGS[feat] || "";
            return `
            <label class="checkbox-pill">
              <input type="checkbox" ${(projectState.basementData.features || []).includes(feat) ? 'checked' : ''} onchange="toggleBasementFeature('${feat}', this.checked)">
              <span>${feat}${hiFeat ? ` <span class="hi-sub" style="font-size:11px;">(${hiFeat})</span>` : ''}</span>
            </label>
            `;
          }).join('')}
        </div>

        <div class="field-group mt-3">
          <label>Additional Basement Specifications <span class="hi-sub">अतिरिक्त बेसमेंट विवरण</span> <span style="font-size:11px; color:#64748b;">(e.g. clear headroom, ramp slope, moisture treatment / जैसे छत की ऊंचाई, ढलान)</span></label>
          <textarea class="form-input" rows="2" placeholder="e.g. Minimum 9ft clear ceiling height, heavy waterproofing / उदा. कम से कम 9 फीट छत की ऊंचाई" oninput="projectState.basementData.specialRequirements = this.value">${tab.data.specialRequirements || ''}</textarea>
        </div>
      `;
    } else {
      const idx = tab.index;
      const hiFloorName = BILINGUAL_STRINGS[tab.name] || tab.name;
      const copyBarHtml = idx >= 1 ? `
        <div class="floor-copy-bar">
          <span class="floor-copy-label"><i class="fa-solid fa-copy"></i> Floor Template <span class="hi-sub" style="font-size:11px; font-weight:600; color:#64748b;">(मंज़िल का प्रारूप)</span>:</span>
          <div class="floor-copy-actions">
            <button type="button" class="btn-copy-mode ${tab.data.copyMode === 'MANUAL' || !tab.data.copyMode ? 'active' : ''}" onclick="setFloorManual(${idx})">Custom / Manual <span class="hi-sub">खुद भरें</span></button>
            <button type="button" class="btn-copy-mode ${tab.data.copyMode === 'SAME_AS_FIRST_FLOOR' ? 'active' : ''}" onclick="applyFloorCopy(${idx}, 'SAME_AS_FIRST_FLOOR')">Same as 1st Floor <span class="hi-sub">पहली मंज़िल जैसा</span></button>
            ${idx >= 2 ? `<button type="button" class="btn-copy-mode ${tab.data.copyMode === 'SAME_AS_PREVIOUS_FLOOR' ? 'active' : ''}" onclick="applyFloorCopy(${idx}, 'SAME_AS_PREVIOUS_FLOOR')">Same as Previous <span class="hi-sub">पिछली मंज़िल जैसा</span></button>` : ''}
          </div>
          ${tab.data.copyMode && tab.data.copyMode !== 'MANUAL' ? `<span class="copy-status-badge"><i class="fa-solid fa-link"></i> Linked to ${tab.data.copyMode === 'SAME_AS_FIRST_FLOOR' ? '1st Floor / पहली मंज़िल' : 'Previous Floor / पिछली मंज़िल'}</span>` : ''}
        </div>
      ` : '';

      pane.innerHTML = `
        ${copyBarHtml}
        <div class="field-group mt-2">
          <label>Declared Area for ${tab.name} (sq.ft.) * <span class="hi-sub">${hiFloorName} का घोषित क्षेत्रफल</span></label>
          <input type="number" id="floorAreaInput-${idx}" class="form-input" placeholder="e.g. 1200 / उदा. 1200" value="${tab.data.approxArea || ''}" oninput="handleFloorAreaChange(${idx}, this.value)">
        </div>

        <div id="floorCapacitySummary-${idx}" class="floor-capacity-card mt-2 mb-2"></div>

        <label class="mt-2 block" style="font-size:12px; font-weight:700; color:#334155;">Rooms Required on ${tab.name} <span class="hi-sub" style="font-size:11.5px; font-weight:600; color:#64748b;">(${hiFloorName} पर आवश्यक कमरे)</span>:</label>
        <div class="room-counter-grid">
          ${ROOM_TYPES.map(room => {
            const bench = STANDARD_ROOM_BENCHMARKS[room] || { label: "Standard size", areaSqFt: 120 };
            const hiRoom = BILINGUAL_STRINGS[room] || "";
            return `
            <div class="room-counter-item">
              <div class="room-label-group">
                <span class="room-title">${room}${hiRoom ? ` <span class="hi-sub">${hiRoom}</span>` : ''}</span>
                <span class="room-std-badge">${bench.label}</span>
              </div>
              <div class="qty-control">
                <button type="button" class="qty-btn" onclick="adjustRoomQty(${idx}, '${room}', -1)">-</button>
                <span class="qty-val" id="qty-${idx}-${room.replace(/[^a-zA-Z]/g, '')}">${tab.data.rooms[room] || 0}</span>
                <button type="button" class="qty-btn" onclick="adjustRoomQty(${idx}, '${room}', 1)">+</button>
              </div>
            </div>
            `;
          }).join('')}
        </div>

        <!-- Dynamic Floor Room Individual Dimension Inputs Container -->
        <div id="roomAreaContainer-${idx}"></div>

        <div class="field-group mt-2">
          <label>Special Requirements for ${tab.name} <span class="hi-sub">${hiFloorName} के लिए विशेष आवश्यकताएं</span></label>
          <textarea class="form-input" rows="2" placeholder="e.g. Attached bath in bedroom, island counter in kitchen / उदा. बेडरूम में अटैच्ड बाथरूम, मॉड्युलर किचन" oninput="projectState.floorsData[${idx}].specialRequirements = this.value">${tab.data.specialRequirements || ''}</textarea>
        </div>
      `;
    }

    panes.appendChild(pane);
  });

  // Re-render any existing room area fields and capacities
  if (projectState.hasBasement) renderBasementIndividualRoomAreas();
  projectState.floorsData.forEach((_, idx) => {
    renderFloorIndividualRoomAreas(idx);
    updateFloorCapacitySummary(idx);
  });
  updateProjectAreaEnvelopeSummary();
}

function switchFloorTab(idx) {
  document.querySelectorAll(".tab-btn").forEach((b, i) => b.classList.toggle("active", i === idx));
  document.querySelectorAll(".floor-pane").forEach((p, i) => p.classList.toggle("active", i === idx));
}

function handleFloorAreaChange(floorIndex, val) {
  const floor = projectState.floorsData[floorIndex];
  if (!floor) return;
  const num = parseFloat(val) || 0;
  floor.approxArea = num;
  floor.declaredAreaSqFt = num;
  updateFloorCapacitySummary(floorIndex);
  updateProjectAreaEnvelopeSummary();
  recalculateDynamicEstimates();
}

function handleBasementAreaChange(val) {
  projectState.basementData.approxArea = parseFloat(val) || 0;
  updateProjectAreaEnvelopeSummary();
  recalculateDynamicEstimates();
}

function handleTotalAreaChange(val) {
  projectState.calculatedArea = parseFloat(val) || 0;
  updateProjectAreaEnvelopeSummary();
  recalculateDynamicEstimates();
}

function applyFloorCopy(targetIdx, mode) {
  let sourceIdx = -1;
  if (mode === "SAME_AS_FIRST_FLOOR") {
    sourceIdx = (targetIdx === 1) ? 0 : 1;
  } else if (mode === "SAME_AS_PREVIOUS_FLOOR") {
    sourceIdx = targetIdx - 1;
  }

  if (sourceIdx < 0 || sourceIdx >= projectState.floorsData.length || sourceIdx === targetIdx) {
    showToast("Invalid copy source floor.", "warning");
    return;
  }

  const src = projectState.floorsData[sourceIdx];
  const target = projectState.floorsData[targetIdx];
  if (!src || !target) return;

  target.copyMode = mode;
  target.sourceFloor = src.floorName;
  target.approxArea = src.approxArea;
  target.declaredAreaSqFt = src.approxArea;
  target.rooms = JSON.parse(JSON.stringify(src.rooms || {}));
  target.roomAreas = JSON.parse(JSON.stringify(src.roomAreas || {}));
  target.customDimensions = JSON.parse(JSON.stringify(src.customDimensions || {}));
  target.specialRequirements = src.specialRequirements || "";

  renderTabsAndPanes();
  const allTabs = (projectState.hasBasement ? 1 : 0) + targetIdx;
  switchFloorTab(allTabs);

  showToast(`Copied configuration from ${src.floorName} to ${target.floorName}.`, "info");
  recalculateDynamicEstimates();
}

function setFloorManual(targetIdx) {
  const target = projectState.floorsData[targetIdx];
  if (!target) return;
  target.copyMode = "MANUAL";
  target.sourceFloor = null;
  renderTabsAndPanes();
  const allTabs = (projectState.hasBasement ? 1 : 0) + targetIdx;
  switchFloorTab(allTabs);
  recalculateDynamicEstimates();
}

// Adjust Room Quantity on Floors
function adjustRoomQty(floorIndex, roomName, delta) {
  const floor = projectState.floorsData[floorIndex];
  if (!floor) return;

  // Requirement 12: Copy Override Protection - deep copy detachment
  if (floor.copyMode && floor.copyMode !== "MANUAL") {
    floor.copyMode = "MANUAL";
    floor.sourceFloor = null;
    const pane = document.getElementById(`floorPane-${(projectState.hasBasement ? 1 : 0) + floorIndex}`);
    if (pane) {
      const copyBtns = pane.querySelectorAll(".btn-copy-mode");
      copyBtns.forEach(b => b.classList.remove("active"));
      if (copyBtns[0]) copyBtns[0].classList.add("active");
      const badge = pane.querySelector(".copy-status-badge");
      if (badge) badge.remove();
    }
  }

  const current = floor.rooms[roomName] || 0;
  const next = Math.max(0, current + delta);
  floor.rooms[roomName] = next;

  const el = document.getElementById(`qty-${floorIndex}-${roomName.replace(/[^a-zA-Z]/g, '')}`);
  if (el) el.textContent = next;

  if (!floor.roomAreas) floor.roomAreas = {};
  if (!floor.customDimensions) floor.customDimensions = {};

  // Clean-up deleted rooms from state
  for (let i = next + 1; i <= current; i++) {
    const fieldKey = `${roomName}_${i}`;
    delete floor.roomAreas[fieldKey];
    delete floor.customDimensions[fieldKey];
  }

  renderFloorIndividualRoomAreas(floorIndex);
  updateFloorCapacitySummary(floorIndex);
  recalculateDynamicEstimates();
}

// Render dynamic dimension-aware inputs for each selected room on standard floors
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
        <i class="fa-solid fa-ruler-combined" style="color: #0284c7;"></i> Specify Individual Room Dimensions (Length × Width or Area) <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">कमरों का नाप भरें (लंबाई × चौड़ाई या क्षेत्रफल)</span>:
      </div>
      <div class="room-breakdown-grid">
  `;

  activeRooms.forEach(([roomName, count]) => {
    const bench = STANDARD_ROOM_BENCHMARKS[roomName] || { lengthFt: 10, widthFt: 12, areaSqFt: 120 };
    const hiRoom = BILINGUAL_STRINGS[roomName] || "";
    for (let i = 1; i <= count; i++) {
      const fieldKey = `${roomName}_${i}`;
      const label = count === 1 ? roomName : `${roomName} ${i}`;
      const hiLabel = count === 1 ? hiRoom : (hiRoom ? `${hiRoom} ${i}` : "");
      const custom = (floor.customDimensions && floor.customDimensions[fieldKey]) || {};
      const lenVal = custom.lengthFt !== undefined && custom.lengthFt !== null ? custom.lengthFt : "";
      const widVal = custom.widthFt !== undefined && custom.widthFt !== null ? custom.widthFt : "";
      const areaVal = custom.areaSqFt !== undefined && custom.areaSqFt !== null ? custom.areaSqFt : ((floor.roomAreas && floor.roomAreas[fieldKey]) || "");

      html += `
        <div class="room-dimension-card">
          <div class="room-dim-header">
            <span class="room-dim-name">${label}${hiLabel ? ` <span class="hi-sub" style="font-size:11px; font-weight:600; color:#64748b;">${hiLabel}</span>` : ''}</span>
            <span class="room-dim-default-tag">Default: ${bench.lengthFt}×${bench.widthFt} ft (${bench.areaSqFt} sq.ft.) <span class="hi-sub" style="font-size:10px;">(मानक)</span></span>
          </div>
          <div class="room-dim-inputs-grid">
            <div class="dim-input-group">
              <label>Length (ft) <span class="hi-sub" style="font-size:11px; font-weight:600; color:#64748b;">लंबाई</span></label>
              <input 
                type="number" 
                step="0.5" 
                id="dim-len-${floorIndex}-${fieldKey}" 
                value="${lenVal}" 
                placeholder="${bench.lengthFt}" 
                oninput="handleRoomDimChange(${floorIndex}, '${fieldKey}', '${roomName}', ${i})"
              />
            </div>
            <div class="dim-input-group">
              <label>Width (ft) <span class="hi-sub" style="font-size:11px; font-weight:600; color:#64748b;">चौड़ाई</span></label>
              <input 
                type="number" 
                step="0.5" 
                id="dim-wid-${floorIndex}-${fieldKey}" 
                value="${widVal}" 
                placeholder="${bench.widthFt}" 
                oninput="handleRoomDimChange(${floorIndex}, '${fieldKey}', '${roomName}', ${i})"
              />
            </div>
            <div class="dim-input-group">
              <label>Area (sq.ft.) <span class="hi-sub" style="font-size:11px; font-weight:600; color:#64748b;">क्षेत्रफल</span></label>
              <input 
                type="number" 
                step="1" 
                id="dim-area-${floorIndex}-${fieldKey}" 
                value="${areaVal}" 
                placeholder="${bench.areaSqFt}" 
                oninput="handleRoomAreaDirectChange(${floorIndex}, '${fieldKey}', '${roomName}', ${i}, this.value)"
              />
            </div>
          </div>
        </div>
      `;
    }
  });

  html += `</div></div>`;
  container.innerHTML = html;
}

function handleRoomDimChange(floorIndex, fieldKey, roomName, roomIdx) {
  const floor = projectState.floorsData[floorIndex];
  if (!floor) return;
  if (!floor.customDimensions) floor.customDimensions = {};
  if (!floor.roomAreas) floor.roomAreas = {};

  // Detach copied template on dimension change
  if (floor.copyMode && floor.copyMode !== "MANUAL") {
    floor.copyMode = "MANUAL";
    floor.sourceFloor = null;
  }

  const lenEl = document.getElementById(`dim-len-${floorIndex}-${fieldKey}`);
  const widEl = document.getElementById(`dim-wid-${floorIndex}-${fieldKey}`);
  const areaEl = document.getElementById(`dim-area-${floorIndex}-${fieldKey}`);

  const len = parseFloat(lenEl?.value);
  const wid = parseFloat(widEl?.value);

  if (!isNaN(len) && !isNaN(wid) && len > 0 && wid > 0) {
    const calcArea = Math.round(len * wid * 100) / 100;
    if (areaEl) areaEl.value = calcArea;
    floor.customDimensions[fieldKey] = {
      roomType: roomName,
      roomIndex: roomIdx,
      lengthFt: len,
      widthFt: wid,
      areaSqFt: calcArea
    };
    floor.roomAreas[fieldKey] = calcArea;
  } else {
    // If partial or cleared
    const directArea = parseFloat(areaEl?.value);
    if (!isNaN(directArea) && directArea > 0) {
      floor.customDimensions[fieldKey] = {
        roomType: roomName,
        roomIndex: roomIdx,
        lengthFt: !isNaN(len) ? len : null,
        widthFt: !isNaN(wid) ? wid : null,
        areaSqFt: directArea
      };
      floor.roomAreas[fieldKey] = directArea;
    } else {
      delete floor.customDimensions[fieldKey];
      delete floor.roomAreas[fieldKey];
    }
  }

  updateFloorCapacitySummary(floorIndex);
  recalculateDynamicEstimates();
}

function handleRoomAreaDirectChange(floorIndex, fieldKey, roomName, roomIdx, val) {
  const floor = projectState.floorsData[floorIndex];
  if (!floor) return;
  if (!floor.customDimensions) floor.customDimensions = {};
  if (!floor.roomAreas) floor.roomAreas = {};

  if (floor.copyMode && floor.copyMode !== "MANUAL") {
    floor.copyMode = "MANUAL";
    floor.sourceFloor = null;
  }

  const areaVal = parseFloat(val);
  const lenEl = document.getElementById(`dim-len-${floorIndex}-${fieldKey}`);
  const widEl = document.getElementById(`dim-wid-${floorIndex}-${fieldKey}`);
  const len = parseFloat(lenEl?.value);
  const wid = parseFloat(widEl?.value);

  if (!isNaN(areaVal) && areaVal > 0) {
    floor.customDimensions[fieldKey] = {
      roomType: roomName,
      roomIndex: roomIdx,
      lengthFt: !isNaN(len) ? len : null,
      widthFt: !isNaN(wid) ? wid : null,
      areaSqFt: areaVal
    };
    floor.roomAreas[fieldKey] = areaVal;
  } else {
    delete floor.customDimensions[fieldKey];
    delete floor.roomAreas[fieldKey];
  }

  updateFloorCapacitySummary(floorIndex);
  recalculateDynamicEstimates();
}

function calculateFloorProgramArea(floor) {
  if (!floor || !floor.rooms) return 0;
  let totalProgram = 0;
  Object.entries(floor.rooms).forEach(([roomName, count]) => {
    if (count <= 0) return;
    const bench = STANDARD_ROOM_BENCHMARKS[roomName] || { areaSqFt: 120 };
    for (let i = 1; i <= count; i++) {
      const fieldKey = `${roomName}_${i}`;
      const customDim = floor.customDimensions && floor.customDimensions[fieldKey];
      let roomArea = 0;
      if (customDim && customDim.areaSqFt > 0) {
        roomArea = customDim.areaSqFt;
      } else if (floor.roomAreas && floor.roomAreas[fieldKey] > 0) {
        roomArea = floor.roomAreas[fieldKey];
      } else {
        roomArea = bench.areaSqFt;
      }
      totalProgram += roomArea;
    }
  });
  return Math.round(totalProgram * 100) / 100;
}

function updateFloorCapacitySummary(floorIndex) {
  const floor = projectState.floorsData[floorIndex];
  const summaryEl = document.getElementById(`floorCapacitySummary-${floorIndex}`);
  if (!floor || !summaryEl) return;

  const declaredArea = floor.approxArea || 0;
  const programArea = calculateFloorProgramArea(floor);
  const allowance = Math.round(programArea * PLANNING_ALLOWANCE_RATIO * 100) / 100;
  const requiredArea = Math.round((programArea + allowance) * 100) / 100;
  const isOver = declaredArea > 0 && requiredArea > declaredArea;
  const diff = Math.round(Math.abs(requiredArea - declaredArea) * 100) / 100;

  let statusClass = "capacity-ok";
  let statusText = "";
  if (declaredArea <= 0) {
    statusClass = "capacity-warn";
    statusText = `<i class="fa-solid fa-triangle-exclamation"></i> Declared floor area is required to evaluate capacity. <span class="hi-sub" style="font-size:11px; display:inline-block;">(क्षमता जांचने के लिए मंज़िल का क्षेत्रफल दर्ज करना ज़रूरी है।)</span>`;
  } else if (isOver) {
    statusClass = "capacity-danger";
    statusText = `<i class="fa-solid fa-circle-exclamation"></i> <b>Exceeds Capacity / क्षमता से अधिक:</b> Room program requires <b>${requiredArea} sq.ft.</b> (incl. 20% circulation), exceeding declared floor area by <b>${diff} sq.ft.</b> <span class="hi-sub" style="font-size:11px; display:block; margin-top:2px;">(इस मंज़िल के लिए दी गई जगह कमरे की आवश्यक जगह से कम है।)</span>`;
  } else {
    statusClass = "capacity-ok";
    statusText = `<i class="fa-solid fa-circle-check"></i> <b>Capacity OK / क्षमता पर्याप्त:</b> ${requiredArea} sq.ft. required of ${declaredArea} sq.ft. declared (${Math.round((declaredArea - requiredArea)*100)/100} sq.ft. buffer).`;
  }

  summaryEl.className = `floor-capacity-card mt-2 mb-2 ${statusClass}`;
  summaryEl.innerHTML = `
    <div class="capacity-stats-row">
      <div class="stat-item"><span class="stat-lbl">Declared Area <span class="hi-sub" style="font-size:10px;">(घोषित क्षेत्रफल)</span></span><span class="stat-val">${declaredArea} sq.ft.</span></div>
      <div class="stat-item"><span class="stat-lbl">Rooms Net Area <span class="hi-sub" style="font-size:10px;">(कमरों का क्षेत्रफल)</span></span><span class="stat-val">${programArea} sq.ft.</span></div>
      <div class="stat-item"><span class="stat-lbl">Circulation / Walls (+20%) <span class="hi-sub" style="font-size:10px;">(दीवारें/रास्ते +20%)</span></span><span class="stat-val">${allowance} sq.ft.</span></div>
      <div class="stat-item"><span class="stat-lbl">Total Required <span class="hi-sub" style="font-size:10px;">(कुल आवश्यक)</span></span><span class="stat-val"><b>${requiredArea} sq.ft.</b></span></div>
    </div>
    <div class="capacity-status-msg">${statusText}</div>
  `;
}

function updateProjectAreaEnvelopeSummary() {
  const container = document.getElementById("projectAreaEnvelopeSummary");
  if (!container || projectState.projectType !== "New Construction") return;

  const totalArea = parseFloat(document.getElementById("builtUpAreaInput")?.value) || projectState.calculatedArea || 0;
  const groundArea = projectState.floorsData[0]?.approxArea || 0;
  const aggregateFloorArea = Math.round(projectState.floorsData.reduce((sum, f) => sum + (f.approxArea || 0), 0) * 100) / 100;
  const hasBasement = projectState.hasBasement;
  const basementArea = hasBasement ? (projectState.basementData?.approxArea || 0) : 0;

  let errors = [];
  if (totalArea <= 0) {
    errors.push("Total Built-up Area is required. <span class='hi-sub'>(कुल बिल्ट-अप एरिया दर्ज करना ज़रूरी है।)</span>");
  }
  if (groundArea > 0 && totalArea > 0 && groundArea > totalArea) {
    errors.push(`Ground Floor Area (${groundArea} sq.ft.) cannot exceed Total Built-up Area (${totalArea} sq.ft.). <span class='hi-sub'>(ग्राउंड फ्लोर का क्षेत्रफल कुल बिल्ट-अप एरिया से अधिक नहीं हो सकता।)</span>`);
  }
  if (totalArea > 0 && aggregateFloorArea > totalArea) {
    errors.push(`Sum of declared floor areas (${aggregateFloorArea} sq.ft.) exceeds Total Built-up Area (${totalArea} sq.ft.) by ${Math.round((aggregateFloorArea - totalArea)*100)/100} sq.ft. <span class='hi-sub'>(सभी मंज़िलों का कुल क्षेत्रफल आपके बताए गए कुल बिल्ट-अप एरिया से अधिक नहीं हो सकता।)</span>`);
  }
  if (hasBasement && basementArea <= 0) {
    errors.push("Basement is marked as required, but Basement Area is missing. <span class='hi-sub'>(अगर बेसमेंट चुना गया है, तो बेसमेंट का क्षेत्रफल भरना ज़रूरी है।)</span>");
  }

  const isInvalid = errors.length > 0;
  container.className = `area-envelope-card mb-3 ${isInvalid ? 'envelope-invalid' : 'envelope-valid'}`;
  container.innerHTML = `
    <div class="envelope-header">
      <span class="envelope-title"><i class="fa-solid fa-chart-pie"></i> Area Distribution & Envelope Verification <span class="hi-sub" style="font-size:11.5px; font-weight:600; color:#64748b;">(क्षेत्रफल वितरण एवं सत्यापन)</span></span>
      <span class="envelope-badge ${isInvalid ? 'badge-error' : 'badge-valid'}">${isInvalid ? 'Action Required / ध्यान दें' : 'Distribution Valid / क्षेत्रफल सही है'}</span>
    </div>
    <div class="envelope-grid">
      <div class="env-item"><span class="env-lbl">Total Built-up Envelope: <span class="hi-sub" style="font-size:10.5px;">(कुल बिल्ट-अप)</span></span><span class="env-val">${totalArea} sq.ft.</span></div>
      <div class="env-item"><span class="env-lbl">Ground Floor Area: <span class="hi-sub" style="font-size:10.5px;">(ग्राउंड फ्लोर)</span></span><span class="env-val">${groundArea} sq.ft.</span></div>
      <div class="env-item"><span class="env-lbl">Aggregate Floors Declared: <span class="hi-sub" style="font-size:10.5px;">(मंज़िलों का कुल)</span></span><span class="env-val">${aggregateFloorArea} / ${totalArea} sq.ft.</span></div>
      ${hasBasement ? `<div class="env-item"><span class="env-lbl">Basement Area: <span class="hi-sub" style="font-size:10.5px;">(बेसमेंट)</span></span><span class="env-val">${basementArea > 0 ? basementArea + ' sq.ft.' : '<b style="color:#e11d48;">Missing / दर्ज करें</b>'}</span></div>` : ''}
    </div>
    ${isInvalid ? `<div class="envelope-error-list">${errors.map(e => `<div><i class="fa-solid fa-triangle-exclamation"></i> ${e}</div>`).join('')}</div>` : ''}
  `;
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
        <i class="fa-solid fa-ruler-combined" style="color: #0284c7;"></i> Specify Individual Basement Space Dimensions (sq.ft.) <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">(बेसमेंट कमरों का क्षेत्रफल भरें)</span>:
      </div>
      <div class="room-breakdown-grid">
  `;

  activeRooms.forEach(([roomName, count]) => {
    const hiRoom = BILINGUAL_STRINGS[roomName] || "";
    for (let i = 1; i <= count; i++) {
      const fieldKey = `${roomName}_${i}`;
      const label = count === 1 ? `${roomName} Area` : `${roomName} ${i} Area`;
      const hiLabel = count === 1 ? (hiRoom ? `${hiRoom} क्षेत्रफल` : "") : (hiRoom ? `${hiRoom} ${i} क्षेत्रफल` : "");
      const val = (projectState.basementData.roomAreas && projectState.basementData.roomAreas[fieldKey]) || "";

      html += `
        <div class="room-individual-item">
          <label>${label} (sq.ft.)${hiLabel ? ` <span class="hi-sub" style="font-size:11px; font-weight:600; color:#64748b;">${hiLabel}</span>` : ''}</label>
          <input 
            type="number" 
            placeholder="e.g. 180 / उदा. 180" 
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

function lockEstimates(title, message) {
  currentEstimateResponse = null;

  const rangeDisplay = document.getElementById("costRangeDisplay");
  const disclaimer = document.getElementById("estDisclaimer");
  const lowerEst = document.getElementById("lowerEstLabel");
  const expectedEst = document.getElementById("expectedEstLabel");
  const higherEst = document.getElementById("higherEstLabel");
  const rangeFill = document.getElementById("rangeFillBar");
  const viewBtn = document.getElementById("viewDetailedEstimateBtn");
  const breakdownList = document.getElementById("costBreakdownList");

  if (rangeDisplay) rangeDisplay.innerHTML = title || `Validation Required <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">(सत्यापन ज़रूरी)</span>`;
  if (disclaimer) disclaimer.innerHTML = message ? `*${message}` : `*Complete and validate your floor requirements to generate the estimate. <span class="hi-sub" style="font-size:10.5px; color:#64748b;">(अनुमान देखने के लिए कृपया मंज़िल की जानकारी पूरी करें।)</span>`;
  if (lowerEst) lowerEst.innerText = "₹--";
  if (expectedEst) expectedEst.innerText = "₹--";
  if (higherEst) higherEst.innerText = "₹--";
  if (rangeFill) {
    rangeFill.style.width = "0%";
    rangeFill.style.left = "0%";
  }
  if (breakdownList) {
    breakdownList.innerHTML = `
      <div>Material Cost <span class="hi-sub" style="font-size:10px;">(सामग्री)</span>: <b>--</b></div>
      <div>Labour Cost <span class="hi-sub" style="font-size:10px;">(श्रम)</span>: <b>--</b></div>
      <div>Transportation <span class="hi-sub" style="font-size:10px;">(परिवहन)</span>: <b>--</b></div>
      <div>Machinery <span class="hi-sub" style="font-size:10px;">(मशीनरी)</span>: <b>--</b></div>
      <div>Structural <span class="hi-sub" style="font-size:10px;">(ढांचा)</span>: <b>--</b></div>
      <div>Basement <span class="hi-sub" style="font-size:10px;">(बेसमेंट)</span>: <b>--</b></div>
      <div>Contingency <span class="hi-sub" style="font-size:10px;">(आकस्मिक)</span>: <b>--</b></div>
    `;
  }
  if (viewBtn) viewBtn.style.display = "none";
}

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

  // 2. Active project types: Built-up area check
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
    lockEstimates("Enter Area Details <span class='hi-sub'>(क्षेत्रफल दर्ज करें)</span>", "Provide total built-up area to calculate indicative estimate. <span class='hi-sub'>(सांकेतिक अनुमान के लिए कुल बिल्ट-अप एरिया दर्ज करें।)</span>");
    return;
  }

  // Strict New Construction Validations (Requirement 8, 9, 10, 15)
  if (type === "New Construction") {
    if (projectState.hasBasement) {
      const bArea = parseFloat(projectState.basementData?.approxArea) || 0;
      if (bArea <= 0) {
        lockEstimates("Basement Area Required <span class='hi-sub'>(बेसमेंट क्षेत्रफल ज़रूरी)</span>", "Basement is selected. Approx. basement area is mandatory. <span class='hi-sub'>(अगर बेसमेंट चुना गया है, तो बेसमेंट का क्षेत्रफल भरना ज़रूरी है।)</span>");
        return;
      }
    }

    if (projectState.floorsData && projectState.floorsData.length > 0) {
      const groundArea = projectState.floorsData[0]?.approxArea || 0;
      if (groundArea <= 0) {
        lockEstimates("Ground Floor Area Required <span class='hi-sub'>(ग्राउंड फ्लोर क्षेत्रफल ज़रूरी)</span>", "Please declare Ground Floor area in floor requirements. <span class='hi-sub'>(कृपया मंज़िल विवरण में ग्राउंड फ्लोर का क्षेत्रफल दर्ज करें।)</span>");
        return;
      }
      if (groundArea > typicalFloorArea) {
        lockEstimates("Floor Area Exceeds Total <span class='hi-sub'>(क्षेत्रफल कुल से अधिक)</span>", `Ground floor area (${groundArea} sq.ft.) cannot exceed total built-up area (${typicalFloorArea} sq.ft.). <span class='hi-sub'>(ग्राउंड फ्लोर का क्षेत्रफल कुल बिल्ट-अप एरिया से अधिक नहीं हो सकता।)</span>`);
        return;
      }

      const aggregateFloors = Math.round(projectState.floorsData.reduce((acc, f) => acc + (f.approxArea || 0), 0) * 100) / 100;
      if (aggregateFloors > typicalFloorArea) {
        lockEstimates("Floor Area Exceeds Total <span class='hi-sub'>(क्षेत्रफल कुल से अधिक)</span>", `Sum of declared floor areas (${aggregateFloors} sq.ft.) exceeds total built-up area (${typicalFloorArea} sq.ft.). <span class='hi-sub'>(सभी मंज़िलों का कुल क्षेत्रफल आपके बताए गए कुल बिल्ट-अप एरिया से अधिक नहीं हो सकता।)</span>`);
        return;
      }

      // Floor capacity check (Requirement 8, 15)
      for (let i = 0; i < projectState.floorsData.length; i++) {
        const f = projectState.floorsData[i];
        if (f.approxArea > 0) {
          const progArea = calculateFloorProgramArea(f);
          const reqArea = Math.round(progArea * (1 + PLANNING_ALLOWANCE_RATIO) * 100) / 100;
          if (reqArea > f.approxArea) {
            lockEstimates("Floor Capacity Exceeded <span class='hi-sub'>(क्षमता से अधिक)</span>", `${f.floorName} room program requires ${reqArea} sq.ft. (incl. 20% circulation), exceeding declared area (${f.approxArea} sq.ft.). <span class='hi-sub'>(इस मंज़िल के लिए दी गई जगह कमरे की आवश्यक जगह से कम है।)</span>`);
            return;
          }
        }
      }
    }
  }

  // 3. Location parameters
  const stateVal = document.getElementById("stateSelect")?.value?.trim() || projectState.state || "";
  const cityVal = document.getElementById("cityInput")?.value?.trim() || projectState.city || "";
  const pincodeVal = document.getElementById("pincodeInput")?.value?.trim() || projectState.pincode || "";

  if (!stateVal) {
    lockEstimates("Select State in Step 2 <span class='hi-sub'>(राज्य चुनें)</span>", "State is required to resolve local construction rates. <span class='hi-sub'>(स्थानीय निर्माण दरों के लिए राज्य चुनना ज़रूरी है।)</span>");
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

  // Build floors payload with custom room dimensions
  let floorsPayload = null;
  if (type === "New Construction" && projectState.floorsData.length > 0) {
    floorsPayload = projectState.floorsData.map((f, i) => {
      const customDims = [];
      if (f.customDimensions) {
        Object.values(f.customDimensions).forEach(cd => {
          if (cd && (cd.areaSqFt > 0 || (cd.lengthFt > 0 && cd.widthFt > 0))) {
            customDims.push({
              roomType: cd.roomType,
              roomIndex: cd.roomIndex,
              lengthFt: cd.lengthFt || null,
              widthFt: cd.widthFt || null,
              areaSqFt: cd.areaSqFt || (cd.lengthFt * cd.widthFt)
            });
          }
        });
      }
      return {
        floorIndex: i,
        floorName: f.floorName,
        declaredAreaSqFt: f.approxArea || 0,
        copyMode: f.copyMode || "MANUAL",
        sourceFloor: f.sourceFloor || null,
        rooms: f.rooms || {},
        customDimensions: customDims,
        specialRequirements: f.specialRequirements || ""
      };
    });
  }

  // Build request payload
  const requestPayload = {
    projectType: apiProjectType,
    state: stateVal,
    city: cityVal || null,
    district: null,
    pincode: pincodeVal || null,
    totalBuildUpAreaSqFt: typicalFloorArea,
    builtUpAreaSqFt: typicalFloorArea, // legacy compatibility
    hasBasement: projectState.hasBasement,
    basementAreaSqFt: basementArea,
    numberOfFloors: numFloors,
    qualityTier: qualityTier,
    floors: floorsPayload,
    planningAllowanceRatio: PLANNING_ALLOWANCE_RATIO
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
    disclaimer.innerHTML = `*Indicative estimate based on verified construction rates for ${data.location?.city || data.location?.state || 'your area'}. <span class="hi-sub" style="font-size:10.5px; color:#64748b;">(प्रमाणित निर्माण दरों पर आधारित सांकेतिक अनुमान।)</span>`;
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
    const baseVal = (b.basement && Number(b.basement.average) > 0) ? `₹${formatINRCompact(b.basement.average)}` : "Not included / शामिल नहीं";
    const contVal = b.contingency ? `₹${formatINRCompact(b.contingency.average)}` : "--";

    breakdownList.innerHTML = `
      <div>Material Cost <span class="hi-sub" style="font-size:10px;">(सामग्री)</span>: <b>${matVal}</b></div>
      <div>Labour Cost <span class="hi-sub" style="font-size:10px;">(श्रम)</span>: <b>${labVal}</b></div>
      <div>Transportation <span class="hi-sub" style="font-size:10px;">(परिवहन)</span>: <b>${transVal}</b></div>
      <div>Machinery <span class="hi-sub" style="font-size:10px;">(मशीनरी)</span>: <b>${machVal}</b></div>
      <div>Structural <span class="hi-sub" style="font-size:10px;">(ढांचा)</span>: <b>${structVal}</b></div>
      <div>Basement <span class="hi-sub" style="font-size:10px;">(बेसमेंट)</span>: <b>${baseVal}</b></div>
      <div>Contingency <span class="hi-sub" style="font-size:10px;">(आकस्मिक)</span>: <b>${contVal}</b></div>
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
        "CITY": "City Rates / शहर की दरें",
        "DISTRICT": "District Rates / ज़िला दरें",
        "STATE_DEFAULT": "State Average / राज्य औसत",
        "NATIONAL_DEFAULT": "National Benchmark / राष्ट्रीय मानक"
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
  let title = "Calculation Error <span class='hi-sub'>(गणना त्रुटि)</span>";
  let msg = "Unable to calculate cost estimate at this time. Please try again. <span class='hi-sub'>(इस समय अनुमान की गणना नहीं हो सकी। कृपया पुनः प्रयास करें।)</span>";

  if (status === 404 || (data && data.errorCode === "RATES_UNAVAILABLE")) {
    title = "Estimate Unavailable <span class='hi-sub'>(दरें अनुपलब्ध)</span>";
    msg = "Cost estimation data is currently unavailable for the selected location/project type. <span class='hi-sub'>(चुने गए स्थान के लिए निर्माण दरें उपलब्ध नहीं हैं।)</span>";
  } else if (status === 400) {
    title = "Validation Issue <span class='hi-sub'>(सत्यापन समस्या)</span>";
    if (data && data.validationErrors && Array.isArray(data.validationErrors) && data.validationErrors.length > 0) {
      msg = data.validationErrors.map(e => e.message).join(" | ");
    } else {
      msg = data?.message || "Please check your area and floor requirements. <span class='hi-sub'>(कृपया क्षेत्रफल एवं मंज़िल विवरण की जांच करें।)</span>";
    }
  }

  lockEstimates(title, msg);
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

  if (rangeDisplay) rangeDisplay.innerHTML = "Connection Failed <span class='hi-sub' style='font-size:12px;'>(कनेक्शन विफल)</span>";
  if (disclaimer) disclaimer.innerHTML = "Unable to calculate the estimate right now. Please try again. <span class='hi-sub' style='font-size:10.5px;'>(अनुमान नहीं बन सका। कृपया पुनः प्रयास करें।)</span>";
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
      <div class="modal-section-title"><i class="fa-solid fa-chart-pie" style="color:#0284c7;"></i> Total Estimated Cost Summary <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">(कुल अनुमानित लागत सारांश)</span></div>
      <div class="summary-cards-grid">
        <div class="summary-metric-card">
          <div class="metric-label">Lower Estimate <span class="hi-sub">(न्यूनतम अनुमान)</span></div>
          <div class="metric-val">₹${totalLow}</div>
        </div>
        <div class="summary-metric-card highlight">
          <div class="metric-label">Expected Average <span class="hi-sub">(अपेक्षित औसत)</span></div>
          <div class="metric-val">₹${totalAvg}</div>
        </div>
        <div class="summary-metric-card">
          <div class="metric-label">Higher Estimate <span class="hi-sub">(अधिकतम अनुमान)</span></div>
          <div class="metric-val">₹${totalHigh}</div>
        </div>
      </div>
    </div>

    <!-- Area Dimensions -->
    <div class="modal-section">
      <div class="modal-section-title"><i class="fa-solid fa-vector-square" style="color:#0284c7;"></i> Construction Area Metrics <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">(निर्माण क्षेत्रफल विवरण)</span></div>
      <div class="summary-cards-grid">
        <div class="summary-metric-card">
          <div class="metric-label">Typical Floor Area <span class="hi-sub">(प्रति मंज़िल)</span></div>
          <div class="metric-val" style="font-size:16px;">${typicalArea} <small style="font-size:11px; font-weight:normal;">sq.ft.</small></div>
        </div>
        <div class="summary-metric-card">
          <div class="metric-label">Total Above-Ground <span class="hi-sub">(ज़मीन के ऊपर)</span></div>
          <div class="metric-val" style="font-size:16px;">${aboveGroundArea} <small style="font-size:11px; font-weight:normal;">sq.ft.</small></div>
        </div>
        <div class="summary-metric-card">
          <div class="metric-label">Basement Area <span class="hi-sub">(बेसमेंट)</span></div>
          <div class="metric-val" style="font-size:16px;">${basementArea > 0 ? basementArea + ' sq.ft.' : 'Not included / शामिल नहीं'}</div>
        </div>
        <div class="summary-metric-card highlight">
          <div class="metric-label">Total Constructed Area <span class="hi-sub">(कुल निर्मित क्षेत्रफल)</span></div>
          <div class="metric-val" style="font-size:16px;">${totalArea} <small style="font-size:11px; font-weight:normal;">sq.ft.</small></div>
        </div>
      </div>
    </div>
  `;

  // 2. Floor-by-Floor Dynamic Breakdown (Iterates dynamic list)
  if (data.floors && data.floors.length > 0) {
    html += `
      <div class="modal-section">
        <div class="modal-section-title"><i class="fa-solid fa-stairs" style="color:#0284c7;"></i> Floor-Wise Dynamic Cost Breakdown <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">(मंज़िल-वार लागत विवरण)</span></div>
        <div class="modal-table-wrap">
          <table class="modal-data-table">
            <thead>
              <tr>
                <th>Floor Name <span class="hi-sub" style="font-size:10px;">(मंज़िल)</span></th>
                <th>Floor Area <span class="hi-sub" style="font-size:10px;">(क्षेत्रफल)</span></th>
                <th>Lower Est. <span class="hi-sub" style="font-size:10px;">(न्यूनतम)</span></th>
                <th>Expected Average <span class="hi-sub" style="font-size:10px;">(अपेक्षित औसत)</span></th>
                <th>Higher Est. <span class="hi-sub" style="font-size:10px;">(अधिकतम)</span></th>
                <th>Vertical Factor <span class="hi-sub" style="font-size:10px;">(ऊंचाई फैक्टर)</span></th>
              </tr>
            </thead>
            <tbody>
    `;

    data.floors.forEach(f => {
      const factorDisplay = f.escalationFactor ? Number(f.escalationFactor).toFixed(4) : "1.0000";
      const rawName = f.floorName || 'Floor ' + f.floorNumber;
      const hiName = BILINGUAL_STRINGS[rawName] || rawName;
      html += `
        <tr>
          <td><b>${rawName}</b>${hiName !== rawName ? ` <span class="hi-sub" style="font-size:10.5px;">(${hiName})</span>` : ''}</td>
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
      <div class="modal-section-title"><i class="fa-solid fa-dungeon" style="color:#0284c7;"></i> Basement Specifications & Cost <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">(बेसमेंट विवरण व लागत)</span></div>
  `;
  if (data.basement && Number(data.basement.areaSqFt) > 0) {
    html += `
      <div class="summary-cards-grid" style="margin-bottom:12px;">
        <div class="summary-metric-card">
          <div class="metric-label">Basement Area <span class="hi-sub">(बेसमेंट क्षेत्रफल)</span></div>
          <div class="metric-val" style="font-size:16px;">${data.basement.areaSqFt} sq.ft.</div>
        </div>
        <div class="summary-metric-card highlight">
          <div class="metric-label">Total Basement Cost <span class="hi-sub">(कुल बेसमेंट लागत)</span></div>
          <div class="metric-val" style="font-size:16px;">₹${formatINR(data.basement.average)}</div>
        </div>
      </div>
      <div class="modal-table-wrap">
        <table class="modal-data-table">
          <thead>
            <tr>
              <th>Basement Phase <span class="hi-sub" style="font-size:10px;">(चरण)</span></th>
              <th>Lower Est. <span class="hi-sub" style="font-size:10px;">(न्यूनतम)</span></th>
              <th>Average Cost <span class="hi-sub" style="font-size:10px;">(औसत लागत)</span></th>
              <th>Higher Est. <span class="hi-sub" style="font-size:10px;">(अधिकतम)</span></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Excavation & Earthwork <span class="hi-sub" style="font-size:10.5px;">(खुदाई व अर्थवर्क)</span></td>
              <td>₹${formatINR(data.basement.excavationCost?.low)}</td>
              <td><b>₹${formatINR(data.basement.excavationCost?.average)}</b></td>
              <td>₹${formatINR(data.basement.excavationCost?.high)}</td>
            </tr>
            <tr>
              <td>Box Waterproofing & Damp Treatment <span class="hi-sub" style="font-size:10.5px;">(बॉक्स वॉटरप्रूफिंग)</span></td>
              <td>₹${formatINR(data.basement.waterproofingCost?.low)}</td>
              <td><b>₹${formatINR(data.basement.waterproofingCost?.average)}</b></td>
              <td>₹${formatINR(data.basement.waterproofingCost?.high)}</td>
            </tr>
            <tr>
              <td>RCC Retaining Structure & Slabs <span class="hi-sub" style="font-size:10.5px;">(आरसीसी ढांचा व स्लैब)</span></td>
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
      <p style="font-size:12.5px; color:#64748b; margin:0;">Basement: Not included in this project estimate. <span class="hi-sub">(बेसमेंट इस प्रोजेक्ट में शामिल नहीं है।)</span></p>
    `;
  }
  html += `</div>`;

  // 4. Category Cost Breakdown
  if (data.breakdown) {
    const b = data.breakdown;
    html += `
      <div class="modal-section">
        <div class="modal-section-title"><i class="fa-solid fa-layer-group" style="color:#0284c7;"></i> Category Cost Breakdown <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">(श्रेणी-वार लागत विवरण)</span></div>
        <div class="modal-table-wrap">
          <table class="modal-data-table">
            <thead>
              <tr>
                <th>Category <span class="hi-sub" style="font-size:10px;">(श्रेणी)</span></th>
                <th>Lower Est. <span class="hi-sub" style="font-size:10px;">(न्यूनतम)</span></th>
                <th>Expected Average <span class="hi-sub" style="font-size:10px;">(अपेक्षित औसत)</span></th>
                <th>Higher Est. <span class="hi-sub" style="font-size:10px;">(अधिकतम)</span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Material Cost</b> <span class="hi-sub" style="font-size:10.5px;">(सामग्री लागत)</span></td>
                <td>₹${formatINR(b.material?.low)}</td>
                <td><b>₹${formatINR(b.material?.average)}</b></td>
                <td>₹${formatINR(b.material?.high)}</td>
              </tr>
              <tr>
                <td><b>Labour Cost</b> <span class="hi-sub" style="font-size:10.5px;">(श्रम लागत)</span></td>
                <td>₹${formatINR(b.labour?.low)}</td>
                <td><b>₹${formatINR(b.labour?.average)}</b></td>
                <td>₹${formatINR(b.labour?.high)}</td>
              </tr>
              <tr>
                <td><b>Transportation</b> <span class="hi-sub" style="font-size:10.5px;">(परिवहन)</span></td>
                <td>₹${formatINR(b.transportation?.low)}</td>
                <td><b>₹${formatINR(b.transportation?.average)}</b></td>
                <td>₹${formatINR(b.transportation?.high)}</td>
              </tr>
              <tr>
                <td><b>Machinery & Equipment</b> <span class="hi-sub" style="font-size:10.5px;">(मशीनरी व उपकरण)</span></td>
                <td>₹${formatINR(b.machinery?.low)}</td>
                <td><b>₹${formatINR(b.machinery?.average)}</b></td>
                <td>₹${formatINR(b.machinery?.high)}</td>
              </tr>
              <tr>
                <td><b>Structural / MEP</b> <span class="hi-sub" style="font-size:10.5px;">(ढांचा / एमईपी)</span></td>
                <td>₹${formatINR(b.structural?.low)}</td>
                <td><b>₹${formatINR(b.structural?.average)}</b></td>
                <td>₹${formatINR(b.structural?.high)}</td>
              </tr>
              <tr>
                <td><b>Basement</b> <span class="hi-sub" style="font-size:10.5px;">(बेसमेंट)</span></td>
                <td>${b.basement && Number(b.basement.average) > 0 ? '₹' + formatINR(b.basement.low) : '--'}</td>
                <td><b>${b.basement && Number(b.basement.average) > 0 ? '₹' + formatINR(b.basement.average) : 'Not included / शामिल नहीं'}</b></td>
                <td>${b.basement && Number(b.basement.average) > 0 ? '₹' + formatINR(b.basement.high) : '--'}</td>
              </tr>
              <tr>
                <td><b>Contingency (${b.contingency?.percentage || 3}%)</b> <span class="hi-sub" style="font-size:10.5px;">(आकस्मिक खर्च)</span></td>
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
        <div class="modal-section-title"><i class="fa-solid fa-list-check" style="color:#0284c7;"></i> Component-Level Bill of Quantities (BOQ) & Reference Provenance <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">(सामग्री व कार्य मात्रा विवरण)</span></div>
        <div class="modal-table-wrap">
          <table class="modal-data-table">
            <thead>
              <tr>
                <th>Component <span class="hi-sub" style="font-size:10px;">(मद)</span></th>
                <th>Category <span class="hi-sub" style="font-size:10px;">(श्रेणी)</span></th>
                <th>Quantity <span class="hi-sub" style="font-size:10px;">(मात्रा)</span></th>
                <th>Unit Rate (Avg) <span class="hi-sub" style="font-size:10px;">(दर)</span></th>
                <th>Total Cost (Avg) <span class="hi-sub" style="font-size:10px;">(कुल)</span></th>
                <th>Rate Date <span class="hi-sub" style="font-size:10px;">(दिनांक)</span></th>
                <th>Geographic Tier <span class="hi-sub" style="font-size:10px;">(स्तर)</span></th>
                <th>Source <span class="hi-sub" style="font-size:10px;">(स्रोत)</span></th>
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
        <div class="modal-section-title"><i class="fa-solid fa-scale-balanced" style="color:#0284c7;"></i> Structural Plinth Area Benchmark Check <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">(प्लिंथ एरिया मानक जांच)</span></div>
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
        <div class="modal-section-title"><i class="fa-solid fa-triangle-exclamation" style="color:#dc2626;"></i> Estimation Notes & Warnings <span class="hi-sub" style="font-size:12px; font-weight:600; color:#64748b;">(अनुमान संबंधी निर्देश व चेतावनियां)</span></div>
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
      showToast("Please select a project type to continue. / कृपया आगे बढ़ने के लिए प्रोजेक्ट का प्रकार चुनें।", "error");
      return false;
    }
    return true;
  }

  if (step === 2) {
    const title = document.getElementById("projectTitleInput");
    if (!title || !title.value.trim()) {
      markInvalidField(title, "Please enter Project Title * / कृपया प्रोजेक्ट का नाम दर्ज करें *");
      return false;
    }

    const city = document.getElementById("cityInput");
    if (!city || !city.value.trim()) {
      markInvalidField(city, "Please enter City / District * / कृपया शहर / ज़िला दर्ज करें *");
      return false;
    }

    const state = document.getElementById("stateSelect");
    if (!state || !state.value.trim()) {
      markInvalidField(state, "Please select State / UT * / कृपया राज्य चुनें *");
      return false;
    }

    const pin = document.getElementById("pincodeInput");
    if (!pin || !pin.value.trim() || pin.value.trim().length < 6) {
      markInvalidField(pin, "Please enter a valid 6-digit PIN Code * / कृपया 6 अंकों का सही पिन कोड दर्ज करें *");
      return false;
    }

    const addr = document.getElementById("addressInput");
    if (!addr || !addr.value.trim()) {
      markInvalidField(addr, "Please enter Complete Site Address * / कृपया पूरा पता दर्ज करें *");
      return false;
    }

    if (projectState.projectType === "Other") {
      const otherCat = document.getElementById("otherCategorySelect")?.value;
      if (otherCat === "Completely Custom") {
        const customInput = document.getElementById("customSpecifyInput");
        if (!customInput || !customInput.value.trim()) {
          markInvalidField(customInput, "Please specify your custom category * / कृपया अपनी श्रेणी दर्ज करें *");
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
        showToast("Please select at least one Area to Renovate * / कृपया कम से कम एक रेनोवेशन क्षेत्र चुनें *", "error");
        const container = document.getElementById("renovationAreaCheckboxes");
        if (container) container.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }

      for (const areaName of activeAreas) {
        const areaData = projectState.renovationAreas[areaName];
        if (!areaData || !areaData.squareFootage || areaData.squareFootage <= 0) {
          const inputEl = document.getElementById(`area-input-${areaName.replace(/[^a-zA-Z]/g, '')}`);
          markInvalidField(inputEl, `Please enter area (sq.ft.) for ${areaName} * / कृपया ${areaName} का क्षेत्रफल दर्ज करें *`);
          return false;
        }
      }
      return true;
    }

    if (type === "Other") {
      const desc = document.getElementById("otherDetailedDesc");
      if (!desc || !desc.value.trim()) {
        markInvalidField(desc, "Please describe your project scope & deliverables * / कृपया प्रोजेक्ट का विवरण दर्ज करें *");
        return false;
      }
      return true;
    }

    const area = document.getElementById("builtUpAreaInput");
    if (area && (!area.value.trim() || parseFloat(area.value) <= 0)) {
      markInvalidField(area, "Please enter Total Built-up / Carpet Area in sq.ft. * / कृपया कुल बिल्ट-अप एरिया दर्ज करें *");
      return false;
    }

    if (type === "New Construction") {
      const floorSelect = document.getElementById("numFloorsSelect");
      const customFloor = document.getElementById("customFloorsInput");
      if (floorSelect && floorSelect.value === "custom") {
        if (!customFloor || !customFloor.value.trim() || parseInt(customFloor.value) < 1) {
          markInvalidField(customFloor, "Please enter valid number of floors * / कृपया मंज़िलों की सही संख्या दर्ज करें *");
          return false;
        }
      }

      const totalArea = parseFloat(area?.value) || 0;
      if (projectState.hasBasement) {
        const bArea = parseFloat(projectState.basementData?.approxArea) || 0;
        if (bArea <= 0) {
          showToast("Basement is marked as required. Please enter approx. Basement Area * / अगर बेसमेंट चुना गया है, तो बेसमेंट का क्षेत्रफल भरना ज़रूरी है।*", "error");
          switchFloorTab(0);
          return false;
        }
      }

      if (projectState.floorsData && projectState.floorsData.length > 0) {
        const groundArea = projectState.floorsData[0]?.approxArea || 0;
        if (groundArea <= 0) {
          showToast("Please enter declared area for Ground Floor * / कृपया ग्राउंड फ्लोर का क्षेत्रफल दर्ज करें *", "error");
          const groundTabIdx = projectState.hasBasement ? 1 : 0;
          switchFloorTab(groundTabIdx);
          const inp = document.getElementById("floorAreaInput-0");
          if (inp) markInvalidField(inp, "Please enter Ground Floor area * / कृपया ग्राउंड फ्लोर का क्षेत्रफल दर्ज करें *");
          return false;
        }
        if (groundArea > totalArea) {
          showToast(`Ground floor area (${groundArea} sq.ft.) cannot exceed Total Built-up Area (${totalArea} sq.ft.) / ग्राउंड फ्लोर का क्षेत्रफल कुल बिल्ट-अप एरिया से अधिक नहीं हो सकता।*`, "error");
          const groundTabIdx = projectState.hasBasement ? 1 : 0;
          switchFloorTab(groundTabIdx);
          const inp = document.getElementById("floorAreaInput-0");
          if (inp) markInvalidField(inp, "Ground floor exceeds total built-up area * / ग्राउंड फ्लोर कुल बिल्ट-अप एरिया से अधिक है *");
          return false;
        }

        const aggregateFloors = Math.round(projectState.floorsData.reduce((acc, f) => acc + (f.approxArea || 0), 0) * 100) / 100;
        if (aggregateFloors > totalArea) {
          showToast(`Sum of floor areas (${aggregateFloors} sq.ft.) exceeds Total Built-up Area (${totalArea} sq.ft.) / सभी मंज़िलों का कुल क्षेत्रफल आपके बताए गए कुल बिल्ट-अप एरिया से अधिक नहीं हो सकता।*`, "error");
          return false;
        }

        for (let i = 0; i < projectState.floorsData.length; i++) {
          const f = projectState.floorsData[i];
          if (f.approxArea > 0) {
            const progArea = calculateFloorProgramArea(f);
            const reqArea = Math.round(progArea * (1 + PLANNING_ALLOWANCE_RATIO) * 100) / 100;
            if (reqArea > f.approxArea) {
              showToast(`${f.floorName} room program requires ${reqArea} sq.ft., exceeding declared area (${f.approxArea} sq.ft.) / इस मंज़िल के लिए दी गई जगह कमरे की आवश्यक जगह से कम है।*`, "error");
              const tabIdx = (projectState.hasBasement ? 1 : 0) + i;
              switchFloorTab(tabIdx);
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  if (step === 4) {
    const minBudget = parseFloat(document.getElementById("budgetMin")?.value) || 0;
    const maxBudget = parseFloat(document.getElementById("budgetMax")?.value) || 0;

    if (minBudget > 0 && maxBudget > 0 && minBudget > maxBudget) {
      showToast("Maximum budget cannot be less than Minimum budget. / अधिकतम बजट न्यूनतम बजट से कम नहीं हो सकता।", "error");
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
    payload.basementAreaSqFt = projectState.hasBasement ? (parseFloat(projectState.basementData?.approxArea) || 0) : 0;
    payload.totalBuildUpAreaSqFt = parseFloat(document.getElementById("builtUpAreaInput")?.value) || projectState.calculatedArea || 0;
    payload.floors = projectState.floorsData.map((f, i) => {
      const customDims = [];
      if (f.customDimensions) {
        Object.values(f.customDimensions).forEach(cd => {
          if (cd && (cd.areaSqFt > 0 || (cd.lengthFt > 0 && cd.widthFt > 0))) {
            customDims.push({
              roomType: cd.roomType,
              roomIndex: cd.roomIndex,
              lengthFt: cd.lengthFt || null,
              widthFt: cd.widthFt || null,
              areaSqFt: cd.areaSqFt || (cd.lengthFt * cd.widthFt)
            });
          }
        });
      }
      return {
        floorIndex: i,
        floorName: f.floorName,
        declaredAreaSqFt: f.approxArea || 0,
        copyMode: f.copyMode || "MANUAL",
        sourceFloor: f.sourceFloor || null,
        rooms: f.rooms || {},
        customDimensions: customDims,
        specialRequirements: f.specialRequirements || ""
      };
    });
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
