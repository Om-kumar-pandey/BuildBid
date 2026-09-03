document.addEventListener("DOMContentLoaded", () => {
  syncUniversalUserProfile();
  initEventListeners();
  setLiveDatasetDate();
});

// Dynamic Project State
let currentStep = 1;
const projectState = {
  projectType: null,
  title: "",
  city: "",
  state: "",
  pincode: "",
  plotArea: null,
  builtUpArea: null,
  floors: 1,
  qualityTier: "standard",
  requirements: {},
  customDescription: ""
};

/* =========================================================
   CATEGORY-WISE DYNAMIC REQUIREMENTS CONFIGURATION
   ========================================================= */
const REQUIREMENTS_MAP = {
  "New Construction": [
    { key: "parking", label: "Parking Space", defaultCost: 100000 },
    { key: "boundaryWall", label: "Boundary Wall", defaultCost: 150000 },
    { key: "gate", label: "Main Entrance Gate", defaultCost: 60000 },
    { key: "modularKitchen", label: "Modular Kitchen", defaultCost: 180000 },
    { key: "wardrobes", label: "Wardrobes / Storage", defaultCost: 120000 },
    { key: "falseCeiling", label: "False Ceiling", perSqFtCost: 60 },
    { key: "electricalWork", label: "Electrical Work", perSqFtCost: 75 },
    { key: "plumbing", label: "Plumbing & Piping", perSqFtCost: 65 },
    { key: "waterproofing", label: "Waterproofing", perSqFtCost: 40 },
    { key: "waterTank", label: "Underground / Overhead Tank", defaultCost: 50000 },
    { key: "borewell", label: "Borewell Drilling", defaultCost: 120000 },
    { key: "lift", label: "Elevator / Lift Setup", defaultCost: 450000 },
    { key: "landscaping", label: "Landscaping & Garden", defaultCost: 80000 },
    { key: "interiorWork", label: "Interior Woodwork", defaultCost: 200000 },
    { key: "exteriorPainting", label: "Exterior Texture Painting", perSqFtCost: 35 }
  ],
  "Renovation": [
    { key: "demolition", label: "Demolition & Debris Disposal", defaultCost: 60000 },
    { key: "structuralRepairs", label: "Structural Repairs & Retrofitting", defaultCost: 100000 },
    { key: "flooringReplace", label: "Flooring Replacement", perSqFtCost: 80 },
    { key: "bathRenovation", label: "Bathroom Overhaul", defaultCost: 120000 },
    { key: "kitchenRemodel", label: "Modular Kitchen Upgrade", defaultCost: 150000 },
    { key: "falseCeilingRedo", label: "False Ceiling & Profile Lights", perSqFtCost: 55 },
    { key: "waterproofingFix", label: "Waterproofing & Seelan Treatment", perSqFtCost: 45 },
    { key: "doorWindowUpgrade", label: "Door / Window Replacement", defaultCost: 90000 },
    { key: "electricalRewire", label: "Electrical Rewiring", perSqFtCost: 50 },
    { key: "wallRepaint", label: "Full Wall Putty & Repainting", perSqFtCost: 30 }
  ],
  "Commercial": [
    { key: "hvacSystem", label: "Central HVAC / Ventilation", perSqFtCost: 140 },
    { key: "fireFighting", label: "Fire Safety & Sprinklers (NOC)", perSqFtCost: 60 },
    { key: "glassFacade", label: "Glass Facade / ACP Cladding", defaultCost: 350000 },
    { key: "powerBackup", label: "Commercial DG Set & HT Panel", defaultCost: 400000 },
    { key: "dataCabling", label: "Server Room & LAN Cabling", defaultCost: 120000 },
    { key: "accessControl", label: "Access Control & CCTV Network", defaultCost: 150000 },
    { key: "restroomBlocks", label: "Commercial Multi-Stall Washrooms", defaultCost: 200000 },
    { key: "commercialLift", label: "Commercial Passenger Lift", defaultCost: 650000 },
    { key: "acousticsPartitions", label: "Soundproof Glass/Gypsum Partitions", defaultCost: 180000 },
    { key: "falseCeilingComm", label: "Grid Modular Ceiling", perSqFtCost: 65 }
  ],
  "Industrial": [
    { key: "pebSteel", label: "PEB / Structural Steel Frame", perSqFtCost: 280 },
    { key: "trimixFloor", label: "Heavy Duty Trimix / FM2 Flooring", perSqFtCost: 90 },
    { key: "loadingDocks", label: "Motorized Rolling Shutters & Docks", defaultCost: 250000 },
    { key: "industrialPower", label: "3-Phase Power & Busbar Trunking", defaultCost: 350000 },
    { key: "craneGantry", label: "EOT Overhead Crane Gantry", defaultCost: 500000 },
    { key: "shedVentilation", label: "Turbo Ridge Ventilators & Louvers", defaultCost: 100000 },
    { key: "etpStpPlant", label: "Industrial Waste / ETP Setup", defaultCost: 450000 },
    { key: "stormDrainage", label: "Heavy Stormwater Drainage Yard", defaultCost: 180000 },
    { key: "heavyDriveway", label: "Heavy Truck Driveway & Weighbridge", defaultCost: 300000 }
  ]
};

/* =========================================================
   1. LIVE CURRENT DATE GENERATOR
   ========================================================= */
function setLiveDatasetDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const formattedDate = `${day}/${month}/${year}`;
  const dateElem = document.getElementById("rateUpdateDate");
  if (dateElem) {
    dateElem.textContent = formattedDate;
  }
}

/* =========================================================
   2. UNIVERSAL LOGGED-IN USER IDENTIFICATION & SYNC
   ========================================================= */
function syncUniversalUserProfile() {
  const storageKeys = [
    "currentUser",
    "customerUser",
    "userData",
    "user",
    "loggedInUser",
    "auth_user",
    "customer"
  ];

  let activeUser = null;

  for (const key of storageKeys) {
    const rawLocal = localStorage.getItem(key);
    const rawSession = sessionStorage.getItem(key);
    const raw = rawLocal || rawSession;

    if (raw) {
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === "object") {
          activeUser = parsed;
          break;
        }
      } catch (e) {
        if (typeof raw === "string" && raw.trim().length > 0) {
          activeUser = { name: raw };
          break;
        }
      }
    }
  }

  if (activeUser) {
    applyUserHeaderData(activeUser);
  }

  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || sessionStorage.getItem("token") || "";
  if (token) {
    fetch("/api/customer/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    })
    .then(res => res.ok ? res.json() : null)
    .then(freshUser => {
      if (freshUser) {
        localStorage.setItem("customerUser", JSON.stringify(freshUser));
        applyUserHeaderData(freshUser);
      }
    })
    .catch(() => {});
  }
}

function applyUserHeaderData(user) {
  const nameElem = document.getElementById("navUserName");
  const avatarElem = document.getElementById("navUserAvatar");
  const roleElem = document.getElementById("navUserRole");

  if (!user) return;

  const rawName = 
    user.name || 
    user.fullName || 
    user.fullname || 
    user.username || 
    user.userName || 
    user.firstName || 
    user.email?.split("@")[0] || 
    "User";

  const cleanName = String(rawName).trim();

  if (nameElem && cleanName) {
    nameElem.textContent = cleanName.split(" ")[0];
  }

  if (roleElem) {
    roleElem.textContent = (user.role || "CUSTOMER").toUpperCase();
  }

  if (avatarElem && cleanName) {
    const parts = cleanName.split(" ").filter(Boolean);
    let initials = "U";
    if (parts.length === 1) {
      initials = parts[0].substring(0, 2).toUpperCase();
    } else if (parts.length > 1) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    avatarElem.textContent = initials;
  }

  if (user.city && document.getElementById("cityInput") && !document.getElementById("cityInput").value) {
    document.getElementById("cityInput").value = user.city;
  }
  if (user.state && document.getElementById("stateSelect") && !document.getElementById("stateSelect").value) {
    document.getElementById("stateSelect").value = user.state;
  }
  if (typeof updateLocationInfo === "function") {
    updateLocationInfo();
  }
}

/* =========================================================
   3. MODERN TOAST NOTIFICATION ENGINE
   ========================================================= */
function showToast(title, message, type = "warning") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast-card ${type}`;

  const iconMap = {
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info",
    success: "fa-circle-check",
    error: "fa-circle-xmark"
  };

  toast.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-bell'}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* =========================================================
   4. STEPPER FLOW & VALIDATION
   ========================================================= */
function goToStep(stepNumber) {
  if (stepNumber > 1 && !projectState.projectType) {
    showToast("Selection Required", "Please select a project type first to continue.", "warning");
    return;
  }

  if (stepNumber > 2) {
    const city = document.getElementById("cityInput").value.trim();
    const state = document.getElementById("stateSelect").value;
    if (!city || !state) {
      showToast("Location Incomplete", "Please enter your city and select a state.", "warning");
      return;
    }
  }

  if (stepNumber > 3 && (!projectState.builtUpArea || projectState.builtUpArea <= 0)) {
    showToast("Area Required", "Please enter the Built-up Area before proceeding.", "warning");
    return;
  }

  currentStep = stepNumber;

  for (let i = 1; i <= 6; i++) {
    const pane = document.getElementById(`stepPane${i}`);
    if (pane) pane.classList.toggle("active", i === currentStep);
  }

  document.querySelectorAll(".step-node").forEach(node => {
    const s = parseInt(node.dataset.step);
    node.classList.remove("active", "completed");
    if (s === currentStep) {
      node.classList.add("active");
    } else if (s < currentStep) {
      node.classList.add("completed");
    }
  });

  if (currentStep === 6) {
    populateSummaryReview();
  }

  window.scrollTo({ top: 80, behavior: "smooth" });
}

/* =========================================================
   5. SELECTIONS & DYNAMIC REQUIREMENTS GENERATION
   ========================================================= */
function selectProjectType(type, elem) {
  projectState.projectType = type;
  document.querySelectorAll(".selection-card").forEach(c => c.classList.remove("selected"));
  elem.classList.add("selected");

  // Re-generate Requirements based on chosen project type
  renderCategoryRequirements(type);
  recalculateDynamicEstimates();
}

function updateLocationInfo() {
  const city = document.getElementById("cityInput").value.trim();
  const state = document.getElementById("stateSelect").value;
  const title = document.getElementById("projectTitleInput").value.trim();

  projectState.city = city;
  projectState.state = state;
  projectState.title = title;
  
  const locElem = document.getElementById("locInfo");
  if (locElem) {
    if (city && state) {
      locElem.textContent = `${city}, ${state}`;
    } else if (city) {
      locElem.textContent = city;
    } else if (state) {
      locElem.textContent = state;
    } else {
      locElem.textContent = "Enter location in Step 2";
    }
  }
}

function renderCategoryRequirements(type) {
  const container = document.getElementById("featuresContainer");
  if (!container) return;

  const items = REQUIREMENTS_MAP[type] || REQUIREMENTS_MAP["New Construction"];
  
  // Preserve state & reset keys
  projectState.requirements = {};

  let html = items.map(item => {
    projectState.requirements[item.key] = false;
    return `
      <div class="feature-toggle-card">
        <div class="feat-info">
          <strong>${item.label}</strong>
          <span id="label-${item.key}">No</span>
        </div>
        <label class="switch">
          <input type="checkbox" id="req-${item.key}" onchange="toggleRequirement('${item.key}', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
    `;
  }).join('');

  // Append OTHERS toggle button
  projectState.requirements["others"] = false;
  html += `
    <div class="feature-toggle-card others-card">
      <div class="feat-info">
        <strong>Others / Custom</strong>
        <span id="label-others">No</span>
      </div>
      <label class="switch">
        <input type="checkbox" id="req-others" onchange="toggleOthersRequirement(this.checked)">
        <span class="slider"></span>
      </label>
    </div>
  `;

  container.innerHTML = html;

  // Reset others text box
  const descBox = document.getElementById("othersDescBox");
  if (descBox) descBox.style.display = "none";
  const descInput = document.getElementById("othersDescInput");
  if (descInput) descInput.value = "";
  projectState.customDescription = "";
}

function toggleRequirement(key, val) {
  projectState.requirements[key] = val;
  const label = document.getElementById(`label-${key}`);
  if (label) label.innerText = val ? "Yes" : "No";
  recalculateDynamicEstimates();
}

function toggleOthersRequirement(checked) {
  projectState.requirements["others"] = checked;
  const label = document.getElementById("label-others");
  if (label) label.innerText = checked ? "Yes" : "No";

  const descBox = document.getElementById("othersDescBox");
  if (descBox) {
    descBox.style.display = checked ? "block" : "none";
    if (checked) {
      document.getElementById("othersDescInput").focus();
    }
  }
}

/* =========================================================
   6. REAL-TIME CALCULATION ENGINE
   ========================================================= */
function recalculateDynamicEstimates() {
  const builtUp = parseFloat(document.getElementById("builtUpAreaInput").value);
  const plotArea = parseFloat(document.getElementById("plotAreaInput").value);
  const floorsVal = parseInt(document.getElementById("floorsInput").value);
  
  projectState.plotArea = isNaN(plotArea) ? null : plotArea;
  projectState.builtUpArea = isNaN(builtUp) ? null : builtUp;
  projectState.floors = (!isNaN(floorsVal) && floorsVal > 0) ? floorsVal : 1;

  if (!builtUp || builtUp <= 0) {
    document.getElementById("costRangeDisplay").innerText = "Enter Area Details";
    document.getElementById("estDisclaimer").innerText = "*Provide building size to calculate indicative estimate.";
    document.getElementById("lowerEstLabel").innerText = "₹--";
    document.getElementById("expectedEstLabel").innerText = "₹--";
    document.getElementById("higherEstLabel").innerText = "₹--";
    document.getElementById("floorBreakdownBox").style.display = "none";
    document.getElementById("rangeFillBar").style.width = "0%";
    resetBreakdownTable();
    return;
  }

  // Base rate by project type & tier
  let ratePerSqFt = 1600;
  if (projectState.projectType === "Renovation") ratePerSqFt = 900;
  if (projectState.projectType === "Commercial") ratePerSqFt = 2000;
  if (projectState.projectType === "Industrial") ratePerSqFt = 1400;

  if (projectState.qualityTier === "basic") ratePerSqFt *= 0.85;
  if (projectState.qualityTier === "premium") ratePerSqFt *= 1.35;

  // Calculate dynamic addons
  let addons = 0;
  const currentList = REQUIREMENTS_MAP[projectState.projectType || "New Construction"] || [];
  currentList.forEach(item => {
    if (projectState.requirements[item.key]) {
      if (item.defaultCost) addons += item.defaultCost;
      if (item.perSqFtCost) addons += (builtUp * item.perSqFtCost);
    }
  });

  const baseTotal = (builtUp * ratePerSqFt) + addons;
  const lowerLakh = (baseTotal * 0.95 / 100000).toFixed(1);
  const higherLakh = (baseTotal * 1.15 / 100000).toFixed(1);

  document.getElementById("costRangeDisplay").innerText = `₹${lowerLakh} Lakh – ₹${higherLakh} Lakh`;
  document.getElementById("estDisclaimer").innerText = "*Indicative estimate based on dynamic inputs.";
  document.getElementById("lowerEstLabel").innerText = `₹${lowerLakh}L`;
  document.getElementById("expectedEstLabel").innerText = `₹${lowerLakh}L – ₹${higherLakh}L`;
  document.getElementById("higherEstLabel").innerText = `₹${higherLakh}L`;
  document.getElementById("rangeFillBar").style.width = "60%";
  document.getElementById("rangeFillBar").style.left = "20%";

  // Floor Breakdown Rendering
  const breakdownBox = document.getElementById("floorBreakdownBox");
  breakdownBox.style.display = "flex";
  const numFloors = projectState.floors;
  const perFloor = Math.round(builtUp / numFloors);
  
  let badges = `<span>Ground Floor: <b>${perFloor} sq ft</b></span>`;
  for (let i = 1; i < numFloors; i++) {
    badges += `<span>Floor ${i}: <b>${perFloor} sq ft</b></span>`;
  }
  document.getElementById("floorBadgesContainer").innerHTML = badges;
  document.getElementById("totalBuiltUpDisplay").innerText = `${builtUp.toLocaleString()} sq ft`;

  renderBreakdownDetails(baseTotal);
}

function renderBreakdownDetails(total) {
  const container = document.getElementById("costBreakdownList");
  container.innerHTML = `
    <div>Material Cost: <b>₹${(total * 0.48 / 100000).toFixed(1)}L</b></div>
    <div>Finishing: <b>₹${(total * 0.09 / 100000).toFixed(1)}L</b></div>
    <div>Labour Cost: <b>₹${(total * 0.22 / 100000).toFixed(1)}L</b></div>
    <div>Doors & Windows: <b>₹${(total * 0.04 / 100000).toFixed(1)}L</b></div>
    <div>Electrical: <b>₹${(total * 0.06 / 100000).toFixed(1)}L</b></div>
    <div>Painting: <b>₹${(total * 0.04 / 100000).toFixed(1)}L</b></div>
    <div>Plumbing: <b>₹${(total * 0.05 / 100000).toFixed(1)}L</b></div>
    <div>Contingency: <b>₹${(total * 0.02 / 100000).toFixed(1)}L</b></div>
  `;
}

function resetBreakdownTable() {
  document.getElementById("costBreakdownList").innerHTML = `
    <div>Material Cost: <b>--</b></div>
    <div>Finishing: <b>--</b></div>
    <div>Labour Cost: <b>--</b></div>
    <div>Doors & Windows: <b>--</b></div>
    <div>Electrical: <b>--</b></div>
    <div>Painting: <b>--</b></div>
    <div>Plumbing: <b>--</b></div>
    <div>Contingency: <b>--</b></div>
  `;
}

/* =========================================================
   7. STEP 6 REVIEW & EVENT LISTENERS
   ========================================================= */
function populateSummaryReview() {
  document.getElementById("revType").textContent = projectState.projectType || "Not Selected";
  document.getElementById("revTitle").textContent = document.getElementById("projectTitleInput").value.trim() || "Untitled Project";
  document.getElementById("revLocation").textContent = projectState.city ? `${projectState.city}, ${projectState.state}` : "Not Specified";
  document.getElementById("revSize").textContent = projectState.builtUpArea ? `${projectState.builtUpArea} sq ft` : "--";
  document.getElementById("revFloors").textContent = `${projectState.floors || 1} Floor(s)`;
  document.getElementById("revQuality").textContent = projectState.qualityTier ? projectState.qualityTier.toUpperCase() : "STANDARD";

  // Match requirement labels dynamically
  const currentReqList = REQUIREMENTS_MAP[projectState.projectType] || [];
  const reqLabelsMap = {};
  currentReqList.forEach(r => { reqLabelsMap[r.key] = r.label; });
  reqLabelsMap["others"] = "Custom / Others";

  const enabledReqs = Object.keys(projectState.requirements)
    .filter(k => projectState.requirements[k])
    .map(k => reqLabelsMap[k] || k);

  document.getElementById("revReqs").textContent = enabledReqs.length > 0 ? enabledReqs.join(", ") : "None";

  // Others Description
  const othersText = document.getElementById("othersDescInput")?.value.trim() || "";
  projectState.customDescription = othersText;
  const revOthersRow = document.getElementById("revOthersRow");
  if (revOthersRow) {
    if (projectState.requirements["others"] && othersText) {
      revOthersRow.style.display = "block";
      document.getElementById("revOthers").textContent = othersText;
    } else {
      revOthersRow.style.display = "none";
    }
  }
}

function initEventListeners() {
  document.getElementById("plotAreaInput")?.addEventListener("input", recalculateDynamicEstimates);
  document.getElementById("builtUpAreaInput")?.addEventListener("input", recalculateDynamicEstimates);
  
  // Manual floors input listener
  const floorsInput = document.getElementById("floorsInput");
  if (floorsInput) {
    floorsInput.addEventListener("input", () => {
      if (parseInt(floorsInput.value) < 1) floorsInput.value = 1;
      projectState.floors = parseInt(floorsInput.value) || 1;
      recalculateDynamicEstimates();
    });
  }

  // Stepper clicks
  document.querySelectorAll(".step-node").forEach(node => {
    node.addEventListener("click", () => {
      const targetStep = parseInt(node.dataset.step);
      goToStep(targetStep);
    });
  });

  // Quality tier cards
  document.querySelectorAll(".tier-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".tier-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      projectState.qualityTier = card.dataset.tier;
      recalculateDynamicEstimates();
    });
  });
}

/* =========================================================
   8. BACKEND API SUBMISSION
   ========================================================= */
async function submitProject() {
  if (!projectState.projectType) {
    showToast("Incomplete Form", "Please select a project type in Step 1.", "warning");
    goToStep(1);
    return;
  }
  if (!projectState.builtUpArea) {
    showToast("Area Missing", "Please enter Built-up area in Step 3.", "warning");
    goToStep(3);
    return;
  }

  projectState.customDescription = document.getElementById("othersDescInput")?.value.trim() || "";

  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  const payload = {
    title: document.getElementById("projectTitleInput").value.trim() || `${projectState.builtUpArea} sq.ft ${projectState.projectType}`,
    type: projectState.projectType,
    city: projectState.city || document.getElementById("cityInput").value.trim(),
    state: projectState.state || document.getElementById("stateSelect").value,
    pincode: document.getElementById("pincodeInput").value.trim(),
    plotArea: projectState.plotArea,
    builtUpArea: projectState.builtUpArea,
    floors: projectState.floors || 1,
    qualityTier: projectState.qualityTier || "standard",
    requirements: projectState.requirements,
    customDescription: projectState.customDescription,
    estimatedCost: document.getElementById("costRangeDisplay").innerText
  };

  try {
    const response = await fetch("/api/customer/projects/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      showToast("Success", "Project posted and bids requested successfully!", "success");
      setTimeout(() => { window.location.href = "customer projects.html"; }, 1500);
    } else {
      saveProjectLocally(payload);
    }
  } catch (err) {
    saveProjectLocally(payload);
  }
}

function saveProjectLocally(payload) {
  const localList = JSON.parse(localStorage.getItem("customerProjects") || "[]");
  localList.unshift({
    id: Date.now(),
    title: payload.title,
    location: `${payload.city || 'Greater Noida'}, ${payload.state || 'UP'}`,
    area: `${payload.builtUpArea} sq.ft`,
    category: payload.type,
    floors: payload.floors,
    customDescription: payload.customDescription,
    status: "In Progress",
    bidsCount: 0,
    updatedDate: "Today",
    updatedTime: "Just now"
  });
  localStorage.setItem("customerProjects", JSON.stringify(localList));
  showToast("Project Saved", "Project submitted successfully to your workspace!", "success");
  setTimeout(() => { window.location.href = "customer projects.html"; }, 1200);
}

function saveDraft() {
  projectState.customDescription = document.getElementById("othersDescInput")?.value.trim() || "";
  localStorage.setItem("projectDraft", JSON.stringify(projectState));
  showToast("Draft Saved", "Your project draft has been stored safely.", "info");
}

function shareProject() {
  if (navigator.share) {
    navigator.share({ title: "BuildBid Estimate", text: document.getElementById("costRangeDisplay").innerText });
  } else {
    showToast("Link Copied", "Estimate summary link copied to clipboard!", "info");
  }
}

function resetForm() {
  window.location.reload();
}
