/* ==========================================================================
   BUILDBID — BUY MATERIAL ENGINE (buy material.js)
   BILINGUAL (ENGLISH + HINDI) UNIFIED CUSTOMER & CONTRACTOR PURCHASING FLOW
   ========================================================================== */

// 1. Core API & Token Utilities
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

function getDashboardUrl() {
  const user = getCurrentUser();
  if (user) {
    const roleRaw = (user.role || (user.roles && user.roles[0]) || "").toString().replace("ROLE_", "").toUpperCase();
    if (roleRaw === "CONTRACTOR") {
      return "contractor-dashboard.html";
    }
    if (roleRaw === "PROFESSIONAL" || roleRaw === "SERVICE_PROVIDER") {
      return "professional dashboard.html";
    }
  }
  return "customer dashboard.html";
}

// 2. Authoritative Construction Materials Catalog (English + Hindi)
// Source of Truth: add-material.js
const MATERIALS_CATALOG = {
  "Cement — सीमेंट": [
    "Ordinary Portland Cement — साधारण पोर्टलैंड सीमेंट",
    "Portland Pozzolana Cement — पोर्टलैंड पोज़ोलाना सीमेंट",
    "Portland Slag Cement — पोर्टलैंड स्लैग सीमेंट",
    "Rapid Hardening Cement — जल्दी मजबूत होने वाला सीमेंट",
    "White Cement — सफेद सीमेंट",
    "Masonry Cement — चिनाई सीमेंट",
    "Other Cement — अन्य सीमेंट"
  ],
  "Steel — स्टील": [
    "TMT Steel Bars — टीएमटी सरिया",
    "Mild Steel Bars — हल्का स्टील सरिया",
    "Structural Steel — संरचनात्मक स्टील",
    "Steel Plate — स्टील प्लेट",
    "Steel Sheet — स्टील शीट",
    "Steel Angle — स्टील एंगल",
    "Steel Channel — स्टील चैनल",
    "Steel Beam — स्टील बीम",
    "Steel Pipe — स्टील पाइप",
    "Binding Wire — बांधने वाला तार",
    "Wire Mesh — तार की जाली",
    "Other Steel — अन्य स्टील"
  ],
  "Sand — रेत": [
    "River Sand — नदी की रेत",
    "M-Sand — एम-सैंड",
    "Plastering Sand — प्लास्टर की रेत",
    "Fine Sand — बारीक रेत",
    "Coarse Sand — मोटी रेत",
    "Manufactured Sand — निर्मित रेत",
    "Other Sand — अन्य रेत"
  ],
  "Aggregates — गिट्टी": [
    "10 mm Aggregate — 10 मिमी गिट्टी",
    "20 mm Aggregate — 20 मिमी गिट्टी",
    "40 mm Aggregate — 40 मिमी गिट्टी",
    "Stone Aggregate — पत्थर की गिट्टी",
    "Gravel — बजरी",
    "Crushed Stone — कुचला हुआ पत्थर",
    "Other Aggregate — अन्य गिट्टी"
  ],
  "Bricks & Blocks — ईंट और ब्लॉक": [
    "Red Brick — लाल ईंट",
    "Fly Ash Brick — फ्लाई ऐश ईंट",
    "Concrete Brick — कंक्रीट ईंट",
    "AAC Block — एएसी ब्लॉक",
    "Hollow Block — खोखला ब्लॉक",
    "Solid Concrete Block — ठोस कंक्रीट ब्लॉक",
    "Clay Block — मिट्टी का ब्लॉक",
    "Interlocking Block — इंटरलॉकिंग ब्लॉक",
    "Paver Block — पेवर ब्लॉक",
    "Other Block — अन्य ब्लॉक"
  ],
  "Concrete — कंक्रीट": [
    "Ready-Mix Concrete (RMC) — रेडी-मिक्स कंक्रीट",
    "Precast Concrete Slab — प्रीकास्ट कंक्रीट स्लैब",
    "Precast Concrete Column — प्रीकास्ट कंक्रीट खंभा",
    "Reinforced Concrete — प्रबलित कंक्रीट",
    "Lightweight Concrete — हल्का कंक्रीट",
    "Other Concrete Material — अन्य कंक्रीट सामग्री"
  ],
  "Tiles & Flooring — टाइल्स और फर्श": [
    "Ceramic Tiles — सिरेमिक टाइल्स",
    "Vitrified Tiles — विट्रिफाइड टाइल्स",
    "Porcelain Tiles — पोर्सिलेन टाइल्स",
    "Floor Tiles — फर्श की टाइल्स",
    "Wall Tiles — दीवार की टाइल्स",
    "Anti-Skid Tiles — फिसलन रोकने वाली टाइल्स",
    "Parking Tiles — पार्किंग टाइल्स",
    "Outdoor Tiles — बाहरी उपयोग की टाइल्स",
    "Marble — संगमरमर",
    "Granite — ग्रेनाइट",
    "Kota Stone — कोटा पत्थर",
    "Natural Stone — प्राकृतिक पत्थर",
    "Other Flooring Material — अन्य फर्श सामग्री"
  ],
  "Adhesives & Construction Chemicals — चिपकाने और निर्माण रसायन": [
    "Tile Adhesive — टाइल चिपकाने वाला पदार्थ",
    "Construction Adhesive — निर्माण चिपकाने वाला पदार्थ",
    "Epoxy — एपॉक्सी",
    "Grout — जोड़ भरने वाला पदार्थ",
    "Sealant — सील करने वाला पदार्थ",
    "Bonding Agent — जोड़ने वाला पदार्थ",
    "Concrete Admixture — कंक्रीट मिश्रण पदार्थ",
    "Curing Compound — कंक्रीट की मजबूती बनाए रखने वाला पदार्थ",
    "Crack Filler — दरार भरने वाला पदार्थ",
    "Repair Chemical — मरम्मत रसायन",
    "Other Construction Chemical — अन्य निर्माण रसायन"
  ],
  "Plumbing — प्लंबिंग सामग्री": [
    "PVC Pipe — पीवीसी पाइप",
    "CPVC Pipe — सीपीवीसी पाइप",
    "UPVC Pipe — यूपीवीसी पाइप",
    "HDPE Pipe — एचडीपीई पाइप",
    "GI Pipe — जीआई पाइप",
    "PPR Pipe — पीपीआर पाइप",
    "Water Tank — पानी की टंकी",
    "Pipe Fittings — पाइप फिटिंग",
    "Elbow — पाइप मोड़",
    "Tee — टी फिटिंग",
    "Coupler — जोड़ने वाली फिटिंग",
    "Union — यूनियन फिटिंग",
    "Valve — वाल्व",
    "Tap — नल",
    "Floor Drain — फर्श की पानी निकासी",
    "Other Plumbing Material — अन्य प्लंबिंग सामग्री"
  ],
  "Electrical — बिजली सामग्री": [
    "Electrical Wire — बिजली का तार",
    "Electrical Cable — बिजली की केबल",
    "Switch — स्विच",
    "Socket — सॉकेट",
    "Distribution Board — बिजली वितरण बोर्ड",
    "MCB — एमसीबी",
    "RCCB — आरसीसीबी",
    "Conduit Pipe — बिजली के तार की पाइप",
    "Junction Box — जंक्शन बॉक्स",
    "LED Light — एलईडी लाइट",
    "Electrical Panel — बिजली पैनल",
    "Earthing Material — अर्थिंग सामग्री",
    "Cable Tray — केबल ट्रे",
    "Other Electrical Material — अन्य बिजली सामग्री"
  ],
  "Paint & Wall Finishing — पेंट और दीवार की फिनिशिंग": [
    "Interior Wall Paint — अंदर की दीवार का पेंट",
    "Exterior Wall Paint — बाहर की दीवार का पेंट",
    "Primer — पेंट की शुरुआती परत",
    "Wall Putty — दीवार की पुट्टी",
    "Enamel Paint — एनामेल पेंट",
    "Metal Paint — धातु का पेंट",
    "Wood Paint — लकड़ी का पेंट",
    "Waterproof Paint — पानी से बचाने वाला पेंट",
    "Texture Paint — डिजाइन वाला पेंट",
    "Wall Texture — दीवार की बनावट",
    "Other Paint Material — अन्य पेंट सामग्री"
  ],
  "Waterproofing — वॉटरप्रूफिंग सामग्री": [
    "Waterproofing Chemical — पानी रोकने वाला रसायन",
    "Waterproofing Membrane — पानी रोकने वाली परत",
    "Waterproofing Coating — पानी रोकने वाली कोटिंग",
    "Waterproofing Powder — पानी रोकने वाला पाउडर",
    "Joint Sealant — जोड़ सील करने वाला पदार्थ",
    "Other Waterproofing Material — अन्य वॉटरप्रूफिंग सामग्री"
  ],
  "Doors & Windows — दरवाजे और खिड़कियां": [
    "Wooden Door — लकड़ी का दरवाजा",
    "Steel Door — स्टील का दरवाजा",
    "Aluminium Door — एल्युमिनियम का दरवाजा",
    "UPVC Door — यूपीवीसी दरवाजा",
    "Glass Door — कांच का दरवाजा",
    "Wooden Window — लकड़ी की खिड़की",
    "Aluminium Window — एल्युमिनियम की खिड़की",
    "UPVC Window — यूपीवीसी खिड़की",
    "Glass Window — कांच की खिड़की",
    "Door Frame — दरवाजे का चौखट",
    "Window Frame — खिड़की का चौखट",
    "Hardware Fittings — हार्डवेयर फिटिंग",
    "Other Door/Window Material — अन्य दरवाजा/खिड़की सामग्री"
  ],
  "Roofing — छत की सामग्री": [
    "Roofing Sheet — छत की शीट",
    "Colour Coated Sheet — रंग लगी छत की शीट",
    "Galvanized Sheet — जस्ती शीट",
    "Polycarbonate Sheet — पॉलीकार्बोनेट शीट",
    "Metal Roofing Sheet — धातु की छत की शीट",
    "Roof Tile — छत की टाइल",
    "Roof Insulation Material — छत को गर्मी से बचाने वाली सामग्री",
    "Other Roofing Material — अन्य छत सामग्री"
  ],
  "Wood & Boards — लकड़ी और बोर्ड": [
    "Plywood — प्लाईवुड",
    "Commercial Plywood — सामान्य प्लाईवुड",
    "Waterproof Plywood — पानी से सुरक्षित प्लाईवुड",
    "MDF Board — एमडीएफ बोर्ड",
    "Particle Board — पार्टिकल बोर्ड",
    "Block Board — ब्लॉक बोर्ड",
    "Laminated Board — लेमिनेटेड बोर्ड",
    "Wooden Plank — लकड़ी का पटरा",
    "Timber — इमारती लकड़ी",
    "Veneer — लकड़ी की पतली परत",
    "Other Wood Material — अन्य लकड़ी सामग्री"
  ],
  "Sanitary — सैनिटरी सामग्री": [
    "Wash Basin — वॉश बेसिन",
    "Toilet — शौचालय",
    "Western Toilet — पश्चिमी शौचालय",
    "Indian Toilet — भारतीय शौचालय",
    "Urinal — मूत्रालय",
    "Shower — शॉवर",
    "Bathroom Tap — बाथरूम का नल",
    "Bathroom Fittings — बाथरूम फिटिंग",
    "Floor Drain — फर्श की पानी निकासी",
    "Other Sanitary Material — अन्य सैनिटरी सामग्री"
  ],
  "Hardware — हार्डवेयर": [
    "Nails — कील",
    "Screws — पेंच",
    "Nuts — नट",
    "Bolts — बोल्ट",
    "Washers — वॉशर",
    "Hinges — कब्जे",
    "Door Handle — दरवाजे का हैंडल",
    "Locks — ताला",
    "Latches — कुंडी",
    "Brackets — ब्रैकेट",
    "Fasteners — जोड़ने वाले सामान",
    "Other Hardware — अन्य हार्डवेयर"
  ],
  "Other — अन्य": [
    "Other Construction Material — अन्य निर्माण सामग्री"
  ]
};

// Standard 24 Indian Units
const INDIAN_UNITS = [
  "Bag — बोरी",
  "Metric Ton — मीट्रिक टन",
  "Quintal — क्विंटल",
  "Kilogram — किलोग्राम",
  "Cubic Feet — घन फुट (cft)",
  "Cubic Metre — घन मीटर (cum)",
  "Piece — नग",
  "Number — संख्या",
  "Square Feet — वर्ग फुट (sq.ft)",
  "Square Metre — वर्ग मीटर (sq.m)",
  "Litre — लीटर",
  "Bundle — बंडल",
  "Box — डिब्बा",
  "Packet — पैकेट",
  "Roll — रोल",
  "Coil — कॉइल",
  "Running Feet — रनिंग फुट",
  "Running Metre — रनिंग मीटर",
  "Set — सेट",
  "Pair — जोड़ी",
  "Millimetre — मिलीमीटर",
  "Centimetre — सेंटीमीटर",
  "Metre — मीटर",
  "Gram — ग्राम",
  "Other — अन्य"
];

// Common Indian States
const INDIAN_STATES = [
  "Uttar Pradesh",
  "Delhi",
  "Haryana",
  "Rajasthan",
  "Bihar",
  "Madhya Pradesh",
  "Maharashtra",
  "Punjab",
  "Uttarakhand",
  "Gujarat",
  "West Bengal",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Andhra Pradesh",
  "Kerala",
  "Jharkhand",
  "Odisha",
  "Chhattisgarh",
  "Himachal Pradesh",
  "Assam",
  "Jammu and Kashmir",
  "Goa",
  "Chandigarh",
  "Other State"
];

// 3. State Management
let materialItemCount = 0;
let userProjects = [];

// 4. Initialization
document.addEventListener("DOMContentLoaded", async function() {
  setupUserHeader();
  setupScopeRadioCards();
  loadStatesDropdown();
  await loadUserProjects();
  
  // Add first material card by default
  addMaterialItem();

  // Bind Add Another Material button
  const addBtn = document.getElementById("addAnotherMaterialBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => addMaterialItem());
  }

  // Bind form submit
  const form = document.getElementById("buyMaterialForm");
  if (form) {
    form.addEventListener("submit", handleBuyMaterialSubmit);
  }
});

// Configure User identity & Navigation based on Role
function setupUserHeader() {
  const token = getCleanToken();
  const user = getCurrentUser();
  const userPill = document.getElementById("userPill");
  const backBtn = document.getElementById("backToDashboardBtn");

  if (!token) {
    // If not logged in, user can still prepare or redirect
    console.warn("Buy Material: No token found. Login recommended.");
  }

  if (user) {
    const roleRaw = (user.role || (user.roles && user.roles[0]) || "CUSTOMER").toString().replace("ROLE_", "").toUpperCase();
    const displayName = user.name || user.fullName || user.username || "Buyer";

    const isContractor = roleRaw === "CONTRACTOR";
    const isProfessional = roleRaw === "PROFESSIONAL" || roleRaw === "SERVICE_PROVIDER";

    if (userPill) {
      let roleBadge = "Customer — ग्राहक";
      let badgeClass = "bg-blue-500/20 text-blue-300 border-blue-500/30";
      if (isContractor) {
        roleBadge = "Contractor — ठेकेदार";
        badgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
      } else if (isProfessional) {
        roleBadge = "Professional — पेशेवर";
        badgeClass = "bg-orange-500/20 text-orange-300 border-orange-500/30";
      }

      userPill.innerHTML = `
        <span class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeClass}">
          <i class="fa-solid fa-circle-user text-xs"></i>
          <span>${escapeHtml(displayName)}</span>
          <span class="text-[10px] opacity-80 uppercase font-bold">(${roleBadge})</span>
        </span>
      `;
    }

    if (backBtn) {
      backBtn.href = getDashboardUrl();
      backBtn.onclick = (e) => {
        e.preventDefault();
        window.location.href = getDashboardUrl();
      };
    }

    // Pre-fill contact details if present
    const contactInput = document.getElementById("contactPerson");
    const phoneInput = document.getElementById("contactPhone");
    if (contactInput && !contactInput.value) contactInput.value = user.name || user.fullName || "";
    if (phoneInput && !phoneInput.value && user.phone) phoneInput.value = user.phone;
  }
}

// Populate States dropdown with Uttar Pradesh as smart default
function loadStatesDropdown() {
  const stateSelect = document.getElementById("deliveryState");
  if (!stateSelect) return;

  stateSelect.innerHTML = '<option value="" disabled>-- Select State / राज्य चुनें --</option>';
  INDIAN_STATES.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st;
    opt.textContent = st;
    if (st === "Uttar Pradesh") {
      opt.selected = true; // Default to UP as per prompt
    }
    stateSelect.appendChild(opt);
  });
}

// Fetch active projects to enable optional 1-click site autofill
async function loadUserProjects() {
  const token = getCleanToken();
  const projectPicker = document.getElementById("projectPickerContainer");
  const projectSelect = document.getElementById("projectSelect");
  if (!token || !projectSelect) return;

  try {
    const res = await fetch(API_BASE_URL + "/api/customer/projects", {
      headers: { "Authorization": "Bearer " + token }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        userProjects = data;
        if (projectPicker) projectPicker.classList.remove("hidden");

        projectSelect.innerHTML = '<option value="">-- Optional: Select an existing Project / साइट चुनें --</option>';
        data.forEach(p => {
          const opt = document.createElement("option");
          opt.value = p.projectId || p.id;
          opt.textContent = `${p.projectTitle || p.title || "Project"} (${p.city || p.location || "Site"})`;
          projectSelect.appendChild(opt);
        });

        projectSelect.addEventListener("change", function() {
          const selectedId = this.value;
          const proj = userProjects.find(p => (p.projectId || String(p.id)) === selectedId);
          if (proj) {
            const addrInput = document.getElementById("deliveryAddress");
            const cityInput = document.getElementById("deliveryCity");
            const stateSelect = document.getElementById("deliveryState");
            const pinInput = document.getElementById("deliveryPin");

            if (addrInput && proj.address) addrInput.value = proj.address;
            if (cityInput && proj.city) cityInput.value = proj.city;
            if (stateSelect && proj.state) stateSelect.value = proj.state;
            if (pinInput && proj.pincode) pinInput.value = proj.pincode;
          }
        });
      }
    }
  } catch (err) {
    console.warn("Could not load user projects:", err);
  }
}

// 5. Request Scope Selection Setup (STATE = DEFAULT)
function setupScopeRadioCards() {
  const scopeCards = document.querySelectorAll(".scope-card");
  const localRadiusGroup = document.getElementById("localRadiusGroup");
  const radiusPills = document.querySelectorAll(".radius-pill");

  scopeCards.forEach(card => {
    card.addEventListener("click", function() {
      scopeCards.forEach(c => c.classList.remove("active"));
      this.classList.add("active");

      const radio = this.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      const scopeVal = radio ? radio.value : "STATE";
      if (scopeVal === "LOCAL") {
        if (localRadiusGroup) localRadiusGroup.classList.remove("hidden");
      } else {
        if (localRadiusGroup) localRadiusGroup.classList.add("hidden");
      }
    });
  });

  radiusPills.forEach(pill => {
    pill.addEventListener("click", function(e) {
      e.stopPropagation();
      radiusPills.forEach(p => p.classList.remove("active"));
      this.classList.add("active");
      const radiusVal = this.dataset.radius || "25";
      const hiddenInput = document.getElementById("selectedLocalRadius");
      if (hiddenInput) hiddenInput.value = radiusVal;
    });
  });
}

// 6. Dynamic Material Row Management
function addMaterialItem() {
  materialItemCount++;
  const container = document.getElementById("materialsContainer");
  if (!container) return;

  const rowId = `material_row_${materialItemCount}`;
  const rowDiv = document.createElement("div");
  rowDiv.id = rowId;
  rowDiv.className = "material-card-row animate-fade-in space-y-3.5";
  rowDiv.dataset.index = materialItemCount;

  // Build Category Options
  let categoryOptionsHtml = '<option value="" disabled selected>-- Select Category / श्रेणी चुनें --</option>';
  Object.keys(MATERIALS_CATALOG).forEach(cat => {
    categoryOptionsHtml += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
  });

  // Build Unit Options
  let unitOptionsHtml = '<option value="" disabled selected>-- Select Unit / इकाई चुनें --</option>';
  INDIAN_UNITS.forEach(u => {
    unitOptionsHtml += `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`;
  });

  rowDiv.innerHTML = `
    <!-- Card Top Header -->
    <div class="flex items-center justify-between pb-2 border-b border-slate-100">
      <div class="flex items-center space-x-2">
        <span class="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200 item-number-badge">
          ${container.children.length + 1}
        </span>
        <h4 class="font-bold text-xs text-slate-800 tracking-tight">Material Item — निर्माण सामग्री</h4>
      </div>
      <button type="button" onclick="removeMaterialItem('${rowId}')" class="remove-item-btn text-rose-600 hover:text-rose-700 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-all ${container.children.length === 0 ? 'hidden' : ''}">
        <i class="fa-solid fa-trash mr-1"></i> Remove — हटाएँ
      </button>
    </div>

    <!-- Core Fields: Category & Material -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      <div>
        <label class="block font-semibold text-[11px] text-slate-700 mb-1">
          Category — श्रेणी <span class="text-rose-500">*</span>
        </label>
        <select class="item-category w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg text-xs text-slate-800 font-medium outline-none focus:ring-1 focus:ring-blue-500" required>
          ${categoryOptionsHtml}
        </select>
      </div>

      <div>
        <label class="block font-semibold text-[11px] text-slate-700 mb-1">
          Material — सामग्री <span class="text-rose-500">*</span>
        </label>
        <select class="item-material w-full px-3 py-2 bg-slate-100 border border-slate-300 focus:border-blue-500 rounded-lg text-xs text-slate-800 font-medium outline-none disabled:opacity-60 disabled:cursor-not-allowed" disabled required>
          <option value="" disabled selected>-- First select category / पहले ऊपर श्रेणी चुनें --</option>
        </select>
      </div>
    </div>

    <!-- Custom Material Name (Appears if 'Other' selected) -->
    <div class="custom-material-box hidden p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
      <div class="flex items-center space-x-1.5 text-amber-800 text-[11px] font-bold">
        <i class="fa-solid fa-pen-to-square"></i>
        <span>Custom Material Details — अन्य सामग्री का नाम और विवरण</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <input type="text" class="custom-material-input w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none" placeholder="Enter custom material name — सामग्री का नाम">
        <input type="text" class="custom-notes-input w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none" placeholder="Custom specifications / विशेष निर्देश">
      </div>
    </div>

    <!-- Quantity, Unit, Brand, Specification -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- Quantity -->
      <div>
        <label class="block font-semibold text-[11px] text-slate-700 mb-1">
          Quantity — मात्रा <span class="text-rose-500">*</span>
        </label>
        <input type="number" min="0.01" step="any" class="item-quantity w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg text-xs font-bold text-slate-900 outline-none" placeholder="e.g. 100" required>
      </div>

      <!-- Unit -->
      <div>
        <label class="block font-semibold text-[11px] text-slate-700 mb-1">
          Unit — इकाई <span class="text-rose-500">*</span>
        </label>
        <select class="item-unit w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg text-xs text-slate-800 font-medium outline-none" required>
          ${unitOptionsHtml}
        </select>
        <input type="text" class="custom-unit-input hidden mt-1.5 w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs" placeholder="Custom unit — इकाई">
      </div>

      <!-- Brand (Optional) -->
      <div>
        <label class="block font-semibold text-[11px] text-slate-700 mb-1">
          Brand — ब्रांड <span class="text-slate-400 font-normal">(Optional)</span>
        </label>
        <input type="text" class="item-brand w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none" placeholder="e.g. UltraTech, Tata">
      </div>

      <!-- Specification (Optional) -->
      <div>
        <label class="block font-semibold text-[11px] text-slate-700 mb-1">
          Specification — विवरण <span class="text-slate-400 font-normal">(Optional)</span>
        </label>
        <input type="text" class="item-specification w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none" placeholder="e.g. 53 Grade, 12mm">
      </div>
    </div>
  `;

  container.appendChild(rowDiv);
  wireMaterialRowEvents(rowDiv);
  updateItemBadgesAndRemoveButtons();
}

// Wire events for Category & Material changes inside each row
function wireMaterialRowEvents(rowDiv) {
  const catSelect = rowDiv.querySelector(".item-category");
  const matSelect = rowDiv.querySelector(".item-material");
  const customBox = rowDiv.querySelector(".custom-material-box");
  const customInput = rowDiv.querySelector(".custom-material-input");
  const unitSelect = rowDiv.querySelector(".item-unit");
  const customUnitInput = rowDiv.querySelector(".custom-unit-input");

  catSelect.addEventListener("change", function() {
    const selectedCat = this.value;
    matSelect.innerHTML = "";

    if (!selectedCat) {
      matSelect.disabled = true;
      matSelect.classList.add("bg-slate-100");
      matSelect.classList.remove("bg-slate-50");
      matSelect.innerHTML = '<option value="" disabled selected>-- First select category / पहले ऊपर श्रेणी चुनें --</option>';
      if (customBox) customBox.classList.add("hidden");
      return;
    }

    matSelect.disabled = false;
    matSelect.classList.remove("bg-slate-100");
    matSelect.classList.add("bg-slate-50");

    const materials = MATERIALS_CATALOG[selectedCat] || [];
    matSelect.innerHTML = '<option value="" disabled selected>-- Select Material / सामग्री चुनें --</option>';

    materials.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      matSelect.appendChild(opt);
    });

    // Ensure Other is available in material dropdown
    const hasOther = materials.some(m => m.includes("Other") || m.includes("अन्य"));
    if (!hasOther) {
      const otherOpt = document.createElement("option");
      otherOpt.value = "Other — अन्य";
      otherOpt.textContent = "Other — अन्य (Custom Material)";
      matSelect.appendChild(otherOpt);
    }

    // If Category is Other, show custom box directly
    if (selectedCat.includes("Other") || selectedCat.includes("अन्य")) {
      if (customBox) {
        customBox.classList.remove("hidden");
        if (customInput) customInput.focus();
      }
    } else {
      if (customBox) customBox.classList.add("hidden");
    }
  });

  matSelect.addEventListener("change", function() {
    const val = this.value || "";
    if (val.includes("Other") || val.includes("अन्य")) {
      if (customBox) {
        customBox.classList.remove("hidden");
        if (customInput) customInput.focus();
      }
    } else {
      if (customBox && !catSelect.value.includes("Other")) {
        customBox.classList.add("hidden");
      }
    }
  });

  unitSelect.addEventListener("change", function() {
    const val = this.value || "";
    if (val.includes("Other") || val.includes("अन्य")) {
      if (customUnitInput) {
        customUnitInput.classList.remove("hidden");
        customUnitInput.focus();
      }
    } else {
      if (customUnitInput) customUnitInput.classList.add("hidden");
    }
  });
}

function removeMaterialItem(rowId) {
  const container = document.getElementById("materialsContainer");
  const row = document.getElementById(rowId);
  if (!container || !row) return;

  if (container.children.length <= 1) {
    showToast("At least one material is required — कम से कम एक सामग्री आवश्यक है", "warning");
    return;
  }

  row.remove();
  updateItemBadgesAndRemoveButtons();
}

function updateItemBadgesAndRemoveButtons() {
  const container = document.getElementById("materialsContainer");
  if (!container) return;

  const rows = container.querySelectorAll(".material-card-row");
  const total = rows.length;

  rows.forEach((r, idx) => {
    const badge = r.querySelector(".item-number-badge");
    if (badge) badge.innerText = idx + 1;

    const removeBtn = r.querySelector(".remove-item-btn");
    if (removeBtn) {
      if (total <= 1) {
        removeBtn.classList.add("hidden");
      } else {
        removeBtn.classList.remove("hidden");
      }
    }
  });
}

// 7. Form Submission Handler
async function handleBuyMaterialSubmit(e) {
  e.preventDefault();

  const token = getCleanToken();
  if (!token) {
    showToast("Please login first to submit a material request — कृपया पहले लॉगिन करें", "error");
    setTimeout(() => window.location.href = "index.html", 1500);
    return;
  }

  const container = document.getElementById("materialsContainer");
  const rows = container.querySelectorAll(".material-card-row");

  if (!rows || rows.length === 0) {
    showToast("Please add at least one material — कृपया कम से कम एक सामग्री जोड़ें", "error");
    return;
  }

  // Collect items
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cat = r.querySelector(".item-category") ? r.querySelector(".item-category").value.trim() : "";
    let mat = r.querySelector(".item-material") ? r.querySelector(".item-material").value.trim() : "";
    const customMat = r.querySelector(".custom-material-input") ? r.querySelector(".custom-material-input").value.trim() : "";
    const qty = parseFloat(r.querySelector(".item-quantity") ? r.querySelector(".item-quantity").value : 0);
    let unit = r.querySelector(".item-unit") ? r.querySelector(".item-unit").value.trim() : "";
    const customUnit = r.querySelector(".custom-unit-input") ? r.querySelector(".custom-unit-input").value.trim() : "";
    const brand = r.querySelector(".item-brand") ? r.querySelector(".item-brand").value.trim() : "";
    const spec = r.querySelector(".item-specification") ? r.querySelector(".item-specification").value.trim() : "";
    const customNotes = r.querySelector(".custom-notes-input") ? r.querySelector(".custom-notes-input").value.trim() : "";

    const isOther = cat.includes("Other") || cat.includes("अन्य") || mat.includes("Other") || mat.includes("अन्य");

    if (!cat) {
      showToast(`Please select a Category for Item #${i + 1} — आइटम #${i + 1} की श्रेणी चुनें`, "error");
      return;
    }

    if (isOther) {
      if (!customMat) {
        showToast(`Please enter Material Name for Item #${i + 1} — आइटम #${i + 1} की सामग्री का नाम दर्ज करें`, "error");
        return;
      }
      mat = customMat;
    } else if (!mat) {
      showToast(`Please select Material for Item #${i + 1} — आइटम #${i + 1} की सामग्री चुनें`, "error");
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      showToast(`Please enter a valid Quantity (> 0) for Item #${i + 1} — आइटम #${i + 1} की मान्य मात्रा दर्ज करें`, "error");
      return;
    }

    if (!unit) {
      showToast(`Please select a Unit for Item #${i + 1} — आइटम #${i + 1} की इकाई चुनें`, "error");
      return;
    }
    if ((unit.includes("Other") || unit.includes("अन्य")) && customUnit) {
      unit = customUnit;
    }

    items.push({
      category: cat,
      materialName: mat,
      quantity: qty,
      unit: unit,
      brand: brand,
      specification: spec,
      isCustomMaterial: isOther,
      customMaterialName: customMat,
      customUnit: customUnit,
      notes: customNotes
    });
  }

  // Delivery details
  const deliveryAddress = document.getElementById("deliveryAddress") ? document.getElementById("deliveryAddress").value.trim() : "";
  const city = document.getElementById("deliveryCity") ? document.getElementById("deliveryCity").value.trim() : "";
  const state = document.getElementById("deliveryState") ? document.getElementById("deliveryState").value.trim() : "";
  const pinCode = document.getElementById("deliveryPin") ? document.getElementById("deliveryPin").value.trim() : "";
  const contactPerson = document.getElementById("contactPerson") ? document.getElementById("contactPerson").value.trim() : "";
  const contactPhone = document.getElementById("contactPhone") ? document.getElementById("contactPhone").value.trim() : "";
  const expectedDate = document.getElementById("expectedDate") ? document.getElementById("expectedDate").value.trim() : "";
  const specialNotes = document.getElementById("specialNotes") ? document.getElementById("specialNotes").value.trim() : "";

  if (!state) {
    showToast("Delivery State is required — डिलीवरी राज्य आवश्यक है", "error");
    return;
  }

  if (!pinCode) {
    showToast("PIN Code is required — पिन कोड आवश्यक है", "error");
    return;
  }

  // Request Scope (STATE is default)
  const selectedScopeRadio = document.querySelector('input[name="requestScope"]:checked');
  const requestScope = selectedScopeRadio ? selectedScopeRadio.value : "STATE";

  let localRadius = null;
  if (requestScope === "LOCAL") {
    const radiusInput = document.getElementById("selectedLocalRadius");
    localRadius = radiusInput ? parseInt(radiusInput.value, 10) : 25;
  }

  // Project reference if picked
  const projectSelect = document.getElementById("projectSelect");
  const projectId = projectSelect ? projectSelect.value : null;

  // Build Payload
  const payload = {
    items: items,
    deliveryAddress: deliveryAddress,
    city: city,
    state: state,
    pinCode: pinCode,
    contactPerson: contactPerson,
    contactPhone: contactPhone,
    expectedDeliveryDate: expectedDate,
    requestScope: requestScope,
    localRadius: localRadius,
    projectId: projectId,
    specialNotes: specialNotes
  };

  // Submit API call
  const submitBtn = document.getElementById("sendMaterialRequestBtn");
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Sending Request... / अनुरोध भेजा जा रहा है...</span>';
  }

  try {
    const res = await fetch(API_BASE_URL + "/api/material-requests", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showSuccessModal(data);
    } else {
      const errMsg = data.error || data.message || "Failed to send request. Please review fields.";
      showToast(errMsg, "error");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  } catch (err) {
    console.error("Material Request submission error:", err);
    showToast("Network error communicating with BuildBid server.", "error");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
}

// 8. Success Modal Display
function showSuccessModal(data) {
  const modal = document.getElementById("successModal");
  if (!modal) return;

  const reqIdElem = document.getElementById("successReqId");
  const countElem = document.getElementById("successItemCount");
  const scopeElem = document.getElementById("successScope");

  if (reqIdElem) reqIdElem.innerText = data.requestId || "MR-1001";
  if (countElem) countElem.innerText = `${data.itemCount || 1} Material(s) — सामग्री`;

  let scopeDisplay = "State Sellers / राज्य विक्रेता (" + (data.state || "") + ")";
  if (data.requestScope === "ALL_INDIA") {
    scopeDisplay = "All India Sellers / पूरे भारत में";
  } else if (data.requestScope === "LOCAL") {
    scopeDisplay = `Local Radius / स्थानीय (${data.localRadius || 25} km)`;
  }
  if (scopeElem) scopeElem.innerText = scopeDisplay;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeSuccessModal() {
  const modal = document.getElementById("successModal");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
  window.location.href = getDashboardUrl();
}

// 9. Toast Notification Helper
function showToast(message, type = "success") {
  const toast = document.getElementById("buyToast");
  const toastMsg = document.getElementById("buyToastMsg");
  const toastIcon = document.getElementById("buyToastIcon");

  if (!toast || !toastMsg) return;

  toastMsg.innerText = message;
  if (type === "success") {
    toastIcon.className = "fa-solid fa-circle-check text-emerald-400 text-base mr-2.5";
  } else if (type === "warning") {
    toastIcon.className = "fa-solid fa-triangle-exclamation text-amber-400 text-base mr-2.5";
  } else {
    toastIcon.className = "fa-solid fa-circle-exclamation text-rose-400 text-base mr-2.5";
  }

  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
