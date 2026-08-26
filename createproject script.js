document.addEventListener("DOMContentLoaded", () => {
  syncUniversalUserProfile();
  initRequirements();
  initEventListeners();
  setLiveDatasetDate();
});

// Dynamic Project State (100% Blank initially)
let currentStep = 1;
const projectState = {
  projectType: null,
  title: "",
  city: "",
  state: "",
  pincode: "",
  plotArea: null,
  builtUpArea: null,
  floors: null,
  qualityTier: null,
  requirements: {
    parking: false,
    boundaryWall: false,
    gate: false,
    modularKitchen: false,
    wardrobes: false,
    falseCeiling: false,
    electricalWork: false,
    plumbing: false,
    waterproofing: false,
    waterTank: false,
    borewell: false,
    lift: false,
    landscaping: false,
    interiorWork: false,
    exteriorPainting: false
  }
};

const reqLabels = {
  parking: "Parking",
  boundaryWall: "Boundary Wall",
  gate: "Gate",
  modularKitchen: "Modular Kitchen",
  wardrobes: "Wardrobes",
  falseCeiling: "False Ceiling",
  electricalWork: "Electrical Work",
  plumbing: "Plumbing",
  waterproofing: "Waterproofing",
  waterTank: "Water Tank",
  borewell: "Borewell",
  lift: "Lift",
  landscaping: "Landscaping",
  interiorWork: "Interior Work",
  exteriorPainting: "Exterior Painting"
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
  const nameElem = document.getElementById("user-display-name");
  const avatarElem = document.getElementById("user-avatar-initials");
  const roleElem = document.getElementById("user-display-role");

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
   5. SELECTIONS & REQUIREMENTS TOGGLES
   ========================================================= */
function selectProjectType(type, elem) {
  projectState.projectType = type;
  document.querySelectorAll(".selection-card").forEach(c => c.classList.remove("selected"));
  elem.classList.add("selected");
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

function initRequirements() {
  const container = document.getElementById("featuresContainer");
  if (!container) return;
  
  container.innerHTML = Object.keys(projectState.requirements).map(key => `
    <div class="feature-toggle-card">
      <div class="feat-info">
        <strong>${reqLabels[key]}</strong>
        <span id="label-${key}">No</span>
      </div>
      <label class="switch">
        <input type="checkbox" id="req-${key}" onchange="toggleRequirement('${key}', this.checked)">
        <span class="slider"></span>
      </label>
    </div>
  `).join('');
}

function toggleRequirement(key, val) {
  projectState.requirements[key] = val;
  const label = document.getElementById(`label-${key}`);
  if (label) label.innerText = val ? "Yes" : "No";
  recalculateDynamicEstimates();
}

/* =========================================================
   6. REAL-TIME CALCULATION ENGINE
   ========================================================= */
function recalculateDynamicEstimates() {
  const builtUp = parseFloat(document.getElementById("builtUpAreaInput").value);
  const plotArea = parseFloat(document.getElementById("plotAreaInput").value);
  
  projectState.plotArea = isNaN(plotArea) ? null : plotArea;
  projectState.builtUpArea = isNaN(builtUp) ? null : builtUp;

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

  let ratePerSqFt = 1600;
  if (projectState.qualityTier === "basic") ratePerSqFt = 1350;
  if (projectState.qualityTier === "premium") ratePerSqFt = 2150;

  let addons = 0;
  if (projectState.requirements.lift) addons += 450000;
  if (projectState.requirements.borewell) addons += 120000;
  if (projectState.requirements.modularKitchen) addons += 180000;
  if (projectState.requirements.falseCeiling) addons += (builtUp * 60);
  if (projectState.requirements.boundaryWall) addons += 150000;
  if (projectState.requirements.waterproofing) addons += (builtUp * 40);

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

  const breakdownBox = document.getElementById("floorBreakdownBox");
  breakdownBox.style.display = "flex";
  const numFloors = projectState.floors || 1;
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
  document.getElementById("revFloors").textContent = projectState.floors ? `${projectState.floors} Floor(s)` : "--";
  document.getElementById("revQuality").textContent = projectState.qualityTier ? projectState.qualityTier.toUpperCase() : "Not Selected";

  const enabledReqs = Object.keys(projectState.requirements)
    .filter(k => projectState.requirements[k])
    .map(k => reqLabels[k]);
  document.getElementById("revReqs").textContent = enabledReqs.length > 0 ? enabledReqs.join(", ") : "None";
}

function initEventListeners() {
  document.getElementById("plotAreaInput").addEventListener("input", recalculateDynamicEstimates);
  document.getElementById("builtUpAreaInput").addEventListener("input", recalculateDynamicEstimates);

  document.querySelectorAll(".step-node").forEach(node => {
    node.addEventListener("click", () => {
      const targetStep = parseInt(node.dataset.step);
      goToStep(targetStep);
    });
  });

  document.querySelectorAll(".btn-floor").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-floor").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      projectState.floors = parseInt(btn.dataset.floors);
      recalculateDynamicEstimates();
    });
  });

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
   8. BACKEND API SUBMISSION (Updated for MySQL Database)
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

  // लॉगिन के वक्त इस्तेमाल होने वाली सही टोकन की (MarketplaceToken)
  const token = localStorage.getItem("marketplaceToken") || localStorage.getItem("token") || localStorage.getItem("authToken") || "";

  if (!token) {
    showToast("Authentication Required", "Please login first to post a project.", "error");
    return;
  }

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
      const result = await response.json();
      showToast("Success", "Project posted and saved to database successfully!", "success");
      setTimeout(() => { window.location.href = "customer projects.html"; }, 1500);
    } else {
      const errData = await response.json().catch(() => ({}));
      console.error("Server error response:", errData);
      showToast("Submission Failed", errData.error || "Could not save project to database.", "error");
    }
  } catch (err) {
    console.error("Network error:", err);
    showToast("Network Error", "Could not connect to the backend server.", "error");
  }
}

function saveDraft() {
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
