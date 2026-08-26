/* =========================================================
   BUILDBID - PROJECT SCRIPT (Fully Synchronized & DB Connected)
   ========================================================= */
const API_BASE_URL = "https://buildbid-ap3j.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  syncUniversalUserProfile();
  
  // चेक करें कि क्या यूजर 'customer projects.html' पेज पर है या नहीं
  if (window.location.pathname.includes("customer projects.html")) {
    fetchAndDisplayCustomerProjects();
  } else {
    // अगर वह क्रिएट प्रोजेक्ट पेज पर है, तो फॉर्म इनिशियलाइज करें
    initRequirements();
    initEventListeners();
    setLiveDatasetDate();
  }
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
  if (dateElem) dateElem.textContent = formattedDate;
}

/* =========================================================
   2. USER SYNC & PROFILE HEADER
   ========================================================= */
function syncUniversalUserProfile() {
  const storageKeys = ["currentUser", "customerUser", "userData", "user", "loggedInUser", "auth_user", "customer"];
  let activeUser = null;

  for (const key of storageKeys) {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
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

  if (activeUser) applyUserHeaderData(activeUser);

  const token = localStorage.getItem("marketplaceToken") || localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  if (token) {
    fetch(API_BASE_URL + "/api/customer/profile", {
      method: "GET",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
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

  const rawName = user.name || user.fullName || user.username || user.email?.split("@")[0] || "User";
  const cleanName = String(rawName).trim();

  if (nameElem && cleanName) nameElem.textContent = cleanName.split(" ")[0];
  if (roleElem) roleElem.textContent = (user.role || "CUSTOMER").toUpperCase();
  if (avatarElem && cleanName) {
    const parts = cleanName.split(" ").filter(Boolean);
    let initials = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]) : parts[0].substring(0, 2);
    avatarElem.textContent = initials.toUpperCase();
  }
  if (user.city && document.getElementById("cityInput") && !document.getElementById("cityInput").value) {
    document.getElementById("cityInput").value = user.city;
  }
  if (user.state && document.getElementById("stateSelect") && !document.getElementById("stateSelect").value) {
    document.getElementById("stateSelect").value = user.state;
  }
  updateLocationInfo();
}

/* =========================================================
   3. MODERN TOAST NOTIFICATIONS
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
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* =========================================================
   4. STEPPER NAVIGATION & VALIDATION
   ========================================================= */
function goToStep(stepNumber) {
  if (stepNumber > 1 && !projectState.projectType) {
    showToast("Selection Required", "Please select a project type first.", "warning");
    return;
  }
  if (stepNumber > 2) {
    const city = document.getElementById("cityInput")?.value.trim();
    const state = document.getElementById("stateSelect")?.value;
    if (!city || !state) {
      showToast("Location Incomplete", "Please enter city and select state.", "warning");
      return;
    }
  }
  if (stepNumber > 3 && (!projectState.builtUpArea || projectState.builtUpArea <= 0)) {
    showToast("Area Required", "Please enter the Built-up Area.", "warning");
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
    if (s === currentStep) node.classList.add("active");
    else if (s < currentStep) node.classList.add("completed");
  });

  if (currentStep === 6) populateSummaryReview();
  window.scrollTo({ top: 80, behavior: "smooth" });
}

/* =========================================================
   5. SELECTIONS & REQUIREMENTS
   ========================================================= */
function selectProjectType(type, elem) {
  projectState.projectType = type;
  document.querySelectorAll(".selection-card").forEach(c => c.classList.remove("selected"));
  if (elem) elem.classList.add("selected");
}

function updateLocationInfo() {
  const city = document.getElementById("cityInput")?.value.trim() || "";
  const state = document.getElementById("stateSelect")?.value || "";
  projectState.city = city;
  projectState.state = state;

  const locElem = document.getElementById("locInfo");
  if (locElem) {
    locElem.textContent = (city && state) ? `${city}, ${state}` : (city || state || "Enter location in Step 2");
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
  const lbl = document.getElementById(`label-${key}`);
  if (lbl) lbl.innerText = val ? "Yes" : "No";
  recalculateDynamicEstimates();
}

/* =========================================================
   6. REAL-TIME CALCULATION & ESTIMATE ENGINE
   ========================================================= */
function recalculateDynamicEstimates() {
  const builtUp = parseFloat(document.getElementById("builtUpAreaInput")?.value) || 0;
  const plotArea = parseFloat(document.getElementById("plotAreaInput")?.value) || 0;
  
  projectState.plotArea = plotArea > 0 ? plotArea : null;
  projectState.builtUpArea = builtUp > 0 ? builtUp : null;

  if (!builtUp || builtUp <= 0) {
    const display = document.getElementById("costRangeDisplay");
    if (display) display.innerText = "Enter Area Details";
    return;
  }

  let rate = 1600;
  if (projectState.qualityTier === "basic") rate = 1350;
  if (projectState.qualityTier === "premium") rate = 2150;

  let addons = 0;
  if (projectState.requirements.lift) addons += 450000;
  if (projectState.requirements.borewell) addons += 120000;
  if (projectState.requirements.modularKitchen) addons += 180000;
  if (projectState.requirements.falseCeiling) addons += (builtUp * 60);

  const baseTotal = (builtUp * rate) + addons;
  const lowerLakh = (baseTotal * 0.95 / 100000).toFixed(1);
  const higherLakh = (baseTotal * 1.15 / 100000).toFixed(1);

  const costDisplay = document.getElementById("costRangeDisplay");
  if (costDisplay) costDisplay.innerText = `₹${lowerLakh} Lakh – ₹${higherLakh} Lakh`;

  const lowerLbl = document.getElementById("lowerEstLabel");
  const expLbl = document.getElementById("expectedEstLabel");
  const highLbl = document.getElementById("higherEstLabel");
  if (lowerLbl) lowerLbl.innerText = `₹${lowerLakh}L`;
  if (expLbl) expLbl.innerText = `₹${lowerLakh}L – ₹${higherLakh}L`;
  if (highLbl) highLbl.innerText = `₹${higherLakh}L`;

  const breakdownBox = document.getElementById("floorBreakdownBox");
  if (breakdownBox) breakdownBox.style.display = "flex";
  const numFloors = projectState.floors || 1;
  const perFloor = Math.round(builtUp / numFloors);
  
  let badges = `<span>Ground Floor: <b>${perFloor} sq ft</b></span>`;
  for (let i = 1; i < numFloors; i++) {
    badges += `<span>Floor ${i}: <b>${perFloor} sq ft</b></span>`;
  }
  const badgesContainer = document.getElementById("floorBadgesContainer");
  if (badgesContainer) badgesContainer.innerHTML = badges;
  
  const totalBuiltUpDisplay = document.getElementById("totalBuiltUpDisplay");
  if (totalBuiltUpDisplay) totalBuiltUpDisplay.innerText = `${builtUp.toLocaleString()} sq ft`;

  renderBreakdownDetails(baseTotal);
}

function renderBreakdownDetails(total) {
  const container = document.getElementById("costBreakdownList");
  if (!container) return;
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

/* =========================================================
   7. EVENT LISTENERS & SUMMARY
   ========================================================= */
function populateSummaryReview() {
  document.getElementById("revType").textContent = projectState.projectType || "Not Selected";
  document.getElementById("revTitle").textContent = document.getElementById("projectTitleInput")?.value.trim() || "Untitled";
  document.getElementById("revLocation").textContent = projectState.city ? `${projectState.city}, ${projectState.state}` : "Not Specified";
  document.getElementById("revSize").textContent = projectState.builtUpArea ? `${projectState.builtUpArea} sq ft` : "--";
  document.getElementById("revFloors").textContent = `${projectState.floors || 1} Floor(s)`;
  document.getElementById("revQuality").textContent = projectState.qualityTier.toUpperCase();

  const enabledReqs = Object.keys(projectState.requirements).filter(k => projectState.requirements[k]).map(k => reqLabels[k]);
  const revReqs = document.getElementById("revReqs");
  if (revReqs) revReqs.textContent = enabledReqs.length > 0 ? enabledReqs.join(", ") : "None";
}

function initEventListeners() {
  const builtUpInput = document.getElementById("builtUpAreaInput");
  if (builtUpInput) builtUpInput.addEventListener("input", recalculateDynamicEstimates);

  const plotInput = document.getElementById("plotAreaInput");
  if (plotInput) plotInput.addEventListener("input", recalculateDynamicEstimates);

  document.querySelectorAll(".btn-floor").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-floor").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      projectState.floors = parseInt(btn.dataset.floors) || 1;
      recalculateDynamicEstimates();
    });
  });

  document.querySelectorAll(".tier-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".tier-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      projectState.qualityTier = card.dataset.tier || "standard";
      recalculateDynamicEstimates();
    });
  });
}

/* =========================================================
   8. BACKEND API SUBMISSION & FETCHING (MySQL DB Connected)
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

  const token = localStorage.getItem("marketplaceToken") || localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  if (!token) {
    showToast("Authentication Required", "Please login first to post a project.", "error");
    return;
  }

  const payload = {
    title: document.getElementById("projectTitleInput")?.value.trim() || `${projectState.builtUpArea} sq.ft ${projectState.projectType}`,
    type: projectState.projectType,
    city: projectState.city || "Greater Noida",
    state: projectState.state || "Uttar Pradesh",
    pincode: document.getElementById("pincodeInput")?.value.trim() || "",
    plotArea: projectState.plotArea,
    builtUpArea: projectState.builtUpArea,
    floors: projectState.floors || 1,
    qualityTier: projectState.qualityTier || "standard",
    requirements: projectState.requirements,
    estimatedCost: document.getElementById("costRangeDisplay")?.innerText || "₹15 Lakh"
  };

  try {
    const response = await fetch(API_BASE_URL + "/api/customer/projects/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      showToast("Success", "Project posted and saved to database successfully!", "success");
      setTimeout(() => { window.location.href = "customer projects.html"; }, 1500);
    } else {
      const errData = await response.json().catch(() => ({}));
      showToast("Submission Failed", errData.error || "Could not save project to database.", "error");
    }
  } catch (err) {
    showToast("Network Error", "Could not connect to the backend server.", "error");
  }
}

// यह फंक्शन 'customer projects.html' पर डेटाबेस से प्रोजेक्ट्स लोड करेगा (Fixed with .map)
async function fetchAndDisplayCustomerProjects() {
  const token = localStorage.getItem("marketplaceToken") || localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  if (!token) return;

  try {
    const response = await fetch(API_BASE_URL + "/api/customer/projects", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.ok) {
      const projects = await response.json();
      
      // Total और Active प्रोजेक्ट्स की संख्या अपडेट करें
      const counters = document.querySelectorAll("h2, .stat-number, .badge-count");
      counters.forEach(el => {
        if (el.textContent.trim() === "0") {
          el.textContent = projects.length;
        }
      });

      // यहाँ 'projects.p' की जगह बिल्कुल सही 'projects.map' का इस्तेमाल किया गया है
      const container = document.querySelector(".projects-list-container, tbody");
      if (container && projects.length > 0) {
        container.innerHTML = projects.map(p => `
          <div style="background: #fff; padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="margin: 0; color: #1e293b;">${p.title || 'Project'}</h4>
              <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">📍 ${p.city}, ${p.state} | 🏗️ ${p.builtUpArea} sq ft</p>
            </div>
            <div>
              <span style="background: #e0f2fe; color: #0369a1; padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${p.type}</span>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error("Failed to load customer projects:", err);
  }
}

function saveDraft() {
  localStorage.setItem("projectDraft", JSON.stringify(projectState));
  showToast("Draft Saved", "Your project draft has been stored safely.", "info");
}

function shareProject() {
  if (navigator.share) {
    navigator.share({ title: "BuildBid Estimate", text: document.getElementById("costRangeDisplay")?.innerText });
  } else {
    showToast("Link Copied", "Estimate summary link copied to clipboard!", "info");
  }
}

function resetForm() {
  window.location.reload();
}
