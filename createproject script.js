/* =========================================================
   BUILDBID - CREATE PROJECT SCRIPT (Clean & Fixed)
   ========================================================= */
const API_BASE_URL = "https://buildbid-ap3j.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  syncUniversalUserProfile();
  initRequirements();
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

/* 1. LIVE DATE */
function setLiveDatasetDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  const dateElem = document.getElementById("rateUpdateDate");
  if (dateElem) dateElem.textContent = formattedDate;
}

/* 2. USER SYNC */
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
    avatarElem.textContent = cleanName.substring(0, 2).toUpperCase();
  }
  if (user.city && document.getElementById("cityInput")) document.getElementById("cityInput").value = user.city;
  if (user.state && document.getElementById("stateSelect")) document.getElementById("stateSelect").value = user.state;
  if (typeof updateLocationInfo === "function") updateLocationInfo();
}

/* 3. TOAST */
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

/* 4. STEPPER */
function goToStep(stepNumber) {
  if (stepNumber > 1 && !projectState.projectType) {
    showToast("Selection Required", "Please select a project type first.", "warning");
    return;
  }
  currentStep = stepNumber;
  for (let i = 1; i <= 6; i++) {
    const pane = document.getElementById(`stepPane${i}`);
    if (pane) pane.classList.toggle("active", i === currentStep);
  }
  window.scrollTo({ top: 80, behavior: "smooth" });
}

/* 5. SELECTIONS */
function selectProjectType(type, elem) {
  projectState.projectType = type;
  document.querySelectorAll(".selection-card").forEach(c => c.classList.remove("selected"));
  elem.classList.add("selected");
}

function updateLocationInfo() {
  projectState.city = document.getElementById("cityInput")?.value.trim() || "";
  projectState.state = document.getElementById("stateSelect")?.value || "";
}

function initRequirements() {
  const container = document.getElementById("featuresContainer");
  if (!container) return;
  container.innerHTML = Object.keys(projectState.requirements).map(key => `
    <div class="feature-toggle-card">
      <div class="feat-info"><strong>${reqLabels[key]}</strong></div>
      <label class="switch">
        <input type="checkbox" id="req-${key}" onchange="toggleRequirement('${key}', this.checked)">
        <span class="slider"></span>
      </label>
    </div>
  `).join('');
}

function toggleRequirement(key, val) {
  projectState.requirements[key] = val;
  recalculateDynamicEstimates();
}

/* 6. CALCULATIONS */
function recalculateDynamicEstimates() {
  const builtUp = parseFloat(document.getElementById("builtUpAreaInput")?.value) || 0;
  projectState.builtUpArea = builtUp > 0 ? builtUp : null;
  const costDisp = document.getElementById("costRangeDisplay");
  if (costDisp) costDisp.innerText = builtUp > 0 ? "₹15 Lakh – ₹20 Lakh" : "Enter Area Details";
}

/* 7. LISTENERS */
function initEventListeners() {
  const areaInput = document.getElementById("builtUpAreaInput");
  if (areaInput) areaInput.addEventListener("input", recalculateDynamicEstimates);
}

/* 8. SUBMISSION */
async function submitProject() {
  if (!projectState.projectType) {
    showToast("Incomplete", "Select a project type.", "warning");
    return;
  }
  const token = localStorage.getItem("marketplaceToken") || localStorage.getItem("token") || "";
  if (!token) {
    showToast("Login Required", "Please login first.", "error");
    return;
  }

  const payload = {
    title: document.getElementById("projectTitleInput")?.value.trim() || `${projectState.builtUpArea || 1000} sq.ft Project`,
    type: projectState.projectType,
    city: projectState.city || "Greater Noida",
    state: projectState.state || "UP",
    builtUpArea: projectState.builtUpArea || 1000,
    qualityTier: projectState.qualityTier || "standard",
    estimatedCost: document.getElementById("costRangeDisplay")?.innerText || "₹15 Lakh"
  };

  try {
    const response = await fetch(API_BASE_URL + "/api/customer/projects/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      showToast("Success", "Project posted successfully!", "success");
      setTimeout(() => { window.location.href = "customer projects.html"; }, 1500);
    } else {
      showToast("Failed", "Could not save project.", "error");
    }
  } catch (err) {
    showToast("Network Error", "Server connection failed.", "error");
  }
}
